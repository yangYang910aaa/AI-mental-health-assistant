<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ROUTE_NAMES } from '@/router'

const router = useRouter()
const userStore = useUserStore()

const isAdmin = computed(() => {
  try {
    const raw = localStorage.getItem('userInfo')
    return raw ? JSON.parse(raw)?.roles?.includes('admin') : false
  } catch { return false }
})

const homeRoute = computed(() => {
  if (!userStore.isLoggedIn) return { name: ROUTE_NAMES.login }
  return isAdmin.value
    ? { name: ROUTE_NAMES.dashboard }
    : { name: ROUTE_NAMES.userHome }
})

const homeLabel = computed(() => {
  if (!userStore.isLoggedIn) return '返回登录'
  return isAdmin.value ? '返回管理后台' : '返回首页'
})
</script>

<template>
  <div class="not-found">
    <div class="nf-card">
      <p class="nf-code">404</p>
      <h1 class="nf-title">页面未找到</h1>
      <p class="nf-desc">你访问的页面不存在或已被移除</p>
      <el-button type="primary" @click="router.replace(homeRoute)">
        {{ homeLabel }}
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.not-found {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #faf7f2 0%, #f0ede4 50%, #e8ede4 100%);
}

.nf-card {
  text-align: center;
}

.nf-code {
  font-size: 96px;
  font-weight: 700;
  color: #c4d8c8;
  line-height: 1;
  margin: 0 0 8px;
  letter-spacing: 4px;
}

.nf-title {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px;
}

.nf-desc {
  font-size: 14px;
  color: #9ca3af;
  margin: 0 0 28px;
}
</style>
