// @ts-nocheck
import bcrypt from 'bcryptjs'
import { prisma } from '../src/db.js'
import { AI_DATA, MOOD_CONTENTS, MOOD_TRIGGERS, SCORE_RANGE, sleepPressure } from '../scripts/seed-data.js'

// ==================== 种子主函数 ====================

async function main() {
  console.log('🌱 开始填充种子数据…\n')

  // ==================== 清理 + 重置自增 ID ====================
  await prisma.chatMessage.deleteMany()
  await prisma.chatSession.deleteMany()
  await prisma.moodRecord.deleteMany()
  await prisma.article.deleteMany()
  await prisma.user.deleteMany()

  await prisma.$executeRawUnsafe('ALTER TABLE User AUTO_INCREMENT = 1')
  await prisma.$executeRawUnsafe('ALTER TABLE Article AUTO_INCREMENT = 1')
  await prisma.$executeRawUnsafe('ALTER TABLE MoodRecord AUTO_INCREMENT = 1')
  await prisma.$executeRawUnsafe('ALTER TABLE ChatSession AUTO_INCREMENT = 1')
  await prisma.$executeRawUnsafe('ALTER TABLE ChatMessage AUTO_INCREMENT = 1')
  console.log('  ✓ 清空所有表，重置自增 ID\n')

  // ==================== 用户（1 admin + 10 普通用户） ====================
  const hash = await bcrypt.hash('123456', 10)
  const adminHash = await bcrypt.hash('admin123', 10)

  const userDefs = [
    { username: 'admin',    passwordHash: adminHash, nickname: '管理员', role: 'admin' },
    { username: 'xiaoming', passwordHash: hash,    nickname: '小明',   role: 'user' },
    { username: 'ahua',     passwordHash: hash,      nickname: '阿花',   role: 'user' },
    { username: 'daliu',    passwordHash: hash,      nickname: '大刘',   role: 'user' },
    { username: 'xiaomei',  passwordHash: hash,      nickname: '小美',   role: 'user' },
    { username: 'laozhang', passwordHash: hash,      nickname: '老张',   role: 'user' },
    { username: 'jingjing', passwordHash: hash,      nickname: '静静',   role: 'user' },
    { username: 'ajie',     passwordHash: hash,      nickname: '阿杰',   role: 'user' },
    { username: 'xiaoqi',   passwordHash: hash,      nickname: '小七',   role: 'user' },
    { username: 'muzi',     passwordHash: hash,      nickname: '木子',   role: 'user' },
    { username: 'yuanyuan', passwordHash: hash,      nickname: '圆圆',   role: 'user' },
  ]

  const users: Array<{ id: number; nickname: string; role: string }> = []
  for (const u of userDefs) {
    const created = await prisma.user.create({ data: u })
    users.push({ id: created.id, nickname: created.nickname!, role: created.role })
  }
  console.log(`  ✓ 创建 ${users.length} 个用户: ${users.map((u) => `${u.nickname}(${u.role})`).join(', ')}\n`)

  const normalUsers = users.filter((u) => u.role === 'user')
  const labels = Object.keys(SCORE_RANGE)

  // ==================== 心情记录（每用户 5 条，共 50 条） ====================
  const moodRecords: Array<{
    userId: number
    moodScore: number
    moodLabel: string
    content: string
    moodTrigger: string
    sleepDuration: number
    pressureLevel: number
    aiAnalysis: string
    aiSuggestion: string
    createdAt: Date
  }> = []

  // 每个标签维度计数，确保内容和触发因素分散
  const labelIdx: Record<string, number> = {}
  for (const l of labels) labelIdx[l] = 0
  const userLabelIdx = normalUsers.map(() => ({ ...labelIdx }))

  for (let ui = 0; ui < normalUsers.length; ui++) {
    const userId = normalUsers[ui].id
    // 每个用户 5 条，标签覆盖
    for (let i = 0; i < 5; i++) {
      const label = labels[(ui * 5 + i) % labels.length]
      const [min, max] = SCORE_RANGE[label]
      const score = Math.floor(Math.random() * (max - min + 1)) + min
      const { sleepDuration, pressureLevel } = sleepPressure(score)

      const contents = MOOD_CONTENTS[label]
      const triggers = MOOD_TRIGGERS[label]
      const ci = userLabelIdx[ui][label]++
      const content = contents[ci % contents.length]
      const trigger = triggers[ci % triggers.length]

      const ai = AI_DATA[label]
      const aiAnalysis = {
        primaryEmotion: ai.analysis.primaryEmotion,
        emotionIntensity: Math.floor(Math.random() * (ai.analysis.emotionIntensity[1] - ai.analysis.emotionIntensity[0] + 1)) + ai.analysis.emotionIntensity[0],
        riskLevel: score <= 3 ? ai.analysis.riskLevel === '低风险' ? '中风险' : ai.analysis.riskLevel : ai.analysis.riskLevel,
        emotionNature: ai.analysis.emotionNature,
      }
      const suggestion = ai.suggestions[ci % ai.suggestions.length]

      // 时间：过去 7 天内均匀分布
      const d = new Date()
      d.setDate(d.getDate() - Math.floor(Math.random() * 7))
      d.setHours(8 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60), 0, 0)

      moodRecords.push({
        userId,
        moodScore: score,
        moodLabel: label,
        content,
        moodTrigger: trigger,
        sleepDuration,
        pressureLevel,
        aiAnalysis: JSON.stringify(aiAnalysis),
        aiSuggestion: JSON.stringify({ riskDescription: suggestion.riskDescription, advice: suggestion.advice }),
        createdAt: d,
      })
    }
  }

  await prisma.moodRecord.createMany({ data: moodRecords })
  console.log(`  ✓ 创建 ${moodRecords.length} 条心情记录（${normalUsers.length} 个用户 × 5 条）\n`)

  // ==================== 知识文章 ====================
  const articles = [
    {
      title: '如何缓解日常焦虑情绪',
      content: '<h2>认识焦虑</h2><p>焦虑是人类面对压力时的正常反应，但当它超出合理范围，就会影响正常生活。</p><h2>实用方法</h2><p>深呼吸、运动、书写疗愈都是经过科学验证的有效缓解方法。</p>',
      category: 'mental-health',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/anxiety-relief/400/240',
      summary: '了解焦虑的成因，掌握深呼吸、运动、书写疗愈等实用缓解方法。',
      tags: JSON.stringify(['焦虑', '情绪管理', '放松']),
      status: 'published',
      views: 2340,
    },
    {
      title: '正念冥想的科学依据',
      content: '<h2>什么是正念冥想</h2><p>正念是一种有意识地、不加评判地关注当下的心理训练方法。</p><p>哈佛大学研究表明，每天10分钟正念练习就能显著改善心理健康。</p>',
      category: 'emotion-management',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/mindfulness-meditation/400/240',
      summary: '哈佛大学研究表明，每天10分钟正念练习就能显著改善心理健康。',
      tags: JSON.stringify(['冥想', '正念', '自我成长']),
      status: 'published',
      views: 1890,
    },
    {
      title: '建立健康人际关系的五个方法',
      content: '<h2>健康关系的基础</h2><p>人际关系是心理健康的重要支柱。研究显示，拥有稳定支持系统的人心理弹性更强。</p>',
      category: 'relationships',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/healthy-relationships/400/240',
      summary: '从积极倾听到表达感激，五个关键方法改善你的人际关系。',
      tags: JSON.stringify(['人际关系', '心理健康']),
      status: 'published',
      views: 1560,
    },
    {
      title: '应对职场压力的实用技巧',
      content: '<h2>职场压力的来源</h2><p>职场压力是现代社会最常见的压力源之一。截止日期、人际关系、职业发展都可能成为压力源。</p>',
      category: 'stress-coping',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/workplace-stress/400/240',
      summary: '番茄工作法、合理期望、社交支持——应对职场压力的实用策略。',
      tags: JSON.stringify(['工作压力', '压力', '生活技巧']),
      status: 'published',
      views: 3120,
    },
    {
      title: '睡眠质量与心理健康的关系',
      content: '<h2>睡眠为何重要</h2><p>睡眠是大脑清理代谢废物的时间。长期睡眠不足会显著增加焦虑和抑郁的风险。</p>',
      category: 'mental-health',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/sleep-health/400/240',
      summary: '睡眠不足如何影响心理健康，以及改善睡眠的五个实用建议。',
      tags: JSON.stringify(['睡眠', '放松', '焦虑']),
      status: 'published',
      views: 980,
    },
  ]
  await prisma.article.createMany({ data: articles })
  console.log(`  ✓ 创建 ${articles.length} 篇知识文章\n`)

  // ==================== 聊天会话（2 个，分给不同用户） ====================
  const xiaoming = normalUsers[0] // 小明
  const ahua = normalUsers[1]      // 阿花

  await prisma.chatSession.create({
    data: {
      userId: xiaoming.id,
      title: '最近工作压力特别大…',
      messages: {
        create: [
          { sender: 'user', content: '最近工作压力特别大，经常失眠到凌晨三四点，白天又没精神，感觉整个人都快撑不住了…' },
          { sender: 'assistant', content: '听起来你最近承受了很大的压力。失眠和工作压力往往是相互影响的——压力导致失眠，失眠又让第二天更难应对压力。能跟我说说，最近工作上具体发生了什么吗？' },
          { sender: 'user', content: '项目马上要上线了，每天都加班到很晚，但还是觉得做不完。领导还一直在催。' },
          { sender: 'assistant', content: '感觉到了，你处在一个高强度的时间节点上，外界的催促和自身的要求叠加在一起，确实很消耗人。你之前有过类似的经历吗？当时是怎么撑过来的？' },
          { sender: 'user', content: '以前也有过，但没这么严重。这次感觉特别累，身体也有反应，胃疼、头疼。' },
          { sender: 'assistant', content: '身体已经在给你发信号了——头痛、胃痛都是长期紧张积累的躯体化反应，它在告诉你需要停下来喘口气。你今天有没有哪怕10分钟是完全属于自己的、不被打扰的时间？' },
        ],
      },
    },
  })

  await prisma.chatSession.create({
    data: {
      userId: ahua.id,
      title: '和男朋友分手了走不出来…',
      messages: {
        create: [
          { sender: 'user', content: '和男朋友分手一个月了，还是每天都会想起他，做什么都没有动力。' },
          { sender: 'assistant', content: '一个月的感情修复期其实还处于正常的哀伤过程中。分手不是小事，允许自己难过是很重要的一步。你愿意跟我聊聊这段关系里让你最怀念的是什么吗？' },
          { sender: 'user', content: '我们在一起两年了，他是我在大学里为数不多的朋友，现在突然变成一个人了。' },
          { sender: 'assistant', content: '失去伴侣的同时也失去了一个重要的社交依靠，这种双重失落确实很难承受。你最近有没有试着联系其他朋友，或者参加一些自己感兴趣的活动？' },
          { sender: 'user', content: '没什么心情见人。昨天试着自己去看了场电影，结果看到一半就哭了。' },
          { sender: 'assistant', content: '哭出来反而是好事——情绪需要出口。你能迈出走出家门的这一步已经很了不起了。在难过的时候，可以试着把想对前任说的话写在日记里，不需要发给对方，只是让自己说出来。' },
        ],
      },
    },
  })
  console.log(`  ✓ 创建 2 个聊天会话（小明 + 阿花）\n`)

  console.log('🎉 种子数据填充完成！\n')
  console.log('   管理员账号: admin / admin123')
  console.log('   普通用户密码均为: 123456')
  console.log(`   用户列表: ${normalUsers.map((u) => u.nickname).join('、')}\n`)
}

main()
  .catch((e) => {
    console.error('种子数据填充失败:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
