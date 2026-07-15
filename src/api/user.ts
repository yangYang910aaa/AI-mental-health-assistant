import request from '@/utils/request'
import { parseSSEStream } from '@/utils/sse'
import { useUserStore } from '@/stores/user'
import { refreshTokenApi } from '@/api/auth'

// ==================== 类型定义 ====================

/** 情绪趋势点 */
export interface MoodTrendPoint {
  date: string
  score: number
  label: string
}

/** 最近对话预览 */
export interface ChatPreview {
  id: number
  title: string
  lastMessage: string
  lastTime: string
  messageCount: number
}

/** 首页统计卡片 */
export interface HomeStats {
  todayMoodScore: number      // 今日评分，0 表示未记录
  todayMoodLabel: string      // 今日标签，空表示未记录
  weekMoodCount: number       // 本周记录次数
  weekChatCount: number       // 本周对话消息数
  weekAvgScore: number        // 本周平均情绪分，0 表示无记录
}

/** 首页数据 */
export interface HomeData {
  dailyQuote: string
  stats: HomeStats
  recentMoods: MoodTrendPoint[]
  recentChats: ChatPreview[]
}

// ==================== 聊天 ====================

/** 聊天消息 */
export interface ChatMessage {
  id: number
  sender: 'user' | 'assistant'
  content: string
  time: string
  error?: boolean
}

/** 聊天会话 */
export interface ChatSession {
  id: number
  title: string
  pinned: boolean
  lastMessage: string
  lastTime: string
  messageCount: number
}

/** 发送消息的响应 */
export interface SendMessageResult {
  sessionId: number
  userMessage: ChatMessage
  aiReply: ChatMessage
}

/** SSE 流式发送消息的事件回调 */
export interface StreamCallbacks {
  onMeta: (data: { sessionId: number; userMessage: ChatMessage }) => void
  onChunk: (data: { content: string }) => void
  onDone: (data: { aiReply: ChatMessage }) => void
  onError: (message: string) => void
}

// ==================== 接口 ====================

/** 获取用户首页数据（userId 由后端从 JWT 获取） */
export const getUserHome = () =>
  request.get<HomeData>('/user/home')

/** 获取用户聊天会话列表（userId 由后端从 JWT 获取，前端传参向后兼容） */
export const getChatSessions = (userId?: number) =>
  request.get<ChatSession[]>('/user/chat/sessions', { params: userId !== undefined ? { userId } : {} })

/** 获取会话消息 */
export const getChatMessages = (sessionId: number) =>
  request.get<ChatMessage[]>('/user/chat/sessions/' + sessionId)

/** 发送消息（userId 由后端从 JWT 获取，前端传参向后兼容） */
export const sendMessage = (sessionId: number | null, content: string, userId?: number) =>
  request.post<SendMessageResult>('/user/chat/send', { sessionId, content, userId })

/**
 * 流式发送消息——返回一个 Promise，解析时流已完成。
 * 通过回调实时接收 SSE 事件。
 *
 * @param sessionId   会话 ID（null 表示新会话）
 * @param content     用户消息文本
 * @param callbacks   SSE 事件回调
 * @param signal      可选 AbortSignal，触发后取消流式请求
 * @param deepThinking 是否开启深度思考模式
 */
