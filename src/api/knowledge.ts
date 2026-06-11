import request from '@/utils/request'

// ==================== 类型定义 ====================

/** 文章状态 */
export type ArticleStatus = 'published' | 'draft' | 'offline'

/** 文章 */
export interface Article {
  id: number
  title: string
  content: string
  category: string
  author: string
  coverImage?: string
  summary: string
  tags?: string[]
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


/** 创建文章参数 */
export interface CreateArticleParams {
  title: string
  content: string
  category: string
  summary?: string
  coverImage?: string
  tags?: string[]
  status?: ArticleStatus  // 不传则默认 draft
}

/** 更新文章参数 */
export type UpdateArticleParams = Partial<CreateArticleParams>

// ==================== 常量 ====================

/** 文章分类——目前先写死，后续可改为从接口拉取 */
export const CATEGORIES: ArticleCategory[] = [
  { label: '心理健康', value: 'mental-health' },
  { label: '情绪管理', value: 'emotion-management' },
  { label: '压力应对', value: 'stress-coping' },
  { label: '人际关系', value: 'relationships' },
]

/** 文章标签 —— 目前先写死，后续可改为从接口拉取 */
export const TAGS: string[] = [
  '情绪管理','焦虑','抑郁','压力','睡眠',
  '冥想','正念','放松','心理健康','自我成长',
  '人际关系','工作压力','学习方法','生活技巧'
]


// ==================== API ====================

/** 获取文章列表 */
export const fetchArticles = (params: ArticleListParams) =>
  request.get<ArticleListResult>('/knowledge/articles', { params })

/** 获取文章详情 */
export const fetchArticleDetail = (id: number) =>
  request.get<Article>('/knowledge/articles/' + id)

/** 创建文章 */
export const createArticle = (params: CreateArticleParams) =>
  request.post<Article>('/knowledge/articles', params)
 
/** 更新文章 */
export const updateArticle = (id: number, params: UpdateArticleParams) =>
  request.put<Article>(`/knowledge/articles/${id}`, params)

/** 删除文章 */
export const deleteArticle = (id: number) =>
  request.delete<void>(`/knowledge/articles/${id}`)
