import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { authRoutes } from './routes/auth.js'
import { knowledgeRoutes } from './routes/knowledge.js'
import { moodRoutes } from './routes/mood.js'
import { fileRoutes } from './routes/file.js'

const app = Fastify({ logger: false, bodyLimit: 50 * 1024 * 1024 }) // 50MB，支持 base64 图片

// ==================== 跨域插件 ====================
await app.register(cors)

// ==================== 文件上传 + 静态服务 ====================
await app.register(multipart)
await app.register(fastifyStatic, {
  root: join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'uploads'),
  prefix: '/uploads/',
})

// ==================== 注册路由 ====================
await app.register(authRoutes)
await app.register(knowledgeRoutes)
await app.register(moodRoutes)
await app.register(fileRoutes)

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
