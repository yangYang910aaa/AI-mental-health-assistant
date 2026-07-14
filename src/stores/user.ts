import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo } from '@/api/auth'

const STORAGE_KEY = 'userInfo'

/** 从 localStorage 恢复用户信息（刷新不丢）。
 *  数据由 setUser() 写入，只需校验基本结构防御篡改/损坏，不逐字段列举。 */
const restoreUser = (): UserInfo | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    // 只检查能确认"这是一个 UserInfo"的最小字段集——id/username/roles 为身份核心，
    // nickname/avatar/email 均可安全降级（displayName 有 '||' 兜底）。
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

  // ==================== 派生状态 ====================

  /** 是否已登录 */
  const isLoggedIn = computed(() => userInfo.value !== null)

  /** 显示名称：优先 nickname，其次 username */
  const displayName = computed(() => userInfo.value?.nickname || userInfo.value?.username || '匿名用户')

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
