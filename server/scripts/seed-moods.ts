// 给 testuser 填充心情记录：均匀分布过去 7 天 + 均衡标签 + 内容/触发因素匹配情绪
import 'dotenv/config'
import { prisma } from '../src/db.js'

const scoreRange: Record<string, [number, number]> = {
  '开心': [7, 10], '焦虑': [3, 6], '平静': [5, 7], '疲惫': [3, 5],
  '悲伤': [2, 4], '愤怒': [3, 5], '恐惧': [2, 4], '期待': [7, 9],
}

// 每个标签有自己匹配的内容和触发因素
const labelData: Record<string, { contents: string[]; triggers: string[] }> = {
  '开心': {
    contents: [
      '今天天气很好，去公园散了步，心情不错。',
      '收到了一个意想不到的好消息，开心！',
      '给自己做了一顿丰盛的晚餐，很治愈。',
      '和朋友聊了会天，心情好了很多。',
      '晚上睡得不错，醒来精力充沛。',
      '今天感觉状态不错，完成了很多事情。',
    ],
    triggers: ['好消息', '休闲娱乐', '与人交流', '运动锻炼', '自我照顾', '享受美食'],
  },
  '焦虑': {
    contents: [
      '下周三有个重要汇报，从早上就开始紧张。',
      '总觉得心里堵得慌，但又说不上为什么。',
      '最近几天都是靠咖啡撑着，心跳一直很快。',
      '反复检查了很多遍，还是觉得事情没做完。',
      '一想到明天的会议就睡不着。',
    ],
    triggers: ['工作压力', '学业考试', '财务担忧', '人际关系', '未知的未来'],
  },
  '平静': {
    contents: [
      '今天什么也没发生，平平淡淡的。',
      '做了一次冥想，心情平静了很多。',
      '听了一期很有启发的播客，对很多事情有了新看法。',
      '下午在窗边晒了会太阳，很惬意。',
      '刚读完一本书，受到很多启发。',
    ],
    triggers: ['日常规律生活', '休闲娱乐', '冥想练习', '阅读', '晒太阳'],
  },
  '疲惫': {
    contents: [
      '今天加班到很晚，感觉好累。',
      '连开了三个会，脑子已经转不动了。',
      '感觉最近没什么动力，做什么都提不起劲。',
      '好像有点感冒，身体不太舒服。',
      '连续好几天没睡好，白天一直打哈欠。',
    ],
    triggers: ['长期加班', '睡眠不好', '健康问题', '工作压力', '过度劳累'],
  },
  '悲伤': {
    contents: [
      '今天想起了很久以前的事情，有些难过。',
      '和一个重要的朋友吵架了，心里很难受。',
      '参加了一场告别聚会，回来的路上心情很复杂。',
      '看了一部关于分离的电影，哭了好一阵。',
      '翻到旧的相册，有些人和事都变了。',
    ],
    triggers: ['人际关系', '失去或离别', '怀旧情绪', '家庭问题', '孤独感'],
  },
  '愤怒': {
    contents: [
      '遇到一个难缠的问题，搞了好久才解决，期间想砸键盘。',
      '被人插队了，明明已经等了好久。',
      '辛辛苦苦做的方案被一句话否定了，很气。',
      '约好了时间结果对方迟到半小时，一点解释都没有。',
      '发现有人在背后说我坏话，心里很不舒服。',
    ],
    triggers: ['不公平对待', '被人冒犯', '工作挫折', '失信于人', '被误解'],
  },
  '恐惧': {
    contents: [
      '走夜路回家的时候总觉得后面有人跟着。',
      '害怕体检报告出来会有什么不好的结果。',
      '最近天气异常，总是担心会发生什么事。',
      '鼓起勇气想要表白，但到了跟前还是退缩了。',
      '对未来感到很迷茫，不知道这条路对不对。',
    ],
    triggers: ['安全担忧', '健康问题', '未知的恐惧', '人际关系', '人生方向'],
  },
  '期待': {
    contents: [
      '下个月打算去大理旅行，已经订好了机票和民宿！',
      '投了一个很中意的岗位，收到了面试通知。',
      '这个周末终于可以回家看看爸妈了。',
      '报了一个感兴趣的兴趣班，下周开始上课。',
      '快递显示想要的东西已经到楼下了。',
    ],
    triggers: ['即将到来的旅行', '好消息', '家庭团聚', '学习新技能', '期待已久的物品'],
  },
}

async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'testuser' } })
  if (!user) {
    console.log('testuser 不存在，请先执行 pnpm db:seed')
    return
  }

  const before = await prisma.moodRecord.count({ where: { userId: user.id } })
  console.log(`testuser (id=${user.id}) 当前有 ${before} 条心情记录，准备清空重建…`)

  await prisma.moodRecord.deleteMany({ where: { userId: user.id } })

  const now = new Date()
  const labels = Object.keys(scoreRange)
  const records: Array<{
    userId: number; moodScore: number; moodLabel: string; content: string
    moodTrigger: string; sleepDuration: number; pressureLevel: number; createdAt: Date
  }> = []

  // 每个标签独立计数，确保内容和触发因素不重复使用
  const idx: Record<string, number> = {}
  for (const l of labels) idx[l] = 0

  // 过去 7 天，每天 6 条 → 共 42 条
  for (let day = 6; day >= 0; day--) {
    for (let slot = 0; slot < 6; slot++) {
      const labelIdx = (day * 6 + slot) % labels.length
      const label = labels[labelIdx]
      const [min, max] = scoreRange[label]
      const score = Math.floor(Math.random() * (max - min + 1)) + min

      const data = labelData[label]
      const i = idx[label]++

      const d = new Date(now)
      d.setDate(now.getDate() - day)
      d.setHours(9 + slot * 2, slot * 10 + Math.floor(Math.random() * 20), 0, 0)

      records.push({
        userId: user.id,
        moodScore: score,
        moodLabel: label,
        content: data.contents[i % data.contents.length],
        moodTrigger: data.triggers[i % data.triggers.length],
        sleepDuration: +(5 + Math.random() * 4).toFixed(1),
        pressureLevel: score >= 7 ? Math.floor(Math.random() * 25) + 5 : score >= 5 ? Math.floor(Math.random() * 35) + 20 : Math.floor(Math.random() * 40) + 40,
        createdAt: d,
      })
    }
  }

  await prisma.moodRecord.createMany({ data: records })

  const after = await prisma.moodRecord.count({ where: { userId: user.id } })
  console.log(`现在 testuser 有 ${after} 条心情记录（过去 7 天均匀分布）`)
  for (const label of labels) {
    const n = await prisma.moodRecord.count({ where: { userId: user.id, moodLabel: label } })
    console.log(`  ${label}: ${n} 条`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
