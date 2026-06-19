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
    email:    { type: 'string', minLength: 1 },
  },
} as const

// ==================== 路由注册 ====================

export async function authRoutes(app: FastifyInstance) {
  // ========== 登录接口 /api/auth/login ==========
  app.post('/api/auth/login', { schema: { body: loginBodySchema } }, async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string }

    // 1.查用户:支持用户名或邮箱登录（含 '@' 则按邮箱查）
    const isEmail = username.includes('@')
    const user = isEmail
      ? await prisma.user.findUnique({ where: { email: username } })
      : await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return reply.status(401).send({ code: 401, message: '账号或密码错误', data: null })
    }

    // 2.验证密码:对比密码哈希值是否匹配
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ code: 401, message: '账号或密码错误', data: null })
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
    const { username, password, email, nickname } = request.body as { username: string; password: string; email?: string; nickname?: string }

    // 1.检查用户名是否已存在
    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists) {
      return reply.status(409).send({ code: 409, message: '用户名已存在', data: null })
    }

    // 2.邮箱可选：填了才校验格式 + 去重
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return reply.status(400).send({ code: 400, message: '邮箱格式不正确', data: null })
      }
      const emailExists = await prisma.user.findUnique({ where: { email } })
      if (emailExists) {
        return reply.status(409).send({ code: 409, message: '该邮箱已被注册', data: null })
      }
    }

    // 3.创建用户
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: { username, passwordHash, nickname: nickname?.trim() || username, role: 'user', email: email || null },
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

  // ==================== JSON Schema（profile + password） ====================

  const updateProfileBodySchema = {
    type: 'object',
    properties: {
      nickname: { type: 'string', minLength: 1, maxLength: 50 },
      avatar:   { type: 'string', minLength: 1, maxLength: 500 },
    },
  } as const

  const changePasswordBodySchema = {
    type: 'object',
    required: ['oldPassword', 'newPassword'],
    properties: {
      oldPassword: { type: 'string' },       // 旧密码不限制长度，交给 handler 用 bcrypt 比对
      newPassword: { type: 'string', minLength: 6 },
    },
  } as const

  // ========== 更新个人资料 /api/auth/profile ==========
  app.put('/api/auth/profile', {
    schema: { body: updateProfileBodySchema },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = (request as any).user as { userId: number }
    const body = request.body as { nickname?: string; avatar?: string }

    // 部分更新：只更新传入的字段
    const data: Record<string, unknown> = {}
    if (body.nickname !== undefined) data.nickname = body.nickname
    if (body.avatar !== undefined)   data.avatar   = body.avatar

    if (Object.keys(data).length === 0) {
      return reply.status(400).send({ code: 400, message: '至少需要修改一项', data: null })
    }

    const updated = await prisma.user.update({ where: { id: user.userId }, data })

    return reply.send({
      code: 200,
      message: '保存成功',
      data: {
        id: updated.id,
        username: updated.username,
        nickname: updated.nickname ?? updated.username,
        avatar: updated.avatar ?? '',
        roles: [updated.role],
      },
    })
  })

  // ========== 修改密码 /api/auth/password ==========
  app.put('/api/auth/password', {
    schema: { body: changePasswordBodySchema },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = (request as any).user as { userId: number }
    const { oldPassword, newPassword } = request.body as { oldPassword: string; newPassword: string }

    if (oldPassword === newPassword) {
      return reply.status(400).send({ code: 400, message: '新密码不能与旧密码相同', data: null })
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } })
    if (!dbUser) {
      return reply.status(404).send({ code: 404, message: '用户不存在', data: null })
    }

    const valid = await bcrypt.compare(oldPassword, dbUser.passwordHash)
    if (!valid) {
      return reply.status(400).send({ code: 400, message: '原密码错误', data: null })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: user.userId }, data: { passwordHash } })

    return reply.send({ code: 200, message: '密码修改成功', data: null })
  })
}
