<template>
  <div class="forgot-card">
    <!-- 返回登录 -->
    <div class="back-home" @click="router.push({ name: ROUTE_NAMES.login })">
      <el-icon><Back /></el-icon>
      <span>返回登录</span>
    </div>

    <!-- 忘记密码标题 -->
    <div class="brand">
      <h1 class="brand-title">忘记密码</h1>
      <p class="brand-desc" v-if="step === 1">输入注册邮箱，获取验证码</p>
      <p class="brand-desc" v-else>验证码已发送至 <strong>{{ formData.email }}</strong></p>
    </div>

    <!-- ========== 步骤1：输入邮箱 ========== -->
    <el-form
      v-if="step === 1"
      ref="emailFormRef"
      :model="formData"
      :rules="emailRules"
      class="forgot-form"
      @submit.prevent
    >
      <el-form-item prop="email">
        <el-input
          v-model="formData.email"
          placeholder="请输入注册邮箱"
          :prefix-icon="Message"
          size="large"
          @keyup.enter="sendCode"
        />
      </el-form-item>

      <el-form-item>
        <el-button
          type="primary"
          size="large"
          class="submit-btn"
          :loading="sending"
          @click="sendCode"
        >
          {{ sending ? '发送中…' : '获取验证码' }}
        </el-button>
      </el-form-item>
    </el-form>

    <!-- ========== 步骤2：输入验证码 + 新密码 ========== -->
    <el-form
      v-if="step === 2"
      ref="resetFormRef"
      :model="formData"
      :rules="resetRules"
      class="forgot-form"
      @submit.prevent
    >
      <el-form-item prop="code">
        <el-input
          v-model="formData.code"
          placeholder="请输入 6 位验证码"
          :prefix-icon="Key"
          size="large"
          maxlength="6"
        />
      </el-form-item>

      <el-form-item prop="newPassword">
        <el-input
          v-model="formData.newPassword"
          type="password"
          placeholder="请输入新密码（至少 6 位）"
          :prefix-icon="Lock"
          size="large"
          show-password
          @keyup.enter="handleReset"
        />
      </el-form-item>

      <el-form-item prop="confirmPassword">
        <el-input
          v-model="formData.confirmPassword"
          type="password"
          placeholder="请再次输入新密码"
          :prefix-icon="Lock"
          size="large"
          show-password
          @keyup.enter="handleReset"
        />
      </el-form-item>

      <el-form-item>
        <el-button
          type="primary"
          size="large"
          class="submit-btn"
          :loading="resetting"
          @click="handleReset"
        >
          {{ resetting ? '重置中…' : '重置密码' }}
        </el-button>
      </el-form-item>

      <p class="resend-link">
        <template v-if="countdown > 0">
          {{ countdown }} 秒后可重新发送
        </template>
        <template v-else-if="sending">
          发送中…
        </template>
        <a v-else href="#" @click.prevent="sendCode">重新发送</a>
      </p>
    </el-form>

    <!-- ========== 完成 ========== -->
    <div v-if="step === 3" class="done-success">
      <el-icon :size="48" color="#8b9e7e"><SuccessFilled /></el-icon>
      <p class="done-title">密码已重置</p>
      <p class="done-desc">请使用新密码登录</p>
      <el-button type="primary" size="large" class="go-login-btn" @click="router.push({ name: ROUTE_NAMES.login, query: { email: formData.email } })">
        去登录
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Message, Key, Lock, Back, SuccessFilled } from '@element-plus/icons-vue'
import { ROUTE_NAMES } from '@/router'
import { forgotPassword, resetPassword } from '@/api/auth'
import { BusinessError } from '@/utils/request'

const router = useRouter()
const route = useRoute()

// 1 = 输入邮箱, 2 = 输入验证码+密码, 3 = 完成
const step = ref(1)

const emailFormRef = ref<FormInstance>()
const resetFormRef = ref<FormInstance>()
// 发送验证码状态
const sending = ref(false)
// 重置密码状态
const resetting = ref(false)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 如果从登录页带过来已输入的邮箱，自动填入
const formData = reactive({
  email: (route.query.email as string) || '',
  code: '',
  newPassword: '',
  confirmPassword: '',
})

const emailRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
}

