/**
 * 安全检测 —— 危机内容识别。
 * 当前为轻量关键词匹配，后续可接 AI 分类或专用审核服务。
 */

// ==================== 关键词 ====================

const CRISIS_KEYWORDS = [
  '自杀', '自伤', '自残', '不想活', '活不下去', '死掉',
  '结束生命', '了结', '轻生', '寻死',
  '伤害自己', '割腕', '跳楼', '上吊', '安眠药',
  '暴力', '杀人', '报复社会',
]

// ==================== 检测 ====================

export interface SafetyResult {
  flagged: boolean
  reasons: string[]
}

/**
 * 检测消息是否包含危机信号。
 * @param text 用户发送的消息
 */
export function checkCrisis(text: string): SafetyResult {
  const reasons: string[] = []

  for (const kw of CRISIS_KEYWORDS) {
    if (text.includes(kw)) {
      reasons.push(kw)
    }
  }

  return {
    flagged: reasons.length > 0,
    reasons: [...new Set(reasons)],   // 去重
  }
}

/**
 * 获取危机处理建议（注入 prompt 或直接展示）。
 */
export function getCrisisGuidance(): string {
  return '如果你正在经历非常困难的时刻，请拨打全国心理援助热线 400-161-9995（24 小时免费），或者联系你信任的人。你不需要独自面对。'
}
