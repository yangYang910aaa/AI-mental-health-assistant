/**
 * 咨询记录路由 —— 管理端查看用户与 AI 的对话历史。
 * 仅 admin 角色可访问，提供列表 / 详情 / 删除三个接口。
 */
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/jwtAuth.js'
import { formatDateTime } from '../utils/format.js'
import { parseId } from '../utils/validate.js'

// ==================== 路由注册 ====================

export async function consultationsRoutes(app: FastifyInstance) {

  // ========== GET /api/consultations/records —— 列表（admin，分页） ==========
  app.get('/api/consultations/records', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = (request as any).user as { userId: number; role: string }

    if (user.role !== 'admin') {
      return reply.status(403).send({ code: 403, message: '仅管理员可查看咨询记录', data: null })
    }

    const { page: pageStr, pageSize: pageSizeStr } =
      request.query as { page?: string; pageSize?: string }

    const page = Math.max(Number(pageStr) || 1, 1)
    const pageSize = Math.min(Math.max(Number(pageSizeStr) || 10, 1), 100)

    // 查会话主表 + 用户昵称 + 最新一条消息时间
    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        include: {
          user: { select: { nickname: true, username: true } },
          _count: { select: { messages: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,                                       // 只取最后一条，用于列表时间展示
            select: { createdAt: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },                           // 最新会话在前
      }),
      prisma.chatSession.count(),
    ])

    // 批量取首条用户消息（每个会话一条）+ 危机标记统计
    // 不走 N+1 查询，一次 in 批量取，再用 Map 映射回各自会话
    const sessionIds = sessions.map((s) => s.id)
    const [firstMsgs, flaggedCounts] = await Promise.all([
      sessionIds.length > 0
        ? prisma.chatMessage.findMany({
            where: { sessionId: { in: sessionIds }, sender: 'user' },
            orderBy: { createdAt: 'asc' },
            distinct: ['sessionId'],                       // 每个会话只取首条用户消息
            select: { sessionId: true, content: true },
          })
        : [] as Array<{ sessionId: number; content: string | null }>,
      sessionIds.length > 0
        ? prisma.chatMessage.groupBy({
            by: ['sessionId'],
            where: { sessionId: { in: sessionIds }, flagged: true },
            _count: { sessionId: true },                   // 统计每个会话的危机消息数
          })
        : [] as Array<{ sessionId: number; _count: { sessionId: number } }>,
    ])

    // sessionId → 首条用户消息内容
    const firstMsgMap = new Map(
      firstMsgs.map((m: { sessionId: number; content: string | null }) =>
        [m.sessionId, m.content] as const,
      ),
    )
    // sessionId → 危机消息数量（>0 即 hasWarning）
    const flaggedMap = new Map(
      flaggedCounts.map((f: { sessionId: number; _count: { sessionId: number } }) =>
        [f.sessionId, f._count.sessionId] as const,
      ),
    )

    // 组装列表响应
    const list = sessions.map((s) => {
      const lastMsg = s.messages[0]

      return {
        id: s.id,
        userId: s.userId,
        userNickName: s.user.nickname || s.user.username,
        aiName: '宁渡',
        firstMessage: firstMsgMap.get(s.id) || '',         // 用户发起的首条消息预览
        lastMessageTime: lastMsg ? formatDateTime(lastMsg.createdAt) : '',
        messageCount: s._count.messages,
        hasWarning: (flaggedMap.get(s.id) || 0) > 0,       // 🥈 危机预警标记
        startedAt: s.createdAt instanceof Date ? formatDateTime(s.createdAt) : s.createdAt,
      }
    })

    return reply.send({ code: 200, message: 'ok', data: { list, total } })
  })

  // ========== GET /api/consultations/records/:id —— 详情（admin） ==========
  app.get('/api/consultations/records/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = (request as any).user as { userId: number; role: string }

    if (user.role !== 'admin') {
      return reply.status(403).send({ code: 403, message: '仅管理员可查看咨询记录详情', data: null })
    }

    const { id } = request.params as { id: string }
    const sessionId = parseId(id, '咨询记录', reply)
    if (sessionId === null) return

    // 查会话 + 用户信息 + 完整消息列表（升序，旧→新）
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { nickname: true, username: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, sender: true, content: true,
            flagged: true,                                 // 🥈 危机标记字段
            createdAt: true,
          },
        },
      },
    })

    if (!session) {
      return reply.status(404).send({ code: 404, message: '咨询记录不存在', data: null })
    }

    const firstUserMsg = session.messages.find((m) => m.sender === 'user')
    const lastMsg = session.messages[session.messages.length - 1]

    // 显式序列化，避免 Prisma 对象直接 JSON 时字段丢失
    const data = {
      id: session.id,
      userId: session.userId,
      userNickName: session.user.nickname || session.user.username,
      aiName: '宁渡',
      firstMessage: firstUserMsg?.content || '',
      lastMessageTime: lastMsg ? formatDateTime(lastMsg.createdAt) : '',
      messageCount: session.messages.length,
      startedAt: session.createdAt instanceof Date ? formatDateTime(session.createdAt) : session.createdAt,
      messages: session.messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        flagged: m.flagged,                                // 前端聊天气泡旁展示「⚠ 危机预警」
        time: m.createdAt instanceof Date ? formatDateTime(m.createdAt) : m.createdAt,
      })),
    }

    return reply.send({ code: 200, message: 'ok', data })
  })

  // ========== DELETE /api/consultations/records/:id —— 删除（admin） ==========
  app.delete('/api/consultations/records/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = (request as any).user as { userId: number; role: string }

    if (user.role !== 'admin') {
      return reply.status(403).send({ code: 403, message: '仅管理员可删除咨询记录', data: null })
    }

    const { id } = request.params as { id: string }
    const sessionId = parseId(id, '咨询记录', reply)
    if (sessionId === null) return

    const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } })
    if (!existing) {
      return reply.status(404).send({ code: 404, message: '咨询记录不存在', data: null })
    }

    // ChatMessage.onDelete: Cascade → 消息自动级联删除，无需手动处理
    await prisma.chatSession.delete({ where: { id: sessionId } })

    return reply.send({ code: 200, message: '删除成功', data: null })
  })
}
