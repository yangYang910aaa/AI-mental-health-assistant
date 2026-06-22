/**
 * 聊天路由 —— 只做路由编排：接收请求 → 校验 → 委托 → 返回。
 * AI 逻辑在 ../ai/ 目录下，数据访问在 prisma，路由本身不包含业务细节。
 */
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/jwtAuth.js'
import { formatDateTime } from '../utils/format.js'
import { parseId } from '../utils/validate.js'
import { streamChat } from '../ai/client.js'
import { buildContext, extractKeywords } from '../ai/context.js'
import { checkCrisis } from '../ai/safety.js'
import { getMemoryContext, extractMemories, saveMemories } from '../ai/memory.js'

// ==================== SSE 辅助 ====================

/** 向 SSE 连接写入一条命名事件 */
const sse = (raw: any, event: string, data: unknown) => {
  raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

// ==================== 辅助函数 ====================

/** 从 JWT 载荷中提取 userId */
const getUserId = (request: any): number =>
  (request.user as { userId: number }).userId

/**
 * 校验会话是否存在且用户是否有权访问。
 * 用于 POST /send 等没有路径参数 :id 的场景。
 * 不匹配自动回 404/403 并返回 false。
 */
const verifySessionOwnership = async (
  sessionId: number, userId: number, reply: any,
): Promise<boolean> => {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
  if (!session) {
    reply.status(404).send({ code: 404, message: '会话不存在', data: null })
    return false
  }
  if (session.userId !== userId) {
    reply.status(403).send({ code: 403, message: '无权访问此会话', data: null })
    return false
  }
  return true
}

/**
 * 通用路由辅助：JWT → 校验 :id → 校验归属 → 返回 { userId, sessionId }。
 * 任意一步失败自动回错误并返回 null，调用方只需 `if (!resolved) return`。
 * 消除了 GET /:id、PUT /:id、PUT /:id/pin、DELETE /:id 四个路由的重复代码。
 */
const resolveSession = async (request: any, reply: any) => {
  const userId = getUserId(request)
  const { id } = request.params as { id: string }
  const sessionId = parseId(id, '会话', reply)
  if (sessionId === null) return null
  if (!(await verifySessionOwnership(sessionId, userId, reply))) return null
  return { userId, sessionId }
}

/** 消息前 18 字 → 会话标题 */
const contentToTitle = (content: string) =>
  content.length > 18 ? content.slice(0, 18) + '…' : content

// ==================== 路由注册 ====================

export async function chatRoutes(app: FastifyInstance) {

  app.addHook('onRequest', requireAuth)   // 全部接口需登录

  // ========== GET /api/user/chat/sessions —— 会话列表 ==========
  // 当前用户的所有会话，置顶在前，最近创建的同组内靠前
  app.get('/api/user/chat/sessions', async (request, reply) => {
    const userId = getUserId(request)

    // 查询用户所有会话
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { messages: true } },     // 消息数量
        messages: {
          orderBy: { createdAt: 'desc' }, take: 1,   // 只取最后一条消息作为预览
          select: { content: true, createdAt: true },
        },
      },
    })

    // 格式化会话列表，只保留必要字段
    const list = sessions.map((s) => ({
      id: s.id, title: s.title, pinned: s.pinned,
      lastMessage: s.messages[0]?.content ?? '',
      lastTime: s.messages[0]?.createdAt instanceof Date
        ? formatDateTime(s.messages[0].createdAt) : '',
      messageCount: s._count.messages,
    }))

    return reply.send({ code: 200, message: 'ok', data: list })
  })

  // ========== GET /api/user/chat/sessions/:id —— 会话消息 ==========
  app.get('/api/user/chat/sessions/:id', async (request, reply) => {
    const resolved = await resolveSession(request, reply)
    if (!resolved) return

    // 查询会话所有消息，按时间升序（旧→新）
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: resolved.sessionId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, sender: true, content: true, createdAt: true },
    })

    const data = messages.map((m) => ({
      id: m.id, sender: m.sender, content: m.content,
      time: m.createdAt instanceof Date ? formatDateTime(m.createdAt) : m.createdAt,
    }))

    return reply.send({ code: 200, message: 'ok', data })
  })

  // ========== POST /api/user/chat/send —— 发送消息（SSE 流式） ==========
  app.post('/api/user/chat/send', async (request, reply) => {
    const userId = getUserId(request)
    // userId 前端可能传入，但后端以 JWT 为准
    const { sessionId: sid, content: raw, deepThinking } = request.body as {
      sessionId?: number | null; content: string; userId?: number; deepThinking?: boolean
    }

    const content = raw?.trim()
    if (!content) {
      return reply.status(400).send({ code: 400, message: '消息不能为空', data: null })
    }

    // ===== 1. 确定 / 创建会话 =====
    let sessionId = sid
    if (sessionId) {
      // 已有会话 → 校验归属权
      if (!(await verifySessionOwnership(sessionId, userId, reply))) return
    } else {
      // 新会话 → 创建，标题取消息前 18 字
      const s = await prisma.chatSession.create({
        data: { userId, title: contentToTitle(content) },
      })
      sessionId = s.id
    }

    // ===== 2. 保存用户消息 → ChatMessage 表，sender = 'user' =====
    const userMsg = await prisma.chatMessage.create({
      data: { sessionId, sender: 'user', content },
    })

    // 2b. 危机检测：匹配到高风险关键词则标记消息（异步，不阻塞主流程）
    const crisis = checkCrisis(content)
    if (crisis.flagged) {
      prisma.chatMessage.update({
        where: { id: userMsg.id }, data: { flagged: true },
      }).catch((e: Error) => console.error('[Chat] 危机标记写入失败:', e.message))
    }

    // ===== 3. 查询用户信息 + 近期心情 + 知识库 + 历史 → 拼装上下文 =====

    // 3a. 提取关键词
    const keywords = extractKeywords(content)

    // 3b. 并行查询四路数据
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [user, recentMoods, recent, articles] = await Promise.all([
      // ① 用户昵称
      prisma.user.findUnique({
        where: { id: userId },
        select: { nickname: true, username: true },
      }),
      // ② 近 7 天心情记录
      prisma.moodRecord.findMany({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' },
        select: { moodLabel: true, moodScore: true, content: true },
      }),
      // ③ 历史消息（排除刚存的这条）
      prisma.chatMessage.findMany({
        where: { sessionId, id: { not: userMsg.id } },
        orderBy: { createdAt: 'desc' }, take: 20,
        select: { sender: true, content: true },
      }),
      // ④ 知识库文章匹配（关键词为空时跳过）
      keywords.length > 0
        ? prisma.article.findMany({
            where: {
              status: 'published',
              OR: keywords.flatMap((kw) => [
                { title: { contains: kw } },
                { summary: { contains: kw } },
              ]),
            },
            select: { title: true, summary: true, category: true },
            take: 3,
          })
        : Promise.resolve([] as Array<{ title: string; summary: string | null; category: string }>),
    ])

    // 3c. 构造用户上下文
    const userContext: { nickname?: string; recentMood?: string; recentIssues?: string } = {}
    const displayName = user?.nickname || user?.username || '用户'

    userContext.nickname = displayName

    if (recentMoods.length > 0) {
      const scores = recentMoods.map((m) => m.moodScore)
      const minScore = Math.min(...scores)
      const maxScore = Math.max(...scores)
      // 统计出现最多的情绪标签
      const labelCounts = new Map<string, number>()
      for (const m of recentMoods) {
        labelCounts.set(m.moodLabel, (labelCounts.get(m.moodLabel) || 0) + 1)
      }
      const topLabel = [...labelCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]

      userContext.recentMood =
        `最近 7 天记录了 ${recentMoods.length} 次心情，` +
        `评分范围 ${minScore}~${maxScore} 分，` +
        `主要为「${topLabel}」情绪`

      // 取最近一条有记录内容的心情
      const latestWithContent = recentMoods.find((m) => m.content)
      if (latestWithContent?.content) {
        userContext.recentIssues = `最近一次记录中提到：${latestWithContent.content.slice(0, 80)}`
      }
    } else {
      userContext.recentMood = '本周还没有心情记录'
    }

    // 3d. 构造知识库片段
    const knowledgeSnippets = articles
      .filter((a) => a.summary)
      .map((a) => `《${a.title}》[${a.category}]：${a.summary}`)

    // 3e. 取长期记忆 + 反转历史
    const memoryContext = await getMemoryContext(userId)

    const history = recent.reverse().map((m) => ({
      sender: m.sender, content: m.content,
    }))

    // 3f. 组装完整 prompt
    const messages = buildContext({
      userMessage: content,
      history,
      userContext,
      knowledgeSnippets: knowledgeSnippets.length > 0 ? knowledgeSnippets : undefined,
      memoryContext,
    })

    // ===== 4. 切换到 SSE 模式 =====
    const rawReply = reply.raw
    rawReply.writeHead(200, {
      'Content-Type': 'text/event-stream',   // 告诉浏览器这是 SSE 流
      'Cache-Control': 'no-cache',            // 禁止缓存
      'Connection': 'keep-alive',             // 保持长连接
      'X-Accel-Buffering': 'no',              // 防止 nginx 代理缓冲
    })

    // 立即发送 meta 事件：告知前端会话 ID + 已保存的用户消息对象
    sse(rawReply, 'meta', {
      sessionId,
      userMessage: {
        id: userMsg.id, sender: 'user' as const,
        content: userMsg.content, time: formatDateTime(new Date()),
      },
    })

    // ===== 5. 流式生成 =====
    let aiContent = ''      // 外层声明，供记忆提取使用
    try {
      // 每收到一小段文字，就通过 SSE chunk 事件推给前端，追加到 AI 气泡末尾
      aiContent = await streamChat(messages, {
        onChunk: (delta) => sse(rawReply, 'chunk', { content: delta }),
      }, deepThinking ?? false)

      // ===== 6. 保存 AI 回复 → ChatMessage 表，sender = 'assistant' =====
      const aiMsg = await prisma.chatMessage.create({
        data: { sessionId, sender: 'assistant', content: aiContent },
      })

      // ===== 7. 首条用户消息 → 更新会话标题 =====
      const count = await prisma.chatMessage.count({
        where: { sessionId, sender: 'user' },
      })
      if (count === 1) {
        await prisma.chatSession.update({
          where: { id: sessionId }, data: { title: contentToTitle(content) },
        })
      }

      // 发送完成事件：告知前端 AI 回复已完整生成（含消息 ID、内容、时间）
      sse(rawReply, 'done', {
        aiReply: {
          id: aiMsg.id, sender: 'assistant' as const,
          content: aiContent, time: formatDateTime(new Date()),
        },
      })
    } catch (err: any) {
      // 上面任何一步失败，发送 error 事件告知前端
      console.error('[Chat] AI 调用失败:', err.message ?? err)
      sse(rawReply, 'error', { message: 'AI 回复生成失败，请稍后重试' })
    }

    rawReply.end()   // 关闭 SSE 连接

    // 异步提取长期记忆（取本轮用户消息 + AI 回复，不阻塞响应）
    if (aiContent) {
      const recentForMemory = history
        .slice(-6)
        .map((m: { sender: string; content: string }) => ({
          sender: m.sender, content: m.content,
        }))
      recentForMemory.push({ sender: 'user', content })
      recentForMemory.push({ sender: 'assistant', content: aiContent })
      extractMemories(recentForMemory.filter((m) => m.content))
        .then((items) => saveMemories(userId, items))
        .catch((e: Error) => console.error('[Chat] 记忆提取失败:', e.message))
    }
  })

  // ========== PUT /api/user/chat/sessions/:id —— 重命名 ==========
  app.put('/api/user/chat/sessions/:id', async (request, reply) => {
    const resolved = await resolveSession(request, reply)
    if (!resolved) return

    const { title } = (request.body as { title?: string }) || {}
    if (!title?.trim()) {
      return reply.status(400).send({ code: 400, message: '标题不能为空', data: null })
    }

    // 最多 200 字，与数据库 VARCHAR(200) 一致
    await prisma.chatSession.update({
      where: { id: resolved.sessionId },
      data: { title: title.trim().slice(0, 200) },
    })
    return reply.send({ code: 200, message: '重命名成功', data: null })
  })

  // ========== PUT /api/user/chat/sessions/:id/pin —— 切换置顶 ==========
  app.put('/api/user/chat/sessions/:id/pin', async (request, reply) => {
    const resolved = await resolveSession(request, reply)
    if (!resolved) return

    const session = await prisma.chatSession.findUnique({
      where: { id: resolved.sessionId },
    })
    const pinned = !session!.pinned   // 翻转置顶状态

    await prisma.chatSession.update({
      where: { id: resolved.sessionId }, data: { pinned },
    })
    return reply.send({
      code: 200, message: pinned ? '已置顶' : '已取消置顶', data: { pinned },
    })
  })

  // ========== DELETE /api/user/chat/sessions/:id —— 删除 ==========
  // ChatMessage.onDelete: Cascade，消息自动级联删除，无需手动处理
  app.delete('/api/user/chat/sessions/:id', async (request, reply) => {
    const resolved = await resolveSession(request, reply)
    if (!resolved) return

    await prisma.chatSession.delete({ where: { id: resolved.sessionId } })
    return reply.send({ code: 200, message: '删除成功', data: null })
  })
}
