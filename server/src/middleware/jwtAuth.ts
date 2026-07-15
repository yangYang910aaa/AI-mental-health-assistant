import type { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET 环境变量未设置");

}

/** JWT 自定义载荷 */
export interface JwtPayload {
  userId: number
  role: string
}

// ==================== Access token（短命 JWT） ====================

/** 签发 access token，过期时间 15 分钟 */
export const signAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
}

// ==================== Refresh token（不透明随机串） ====================

/** 生成 refresh token —— 32 字节密码学随机数的 hex 编码（64 字符） */
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

/** 对 refresh token 做 SHA-256 哈希，存入数据库用（O(1) 查找 + 防 DB 泄露） */
export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex')
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
