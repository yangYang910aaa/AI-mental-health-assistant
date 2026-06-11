<template>
  <div class="user-layout">
    <userNav />
    <div class="user-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import userNav from '@/components/user-page/userNav.vue'
</script>

<style lang="scss" scoped>
.user-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f3ef;
}

.user-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
