import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'
import { signToken } from '../middleware/jwtAuth.js'

// ==================== JSON Schema 校验 ====================

const loginBodySchema = {
  type: 'object',
  required: ['username', 'password'],
  properties: {
    username: { type: 'string', minLength: 1 },
    password: { type: 'string' },  // 不做长度校验，交给 handler 用 bcrypt 判断
  },
} as const

const registerBodySchema = {
  type: 'object',
  required: ['username', 'password'],
  properties: {
    username: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 6 },
  },
} as const

// ==================== 路由注册 ====================

export async function authRoutes(app: FastifyInstance) {
  // ========== POST /api/auth/login ==========
  app.post('/api/auth/login', { schema: { body: loginBodySchema } }, async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string }

    // 查用户
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return reply.status(401).send({ code: 401, message: '用户名或密码错误', data: null })
    }

    // 验密码
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ code: 401, message: '用户名或密码错误', data: null })
    }

    // 签发 token
    const token = signToken({ userId: user.id, role: user.role })

    return reply.send({
      code: 200,
      message: 'ok',
      data: {
        token,
        userInfo: {
          id: user.id,
          username: user.username,
          nickname: user.nickname ?? user.username,
          avatar: user.avatar ?? '',
          roles: [user.role],
        },
      },
    })
  })

  // ========== POST /api/auth/register ==========
  app.post('/api/auth/register', { schema: { body: registerBodySchema } }, async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string }

    // 检查重复
    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists) {
      return reply.status(409).send({ code: 409, message: '用户名已存在', data: null })
    }

    // 创建用户
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: { username, passwordHash, nickname: username, role: 'user' },
    })

    return reply.send({ code: 200, message: '注册成功', data: null })
  })
}
