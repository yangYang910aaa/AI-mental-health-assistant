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

  // mock 文章数据
  const mockArticles = Array.from({ length: 32 }, (_, i) => ({
    id: i + 1,
    title: [
      '如何缓解日常焦虑情绪', '正念冥想的科学依据', '建立健康人际关系的五个方法',
      '应对职场压力的实用技巧', '青少年心理健康指南', '睡眠质量与心理健康的关系',
      '认知行为疗法入门', '情绪管理：从觉察到调节', '走出抑郁的第一步',
      '心理健康自我评估指南',
    ][i % 10] + `（${i + 1}）`,
    category: ['mental-health', 'emotion-management', 'stress-coping', 'relationships'][i % 4],
    author: '系统管理员',
    views: Math.floor(Math.random() * 5000) + 100,
    summary: '这是一篇关于心理健康的知识文章，旨在帮助读者了解相关概念并应用于日常生活。',
    status: (i % 7 === 0 ? 'offline' : i % 5 === 0 ? 'draft' : 'published') as 'published' | 'draft' | 'offline',
    createdAt: new Date(2026, 5 - (i % 5), 30 - (i % 30)).toISOString().split('T')[0],
  }))

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
      // ==================== 登录 ====================
      server.middlewares.use('/api/auth/login', async (req, res, next) => {
        if (req.method !== 'POST') return next()

        try {
          const { username, password } = JSON.parse(await readBody(req))

          if (!password || password.length < 6) {
            return json(res, { code: 400, message: '密码至少 6 位', data: null })
          }

          const isEmail = username?.includes('@')
          const displayName = username || 'admin'

          json(res, {
            code: 200, message: 'ok',
            data: {
              token: 'mock-jwt-token-xxxxx',
              userInfo: {
                id: 1,
                username: isEmail ? username : displayName,
                nickname: isEmail ? displayName.split('@')[0] : displayName,
                avatar: '', // 空值 → el-avatar 展示首字兜底
                roles: ['admin'],
              },
            },
          })
        } catch {
          json(res, { code: 400, message: '请求格式错误', data: null })
        }
      })

      // ==================== 知识文章：CRUD ====================
      server.middlewares.use('/api/knowledge/articles', async (req, res, next) => {
        // GET 列表
        if (req.method === 'GET') {
          const url = new URL(req.url!, 'http://localhost')
          const title = url.searchParams.get('title') || undefined
          const category = url.searchParams.get('category') || undefined
          const status = url.searchParams.get('status') || undefined
          const page = Number(url.searchParams.get('page')) || 1
          const pageSize = Number(url.searchParams.get('pageSize')) || 10

          let filtered = mockArticles
          if (title) filtered = filtered.filter((a) => a.title.includes(title))
          if (category) filtered = filtered.filter((a) => a.category === category)
          if (status) filtered = filtered.filter((a) => a.status === status)

          const total = filtered.length
          const start = (page - 1) * pageSize
          const list = filtered.slice(start, start + pageSize)

          return json(res, { code: 200, message: 'ok', data: { list, total } })
        }

        // PUT 更新
        if (req.method === 'PUT') {
          try {
            const id = Number(req.url!.split('/').pop()?.split('?')[0])
            const idx = mockArticles.findIndex((a) => a.id === id)
            if (idx === -1) return json(res, { code: 404, message: '文章不存在', data: null })

            const body = JSON.parse(await readBody(req))
            mockArticles[idx] = { ...mockArticles[idx], ...body }
            return json(res, { code: 200, message: '更新成功', data: mockArticles[idx] })
          } catch {
            return json(res, { code: 400, message: '请求格式错误', data: null })
          }
        }

        // POST 创建
        if (req.method === 'POST') {
          try {
            const body = JSON.parse(await readBody(req))
            const newArticle = {
              id: mockArticles.length + 1,
              title: body.title || '',
              content: body.content || '',
              category: body.category || 'mental-health',
              author: '系统管理员',
              summary: body.summary || '',
              coverImage: body.coverImage || '',
              tags: body.tags || [],
              status: 'draft' as const,
              views: 0,
              createdAt: new Date().toISOString().split('T')[0],
            }
            mockArticles.unshift(newArticle)
            return json(res, { code: 200, message: '创建成功', data: newArticle })
          } catch {
            return json(res, { code: 400, message: '请求格式错误', data: null })
          }
        }

        // DELETE 删除
        if (req.method === 'DELETE') {
          const id = Number(req.url!.split('/').pop()?.split('?')[0])
          const idx = mockArticles.findIndex((a) => a.id === id)
          if (idx === -1) return json(res, { code: 404, message: '文章不存在', data: null })

          mockArticles.splice(idx, 1)
          return json(res, { code: 200, message: '删除成功', data: null })
        }

        next()
      })

      // ==================== 咨询记录 ====================
      server.middlewares.use('/api/consultations/records', async (req, res, next) => {
        // GET 列表 / 详情
        if (req.method === 'GET') {
          const url = new URL(req.url!, 'http://localhost')
          // 路径末段是数字 → 详情
          const id = Number(url.pathname.split('/').pop())
          if (id) {
            const record = mockConsultations.find((c) => c.id === id)
            if (!record) return json(res, { code: 404, message: '咨询记录不存在', data: null })
            const messages = generateMockMessages(id, record.messageCount, record.firstMessage)
            const lastMsg = messages[messages.length - 1]
            return json(res, { code: 200, message: 'ok', data: { ...record, messages, messageCount: messages.length, lastMessageTime: lastMsg.time } })
          }

          const page = Number(url.searchParams.get('page')) || 1
          const pageSize = Number(url.searchParams.get('pageSize')) || 10

          const total = mockConsultations.length
          const start = (page - 1) * pageSize
          const list = mockConsultations.slice(start, start + pageSize)

          return json(res, { code: 200, message: 'ok', data: { list, total } })
        }

        // DELETE 删除
        if (req.method === 'DELETE') {
          const id = Number(req.url!.split('/').pop())
          const idx = mockConsultations.findIndex((c) => c.id === id)
          if (idx === -1) return json(res, { code: 404, message: '咨询记录不存在', data: null })

          mockConsultations.splice(idx, 1)
          return json(res, { code: 200, message: '删除成功', data: null })
        }

        next()
      })

      // ==================== 文件上传 ====================
      server.middlewares.use('/api/file/upload', async (req, res, next) => {
        if (req.method !== 'POST') return next()

        // mock：直接返回一个假 URL，不真实存储文件
        json(res, {
          code: 200,
          message: 'ok',
          data: { url: 'https://picsum.photos/400/240' },
        })
      })
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
    },
  },
  //配置路径别名
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
