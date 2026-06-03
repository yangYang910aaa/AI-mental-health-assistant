import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo } from '@/api/auth'

const STORAGE_KEY = 'userInfo'

/** 从 localStorage 恢复用户信息（刷新不丢） */
const restoreUser = (): UserInfo | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UserInfo) : null
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(restoreUser())

  // ==================== 派生状态 ====================

  /** 是否已登录 */
  const isLoggedIn = computed(() => userInfo.value !== null)

  /** 显示名称：优先 nickname，其次 username */
  const displayName = computed(() => userInfo.value?.nickname || userInfo.value?.username || '')

  // ==================== 操作 ====================

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

  return {
    userInfo,
    isLoggedIn,
    displayName,
    setUser,
    clearUser,
  }
})
