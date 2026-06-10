import { createRouter,createWebHistory } from "vue-router";

// 路由名称常量，方便全局引用和跳转
export const ROUTE_NAMES = {
  // 后台路由
  backLayout: 'backL',
  dashboard: 'dashboard',
  knowledge: 'knowledge',
  consultations: 'consultations',
  emotional: 'emotional',
  // 认证路由
  authLayout: 'authLayout',
  login: 'login',
  register: 'register',
} as const

// 定义路由
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 默认访问登录页
    { path: '/', redirect: '/auth/login' },
    {
      path: '/back',
      name: ROUTE_NAMES.backLayout,
      component: () => import('@/components/admin-page/backToLayout.vue'),
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
      ],
    },
    {
      path:'/auth',
      name:'auth',
      component:()=>import('@/components/login/authLayout.vue'),
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
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')

  // —— /back/* 后台路由：需登录 + 管理员角色 ——
  if (to.path.startsWith('/back')) {
    if (!token) {
      // 没登录，跳登录页并记住原本想去哪
      next({ path: '/auth/login', query: { redirect: to.fullPath } })
      return
    }

    // 已登录但需校验角色
    try {
      const raw = localStorage.getItem('userInfo')
      const userInfo = raw ? JSON.parse(raw) : null
      if (!userInfo?.roles?.includes('admin')) {
        // 有 token 但不是管理员，踢回登录页
        next({ path: '/auth/login' })
        return
      }
    } catch {
      next({ path: '/auth/login' })
      return
    }
  }

  // —— /auth/* 认证路由：已登录则跳过 ——
  if (to.path.startsWith('/auth') && token) {
    next({ path: '/back/knowledge' })
    return
  }

  next()
})

export default router