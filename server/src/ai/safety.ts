/**
 * 安全检测 —— 危机内容识别。
 * 当前为轻量关键词匹配 + 语义归一化，后续可接 AI 分类或专用审核服务。
 */

// ==================== 关键词 ====================

const CRISIS_KEYWORDS = [
  // 直接自杀信号
  '自杀', '自伤', '自残', '轻生', '寻死', '死掉',
  '结束生命', '了结自己', '不想活', '不太想活', '不想活了',
  '活不下去', '活得太累', '活得好累', '活着好累',
  '死了算了', '不如死了', '活够了', '生不如死',
  '想死', '好想死', '想结束', '了结', '想轻生',
  // 间接表达
  '不想继续', '坚持不下去', '撑不下去', '熬不下去',
  '活着没意思', '活得好痛苦', '不活了',
  // 自伤行为
  '割腕', '跳楼', '上吊', '安眠药', '伤害自己',
  // 暴力信号
  '暴力', '杀人', '报复社会',
]

/** 常见软化词/修饰词，匹配两次：原文 + 去软化版，防止"不太想活"被漏掉 */
const SOFTENERS = ['不太', '有点', '有时候', '好像', '可能', '也许', '有一点']

// ==================== 检测 ====================

export interface SafetyResult {
  flagged: boolean
  reasons: string[]
}

/**
 * 检测消息是否包含危机信号。
 * 对原文和去软化版本各做一次关键词匹配，取并集。
 */
export function checkCrisis(text: string): SafetyResult {
  let softened = text
  for (const s of SOFTENERS) {
    // 替换为空字符串，去掉软化词后再匹配
    softened = softened.replaceAll(s, '')
  }

  const reasons: string[] = []
  for (const sample of [text, softened]) {
    for (const kw of CRISIS_KEYWORDS) {
      if (sample.includes(kw) && !reasons.includes(kw)) {
        reasons.push(kw)
      }
    }
  }

  return { flagged: reasons.length > 0, reasons }
}

/**
 * 获取危机处理建议（注入 prompt 或直接展示）。
 */
export function getCrisisGuidance(): string {
  return '如果你正在经历非常困难的时刻，请拨打全国心理援助热线 400-161-9995（24 小时免费），或者联系你信任的人。你不需要独自面对。'
}
