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

// ==================== 常量 & 工具函数 ====================

/** 情绪标签 → 显示颜色 */
export const MOOD_LABEL_COLORS: Record<string, string> = {
  '开心': '#f4a460',
  '期待': '#5dbd7a',
  '平静': '#5d9bdc',
  '焦虑': '#e0a220',
  '疲惫': '#9d8bb0',
  '悲伤': '#7b8fce',
  '愤怒': '#e85c5c',
  '恐惧': '#8b5cf6',
}

/** 情绪评分 → 颜色 */
export const moodScoreColor = (score: number): string =>
  score >= 7 ? '#52c41a' : score >= 4 ? '#faad14' : '#ff4d4f'

/** 情绪评分滑条标记 */
export const SCORE_MARKS: Record<number, string> = {
  1: '😣', 3: '😟', 5: '😐', 7: '🙂', 10: '😊',
}

/** 情绪触发因素选项 */
export const TRIGGER_OPTIONS: string[] = [
  '工作压力', '人际关系', '家庭问题', '健康担忧', '学业考试',
  '感情问题', '经济压力', '生活琐事', '天气影响', '无特别原因',
]

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
