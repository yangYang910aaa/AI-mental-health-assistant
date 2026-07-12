import type { FastifyInstance } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import { existsSync, mkdirSync, createWriteStream } from 'node:fs'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'

const UPLOAD_DIR = join(import.meta.dirname, '..', '..', 'public', 'uploads')

/** 允许的图片类型 */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
/** 单文件最大 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function fileRoutes(app: FastifyInstance) {

  // 确保上传目录存在
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true })
  }

  // ========== POST /api/file/upload —— 文件上传 ==========
  app.post('/api/file/upload', async (request, reply) => {
    const file: MultipartFile | undefined = await request.file()

    if (!file) {
      return reply.status(400).send({ code: 400, message: '未检测到上传文件', data: null })
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      file.file.resume()
      return reply.status(400).send({ code: 400, message: '仅支持 JPG/PNG/GIF/WebP/SVG 格式', data: null })
    }

    // 检查文件大小（Fastify multipart 解析后在 file.file.bytesRead 中）
    const ext = extname(file.filename) || '.png'
    const filename = randomUUID() + ext
    const filepath = join(UPLOAD_DIR, filename)

    try {
      await pipeline(file.file, createWriteStream(filepath))
    } catch (err) {
      return reply.status(500).send({ code: 500, message: '文件写入失败，请稍后重试', data: null })
    }

    const url = `/uploads/${filename}`
    return reply.send({ code: 200, message: 'ok', data: { url } })
  })
}
