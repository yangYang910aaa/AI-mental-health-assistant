import request from '@/utils/request'

// ==================== 类型定义 ====================

/** 今日心情摘要 */
export interface TodayMood {
  hasRecord: boolean
  moodScore?: number
  moodLabel?: string
}

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
}

/** 聊天会话 */
export interface ChatSession {
  id: number
  title: string
  lastMessage: string
  lastTime: string
  messageCount: number
}

/** 发送消息的响应 */
export interface SendMessageResult {
  userMessage: ChatMessage
  aiReply: ChatMessage
}

// ==================== 接口 ====================

/** 获取用户首页数据 */
export const getUserHome = (userId: number) =>
  request.get<HomeData>('/user/home', { params: { userId } })

/** 获取用户聊天会话列表 */
export const getChatSessions = (userId: number) =>
  request.get<ChatSession[]>('/user/chat/sessions', { params: { userId } })

/** 获取会话消息 */
export const getChatMessages = (sessionId: number) =>
  request.get<ChatMessage[]>('/user/chat/sessions/' + sessionId)

/** 发送消息（返回用户消息 + AI 回复） */
export const sendMessage = (sessionId: number | null, content: string, userId: number) =>
  request.post<SendMessageResult>('/user/chat/send', { sessionId, content, userId })

// ==================== 心情记录 ====================

/** 创建心情记录参数 */
export interface CreateMoodParams {
  userId: number
  userName: string
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

/** 心情记录详情（含完整字段） */
export interface UserMoodDetail extends UserMoodItem {
  userId: number
  moodTrigger: string
  sleepDuration: number
  pressureLevel: number
}

/** 用户心情记录列表 */
export interface UserMoodListResult {
  list: UserMoodItem[]
  total: number
}

/** 创建心情记录 */
export const createMood = (params: CreateMoodParams) =>
  request.post<void>('/user/mood', params)

/** 获取用户心情记录列表，可按情绪标签筛选 */
export const getUserMoods = (userId: number, page: number, pageSize: number, moodLabel?: string) =>
  request.get<UserMoodListResult>('/user/mood', { params: { userId, page, pageSize, moodLabel } })

/** 获取心情记录详情 */
export const getUserMoodDetail = (id: number) =>
  request.get<UserMoodDetail>('/user/mood/' + id)

/** 删除心情记录 */
export const deleteMood = (id: number) =>
  request.delete<void>('/user/mood/' + id)
