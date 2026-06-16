import type { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'mental-health-dev-secret'

/** JWT 载荷 */
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
  const header = request.headers.authorization // 从请求头中获取 Authorization 字段
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null // 提取 token 字符串

  if (!token) {
    return reply.status(401).send({ code: 401, message: '请先登录', data: null }) // 如果没有 token，返回401: 未授权
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload // 验证 token 并解析载荷
    // 将解析后的载荷挂载到 request 上
    (request as any).user = payload 
  } catch {
    return reply.status(401).send({ code: 401, message: '登录已过期，请重新登录', data: null })
  }
}
