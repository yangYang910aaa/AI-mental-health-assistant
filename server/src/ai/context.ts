/**
 * AI 上下文拼装 —— 负责构建发给 LLM 的完整 messages 数组。
 * 拼装顺序：System Prompt（含用户信息）→ 历史消息 → 知识库片段 → 当前用户消息。
 * 同时提供关键词提取（extractKeywords），供 chat.ts 做轻量 RAG 知识库匹配。
 */

import type { LlmMessage } from './client.js'
import { buildSystemPrompt } from './prompts/system.js'

// ==================== 关键词提取（轻量 RAG） ====================

/** 常见中文停用词——这些词不参与知识库匹配 */
const STOP_WORDS = new Set([
  '的', '是', '我', '你', '了', '吗', '呢', '吧', '啊', '很', '就',
  '也', '还', '要', '会', '想', '觉得', '感觉', '怎么', '什么',
  '为什么', '怎样', '如何', '能', '可以', '应该', '不', '都', '在',
  '有', '和', '与', '或', '这', '那', '哪个', '哪里', '他', '她', '它',
  '们', '个', '没', '太', '好', '让', '把', '被', '从', '对', '向',
  '到', '给', '为', '因为', '所以', '但是', '可是', '然后', '而且',
  '虽然', '如果', '点', '种', '些', '多', '少', '大', '小', '来', '去',
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '最近', '一直', '经常', '总是', '有时候', '怎么办', '不知道',
  '现在', '今天', '昨天', '明天', '每天', '真的', '有点', '一点',
])

/**
 * 从用户消息中提取关键词，用于知识库文章匹配。
 * 策略：去标点 → 切片段 → 取 2~8 字短语 + 2-gram → 过滤停用词 → 去重截断。
 * 不引入分词库，纯字符串处理，适合中文短文本场景。
 */
export function extractKeywords(text: string, maxKeywords = 5): string[] {
  // 1.清洗切分:把所有的标点符号替换为 | ,然后按 | 切分,过滤掉小于 2 字的片段
  const cleaned = text.replace(/[，。！？；：、""''（）《》【】\s,.!?;:'"()\[\]{}]+/g, '|')
  const segments = cleaned.split('|').filter((s) => s.length >= 2)

  const candidates: string[] = []
  // 2.提取候选词
  for (const seg of segments) {
    // 2~8 字完整片段（优先保留）
    if (seg.length <= 8 && !STOP_WORDS.has(seg)) {
      candidates.push(seg)
    }
    // 长片段拆 2-gram，覆盖复合词: 例如 "我最近总失眠" 会被拆分成 ["最近", "近总", "总失", "失眠"]
    //去掉停用词后的候选词只有["失眠"]
    if (seg.length > 3) {
      for (let i = 0; i <= seg.length - 2; i++) {
        const bigram = seg.slice(i, i + 2)
        if (!STOP_WORDS.has(bigram)) {
          candidates.push(bigram)
        }
      }
    }
  }
  // 3.去重截断,这些词被chat.ts用来搜索知识库文章
  return [...new Set(candidates)].slice(0, maxKeywords)
}

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

  // 3. 知识库片段：拼在用户消息前，作为上下文提示
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
