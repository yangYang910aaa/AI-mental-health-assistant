import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'
import { formatDateTime } from '../utils/format.js'
import { parseId } from '../utils/validate.js'

// ==================== JSON Schema 校验 ====================

const createMoodBodySchema = {
  type: 'object',
  required: ['userId', 'moodScore', 'moodLabel'],
  properties: {
    userId:        { type: 'number' },
    moodScore:     { type: 'number', minimum: 1, maximum: 10 },
    moodLabel:     { type: 'string', minLength: 1 },
    moodTrigger:   { type: 'string' },
    sleepDuration: { type: 'number', minimum: 0, maximum: 24 },
    pressureLevel: { type: 'number', minimum: 0, maximum: 100 },
    content:       { type: 'string' },
  },
} as const

// ==================== 路由注册 ====================

export async function moodRoutes(app: FastifyInstance) {

  // ========== 创建心情记录 /api/user/mood —— 创建 ==========
  app.post('/api/user/mood', {
    schema: { body: createMoodBodySchema },
  }, async (request, reply) => {
    const body = request.body as {
      userId: number;
      moodScore: number;
      moodLabel: string
      content?: string;
      moodTrigger?: string;
      sleepDuration?: number;
      pressureLevel?: number
    }

    await prisma.moodRecord.create({
      data: {
        userId:        body.userId,
        moodScore:     body.moodScore,
        moodLabel:     body.moodLabel,
        content:       body.content       ?? '',
        moodTrigger:   body.moodTrigger   ?? '',
        sleepDuration: body.sleepDuration ?? 0,
        pressureLevel: body.pressureLevel ?? 0,
        // aiAnalysis / aiSuggestion 暂时留空，后续接 AI 分析
      },
    })

    return reply.send({ code: 200, message: '记录成功', data: null })
  })

  // ========== 心情记录列表 /api/user/mood —— 列表（按 userId 筛选） ==========
  app.get('/api/user/mood', async (request, reply) => {
    const { userId: userIdStr, moodLabel, page: pageStr, pageSize: pageSizeStr } =
      request.query as { userId?: string; moodLabel?: string; page?: string; pageSize?: string }

    const userId = Number(userIdStr)
    if (isNaN(userId) || userId <= 0) {
      return reply.status(400).send({ code: 400, message: '用户ID必须是正整数', data: null })
    }

    const page = Math.max(Number(pageStr) || 1, 1)
    const pageSize = Math.min(Math.max(Number(pageSizeStr) || 10, 1), 100)

    const where: Record<string, unknown> = { userId }
    if (moodLabel) where.moodLabel = moodLabel

    const [records, total] = await Promise.all([
      prisma.moodRecord.findMany({
        where,
        select: {
          id: true,
          moodScore: true,
          moodLabel: true,
          content: true,
          createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
      prisma.moodRecord.count({ where }),
    ])

    const list = records.map((r) => ({
      ...r,
      createdAt: r.createdAt instanceof Date ? formatDateTime(r.createdAt) : r.createdAt,
    }))

    return reply.send({ code: 200, message: 'ok', data: { list, total } })
  })

  // ========== 心情记录详情 /api/user/mood/:id —— 详情 ==========
  // 必须注册在 DELETE 之前，否则 :id 会被 DELETE 先匹配
  app.get('/api/user/mood/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const recordId = parseId(id, '记录', reply)
    if (recordId === null) return

    const record = await prisma.moodRecord.findUnique({ where: { id: recordId } })
    if (!record) {
      return reply.status(404).send({ code: 404, message: '心情记录不存在', data: null })
    }

    const data = {
      id: record.id,
      userId: record.userId,
      moodScore: record.moodScore,
      moodLabel: record.moodLabel,
      content: record.content || '',
      moodTrigger: record.moodTrigger || '',
      sleepDuration: typeof record.sleepDuration === 'object' && record.sleepDuration !== null ? Number(record.sleepDuration) : (record.sleepDuration ?? 0),
      pressureLevel: record.pressureLevel ?? 0,
      aiAnalysis: record.aiAnalysis ?? { primaryEmotion: '', emotionIntensity: 0, riskLevel: '', emotionNature: '' },
      aiSuggestion: record.aiSuggestion ?? { riskDescription: '', advice: '' },
      createdAt: record.createdAt instanceof Date ? formatDateTime(record.createdAt) : record.createdAt,
    }

    return reply.send({ code: 200, message: 'ok', data })
  })

  // ========== 删除心情记录 /api/user/mood/:id —— 删除 ==========
  app.delete('/api/user/mood/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const recordId = parseId(id, '记录', reply)
    if (recordId === null) return

    const existing = await prisma.moodRecord.findUnique({ where: { id: recordId } })
    if (!existing) {
      return reply.status(404).send({ code: 404, message: '心情记录不存在', data: null })
    }

    await prisma.moodRecord.delete({ where: { id: recordId } })

    return reply.send({ code: 200, message: '删除成功', data: null })
  })
}
