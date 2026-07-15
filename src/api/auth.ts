import { useUserStore } from '@/stores/user'
import request, { BASE_URL } from '@/utils/request'

// 请求参数类型
interface LoginParams {
  /** 用户名或邮箱——后端自行判断 */
  username: string
  password: string
}

interface RegisterParams {
  username: string
  password: string
  nickname?: string
  email: string
}

// 响应数据类型

/** 后端统一响应信封——用于原生 fetch 调用的类型标注 */
interface ApiEnvelope<T> {
  code: number
  data: T
  message: string
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar: string
  email: string
  roles: string[]
}

interface LoginResult {
  accessToken: string
  refreshToken: string
  userInfo: UserInfo
}

interface RefreshResult {
  accessToken: string
  refreshToken: string
}

/** 登录接口 */
export const loginApi = (params: LoginParams) =>
  request.post<LoginResult>('/auth/login', params)

/** 注册接口 */
export const registerApi = (params: RegisterParams) =>
  request.post<void>('/auth/register', params)

/** 验证 access token 是否有效，有效则返回最新 UserInfo */
export const validateToken = async (): Promise<UserInfo | null> => {
  const userStore = useUserStore()
  const token = userStore.accessToken
  if (!token) return null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    // 使用原生 fetch，不用封装的 request.ts，防止 token 过期触发拦截器的 401 刷新循环
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const body: ApiEnvelope<UserInfo> = await res.json()
    if (body.code !== 200) return null
    userStore.setUser(body.data)
    return body.data
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

/** 刷新令牌 —— 用 refresh token 换新的 access + refresh token */
export const refreshTokenApi = async (refreshToken: string): Promise<RefreshResult> => {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) throw new Error('refresh failed')
  const body: ApiEnvelope<RefreshResult> = await res.json()
  if (body.code !== 200) throw new Error(body.message || 'refresh failed')
  return body.data
}

/** 通知后端撤销 refresh token（best-effort，失败不阻塞） */
export const logoutApi = (refreshToken: string) =>
  request.post<void>('/auth/logout', { refreshToken }, { silent: true }).catch(() => {})

/** 退出登录：通知后端 + 清除本地状态 + 跳转登录页 */
export const logout = async () => {
  const userStore = useUserStore()
  const rt = localStorage.getItem('refreshToken')
  if (rt) {
    await logoutApi(rt)
  }
  userStore.clearAll()
  window.location.href = '/auth/login'
}

// ==================== 个人中心 ====================

/** 更新个人资料（昵称 / 头像 / 邮箱） */
export const updateProfile = (params: { nickname?: string; avatar?: string; email?: string }) =>
  request.put<UserInfo>('/auth/profile', params)

/** 修改密码 */
export const changePassword = (params: { oldPassword: string; newPassword: string }) =>
  request.put<void>('/auth/password', params)

// ==================== 忘记 / 重置密码 ====================

/** 忘记密码——发送重置邮件 */
export const forgotPassword = (email: string) =>
  request.post<{ message: string }>('/auth/forgot-password', { email })

/** 重置密码——验证码 + 新密码 */
export const resetPassword = (email: string, code: string, newPassword: string) =>
  request.post<{ message: string }>('/auth/reset-password', { email, code, newPassword })
