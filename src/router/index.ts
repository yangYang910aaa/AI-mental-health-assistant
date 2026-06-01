import { createRouter,createWebHistory } from "vue-router";

//定义路由
const router=createRouter(
    {
        history:createWebHistory(),
        //路由配置
        routes:[
            {
                path:'/back',
                component:()=>import('@/components/backToLayout.vue'),
                children:[
                    {path:'dashboard',component:()=>import('@/views/dashboard.vue'),meta:{title:'数据分析',icon:'PieChart'}},
                    {path:'knowledge',component:()=>import('@/views/knowledge.vue'),meta:{title:'知识文章',icon:'ChatLineSquare'}},
                    {path:'consultations',component:()=>import('@/views/consultations.vue'),meta:{title:'咨询记录',icon:'Message'}},
                    {path:'emotional',component:()=>import('@/views/emotional.vue'),meta:{title:'情感分析',icon:'User'}},
                ]
            }
        ]
    }
)
export default router