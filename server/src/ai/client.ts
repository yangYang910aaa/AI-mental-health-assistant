/**
 * DeepSeek API 客户端 —— 纯 API 调用，不掺杂业务逻辑。
 * 职责：拼 HTTP 请求 → 调 API → 解析 SSE 流 → 通过回调返回增量文本。
 * 不管 System Prompt 内容、不管上下文怎么拼、不管消息怎么存。
 */

// ==================== 配置 ====================

const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'

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
  deepThinking?: boolean
}

// ==================== 底层请求 ====================

/** 统一封装：拼 HTTP 请求 → 调 DeepSeek → 错误处理。不暴露给模块外部。 */
async function callDeepSeek(params: ChatParams, signal: AbortSignal) {
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-v4-pro',
      messages: params.messages,
      temperature: 0.7,
      max_tokens: params.maxTokens,
      top_p: 0.9,
      stream: params.stream,
      ...(params.deepThinking
        ? { thinking: { type: 'enabled' }, reasoning_effort: 'medium' }
        : {}),
    }),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`DeepSeek API 返回 ${response.status}: ${errText.slice(0, 200)}`)
  }

  return response
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
): Promise<string> {
  if (!API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未配置，请在 server/.env 中设置')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await callDeepSeek(
      { messages, stream: true, maxTokens: 800, deepThinking },
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
          // 个别行解析失败就跳过（如非标准事件）
        }
      }
    }

    if (!fullContent) {
      throw new Error('DeepSeek 返回内容为空')
    }

    return fullContent
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * 非流式调用 DeepSeek —— 用于不需要打字机效果的场景（如情绪分析）。
 * 直接返回完整 AI 回复文本，不经过 SSE 流。
 */
export async function chat(messages: LlmMessage[]): Promise<string> {
  if (!API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未配置，请在 server/.env 中设置')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await callDeepSeek(
      { messages, stream: false, maxTokens: 500 },
      controller.signal,
    )

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('DeepSeek 返回内容为空')
    }

    return content
  } finally {
    clearTimeout(timeout)
  }
}
