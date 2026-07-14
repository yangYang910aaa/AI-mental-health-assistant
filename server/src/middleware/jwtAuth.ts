import type { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET 环境变量未设置");

}

/** JWT 自定义载荷 */
export interface JwtPayload {
  userId: number
  role: string
}

/** 签发 token, 过期时间为 7 天 */
export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Fastify preHandler —— 必须登录
 * 验证失败直接返回 401，验证通过后挂载 user 到 request
 */
export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const header = request.headers.authorization
  const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : null

  if (!token) {
    return reply.status(401).send({ code: 401, message: '请先登录', data: null })
  }

  try {
    const raw = jwt.verify(token, JWT_SECRET)
    // jwt.verify 返回 string | JwtPayload（库自带的 JwtPayload 有索引签名），
    // 只签对象 { userId, role }，runtime 始终是 object 且字段匹配。
    if (typeof raw === 'string') {
      return reply.status(401).send({ code: 401, message: '令牌格式无效', data: null })
    }
    request.user = raw as unknown as JwtPayload
  } catch {
    return reply.status(401).send({ code: 401, message: '登录已过期，请重新登录', data: null })
  }
}
