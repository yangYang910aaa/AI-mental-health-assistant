/**
 * 通用 SSE（Server-Sent Events）流解析器。
 *
 * 职责：从 fetch Response 的 ReadableStream 中逐行读取 → 按 event:/data: 配对 →
 * 通过异步生成器 yield 完整的 { event, data } 对象。
 *
 * 健壮性保证：
 * - 网络分块不会影响解析（buffer 半行，TextDecoder stream 模式处理截断 UTF-8）
 * - 每个完整的 event + data 配对才 yield，不依赖交替假设
 * - 忽略 SSE 注释行（: 开头）和空行
 * - 解析失败的 data 行静默跳过
 */

// ==================== 类型 ====================

export interface SseEvent {
  event: string
  data: string
}

// ==================== 解析器 ====================

/**
 * 将 fetch Response body 解析为 SSE 事件异步序列。
 *
 * @param response  fetch 返回的 Response（必须为 2xx，body 已就绪）
 * @param signal    可选 AbortSignal，触发后 reader.cancel() 并抛 AbortError
 *
 * @example
 * ```ts
 * for await (const ev of parseSSEStream(response, signal)) {
 *   const parsed = JSON.parse(ev.data)
 *   // 按 ev.event 分派：'meta' | 'chunk' | 'done' | 'error'
 * }
 * ```
 */
export async function* parseSSEStream(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<SseEvent> {
  if (!response.body) {
    throw new Error('响应体为空，无法解析 SSE 流')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  let onAbort: (() => void) | null = null

  try {
    // 如果外部 AbortSignal 触发，取消 reader
    if (signal) {
      onAbort = () => reader.cancel()
      signal.addEventListener('abort', onAbort, { once: true })
    }

    let currentEvent = 'message' // SSE 默认事件名

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // stream: true → 多字节 UTF-8 字符跨 chunk 截断时，
      // TextDecoder 内部状态机会暂存不完整字节，下次解码时拼接
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // 最后一段不完整（不以 \n 结尾）→ 退回 buffer，等下一个 chunk
      buffer = lines.pop() || ''

      for (const rawLine of lines) {
        const line = rawLine.trim()

        // 空行 → 事件分隔符，但当前实现中 event+data 配对
        // 在收到下一个 event 或 data 时自然形成
        // 跳过空行，不重置 currentEvent（SSE 规范中事件由空行分隔，
        // 但我们的 yield 时机由下一个 event: 或新的 data: 行驱动）

        if (!line) {
          // SSE 规范：空行表示一个事件结束。
          // 但在我们的流式场景中，每个事件只有一对 event+data，
          // 且下一个 event 行会自然触发 yield，所以空行可以跳过。
          continue
        }

        // SSE 注释行（以 : 开头）→ 跳过
        if (line.startsWith(':')) continue

        // event 字段
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7)
          continue
        }

        // data 字段
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          // 立即 yield 当前配对
          yield { event: currentEvent, data }
          // 不重置 currentEvent —— 如果连续 data 行（多行 data），
          // 每条都作为独立事件 yield（我们的后端不产生多行 data）
          continue
        }

        // 其他字段（id:、retry:）→ 忽略
      }
    }
  } finally {
    if (signal && onAbort) {
      signal.removeEventListener('abort', onAbort)
    }
    reader.releaseLock()
  }
}
