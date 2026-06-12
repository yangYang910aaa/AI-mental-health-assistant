import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

// ==================== 类型定义 ====================

/** 后端统一响应结构 */
interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}

/** 业务错误——携带后端 code，方便调用方做分支处理 */
export class BusinessError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'BusinessError'
  }
}

// ==================== 常量 ====================

/** 基础 URL，后端 API 接口前缀 */
const BASE_URL: string = '/api'

/** 登录页路径——唯一入口，改一处全生效 */
const LOGIN_PATH = '/auth/login'

// ==================== 401 处理 ====================

/** 防抖锁：正在跳转登录页时，后续 401 不再重复触发 */
let isRedirecting = false

/**
 * 处理未授权状态（登录过期 / token 无效）
 * - 清除本地 token
 * - 跳转登录页（用 replace 语义，登录页不应出现在后退历史里）
 * - 并发请求同时 401 时只跳一次
 * - 始终返回 rejected Promise
 */
const handleUnauthorized = (message = '登录已过期，请重新登录'): Promise<never> => {
  localStorage.removeItem('token')

  if (!isRedirecting) {
    isRedirecting = true
    window.location.replace(LOGIN_PATH)
  }

  return Promise.reject(new BusinessError(401, message))
}

// ==================== HTTP 错误处理 ====================

/**
 * HTTP 层面错误的统一处理
 * 根据状态码 / 错误类型返回不同的提示文案
 */
const resolveHttpErrorMessage = (error: any): string => {
  // 网络层面的超时（axios 抛出的 ECONNABORTED）
  if (error?.code === 'ECONNABORTED') return '请求超时，请稍后重试'

  // 完全断网 / 跨域等
  if (error?.message === 'Network Error') return '网络连接失败，请检查网络'

  const status = error?.response?.status

  // 优先用后端返回的 message
  const serverMsg = error?.response?.data?.message
  if (serverMsg) return serverMsg

  // 兜底文案，按常见 HTTP 状态码映射
  switch (status) {
    case 400: return '请求参数有误'
    case 403: return '暂无权限'
    case 404: return '请求的资源不存在'
    case 405: return '请求方法不允许'
    case 408: return '请求超时'
    case 500: return '服务器繁忙，请稍后重试'
    case 502: return '网关异常'
    case 503: return '服务暂不可用'
    case 504: return '网关超时'
    default:  return '网络异常，请稍后重试'
  }
}

// ==================== Axios 实例 ====================

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 秒超时
  headers: { 'Content-Type': 'application/json' },
})

// ==================== 请求拦截器 ====================

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ==================== 响应拦截器 ====================

http.interceptors.response.use(
  // ———————————— 成功分支：HTTP 2xx ————————————
  // 后端直接使用 HTTP 状态码表达业务结果：
  // 200 → 成功（body.code 一定为 200）
  // 401/403/400/404/500 等 → 走下方失败分支
  (response: AxiosResponse<ApiResponse>) => {
    const body = response.data

    if (!body || typeof body !== 'object' || !('code' in body)) {
      ElMessage.error('响应数据格式异常')
      return Promise.reject(new BusinessError(-1, '响应数据格式异常'))
    }

    const { code, data, message } = body

    // 业务成功：只返回 data，调用方不用解包
    // 此处断言为 AxiosResponse 以通过 TS 类型检查，
    // 真正的类型收敛由下方 request.get/post 的 `as Promise<T>` 完成
    if (code === 200) return data as unknown as AxiosResponse

    // 非预期的业务 code（理论上不会被触发，后端应用 HTTP 状态码表达错误）
    ElMessage.error(message || '请求失败')
    return Promise.reject(new BusinessError(code, message || '请求失败'))
  },

  // ———————————— 失败分支：HTTP 非 2xx / 网络错误 / 超时 ————————————
  // 所有异常都由 HTTP 状态码表达，这里是唯一的错误处理入口
  (error) => {
    const status = error?.response?.status

    // 401 → 登录过期 / token 无效，清 token + 跳转
    // 但登录接口本身的 401（密码错误）不能跳，要显示错误消息
    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      return handleUnauthorized()
    }

    // 403 → 有权限但不够，弹提示，不跳转
    if (status === 403) {
      ElMessage.error(resolveHttpErrorMessage(error))
      return Promise.reject(new BusinessError(403, '暂无权限'))
    }

    // 其他一切错误
    const msg = resolveHttpErrorMessage(error)
    ElMessage.error(msg)
    return Promise.reject(error)
  },
)

// ==================== 类型安全的导出 ====================

/**
 * 封装后的请求方法集合
 *
 * 与裸 AxiosInstance 的区别：
 * - 只需传一个泛型 `<T>`，表示期望的业务数据类型
 * - 拦截器已解包 `ApiResponse<T>.data`，调用方直接拿到 `T`
 * - 错误统一抛出 `BusinessError`，可通过 `error.code` 做分支
 *
 * @example
 *   const result = await request.post<LoginResult>('/auth/login', params)
 *   result.token  
 */
const request = {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return http.get(url, config) as Promise<T>
  },

  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return http.post(url, data, config) as Promise<T>
  },

  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return http.put(url, data, config) as Promise<T>
  },

  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return http.delete(url, config) as Promise<T>
  },

  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return http.patch(url, data, config) as Promise<T>
  },
}

export default request
