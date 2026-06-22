<template>
  <div class="user-nav">
    <!-- ==================== 左侧：logo+名称 ==================== -->
    <div class="nav-brand" @click="router.push({ name: ROUTE_NAMES.userHome })">
      <el-image :src="logoUrl" alt="Logo" style="width: 36px; height: 36px" />
      <span class="brand-text">AI 心理健康助手</span>
    </div>

    <!-- ==================== 中间：导航链接 ==================== -->
    <div class="nav-links">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="nav-link"
        :class="{ active: isActive(item.name) }"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
      </router-link>
    </div>

    <!-- ==================== 右侧：用户菜单 ==================== -->
    <div class="nav-user">
      <el-dropdown :teleported="false" trigger="click" @command="handleCommand">
        <div class="user-trigger">
          <el-avatar :src="userAvatar" :size="32">{{ userInitial }}</el-avatar>
          <span class="user-name">{{ userStore.displayName || '未登录' }}</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人中心</el-dropdown-item>
            <el-dropdown-item command="memory">记忆管理</el-dropdown-item>
            <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowDown, HomeFilled, ChatDotRound, Sunny, Reading } from '@element-plus/icons-vue'
import { ROUTE_NAMES } from '@/router'
import { useUserStore } from '@/stores/user'
import { logout } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const logoUrl = new URL('@/assets/logo.svg', import.meta.url).href

const userAvatar = computed(() => userStore.userInfo?.avatar || '')
const userInitial = computed(() => userStore.displayName?.charAt(0) || 'U')

// 导航项配置
const navItems = [
  { name: ROUTE_NAMES.userHome, label: '首页', icon: HomeFilled },
  { name: ROUTE_NAMES.userChat, label: 'AI 对话', icon: ChatDotRound },
  { name: ROUTE_NAMES.userMood, label: '心情记录', icon: Sunny },
  { name: ROUTE_NAMES.userArticles, label: '健康知识', icon: Reading },
]

// 判断当前路由是否匹配导航项
const isActive = (name: string) => {
  // 文章详情页也高亮"健康知识"
  if (name === ROUTE_NAMES.userArticles && route.name === ROUTE_NAMES.userArticleDetail) return true
  return route.name === name
}

const handleCommand = (command: string) => {
  if (command === 'logout') {
    userStore.clearUser()
    logout()
  }
  if (command === 'profile') {
    router.push({ name: ROUTE_NAMES.userProfile })
  }
  if (command === 'memory') {
    router.push({ name: ROUTE_NAMES.userMemory })
  }
}
</script>

<style lang="scss" scoped>
.user-nav {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.06);
  border-bottom: 1px solid #e8e5df;

  // ==================== logo+名称 ====================
  .nav-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    flex-shrink: 0;

    .brand-text {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e2d;
    }
  }

  // ==================== 导航链接 ====================
  .nav-links {
    display: flex;
    align-items: center;
    gap: 30px;

    .nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      color: #6b7280;
      text-decoration: none;
      transition: background 0.2s, color 0.2s;

      &:hover {
        background: #f3f4f6;
        color: #2c3e2d;
      }

      &.active {
        background: #e8f0e4; // 淡鼠尾草绿
        color: #5a7a4e;
        font-weight: 500;
      }
    }
  }

  // ==================== 用户菜单 ====================
  .nav-user {
    flex-shrink: 0; // 防止用户菜单被压缩

    // teleported=false，菜单在组件树内，用 :deep 穿透 scoped
    :deep(.el-popper) {
      min-width: 120px !important;
      min-height: 72px !important;
      transition: none !important; // 去掉 zoom-in 动画，消除退出时挤压闪烁
    }

    // 下拉区域抑制全局 :focus-visible 的蓝框
    :deep(:focus-visible) {
      outline: none !important;
    }

    .user-trigger {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
      transition: background 0.2s;

      &:hover {
        background: #f3f4f6;
      }

      .user-name {
        font-size: 14px;
        color: #374151;
        //下列四条：超出部分省略号显示
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}
</style>