const validateConfirm = (_rule: any, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    callback(new Error('请再次输入新密码'))
  } else if (value !== formData.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const resetRules: FormRules = {
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '请输入 6 位数字验证码', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { validator: validateConfirm, trigger: 'blur' },
  ],
}

// 发送验证码
const sendCode = async () => {
  // 步骤1：需校验邮箱格式；步骤2（重新发送）：跳过校验直接发
  if (step.value === 1) {
    const valid = await emailFormRef.value?.validate().catch(() => false)
    if (!valid) return
  }

  sending.value = true
  try {
    await forgotPassword(formData.email)
    step.value = 2
    // 启动 60 秒倒计时
    countdown.value = 60
    if (countdownTimer) clearInterval(countdownTimer)
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        if (countdownTimer) clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
  } catch {
    // 错误由响应拦截器统一处理
  } finally {
    sending.value = false
  }
}

// 组件卸载时清理定时器
onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

// 重置密码
const handleReset = async () => {
  const valid = await resetFormRef.value?.validate().catch(() => false)
  if (!valid) return

  resetting.value = true
  try {
    await resetPassword(formData.email, formData.code, formData.newPassword)
    step.value = 3
  } catch (err: any) {
    if (err instanceof BusinessError) {
      ElMessage.error(err.message || '重置密码失败')
    }
    // 非业务错误由拦截器处理（已弹 toast）
  } finally {
    resetting.value = false
  }
}
</script>

<style lang="scss" scoped>
// ==================== 卡片入场动画 ====================
@keyframes card-in {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

// ==================== 卡片容器 ====================
// 双层阴影 + 圆角，与 login/register 卡片风格一致
.forgot-card {
  position: relative; // 为 .back-home 的绝对定位提供锚点
  background: #fff;
  border-radius: 20px;
  padding: 48px 40px 36px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 12px 48px rgba(0, 0, 0, 0.04);
  animation: card-in 0.6s ease-out;

  // ==================== 返回按钮 ====================
  // 绝对定位在卡片左上角
  .back-home {
    position: absolute;
    top: 16px; left: 20px;
    display: flex; align-items: center; gap: 4px;
    font-size: 15px; cursor: pointer;
    transition: color 0.2s;
    &:hover { color: #8b9e7e; }
  }

  // ==================== 品牌区 ====================
  // 标题 + 副标题，信息密度递减
  .brand {
    text-align: center; margin-bottom: 36px;
    .brand-title { font-size: 24px; font-weight: 600; color: #2c3e2d; margin: 0 0 8px; }
    .brand-desc  { font-size: 14px; color: #9b9b8a; margin: 0; }
  }

  // ==================== 表单区（步骤1 + 步骤2 共用） ====================
  // 输入框用 box-shadow 模拟细边框，hover/focus 逐步加深
  .forgot-form {
    :deep(.el-input__wrapper) {
      border-radius: 10px;
      box-shadow: 0 0 0 1px #e8e5df inset;
      transition: box-shadow 0.2s;
      &:hover { box-shadow: 0 0 0 1px #c4bfb4 inset; }
    }
    :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px #a4a090 inset; }
    :deep(.el-form-item) { margin-bottom: 20px; }

    // ——— 主按钮（获取验证码 / 重置密码）———
    // 鼠尾草绿，和注册页统一
    .submit-btn {
      width: 100%; border-radius: 10px; height: 46px; font-size: 16px; letter-spacing: 4px;
      background: #8b9e7e; border-color: #8b9e7e;
      &:hover { background: #7a8e6f !important; border-color: #7a8e6f !important; }
    }

    // ——— 重新发送链接（步骤2）———
    .resend-link {
      text-align: center; font-size: 14px; color: #9ca3af;
      a { color: #8b9e7e; &:hover { color: #6b8a5e; } }
    }
  }

  // ==================== 完成状态（步骤3） ====================
  .done-success {
    text-align: center;
    .done-title { font-size: 18px; font-weight: 600; color: #2c3e2d; margin: 16px 0 8px; }
    .done-desc  { font-size: 14px; color: #6b7280; margin: 0 0 20px; }
    .go-login-btn {
      border-radius: 10px; height: 44px; padding: 0 40px;
      background: #8b9e7e; border-color: #8b9e7e;
      &:hover { background: #7a8e6f !important; border-color: #7a8e6f !important; }
    }
  }
}
</style>
