/**
 * 聊天路由 —— 只做路由编排：接收请求 → 校验 → 委托 → 返回。
 * AI 逻辑在 ../ai/ 目录下，数据访问在 prisma，路由本身不包含业务细节。
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { ServerResponse } from 'node:http'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/jwtAuth.js'
import { formatDateTime } from '../utils/format.js'
import { parseId } from '../utils/validate.js'
import { streamChat } from '../ai/client.js'
import { buildContext } from '../ai/context.js'
import { checkCrisisWithAI, getCrisisGuidance } from '../ai/safety.js'
import { getMemoryContext, extractMemories, saveMemories } from '../ai/memory.js'

// ==================== 记忆提取冷却 ====================

/** 记忆提取频率控制：userId → 上次提取时间 + 当时的用户消息数 */
const memoryExtractionTracker = new Map<number, { time: number; msgCount: number }>()

// ==================== SSE 辅助 ====================

/** 向 SSE 连接写入一条命名事件 */
const sse = (raw: ServerResponse, event: string, data: unknown) => {
  raw.write(`event: ${event}
data: ${JSON.stringify(data)}

`)
}

// ==================== 辅助函数 ====================

/** 从 JWT 载荷中提取 userId */
const getUserId = (request: FastifyRequest): number =>
  (request.user as { userId: number }).userId

/**
 * 校验会话是否存在且用户是否有权访问。
 * 用于 POST /send 等没有路径参数 :id 的场景。
 * 不匹配自动回 404/403 并返回 false。
 */
