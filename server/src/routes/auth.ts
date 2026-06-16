import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'
import { signToken, requireAuth } from '../middleware/jwtAuth.js'

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
  // ========== 登录接口 /api/auth/login ==========
  app.post('/api/auth/login', { schema: { body: loginBodySchema } }, async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string }

    // 1.查用户:根据用户名查询用户, 如果用户不存在，返回401,如果用户存在，继续验证密码
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return reply.status(401).send({ code: 401, message: '用户名或密码错误', data: null })
    }

    // 2.验证密码:对比密码哈希值是否匹配
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ code: 401, message: '用户名或密码错误', data: null })
    }

    // 3.签发 token:根据用户ID和角色生成 JWT
    const token = signToken({ userId: user.id, role: user.role })

    // 4.返回 token 和用户信息
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

  // ========== 注册接口 /api/auth/register ==========
  app.post('/api/auth/register', { schema: { body: registerBodySchema } }, async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string }

    // 1.检查用户名是否已存在, 如果已存在，返回409,如果不存在，继续创建注册
    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists) {
      return reply.status(409).send({ code: 409, message: '用户名已存在', data: null })
    }

    // 2.创建用户:将用户名和密码哈希值存储到数据库中
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: { username, passwordHash, nickname: username, role: 'user' },
    })

    return reply.send({ code: 200, message: '注册成功', data: null })
  })

  // ========== 登录验证 /api/auth/me —— 验证 token 有效性 ==========
  app.get('/api/auth/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user as { userId: number; role: string }

    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } })
    if (!dbUser) {
      return reply.status(401).send({ code: 401, message: '用户不存在', data: null })
    }

    return reply.send({
      code: 200,
      message: 'ok',
      data: {
        id: dbUser.id,
        username: dbUser.username,
        nickname: dbUser.nickname ?? dbUser.username,
        avatar: dbUser.avatar ?? '',
        roles: [dbUser.role],
      },
    })
  })
}
