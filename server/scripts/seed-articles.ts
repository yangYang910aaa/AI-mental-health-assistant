// 补充知识文章，方便测试分页和搜索
import 'dotenv/config'
import { prisma } from '../src/db.js'

const titles = [
  '如何走出抑郁的第一步', '情绪管理：从觉察到调节', '认知行为疗法入门',
  '青少年心理健康指南', '冥想入门：十分钟改变一天', '自我接纳的力量',
  '改善社交焦虑的练习', '运动与心理健康的科学联系', '建立健康的生活习惯',
  '理解并处理愤怒情绪', '正念饮食的实践指南', '应对考试焦虑',
  '中年危机的心理调适', '独处的能力：学会与自己相处', '原生家庭与自我成长',
  '季节性情绪管理指南', '克服拖延症的心理策略', '心理韧性的培养方法',
  '如何在工作中保持边界感', '夫妻沟通的五个黄金法则',
]
const categories = ['mental-health', 'emotion-management', 'stress-coping', 'relationships']
const contents = [
  '<h2>认识抑郁</h2><p>抑郁不是"想太多"，而是一种真实存在的心理状态。正视它是走出困境的第一步。</p><h2>今天的行动</h2><p>每天完成一件小事：起床、洗漱、出门五分钟。小步骤积累就是大改变。</p><blockquote>承认需要帮助，不是软弱，而是勇气的开始。</blockquote>',
  '<h2>情绪觉察</h2><p>情绪管理的起点是觉察。很多人习惯压抑情绪，反而让情绪以更有破坏性的方式爆发。</p><h2>三步调节法</h2><p><strong>命名情绪：</strong>我现在感受到的是什么？<strong>接纳情绪：</strong>不评判。<strong>选择回应：</strong>在接纳之后做出选择。</p>',
  '<h2>CBT 简介</h2><p>认知行为疗法（CBT）是目前循证支持最充分的心理治疗方法之一。</p><h2>核心原理</h2><p>影响我们情绪的不是事件本身，而是我们对事件的解读。通过识别和挑战不合理思维来改变情绪。</p>',
  '<h2>青少年心理</h2><p>青春期是身心发展的关键阶段，也是心理问题的高发期。</p><h2>常见挑战</h2><ul><li>学业压力</li><li>社交媒体的影响</li><li>自我认同困惑</li><li>亲子关系紧张</li></ul>',
  '<h2>冥想入门</h2><p>冥想不是清空思绪，而是学会观察思绪而不被它们带走。</p><h2>简单练习</h2><p>闭上眼睛，将注意力放在呼吸上。思绪飘走了？没关系，温和地带回来。</p>',
  '<h2>什么是自我接纳</h2><p>自我接纳不是放弃成长，而是在承认现状的基础上，朝更好的方向努力。</p><p>允许自己不完美，是最大的自由。</p>',
  '<h2>社交焦虑</h2><p>在社交场合感到紧张是人类的天性。问题在于当它妨碍了正常生活时如何处理。</p><h2>渐进式练习</h2><p>从小规模社交开始，逐步扩大舒适区。</p>',
  '<h2>运动与大脑</h2><p>研究表明，每周150分钟中等强度运动能显著改善情绪，效果堪比轻度抗抑郁药。</p><p>内啡肽、多巴胺、血清素都会因运动而提升。</p>',
  '<h2>习惯的力量</h2><p>健康的心理源于健康的生活方式。睡眠、饮食、运动是三大基石。</p><p>改变一个习惯需要21天，不要急于求成。</p>',
  '<h2>愤怒不是敌人</h2><p>愤怒是保护边界的情绪。问题不在于愤怒本身，而在于如何表达它。</p><h2>健康表达</h2><p>在回复前停顿三秒。</p>',
]

async function main() {
  const before = await prisma.article.count()
  console.log(`当前文章数: ${before}`)

  const articles = titles.map((title, i) => ({
    title: title + `（${before + i + 1}）`,
    content: contents[i % contents.length],
    category: categories[i % categories.length],
    author: '系统管理员',
    coverImage: `https://picsum.photos/seed/article${before + i + 1}/400/240`,
    summary: `${title}——了解更多关于心理健康的实用知识和科学方法。`,
    tags: JSON.stringify(
      i % 4 === 0 ? ['心理健康', '自我成长'] :
      i % 4 === 1 ? ['情绪管理', '正念'] :
      i % 4 === 2 ? ['焦虑', '压力'] :
      ['人际关系', '生活技巧']
    ),
    status: (i % 8 === 0 ? 'offline' : i % 6 === 0 ? 'draft' : 'published') as string,
    views: Math.floor(Math.random() * 4000) + 200,
  }))

  await prisma.article.createMany({ data: articles })

  const after = await prisma.article.count()
  console.log(`现在文章数: ${after} (+${after - before})`)
  console.log(`  published: ${await prisma.article.count({ where: { status: 'published' } })}`)
  console.log(`  draft:     ${await prisma.article.count({ where: { status: 'draft' } })}`)
  console.log(`  offline:   ${await prisma.article.count({ where: { status: 'offline' } })}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