const verifySessionOwnership = async (
  sessionId: number,
  userId: number,
  reply: FastifyReply,
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
const resolveSession = async (request: FastifyRequest, reply: FastifyReply) => {
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

/**
 * 从用户记录 + 心情数据构造上下文对象。
 * 提取自 POST /send，减少 handler 体量 + 可复用。
 */
const buildUserContext = (
  user: { nickname: string | null; username: string } | null,
  recentMoods: Array<{ moodLabel: string; moodScore: number; content: string | null }>,
) => {
  const ctx: { nickname?: string; recentMood?: string; recentIssues?: string } = {}
  const displayName = user?.nickname || user?.username || '用户'

  ctx.nickname = displayName

  if (recentMoods.length > 0) {
    const scores = recentMoods.map((m) => m.moodScore)
    const minScore = Math.min(...scores)
    const maxScore = Math.max(...scores)
    const labelCounts = new Map<string, number>()
    for (const m of recentMoods) {
      labelCounts.set(m.moodLabel, (labelCounts.get(m.moodLabel) || 0) + 1)
    }
    const topLabel = [...labelCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]

    ctx.recentMood =
      `最近 7 天记录了 ${recentMoods.length} 次心情，` +
      `评分范围 ${minScore}~${maxScore} 分，` +
      `主要为「${topLabel}」情绪`

    const latestWithContent = recentMoods.find((m) => m.content)
    if (latestWithContent?.content) {
      ctx.recentIssues = `最近一次记录中提到：${latestWithContent.content.slice(0, 80)}`
    }
  } else {
    ctx.recentMood = '本周还没有心情记录'
  }

  return ctx
}

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
      if (!(await verifySessionOwnership(sessionId, userId, reply))) return
    } else {
      const s = await prisma.chatSession.create({
        data: { userId, title: contentToTitle(content) },
      })
      sessionId = s.id
    }

    // ===== 2. 保存用户消息 =====
    const userMsg = await prisma.chatMessage.create({
      data: { sessionId, sender: 'user', content },
    })

    // ===== 3. 并行开始高级危机检测 =====
    const crisisPromise = checkCrisisWithAI(content)

    // ===== 4. 并行查询上下文数据 =====
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [user, recentMoods, recent, articles] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { nickname: true, username: true },
      }),
      prisma.moodRecord.findMany({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' },
        select: { moodLabel: true, moodScore: true, content: true },
      }),
      prisma.chatMessage.findMany({
        where: { sessionId, id: { not: userMsg.id } },
        orderBy: { createdAt: 'desc' }, take: 20,
        select: { sender: true, content: true },
      }),
      prisma.article.findMany({
        where: {
          status: 'published',
          OR: [
            { title: { contains: content } },
            { summary: { contains: content } },
          ],
        },
        select: { title: true, summary: true, category: true },
        take: 3,
      }),
    ])

    // 等待安全检测结果
    const crisis = await crisisPromise
    if (crisis.flagged) {
      // 写入 flagged 标记
      prisma.chatMessage.update({
        where: { id: userMsg.id }, data: { flagged: true },
      }).catch((e: Error) => console.error('[Chat] 危机标记写入失败:', e.message))
    }

    // ===== 5. 切换到 SSE 模式 =====
    const rawReply = reply.raw
    rawReply.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    // 心跳：每 10 秒发一次 SSE 注释
    const heartbeat = setInterval(() => {
      rawReply.write(': heartbeat\n\n')
    }, 10_000)

    // 客户端断开 → 标记 + 清理心跳 + abort DeepSeek 调用避免浪费 token
    const streamAbort = new AbortController()
    let isDisconnected = false
    const onClose = () => {
      isDisconnected = true
      clearInterval(heartbeat)
      streamAbort.abort()
    }
    rawReply.on('close', onClose)

    // 发送 meta 事件
    sse(rawReply, 'meta', {
      sessionId,
      userMessage: {
        id: userMsg.id, sender: 'user' as const,
        content: userMsg.content, time: formatDateTime(new Date()),
      },
    })

    // ===== 6. 危机拦截流式分发或常规流式生成 =====
    let aiContent = ''
    try {
      if (crisis.flagged) {
        // 安全拦截：直接输出温暖安抚文字 + 热线求助引导，不走常规大模型。
        const safePrompt = `【重要提示】
我感受到了你此时此刻巨大的痛苦和无助，请深呼吸，千万不要轻易伤害自己。在这个世界上，你的生命非常重要，你不需要独自面对。
` + getCrisisGuidance()

        // 模拟打字机流式输出安全提示语（每 15 字符流式发一次，提供逼真且极速的关怀反馈）
        const chunkSize = 15
        for (let i = 0; i < safePrompt.length; i += chunkSize) {
          if (isDisconnected) break
          const chunk = safePrompt.slice(i, i + chunkSize)
          aiContent += chunk
          sse(rawReply, 'chunk', { content: chunk })
          await new Promise((resolve) => setTimeout(resolve, 80)) // 短暂延迟模拟打字机
        }
      } else {
        // 常规流
        const userContext = buildUserContext(user, recentMoods)
        const knowledgeSnippets = articles
          .filter((a) => a.summary)
          .map((a) => `《${a.title}》[${a.category}]：${a.summary}`)

        const memoryContext = await getMemoryContext(userId, content)
        // [...recent].reverse() 避免修改原数组，保证后续记忆提取读到 DB 原始顺序
        const history = [...recent].reverse().map((m) => ({
          sender: m.sender, content: m.content,
        }))

        const messages = buildContext({
          userMessage: content,
          history,
          userContext,
          knowledgeSnippets: knowledgeSnippets.length > 0 ? knowledgeSnippets : undefined,
          memoryContext,
        })

        aiContent = await streamChat(messages, {
          onChunk: (delta) => {
            if (isDisconnected) return
            sse(rawReply, 'chunk', { content: delta })
          },
        }, deepThinking ?? false, undefined, streamAbort.signal)
      }

      if (isDisconnected) {
        console.log('[Chat] 客户端断开，跳过保存 AI 回复')
        return
      }

      // ===== 7. 保存 AI 回复 =====
      const aiMsg = await prisma.chatMessage.create({
        data: { sessionId, sender: 'assistant', content: aiContent },
      })

      // 首条用户消息 → 更新会话标题
      const count = await prisma.chatMessage.count({
        where: { sessionId, sender: 'user' },
      })
      if (count === 1) {
        await prisma.chatSession.update({
          where: { id: sessionId }, data: { title: contentToTitle(content) },
        })
      }

      sse(rawReply, 'done', {
        aiReply: {
          id: aiMsg.id, sender: 'assistant' as const,
          content: aiContent, time: formatDateTime(new Date()),
        },
      })
    } catch (err: unknown) {
      if (isDisconnected) {
        console.log('[Chat] 客户端断开，AI 调用中止')
      } else {
        console.error('[Chat] AI 调用失败:', err instanceof Error ? err.message : String(err))
        sse(rawReply, 'error', { message: 'AI 回复生成失败，请稍后重试' })
      }
    } finally {
      clearInterval(heartbeat)
      rawReply.off('close', onClose)
      rawReply.end()
    }

    // ===== 8. 异步提取长期记忆 (完全非阻塞) =====
    // 注意：如果是危机拦截状态下，不应该把无意义、极端绝望的自伤呼救词条提取为“爱好”或“人际关系”长期记忆，跳过提取
    if (aiContent && !isDisconnected && !crisis.flagged) {
      const userMsgCount = recent.filter((m) => m.sender === 'user').length + 1
      if (userMsgCount >= 4) {
        // 冷却控制：距上次提取 ≥ 30 分钟，或新增 ≥ 10 条用户消息，才触发
        const prev = memoryExtractionTracker.get(userId)
        const shouldExtract = !prev
          || (Date.now() - prev.time >= 30 * 60 * 1000)
          || (userMsgCount - prev.msgCount >= 10)

        if (shouldExtract) {
          memoryExtractionTracker.set(userId, { time: Date.now(), msgCount: userMsgCount })

          void (async () => {
          try {
            // recent 是 desc 顺序，取最新 6 条后翻转为时间顺序
            const recentForMemory = recent
              .slice(0, 6)
              .reverse()
              .map((m) => ({ sender: m.sender, content: m.content }))
            recentForMemory.push({ sender: 'user', content })
            recentForMemory.push({ sender: 'assistant', content: aiContent })

            const filteredMemoryInput = recentForMemory.filter((m) => m.content)
            const items = await extractMemories(filteredMemoryInput)
            await saveMemories(userId, items)
          } catch (e: unknown) {
            console.error('[Memory Background] 记忆自动提取/保存失败:', e instanceof Error ? e.message : String(e))
          }
        })()
        }
      }
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
    const pinned = !session!.pinned

    await prisma.chatSession.update({
      where: { id: resolved.sessionId }, data: { pinned },
    })
    return reply.send({
      code: 200, message: pinned ? '已置顶' : '已取消置顶', data: { pinned },
    })
  })

  // ========== DELETE /api/user/chat/sessions/:id —— 删除 ==========
  app.delete('/api/user/chat/sessions/:id', async (request, reply) => {
    const resolved = await resolveSession(request, reply)
    if (!resolved) return

    await prisma.chatSession.delete({
      where: { id: resolved.sessionId },
    })
    return reply.send({ code: 200, message: '会话已删除', data: null })
  })
}
