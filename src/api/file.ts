/** 上传返回 */
export interface UploadResult {
  url: string
}

/**
 * 上传文件（图片、文档等）
 *
 * 用原生 fetch 而非 axios——axios 默认 Content-Type: application/json 会干扰 multipart
 */
export const uploadFile = async (file: File): Promise<UploadResult> => {
  const fd = new FormData()
  fd.append('file', file)

  // 不设 Content-Type，浏览器自动带 multipart/form-data + boundary
  const res = await fetch('/api/file/upload', { method: 'POST', body: fd })
  const body = await res.json()
  if (!res.ok || body.code !== 200) {
    throw new Error(body.message || '上传失败')
  }
  return body.data as UploadResult
}
