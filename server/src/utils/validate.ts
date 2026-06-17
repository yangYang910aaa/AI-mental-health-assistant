import type { FastifyReply } from 'fastify'

/**
 * 校验路径参数 ID 是否为正整数。
 * 合法 → 返回 number，不合法 → 已发送 400 错误并返回 null。
 *
 * @example
 *   const id = parseId(request.params.id, '文章', reply)
 *   if (id === null) return  // 已自动回复 400
 */
export const parseId = (raw: string, label: string, reply: FastifyReply): number | null => {
  const id = Number(raw)
  if (isNaN(id)) {
    reply.status(400).send({ code: 400, message: `${label}ID格式错误`, data: null })
    return null
  }
  if (!Number.isInteger(id) || id <= 0) {
    reply.status(400).send({ code: 400, message: `${label}ID必须是正整数`, data: null })
    return null
  }
  return id
}
