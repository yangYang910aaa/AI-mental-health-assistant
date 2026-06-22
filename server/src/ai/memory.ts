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
        '你从对话中提取关于用户的关键个人信息，用于后续对话的长期记忆。\n' +
        '提取规则：\n' +
        '1. 只提取长期有价值的信息——姓名、宠物、重要人际关系、工作、健康问题、偏好、重要事件\n' +
        '2. 不要提取一次性或临时的信息（如"今天下雨了"）\n' +
        '3. 如果对话中没有值得长期记忆的信息，返回空数组\n' +
        '4. 每条记忆一句话概括，20-60 字\n' +
        '5. category 用以下之一：宠物、家庭、工作、健康、人际关系、偏好、重要事件',
    },
    {
      role: 'user',
      content:
        '请从以下对话中提取值得长期记忆的用户信息。\n' +
        '严格返回 JSON 数组（不要 markdown 代码块）：\n' +
        '[{"content":"记忆内容","category":"分类"}, ...]\n' +
        '如果没有值得记忆的信息，返回 []\n\n' +
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
 * 将新提取的记忆去重后存入数据库。
 * @param userId  用户 ID
 * @param items   待保存的记忆项
 */
export async function saveMemories(
  userId: number,
  items: Array<{ content: string; category: string }>,
) {
  if (!items.length) return

  // 查已有记忆，简单去重：新旧互相包含 5 字以上即视为重复
  const existing = await prisma.memory.findMany({
    where: { userId },
    select: { content: true },
  })

  const toInsert = items.filter((item) => {
    const dup = existing.some(
      (e) =>
        e.content.includes(item.content.slice(0, 5)) ||
        item.content.includes(e.content.slice(0, 5)),
    )
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
 * 取用户所有记忆，格式化为可注入 System Prompt 的文本。
 * 最多返回 20 条（最新优先），按类别分组。
 */
export async function getMemoryContext(userId: number): Promise<string | null> {
  const memories = await prisma.memory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { content: true, category: true },
  })

  if (!memories.length) return null

  // 按类别分组
  const grouped = new Map<string, string[]>()
  for (const m of memories) {
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
