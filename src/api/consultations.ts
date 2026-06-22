import request from '@/utils/request'

// ==================== 类型定义 ====================

/** 单条消息 */
export interface Message {
  id: number
  sender: 'user' | 'assistant'
  content: string
  time: string
  flagged?: boolean
}

/** 咨询记录 */
export interface Consultation {
  id: number
  userId: number
  userNickName: string        // 表格展示为"对话用户"
  aiName: string              // AI 助手名称
  firstMessage: string        //用户发起的首条消息
  lastMessageTime: string     // 对话记录的结束时间
  messageCount: number
  hasWarning?: boolean        // 是否包含危机消息
  startedAt: string           // 咨询时间（单独一列）
  messages?: Message[]        // 对话详情（仅详情接口返回）
}

/** 咨询记录列表请求参数（搜索条件待定，先留分页） */
export interface ConsultationListParams {
  page: number
  pageSize: number
}

/** 咨询记录列表返回 */
export interface ConsultationListResult {
  list: Consultation[]
  total: number
}

// ==================== API ====================

/** 获取咨询记录列表 */
export const getConsultations = (params: ConsultationListParams) =>
  request.get<ConsultationListResult>('/consultations/records', { params })

/** 获取咨询详情 */
export const getConsultationDetail = (id: number) =>
  request.get<Consultation>(`/consultations/records/${id}`)

/** 删除咨询记录 */
export const deleteConsultation = (id: number) =>
  request.delete<void>(`/consultations/records/${id}`)
