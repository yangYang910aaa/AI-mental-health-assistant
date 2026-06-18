import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/jwtAuth.js'
import { formatDateTime } from '../utils/format.js'
import { parseId } from '../utils/validate.js'

// ==================== 路由注册 ====================

export async function consultationsRoutes(app: FastifyInstance) {

  // ========== 咨询记录列表 /api/consultations/records —— 列表（需 admin） ==========
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

    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        include: {
          user: { select: { nickname: true, username: true } },
          messages: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, sender: true, content: true, createdAt: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
      prisma.chatSession.count(),
    ])

    const list = sessions.map((s) => {
      const firstUserMsg = s.messages.find((m) => m.sender === 'user')
      const lastMsg = s.messages[s.messages.length - 1]

      return {
        id: s.id,
        userId: s.userId,
        userNickName: s.user.nickname || s.user.username,
        aiName: '宁渡',
        firstMessage: firstUserMsg?.content || '',
        lastMessageTime: lastMsg ? formatDateTime(lastMsg.createdAt) : '',
        messageCount: s.messages.length,
        startedAt: s.createdAt instanceof Date ? formatDateTime(s.createdAt) : s.createdAt,
      }
    })

    return reply.send({ code: 200, message: 'ok', data: { list, total } })
  })

  // ========== 咨询记录详情 /api/consultations/records/:id —— 详情（需 admin） ==========
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

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { nickname: true, username: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, sender: true, content: true, createdAt: true },
        },
      },
    })

    if (!session) {
      return reply.status(404).send({ code: 404, message: '咨询记录不存在', data: null })
    }

    const firstUserMsg = session.messages.find((m) => m.sender === 'user')
    const lastMsg = session.messages[session.messages.length - 1]

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
        time: m.createdAt instanceof Date ? formatDateTime(m.createdAt) : m.createdAt,
      })),
    }

    return reply.send({ code: 200, message: 'ok', data })
  })

  // ========== 删除咨询记录 /api/consultations/records/:id —— 删除（需 admin） ==========
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

    // Cascade delete：ChatMessage.onDelete: Cascade 会自动删关联消息
    await prisma.chatSession.delete({ where: { id: sessionId } })

    return reply.send({ code: 200, message: '删除成功', data: null })
  })
}
