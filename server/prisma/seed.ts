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
    {
      title: '走出抑郁的第一步',
      content: '<h2>认识抑郁</h2><p>抑郁不是"想太多"，而是一种真实存在的心理状态。正视它是走出困境的第一步。</p><h2>今天的行动</h2><p>每天完成一件小事：起床、洗漱、出门五分钟。小步骤积累就是大改变。</p><blockquote>承认需要帮助，不是软弱，而是勇气的开始。</blockquote>',
      category: 'mental-health',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/depression-first-step/400/240',
      summary: '抑郁不是"想太多"，正视它是走出困境的第一步。',
      tags: JSON.stringify(['抑郁', '心理健康', '自我成长']),
      status: 'published',
      views: 4560,
    },
    {
      title: '情绪管理：从觉察到调节',
      content: '<h2>情绪觉察</h2><p>情绪管理的起点是觉察。很多人习惯压抑情绪，反而让情绪以更有破坏性的方式爆发。</p><h2>三步调节法</h2><p>命名情绪：我现在感受到的是什么？接纳情绪：不评判。选择回应：在接纳之后做出选择。</p>',
      category: 'emotion-management',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/emotion-awareness/400/240',
      summary: '情绪管理的起点是觉察——学会命名、接纳、选择回应。',
      tags: JSON.stringify(['情绪管理', '正念', '自我成长']),
      status: 'published',
      views: 3210,
    },
    {
      title: '认知行为疗法入门',
      content: '<h2>CBT 简介</h2><p>认知行为疗法（CBT）是目前循证支持最充分的心理治疗方法之一。</p><h2>核心原理</h2><p>影响我们情绪的不是事件本身，而是我们对事件的解读。通过识别和挑战不合理思维来改变情绪。</p>',
      category: 'mental-health',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/cbt-intro/400/240',
      summary: 'CBT 的核心原理：改变想法，就能改变情绪和行为。',
      tags: JSON.stringify(['CBT', '心理健康', '认知']),
      status: 'published',
      views: 2890,
    },
    {
      title: '青少年心理健康指南',
      content: '<h2>青少年心理</h2><p>青春期是身心发展的关键阶段，也是心理问题的高发期。</p><h2>常见挑战</h2><ul><li>学业压力</li><li>社交媒体的影响</li><li>自我认同困惑</li><li>亲子关系紧张</li></ul>',
      category: 'mental-health',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/teen-mental-health/400/240',
      summary: '青春期常见心理挑战及家长支持策略。',
      tags: JSON.stringify(['青少年', '心理健康', '家庭']),
      status: 'published',
      views: 1670,
    },
    {
      title: '冥想入门：十分钟改变一天',
      content: '<h2>冥想入门</h2><p>冥想不是清空思绪，而是学会观察思绪而不被它们带走。</p><h2>简单练习</h2><p>闭上眼睛，将注意力放在呼吸上。思绪飘走了？没关系，温和地带回来。每天十分钟，坚持一周就能感受到变化。</p>',
      category: 'emotion-management',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/meditation-10min/400/240',
      summary: '每天十分钟冥想，坚持一周就能感受到明显变化。',
      tags: JSON.stringify(['冥想', '正念', '放松']),
      status: 'published',
      views: 5340,
    },
    {
      title: '自我接纳的力量',
      content: '<h2>什么是自我接纳</h2><p>自我接纳不是放弃成长，而是在承认现状的基础上，朝更好的方向努力。</p><p>允许自己不完美，是最大的自由。当你停止与自己为敌，改变才真正开始。</p>',
      category: 'emotion-management',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/self-acceptance/400/240',
      summary: '允许自己不完美，是最大的自由。',
      tags: JSON.stringify(['自我接纳', '自我成长', '心理健康']),
      status: 'published',
      views: 4120,
    },
    {
      title: '改善社交焦虑的练习',
      content: '<h2>社交焦虑</h2><p>在社交场合感到紧张是人类的天性。问题在于当它妨碍了正常生活时如何处理。</p><h2>渐进式练习</h2><p>从小规模社交开始，逐步扩大舒适区。每次成功都是一次正反馈。</p>',
      category: 'relationships',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/social-anxiety/400/240',
      summary: '通过渐进式练习，逐步扩大社交舒适区。',
      tags: JSON.stringify(['社交焦虑', '人际关系', '自我成长']),
      status: 'published',
      views: 2450,
    },
    {
      title: '运动与心理健康的科学联系',
      content: '<h2>运动与大脑</h2><p>研究表明，每周150分钟中等强度运动能显著改善情绪，效果堪比轻度抗抑郁药。</p><p>内啡肽、多巴胺、血清素都会因运动而提升。不需要跑马拉松，每天快走30分钟就够了。</p>',
      category: 'mental-health',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/exercise-mental/400/240',
      summary: '每周150分钟运动，效果堪比轻度抗抑郁药。',
      tags: JSON.stringify(['运动', '心理健康', '生活技巧']),
      status: 'published',
      views: 3780,
    },
    {
      title: '理解并处理愤怒情绪',
      content: '<h2>愤怒不是敌人</h2><p>愤怒是保护边界的情绪。问题不在于愤怒本身，而在于如何表达它。</p><h2>健康表达</h2><p>在回复前停顿三秒。把愤怒写下来而不是喊出来。运动消耗多余的应激能量。</p>',
      category: 'emotion-management',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/anger-management/400/240',
      summary: '愤怒是保护边界的情绪，学会健康表达是关键。',
      tags: JSON.stringify(['愤怒', '情绪管理', '心理健康']),
      status: 'published',
      views: 1980,
    },
    {
      title: '克服拖延症的心理策略',
      content: '<h2>拖延的心理根源</h2><p>拖延不是懒，而是情绪调节失败——我们逃避任务带来的负面情绪。</p><h2>破解方法</h2><p>五分钟法则：告诉自己只做五分钟。一旦开始，惯性会带你走得更远。</p>',
      category: 'stress-coping',
      author: '系统管理员',
      coverImage: 'https://picsum.photos/seed/procrastination/400/240',
      summary: '拖延不是懒，而是情绪调节失败。五分钟法则帮你破解。',
      tags: JSON.stringify(['拖延', '压力', '生活技巧']),
      status: 'published',
      views: 2670,
    },
  ]
  await prisma.article.createMany({ data: articles })
  console.log(`  ✓ 创建 ${articles.length} 篇知识文章\n`)

  // ==================== 聊天会话（10 个，每个用户 1 个） ====================
  const [xiaoming, ahua, daliu, xiaomei, laozhang, jingjing, ajie, xiaoqi, muzi, yuanyuan] = normalUsers

  /** 生成 pastDays 天前的某个时间（加上 offsetMinutes 偏移） */
  const pastDate = (daysAgo: number, offsetMinutes = 0) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(9 + Math.floor(Math.random() * 12), offsetMinutes % 60, 0, 0)
    return d
  }

  /** 为一条消息生成相对于会话开始时间的时间戳 */
  const msgAt = (sessionStart: Date, order: number, gapMin = 3) =>
    new Date(sessionStart.getTime() + order * gapMin * 60_000)

  // --- 小明：6 条，3 天前 ---
  {
    const t = pastDate(3)
    await prisma.chatSession.create({
      data: {
        userId: xiaoming.id,
        title: '最近工作压力特别大…',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: '最近工作压力特别大，经常失眠到凌晨三四点，白天又没精神，感觉整个人都快撑不住了…', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: '听起来你最近承受了很大的压力。失眠和工作压力往往是相互影响的——压力导致失眠，失眠又让第二天更难应对压力。能跟我说说，最近工作上具体发生了什么吗？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: '项目马上要上线了，每天都加班到很晚，但还是觉得做不完。领导还一直在催。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: '感觉到了，你处在一个高强度的时间节点上，外界的催促和自身的要求叠加在一起，确实很消耗人。你之前有过类似的经历吗？当时是怎么撑过来的？', createdAt: msgAt(t, 3) },
          { sender: 'user', content: '以前也有过，但没这么严重。这次感觉特别累，身体也有反应，胃疼、头疼。', createdAt: msgAt(t, 4) },
          { sender: 'assistant', content: '身体已经在给你发信号了——头痛、胃痛都是长期紧张积累的躯体化反应，它在告诉你需要停下来喘口气。你今天有没有哪怕10分钟是完全属于自己的、不被打扰的时间？', createdAt: msgAt(t, 5) },
        ]},
      },
    })
  }

  // --- 阿花：8 条，9 天前 ---
  {
    const t = pastDate(9)
    await prisma.chatSession.create({
      data: {
        userId: ahua.id,
        title: '和男朋友分手了走不出来…',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: '和男朋友分手一个月了，还是每天都会想起他，做什么都没有动力。', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: '一个月的感情修复期其实还处于正常的哀伤过程中。分手不是小事，允许自己难过是很重要的一步。你愿意跟我聊聊这段关系里让你最怀念的是什么吗？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: '我们在一起两年了，他是我在大学里为数不多的朋友，现在突然变成一个人了。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: '失去伴侣的同时也失去了一个重要的社交依靠，这种双重失落确实很难承受。你最近有没有试着联系其他朋友，或者参加一些自己感兴趣的活动？', createdAt: msgAt(t, 3) },
          { sender: 'user', content: '没什么心情见人。昨天试着自己去看了场电影，结果看到一半就哭了。', createdAt: msgAt(t, 4) },
          { sender: 'assistant', content: '哭出来反而是好事——情绪需要出口。你能迈出走出家门的这一步已经很了不起了。在难过的时候，可以试着把想对前任说的话写在日记里，不需要发给对方，只是让自己说出来。', createdAt: msgAt(t, 5) },
          { sender: 'user', content: '最近试着写了几天日记，好像确实好一点了。但有时候还是会突然很难过。', createdAt: msgAt(t, 6) },
          { sender: 'assistant', content: '情绪的恢复本来就不是一条直线，会有反复是正常的。重要的是你已经开始了自我疗愈的脚步——写日记、尝试出门、愿意开口倾诉，这些都是了不起的进步。给自己多一些时间和耐心。', createdAt: msgAt(t, 7) },
        ]},
      },
    })
  }

  // --- 大刘：5 条，1 天前 ---
  {
    const t = pastDate(1)
    await prisma.chatSession.create({
      data: {
        userId: daliu.id,
        title: '房贷车贷压得我喘不过气…',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: '每个月工资一到账，还完房贷车贷就剩不下多少了，还要养两个孩子，真的压力好大。', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: '经济压力确实是很多家庭的现实困境，你不是一个人在面对这个。能跟我说说，除了经济方面，你目前最担心的是什么？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: '就怕万一哪天失业了，整个家就垮了。每天晚上想到这个就睡不着。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: '这种对未来的不确定感确实很消耗人。你现在的身体状况怎么样？睡眠不好的时候会怎么应对？', createdAt: msgAt(t, 3) },
          { sender: 'user', content: '没什么办法，就是硬撑着。有时候会喝点酒帮助入睡，但第二天反而更累。', createdAt: msgAt(t, 4) },
          { sender: 'assistant', content: '酒精虽然能让人较快入睡，但会破坏深度睡眠质量，反而加重疲惫。今晚试试睡前用热水泡脚15分钟，同时做几个深呼吸——这是零成本的放松方式。你愿意试试吗？', createdAt: msgAt(t, 5) },
        ]},
      },
    })
  }

  // --- 小美：7 条，7 天前 ---
  {
    const t = pastDate(7)
    await prisma.chatSession.create({
      data: {
        userId: xiaomei.id,
        title: '每次聚会都很紧张，我该怎么办？',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: '公司下周要团建，我已经焦虑好几天了。每次这种集体活动我都特别害怕，不知道该说什么。', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: '社交焦虑其实比很多人想象的要普遍得多。你能具体说说是什么样的感受吗？是担心被人评判，还是不知道如何开启话题？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: '都有吧。总觉得自己说的话没意思，别人会觉得我很无聊。所以干脆就不说了。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: '我理解这种感受。其实大多数人在社交场合都更关注自己，并没有那么多精力去评判他人。你可以试着从一个简单的问题开始——比如问问对方的周末安排，或者对某个话题的看法。能说说你最擅长的是什么吗？从自己擅长的领域聊起会自然很多。', createdAt: msgAt(t, 3) },
          { sender: 'user', content: '我喜欢烘焙，但总觉得这种爱好说出来有点不好意思。', createdAt: msgAt(t, 4) },
          { sender: 'assistant', content: '烘焙是一个很棒的爱好！很多人其实很羡慕会做甜点的人。下次可以试着说"周末做了巧克力曲奇"——这种话题往往能瞬间拉近距离。', createdAt: msgAt(t, 5) },
          { sender: 'user', content: '团建回来感觉还不错，我用了你说的办法，跟几个同事聊了烘焙，她们都很感兴趣。谢谢你！', createdAt: msgAt(t, 6) },
        ]},
      },
    })
  }

  // --- 老张：6 条，14 天前 ---
  {
    const t = pastDate(14)
    await prisma.chatSession.create({
      data: {
        userId: laozhang.id,
        title: '退休之后不知道每天该干嘛…',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: '上个月刚退休，突然不用上班了，反而觉得空落落的。以前总盼着退休，真退下来又不知道该干什么。', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: '退休是人生的一个重大转折，从每天有明确任务到突然自由支配全部时间，这种转变需要适应。你之前在单位主要负责什么工作呢？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: '做了三十年的工程师，管着十几号人。现在同事们偶尔还会打电话问我技术问题，但越来越少联系了。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: '三十年的技术积累是非常宝贵的财富。你有没有想过把这些经验用另一种方式分享出去——比如在社区里帮邻居修修电器，或者给年轻人做一些义务的技术辅导？', createdAt: msgAt(t, 3) },
          { sender: 'user', content: '这个主意不错。其实小区里确实有些老人手机不会用，我以前教过他们几次。', createdAt: msgAt(t, 4) },
          { sender: 'assistant', content: '那就从这个开始！尝试每周固定一个时间去社区活动室坐坐，帮助别人也是重新连接社会、找到价值感的好方式。你过去三十年积累的经验不会"过期"。', createdAt: msgAt(t, 5) },
          { sender: 'user', content: '现在已经每周去社区活动室帮忙了，还认识了几个新朋友。谢谢你给的建议！', createdAt: msgAt(t, 6) },
        ]},
      },
    })
  }

  // --- 静静：4 条，0 天前（今天） ---
  {
    const t = pastDate(0)
    await prisma.chatSession.create({
      data: {
        userId: jingjing.id,
        title: '孩子成绩下滑，我是不是做错了什么？',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: '儿子这学期成绩从班级前十掉到了二十几名，老师说他上课走神。我是不是工作太忙忽略了他？', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: '先别急着自责。成绩波动在孩子成长过程中是很正常的，不见得是你的责任。你注意到了老师的反馈并且很在乎，这说明你是一个关心孩子的妈妈。孩子最近有什么变化吗？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: '他最近确实不太爱说话，放学就把自己关在房间里。问他学校的事就说"没事"。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: '这个年龄段的孩子开始需要更多的个人空间，沉默不一定代表有问题。你可以试试不直接问"学校怎么样"，而是在吃饭时聊聊自己一天的趣事，创造轻松的对话氛围。最近一次你跟孩子真正开心地在一起是什么时候？', createdAt: msgAt(t, 3) },
        ]},
      },
    })
  }

  // --- 阿杰：5 条，2 天前 ---
  {
    const t = pastDate(2)
    await prisma.chatSession.create({
      data: {
        userId: ajie.id,
        title: '上班如上坟，想辞职又不敢',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: '每天早上起床都不想上班，工作内容重复枯燥，感觉自己在浪费生命。但辞职又不知道能干什么。', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: '这种"上班如上坟"的感觉其实是职业倦怠的典型信号。你在现在这个岗位做了多久了？还记得当初选择这份工作时最吸引你的是什么吗？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: '快五年了。当初觉得大公司稳定，福利好。但做久了发现就是个大螺丝钉。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: '五年的时间确实足够让人对重复的工作失去新鲜感。你有没有考虑过在公司内部横向调动，或者利用业余时间培养一个新的职业技能？', createdAt: msgAt(t, 3) },
          { sender: 'user', content: '想过学编程，但每天下班累得像条狗，根本打不起精神去学。', createdAt: msgAt(t, 4) },
        ]},
      },
    })
  }

  // --- 小七：7 条，5 天前 ---
  {
    const t = pastDate(5)
    await prisma.chatSession.create({
      data: {
        userId: xiaoqi.id,
        title: '半年后考研，一想就心慌到书都看不进',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: '室友都在找工作了，只有我还在准备考研。每次翻开书就觉得心慌，感觉自己肯定考不上。', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: '考研确实是一段孤立感很强的旅程，再加上看到身边的人陆续确定出路，焦虑感很容易被放大。你的复习计划是多久前开始的？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: '寒假回来就开始了，但效率很差。一天真正能集中精神的时间可能就两三个小时。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: '两三个小时的高质量学习其实并不少——问题可能不在于"学了多久"，而在于"剩下的时间在焦虑"。试着把一天分成三段，每天保持稳定的节奏比突击更管用。', createdAt: msgAt(t, 3) },
          { sender: 'user', content: '上周末下午，我复习了专业课的一个章节，做习题全对的时候，信心一下子就上来了。', createdAt: msgAt(t, 4) },
          { sender: 'assistant', content: '这就是你的"信心证据"。每当你觉得自己考不上的时候，回忆那个下午的感觉——你已经在用行动证明自己可以。', createdAt: msgAt(t, 5) },
          { sender: 'user', content: '昨天又和妈妈吵了一架，她说考研不如找工作。我好累。', createdAt: msgAt(t, 6) },
        ]},
      },
    })
  }

  // --- 木子：8 条，11 天前 ---
  {
    const t = pastDate(11)
    await prisma.chatSession.create({
      data: {
        userId: muzi.id,
        title: '总觉得自己不够好，是不是不自信？',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: '同事夸我方案做得好，我第一反应是"他只是客气吧"。我好像总在否定自己，这是不是一种病？', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: '这种情况在心理学上称为"冒名顶替综合征"——无法内化自己的成就，总是把成功归于运气或别人的善意。这非常常见，尤其在自我要求比较高的人身上。你小时候得到表扬的时候，家人通常会怎么回应？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: '我妈总说"不要骄傲"，即使考了第一名她只会说"下次不一定能保持"。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: '这很可能就是根源之一——当小时候的成就没有得到足够的肯定，长大后我们很难相信自己是值得被认可的。你愿意做一个练习吗？每次有人夸奖你的时候，尝试只说"谢谢"，不加"但是"或"只是运气"。', createdAt: msgAt(t, 3) },
          { sender: 'user', content: '听起来简单但感觉好难。我怕这样会显得自负。', createdAt: msgAt(t, 4) },
          { sender: 'assistant', content: '接受认可和自负是完全不同的两件事。自负是贬低别人抬高自己，而接受认可是承认自己的努力有价值。下次同事再夸你的时候，试着笑着说"谢谢，这个方案确实花了不少心思"。', createdAt: msgAt(t, 5) },
          { sender: 'user', content: '今天试着跟朋友聊了这些，她说她也有过类似的感觉。原来不是我一个人这样。', createdAt: msgAt(t, 6) },
          { sender: 'assistant', content: '是的，你绝对不是一个人。研究表明大约70%的人在一生中都经历过冒名顶替的感觉。知道这一点本身就是一种释然——不是你有问题，而是我们被教导得太苛责自己了。', createdAt: msgAt(t, 7) },
        ]},
      },
    })
  }

  // --- 圆圆：4 条，15 天前 ---
  {
    const t = pastDate(15)
    await prisma.chatSession.create({
      data: {
        userId: yuanyuan.id,
        title: '每次压力大就暴饮暴食，吃完又后悔',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: '最近项目紧张，每天都想吃甜的。一盒饼干一眨眼就没了，吃完又特别后悔，觉得自己好失败。', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: '压力状态下身体会本能地渴望高热量食物，这是远古时期留下的生存机制，不代表你意志力差。你能回忆一下，每次想吃东西之前，你通常是处在什么样的情绪状态里？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: '通常是工作遇到困难或者被领导说了之后。吃东西的时候什么都不用想，感觉很放松。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: '所以食物在那一刻起到的是"情绪暂缓"的作用——它帮你从压力中抽离片刻。试试"延迟10分钟"策略：想吃薯片的时候先给自己10分钟缓冲，喝一杯温水，过一会儿再决定。你可能会惊喜地发现，有一半的时候冲动会自然消退。', createdAt: msgAt(t, 3) },
        ]},
      },
    })
  }
  // ==================== 追加会话（制造咨询趋势的数据起伏） ====================

  // 第 1 天（大刘那天）追加 2 个 → 当天 3 个
  for (const u of [xiaomei, ajie]) {
    const t = pastDate(1, Math.random() * 120)
    await prisma.chatSession.create({
      data: {
        userId: u.id,
        title: u === xiaomei ? '又和同事闹别扭了' : '想跳槽但简历都石沉大海',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: u === xiaomei ? '今天开会又和同事意见不合，吵了两句，现在心里特别不舒服。' : '投了十几家公司都没回应，是不是我能力不行？', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: u === xiaomei ? '意见分歧在工作中很常见，不代表关系破裂。你愿意说说具体是什么事情吗？' : '求职本身就是一个充满不确定性的过程，沉默不代表拒绝。你最近一次面试中觉得自己表现得还不错的地方是什么？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: u === xiaomei ? '就是项目方案的方向问题，我觉得我准备的已经够充分了。' : '倒是有一个终面感觉还行，但过了一周也没消息。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: u === xiaomei ? '能充分准备已经很了不起了。每个人的视角不同，坚持自己认为对的事情也是一种职业素养。' : '跟进一下也无可厚非——发一封简短的感谢邮件，既表达持续的兴趣，也是一种主动把握的态度。', createdAt: msgAt(t, 3) },
        ]},
      },
    })
  }

  // 第 3 天（小明那天）追加 2 个 → 当天 3 个
  for (const u of [laozhang, xiaoqi]) {
    const t = pastDate(3, Math.random() * 180)
    await prisma.chatSession.create({
      data: {
        userId: u.id,
        title: u === laozhang ? '膝盖疼医生让少走路，闷得慌' : '室友天天打游戏到半夜吵得睡不着',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: u === laozhang ? '膝盖又疼了，医生说关节退化，让我少走路多休息。可不动更难受啊。' : '室友每天晚上打游戏到一两点，键盘声特别大，我说了好几次也没用。', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: u === laozhang ? '理解你的心情，活动受限对习惯了忙碌的人来说确实很难熬。医生有没有推荐过游泳或者上肢运动？' : '睡眠被影响确实很令人头疼。你们宿舍有固定的熄灯时间吗？或者其他舍友也有同样的困扰？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: u === laozhang ? '没有，就说吃药控制。但我觉得吃药也不是长久之计。' : '另一个室友也抱怨过，但他比较怂不敢说。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: u === laozhang ? '可以问问理疗科有没有适合关节退化的康复运动方案。有时候适当的肌肉锻炼反而能保护关节。' : '如果一个人说没效果，可以试试联合起来一起谈谈，不是指责，而是协商一个双方都能接受的安静时间。', createdAt: msgAt(t, 3) },
          { sender: 'user', content: '好，我试试。', createdAt: msgAt(t, 4) },
        ]},
      },
    })
  }

  // 第 5 天（小七天）追加 1 个 → 当天 2 个
  {
    const t = pastDate(5, 90)
    await prisma.chatSession.create({
      data: {
        userId: muzi.id,
        title: '三十岁了还单身，家里人天天催',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: '过年回家又被催婚了，说三十岁不结婚就晚了。我自己其实没那么急，但他们一说我就烦。', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: '家人催婚的背后往往是关心，但这种关心有时候确实会变成压力。你自己对未来的伴侣关系有什么期待吗？', createdAt: msgAt(t, 1) },
          { sender: 'user', content: '我其实挺享受现在的生活的，工作稳定，朋友也多。就是偶尔会觉得孤独。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: '享受当下和偶尔感到孤独并不矛盾——这是人之常情。单身有单身的好，遇到对的人时自然会知道。你的生活节奏不按别人的时间表走，这本身就很勇敢。', createdAt: msgAt(t, 3) },
        ]},
      },
    })
  }

  // 第 9 天（阿花那天）追加 1 个 → 当天 2 个
  {
    const t = pastDate(9, 45)
    await prisma.chatSession.create({
      data: {
        userId: jingjing.id,
        title: '老公总是加班不回家，我感觉被忽略了',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: '老公最近半年几乎每天都加班到十点以后才回来，周末也经常去公司。我知道他工作忙，但我真的好孤单。', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: '这种被另一半长期忽略的感觉确实很消耗人。你有尝试过跟他坐下来好好聊聊你的感受吗？不是问他"你为什么又加班"，而是告诉他"我需要你多陪陪我"。', createdAt: msgAt(t, 1) },
          { sender: 'user', content: '说过一次，他说我不理解他，说他这么拼还不是为了这个家。我就不敢再说了。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: '他的回应听起来带着防御。也许可以换一个方式——不是在他疲惫回家时说，而是约一个周末的固定时间，两人坐下来"聊聊我们的关系"。焦点不在工作，而在你们之间的连接感。你最近一次真正感觉跟他亲近是什么时候？', createdAt: msgAt(t, 3) },
          { sender: 'user', content: '上个月他生日，我在家做了顿饭，那天他九点就回来了，我们聊了很多以前的事。', createdAt: msgAt(t, 4) },
          { sender: 'assistant', content: '那个晚上就是一个很好的证明——当有明确的机会停下来时，他是愿意连接的那一面会出来。可以试着每个月固定一个"约会日"，不需要多隆重，就是两个人的专属时间。', createdAt: msgAt(t, 5) },
        ]},
      },
    })
  }

  // 今天（静静那天）追加 2 个 → 当天 3 个
  for (const u of [daliu, yuanyuan]) {
    const t = pastDate(0, Math.random() * 240)
    await prisma.chatSession.create({
      data: {
        userId: u.id,
        title: u === daliu ? '孩子青春期叛逆不知道该怎么办' : '年底绩效考评快到了特别焦虑',
        createdAt: t,
        messages: { create: [
          { sender: 'user', content: u === daliu ? '儿子今年初二，最近完全不听我的话，我说什么都不对。以前挺乖的一个孩子。' : '下个月就要年终考核了，这半年项目一直不顺利，我真的很怕被裁。', createdAt: msgAt(t, 0) },
          { sender: 'assistant', content: u === daliu ? '初二正是独立意识爆发的阶段，孩子的"反抗"其实是他在尝试成为一个独立的人。你能注意到这个变化本身就是很好的第一步。' : '年底考核的不确定性确实让人心神不宁。能不能回顾一下这半年里你觉得自己做得最好的几件事？先别想不好的，只列好的。', createdAt: msgAt(t, 1) },
          { sender: 'user', content: u === daliu ? '可是他现在成绩下滑得厉害，老师也找过我好几次。我真的很担心。' : '我想想……整理了一份项目复盘文档，领导当时还夸了。但也就这个了。', createdAt: msgAt(t, 2) },
          { sender: 'assistant', content: u === daliu ? '与其每天追问他"作业做了没"，不如每周留一个晚上作为你们的"特别时间"——不谈学习、不谈成绩，只做他喜欢的事。信任建立起来后很多问题会自然缓解。' : '复盘文档是一个很好的体现——你不仅在做项目，还在思考和沉淀。把类似的这些"证据"整理出来，不是等考核被动评估，而是主动让领导看到你的价值。', createdAt: msgAt(t, 3) },
          { sender: 'user', content: '谢谢你的建议，我觉得可以试试。', createdAt: msgAt(t, 4) },
        ]},
      },
    })
  }

  console.log(`  ✓ 创建 18 个聊天会话（含 10 个基础 + 8 个追加，4-8 条消息，0-15 天前）\n`)

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
