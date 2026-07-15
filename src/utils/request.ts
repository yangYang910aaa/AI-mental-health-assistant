import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

// ==================== 错误去重 ====================

/** 防止同一时刻多个请求报相同错误时，连续弹出多个一模一样的气泡。
 * 相同文案 3 秒内不重复弹 */
let lastToast = { text: '', time: 0 }

const showError = (msg: string) => {
  const now = Date.now()
  if (msg !== lastToast.text || now - lastToast.time > 3000) {
    lastToast = { text: msg, time: now }
    ElMessage.error(msg)
  }
}

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
export const BASE_URL: string = '/api'

/** 扩展 Axios 配置：支持静默错误 */
interface SilentConfig extends AxiosRequestConfig {
  /** 设为 true 时，响应拦截器里的所有 toast 提示都会被抑制，但错误仍然会 reject */
  silent?: boolean
}

/** 内部用：在 SilentConfig 基础上增加重试标记 */
interface RetryableConfig extends InternalAxiosRequestConfig {
  silent?: boolean
  _retry?: boolean
}

/** 刷新令牌接口的返回类型 */
interface TokenPair {
  accessToken: string
  refreshToken: string
}

// ==================== 401 处理 ====================

/** 防抖锁：正在跳转登录页时，后续 401 不再重复触发 */
let isRedirecting = false

/** 清除所有认证状态并跳转登录页 */
const clearAllAndRedirect = () => {
  useUserStore().clearAll()

  if (!isRedirecting) {
    isRedirecting = true
    window.location.replace('/auth/login')
  }
}

/**
 * 处理未授权状态（登录过期 / token 无效），不再尝试刷新
 * - 清除所有 auth 状态
 * - 跳转登录页
 * - 始终返回 rejected Promise
 */
const handleUnauthorized = (message = '登录已过期，请重新登录'): Promise<never> => {
  clearAllAndRedirect()
  return Promise.reject(new BusinessError(401, message))
}

// ==================== Token 刷新 ====================

/** 正在进行的刷新请求（单例锁：多个并发 401 共用同一个 Promise） */
let refreshPromise: Promise<TokenPair> | null = null

/** 调用 /api/auth/refresh，用原生 axios 实例（不走拦截器，避免递归） */
const tryRefresh = async (): Promise<TokenPair> => {
  const existingRefreshToken = localStorage.getItem('refreshToken')
  if (!existingRefreshToken) throw new Error('No refresh token')

  const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: existingRefreshToken })
  const data = res.data as TokenPair

  useUserStore().setTokens(data.accessToken, data.refreshToken)
  return data
}

/** 获取当前 access token（优先内存 store，fallback 旧 key 用于平滑迁移） */
const getAccessToken = (): string | null => {
  const token = useUserStore().accessToken
  if (token) return token
  // 迁移兼容：旧单令牌方案的 key
  return localStorage.getItem('token')
}

// ==================== HTTP 错误处理 ====================

/**
 * HTTP 层面错误的统一处理
 * 根据状态码 / 错误类型返回不同的提示文案
 */
const resolveHttpErrorMessage = (error: AxiosError<ApiResponse>): string => {
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
    const token = getAccessToken()
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
      showError('响应数据格式异常')
      return Promise.reject(new BusinessError(-1, '响应数据格式异常'))
    }

    const { code, data, message } = body

    // 业务成功：只返回 data，调用方不用解包
    // 这里必须 `as unknown as AxiosResponse` 来绕过拦截器的类型约束（Axios 要求拦截器
    // 始终返回 AxiosResponse）。实际运行时返回值已经是 T（body.data 的解包结果）。
    // request.get/post<T> 的 `as Promise<T>` 与这里配合完成类型收敛。
    //
    // 两条规则：
    // 1. 永远不要返回 body（整个 ApiResponse）——调用方期望的是 body.data
    // 2. 永远不要在这里抛异常（业务异常走 HTTP 状态码，已被失败分支拦截）
    if (code === 200) {
      // 运行时安全网：万一后端返回 code=200 但 data 不存在
      if (data === undefined) {
        showError('响应数据异常')
        return Promise.reject(new BusinessError(-1, '响应数据异常'))
      }
      return data as unknown as AxiosResponse
    }

    // 非预期的业务 code（理论上不会被触发，后端应用 HTTP 状态码表达错误）
    showError(message || '请求失败')
    return Promise.reject(new BusinessError(code, message || '请求失败'))
  },

  // ———————————— 失败分支：HTTP 非 2xx / 网络错误 / 超时 ————————————
  // 所有异常都由 HTTP 状态码表达，这里是唯一的错误处理入口
  async (error) => {
    const silent = (error.config as SilentConfig)?.silent
    const status = error?.response?.status

    // 401 → 先尝试静默刷新，刷新失败再跳登录
    // 但登录接口本身的 401（密码错误）和 refresh 接口（自己过期）不能进入刷新循环
    if (status === 401
      && error.config?.url !== '/auth/login'
      && error.config?.url !== '/auth/refresh'
    ) {
      // 已经重试过一次了 → 不再尝试刷新，直接跳登录
      if ((error.config as RetryableConfig)._retry) {
        return handleUnauthorized()
      }

      try {
        // 并发锁：多个 401 共用同一个 refreshPromise
        if (!refreshPromise) {
          refreshPromise = tryRefresh().finally(() => { refreshPromise = null })
        }
        const { accessToken } = await refreshPromise

        // 用新 access token 重放原请求
        const cfg = error.config as RetryableConfig
        cfg._retry = true
        cfg.headers!.Authorization = `Bearer ${accessToken}`
        return http(cfg)
      } catch {
        // 刷新失败 → 清空所有状态 → 跳登录
        refreshPromise = null
        return handleUnauthorized()
      }
    }

    // 403 → 有权限但不够，弹提示，不跳转
    if (status === 403) {
      if (!silent) showError(resolveHttpErrorMessage(error))
      return Promise.reject(new BusinessError(403, '暂无权限'))
    }

    // 其他一切错误
    const msg = resolveHttpErrorMessage(error)
    if (!silent) showError(msg)
    return Promise.reject(new BusinessError(status || -1, msg))
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
  get<T = unknown>(url: string, config?: SilentConfig): Promise<T> {
    return http.get(url, config) as Promise<T>
  },

  post<T = unknown>(url: string, data?: unknown, config?: SilentConfig): Promise<T> {
    return http.post(url, data, config) as Promise<T>
  },

  put<T = unknown>(url: string, data?: unknown, config?: SilentConfig): Promise<T> {
    return http.put(url, data, config) as Promise<T>
  },

  delete<T = unknown>(url: string, config?: SilentConfig): Promise<T> {
    return http.delete(url, config) as Promise<T>
  },

  patch<T = unknown>(url: string, data?: unknown, config?: SilentConfig): Promise<T> {
    return http.patch(url, data, config) as Promise<T>
  },
}

export default request