export const sendMessageStream = async (
  sessionId: number | null,
  content: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  deepThinking = false,
): Promise<void> => {
  const token = useUserStore().accessToken

  // ===== 1. 发起请求 =====
  let response: Response
  try {
    response = await fetch('/api/user/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ sessionId, content, deepThinking }),
      signal,
    })
  } catch (err: unknown) {
    // AbortError → 用户主动取消，静默退出，不报错
    if (err instanceof DOMException && err.name === 'AbortError') return
    callbacks.onError('网络连接失败，请检查网络后重试')
    return
  }

  // ===== 2. HTTP 错误 =====
  if (!response.ok) {
    // 401 → 先尝试静默刷新，刷新失败再跳登录页
    if (response.status === 401) {
      const rt = localStorage.getItem('refreshToken')
      if (rt) {
        try {
          const result = await refreshTokenApi(rt)
          useUserStore().setTokens(result.accessToken, result.refreshToken)
          callbacks.onError('令牌已过期，请重试')
        } catch {
          useUserStore().clearAll()
          window.location.replace('/auth/login')
        }
      } else {
        useUserStore().clearAll()
        window.location.replace('/auth/login')
      }
      return
    }

    const err = await response.json().catch(() => ({ message: '请求失败' }))
    callbacks.onError(err.message || '请求失败')
    return
  }

  // ===== 3. 用通用 SSE 解析器消费流 =====
  // 不用 response.json()，因为会等整个响应体传输完毕才解析，用户就看不到打字机效果
  for await (const ev of parseSSEStream(response, signal)) {
    // signal 触发后 reader 被 cancel，循环可能还剩一个 yield
    if (signal?.aborted) break

    try {
      const data = JSON.parse(ev.data)
      switch (ev.event) {
        case 'meta':
          callbacks.onMeta(data)
          break
        case 'chunk':
          callbacks.onChunk(data)
          break
        case 'done':
          callbacks.onDone(data)
          break
        case 'error':
          callbacks.onError(data.message || '未知错误')
          break
      }
    } catch {
      // JSON 解析失败的行静默跳过
    }
  }
}

/** 重命名会话 */
export const renameSession = (sessionId: number, title: string) =>
  request.put<void>('/user/chat/sessions/' + sessionId, { title })

/** 切换置顶 */
export const togglePinSession = (sessionId: number) =>
  request.put<{ pinned: boolean }>('/user/chat/sessions/' + sessionId + '/pin')

/** 删除会话 */
export const deleteChatSession = (sessionId: number) =>
  request.delete<void>('/user/chat/sessions/' + sessionId)

// ==================== 心情记录 ====================

/** 创建心情记录参数 */
export interface CreateMoodParams {
  moodScore: number
  moodLabel: string
  content: string
  moodTrigger?: string
  sleepDuration?: number
  pressureLevel?: number
}

/** 心情记录列表项（用户端轻量版） */
export interface UserMoodItem {
  id: number
  moodScore: number
  moodLabel: string
  content: string
  createdAt: string
}

export interface MoodAnalysis {
  primaryEmotion: string
  emotionIntensity: number
  riskLevel: string
  emotionNature: string
}

export interface MoodSuggestion {
  riskDescription: string
  advice: string
}

/** 心情记录详情（含完整字段） */
export interface UserMoodDetail extends UserMoodItem {
  userId: number
  moodTrigger: string
  sleepDuration: number
  pressureLevel: number
  aiAnalysis: MoodAnalysis
  aiSuggestion: MoodSuggestion
}

/** 用户心情记录列表 */
export interface UserMoodListResult {
  list: UserMoodItem[]
  total: number
}

/** 创建心情记录 */
export const createMood = (params: CreateMoodParams) =>
  request.post<void>('/user/mood', params)

/** 获取当前用户的心情记录列表，可按情绪标签筛选（userId 由 JWT 获取） */
export const getUserMoods = (page: number, pageSize: number, moodLabel?: string) =>
  request.get<UserMoodListResult>('/user/mood', { params: { page, pageSize, moodLabel } })

/** 获取心情记录详情 */
export const getUserMoodDetail = (id: number) =>
  request.get<UserMoodDetail>('/user/mood/' + id)

/** 删除心情记录 */
export const deleteMood = (id: number) =>
  request.delete<void>('/user/mood/' + id)

// ==================== 长期记忆 ====================

export interface MemoryItem {
  id: number
  content: string
  category: string | null
  createdAt: string
}

/** 获取记忆列表 */
export const getMemories = () =>
  request.get<MemoryItem[]>('/user/memories')

/** 删除单条记忆 */
export const deleteMemory = (id: number) =>
  request.delete<void>('/user/memories/' + id)

/** 清空全部记忆 */
export const clearMemories = () =>
  request.delete<void>('/user/memories')
