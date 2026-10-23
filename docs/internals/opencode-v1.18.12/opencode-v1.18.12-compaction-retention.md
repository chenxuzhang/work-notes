# OpenCode v1.18.12 上下文压缩：保留什么

> 本文只讨论 OpenCode v1.18.12，对应提交 [`0dd6950d`](https://github.com/anomalyco/opencode/tree/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb)。文中的流程、公式和边界均来自该提交源码。

何时触发压缩，见《[OpenCode v1.18.12 上下文压缩：何时触发](./opencode-v1.18.12-compaction.md)》。

## 结论

压缩后送给模型的内容不是只有摘要，而是：

```text
压缩标记消息 → 历史摘要 → 近期保留的原始消息 → 压缩后的新消息
```

历史内容分成两部分：

- 较早的内容交给模型生成摘要；
- 较近的内容尽量保留原文。

最终重组逻辑见 [`message-v2.ts#L521-L584`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/message-v2.ts#L521-L584)。

## 一、哪些近期原文可以保留

相关配置是：

```jsonc
{
  "compaction": {
    "tail_turns": 2,
    "preserve_recent_tokens": 15000
  }
}
```

- `tail_turns`：最多考虑最近几轮对话，默认是 2；
- `preserve_recent_tokens`：近期原文最多占用多少 Token。

配置定义见 [`config.ts#L149-L168`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/core/src/v1/config/config.ts#L149-L168)。两个限制同时生效，因此配置为两轮，并不代表最近两轮一定能完整保留。

### 一轮对话如何划分

一轮对话从一条普通用户消息开始，到下一条普通用户消息出现前结束。中间的助手回复和工具消息都属于这一轮；带压缩标记的用户消息不算新的一轮。源码见 [`compaction.ts#L87-L103`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L87-L103)。

### 没有配置原文预算时

默认预算为：

```text
min(8000, max(2000, floor(触发线 × 25%)))
```

源码见 [`compaction.ts#L32-L34`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L32-L34) 和 [`compaction.ts#L80-L85`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L80-L85)。

因此，默认预算最少 2,000、最多 8,000 Token。显式配置 `preserve_recent_tokens: 15000` 时，源码直接使用 15,000，不再受默认的 8,000 上限约束。

## 二、保留算法

OpenCode 先把消息转换成模型输入，再估算每轮对话的 Token 数。[`compaction.ts#L180-L207`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L180-L207)

随后从最新一轮向前选择：

1. 只考虑最近 `tail_turns` 轮；
2. 整轮放得下，就保留整轮原文；
3. 某一轮完整放不下，就尝试舍弃这轮开头，只保留能放下的后半段；
4. 后半段仍放不下，就停止选择，更早的内容也不再保留原文。

选择逻辑见 [`compaction.ts#L188-L239`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L188-L239)。

这意味着 `tail_turns` 是候选范围，`preserve_recent_tokens` 才是实际容量限制。

## 三、摘要与原文如何组合

选取完成后，消息被切成两部分：

- `head`：较早的内容，用于生成摘要；
- `tail_start_id`：近期原文的起点。

压缩模型只接收 `head`，生成一条摘要消息；近期原文不参与这次摘要生成。源码见 [`compaction.ts#L328-L420`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L328-L420)。

后续调用模型时，OpenCode 根据 `tail_start_id` 找回近期原文，再把消息重排为：

```text
压缩标记消息 → 摘要消息 → 近期原文 → 后续消息
```

重排逻辑见 [`message-v2.ts#L521-L584`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/message-v2.ts#L521-L584)。

## 四、因上下文溢出而压缩时的特殊处理

如果压缩由上下文溢出错误触发，OpenCode 会尝试把最近一条普通用户消息移出待摘要的历史，只压缩更早的内容。压缩成功后，再新建一条用户消息，回放原请求。[`compaction.ts#L303-L326`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L303-L326)、[`compaction.ts#L422-L449`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L422-L449)

只有更早的历史中仍存在普通用户消息时，源码才采用这条回放路径；否则仍使用原来的完整消息集合进行压缩。

## 总结

OpenCode v1.18.12 不会把全部历史简单替换成一段摘要。它会：

1. 用较早的内容生成摘要；
2. 在轮数和 Token 预算允许的范围内保留近期原文；
3. 在后续请求中把摘要、近期原文和新消息重新组合。

所以，“保留最近两轮”只是候选范围，不是保证。最终能保留多少，仍取决于近期原文的 Token 预算。
