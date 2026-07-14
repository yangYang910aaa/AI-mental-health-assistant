import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/jwtAuth.js'

// ==================== 工具函数 ====================

/** 生成日期序列（含头尾） */
function dateRange(days: number): string[] {
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

/** 生成周序列（周一日期） */
function weekRange(days: number): string[] {
  const weeks: string[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i -= 7) {
    const d = new Date()
    d.setDate(now.getDate() - i)
    const dayOfWeek = d.getDay()
    const monday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    d.setDate(d.getDate() + monday)
    weeks.push(d.toISOString().split('T')[0])
  }
  return weeks
}

// ==================== 路由注册 ====================

export async function dashboardRoutes(app: FastifyInstance) {

  app.get('/api/dashboard', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = request.user

    if (user.role !== 'admin') {
      return reply.status(403).send({ code: 403, message: '仅管理员可查看数据分析', data: null })
    }

    const { range: rangeStr } = request.query as { range?: string }
    const range = (['7d', '30d', '90d'] as const).includes(rangeStr as '7d' | '30d' | '90d') ? rangeStr! : '30d'
    const totalDays = range === '7d' ? 7 : range === '90d' ? 90 : 30
    const groupSize: 1 | 7 = range === '90d' ? 7 : 1

    // ==================== KPI 聚合 ====================
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const [
      totalUsers,
      totalEmotional,
      todayEmotional,
      totalConsultations,
      todayConsultations,
      avgMoodResult,
      highRiskRecords,
      activeUserCount,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'user' } }),
      prisma.moodRecord.count(),
      prisma.moodRecord.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.chatSession.count(),
      prisma.chatSession.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.moodRecord.aggregate({ _avg: { moodScore: true } }),
      // aiAnalysis —— 只取近 90 天（高风险计数 + 风险分布复用）
      prisma.moodRecord.findMany({
        where: { createdAt: { gte: ninetyDaysAgo } },
        select: { aiAnalysis: true },
        take: 10000,  // 安全上限，防止超大数据集
      }),
      prisma.moodRecord.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ])

    const avgMoodScore = Math.round((avgMoodResult._avg.moodScore || 0) * 10) / 10

    // 高风险计数 + 风险分布：复用同一次 aiAnalysis 查询
    const riskMap: Record<string, number> = { '低风险': 0, '中风险': 0, '高风险': 0 }
    let highRiskCount = 0
    for (const r of highRiskRecords) {
      const raw = r.aiAnalysis as Prisma.JsonValue
      const analysis: { riskLevel?: string } | null =
        typeof raw === 'string' ? JSON.parse(raw) : (typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : null)
      const level = analysis?.riskLevel || '未知'
      if (level === '高风险') highRiskCount++
      if (riskMap[level] !== undefined) riskMap[level]++
    }
    const riskDistribution = Object.entries(riskMap).map(([label, count]) => ({ label, count }))

    // ==================== 分布数据 ====================
    const emotionDistRaw = await prisma.moodRecord.groupBy({
      by: ['moodLabel'],
      _count: { id: true },
    })
    const emotionDistribution = emotionDistRaw.map((r) => ({
      label: r.moodLabel,
      count: r._count.id,
    }))

    // ==================== 趋势数据（JS 端聚合，避免 raw SQL 兼容性问题） ====================
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - totalDays)
    sinceDate.setHours(0, 0, 0, 0)

    // 取范围内的源数据
    const [moodSnapshots, chatSnapshots] = await Promise.all([
      prisma.moodRecord.findMany({
        where: { createdAt: { gte: sinceDate } },
        select: { createdAt: true, moodScore: true, userId: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.chatSession.findMany({
        where: { createdAt: { gte: sinceDate } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    /** 把 Date → "YYYY-MM-DD" */
    const dateKey = (d: unknown): string => {
      if (d instanceof Date) return d.toISOString().split('T')[0]
      return String(d).slice(0, 10)
    }

    /** 回推到该周周一 */
    const mondayKey = (d: unknown): string => {
      const dt = d instanceof Date ? new Date(d) : new Date(String(d))
      const day = dt.getDay()
      const offset = day === 0 ? -6 : 1 - day
      dt.setDate(dt.getDate() + offset)
      return dt.toISOString().split('T')[0]
    }
    const keyFn = groupSize === 7 ? mondayKey : dateKey

    // 情绪趋势：按 key 取平均分
    const moodMap = new Map<string, { sum: number; count: number }>()
    for (const m of moodSnapshots) {
      const k = keyFn(m.createdAt)
      const entry = moodMap.get(k) || { sum: 0, count: 0 }
      entry.sum += m.moodScore
      entry.count++
      moodMap.set(k, entry)
    }

    // 咨询趋势：按 key 计数
    const consultMap = new Map<string, number>()
    for (const c of chatSnapshots) {
      const k = keyFn(c.createdAt)
      consultMap.set(k, (consultMap.get(k) || 0) + 1)
    }

    // 活跃度趋势：按 key 去重 userId
    const activeMap = new Map<string, Set<number>>()
    for (const m of moodSnapshots) {
      const k = keyFn(m.createdAt)
      const set = activeMap.get(k) || new Set()
      set.add(m.userId)
      activeMap.set(k, set)
    }

    // 日期标签序列
    const labels = groupSize === 1 ? dateRange(totalDays) : weekRange(totalDays)

    const moodTrend = labels.map((d) => {
      const e = moodMap.get(d)
      return { date: d, value: e ? Math.round((e.sum / e.count) * 10) / 10 : 0 }
    })
    const consultationTrend = labels.map((d) => ({
      date: d, value: consultMap.get(d) || 0,
    }))
    const userActivityTrend = labels.map((d) => ({
      date: d, value: activeMap.get(d)?.size || 0,
    }))

    return reply.send({
      code: 200,
      message: 'ok',
      data: {
        totalUsers,
        activeUsers: activeUserCount.length,
        emotionalLogs: { total: totalEmotional, todayNew: todayEmotional },
        consultations: { total: totalConsultations, todayNew: todayConsultations },
        avgMoodScore,
        highRiskCount,
        moodTrend,
        emotionDistribution,
        riskDistribution,
        consultationTrend,
        userActivityTrend,
      },
    })
  })
}
