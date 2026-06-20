<template>
  <!--
    登录页面卡片
    由 authLayout.vue 包裹，卡片在渐变背景上居中悬浮
  -->
  <div class="login-card">
    <!-- ==================== 品牌区域 ==================== -->
    <div class="brand">
      <div class="brand-logo">
        <el-image :src="logoUrl" alt="Logo" style="width: 56px; height: 56px" />
      </div>
      <h1 class="brand-title">AI 心理健康助手</h1>
      <p class="brand-desc">让每一次对话都被温柔倾听</p>
    </div>

    <!-- ==================== 登录表单 ==================== -->
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      class="login-form"
      @keyup.enter="handleLogin"
    >
      <!-- 用户名或邮箱 -->
      <el-form-item prop="username">
        <el-input
          v-model="formData.username"
          placeholder="请输入用户名或邮箱"
          :prefix-icon="User"
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

      <!--
        登录按钮
        :loading 为 true 时按钮自动禁用 + 显示 loading 图标，防止重复提交
      -->
      <el-form-item>
        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中…' : '登 录' }}
        </el-button>
      </el-form-item>
    </el-form>

    <!-- ==================== 忘记密码 ==================== -->
    <p class="forgot-link">
      <a href="#" @click.prevent="goForgot">忘记密码？</a>
    </p>

    <!-- ==================== 底部链接 ==================== -->
    <p class="footer-link">
      没有账号？<router-link to="/auth/register">去注册</router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { ROUTE_NAMES } from '@/router'
import { loginApi } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref<FormInstance>()

// 登录按钮 loading 态，提交中为 true，防止重复点击
const loading = ref(false)

// Vite 静态资源路径：import.meta.url 保证开发环境和生产环境都能正确解析
const logoUrl = new URL('@/assets/logo.svg', import.meta.url).href

// 表单数据：优先恢复离开前的输入，其次从忘记密码页带回的邮箱
const formData = reactive({
  username: sessionStorage.getItem('login:pendingEmail') || (route.query.email as string) || '',
  password: '',
})
// 用一次就清掉，避免下次进入还残留
sessionStorage.removeItem('login:pendingEmail')

// 表单校验规则
const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名或邮箱', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

// 跳转忘记密码前保存当前输入
const goForgot = () => {
  if (formData.username) {
    sessionStorage.setItem('login:pendingEmail', formData.username)
  }
  // 如果是邮箱格式，在忘记密码页自动填入邮箱
  const query = formData.username.includes('@') ? '?email=' + encodeURIComponent(formData.username) : ''
  router.push('/auth/forgot-password' + query)
}

// 登录逻辑
const handleLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true

  try {
    const result = await loginApi({
      username: formData.username,
      password: formData.password,
    })
    // 保存 token 和用户信息，跳转目标页面
    localStorage.setItem('token', result.token)
    userStore.setUser(result.userInfo)
    const redirect = route.query.redirect as string | undefined
    if (redirect && (redirect.startsWith('/back') || redirect.startsWith('/user'))) {
      router.push(redirect)
    } else if (result.userInfo.roles?.includes('admin')) {
      router.push({ name: ROUTE_NAMES.dashboard })
    } else {
      router.push({ name: ROUTE_NAMES.userHome })
    }
  } catch {
    // 错误提示由 axios 响应拦截器统一处理，此处仅恢复按钮状态
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
// ==================== 卡片容器 ====================
// 双层阴影：近处小扩散（6px）+ 远处大扩散（48px），让卡片有"悬浮在渐变背景上"的层次感
// card-in 动画：页面加载时卡片从下方 24px 淡入

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
.login-card {
  position: relative; // 为 .back-home 的绝对定位提供锚点
  background: #fff;
  border-radius: 20px;
  padding: 48px 40px 36px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.06),
    0 12px 48px rgba(0, 0, 0, 0.04);
  animation: card-in 0.6s ease-out;

    // ==================== 品牌区 ====================
    // 居中排列：Logo → 标题 → 副标题，信息密度递减，引导视线从上到下

    .brand {
        text-align: center;
        margin-bottom: 36px;

        .brand-logo {
            margin-bottom: 16px;
        }

        .brand-title {
            font-size: 24px;
            font-weight: 600;
            color: #2c3e2d; // 深绿灰色，比纯黑柔和
            margin: 0 0 8px;
        }

        .brand-desc {
            font-size: 14px;
            color: #9b9b8a; // 暖灰色，弱于标题，作为辅助文案
            margin: 0;
        }
    }
    
    // ==================== 表单输入框 ====================
    // :deep() 穿透 scoped 样式，修改 Element Plus 内部的 wrapper 样式
    // 用 box-shadow 代替 border 画边框：border 会撑开布局，box-shadow 只在视觉层叠加
    // inset → 内阴影模拟内边框，hover 时加深，focus 时再加深

    .login-form {
        :deep(.el-input__wrapper) {
            border-radius: 10px; // 圆角比默认的 4px 更柔和，和卡片的 20px 呼应
            box-shadow: 0 0 0 1px #e8e5df inset; // 1px 内阴影模拟细边框
            transition: box-shadow 0.2s; // 只过渡阴影，耗时短避免拖沓

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
        // ==================== 登录按钮 ====================
        // 珊瑚/陶土色（#c88e7d）→ 整个页面里唯一的暖彩色块，吸引点击
        // letter-spacing: 6px → 两个汉字之间加 6px 间距，配合圆角按钮显得松弛不拥挤
        // !important 因为 Element Plus 的 type="primary" 有默认蓝色，需要覆盖

        .login-btn {
            width: 100%; // 撑满容器，和输入框等宽
            border-radius: 10px;
            height: 46px;
            font-size: 16px;
            letter-spacing: 6px;
            background: #c88e7d;
            border-color: #c88e7d;

            &:hover {
                background: #b87a6a !important;
                border-color: #b87a6a !important;
            }

            &:active {
                background: #a86c5d !important;
            }
        }
    }
    // ==================== 忘记密码 ====================
    .forgot-link {
      text-align: center;
      margin: 0 0 12px;
      font-size: 14px;
      a { color: #8b9e7e; &:hover { color: #6b8a5e; } }
    }

        // ==================== 底部链接 ====================
    // 颜色偏弱（#b0ad9f），不和表单争视觉优先级
    // 链接用鼠尾草绿（#8b9e7e），和背景渐变同色系

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
