// 给所有普通用户填充过去 7 天的心情记录（均匀分布）
import 'dotenv/config'
import { prisma } from '../src/db.js'
import { AI_DATA, MOOD_CONTENTS, MOOD_TRIGGERS, SCORE_RANGE } from './seed-data.js'

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'user' } })
  if (users.length === 0) {
    console.log('没有普通用户，请先执行 pnpm db:seed')
    return
  }

  console.log(`找到 ${users.length} 个普通用户: ${users.map((u) => u.nickname).join(', ')}\n`)

  const before = await prisma.moodRecord.count()
  console.log(`当前心情记录总数: ${before}`)

  // 清空
  await prisma.moodRecord.deleteMany()
  await prisma.$executeRawUnsafe('ALTER TABLE MoodRecord AUTO_INCREMENT = 1')
  console.log('  ✓ 清空心情记录，重置自增 ID\n')

  const labels = Object.keys(SCORE_RANGE)
  const now = new Date()
  const records: Array<{
    userId: number; moodScore: number; moodLabel: string; content: string
    moodTrigger: string; sleepDuration: number; pressureLevel: number
    aiAnalysis: string; aiSuggestion: string; createdAt: Date
  }> = []

  // 每个用户独立计数
  const userIdx: Record<number, Record<string, number>> = {}
  for (const u of users) {
    userIdx[u.id] = {}
    for (const l of labels) userIdx[u.id][l] = 0
  }

  // 过去 7 天，每天每个用户 1 条 → 7 × N 条
  for (let day = 6; day >= 0; day--) {
    for (const u of users) {
      const label = labels[((6 - day) + u.id) % labels.length]
      const [min, max] = SCORE_RANGE[label]
      const score = Math.floor(Math.random() * (max - min + 1)) + min

      const data = { contents: MOOD_CONTENTS[label], triggers: MOOD_TRIGGERS[label] }
      const ci = userIdx[u.id][label]++

      const d = new Date(now)
      d.setDate(now.getDate() - day)
      d.setHours(9 + (u.id % 12), (u.id * 7) % 60, 0, 0)

      const ai = AI_DATA[label]
      const suggestion = ai.suggestions[ci % ai.suggestions.length]

      records.push({
        userId: u.id,
        moodScore: score,
        moodLabel: label,
        content: data.contents[ci % data.contents.length],
        moodTrigger: data.triggers[ci % data.triggers.length],
        sleepDuration: +(5 + Math.random() * 4).toFixed(1),
        pressureLevel: score >= 7 ? Math.floor(Math.random() * 25) + 5 : score >= 5 ? Math.floor(Math.random() * 35) + 20 : Math.floor(Math.random() * 40) + 40,
        aiAnalysis: JSON.stringify({
          primaryEmotion: ai.analysis.primaryEmotion,
          emotionIntensity: Math.floor(Math.random() * (ai.analysis.emotionIntensity[1] - ai.analysis.emotionIntensity[0] + 1)) + ai.analysis.emotionIntensity[0],
          riskLevel: score <= 3 ? (ai.analysis.riskLevel === '低风险' ? '中风险' : ai.analysis.riskLevel) : ai.analysis.riskLevel,
          emotionNature: ai.analysis.emotionNature,
        }),
        aiSuggestion: JSON.stringify({ riskDescription: suggestion.riskDescription, advice: suggestion.advice }),
        createdAt: d,
      })
    }
  }

  await prisma.moodRecord.createMany({ data: records })

  const after = await prisma.moodRecord.count()
  console.log(`现在共 ${after} 条心情记录（${users.length} 个用户 × 7 天）\n`)

  for (const u of users) {
    const n = await prisma.moodRecord.count({ where: { userId: u.id } })
    const detail = await prisma.moodRecord.groupBy({ by: ['moodLabel'], where: { userId: u.id }, _count: true })
    console.log(`  ${u.nickname}: ${n} 条 — ${detail.map((d) => `${d.moodLabel}×${d._count}`).join(', ')}`)
  }

  // 检查 AI 分析填充情况
  const withAi = await prisma.moodRecord.count({ where: { aiAnalysis: { not: null } } })
  console.log(`\n有 AI 分析: ${withAi}/${after}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
