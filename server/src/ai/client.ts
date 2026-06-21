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

// 流式回调接口: 每收到一小段文字，就调用 onChunk 回调函数
export interface StreamCallbacks {
  onChunk: (delta: string) => void
}

// ==================== 调用 ====================

/**
 * 流式调用 DeepSeek V4 Pro。
 * @param messages   完整消息数组（含 system prompt + 历史 + 当前用户消息）
 * @param callbacks  流式回调
 * @returns          完整 AI 回复文本
 */
export async function streamChat(
  messages: LlmMessage[],
  callbacks: StreamCallbacks,
  deepThinking = false,
): Promise<string> {
  if (!API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未配置，请在 server/.env 中设置')
  }

  // 设置超时 30 秒，防止请求挂起
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-pro',
        messages,
        temperature: 0.7,       // 控制 AI 回复的随机性，0 最确定，1 最随机
        max_tokens: 800,        // 最大回复长度，单位 token
        top_p: 0.9,             // 控制 AI 回复的多样性，配合 temperature 使用
        stream: true,           // 开启流式输出
        ...(deepThinking
          ? { thinking: { type: 'enabled' }, reasoning_effort: 'medium' }
          : {}),
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`DeepSeek API 返回 ${response.status}: ${errText.slice(0, 200)}`)
    }

    // ========== 逐行读取 SSE 流 ==========
    if (!response.body) {
      throw new Error('DeepSeek 未返回流式响应体')
    }
    const reader = response.body.getReader()   // 流读取器，逐块读取响应体
    const decoder = new TextDecoder()            // 文本解码器，二进制 → UTF-8
    let buffer = ''                              // 行缓冲区，存放未完成的行
    let fullContent = ''                         // 累积 AI 生成的完整回复

    while (true) {
      const { done, value } = await reader.read()  // 读取下一块数据
      if (done) break

      buffer += decoder.decode(value, { stream: true })  // 解码并追加到缓冲区
      const lines = buffer.split('\n')                    // 按行切分
      buffer = lines.pop() || ''                          // 最后一行可能不完整，留到下次

      // 解析每行 SSE 数据
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue   // 忽略非数据行

        const jsonStr = trimmed.slice(6)        // 去掉 "data: " 前缀
        if (jsonStr === '[DONE]') continue      // [DONE] 表示流结束，忽略

        try {
          const parsed = JSON.parse(jsonStr)
          // DeepSeek 流式格式：{"choices":[{"delta":{"content":"一段文字"}}]}
          const delta = parsed.choices?.[0]?.delta?.content  // 拿到不断生成的文本片段
          if (delta) {
            fullContent += delta
            callbacks.onChunk(delta)   // 把片段传给回调 → 前端逐字显示
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
