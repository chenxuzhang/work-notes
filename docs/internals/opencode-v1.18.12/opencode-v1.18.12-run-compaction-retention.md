# OpenCode v1.18.12 `opencode run` 会话压缩：哪些保留，哪些摘要

> 本文只讨论 OpenCode v1.18.12，对应提交 [`0dd6950d`](https://github.com/anomalyco/opencode/tree/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb)。

## 结论

```jsonc
{
  "compaction": {
    "tail_turns": 2,
    "preserve_recent_tokens": 15000
  }
}
```

这段配置表示：**最多从最近 2 轮对话中保留 15,000 Token 原文，更早或放不下的内容会被压缩成摘要。**

| 配置 | 控制什么 |
| --- | --- |
| `tail_turns: 2` | 原文保留的候选范围，最多为最近 2 轮 |
| `preserve_recent_tokens: 15000` | 候选内容可以占用的总预算 |

因此，最近 2 轮只是候选，不保证都能完整保留；15,000 Token 也只是近期原文预算，不是整个模型上下文的上限。

本文所说的“保留”和“压缩”，都是针对后续发送给模型的上下文；聊天记录本身不会被删除。

## “一轮”包括什么

一轮就是：从一条普通的 `user` 消息开始，到下一条普通的 `user` 消息前结束；期间的助手回复、工具调用和工具结果都属于这一轮。

为了直观，下面用模型请求中常见的 `role` 表示一轮消息链：

```text
user       用户：帮我查一下订单状态
assistant   助手：我先调用订单查询工具
assistant   助手发起 tool call
tool       工具返回订单状态
assistant   助手：订单目前已发货
```

上面从第一行到最后一行就是一轮。用户再次提问时，才开始下一轮。

## 怎样选择保留内容

`preserve_recent_tokens: 15000` 是近期内容共享的 Token 预算。OpenCode 会先估算每一轮实际发送给模型的消息大小，再从最新一轮开始向前选择。

| 情况 | 保留方式 |
| --- | --- |
| 整轮不超过剩余预算 | 保留整轮 |
| 整轮超过剩余预算 | 从该轮末尾开始，按完整 `message` 逐条尝试，保留能放下的最长部分 |
| 当前轮最后一条 `message` 也超出剩余预算 | 当前轮及更早消息被压缩成摘要 |

有一个特殊情况：如果整个会话只有最近 2 轮，而且两轮合计未超过 15,000 Token，OpenCode 仍会把这两轮压缩成摘要，不再另外保留原文。只有会话中还存在更早的历史时，符合预算的近期消息才会作为原文保留。

这里的 Token 是近似估算，不会把 JSON 或单条消息从中间截断；没有保留原文的历史会按下文规则处理，再由压缩模型概括。源码见 [`compaction.ts`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts) 和 [`token.ts`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/util/token.ts)。

## 压缩成摘要前会怎样处理

旧消息在被概括成摘要前，OpenCode 会先做以下处理：

- 工具输出超过 2,000 个字符时，只保留开头 2,000 个字符，并标记其余内容已截断；
- 用户消息中的图片等媒体附件会替换成附件说明文字；
- 工具结果中的媒体附件不会交给摘要模型。

摘要模型根据处理后的内容生成摘要，因此，原文中的细节不一定都会出现在最终摘要中。相关逻辑见 [`compaction.ts#L349-L354`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L349-L354) 和 [`message-v2.ts#L211-L225`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/message-v2.ts#L211-L225)、[`message-v2.ts#L290-L320`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/message-v2.ts#L290-L320)。

## 上下文溢出时，最新请求如何处理

自动压缩未关闭且模型服务返回上下文溢出时，OpenCode 会找到内部压缩请求之前的最后一条 `user` 消息。该消息不含 `compaction` part，下文简称为“原请求”。

如果原请求之前还有至少一轮对话，OpenCode 会：

1. 暂时移出原请求及其后的消息；
2. 将更早的历史分成“生成摘要的内容”和“保留的近期原文”，压缩模型只处理前者；
3. 压缩成功后，将原请求重新写入会话；
4. 下一次调用正常模型时，发送摘要、保留的近期原文和原请求。

还有三个边界情况：

- 原请求带有图片等媒体附件时，重新提交的请求不再携带这些附件，只保留附件类型和文件名等说明文字；
- 原请求之前没有更早的对话时，也就没有可以单独压缩的旧历史，因此原请求也会参与这次压缩处理；
- 经过上述处理后，如果交给压缩模型的内容仍然过长，OpenCode 会记录错误并停止，不会再次发起压缩。

源码见 [`compaction.ts#L303-L449`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L303-L449) 和 [`message-v2.ts#L521-L584`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/message-v2.ts#L521-L584)。

## 哪些内容不受影响

这两个配置只处理会话历史。每次正常调用模型时，OpenCode 仍会单独加入：

- 当前系统提示词；
- 当前工具的名称、说明和参数格式。

过去的工具调用和工具结果属于会话历史，仍会被摘要或保留。组装逻辑见 [`prompt.ts#L1226-L1241`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/prompt.ts#L1226-L1241) 和 [`prompt.ts#L1257-L1286`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/prompt.ts#L1257-L1286)。

> 以上结论基于 v1.18.12 默认源码逻辑。插件仍可通过实验性钩子改变摘要提示、消息转换或自动续写行为。
