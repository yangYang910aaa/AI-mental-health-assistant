import request from '@/utils/request'

// ==================== 类型定义 ====================

/** 情绪标签 */
export type MoodLabel = '开心' | '平静' | '焦虑' | '悲伤' | '愤怒' | '疲惫' | '期待' | '恐惧'

/** 情绪标签常量 */
export const MOOD_LABELS: MoodLabel[] = ['开心', '平静', '焦虑', '悲伤', '愤怒', '疲惫', '期待', '恐惧']

/** AI 分析结果 */
export interface AiAnalysis {
  primaryEmotion: string       // 主要情绪，如 "轻度焦虑"
  emotionIntensity: number     // 情绪强度 0-100
  riskLevel: string            // 风险等级，如 "低风险"、"中风险"、"高风险"
  emotionNature: string        // 情绪性质，"正面情绪" / "中性情绪" / "负面情绪"
}

/** 情绪日志列表项（仅列表展示所需字段，轻量） */
export interface EmotionalListItem {
  id: number
  userId: number
  userName: string
  moodScore: number
  moodLabel: MoodLabel
  content: string
  createdAt: string
}

/** 情绪日志详情（列表项 + 详情专属字段） */
export interface Emotional extends EmotionalListItem {
  sleepDuration: number         // 夜间睡眠时长，0-12 小时
  pressureLevel: number
  moodTrigger: string
  aiAnalysis: AiAnalysis
  aiSuggestion: {
    riskDescription: string    // 风险描述
    advice: string             // 专业建议
  }
}

/** 情绪日志列表请求参数 */
export interface EmotionalListParams {
  page: number
  pageSize: number
  userId?: string
  moodScoreRange?: string      // '1-3' | '4-6' | '7-10'
  moodLabel?: string
}

/** 情绪日志列表返回 */
export interface EmotionalListResult {
  list: EmotionalListItem[]
  total: number
}

// ==================== API ====================

/** 获取情绪日志列表 */
export const getEmotionalList = (params: EmotionalListParams) =>
  request.get<EmotionalListResult>('/emotional/records', { params })

/** 获取情绪日志详情 */
export const getEmotionalDetail = (id: number) =>
  request.get<Emotional>(`/emotional/records/${id}`)

/** 删除情绪日志 */
export const deleteEmotional = (id: number) =>
  request.delete<void>(`/emotional/records/${id}`)
