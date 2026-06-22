/**
 * 长期记忆路由 —— 用户查看 / 删除自己的记忆条目。
 */
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/jwtAuth.js'
import { parseId } from '../utils/validate.js'

export async function memoryRoutes(app: FastifyInstance) {

  app.addHook('onRequest', requireAuth)   // 全部接口需登录

  // ========== GET /api/user/memories —— 记忆列表 ==========
  app.get('/api/user/memories', async (request, reply) => {
    const userId = (request as any).user.userId as number

    const list = await prisma.memory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, category: true, createdAt: true },
    })

    return reply.send({ code: 200, message: 'ok', data: list })
  })

  // ========== DELETE /api/user/memories/:id —— 删除单条 ==========
  app.delete('/api/user/memories/:id', async (request, reply) => {
    const userId = (request as any).user.userId as number
    const { id } = request.params as { id: string }
    const memoryId = parseId(id, '记忆', reply)
    if (memoryId === null) return

    const existing = await prisma.memory.findUnique({ where: { id: memoryId } })
    if (!existing) {
      return reply.status(404).send({ code: 404, message: '记忆不存在', data: null })
    }
    if (existing.userId !== userId) {
      return reply.status(403).send({ code: 403, message: '无权操作', data: null })
    }

    await prisma.memory.delete({ where: { id: memoryId } })
    return reply.send({ code: 200, message: '删除成功', data: null })
  })

  // ========== DELETE /api/user/memories —— 清空全部 ==========
  app.delete('/api/user/memories', async (request, reply) => {
    const userId = (request as any).user.userId as number
    await prisma.memory.deleteMany({ where: { userId } })
    return reply.send({ code: 200, message: '已清空全部记忆', data: null })
  })
}
