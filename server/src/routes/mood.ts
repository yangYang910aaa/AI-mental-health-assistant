/**
 * 心情记录路由 —— 用户端创建 / 列表 / 详情 / 删除心情记录。
 * POST 创建时异步调用 AI 生成情绪分析和专业建议。
 */
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'
import { formatDateTime } from '../utils/format.js'
import { parseId } from '../utils/validate.js'
import { chat } from '../ai/client.js'

// ==================== JSON Schema 校验 ====================

/** POST 创建心情记录的请求体校验规则 */
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

// ==================== AI 情绪分析（异步，不阻塞创建接口） ====================

/** AI 分析结果——主要情绪 + 强度 + 风险等级 + 情绪性质 */
interface MoodAnalysis {
  primaryEmotion: string
  emotionIntensity: number
  riskLevel: string
  emotionNature: string
}

/** AI 建议——风险描述 + 专业建议 */
interface MoodSuggestion {
  riskDescription: string
  advice: string
}

/**
 * 根据心情记录数据构建分析 prompt。
 * 把所有可用的维度（评分、标签、触发因素、睡眠、压力、自述）拼成结构化输入，
 * 要求 AI 返回严格 JSON 便于解析。
 */
const buildMoodAnalysisPrompt = (data: {
  moodScore: number
  moodLabel: string
  content?: string
  moodTrigger?: string
  sleepDuration?: number
  pressureLevel?: number
}) => {
  const parts = [
    `情绪评分：${data.moodScore}/10`,
    `情绪标签：${data.moodLabel}`,
  ]
  if (data.moodTrigger) parts.push(`触发因素：${data.moodTrigger}`)
  if (data.sleepDuration != null) parts.push(`睡眠时长：${data.sleepDuration}h`)
  if (data.pressureLevel != null) parts.push(`压力水平：${data.pressureLevel}/100`)
  if (data.content) parts.push(`用户描述：${data.content}`)

  return [
    '你是一位专业的心理健康分析师。请根据以下用户心情记录，做简短分析并返回 JSON（不要 markdown 代码块，只输出纯 JSON）：',
    '',
    parts.join('\n'),
    '',
    `返回格式：{"analysis":{"primaryEmotion":"主要情绪","emotionIntensity":1-10的强度,"riskLevel":"低/中/高","emotionNature":"正面/中性/负面"},"suggestion":{"riskDescription":"1-2句风险描述","advice":"1-2句专业建议"}}`,
  ].join('\n')
}

/**
 * 从 AI 回复中提取 JSON 对象。
 * AI 偶尔会在 JSON 外包 markdown 代码块，先 strip 再 parse。
 */
const parseAnalysisJson = (text: string) => {
  let jsonStr = text.trim()
  const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeMatch) jsonStr = codeMatch[1]
  return JSON.parse(jsonStr) as { analysis: MoodAnalysis; suggestion: MoodSuggestion }
}

/**
 * 异步执行 AI 情绪分析 → 写入数据库。
 * 不 await，失败只打日志不抛错误——分析是锦上添花，不阻塞用户看到"记录成功"。
 */
const analyzeMoodAsync = (recordId: number, data: {
  moodScore: number; moodLabel: string; content?: string
  moodTrigger?: string; sleepDuration?: number; pressureLevel?: number
}) => {
  const prompt = buildMoodAnalysisPrompt(data)
  chat([
    { role: 'system', content: '你只返回 JSON，不输出其他文字。' },
    { role: 'user', content: prompt },
  ])
    .then(async (reply) => {
      const parsed = parseAnalysisJson(reply)
      await prisma.moodRecord.update({
        where: { id: recordId },
        data: {
          aiAnalysis: parsed.analysis as any,
          aiSuggestion: parsed.suggestion as any,
        },
      })
    })
    .catch((err: Error) => {
      console.error('[Mood] AI 分析失败:', err.message)
    })
}

// ==================== 路由注册 ====================

