/**
 * AI 上下文拼装 —— 负责构建发给 LLM 的完整 messages 数组。
 * 拼装顺序：System Prompt（含用户信息 + 长期记忆）→ 历史消息 → 知识库片段 → 当前用户消息。
 * 包含：自动 Token 长度截断保护（滑动窗口）
 */

import type { LlmMessage } from './client.js'
import { buildSystemPrompt } from './prompts/system.js'

// ==================== 历史上下文 ====================

/** 取最近 N 条历史消息，转成 LLM 格式 */
export function formatHistory(
  messages: Array<{ sender: string; content: string }>,
): LlmMessage[] {
  return messages.map((m) => ({
    role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.content,
  }))
}

// ==================== 完整上下文 ====================

export interface BuildContextInput {
  userMessage: string
  history: Array<{ sender: string; content: string }>
  /** 扩展点：当前用户信息，传了就注入 prompt */
  userContext?: {
    nickname?: string
    recentMood?: string
    recentIssues?: string
  }
  /** 知识库文章摘要 */
  knowledgeSnippets?: string[]
  /** 长期记忆文本——直接拼入 System Prompt */
  memoryContext?: string | null
}

/**
 * 估算大约的字符长度作为 Token 的简易衡量 (中文平均 1 字符 ≈ 0.6 token，英文 1 单词 ≈ 1.3 token)
 * 限制上下文总长度，防范大模型 Token 撑爆崩溃。
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length * 0.8)
}

/**
 * 拼装完整的 messages 数组，并引入滑动窗口机制进行自动截断保护。
 */
export function buildContext(input: BuildContextInput): LlmMessage[] {
  // 1. System Prompt（基础人设 + 用户信息 + 长期记忆）
  let systemPrompt = buildSystemPrompt(input.userContext)
  if (input.memoryContext) {
    systemPrompt += '\n\n' + input.memoryContext
  }

  // 基础预留最大上下文 Token：预设限制为 4000 个 Token（约 5000 字符）
  const MAX_CONTEXT_TOKENS = 4000
  let systemTokens = estimateTokens(systemPrompt)

  // 2. 知识库片段
  let knowledgeMessage: LlmMessage | null = null
  if (input.knowledgeSnippets && input.knowledgeSnippets.length > 0) {
    const snippets = input.knowledgeSnippets
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n')
    knowledgeMessage = {
      role: 'user',
      content: `以下是与当前话题相关的知识库资料，请在回复中自然地融入这些信息（不要机械罗列）：\n\n${snippets}`,
    }
    systemTokens += estimateTokens(knowledgeMessage.content)
  }

  // 当前用户消息
  const currentMessage: LlmMessage = { role: 'user', content: input.userMessage }
  systemTokens += estimateTokens(currentMessage.content)

  // 剩余可分配给历史对话的 Token 预算
  const historyBudget = MAX_CONTEXT_TOKENS - systemTokens

  // 3. 滑动窗口截断历史记录
  const formattedHistory = formatHistory(input.history)
  const safeHistory: LlmMessage[] = []
  let currentHistoryTokens = 0

  // 从最新的历史记录开始向前选取（保证最新的对话不被丢弃）
  for (let i = formattedHistory.length - 1; i >= 0; i--) {
    const msg = formattedHistory[i]
    const msgTokens = estimateTokens(msg.content)
    if (currentHistoryTokens + msgTokens > historyBudget) {
      console.log(`[Context] 历史对话超出预算，滑动窗口触发截断，舍弃第 0 到 ${i} 条历史消息`)
      break
    }
    safeHistory.unshift(msg) // 保持原有的先后顺序
    currentHistoryTokens += msgTokens
  }

  // 4. 组装最终的消息
  const messages: LlmMessage[] = [
    { role: 'system', content: systemPrompt },
  ]

  messages.push(...safeHistory)

  if (knowledgeMessage) {
    messages.push(knowledgeMessage)
  }

  messages.push(currentMessage)

  return messages
}
