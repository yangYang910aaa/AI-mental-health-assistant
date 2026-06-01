<template>
  <el-aside width="260px">
    <el-menu
      :default-active="route.path"
      router
      class="menu"
    >
      <div class="brand">
        <el-image :src="logoUrl" alt="Logo" style="width: 50px; height: 50px" />
        <div class="info-card">
          <h1 class="brand-name">AI心理健康助手</h1>
          <p class="brand-description">管理后台</p>
        </div>
      </div>
      <el-menu-item v-for="item in routes" :key="item.path" :index="resolvePath(item.path)">
        <el-icon><component :is="item.meta?.icon" /></el-icon>
        <span>{{ item.meta?.title }}</span>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// /back 下的子路由
const routes = router.options.routes[0].children

// logo 路径
const logoUrl = new URL('@/assets/logo.svg', import.meta.url).href

// 拼接子路由完整路径，供 el-menu 的 index 做跳转
const resolvePath = (childPath: string) => `/back/${childPath}`
</script>

<style lang="scss" scoped>
.menu {
  height: 100%;

  .brand {
    display: flex;
    align-items: center;
    padding: 10px;
    background-color: #fff;
    border-bottom: 1px solid gainsboro;

    .info-card {
      margin-left: 15px;

      .brand-name {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 5px;
        color: #1f2937;
      }

      .brand-description {
        font-size: 14px;
        color: #6b7280;
      }
    }
  }
}
</style>
