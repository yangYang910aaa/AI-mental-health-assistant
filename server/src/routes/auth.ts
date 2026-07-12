import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { prisma } from '../db.js'
import { signToken, requireAuth } from '../middleware/jwtAuth.js'
import { sendResetEmail } from '../utils/email.js'

//验证邮箱格式是否正确
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

//统一延迟函数：用于防止暴力破解密码或验证码，延迟响应时间
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))

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
  required: ['username', 'password', 'email'],
  properties: {
    username: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 6 },
    email:    { type: 'string', minLength: 6 },  // 邮箱格式由 handler 用正则进一步校验
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
          email: user.email ?? '',
          roles: [user.role],
        },
      },
    })
  })

  // ========== 注册接口 /api/auth/register ==========
  app.post('/api/auth/register', { schema: { body: registerBodySchema } }, async (request, reply) => {
    const { username, password, email, nickname } = request.body as { username: string; password: string; email: string; nickname?: string }

    // 1.校验用户名或邮箱是否已存在
    const existingUser = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } })
    if (existingUser) {
      //无论是什么重复，都返回同样的提示，防止用户枚举
      return reply.status(409).send({ code: 409, message: '用户名或邮箱已被使用,请更换', data: null })
    }

    // 2.校验邮箱格式是否正确
    if(!isValidEmail(email)){
      return reply.status(400).send({ code: 400, message: '邮箱格式不正确', data: null })
    }
     
    // 3.创建用户
    const passwordHash = await bcrypt.hash(password, 10)
    try {
      await prisma.user.create({
        data: { username, passwordHash, nickname: nickname?.trim() || username, role: 'user', email },
      })
    } catch (err: any) {
      // Prisma 唯一约束冲突（并发注册 / findFirst 和 create 之间的竞态）
      if (err?.code === 'P2002') {
        return reply.status(409).send({ code: 409, message: '用户名或邮箱已被使用,请更换', data: null })
      }
      throw err // 其他错误（DB 断连等）抛给全局 errorHandler
    }
    return reply.send({ code: 200, message: '注册成功', data: null })
  })

  // ========== 登录验证 /api/auth/me —— 验证 token 有效性 ==========
  app.get('/api/auth/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user

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
        email: dbUser.email ?? '',
        roles: [dbUser.role],
      },
    })
  })

  // ==================== JSON Schema（个人信息 + 密码） ====================

  const updateProfileBodySchema = {
    type: 'object',
    properties: {
      nickname: { type: 'string', minLength: 1, maxLength: 50 },
      avatar:   { type: 'string', minLength: 1, maxLength: 500 },
      email:    { type: 'string', minLength: 1, maxLength: 255 },
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
    const user = request.user
    const body = request.body as { nickname?: string; avatar?: string; email?: string }

    // 邮箱变更：校验格式 + 去重
    if (body.email !== undefined) {
      if (!isValidEmail(body.email)) {
        return reply.status(400).send({ code: 400, message: '邮箱格式不正确', data: null })
      }
      const existing = await prisma.user.findUnique({ where: { email: body.email } })
      if (existing && existing.id !== user.userId) {
        return reply.status(409).send({ code: 409, message: '该邮箱已被使用', data: null })
      }
    }

    // 部分更新：只更新传入的字段
    const data: Record<string, unknown> = {}
    if (body.nickname !== undefined) data.nickname = body.nickname.trim()
    if (body.avatar !== undefined)   data.avatar   = body.avatar
    if (body.email !== undefined)    data.email    = body.email

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
        email: updated.email ?? '',
        roles: [updated.role],
      },
    })
  })

  // ========== 修改密码 /api/auth/password ==========
  app.put('/api/auth/password', {
    schema: { body: changePasswordBodySchema },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = request.user
    const { oldPassword, newPassword } = request.body as { oldPassword: string; newPassword: string }

    // 1.先查用户
    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } })
    if (!dbUser) {
      return reply.status(404).send({ code: 404, message: '用户不存在', data: null })
    }

    // 2.验证旧密码是否正确
    const valid = await bcrypt.compare(oldPassword, dbUser.passwordHash)
    if (!valid) {
      return reply.status(400).send({ code: 400, message: '原密码错误', data: null })
    }

    // 3.旧密码正确后，再判断"新旧密码是否相同"
    const isSameAsOld = await bcrypt.compare(newPassword, dbUser.passwordHash)
    if (isSameAsOld) {
      return reply.status(400).send({ code: 400, message: '新密码不能与旧密码相同', data: null })
    }

    // 4.更新密码
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: user.userId }, data: { passwordHash } })

    return reply.send({ code: 200, message: '密码修改成功', data: null })
  })

  // ========== 忘记密码——发送验证码 /api/auth/forgot-password ==========
  app.post('/api/auth/forgot-password', async (request, reply) => {
    const { email } = request.body as { email: string }

    if (!email || !isValidEmail(email)) {
      return reply.status(400).send({ code: 400, message: '请输入有效的邮箱地址', data: null })
    }

    // 防用户枚举：无论邮箱是否存在，统一返回相同提示
    const user = await prisma.user.findUnique({ where: { email } })

    if (user) {
      // 只要验证码未过期，就不允许重复发送验证码
      if (user.resetTokenExp && user.resetTokenExp.getTime() > Date.now()) {
        return reply.send({ code: 200, message: '若该邮箱已注册，验证码已发送', data: null })
      }

      // 生成 6 位数字验证码
      const code = crypto.randomInt(100000, 999999).toString()
      const tokenHash = await bcrypt.hash(code, 10)
      const tokenExp = new Date(Date.now() + 15 * 60 * 1000) // 15 分钟

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: tokenHash, resetTokenExp: tokenExp },
      })

      try {
        await sendResetEmail(email, code)
      } catch (err) {
        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken: null, resetTokenExp: null },
        })
        // 随机延迟 0.2~0.5 秒，防止暴力破解验证码
        await sleep(200 + Math.random() * 300)
        return reply.status(500).send({ code: 500, message: '邮件发送失败，请稍后重试', data: null })
      }
    }else{
      //用户不存在时,模拟发送成功,但不保存验证码
      await sleep(200 + Math.random() * 300) 
    }

    return reply.send({ code: 200, message: '若该邮箱已注册，验证码已发送', data: null })
  })

  // ========== 重置密码——验证码 + 新密码 /api/auth/reset-password ==========
  app.post('/api/auth/reset-password', async (request, reply) => {
    const { email, code, newPassword } = request.body as { email: string; code: string; newPassword: string }

    if (!email || !code || !newPassword) {
      return reply.status(400).send({ code: 400, message: '参数不完整', data: null })
    }
    if (newPassword.length < 6) {
      return reply.status(400).send({ code: 400, message: '新密码至少 6 位', data: null })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user?.resetToken || !user?.resetTokenExp || user.resetTokenExp < new Date()) {
      return reply.status(400).send({ code: 400, message: '验证码已失效，请重新获取', data: null })
    }

    const valid = await bcrypt.compare(code, user.resetToken)
    if (!valid) {
      await sleep(200 + Math.random() * 300) // 随机延迟 0.2~0.5 秒，防止暴力破解验证码
      return reply.status(400).send({ code: 400, message: '验证码错误', data: null })
    }

    // 重置密码并清空令牌
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExp: null },
    })

    return reply.send({ code: 200, message: '密码已重置，请登录', data: null })
  })
}
