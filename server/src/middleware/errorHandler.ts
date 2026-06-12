import type { Request, Response, NextFunction } from 'express'

/** 统一错误处理——所有未捕获的错误都走这里 */
export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]', err.message ?? err)
  res.status(500).json({ code: 500, message: '服务器繁忙，请稍后重试', data: null })
}
