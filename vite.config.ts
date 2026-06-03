import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * Mock API 插件 —— 后端还没好时临时挡一下。
 * 拦截 /api/auth/login POST，返回 mock 数据。
 * 后端就绪后删除此插件即可。
 */
function mockApiPlugin(): Plugin {
  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use('/api/auth/login', (req, res, next) => {
        if (req.method !== 'POST') return next()

        // 读取 POST body
        let body = ''
        req.on('data', (chunk: Buffer) => (body += chunk.toString()))
        req.on('end', () => {
          try {
            const { username, password } = JSON.parse(body)

            // 模拟校验：密码至少 6 位
            if (!password || password.length < 6) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                code: 400,
                message: '密码至少 6 位',
                data: null,
              }))
              return
            }

            // 模拟成功登录
            const isEmail = username?.includes('@')
            const displayName = username || 'admin'

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              code: 200,
              message: 'ok',
              data: {
                token: 'mock-jwt-token-xxxxx',
                userInfo: {
                  id: 1,
                  username: isEmail ? username : displayName,
                  nickname: isEmail ? displayName.split('@')[0] : displayName,
                  avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${displayName}`,
                  roles: ['admin'],
                },
              },
            }))
          } catch {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              code: 400,
              message: '请求格式错误',
              data: null,
            }))
          }
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
