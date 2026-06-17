// 给 testuser 填充更多心情记录，方便测试分页和筛选
import 'dotenv/config'
import { prisma } from '../src/db.js'

const labels = ['开心', '焦虑', '平静', '疲惫', '悲伤', '愤怒', '恐惧', '期待']
const triggers = ['工作压力', '家庭琐事', '人际关系', '健康问题', '财务担忧', '好消息', '日常规律生活', '睡眠不好', '运动锻炼', '']
const contents = [
  '今天感觉状态不错，完成了很多事情。',
  '总觉得心里堵得慌，但又说不上为什么。',
  '晚上睡得不错，醒来精力充沛。',
  '工作上出了点小问题，但很快就解决了。',
  '和朋友聊了会天，心情好了很多。',
  '不知道为什么今天特别烦躁，可能是天气的原因。',
  '外面的天气很好，出去走了半小时，心情舒畅。',
  '刚读完一本书，受到很多启发。',
  '今天加班到很晚，感觉好累。',
  '给自己做了一顿丰盛的晚餐，很治愈。',
  '收到了一个意想不到的好消息，开心！',
  '感觉最近没什么动力，做什么都提不起劲。',
  '早上运动了半小时，一整天都比较精神。',
  '和家人通了电话，聊了很多。',
  '又失眠了，翻来覆去睡不着。',
  '做了一次冥想，心情平静了很多。',
  '遇到一个难缠的问题，搞了好久才解决。',
  '看了一部好电影，很受触动。',
  '今天什么也没发生，平平淡淡的。',
  '好像有点感冒，身体不太舒服。',
]

async function main() {
  // 找到 testuser
  const user = await prisma.user.findUnique({ where: { username: 'testuser' } })
  if (!user) {
    console.log('testuser 不存在，请先执行 pnpm db:seed')
    return
  }

  const count = await prisma.moodRecord.count({ where: { userId: user.id } })
  console.log(`testuser (id=${user.id}) 当前有 ${count} 条心情记录`)

  const batch = []
  for (let i = 0; i < 40; i++) {
    const label = labels[Math.floor(Math.random() * labels.length)]
    const scoreMap: Record<string, [number, number]> = {
      '开心': [7, 10], '焦虑': [1, 5], '平静': [4, 7], '疲惫': [2, 5],
      '悲伤': [1, 4], '愤怒': [1, 4], '恐惧': [1, 3], '期待': [6, 9],
    }
    const [min, max] = scoreMap[label]
    const score = Math.floor(Math.random() * (max - min + 1)) + min

    batch.push({
      userId: user.id,
      moodScore: score,
      moodLabel: label,
      content: contents[Math.floor(Math.random() * contents.length)],
      moodTrigger: triggers[Math.floor(Math.random() * triggers.length)] || '',
      sleepDuration: +(Math.random() * 4 + 5).toFixed(1), // 5-9 小时
      pressureLevel: Math.floor(Math.random() * 80) + 5, // 5-85
    })
  }

  await prisma.moodRecord.createMany({ data: batch })

  const newCount = await prisma.moodRecord.count({ where: { userId: user.id } })
  console.log(`现在 testuser (id=${user.id}) 有 ${newCount} 条心情记录`)
  console.log('各标签分布:')
  for (const label of labels) {
    const n = await prisma.moodRecord.count({ where: { userId: user.id, moodLabel: label } })
    if (n > 0) console.log(`  ${label}: ${n} 条`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
