/**
 * 安全检测 —— 危机内容识别与判定。
 * 结合「关键词快速预筛」与「轻量级 AI 语义审核层」，兼顾高性能与极佳准确度。
 */
import { chat } from './client.js'

// ==================== 关键词定义 ====================

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

/** 常见软化词/修饰词 */
const SOFTENERS = ['不太', '有点', '有时候', '好像', '可能', '也许', '有一点']

// ==================== 数据结构 ====================

export interface SafetyResult {
  flagged: boolean
  reasons: string[]
}

// ==================== 核心逻辑 ====================

/**
 * 快速本地关键词匹配（快速、无成本）
 */
export function checkCrisis(text: string): SafetyResult {
  let softened = text
  for (const s of SOFTENERS) {
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
 * 高级安全检测：结合关键词快速预筛 + AI 语义分类。
 * 如果触发了敏感词，引入大模型做二次语义审核，极大降低误报率。
 */
export async function checkCrisisWithAI(text: string): Promise<SafetyResult> {
  // 1. 先进行快速关键词扫描
  const quickResult = checkCrisis(text)
  if (!quickResult.flagged) {
    return quickResult // 关键词未触发，视为安全
  }

  // 2. 触发关键词，进入 AI 语义校验，排除误报（例如：“我妈整天说活着好累”、“不要自残，要好好活下去”）
  try {
    const systemPrompt = `你是一个专业的心理危机文本安全判定助手。你的任务是辨别用户的输入是否包含真实的【自杀、自残、严重自伤、极端社会暴力意图或迫切倾向】。

【关键研判规则】：
1. 必须是用户【自己】有自杀、自残、暴力倾向。如果是描述他人（如“朋友”、“妈妈说”）或纯学术讨论、否定性描述（如“不要自伤”），不应标记为 flagged。
2. 表达情绪低落但无实际危机（如单纯抱怨“上班好累”）不应标记为 flagged。
3. 严格返回 JSON 格式，字段定义如下：
{
  "flagged": true/false, // 判定是否确实含有当前用户的迫切自杀/自伤/严重暴力危机
  "reasons": ["原因说明"] // 若 flagged 为 true 给出原因，false 则为空数组
}`

    const reply = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请判定以下文本的危机状态：
"${text}"` }
    ], 0.1) // 降低温度以获得更确定性的结果

    let json = reply.trim()
    const m = json.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (m) json = m[1]

    const parsed: unknown = JSON.parse(json)
    if (
      typeof parsed === 'object' && parsed !== null
      && 'flagged' in parsed
      && typeof (parsed as Record<string, unknown>).flagged === 'boolean'
    ) {
      const obj = parsed as Record<string, unknown>
      return {
        flagged: obj.flagged as boolean,
        reasons: Array.isArray(obj.reasons) ? (obj.reasons as string[]) : (obj.flagged ? quickResult.reasons : []),
      }
    }
  } catch (err) {
    console.error('[Safety AI] 语义二次校验失败，降级使用关键词检测结果:', err)
  }

  // AI 判定异常时，降级使用严格的关键词匹配结果
  return quickResult
}

/**
 * 获取危机处理建议
 */
export function getCrisisGuidance(): string {
  return '如果你正在经历非常困难的时刻，请拨打全国心理援助热线 400-161-9995（24 小时免费），或者联系你信任的人。你不需要独自面对。'
}
