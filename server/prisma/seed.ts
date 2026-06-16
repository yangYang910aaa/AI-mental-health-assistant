// @ts-nocheck
import bcrypt from 'bcryptjs'
import { prisma } from '../src/db.js'

async function main() {
  console.log('🌱 开始填充种子数据…')

  // ==================== 清理旧数据 ====================
  await prisma.chatMessage.deleteMany()
  await prisma.chatSession.deleteMany()
  await prisma.moodRecord.deleteMany()
  await prisma.article.deleteMany()
  await prisma.user.deleteMany()

  // ==================== 用户 ====================
  const adminHash = await bcrypt.hash('admin123', 10) //加密管理员密码
  const userHash = await bcrypt.hash('123456', 10) //加密普通用户密码

  const admin = await prisma.user.create({
    data: { username: 'admin', passwordHash: adminHash, nickname: '管理员', role: 'admin' },
  })
  const normalUser = await prisma.user.create({
    data: { username: 'testuser', passwordHash: userHash, nickname: '小明', role: 'user' },
  })
  console.log(`  ✓ 创建用户: admin (id=${admin.id})  testuser (id=${normalUser.id})`)

  // ==================== 知识文章 ====================
  const articles = [
    {
      title: '如何缓解日常焦虑情绪',
      content: '<h2>认识焦虑</h2><p>焦虑是人类面对压力时的正常反应...</p>',
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
      content: '<h2>什么是正念冥想</h2><p>正念是一种有意识地、不加评判地关注当下的心理训练方法。</p>',
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
      content: '<h2>健康关系的基础</h2><p>人际关系是心理健康的重要支柱。</p>',
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
      content: '<h2>职场压力的来源</h2><p>职场压力是现代社会最常见的压力源之一。</p>',
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
      content: '<h2>睡眠为何重要</h2><p>睡眠是大脑清理垃圾的时间。</p>',
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
  console.log(`  ✓ 创建 ${articles.length} 篇知识文章`)

  // ==================== 心情记录 ====================
  const moods = [
    { userId: normalUser.id, moodScore: 7, moodLabel: '开心', content: '今天天气很好，去公园散了步，心情不错。', moodTrigger: '享受美好时光', sleepDuration: 8, pressureLevel: 20, aiAnalysis: JSON.stringify({ primaryEmotion: '积极愉悦', emotionIntensity: 70, riskLevel: '低风险', emotionNature: '正面情绪' }), aiSuggestion: JSON.stringify({ riskDescription: '当前情绪状态积极健康。', advice: '记录当下的积极体验，建立积极情绪库。' }) },
    { userId: normalUser.id, moodScore: 4, moodLabel: '焦虑', content: '下周三有个重要的汇报，从早上就开始紧张。', moodTrigger: '工作汇报/考试', sleepDuration: 5.5, pressureLevel: 65, aiAnalysis: JSON.stringify({ primaryEmotion: '轻度焦虑', emotionIntensity: 45, riskLevel: '中风险', emotionNature: '负面情绪' }), aiSuggestion: JSON.stringify({ riskDescription: '检测到明显的焦虑信号。', advice: '尝试将担忧写下来，区分能控制和无法控制的事。' }) },
    { userId: normalUser.id, moodScore: 6, moodLabel: '平静', content: '今天什么事都没发生，平平淡淡的一天。', moodTrigger: '日常规律生活', sleepDuration: 7, pressureLevel: 30, aiAnalysis: JSON.stringify({ primaryEmotion: '平静稳定', emotionIntensity: 55, riskLevel: '低风险', emotionNature: '中性情绪' }), aiSuggestion: JSON.stringify({ riskDescription: '情绪基线稳定。', advice: '保持规律的作息，平静不等于平淡。' }) },
    { userId: normalUser.id, moodScore: 3, moodLabel: '疲惫', content: '连加了三天班，感觉身体被掏空了。', moodTrigger: '长期加班', sleepDuration: 4, pressureLevel: 80, aiAnalysis: JSON.stringify({ primaryEmotion: '倦怠疲惫', emotionIntensity: 35, riskLevel: '高风险', emotionNature: '负面情绪' }), aiSuggestion: JSON.stringify({ riskDescription: '检测到精力透支信号。', advice: '请优先保证睡眠质量，留出15分钟空白时间。' }) },
    { userId: normalUser.id, moodScore: 8, moodLabel: '期待', content: '下个月打算去大理旅行，已经订好了机票和民宿！', moodTrigger: '即将到来的旅行', sleepDuration: 7.5, pressureLevel: 15, aiAnalysis: JSON.stringify({ primaryEmotion: '期待向往', emotionIntensity: 75, riskLevel: '低风险', emotionNature: '正面情绪' }), aiSuggestion: JSON.stringify({ riskDescription: '期待感驱动行为动力。', advice: '将大目标拆解为小步骤，在等待中保持参与感。' }) },
  ]
  await prisma.moodRecord.createMany({ data: moods })
  console.log(`  ✓ 创建 ${moods.length} 条心情记录`)

  // ==================== 聊天会话 ====================
  const session = await prisma.chatSession.create({
    data: {
      userId: normalUser.id,
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
  console.log(`  ✓ 创建 1 个聊天会话 (${session.id})，含 6 条消息`)

  console.log('\n🎉 种子数据填充完成！')
  console.log('   管理员账号: admin / admin123')
  console.log('   普通用户:   testuser / 123456')
}

main()
  .catch((e) => {
    console.error('种子数据填充失败:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
