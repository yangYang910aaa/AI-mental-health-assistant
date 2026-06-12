import Fastify from 'fastify'
import cors from '@fastify/cors'
import { authRoutes } from './routes/auth.js'

const app = Fastify({ logger: false })

// ==================== 插件 ====================
await app.register(cors)

// ==================== 路由 ====================
await app.register(authRoutes)

// ==================== 全局错误处理 ====================
app.setErrorHandler((error: { statusCode?: number; message?: string }, _request, reply) => {
  console.error('[Server Error]', error.message ?? error)
  const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
  reply.status(statusCode).send({
    code: statusCode,
    message: statusCode < 500 ? (error.message || '请求失败') : '服务器繁忙，请稍后重试',
    data: null,
  })
})

// ==================== 启动 ====================
const PORT = Number(process.env.PORT) || 3000
await app.listen({ port: PORT, host: '0.0.0.0' })
console.log(`后端已启动 → http://localhost:${PORT}`)
console.log(`数据库地址 → ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@') || '未配置'}`)
