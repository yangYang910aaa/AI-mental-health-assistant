<template>
    <div class="nav-bar">
        <div class="nav-left flex-box">
            <el-button @click="handleCollapse">
                <el-icon><Expand /></el-icon>
            </el-button>
            <p class="page-title">{{ route.meta.title }}</p>
        </div>
        <div class="nav-right flex-box">
            <el-dropdown :teleported="false" @command="handleCommand">
                <div class="flex-box">
                    <el-avatar :src="userAvatar" >{{ userInitial }}</el-avatar>
                    <p class="user-name">{{ userStore.displayName || '未登录' }}</p>
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
import { computed } from 'vue'
import { ArrowDown, Expand } from '@element-plus/icons-vue'
import { useAdminStore } from '@/stores/admin'
import { useUserStore } from '@/stores/user'
import { logout } from '@/api/auth'
import {useRouter,useRoute} from 'vue-router'

const route=useRoute()

const adminStore = useAdminStore()
const userStore = useUserStore()

// 用户头像——后端返回就用图片，没有则 el-avatar 展示首字
const userAvatar = computed(() => userStore.userInfo?.avatar || '')
const userInitial = computed(() => userStore.displayName?.charAt(0) || '管')

//点击切换折叠栏状态
const handleCollapse = () => {
    adminStore.toggleCollapsed()
}

const handleCommand = (command: string) => {
  if (command === 'logout') {
    // clearUser：重置 Pinia 响应式状态
    // logout：清空 localStorage + 跳转登录页
    userStore.clearUser()
    logout()
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
    // ==================== 用户下拉菜单 ====================
    // teleported=false，菜单在组件树内，用 :deep 穿透 scoped
    :deep(.el-popper) {
      min-width: 120px !important;
      min-height: 72px !important; // 2 个 item
      transition: none !important; // 去掉 zoom-in 动画，消除挤压闪烁
    }

    // 下拉区域抑制全局 :focus-visible 的蓝框
    .nav-right :deep(:focus-visible) {
      outline: none !important;
    }
}
</style>
