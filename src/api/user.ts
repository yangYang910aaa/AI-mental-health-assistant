import request from '@/utils/request'

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

/** 获取用户首页数据 */
export const getUserHome = (userId: number) =>
  request.get<HomeData>('/user/home', { params: { userId } })

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
 */
export const sendMessageStream = async (
  sessionId: number | null,
  content: string,
  callbacks: StreamCallbacks,
  deepThinking = false,
): Promise<void> => {
  const token = localStorage.getItem('token')

  let response: Response
  try {
    response = await fetch('/api/user/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ sessionId, content, deepThinking }),
    })
  } catch {
    callbacks.onError('网络连接失败，请检查网络后重试')
    return
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: '请求失败' }))
    callbacks.onError(err.message || '请求失败')
    return
  }

  // 逐行解析 SSE 流
  //不用response.json()，因为会等整个响应体传输完毕才解析,用户就看不到打字机效果
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    let currentEvent = ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('event: ')) {
        currentEvent = trimmed.slice(7)
      } else if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6))
          switch (currentEvent) {
            //meta触发时机:后端刚存完用户消息，准备开始AI生成前
            case 'meta':
              callbacks.onMeta(data)//{sessionId, userMessage}
              //UI层:把临时发送中的气泡替换成真实消息对象，获取真实消息 ID，如果是新会话则获得 sessionId
              break
            //chunk触发时机:AI每生成一小段文字
            case 'chunk':
              callbacks.onChunk(data)//{content:"一小段文字，例如：你好，我是张三"}
              //UI层:把这段文字追加到当前 AI 气泡的末尾，实现打字机效果
              break
            //done触发时机:AI生成完成,已存入数据库
            case 'done':
              callbacks.onDone(data)//{aiReply:{id, sender, content, time}}
              //UI层:关闭加载状态，把 AI 气泡置为完成态，保存消息 ID
              break
            //error触发时机:任何一步出错,
            case 'error':
              callbacks.onError(data.message || '未知错误')//{message:"错误信息"}
              //UI层:显示错误信息，关闭加载状态
              break
          }
        } catch {
          // 跳过解析失败的行
        }
        currentEvent = ''
      }
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
  userId: number
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
