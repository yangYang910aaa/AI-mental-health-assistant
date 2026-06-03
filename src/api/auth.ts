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
}

// 响应数据类型
export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar: string
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

/** 退出登录（仅清除本地 token，后端若有注销接口可在这里对接） */
export const logout = () => {
  localStorage.removeItem('token')
  window.location.href = '/auth/login'
}