export async function moodRoutes(app: FastifyInstance) {

  // ========== POST /api/user/mood —— 创建心情记录 ==========
  app.post('/api/user/mood', {
    schema: { body: createMoodBodySchema },               // Fastify 内置 JSON Schema 校验
  }, async (request, reply) => {
    const body = request.body as {
      userId: number
      moodScore: number
      moodLabel: string
      content?: string
      moodTrigger?: string
      sleepDuration?: number
      pressureLevel?: number
    }

    // 写入心情记录，aiAnalysis / aiSuggestion 先留空
    const record = await prisma.moodRecord.create({
      data: {
        userId:        body.userId,
        moodScore:     body.moodScore,
        moodLabel:     body.moodLabel,
        content:       body.content       ?? '',
        moodTrigger:   body.moodTrigger   ?? '',
        sleepDuration: body.sleepDuration ?? 0,
        pressureLevel: body.pressureLevel ?? 0,
      },
    })

    // 异步触发 AI 情绪分析——不阻塞"记录成功"响应
    analyzeMoodAsync(record.id, {
      moodScore: body.moodScore,
      moodLabel: body.moodLabel,
      content: body.content,
      moodTrigger: body.moodTrigger,
      sleepDuration: body.sleepDuration,
      pressureLevel: body.pressureLevel,
    })

    return reply.send({ code: 200, message: '记录成功', data: null })
  })

  // ========== GET /api/user/mood —— 心情记录列表（按 userId 筛选，分页） ==========
  app.get('/api/user/mood', async (request, reply) => {
    const { userId: userIdStr, moodLabel, page: pageStr, pageSize: pageSizeStr } =
      request.query as { userId?: string; moodLabel?: string; page?: string; pageSize?: string }

    const userId = Number(userIdStr)
    if (isNaN(userId) || userId <= 0) {
      return reply.status(400).send({ code: 400, message: '用户ID必须是正整数', data: null })
    }

    const page = Math.max(Number(pageStr) || 1, 1)
    const pageSize = Math.min(Math.max(Number(pageSizeStr) || 10, 1), 100)  // 限制 1-100

    const where: Record<string, unknown> = { userId }
    if (moodLabel) where.moodLabel = moodLabel          // 可选的情绪标签筛选

    // 列表只返回 5 个轻量字段，不加载 AI 分析文案（详情接口单独取）
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
        orderBy: { id: 'desc' },                         // 最新记录在前
      }),
      prisma.moodRecord.count({ where }),
    ])

    const list = records.map((r) => ({
      ...r,
      createdAt: r.createdAt instanceof Date ? formatDateTime(r.createdAt) : r.createdAt,
    }))

    return reply.send({ code: 200, message: 'ok', data: { list, total } })
  })

  // ========== GET /api/user/mood/:id —— 心情记录详情 ==========
  // ⚠️ 必须注册在 DELETE 之前，否则 :id 会被 DELETE 路由先匹配
  app.get('/api/user/mood/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const recordId = parseId(id, '记录', reply)
    if (recordId === null) return

    const record = await prisma.moodRecord.findUnique({ where: { id: recordId } })
    if (!record) {
      return reply.status(404).send({ code: 404, message: '心情记录不存在', data: null })
    }

    // 返回全量字段，包含 AI 分析结果（可能是异步写入的，也可能是空对象）
    const data = {
      id: record.id,
      userId: record.userId,
      moodScore: record.moodScore,
      moodLabel: record.moodLabel,
      content: record.content || '',
      moodTrigger: record.moodTrigger || '',
      // sleepDuration 在 DB 是 Decimal，Prisma 可能返回 Decimal 对象或 number
      sleepDuration: typeof record.sleepDuration === 'object' && record.sleepDuration !== null
        ? Number(record.sleepDuration)
        : (record.sleepDuration ?? 0),
      pressureLevel: record.pressureLevel ?? 0,
      // 兜底空对象，保证前端解构不报错
      aiAnalysis: record.aiAnalysis ?? {
        primaryEmotion: '', emotionIntensity: 0, riskLevel: '', emotionNature: '',
      },
      aiSuggestion: record.aiSuggestion ?? {
        riskDescription: '', advice: '',
      },
      createdAt: record.createdAt instanceof Date ? formatDateTime(record.createdAt) : record.createdAt,
    }

    return reply.send({ code: 200, message: 'ok', data })
  })

  // ========== DELETE /api/user/mood/:id —— 删除心情记录 ==========
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
