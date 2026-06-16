import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/jwtAuth.js'

// ==================== 工具函数 ====================

/** 格式化日期为 "YYYY-MM-DD HH:mm:ss" */
const fmt = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 序列化文章：Date → 字符串
const serialize = (a: any) => ({ ...a, createdAt: a.createdAt instanceof Date ? fmt(a.createdAt) : a.createdAt })

// ==================== JSON Schema 校验 ====================

const createArticleBodySchema = {
  type: 'object',
  required: ['title', 'content', 'category'],
  properties: {
    title:     { type: 'string', minLength: 1, maxLength: 200 },
    content:   { type: 'string', minLength: 1 },
    category:  { type: 'string', minLength: 1 },
    summary:   { type: 'string' },
    coverImage:{ type: 'string' },
    tags:      { type: 'array', items: { type: 'string' } },
    status:    { type: 'string', enum: ['published', 'draft', 'offline'] },
  },
} as const

const updateArticleBodySchema = {
  type: 'object',
  properties: {
    title:     { type: 'string', minLength: 1, maxLength: 200 },
    content:   { type: 'string', minLength: 1 },
    category:  { type: 'string', minLength: 1 },
    summary:   { type: 'string' },
    coverImage:{ type: 'string' },
    tags:      { type: 'array', items: { type: 'string' } },
    status:    { type: 'string', enum: ['published', 'draft', 'offline'] },
  },
} as const

// ==================== 路由注册 ====================

export async function knowledgeRoutes(app: FastifyInstance) {

  // ========== 文章列表 /api/knowledge/articles —— 列表（公开） ==========
  app.get('/api/knowledge/articles', async (request, reply) => {
    const { title, category, status, page: pageStr, pageSize: pageSizeStr } =
      request.query as { title?: string; category?: string; status?: string; page?: string; pageSize?: string }

    const page = Math.max(Number(pageStr) || 1, 1)
    const pageSize = Math.min(Math.max(Number(pageSizeStr) || 10, 1), 100)

    // 构建查询条件：title 模糊搜索，category/status 精确匹配
    const where: Record<string, unknown> = {}
    if (title)    where.title    = { contains: title }//模糊搜索标题
    if (category) where.category = category
    if (status)   where.status   = status

    const [list, total] = await Promise.all([
      prisma.article.findMany({
        where,//查询条件
        skip: (page - 1) * pageSize,//跳过前面几条
        take: pageSize,//取几条
        orderBy: { id: 'desc' },//按 id 降序排序
      }),
      prisma.article.count({ where }),
    ])

    return reply.send({
      code: 200,
      message: 'ok',
      data: { list: list.map(serialize), total },
    })
  })

  // ========== 文章详情 /api/knowledge/articles/:id —— 详情（公开） ==========
  app.get('/api/knowledge/articles/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const articleId = Number(id)

    // 校验文章ID格式,确保是数字类型
    if (isNaN(articleId)) {
      return reply.status(400).send({ code: 400, message: '文章ID格式错误', data: null })
    }
    // 校验验文章ID是否为正整数
    if(!Number.isInteger(articleId)||articleId<=0){
      return reply.status(400).send({ code: 400, message: '文章ID必须是正整数', data: null })
    }
    const article = await prisma.article.findUnique({ where: { id: articleId } })
    if (!article) {
      return reply.status(404).send({ code: 404, message: '文章不存在', data: null })
    }

    return reply.send({ code: 200, message: 'ok', data: serialize(article) })
  })

  // ========== 文章创建 /api/knowledge/articles —— 创建（需 admin） ==========
  app.post('/api/knowledge/articles', {
    schema: { body: createArticleBodySchema },//1.Fastify自动校验请求体是否符合 schema
    preHandler: [requireAuth],//2.验证token身份
  }, async (request, reply) => {
    const user = (request as any).user as { userId: number; role: string }

    if (user.role !== 'admin') { // 3.校验用户角色是否为管理员
      return reply.status(403).send({ code: 403, message: '仅管理员可创建文章', data: null })
    }

    const body = request.body as {
      title: string; content: string; category: string
      summary?: string; coverImage?: string; tags?: string[]; status?: string
    }

    // 作者取当前管理员的 nickname
    const adminUser = await prisma.user.findUnique({ where: { id: user.userId } })
    const author = adminUser?.nickname || '系统管理员'

    const article = await prisma.article.create({
      data: {
        title:      body.title,
        content:    body.content,
        category:   body.category,
        author,
        summary:    body.summary    ?? '',
        coverImage: body.coverImage ?? '',
        tags:       body.tags       ?? [],
        status:     body.status     ?? 'draft',
      },
    })

    return reply.send({ code: 200, message: '创建成功', data: serialize(article) })
  })

  // ========== 文章更新 /api/knowledge/articles/:id —— 更新（需 admin） ==========
  app.put('/api/knowledge/articles/:id', {
    schema: { body: updateArticleBodySchema },//1.Fastify自动校验请求体是否符合 schema
    preHandler: [requireAuth],//2.验证token身份
  }, async (request, reply) => {
    const user = (request as any).user as { userId: number; role: string }

    if (user.role !== 'admin') { // 3.校验用户角色是否为管理员
      return reply.status(403).send({ code: 403, message: '仅管理员可编辑文章', data: null })
    }

    const { id } = request.params as { id: string }
    // 4.校验文章ID格式,确保是数字类型
    const articleId = Number(id)
    if (isNaN(articleId)) {
      return reply.status(400).send({ code: 400, message: '文章ID格式错误', data: null })
    }
    // 校验文章ID是否为正整数
    if(!Number.isInteger(articleId)||articleId<=0){
      return reply.status(400).send({ code: 400, message: '文章ID必须是正整数', data: null })
    }
    // 5.查询文章是否存在
    const existing = await prisma.article.findUnique({ where: { id: articleId } })
    if (!existing) {
      return reply.status(404).send({ code: 404, message: '文章不存在', data: null })
    }

    const body = request.body as Record<string, unknown>

    // 只更新传入的字段（部分更新）
    const data: Record<string, unknown> = {}
    if (body.title      !== undefined) data.title      = body.title
    if (body.content    !== undefined) data.content    = body.content
    if (body.category   !== undefined) data.category   = body.category
    if (body.summary    !== undefined) data.summary    = body.summary
    if (body.coverImage !== undefined) data.coverImage = body.coverImage
    if (body.tags       !== undefined) data.tags       = body.tags
    if (body.status     !== undefined) data.status     = body.status

    const article = await prisma.article.update({ where: { id: articleId }, data })

    return reply.send({ code: 200, message: '更新成功', data: serialize(article) })
  })

  // ========== 文章删除 /api/knowledge/articles/:id —— 删除（需 admin） ==========
  app.delete('/api/knowledge/articles/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = (request as any).user as { userId: number; role: string }

    if (user.role !== 'admin') {
      return reply.status(403).send({ code: 403, message: '仅管理员可删除文章', data: null })
    }

    const { id } = request.params as { id: string }
    const articleId = Number(id)
    if (isNaN(articleId)) {
      return reply.status(400).send({ code: 400, message: '文章ID格式错误', data: null })
    }
    if(!Number.isInteger(articleId)||articleId<=0){
      return reply.status(400).send({ code: 400, message: '文章ID必须是正整数', data: null })
    }
    const existing = await prisma.article.findUnique({ where: { id: articleId } })
    if (!existing) {
      return reply.status(404).send({ code: 404, message: '文章不存在', data: null })
    }

    await prisma.article.delete({ where: { id: articleId } })

    return reply.send({ code: 200, message: '删除成功', data: null })
  })
}
