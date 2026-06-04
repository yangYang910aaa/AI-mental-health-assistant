import request from '@/utils/request'

// ==================== 类型定义 ====================

/** 文章状态 */
export type ArticleStatus = 'published' | 'draft' | 'offline'

/** 文章 */
export interface Article {
  id: number
  title: string
  category: string
  author: string
  cover?: string
  summary: string
  status: ArticleStatus
  views: number
  createdAt: string
}

/** 文章分类 */
export interface ArticleCategory {
  label: string
  value: string
}

/** 文章列表请求参数 */
export interface ArticleListParams {
  title?: string
  category?: string
  status?: string
  page: number
  pageSize: number
}

/** 文章列表返回 */
export interface ArticleListResult {
  list: Article[]
  total: number
}

// ==================== 常量 ====================

/** 文章分类——目前先写死，后续可改为从接口拉取 */
export const CATEGORIES: ArticleCategory[] = [
  { label: '心理健康', value: 'mental-health' },
  { label: '情绪管理', value: 'emotion-management' },
  { label: '压力应对', value: 'stress-coping' },
  { label: '人际关系', value: 'relationships' },
]

// ==================== API ====================

/** 获取文章列表 */
export const fetchArticles = (params: ArticleListParams) =>
  request.post<ArticleListResult>('/articles/list', params)

/** 删除文章 */
export const deleteArticle = (id: number) =>
  request.delete<void>(`/articles/${id}`)
