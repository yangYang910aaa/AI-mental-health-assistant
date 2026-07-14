/**
 * 长期记忆 —— 跨会话记住用户的关键信息。
 * 提取：每轮对话后异步扫描 → 抽取值记信息 → 去重存库。
 * 检索：每次对话前取该用户所有记忆 → 注入 System Prompt。
 */
import { prisma } from '../db.js'
import { chat } from './client.js'

// ==================== 提取 ====================

/**
 * 用 AI 扫描最近几条对话，提取值得记住的用户信息。
 * @returns [{ content, category }] 或 []
 */
export async function extractMemories(
  messages: Array<{ sender: string; content: string }>,
): Promise<Array<{ content: string; category: string }>> {
  // 拼成对话文本，让 AI 更容易理解
  const transcript = messages
    .map((m) => `${m.sender === 'user' ? '用户' : 'AI'}：${m.content}`)
    .join('\n')

  const reply = await chat([
    {
      role: 'system',
      content:
        '你从对话中提取关于用户的关键个人信息，用于后续对话的长期记忆。' +
        '提取规则：' +
        '1. 只提取长期有价值的信息——姓名、宠物、重要人际关系、工作、健康问题、偏好、重要事件' +
        '2. 不要提取一次性或临时的信息（如"今天下雨了"）' +
        '3. 如果对话中没有值得长期记忆的信息，返回空数组' +
        '4. 每条记忆一句话概括，20-60 字' +
        '5. category 用以下之一：宠物、家庭、工作、健康、人际关系、偏好、重要事件',
    },
    {
      role: 'user',
      content:
        '请从以下对话中提取值得长期记忆的用户信息。' +
        '严格返回 JSON 数组（不要 markdown 代码块）：' +
        '[{"content":"记忆内容","category":"分类"}, ...]' +
        '如果没有值得记忆的信息，返回 []' +
        transcript,
    },
  ])

  // 解析 JSON（容忍 markdown 代码块包裹）
  let json = reply.trim()
  const m = json.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (m) json = m[1]

  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item: any) => item.content && typeof item.content === 'string')
        .map((item: any) => ({
          content: item.content.slice(0, 500),
          category: item.category || '其他',
        }))
    }
  } catch {
    console.error('[Memory] 提取解析失败:', json.slice(0, 200))
  }
  return []
}

/**
 * 计算两个字符串的最长公共子串长度
 */
function getLongestCommonSubstringLen(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  let maxLen = 0

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
        maxLen = Math.max(maxLen, dp[i][j])
      } else {
        dp[i][j] = 0
      }
    }
  }
  return maxLen
}

/**
 * 判断两个记忆片段是否实质性重复
 * 如果两条记忆的最长公共子串长度超过 10，则极大概率描述相同或高度重合的内容
 */
function isDuplicateMemory(newContent: string, existingContent: string): boolean {
  const lcsLen = getLongestCommonSubstringLen(newContent, existingContent)
  return lcsLen >= 10
}

/**
 * 将新提取的记忆去重后存入数据库。
 * @param userId  用户 ID
 * @param items   待保存的记忆项
 */
export async function saveMemories(
  userId: number,
  items: Array<{ content: string; category: string }>,
) {
  if (!items.length) return

  // 查已有记忆，采用最长公共子串（LCS）算法精准去重
  const existing = await prisma.memory.findMany({
    where: { userId },
    select: { content: true },
  })

  const toInsert = items.filter((item) => {
    const dup = existing.some((e) => isDuplicateMemory(item.content, e.content))
    return !dup
  })

  if (toInsert.length) {
    await prisma.memory.createMany({
      data: toInsert.map((item) => ({ userId, ...item })),
    })
    console.log(`[Memory] 用户 ${userId} 新增 ${toInsert.length} 条记忆`)

    // 总量超过 50 条时删最旧的，保持健康水位
    const count = await prisma.memory.count({ where: { userId } })
    if (count > 50) {
      const oldest = await prisma.memory.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: count - 50,
        select: { id: true },
      })
      await prisma.memory.deleteMany({
        where: { id: { in: oldest.map((o) => o.id) } },
      })
    }
  }
}

// ==================== 检索 ====================

/**
 * 取用户所有记忆，基于用户当前输入进行轻量关键词相似度过滤后，
 * 格式化为可注入 System Prompt 的文本。
 * 最多返回 15 条（相关度优先，最新兜底），按类别分组。
 */
export async function getMemoryContext(userId: number, currentMessage?: string): Promise<string | null> {
  const memories = await prisma.memory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50, // 宽口径取出最新 50 条
    select: { content: true, category: true },
  })

  if (!memories.length) return null

  let filtered = memories

  // 如果提供了当前用户消息，则进行话题相关性打分过滤
  if (currentMessage) {
    const cleanedMsg = currentMessage.toLowerCase().replace(/[，。？！、\s]/g, '')
    const charSet = new Set(cleanedMsg.split(''))

    const scoredMemories = memories.map((m) => {
      // 简单计算字符交叉命中次数作为相关度打分
      let score = 0
      for (const char of charSet) {
        if (m.content.toLowerCase().includes(char)) {
          score++
        }
      }
      return { ...m, score }
    })

    // 筛选出有交集的记忆并排序
    const relevant = scoredMemories
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)

    if (relevant.length > 0) {
      filtered = relevant
    } else {
      // 如果完全没有匹配，则默认保留最近 5 条兜底
      filtered = memories.slice(0, 5)
    }
  } else {
    // 未提供 currentMessage 时，直接截取最近 15 条
    filtered = memories.slice(0, 15)
  }

  // 按类别分组
  const grouped = new Map<string, string[]>()
  for (const m of filtered) {
    const cat = m.category || '其他'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(m.content)
  }

  const lines: string[] = ['以下是此前对话中了解到的用户信息：']
  for (const [cat, items] of grouped) {
    lines.push(`  [${cat}] ${items.join('；')}`)
  }
  lines.push('请自然地引用这些信息——不要机械复述。')

  return lines.join('\n')
}
