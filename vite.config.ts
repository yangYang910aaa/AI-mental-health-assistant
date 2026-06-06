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

      // ==================== 文章列表 ====================
      server.middlewares.use('/api/articles/list', (req, res, next) => {
        if (req.method !== 'GET') return next()

        // 解析 query string
        const url = new URL(req.url!, 'http://localhost')
        const title = url.searchParams.get('title') || undefined
        const category = url.searchParams.get('category') || undefined
        const status = url.searchParams.get('status') || undefined
        const page = Number(url.searchParams.get('page')) || 1
        const pageSize = Number(url.searchParams.get('pageSize')) || 10

        // 筛选
        let filtered = mockArticles
        if (title) {
          filtered = filtered.filter((a) => a.title.includes(title))
        }
        if (category) {
          filtered = filtered.filter((a) => a.category === category)
        }
        if (status) {
          filtered = filtered.filter((a) => a.status === status)
        }

        // 分页
        const total = filtered.length
        const start = (page - 1) * pageSize
        const list = filtered.slice(start, start + pageSize)

        json(res, {
          code: 200, message: 'ok',
          data: { list, total },
        })
      })

      // ==================== 创建文章 ====================
      server.middlewares.use('/api/articles', async (req, res, next) => {
        if (req.method !== 'POST') return next()

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

          json(res, { code: 200, message: '创建成功', data: newArticle })
        } catch {
          json(res, { code: 400, message: '请求格式错误', data: null })
        }
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
