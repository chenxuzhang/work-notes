# OpenCode v1.18.12 `opencode run` 会话压缩：何时触发

> 本文只讨论 OpenCode v1.18.12，对应提交 [`0dd6950d`](https://github.com/anomalyco/opencode/tree/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb)。文中的流程、公式和边界均来自该提交源码。

## 结论

本文将用于处理会话的模型请求称为**会话模型请求**。压缩摘要模型可通过 `agent.compaction.model` 单独配置，默认沿用当前会话模型。

自动压缩未关闭时，有两种触发方式：

1. **Token 用量触发**：会话模型请求结束后，OpenCode 会检查本次 Token 用量；在发送下一次会话模型请求前，还会根据上一次保存的 Token 用量再检查一次。
2. **上下文溢出触发**：模型服务返回的错误被 OpenCode 识别为 `context_overflow`。

达到触发条件后，OpenCode 会创建一条**内部压缩请求**，并在下一轮主循环中执行。内部压缩请求在会话中的存储形式，是一条带 `compaction` part 的内部 `user` 消息，不是用户实际输入的消息。源码见 [`processor.ts#L435-L482`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/processor.ts#L435-L482)、[`message-v2.ts#L676-L715`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/message-v2.ts#L676-L715) 和 [`compaction.ts#L513-L536`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L513-L536)。

## 一、触发线如何计算

相关配置可以简化为：

```jsonc
{
  "model": "provider-id/model-id",
  "provider": {
    "provider-id": {
      "models": {
        "model-id": {
          "limit": {
            "context": 160000,
            "input": 128000,
            "output": 32000
          }
        }
      }
    }
  },
  "compaction": {
    "auto": true,
    "reserved": 20000
  }
}
```

`auto` 控制自动压缩，`reserved` 是预留的缓冲区。配置定义见 [`config.ts#L149-L168`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/core/src/v1/config/config.ts#L149-L168)；模型的 `context/input/output` 定义见 [`provider.ts#L47-L52`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/core/src/v1/config/provider.ts#L47-L52)。

触发线由 [`overflow.ts#L10-L33`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/overflow.ts#L10-L33) 计算。

配置了 `limit.input` 时：

```text
触发线 = max(0, limit.input - reserved)
```

按照上面的配置，触发线是 `128000 - 20000 = 108000` Token。

没有显式配置 `reserved` 时：

```text
reserved = min(20000, maxOutputTokens)
```

没有配置 `limit.input` 时：

```text
触发线 = max(0, limit.context - maxOutputTokens)
```

`maxOutputTokens` 的默认上限是 32,000，源码实现为：

```text
min(limit.output, 32000) || 32000
```

源码见 [`transform.ts#L18`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/provider/transform.ts#L18) 和 [`transform.ts#L1412-L1414`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/provider/transform.ts#L1412-L1414)。

因此，`reserved` 只用于 `limit.input` 分支。`auto: false` 或 `limit.context: 0` 会直接关闭基于 Token 用量的触发判断。[`overflow.ts#L28-L33`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/overflow.ts#L28-L33)

## 二、Token 用量的取值规则

模型每完成一次处理，模型服务都会返回本次用了多少 Token。本文统一称它为 **Token 用量**。

模型服务返回的 Token 用量可能有总数，也可能只有分类明细。OpenCode 的取值规则是：

```text
总数 totalTokens 不为 0
  → 使用 totalTokens

没有总数，或者 totalTokens = 0
  → 使用 input + output + cache.read + cache.write
```

判断代码见 [`overflow.ts#L31-L33`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/overflow.ts#L31-L33)。

第二种算法会漏算推理 Token。`getUsage()` 从 `outputTokens` 中减去 `reasoningTokens`，将两者分别保存到 `output` 和 `reasoning`；但 `isOverflow()` 求和时只使用 `input`、`output`、`cache.read` 和 `cache.write`，没有加上 `reasoning`。源码没有说明这是有意设计，因此只能判断为实现上的字段遗漏。结果是：当 `totalTokens` 没有有效值时，用于判断是否压缩的 Token 用量会少算推理 Token。源码见 [`session.ts#L338-L379`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/session.ts#L338-L379) 和 [`overflow.ts#L31-L33`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/overflow.ts#L31-L33)。

完全没有 Token 用量数据时，用于比较的数值是 `0`。这时只能依靠模型服务返回上下文溢出错误来触发压缩。

## 三、自动压缩的触发路径

下面分别说明两条触发路径。内部压缩请求创建后，本轮处理结束；下一轮主循环识别到该请求后，才真正调用压缩逻辑。源码见 [`message-v2.ts#L595-L601`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/message-v2.ts#L595-L601)、[`prompt.ts#L1141-L1159`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/prompt.ts#L1141-L1159) 和 [`compaction.ts#L513-L536`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L513-L536)。

### Token 用量达到触发线

Token 用量有两个检查点。

**会话模型请求结束后**，OpenCode 保存本次请求返回的 Token 用量，并检查是否达到触发线。达到时，创建内部压缩请求。源码见 [`processor.ts#L435-L482`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/processor.ts#L435-L482) 和 [`prompt.ts#L1319-L1329`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/prompt.ts#L1319-L1329)。

**准备发送下一次会话模型请求时**，主循环会先处理已有的内部压缩请求。如果没有，OpenCode 再用上一次保存的 Token 用量检查触发线：

- 达到触发线：创建内部压缩请求并进入下一轮主循环；下一轮主循环识别到该请求后执行压缩；
- 未达到触发线：继续发送会话模型请求。

源码见 [`prompt.ts#L1161-L1167`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/prompt.ts#L1161-L1167) 和 [`prompt.ts#L1255-L1286`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/prompt.ts#L1255-L1286)。

### 模型服务返回上下文溢出

`context_overflow` 是 OpenCode 对供应商错误的内部分类，不要求第三方模型直接返回这个名称。第三方模型的错误满足以下任一条件即可命中：

- HTTP 状态码是 `413`；
- 响应体中的 `error.code` 是 `context_length_exceeded`；
- 错误文本表示提示词、输入 Token 或上下文长度超过模型限制。具体匹配规则见 [`provider-error.ts`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/llm/src/provider-error.ts)。

三种条件的汇总判断见 [`provider/error.ts`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/provider/error.ts)。

流式错误需要返回 `type: "error"`，并将 `error.code` 设置为 `context_length_exceeded`。OpenCode 识别后会将错误转换成 `ContextOverflowError`。随后：

- `auto` 未关闭：处理结果变成 `compact`，随后创建内部压缩请求；
- `auto: false`：记录错误并停止，不自动压缩。

触发压缩的处理见 [`message-v2.ts#L676-L715`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/message-v2.ts#L676-L715) 和 [`processor.ts#L599-L646`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/processor.ts#L599-L646)。

## 四、为什么达到触发线前仍可能溢出

基于 Token 用量的检查只读取上一次模型请求保存的数值，不会预估下一次请求实际要发送多少内容。

例如：

- 触发线是 100,000 Token；
- 上一次模型请求保存的 Token 用量是 90,000；
- 随后新增了大约 20,000 Token 的用户消息或工具结果。

发送会话模型请求前，OpenCode 仍然只用已保存的 90,000 与触发线比较，因此会继续发送该请求。发给模型的消息可能已经超过该模型一次请求可接受的上下文 Token 上限，此时只能等模型服务返回可被识别为 `context_overflow` 的错误，再触发自动压缩。

工具结果也是如此。OpenCode 会保存工具结果，但不会单独估算其 Token 数，也不会把估算值加入触发判断。较大的工具结果可能直接撑满下一次会话模型请求的上下文。源码见 [`processor.ts#L383-L414`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/processor.ts#L383-L414) 和 [`processor.ts#L435-L482`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/processor.ts#L435-L482)。
