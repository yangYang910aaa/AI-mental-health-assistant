import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo } from '@/api/auth'

const STORAGE_KEY = 'userInfo'
const REFRESH_KEY = 'refreshToken'

/** 从 localStorage 恢复用户信息（刷新不丢）。
 *  数据由 setUser() 写入，只需校验基本结构防御篡改/损坏，不逐字段列举。 */
const restoreUser = (): UserInfo | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' && parsed !== null
      && 'id' in parsed && typeof (parsed as Record<string, unknown>).id === 'number'
      && 'username' in parsed
      && 'roles' in parsed && Array.isArray((parsed as Record<string, unknown>).roles)
    ) {
      return parsed as UserInfo
    }
    return null
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(restoreUser())

  /**
   * accessToken —— 仅存内存（防止 XSS 读取）。
   * 页面刷新后丢失，需通过 refreshToken 重新获取。
   */
  const accessToken = ref<string | null>(null)

  // ==================== 派生状态 ====================

  /** 是否已登录 */
  const isLoggedIn = computed(() => userInfo.value !== null)

  /** 显示名称：优先 nickname，其次 username */
  const displayName = computed(() => userInfo.value?.nickname || userInfo.value?.username || '匿名用户')

  // ==================== Token 操作 ====================

  /** 登录 / 刷新成功后同时写入 access token（内存）和 refresh token（localStorage） */
  const setTokens = (access: string, refresh: string) => {
    accessToken.value = access
    localStorage.setItem(REFRESH_KEY, refresh)
  }

  /** 仅更新 access token（刷新成功后） */
  const setAccessToken = (token: string) => {
    accessToken.value = token
  }

  // ==================== 用户信息操作 ====================

  /** 登录成功后写入用户信息 */
  const setUser = (info: UserInfo) => {
    userInfo.value = info
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info))
  }

  /** 清空用户状态 */
  const clearUser = () => {
    userInfo.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  /** 清空全部认证状态（access token + refresh token + userInfo） */
  const clearAll = () => {
    accessToken.value = null
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(STORAGE_KEY)
    // 迁移兼容：清除旧 key
    localStorage.removeItem('token')
  }

  return {
    userInfo,
    accessToken,
    isLoggedIn,
    displayName,
    setTokens,
    setAccessToken,
    setUser,
    clearUser,
    clearAll,
  }
})
