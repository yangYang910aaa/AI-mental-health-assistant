import { createRouter,createWebHistory } from "vue-router";
import { validateToken } from '@/api/auth'

// 路由名称常量，方便全局引用和跳转
export const ROUTE_NAMES = {
  // 后台路由
  backLayout: 'backL',
  dashboard: 'dashboard',
  knowledge: 'knowledge',
  consultations: 'consultations',
  emotional: 'emotional',
  adminProfile: 'adminProfile',
  // 用户端路由
  userLayout: 'userLayout',
  userHome: 'userHome',
  userChat: 'userChat',
  userMood: 'userMood',
  userArticles: 'userArticles',
  userArticleDetail: 'userArticleDetail',
  userProfile: 'userProfile',
  // 认证路由
  authLayout: 'authLayout',
  login: 'login',
  register: 'register',
} as const

// 定义路由
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 根路径 → 登录页
    { path: '/', redirect: '/auth/login' },

    // ==================== 管理后台 ====================
    {
      path: '/back',
      name: ROUTE_NAMES.backLayout,
      component: () => import('@/layouts/adminLayout.vue'),
      redirect: '/back/knowledge',
      children: [
        {
          path: 'dashboard',
          name: ROUTE_NAMES.dashboard,
          component: () => import('@/views/admin-page/dashboard.vue'),
          meta: { title: '数据分析', icon: 'PieChart' },
        },
        {
          path: 'knowledge',
          name: ROUTE_NAMES.knowledge,
          component: () => import('@/views/admin-page/knowledge.vue'),
          meta: { title: '知识文章', icon: 'ChatLineSquare' },
        },
        {
          path: 'consultations',
          name: ROUTE_NAMES.consultations,
          component: () => import('@/views/admin-page/consultations.vue'),
          meta: { title: '咨询记录', icon: 'Message' },
        },
        {
          path: 'emotional',
          name: ROUTE_NAMES.emotional,
          component: () => import('@/views/admin-page/emotional.vue'),
          meta: { title: '情绪日志', icon: 'Calendar' },
        },
        {
          path: 'profile',
          name: ROUTE_NAMES.adminProfile,
          component: () => import('@/views/admin-page/adminProfile.vue'),
          meta: { title: '个人中心', hidden: true },
        },
      ],
    },

    // ==================== 用户端 ====================
    {
      path: '/user',
      name: ROUTE_NAMES.userLayout,
      component: () => import('@/layouts/userLayout.vue'),
      redirect: '/user/home',
      children: [
        {
          path: 'home',
          name: ROUTE_NAMES.userHome,
          component: () => import('@/views/user-page/userHome.vue'),
          meta: { title: '首页' },
        },
        {
          path: 'chat',
          name: ROUTE_NAMES.userChat,
          component: () => import('@/views/user-page/userChat.vue'),
          meta: { title: 'AI 对话' },
        },
        {
          path: 'mood',
          name: ROUTE_NAMES.userMood,
          component: () => import('@/views/user-page/userMood.vue'),
          meta: { title: '心情记录' },
        },
        {
          path: 'articles',
          name: ROUTE_NAMES.userArticles,
          component: () => import('@/views/user-page/userArticles.vue'),
          meta: { title: '健康知识' },
        },
        {
          path: 'articles/:id',
          name: ROUTE_NAMES.userArticleDetail,
          component: () => import('@/views/user-page/userArticleDetail.vue'),
          meta: { title: '文章详情' },
        },
        {
          path: 'profile',
          name: ROUTE_NAMES.userProfile,
          component: () => import('@/views/user-page/userProfile.vue'),
          meta: { title: '个人中心' },
        },
      ],
    },

    // ==================== 认证 ====================
    {
      path:'/auth',
      name:'auth',
      component:()=>import('@/layouts/authLayout.vue'),
      children:[
        {
          path:'login',
          name:'login',
          component:()=>import('@/views/login/login.vue'),
          meta:{title:'登录'}
        },
        {
          path:'register',
          name:'register',
          component:()=>import('@/views/login/register.vue'),
          meta:{title:'注册'}
        }
      ]
    }
  ],
})

// ==================== 导航守卫 ====================

/** 是否已完成首次 token 验证 */
let tokenChecked = false
/** 验证结果：true = token 有效 */
let tokenValid = false

router.beforeEach(async (to, _from, next) => {
  const token = localStorage.getItem('token')

  // —— 首次进入时，向后端验证 token ——
  if (token && !tokenChecked) {
    const userInfo = await validateToken()
    tokenChecked = true
    tokenValid = !!userInfo
    if (!tokenValid) {
      // token 无效，清掉残留
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
    }
  }

  // —— /back/* 后台路由：需登录 + 管理员角色 ——
  if (to.path.startsWith('/back')) {
    if (!tokenValid && !token) {
      next({ path: '/auth/login', query: { redirect: to.fullPath } })
      return
    }
    try {
      const raw = localStorage.getItem('userInfo')
      const userInfo = raw ? JSON.parse(raw) : null
      if (!userInfo?.roles?.includes('admin')) {
        next({ path: '/auth/login' })
        return
      }
    } catch {
      next({ path: '/auth/login' })
      return
    }
  }

  // —— /user/* 用户端路由：需登录 ——
  if (to.path.startsWith('/user')) {
    if (!tokenValid && !token) {
      next({ path: '/auth/login', query: { redirect: to.fullPath } })
      return
    }
  }

  // —— /auth/* 认证路由：已登录则按角色分流 ——
  if (to.path.startsWith('/auth') && token && tokenValid) {
    try {
      const raw = localStorage.getItem('userInfo')
      const userInfo = raw ? JSON.parse(raw) : null
      if (userInfo?.roles?.includes('admin')) {
        next({ path: '/back/knowledge' })
      } else {
        next({ path: '/user/home' })
      }
    } catch {
      next({ path: '/user/home' })
    }
    return
  }

  next()
})

export default router
