<template>
    <el-aside width="270px">
        <el-menu
        default-active="2"
        class="el-menu-vertical-demo"
        @open="handleOpen"
        @close="handleClose"
         >
            <el-menu-item v-for="item in routes" :key="item.path" :index="item.path">
                <el-icon><component :is="item.meta?.icon" /></el-icon>
                <span>{{ item.meta?.title }}</span>
            </el-menu-item>
        </el-menu>
    </el-aside>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
const router=useRouter()
const routes=router.options.routes[0].children
const handleOpen=()=>{

}
const handleClose=()=>{

}
</script>

