import request from '@/utils/request'

// ==================== 类型定义 ====================

/** 趋势数据点 */
export interface TrendPoint {
  date: string
  value: number
}

/** 分布数据项 */
export interface DistributionItem {
  label: string
  count: number
}

/** 仪表盘全部数据 */
export interface DashboardData {
  totalUsers: number
  activeUsers: number
  emotionalLogs: { total: number; todayNew: number }
  consultations: { total: number; todayNew: number }
  avgMoodScore: number
  highRiskCount: number
  moodTrend: TrendPoint[]
  emotionDistribution: DistributionItem[]
  riskDistribution: DistributionItem[]
  consultationTrend: TrendPoint[]
  userActivityTrend: TrendPoint[]
}

// ==================== API ====================

/** 时间范围 */
export type RangeKey = '7d' | '30d' | '90d'

/** 获取仪表盘数据 */
export const getDashboardData = (range: RangeKey = '30d') =>
  request.get<DashboardData>('/dashboard', { params: { range } })
