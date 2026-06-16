import type { FastifyInstance } from 'fastify'
import { createWriteStream } from 'node:fs'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'

const UPLOAD_DIR = join(import.meta.dirname, '..', '..', 'public', 'uploads')

/** 允许的图片类型 */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

export async function fileRoutes(app: FastifyInstance) {

  // ========== 文件上传 /api/file/upload ==========
  app.post('/api/file/upload', async (request, reply) => {
    const file = await request.file()

    if (!file) {
      return reply.status(400).send({ code: 400, message: '未检测到上传文件', data: null })
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      // 丢弃不支持的格式
      file.file.resume()
      return reply.status(400).send({ code: 400, message: '仅支持 JPG/PNG/GIF/WebP/SVG 格式', data: null })
    }

    const ext = extname(file.filename) || '.png'
    const filename = randomUUID() + ext
    const filepath = join(UPLOAD_DIR, filename)

    await pipeline(file.file, createWriteStream(filepath))

    const url = `/uploads/${filename}`
    return reply.send({ code: 200, message: 'ok', data: { url } })
  })
}
