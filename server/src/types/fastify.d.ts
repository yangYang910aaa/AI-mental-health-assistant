import type { JwtPayload } from '../middleware/jwtAuth.js'

/** 扩展 FastifyRequest，为 requireAuth 中间件挂载的 user 字段提供类型 */
declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload
  }
}
