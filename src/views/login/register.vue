<template>
  <!--
    注册页面卡片
    由 authLayout.vue 包裹，卡片在渐变背景上居中悬浮
  -->
  <div class="register-card">
    <!-- ==================== 返回首页 ==================== -->
    <div class="back-home" @click="router.push({ name: ROUTE_NAMES.knowledge })">
      <el-icon><Back /></el-icon>
      <span>返回首页</span>
    </div>

    <!-- ==================== 品牌区域 ==================== -->
    <div class="brand">
      <div class="brand-logo">
        <el-image :src="logoUrl" alt="Logo" style="width: 56px; height: 56px" />
      </div>
      <h1 class="brand-title">创建账号</h1>
      <p class="brand-desc">加入我们，开启心灵之旅</p>
    </div>

    <!-- ==================== 注册表单 ==================== -->
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      class="register-form"
      @keyup.enter="handleRegister"
    >
      <!-- 用户名 -->
      <el-form-item prop="username">
        <el-input
          v-model="formData.username"
          placeholder="请输入用户名"
          :prefix-icon="User"
          size="large"
        />
      </el-form-item>

      <!-- 邮箱（选填） -->
      <el-form-item prop="email">
        <el-input
          v-model="formData.email"
          placeholder="请输入邮箱（选填）"
          :prefix-icon="Message"
          size="large"
        />
      </el-form-item>

      <!-- 昵称（可选） -->
      <el-form-item prop="nickname">
        <el-input
          v-model="formData.nickname"
          placeholder="请输入昵称（选填）"
          :prefix-icon="UserFilled"
          size="large"
        />
      </el-form-item>

      <!-- 密码 -->
      <el-form-item prop="password">
        <el-input
          v-model="formData.password"
          type="password"
          placeholder="请输入密码"
          :prefix-icon="Lock"
          size="large"
          show-password
        />
      </el-form-item>

      <!-- 确认密码 -->
      <el-form-item prop="confirmPassword">
        <el-input
          v-model="formData.confirmPassword"
          type="password"
          placeholder="请再次输入密码"
          :prefix-icon="Lock"
          size="large"
          show-password
        />
      </el-form-item>

      <!-- 注册按钮 -->
      <el-form-item>
        <el-button
          type="primary"
          size="large"
          class="register-btn"
          :loading="loading"
          @click="handleRegister"
        >
          {{ loading ? '注册中…' : '注 册' }}
        </el-button>
      </el-form-item>
    </el-form>

    <!-- ==================== 底部链接 ==================== -->
    <p class="footer-link">
      已有账号？<router-link to="/auth/login">去登录</router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { User, UserFilled, Lock, Back, Message } from '@element-plus/icons-vue'
import { ROUTE_NAMES } from '@/router'
import { registerApi } from '@/api/auth'

const router = useRouter()

const formRef = ref<FormInstance>()

// 注册按钮 loading 态
const loading = ref(false)

// Vite 静态资源路径
const logoUrl = new URL('@/assets/logo.svg', import.meta.url).href

// 表单数据
const formData = reactive({
  username: '',
  email: '',
  nickname: '',
  password: '',
  confirmPassword: '',
})

// 校验确认密码
const validateConfirmPassword = (_rule: any, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
  } else if (value !== formData.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

// 表单校验规则
const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

// 注册逻辑
const handleRegister = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true

  try {
    await registerApi({
      username: formData.username,
      password: formData.password,
      nickname: formData.nickname || undefined,
      email: formData.email || undefined,
    })
    ElMessage.success('注册成功，请登录')
    router.push({ name: ROUTE_NAMES.login })
  } catch {
    // 错误提示由 axios 响应拦截器统一处理，此处仅恢复按钮状态
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
// ==================== 卡片容器 ====================
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.register-card {
  position: relative;
  background: #fff;
  border-radius: 20px;
  padding: 48px 40px 36px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.06),
    0 12px 48px rgba(0, 0, 0, 0.04);
  animation: card-in 0.6s ease-out;

  // ==================== 返回首页 ====================
  .back-home {
    position: absolute;
    top: 16px;
    left: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 15px;
    cursor: pointer;
    transition: color 0.2s;
    &:hover {
      color: #8b9e7e;
    }
  }

  // ==================== 品牌区 ====================
  .brand {
    text-align: center;
    margin-bottom: 36px;

    .brand-logo {
      margin-bottom: 16px;
    }

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

  // ==================== 表单 ====================
  .register-form {
    :deep(.el-input__wrapper) {
      border-radius: 10px;
      box-shadow: 0 0 0 1px #e8e5df inset;
      transition: box-shadow 0.2s;

      &:hover {
        box-shadow: 0 0 0 1px #c4bfb4 inset;
      }
    }

    :deep(.el-input__wrapper.is-focus) {
      box-shadow: 0 0 0 1px #a4a090 inset;
    }

    :deep(.el-form-item) {
      margin-bottom: 20px;
    }

    .register-btn {
      width: 100%;
      border-radius: 10px;
      height: 46px;
      font-size: 16px;
      letter-spacing: 6px;
      background: #8b9e7e; // 鼠尾草绿，和登录的珊瑚色做区分
      border-color: #8b9e7e;

      &:hover {
        background: #7a8e6f !important;
        border-color: #7a8e6f !important;
      }

      &:active {
        background: #6b7e5e !important;
      }
    }
  }

  // ==================== 底部链接 ====================
  .footer-link {
    text-align: center;
    margin: 20px 0 0;
    font-size: 14px;
    color: #b0ad9f;

    a {
      color: #8b9e7e;
      font-weight: 500;

      &:hover {
        color: #6b8a5e;
      }
    }
  }
}
</style>
