# OpenCode v1.18.12 上下文压缩：何时触发

> 本文只讨论 OpenCode v1.18.12，对应提交 [`0dd6950d`](https://github.com/anomalyco/opencode/tree/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb)。文中的流程、公式和边界均来自该提交源码。

模型每完成一次处理，模型服务都会返回本次用了多少 Token。本文统一称它为 **Token 用量**，源码中的字段名是 `usage`。

压缩后具体保留哪些内容，见《[OpenCode v1.18.12 上下文压缩：保留什么](./opencode-v1.18.12-compaction-retention.md)》。

## 结论

自动压缩未关闭时，有两条触发路径：

1. **Token 用量达到触发线**：模型步骤结束时检查一次；下一轮调用模型前，再用最近一次已完成消息中保存的 Token 用量检查一次。源码见 [`processor.ts#L435-L482`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/processor.ts#L435-L482) 和 [`prompt.ts#L1161-L1167`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/prompt.ts#L1161-L1167)。
2. **模型服务直接返回上下文溢出**：错误会被转成 `ContextOverflowError`，随后创建压缩任务。源码见 [`message-v2.ts#L676-L715`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/message-v2.ts#L676-L715) 和 [`processor.ts#L599-L617`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/processor.ts#L599-L617)。

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

## 二、拿哪个 Token 数与触发线比较

模型服务返回的 Token 用量可能有总数，也可能只有分类明细。OpenCode 的取值规则是：

```text
总数 totalTokens 不为 0
  → 使用 totalTokens

没有总数，或者 totalTokens = 0
  → 使用 input + output + cache.read + cache.write
```

判断代码见 [`overflow.ts#L31-L33`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/overflow.ts#L31-L33)。

回退计算没有加上独立的推理 Token。OpenCode 保存 Token 用量时，已经把推理 Token 从普通输出中分离出来，而回退公式没有再使用这个字段。源码见 [`ai-sdk.ts#L44-L63`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/llm/ai-sdk.ts#L44-L63) 和 [`session.ts#L338-L379`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/session.ts#L338-L379)。

完全没有 Token 用量数据时，用于比较的数值是 `0`。这时只能依靠模型服务返回上下文溢出错误来触发压缩。

## 三、基于 Token 用量的触发流程

主循环按以下顺序执行：

1. 如果已经存在压缩任务，先执行压缩。[`prompt.ts#L1141-L1159`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/prompt.ts#L1141-L1159)
2. 否则，读取最近一条已完成消息中保存的 Token 用量；达到触发线就创建压缩任务，并进入下一轮循环。[`prompt.ts#L1161-L1167`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/prompt.ts#L1161-L1167)
3. 未达到触发线时，才调用模型。[`prompt.ts#L1255-L1286`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/prompt.ts#L1255-L1286)
4. 模型步骤结束后，保存本步骤的 Token 用量，并立即再检查一次。[`processor.ts#L435-L482`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/processor.ts#L435-L482)
5. 达到触发线时，创建一条带压缩标记的用户消息；下一轮循环执行压缩。[`prompt.ts#L1319-L1329`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/prompt.ts#L1319-L1329)、[`compaction.ts#L513-L536`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/compaction.ts#L513-L536)

这里的检查可能会“慢一拍”。例如：

- 触发线是 100,000 Token；
- 上一次模型请求结束后，记录的 Token 用量是 90,000；
- 随后又新增了大约 20,000 Token 的用户消息或工具结果。

发起下一次请求前，OpenCode 仍然只拿已经记录的 90,000 与触发线比较，不会先估算新增的 20,000。因此它判断“不需要压缩”，仍会调用模型。如果实际请求超过模型的上下文上限，再由模型服务返回上下文溢出错误，转入另一条压缩路径。

### 工具结果会提前计入吗

不会。

OpenCode 先保存工具结果，等模型步骤结束后，再使用该步骤返回的 Token 用量做判断。它不会单独估算工具结果的 Token 数，也不会把估算值加到本次判断中。源码见 [`processor.ts#L383-L414`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/processor.ts#L383-L414) 和 [`processor.ts#L435-L482`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/processor.ts#L435-L482)。

因此，较大的工具结果可能在后续请求中直接撑满上下文。这时会走上下文溢出错误路径。

## 四、上下文溢出错误如何触发压缩

模型服务返回的错误会先被解析。类型为 `context_overflow` 时，OpenCode 将其转换成 `ContextOverflowError`：

- `auto` 未关闭：处理结果变成 `compact`，随后创建压缩任务；
- `auto: false`：记录错误并停止，不自动压缩。

源码见 [`message-v2.ts#L676-L715`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/message-v2.ts#L676-L715) 和 [`processor.ts#L599-L646`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/opencode/src/session/processor.ts#L599-L646)。

## 总结

OpenCode v1.18.12 在两种情况下触发自动压缩：

1. 已完成模型步骤返回的 Token 用量达到触发线；
2. 模型服务直接返回上下文溢出错误。

第一种路径依赖已经保存的 Token 用量，不会预估下一次请求新增的消息或工具结果。这也是为什么实际请求仍可能先溢出，再由第二条路径补救。
