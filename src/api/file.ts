import request from '@/utils/request'

/** 上传返回 */
export interface UploadResult {
  url: string
}

/**
 * 上传文件（图片、文档等）
 *
 * @param file - 待上传的 File 对象
 * @returns 文件访问 URL
 *
 * @example
 *   const result = await uploadFile(options.file)
 *   formData.coverImage = result.url
 */
export const uploadFile = async (file: File): Promise<UploadResult> => {
  const fd = new FormData()
  fd.append('file', file)

  // 不手动设 Content-Type——浏览器自动带正确的 boundary
  return request.post<UploadResult>('/file/upload', fd)
}
