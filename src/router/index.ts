import { createRouter,createWebHistory } from "vue-router";

// 路由名称常量，方便全局引用和跳转
export const ROUTE_NAMES = {
  dashboard: 'dashboard',
  knowledge: 'knowledge',
  consultations: 'consultations',
  emotional: 'emotional',
} as const

// 定义路由
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/back',
      component: () => import('@/components/backToLayout.vue'),
      redirect: '/back/dashboard',
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
  ],
})
export default router