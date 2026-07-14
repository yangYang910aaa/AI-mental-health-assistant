import type { FastifyInstance, FastifyRequest } from 'fastify'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/jwtAuth.js'
import { formatDateTime } from '../utils/format.js'

/** 从 JWT 载荷中提取 userId */
const getUserId = (request: FastifyRequest): number =>
  request.user.userId

// ==================== 每日寄语 ====================

const DAILY_QUOTES = [
  '每一次对话都是一次自我发现。',
  '你不需要独自承担一切，这里有人倾听。',
  '休息不是懒惰，是身心健康的需要。',
  '你已经做得够好了，给自己一点肯定吧。',
  '情绪不分好坏，每一种都是你的真实感受。',
  '改变从一小步开始，今天你迈出了这一步。',
  '感受到痛苦，意味着你依然在意，这是活着的证明。',
  '今天能觉察到自己的情绪，本身就是一种进步。',
  '善待自己，就像你善待身边的人一样。',
]

// ==================== 路由注册 ====================

export async function homeRoutes(app: FastifyInstance) {

  app.addHook('onRequest', requireAuth)   // 需登录

  // ========== GET /api/user/home —— 首页聚合数据 ==========
  app.get('/api/user/home', async (request, reply) => {
    const userId = getUserId(request)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(todayStart)
    weekAgo.setDate(todayStart.getDate() - 6)  // 最近 7 天（含今天）

    // ===== 本周心情记录 =====
    const weekMoods = await prisma.moodRecord.findMany({
      where: {
        userId,
        createdAt: { gte: weekAgo },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ===== 今日心情 =====
    const todayRecord = weekMoods.find((m) => m.createdAt >= todayStart) ?? null
    const weekMoodCount = weekMoods.length
    const weekAvgScore =
      weekMoodCount > 0
        ? Math.round((weekMoods.reduce((s, m) => s + m.moodScore, 0) / weekMoodCount) * 10) / 10
        : 0

    // ===== 最近 7 天趋势：每天取最新一条 =====
    const recentMoods = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(todayStart)
      day.setDate(todayStart.getDate() - (6 - i))
      const dayStr = formatDateTime(day).slice(0, 10) // "YYYY-MM-DD"
      const record = weekMoods.find((m) => {
        const mDate = m.createdAt instanceof Date
          ? m.createdAt.toISOString().slice(0, 10)
          : String(m.createdAt).slice(0, 10)
        return mDate === dayStr
      })
      return record
        ? { date: dayStr, score: record.moodScore, label: record.moodLabel }
        : { date: dayStr, score: 0, label: '无记录' }
    })

    // ===== 本周对话消息数 =====
    const weekChatCount = await prisma.chatMessage.count({
      where: {
        session: { userId },
        createdAt: { gte: weekAgo },
      },
    })

    // ===== 最近 3 个会话 =====
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
    })

    const recentChats = sessions.map((s) => {
      const lastMsg = s.messages[0]
      const title = s.title.length > 20 ? s.title.slice(0, 20) + '…' : s.title
      return {
        id: s.id,
        title,
        lastMessage: lastMsg?.content ?? '',
        lastTime: lastMsg?.createdAt instanceof Date ? formatDateTime(lastMsg.createdAt) : String(lastMsg?.createdAt ?? ''),
        messageCount: s._count.messages,
      }
    })

    // ===== 每日寄语 =====
    const dailyQuote = DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)]

    return reply.send({
      code: 200,
      message: 'ok',
      data: {
        dailyQuote,
        stats: {
          todayMoodScore: todayRecord?.moodScore ?? 0,
          todayMoodLabel: todayRecord?.moodLabel ?? '',
          weekMoodCount,
          weekChatCount,
          weekAvgScore,
        },
        recentMoods,
        recentChats,
      },
    })
  })
}
