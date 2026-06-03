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
    {
      path: '/back',
      name: ROUTE_NAMES.backLayout,
      component: () => import('@/components/backToLayout.vue'),
      redirect: '/back/knowledge',
      children: [
        {
          path: 'dashboard',
          name: ROUTE_NAMES.dashboard,
          component: () => import('@/views/dashboard.vue'),
          meta: { title: '数据分析', icon: 'PieChart' },
        },
        {
          path: 'knowledge',
          name: ROUTE_NAMES.knowledge,
          component: () => import('@/views/knowledge.vue'),
          meta: { title: '知识文章', icon: 'ChatLineSquare' },
        },
        {
          path: 'consultations',
          name: ROUTE_NAMES.consultations,
          component: () => import('@/views/consultations.vue'),
          meta: { title: '咨询记录', icon: 'Message' },
        },
        {
          path: 'emotional',
          name: ROUTE_NAMES.emotional,
          component: () => import('@/views/emotional.vue'),
          meta: { title: '情感分析', icon: 'User' },
        },
      ],
    },
    {
      path:'/auth',
      name:'auth',
      component:()=>import('@/components/authLayout.vue'),
      children:[
        {
          path:'login',
          name:'login',
          component:()=>import('@/views/login.vue'),
          meta:{title:'登录'}
        },
        {
          path:'register',
          name:'register',
          component:()=>import('@/views/register.vue'),
          meta:{title:'注册'}
        }
      ]
    }
  ],
})
export default router