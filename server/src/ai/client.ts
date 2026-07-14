/**
 * DeepSeek API 客户端 —— 纯 API 调用，不掺杂业务逻辑。
 * 职责：拼 HTTP 请求 → 调 API → 解析 SSE 流 → 通过回调返回增量文本。
 * 包含：自动网络错误重试与超时重连机制。
 */

// ==================== 配置 ====================

const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro'
const DEFAULT_TEMP = parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7')
const DEFAULT_MAX_TOKENS_STREAM = parseInt(process.env.DEEPSEEK_MAX_TOKENS_STREAM || '800', 10)
const DEFAULT_MAX_TOKENS_CHAT = parseInt(process.env.DEEPSEEK_MAX_TOKENS_CHAT || '500', 10)

// ==================== 类型 ====================

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 流式回调接口: 每收到一小段文字，就调用 onChunk 回调函数 */
export interface StreamCallbacks {
  onChunk: (delta: string) => void
}

interface ChatParams {
  messages: LlmMessage[]
  stream: boolean
  maxTokens: number
  temperature?: number
  deepThinking?: boolean
}

// ==================== 底层请求 + 重试机制 ====================

/**
 * 统一封装：拼 HTTP 请求 → 调 DeepSeek → 错误处理（带自动指数退避重试）
 */
async function callDeepSeekWithRetry(params: ChatParams, signal: AbortSignal, maxRetries = 3): Promise<Response> {
  let attempt = 0
  let delay = 1000 // 初始等待 1s

  while (true) {
    try {
      const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: params.messages,
          temperature: params.temperature ?? DEFAULT_TEMP,
          max_tokens: params.maxTokens,
          top_p: 0.9,
          stream: params.stream,
          ...(params.deepThinking
            ? { thinking: { type: 'enabled' }, reasoning_effort: 'medium' }
            : {}),
        }),
        signal,
      })

      if (response.status === 429 || response.status >= 500) {
        // 限流（429）或服务器端崩溃（5xx），可尝试重试
        if (attempt < maxRetries) {
          attempt++
          console.warn(`[Client] DeepSeek API 返回状态 ${response.status}，正在进行第 ${attempt} 次重试...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          delay *= 2 // 指数级退避
          continue
        }
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(`DeepSeek API 返回 ${response.status}: ${errText.slice(0, 200)}`)
      }

      return response
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err // 被主动中止（如超时），不重试
      }
      const message = err instanceof Error ? err.message : String(err)
      if (attempt < maxRetries) {
        attempt++
        console.warn(`[Client] 网络连接失败: "${message}"，正在进行第 ${attempt} 次重试...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= 2
        continue
      }
      throw err
    }
  }
}

// ==================== 公开调用 ====================

/**
 * 流式调用 DeepSeek V4 Pro。
 * 通过回调 onChunk 逐字推送 AI 回复，前端实现打字机效果。
 */
export async function streamChat(
  messages: LlmMessage[],
  callbacks: StreamCallbacks,
  deepThinking = false,
  temperature = DEFAULT_TEMP,
  externalSignal?: AbortSignal,
): Promise<string> {
  if (!API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未配置，请在 server/.env 中设置')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 35_000)

  // 外部信号（如客户端断开）触发时同步 abort 内部控制器
  let externalAbortHandler: (() => void) | null = null
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeout)
      throw new DOMException('客户端已断开', 'AbortError')
    }
    externalAbortHandler = () => controller.abort()
    externalSignal.addEventListener('abort', externalAbortHandler, { once: true })
  }

  try {
    const response = await callDeepSeekWithRetry(
      { messages, stream: true, maxTokens: DEFAULT_MAX_TOKENS_STREAM, deepThinking, temperature },
      controller.signal,
    )

    if (!response.body) {
      throw new Error('DeepSeek 未返回流式响应体')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const jsonStr = trimmed.slice(6)
        if (jsonStr === '[DONE]') continue

        try {
          const parsed = JSON.parse(jsonStr)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            fullContent += delta
            callbacks.onChunk(delta)
          }
        } catch {
          // 容错：个别非标准流数据行忽略
        }
      }
    }

    if (!fullContent) {
      throw new Error('DeepSeek 返回内容为空')
    }

    return fullContent
  } finally {
    clearTimeout(timeout)
    if (externalSignal && externalAbortHandler) {
      externalSignal.removeEventListener('abort', externalAbortHandler)
    }
  }
}

/**
 * 非流式调用 DeepSeek —— 用于不需要打字机效果的场景（如情绪分析）。
 */
export async function chat(
  messages: LlmMessage[],
  temperature = DEFAULT_TEMP,
): Promise<string> {
  if (!API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未配置，请在 server/.env 中设置')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 35_000)

  try {
    const response = await callDeepSeekWithRetry(
      { messages, stream: false, maxTokens: DEFAULT_MAX_TOKENS_CHAT, temperature },
      controller.signal,
    )

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('DeepSeek 返回的内容为空')
    }

    return content
  } finally {
    clearTimeout(timeout)
  }
}
