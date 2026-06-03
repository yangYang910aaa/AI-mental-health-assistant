<template>
    <div class="nav-bar">
        <div class="nav-left flex-box">
            <el-button @click="handleCollapse">
                <el-icon><Expand /></el-icon>
            </el-button>
            <p class="page-title">导航栏</p>
        </div>
        <div class="nav-right flex-box">
            <el-dropdown @command="handleCommand">
                <div class="flex-box">
                    <el-avatar :src="userAvatar" size="default" />
                    <p class="user-name">admin</p>
                    <el-icon><ArrowDown /></el-icon>
                </div>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                        <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ArrowDown, Expand } from '@element-plus/icons-vue'
import {useAdminStore} from '@/stores/admin'

const adminStore=useAdminStore()
//点击切换折叠栏状态
const handleCollapse=()=>{
    adminStore.toggleCollapsed()
}

// 用户头像 URL，后续接入登录后替换为 store 中的动态地址
const userAvatar = 'https://api.dicebear.com/9.x/initials/svg?seed=Admin'

const handleCommand = (command: string) => {
  if (command === 'logout') {
    // TODO: 清除 token，跳转登录页
    console.log('退出登录')
  }
  if (command === 'profile') {
    // TODO: 跳转个人中心页
  }
}
</script>

<style lang="scss" scoped>
.nav-bar{
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 15px;
    background: white;
    box-shadow: 0 1px 4px rgba(0,21,41,0.08);
    border-bottom: 1px solid #e5e7eb;
    .flex-box{
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .page-title{
        margin-left: 15px;
        margin-right: 20px;
        font-size: 22px;
        font-weight: bold;
        color: #1f2937;
    }
}
</style>

