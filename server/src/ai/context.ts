/**
 * AI 上下文拼装 —— 负责构建发给 LLM 的完整 messages 数组。
 * 当前只做 System Prompt + 历史消息拼装。
 * 🥇 下一步扩展点：注入用户信息（昵称、近期情绪）
 * 🥈 再下一步：注入知识库文章摘要
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
  /** 🥇 扩展点：当前用户信息，传了就注入 prompt */
  userContext?: {
    nickname?: string
    recentMood?: string
    recentIssues?: string
  }
  /** 🥈 扩展点：匹配到的知识库文章摘要 */
  knowledgeSnippets?: string[]
}

/**
 * 拼装完整的 messages 数组。
 * 这是发给 AI 的最终内容，包含：
 *   System Prompt（含可选的用户信息）
 *   + 历史对话
 *   + 用户最新消息
 *   + 可选的知识库片段
 */
export function buildContext(input: BuildContextInput): LlmMessage[] {
  // 1. System Prompt（基础人设 ± 用户信息）
  const systemPrompt = buildSystemPrompt(input.userContext)

  const messages: LlmMessage[] = [
    { role: 'system', content: systemPrompt },
  ]

  // 2. 历史对话
  messages.push(...formatHistory(input.history))

  // 3. 🥈 知识库片段：拼在用户消息前，作为上下文提示
  if (input.knowledgeSnippets && input.knowledgeSnippets.length > 0) {
    const snippets = input.knowledgeSnippets
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n')
    messages.push({
      role: 'user',
      content: `以下是与当前话题相关的知识库资料，请在回复中自然地融入这些信息（不要机械罗列）：\n\n${snippets}`,
    })
  }

  // 4. 用户最新消息
  messages.push({ role: 'user', content: input.userMessage })

  return messages
}
