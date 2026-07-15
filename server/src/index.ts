import Fastify, { type FastifyError } from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { authRoutes } from './routes/auth.js'
import { knowledgeRoutes } from './routes/knowledge.js'
import { moodRoutes } from './routes/mood.js'
import { homeRoutes } from './routes/home.js'
import { fileRoutes } from './routes/file.js'
import { emotionalRoutes } from './routes/emotional.js'
import { consultationsRoutes } from './routes/consultations.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { chatRoutes } from './routes/chat.js'
import { memoryRoutes } from './routes/memory.js'
import { prisma } from './db.js'

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
await app.register(authRoutes)// 登录注册
await app.register(knowledgeRoutes)// 知识文章
await app.register(moodRoutes)// 用户心情记录
await app.register(homeRoutes)// 用户首页
await app.register(fileRoutes)// 文件上传
await app.register(emotionalRoutes)//情绪日志
await app.register(consultationsRoutes)//咨询记录
await app.register(dashboardRoutes)//数据分析
await app.register(chatRoutes)//AI 聊天（DeepSeek）
await app.register(memoryRoutes)//长期记忆管理

// ==================== 全局错误处理 ====================
app.setErrorHandler((error, _request, reply) => {
  const err = error as FastifyError & { validation?: { instancePath?: string; message: string }[] }
  console.error('[Server Error]', err.message ?? err)

  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500

  // Fastify 校验错误（FST_ERR_VALIDATION）包含字段级详情
  // error.validation 是数组，每项有 instancePath（字段路径）和 message（原因）
  if (err.validation && err.validation.length > 0) {
    const fields = err.validation.map((v) => {
      const field = v.instancePath ? v.instancePath.replace(/^\//, '') : ''
      return field ? `${field}: ${v.message}` : v.message
    })
    return reply.status(400).send({
      code: 400,
      message: fields.join('；') || '请求参数有误',
      data: null,
    })
  }

  reply.status(statusCode).send({
    code: statusCode,
    message: statusCode < 500 ? (err.message || '请求失败') : '服务器繁忙，请稍后重试',
    data: null,
  })
})

// ==================== 启动 ====================
const PORT = Number(process.env.PORT) || 3000
await app.listen({ port: PORT, host: '0.0.0.0' })
console.log(`后端已启动 → http://localhost:${PORT}`)
console.log(`数据库地址 → ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@') || '未配置'}`)

// ==================== 定时清理过期 refresh token ====================
setInterval(async () => {
  try {
    const { count } = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    if (count > 0) {
      console.log(`🧹 清理 ${count} 条过期 refresh token`)
    }
  } catch {} // 静默
}, 60 * 60 * 1000) // 每小时

// ==================== 优雅关闭 ====================
const shutdown = async (signal: string) => {
  console.log(`\n收到 ${signal}，正在关闭...`)
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
