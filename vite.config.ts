import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * Mock API 插件 —— 后端还没好时临时挡一下。
 * 后端就绪后删除此插件即可。
 */
function mockApiPlugin(): Plugin {
  // 读 POST body 的辅助函数
  const readBody = (req: any): Promise<string> =>
    new Promise((resolve) => {
      let body = ''
      req.on('data', (chunk: Buffer) => (body += chunk.toString()))
      req.on('end', () => resolve(body))
    })

  // 快捷返回 JSON
  const json = (res: any, data: unknown) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
  }

  // mock 咨询记录数据
  const userNicknames = ['小明', '阿花', '大刘', '小美', '老张', '静静', '阿杰', '小七', '木子', '圆圆']
  const firstMessages = [
    '最近工作压力特别大，经常失眠到凌晨三四点，白天又没精神，感觉整个人都快撑不住了...',
    '我和男朋友分手一个月了，还是走不出来，每天都会偷偷看他朋友圈，心里特别难受。',
    '孩子初三了，整天把自己关在房间里打游戏，成绩一落千丈，我说什么都不听，真的很焦虑。',
    '上次聊完我试了你说的正念练习，坚持了一周，感觉入睡确实快了一些，但还是容易中途醒来。',
    '今天面试又挂了，已经第四家了，感觉自己好没用，毕业快半年了还没找到工作。',
    '室友总是半夜打电话打游戏，沟通过好几次都没用，我现在一想到回宿舍就烦躁。',
    '谢谢你的建议！这周我试着跟妈妈好好谈了一次，虽然中间吵了几句，但最后她说理解我了，好开心。',
    '我总是忍不住去检查门锁和煤气，出门要反复确认十几遍，知道没必要但就是控制不住。',
    '最近食欲特别差，什么都不想吃，一个月瘦了八斤，朋友都说我脸色很差，但我真的没胃口。',
    '我今天终于鼓起勇气约了心理咨询师，下周二第一次面询。说实话有点紧张，但也挺期待的。',
  ]
  const aiNames = ['宁渡AI助手', '宁渡AI助手', '宁渡AI助手', '宁渡AI助手', '宁渡AI助手', '宁渡AI助手', '宁渡AI助手', '安心AI助手', '安心AI助手', '安心AI助手']

  const mockConsultations = Array.from({ length: 45 }, (_, i) => {
    const daysAgo = Math.floor(Math.random() * 60) // 最近 60 天内
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60))
    const idx = i % 10
    return {
      id: i + 1,
      userId: 1000 + (idx + 1),
      userNickName: userNicknames[idx],
      aiName: aiNames[idx],
      firstMessage: firstMessages[idx],
      lastMessageTime: d.toISOString().replace('T', ' ').slice(0, 19),
      messageCount: Math.floor(Math.random() * 9) + 4, // 4~12 条
      startedAt: new Date(d.getTime() - (Math.floor(Math.random() * 3600000) * 6)).toISOString().replace('T', ' ').slice(0, 19),
    }
  })

  // 为详情接口生成 mock 对话消息
  const generateMockMessages = (consultationId: number, msgCount: number, firstContent: string) => {
    const userMessages = [
      '最近总是睡不好，晚上躺在床上脑子停不下来，翻来覆去到凌晨才睡着。',
      '我也试过听轻音乐，但感觉没什么用，反而更清醒了。',
      '白天工作的时候特别困，咖啡喝了好几杯也没用。',
      '会不会跟我最近项目压力大有关？马上要上线了，每天都加班。',
      '你说的对，我确实很少运动，下班回家就躺着刷手机。',
      '那我今晚试试你说的呼吸练习，具体要怎么做？',
      '谢谢你，跟你聊完感觉轻松多了，至少知道问题在哪了。',
    ]
    const assistantMessages = [
      '听起来你最近睡眠质量不太好，能具体说说是什么时候开始的吗？',
      '失眠很多时候不是单一原因，你提到了工作压力，这确实是很常见的诱因。',
      '除了工作压力，你平时的作息规律吗？比如睡前会不会看手机？',
      '我建议你先从两个小习惯开始：睡前半小时放下手机，然后试试 4-7-8 呼吸法。',
      '4-7-8 呼吸法很简单：鼻子吸气 4 秒，憋气 7 秒，嘴巴缓慢呼气 8 秒，重复 4 次。',
      '不客气！坚持一周看看效果，如果还是不行我们再聊。记住，偶尔的失眠不代表什么，别太焦虑。',
    ]
    // 用户连发时的额外消息（AI 还没来得及回，用户又发了一条）
    const doubleTextMessages = [
      '对了，我昨天说的那个情况今天好像更严重了...',
      '还有一件事我刚才忘了说，最近心情特别烦躁。',
      '另外，我发现自己最近总是莫名其妙想哭。',
      '补充一下，这种情况一般发生在晚上。',
    ]

    const count = Math.min(msgCount, 12) // 最多 12 条
    const isOdd = count % 2 === 1

    // 奇数 → 模拟用户连发：在某处多插入一条用户消息
    const doubleIdx = isOdd
      ? 1 + 2 * Math.floor(Math.random() * Math.floor(count / 2)) // 随机奇数位，替换该处的 AI 回复
      : -1

    const messages: Array<{ id: number; sender: 'user' | 'assistant'; content: string; time: string }> = []
    const baseTime = new Date()
    baseTime.setHours(baseTime.getHours() - consultationId)

    for (let i = 0; i < count; i++) {
      const t = new Date(baseTime.getTime() + i * (60_000 + Math.random() * 120_000))

      // 决定 sender
      let sender: 'user' | 'assistant'
      if (i === 0) {
        sender = 'user'
      } else if (i === doubleIdx) {
        sender = 'user' // 用户连发，打断了 AI 的回复
      } else if (isOdd && i > doubleIdx) {
        sender = (i - 1) % 2 === 0 ? 'user' : 'assistant' // 连发后序列整体后移
      } else {
        sender = i % 2 === 0 ? 'user' : 'assistant' // 正常交替
      }

      // 决定 content
      let content: string
      if (i === 0) {
        content = firstContent
      } else if (i === doubleIdx) {
        content = doubleTextMessages[Math.floor(Math.random() * doubleTextMessages.length)]
      } else {
        content = sender === 'user'
          ? userMessages[(i * 3 + consultationId) % userMessages.length]
          : assistantMessages[(i * 5 + consultationId) % assistantMessages.length]
      }

      messages.push({
        id: i + 1,
        sender,
        content,
        time: t.toISOString().replace('T', ' ').slice(0, 19),
      })
    }
    return messages
  }


  return {
    name: 'mock-api',
    configureServer(server) {
      // auth 登录/注册 → 已由真实后端处理，mock 不再拦截
      // knowledge 文章 CRUD → 已由真实后端处理（server/src/routes/knowledge.ts），mock 不再拦截
      // consultations → 已由真实后端处理（server/src/routes/consultations.ts）

      // dashboard → 已由真实后端处理（server/src/routes/dashboard.ts）

      // user/home 用户首页 → 已由真实后端处理（server/src/routes/home.ts），mock 不再拦截

      // ==================== 用户端 - 聊天 ====================
      // 内存中维护的用户会话（按 userId 存储，dev server 重启后重置）
      const userSessions: Record<number, Array<{
        id: number
        title: string
        messages: Array<{ id: number; sender: 'user' | 'assistant'; content: string; time: string }>
      }>> = {}

      // 为已有 mock 咨询数据预建会话
      const initUserSessions = (userId: number) => {
        if (!userSessions[userId]) {
          userSessions[userId] = mockConsultations
            .filter((c) => c.userId === userId)
            .map((c) => ({
              id: c.id,
              title: c.firstMessage.length > 18 ? c.firstMessage.slice(0, 18) + '…' : c.firstMessage,
              messages: generateMockMessages(c.id, c.messageCount, c.firstMessage),
            }))
        }
      }

      // AI 回复池
      const aiReplies = [
        '谢谢你愿意和我分享这些，能具体说说是什么让你有这样的感受吗？',
        '我听到了你的困扰，这种感觉确实不容易。你之前有尝试过什么方法来应对吗？',
        '每个人都会有这样的时候，你的感受是完全正常的。要不要试试换个角度看这件事？',
        '听你这么说，我能感受到你内心的挣扎。如果现在给自己一个小小的安慰，那会是什么？',
        '你提到的情况我很关注。除了这些外在因素，你觉得自己内心的声音是怎么说的？',
        '这是一个很重要的觉察。当你开始注意到这些的时候，改变其实已经悄悄开始了。',
        '不用着急，我们慢慢来。有时候，仅仅是说出来，就已经是向前迈了一大步。',
        '我理解你的感受。如果用一个词来形容你现在的状态，那会是什么？',
        '你的情绪是合理的，不要否定自己的感受。要不要试试今天给自己五分钟，什么都不做，只是呼吸？',
        '听起来你经历了很多。在这么多压力之中，你还愿意来这里和我聊，这本身就很了不起。',
        '我很好奇，如果这些事情发生在你最亲近的朋友身上，你会怎么安慰他？你能用同样的温柔对待自己吗？',
        '这个发现很有意义。你能觉察到这些，说明你对自己的了解比想象中更深。',
      ]

      server.middlewares.use('/api/user/chat/send', async (req, res, next) => {
        if (req.method !== 'POST') return next()

        try {
          const { sessionId, content, userId } = JSON.parse(await readBody(req))
          if (!content?.trim()) return json(res, { code: 400, message: '消息不能为空', data: null })

          initUserSessions(userId || 1001)
          const sessions = userSessions[userId || 1001]

          let session = sessionId ? sessions.find((s) => s.id === sessionId) : null
          // 不存在则新建会话
          if (!session) {
            const newId = Math.max(0, ...sessions.map((s) => s.id)) + 1
            session = {
              id: newId,
              title: content.length > 18 ? content.slice(0, 18) + '…' : content,
              messages: [],
            }
            sessions.unshift(session)
          }

          const now = new Date()
          const timeStr = now.toISOString().replace('T', ' ').slice(0, 19)
          const userMsg = {
            id: session.messages.length + 1,
            sender: 'user' as const,
            content,
            time: timeStr,
          }
          session.messages.push(userMsg)

          // 模拟 AI 延迟回复
          await new Promise((r) => setTimeout(r, 600 + Math.random() * 800))

          const aiMsg = {
            id: session.messages.length + 1,
            sender: 'assistant' as const,
            content: aiReplies[Math.floor(Math.random() * aiReplies.length)],
            time: new Date().toISOString().replace('T', ' ').slice(0, 19),
          }
          session.messages.push(aiMsg)

          // 更新会话标题（用第一条用户消息）
          if (session.messages.filter((m) => m.sender === 'user').length === 1) {
            session.title = content.length > 18 ? content.slice(0, 18) + '…' : content
          }

          json(res, { code: 200, message: 'ok', data: { userMessage: userMsg, aiReply: aiMsg } })
        } catch {
          json(res, { code: 400, message: '请求格式错误', data: null })
        }
      })

      server.middlewares.use('/api/user/chat/sessions', async (req, res, next) => {
        if (req.method !== 'GET') return next()

        const url = new URL(req.url!, 'http://localhost')
        const userId = Number(url.searchParams.get('userId')) || 1001
        const id = Number(url.pathname.split('/').pop())

        initUserSessions(userId)
        const sessions = userSessions[userId]

        // 路径末段是数字 → 返回该会话消息
        if (id) {
          const session = sessions.find((s) => s.id === id)
          if (!session) return json(res, { code: 404, message: '会话不存在', data: null })
          return json(res, { code: 200, message: 'ok', data: session.messages })
        }

        // 否则返回会话列表
        const list = sessions.map((s) => ({
          id: s.id,
          title: s.title,
          lastMessage: s.messages.length > 0 ? s.messages[s.messages.length - 1].content : '',
          lastTime: s.messages.length > 0 ? s.messages[s.messages.length - 1].time : '',
          messageCount: s.messages.length,
        }))
        json(res, { code: 200, message: 'ok', data: list })
      })

      // user/mood 心情记录 → 已由真实后端处理（server/src/routes/mood.ts），mock 不再拦截

      // file/upload → 已由真实后端处理（server/src/routes/file.ts），mock 不再拦截
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), mockApiPlugin()],
  // 开发服务器代理，把 /api 请求转发到后端（mock 插件命中的请求不会走到代理）
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  //配置路径别名
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
