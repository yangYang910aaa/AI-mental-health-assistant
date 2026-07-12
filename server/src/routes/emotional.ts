import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/jwtAuth.js'
import { formatDateTime } from '../utils/format.js'
import { parseId } from '../utils/validate.js'

// ==================== 路由注册 ====================

export async function emotionalRoutes(app: FastifyInstance) {

  // ========== 情绪日志列表 /api/emotional/records —— 列表（需 admin） ==========
  app.get('/api/emotional/records', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = request.user

    if (user.role !== 'admin') {
      return reply.status(403).send({ code: 403, message: '仅管理员可查看情绪日志', data: null })
    }

    const { userId, moodScoreRange, moodLabel, page: pageStr, pageSize: pageSizeStr } =
      request.query as { userId?: string; moodScoreRange?: string; moodLabel?: string; page?: string; pageSize?: string }

    const page = Math.max(Number(pageStr) || 1, 1)
    const pageSize = Math.min(Math.max(Number(pageSizeStr) || 10, 1), 100)

    // 构建查询条件
    const where: Record<string, unknown> = {}
    if (userId && !isNaN(Number(userId))) where.userId = Number(userId)
    if (moodScoreRange) {
      const [min, max] = moodScoreRange.split('-').map(Number)
      where.moodScore = { gte: min, lte: max }
    }
    if (moodLabel) where.moodLabel = moodLabel

    const [records, total] = await Promise.all([
      prisma.moodRecord.findMany({
        where,
        // 列表只返回轻量字段，剔除 aiAnalysis / aiSuggestion / sleepDuration / pressureLevel / moodTrigger
        select: {
          id: true,
          userId: true,
          moodScore: true,
          moodLabel: true,
          content: true,
          createdAt: true,
          user: { select: { nickname: true, username: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
      prisma.moodRecord.count({ where }),
    ])

    const list = records.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.nickname || r.user.username,
      moodScore: r.moodScore,
      moodLabel: r.moodLabel,
      content: r.content || '',
      createdAt: r.createdAt instanceof Date ? formatDateTime(r.createdAt) : r.createdAt,
    }))

    return reply.send({ code: 200, message: 'ok', data: { list, total } })
  })

  // ========== 情绪日志详情 /api/emotional/records/:id —— 详情（需 admin） ==========
  app.get('/api/emotional/records/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = request.user

    if (user.role !== 'admin') {
      return reply.status(403).send({ code: 403, message: '仅管理员可查看情绪日志详情', data: null })
    }

    const { id } = request.params as { id: string }
    const recordId = parseId(id, '记录', reply)
    if (recordId === null) return

    const record = await prisma.moodRecord.findUnique({
      where: { id: recordId },
      include: { user: { select: { nickname: true, username: true } } },
    })
    if (!record) {
      return reply.status(404).send({ code: 404, message: '情绪记录不存在', data: null })
    }

    const data = {
      id: record.id,
      userId: record.userId,
      userName: record.user.nickname || record.user.username,
      moodScore: record.moodScore,
      moodLabel: record.moodLabel,
      content: record.content || '',
      sleepDuration: typeof record.sleepDuration === 'object' && record.sleepDuration !== null ? Number(record.sleepDuration) : (record.sleepDuration ?? 0),
      pressureLevel: record.pressureLevel ?? 0,
      moodTrigger: record.moodTrigger || '',
      aiAnalysis: record.aiAnalysis ?? { primaryEmotion: '', emotionIntensity: 0, riskLevel: '', emotionNature: '' },
      aiSuggestion: record.aiSuggestion ?? { riskDescription: '', advice: '' },
      createdAt: record.createdAt instanceof Date ? formatDateTime(record.createdAt) : record.createdAt,
    }

    return reply.send({ code: 200, message: 'ok', data })
  })

  // ========== 删除情绪日志 /api/emotional/records/:id —— 删除（需 admin） ==========
  app.delete('/api/emotional/records/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = request.user

    if (user.role !== 'admin') {
      return reply.status(403).send({ code: 403, message: '仅管理员可删除情绪日志', data: null })
    }

    const { id } = request.params as { id: string }
    const recordId = parseId(id, '记录', reply)
    if (recordId === null) return

    const existing = await prisma.moodRecord.findUnique({ where: { id: recordId } })
    if (!existing) {
      return reply.status(404).send({ code: 404, message: '情绪记录不存在', data: null })
    }

    await prisma.moodRecord.delete({ where: { id: recordId } })

    return reply.send({ code: 200, message: '删除成功', data: null })
  })
}
