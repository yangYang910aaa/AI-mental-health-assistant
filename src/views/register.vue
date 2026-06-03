<template>
  <div class="register-card">
    <div class="brand">
      <h2 class="brand-title">创建账号</h2>
      <p class="brand-desc">注册成为 AI 心理健康助手的一员</p>
    </div>

    <div class="card-placeholder">
      <p>注册页面开发中…</p>
      <router-link to="/auth/login">已有账号？去登录</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
@keyframes card-in {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

.register-card {
  background: #fff;
  border-radius: 20px;
  padding: 48px 40px 36px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.06),
    0 12px 48px rgba(0, 0, 0, 0.04);
  animation: card-in 0.6s ease-out;
    
    .brand {
    text-align: center;
    margin-bottom: 24px;

    .brand-title {
        font-size: 24px;
        font-weight: 600;
        color: #2c3e2d;
        margin: 0 0 8px;
        }

    .brand-desc {
        font-size: 14px;
        color: #9b9b8a;
        margin: 0;
        }
    }
    .card-placeholder {
        text-align: center;
        padding: 24px;
        color: #b0ad9f;

        a {
            color: #8b9e7e;
        }
    }
}





</style>
