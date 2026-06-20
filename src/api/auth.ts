import request from '@/utils/request'

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
export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar: string
  email: string
  roles: string[]
}

interface LoginResult {
  token: string
  userInfo: UserInfo
}

/** 登录接口 */
export const loginApi = (params: LoginParams) =>
  request.post<LoginResult>('/auth/login', params)

/** 注册接口 */
export const registerApi = (params: RegisterParams) =>
  request.post<void>('/auth/register', params)

/** 验证 token 是否有效，有效则返回最新 UserInfo */
export const validateToken = async (): Promise<UserInfo | null> => {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const body = await res.json()
    if (body.code !== 200) return null
    // 同步更新 localStorage 中的 userInfo
    localStorage.setItem('userInfo', JSON.stringify(body.data))
    return body.data as UserInfo
  } catch {
    return null
  }
}

/** 退出登录：清除本地状态 + 跳转登录页 */
export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
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
