import { createRouter,createWebHistory } from "vue-router";
import { validateToken } from '@/api/auth'

// 路由名称常量，方便全局引用和跳转
export const ROUTE_NAMES = {
  // 后台路由
  backLayout: 'backLayout',
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
  userMemory: 'userMemory',
  // 认证路由
  authLayout: 'authLayout',
  login: 'login',
  register: 'register',
  forgotPassword: 'forgotPassword',
  // 404 未匹配路由
  notFound: 'notFound',
} as const

// 定义路由
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 根路径 → 登录页
    { path: '/', redirect:{ name:ROUTE_NAMES.login } },

    // ==================== 管理后台 ====================
    {
      path: '/back',
      name: ROUTE_NAMES.backLayout,
      component: () => import('@/layouts/adminLayout.vue'),
      redirect:{name:ROUTE_NAMES.dashboard},
      meta:{requiresAuth:true},
      beforeEnter:(_to,_from,next)=>{
        //只保留admin校验,token校验在beforeEach中处理
        try{
          const raw=localStorage.getItem('userInfo')
          const userInfo=raw? JSON.parse(raw) : null
          if(!userInfo?.roles?.includes('admin')){
            // 非管理员用户，重定向到登录页
            return next({name:ROUTE_NAMES.login})
          }
          next()
        }catch{
          next({name:ROUTE_NAMES.login})
        }
      },
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
      redirect:{name:ROUTE_NAMES.userHome},
      meta:{requiresAuth:true},
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
        {
          path: 'memory',
          name: ROUTE_NAMES.userMemory,
          component: () => import('@/views/user-page/userMemory.vue'),
          meta: { title: '记忆管理' },
        },
      ],
    },

    // ==================== 认证 ====================
    {
      path:'/auth',
      name:ROUTE_NAMES.authLayout,
      component:()=>import('@/layouts/authLayout.vue'),
      children:[
        {
          path:'login',
          name:ROUTE_NAMES.login,
          component:()=>import('@/views/login/login.vue'),
          meta:{title:'登录'}
        },
        {
          path:'register',
          name:ROUTE_NAMES.register,
          component:()=>import('@/views/login/register.vue'),
          meta:{title:'注册'}
        },
        {
          path:'forgot-password',
          name:ROUTE_NAMES.forgotPassword,
          component:()=>import('@/views/login/forgotPassword.vue'),
          meta:{title:'忘记密码'}
        }
      ]
    },
    {
      // 404 未匹配路由
      path: '/:pathMatch(.*)*',
      name: ROUTE_NAMES.notFound,
      component: () => import('@/views/NotFound.vue'),
    },
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

  // 统一拦截需要登录的页面
  if(to.matched.some(record=>record.meta.requiresAuth)){
    if(!tokenValid && !token){
      return next({name:ROUTE_NAMES.login,query:{redirect:to.fullPath}})
    }
  }
  // —— /auth/* 认证路由：已登录则按角色分流 ——
  if (to.path.startsWith('/auth') && token && tokenValid) {
    try {
      const raw = localStorage.getItem('userInfo')
      const userInfo = raw ? JSON.parse(raw) : null
      if (userInfo?.roles?.includes('admin')) {
        next({name:ROUTE_NAMES.dashboard})
      } else {
        next({ name:ROUTE_NAMES.userHome })
      }
    } catch {
      next({ name:ROUTE_NAMES.userHome })
    }
    return
  }

  next()
})

export default router
