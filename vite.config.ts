import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * Mock API 插件 —— 后端还没好时临时挡一下。
 * 后端就绪后删除此插件即可。
 */
function mockApiPlugin(): Plugin {
  // 读 POST body 的辅助函数
  const readBody = (req: any): Promise<string> =>
    new Promise((resolve) => {
      let body = ''
      req.on('data', (chunk: Buffer) => (body += chunk.toString()))
      req.on('end', () => resolve(body))
    })

  // 快捷返回 JSON
  const json = (res: any, data: unknown) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
  }

  // mock 文章数据
  const articleTitles = [
    '如何缓解日常焦虑情绪', '正念冥想的科学依据', '建立健康人际关系的五个方法',
    '应对职场压力的实用技巧', '青少年心理健康指南', '睡眠质量与心理健康的关系',
    '认知行为疗法入门', '情绪管理：从觉察到调节', '走出抑郁的第一步',
    '心理健康自我评估指南',
  ]
  const articleCategories = ['mental-health', 'emotion-management', 'stress-coping', 'relationships']
  const articleTags = [
    ['焦虑', '情绪管理', '放松'],
    ['冥想', '正念', '自我成长'],
    ['人际关系', '心理健康'],
    ['工作压力', '压力', '生活技巧'],
    ['心理健康', '学习方法', '自我成长'],
    ['睡眠', '放松', '焦虑'],
    ['心理健康', '自我成长', '情绪管理'],
    ['情绪管理', '正念', '冥想'],
    ['抑郁', '心理健康', '压力'],
    ['心理健康', '自我成长', '生活技巧'],
  ]
  // 每篇文章的 HTML 内容（与标题一一对应）
  const articleContents = [
    '<h2>认识焦虑</h2><p>焦虑是人类面对压力时的正常反应，适度的焦虑有助于提高警觉性和表现力。但当焦虑超出可控范围，影响日常生活时，就需要引起重视。</p><h2>实用缓解方法</h2><p><strong>深呼吸练习：</strong>每天花5分钟进行腹式呼吸，吸气4秒、屏息4秒、呼气6秒，能有效激活副交感神经系统。</p><p><strong>运动释放：</strong>每周至少150分钟的中等强度运动，如快走、游泳或瑜伽，能促进内啡肽分泌，自然缓解焦虑。</p><p><strong>书写疗愈：</strong>将担忧写下来，把模糊的恐惧转化为具体的文字，往往会发现问题并没有想象中那么严重。</p><blockquote>焦虑不会消除明天的悲伤，只会消耗今天的力量。 —— 查尔斯·司布真</blockquote>',
    '<h2>什么是正念冥想</h2><p>正念（Mindfulness）是一种有意识地、不加评判地关注当下的心理训练方法。科学研究表明，持续8周的正念练习即可显著改变大脑结构，增强前额叶皮层活动，缩小杏仁核体积。</p><h2>科学证据</h2><p>哈佛大学的研究发现，正念冥想可以：</p><ul><li>降低皮质醇水平达30%</li><li>改善睡眠质量</li><li>提升注意力和记忆力</li><li>减少焦虑和抑郁症状</li></ul><p>每天只需10分钟的正念练习，坚持8周就能观察到明显的变化。</p><h2>入门练习</h2><p>找一个安静的地方坐下，闭上眼睛，将注意力放在呼吸上。当思绪飘走时，温和地将注意力带回呼吸。不要评判自己——思绪飘走是正常的。</p>',
    '<h2>健康关系的基础</h2><p>人际关系是心理健康的重要支柱。良好的社交关系能提供情感支持、减轻压力，甚至延长寿命。</p><h2>五个关键方法</h2><p><strong>1. 积极倾听：</strong>专注于对方在说什么，而不是思考接下来要说什么。适当点头和目光接触能传达你的关注。</p><p><strong>2. 表达感激：</strong>定期向身边的人表达感谢，哪怕是小事。感恩能强化关系纽带。</p><p><strong>3. 设定边界：</strong>健康的关系需要清晰的边界。学会说"不"不是自私，而是自我保护。</p><p><strong>4. 共情理解：</strong>尝试站在对方的角度理解感受，而不是急于给出建议或评判。</p><p><strong>5. 定期联系：</strong>不要只在需要帮助时才联系朋友，定期的问候和小关心能维持关系的温度。</p>',
    '<h2>职场压力的来源</h2><p>职场压力是现代社会最常见的压力源之一。据调查，超过70%的职场人表示曾经历过不同程度的职业倦怠。</p><h2>应对策略</h2><p><strong>时间管理：</strong>使用"番茄工作法"，25分钟专注工作+5分钟休息，提高效率的同时避免过度疲劳。</p><p><strong>合理期望：</strong>接受"足够好"而非"完美"。完美主义是职场压力的重要来源。</p><p><strong>社交支持：</strong>在工作中建立良好的同事关系，有人可以倾诉和分担压力。</p><p><strong>工作生活平衡：</strong>下班后设定"工作禁区"时间，不查看工作消息，给自己真正的休息空间。</p><blockquote>压力不是来自工作本身，而是来自我们对工作的看法。</blockquote>',
    '<h2>青少年心理健康现状</h2><p>青春期是身心发展的关键阶段，也是心理问题的高发期。据WHO数据，全球10-19岁青少年中，约七分之一存在心理健康问题。</p><h2>常见问题</h2><ul><li>学业压力导致的焦虑</li><li>社交媒体的负面影响</li><li>自我认同困惑</li><li>亲子关系紧张</li></ul><h2>给家长的建议</h2><p><strong>保持沟通渠道开放：</strong>不要只在有问题时才和孩子交流，日常的倾听比批评更重要。</p><p><strong>尊重独立性：</strong>青少年需要一定的自主空间，过度的控制会适得其反。</p><p><strong>关注而非监视：</strong>了解孩子的社交圈和兴趣爱好，以关心的态度而非窥探的方式。</p>',
    '<h2>睡眠为何重要</h2><p>睡眠是大脑"清理垃圾"的时间。深度睡眠期间，大脑会清除白天积累的代谢废物，巩固记忆，调节情绪。</p><h2>睡眠不足的影响</h2><p>连续一周每天睡眠不足6小时，认知能力下降相当于血液酒精浓度0.1%的状态。长期睡眠不足还与抑郁、焦虑、免疫力下降等密切相关。</p><h2>改善睡眠的实用建议</h2><p><strong>固定作息：</strong>每天在同一时间上床和起床，即使是周末也要保持一致。</p><p><strong>睡前仪式：</strong>睡前一小时放下电子设备，可以阅读纸质书、泡脚、听轻音乐。</p><p><strong>环境优化：</strong>保持卧室凉爽（18-22°C）、安静、黑暗。遮光窗帘和白噪音机器都值得投资。</p><p><strong>减少咖啡因：</strong>下午2点后不再摄入咖啡因，包括咖啡、茶、可乐等。</p>',
    '<h2>什么是认知行为疗法</h2><p>认知行为疗法（CBT）是目前循证支持最充分的心理治疗方法之一，对抑郁、焦虑、强迫等多种心理问题都有显著效果。</p><h2>核心原理</h2><p>CBT基于一个简单的理念：<strong>影响我们情绪和行为的不是事件本身，而是我们对事件的解读。</strong></p><p>一个经典模型：事件 → 自动思维 → 情绪反应 → 行为。通过识别和挑战不合理的自动思维，可以改变情绪和行为。</p><h2>自助练习</h2><p><strong>思维记录表：</strong>当感到情绪强烈时，写下：情境 → 自动思维 → 情绪（打分1-10）→ 支持证据 → 反对证据 → 替代思维 → 重新评分。</p><blockquote>你不是你的想法，你是观察想法的人。</blockquote>',
    '<h2>情绪觉察</h2><p>情绪管理的起点是觉察。很多人习惯性地压抑或忽视自己的情绪，这反而会让情绪以更有破坏性的方式爆发。</p><h2>三步调节法</h2><p><strong>第一步：命名情绪。</strong>当你感到不舒服时，停下来问自己："我现在感受到的是什么？是愤怒？悲伤？焦虑？还是失望？"精确命名情绪本身就是一种调节。</p><p><strong>第二步：接纳情绪。</strong>不要评判自己的情绪。所有的情绪都有其存在的意义——愤怒在保护你的边界，悲伤在提醒你失去的重要，焦虑在敦促你做好准备。</p><p><strong>第三步：选择回应。</strong>在接纳之后，你可以选择如何回应情绪，而不是被情绪驱使做出冲动的反应。</p>',
    '<h2>理解抑郁</h2><p>抑郁不是"心情不好"或"想太多"，而是一种需要认真对待的心理健康问题。全球约有2.8亿人患有抑郁症。</p><h2>识别抑郁信号</h2><ul><li>持续两周以上的情绪低落</li><li>对曾经喜欢的事物失去兴趣</li><li>睡眠和食欲的显著变化</li><li>精力下降、注意力难以集中</li><li>反复出现死亡或自杀的想法</li></ul><h2>走出第一步</h2><p><strong>承认需要帮助：</strong>承认自己需要帮助不是软弱，而是勇气的体现。</p><p><strong>寻求专业帮助：</strong>心理咨询和药物治疗都是有效的干预方式，越早介入效果越好。</p><p><strong>日常小步骤：</strong>每天完成一件小事——起床、洗漱、出门散步5分钟。小步骤积累起来就是大的改变。</p><blockquote>抑郁让我停下来，让我知道自己走错了方向。它不是我的敌人，而是我的导航仪。</blockquote>',
    '<h2>为什么要自我评估</h2><p>心理健康自我评估不是给自己"贴标签"，而是帮助我们更好地了解自己的心理状态，就像定期量血压一样自然。</p><h2>评估维度</h2><p><strong>情绪状态：</strong>最近一周的情绪基调是什么？是否有频繁的情绪波动？</p><p><strong>睡眠质量：</strong>入睡是否困难？是否早醒？醒来是否精力充沛？</p><p><strong>社交功能：</strong>是否愿意与人交往？社交后是感到充实还是更加疲惫？</p><p><strong>工作/学习状态：</strong>能否集中注意力完成任务？效率是否有明显变化？</p><p><strong>身体信号：</strong>是否有不明原因的头疼、胃痛、肌肉紧张等？</p><h2>重要提醒</h2><p>自我评估不能替代专业诊断。如果你对自己的心理状态感到担忧，请务必咨询专业的心理咨询师或精神科医生。</p>',
  ]

  const mockArticles = Array.from({ length: 32 }, (_, i) => ({
    id: i + 1,
    title: articleTitles[i % 10] + `（${i + 1}）`,
    category: articleCategories[i % 4],
    author: '系统管理员',
    views: Math.floor(Math.random() * 5000) + 100,
    summary: '这是一篇关于心理健康的知识文章，旨在帮助读者了解相关概念并应用于日常生活。',
    status: (i % 7 === 0 ? 'offline' : i % 5 === 0 ? 'draft' : 'published') as 'published' | 'draft' | 'offline',
    createdAt: new Date(2026, 5 - (i % 5), 30 - (i % 30)).toISOString().split('T')[0],
    // 新增：封面图 + 富文本内容 + 标签
    coverImage: `https://picsum.photos/seed/mental${i + 1}/400/240`,
    content: articleContents[i % 10],
    tags: articleTags[i % 10],
  }))

  // mock 咨询记录数据
  const userNicknames = ['小明', '阿花', '大刘', '小美', '老张', '静静', '阿杰', '小七', '木子', '圆圆']
  const firstMessages = [
    '最近工作压力特别大，经常失眠到凌晨三四点，白天又没精神，感觉整个人都快撑不住了...',
    '我和男朋友分手一个月了，还是走不出来，每天都会偷偷看他朋友圈，心里特别难受。',
    '孩子初三了，整天把自己关在房间里打游戏，成绩一落千丈，我说什么都不听，真的很焦虑。',
    '上次聊完我试了你说的正念练习，坚持了一周，感觉入睡确实快了一些，但还是容易中途醒来。',
    '今天面试又挂了，已经第四家了，感觉自己好没用，毕业快半年了还没找到工作。',
    '室友总是半夜打电话打游戏，沟通过好几次都没用，我现在一想到回宿舍就烦躁。',
    '谢谢你的建议！这周我试着跟妈妈好好谈了一次，虽然中间吵了几句，但最后她说理解我了，好开心。',
    '我总是忍不住去检查门锁和煤气，出门要反复确认十几遍，知道没必要但就是控制不住。',
    '最近食欲特别差，什么都不想吃，一个月瘦了八斤，朋友都说我脸色很差，但我真的没胃口。',
    '我今天终于鼓起勇气约了心理咨询师，下周二第一次面询。说实话有点紧张，但也挺期待的。',
  ]
  const aiNames = ['宁渡AI助手', '宁渡AI助手', '宁渡AI助手', '宁渡AI助手', '宁渡AI助手', '宁渡AI助手', '宁渡AI助手', '安心AI助手', '安心AI助手', '安心AI助手']

  const mockConsultations = Array.from({ length: 45 }, (_, i) => {
    const daysAgo = Math.floor(Math.random() * 60) // 最近 60 天内
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60))
    const idx = i % 10
    return {
      id: i + 1,
      userId: 1000 + (idx + 1),
      userNickName: userNicknames[idx],
      aiName: aiNames[idx],
      firstMessage: firstMessages[idx],
      lastMessageTime: d.toISOString().replace('T', ' ').slice(0, 19),
      messageCount: Math.floor(Math.random() * 9) + 4, // 4~12 条
      startedAt: new Date(d.getTime() - (Math.floor(Math.random() * 3600000) * 6)).toISOString().replace('T', ' ').slice(0, 19),
    }
  })

  // 为详情接口生成 mock 对话消息
  const generateMockMessages = (consultationId: number, msgCount: number, firstContent: string) => {
    const userMessages = [
      '最近总是睡不好，晚上躺在床上脑子停不下来，翻来覆去到凌晨才睡着。',
      '我也试过听轻音乐，但感觉没什么用，反而更清醒了。',
      '白天工作的时候特别困，咖啡喝了好几杯也没用。',
      '会不会跟我最近项目压力大有关？马上要上线了，每天都加班。',
      '你说的对，我确实很少运动，下班回家就躺着刷手机。',
      '那我今晚试试你说的呼吸练习，具体要怎么做？',
      '谢谢你，跟你聊完感觉轻松多了，至少知道问题在哪了。',
    ]
    const assistantMessages = [
      '听起来你最近睡眠质量不太好，能具体说说是什么时候开始的吗？',
      '失眠很多时候不是单一原因，你提到了工作压力，这确实是很常见的诱因。',
      '除了工作压力，你平时的作息规律吗？比如睡前会不会看手机？',
      '我建议你先从两个小习惯开始：睡前半小时放下手机，然后试试 4-7-8 呼吸法。',
      '4-7-8 呼吸法很简单：鼻子吸气 4 秒，憋气 7 秒，嘴巴缓慢呼气 8 秒，重复 4 次。',
      '不客气！坚持一周看看效果，如果还是不行我们再聊。记住，偶尔的失眠不代表什么，别太焦虑。',
    ]
    // 用户连发时的额外消息（AI 还没来得及回，用户又发了一条）
    const doubleTextMessages = [
      '对了，我昨天说的那个情况今天好像更严重了...',
      '还有一件事我刚才忘了说，最近心情特别烦躁。',
      '另外，我发现自己最近总是莫名其妙想哭。',
      '补充一下，这种情况一般发生在晚上。',
    ]

    const count = Math.min(msgCount, 12) // 最多 12 条
    const isOdd = count % 2 === 1

    // 奇数 → 模拟用户连发：在某处多插入一条用户消息
    const doubleIdx = isOdd
      ? 1 + 2 * Math.floor(Math.random() * Math.floor(count / 2)) // 随机奇数位，替换该处的 AI 回复
      : -1

    const messages: Array<{ id: number; sender: 'user' | 'assistant'; content: string; time: string }> = []
    const baseTime = new Date()
    baseTime.setHours(baseTime.getHours() - consultationId)

    for (let i = 0; i < count; i++) {
      const t = new Date(baseTime.getTime() + i * (60_000 + Math.random() * 120_000))

      // 决定 sender
      let sender: 'user' | 'assistant'
      if (i === 0) {
        sender = 'user'
      } else if (i === doubleIdx) {
        sender = 'user' // 用户连发，打断了 AI 的回复
      } else if (isOdd && i > doubleIdx) {
        sender = (i - 1) % 2 === 0 ? 'user' : 'assistant' // 连发后序列整体后移
      } else {
        sender = i % 2 === 0 ? 'user' : 'assistant' // 正常交替
      }

      // 决定 content
      let content: string
      if (i === 0) {
        content = firstContent
      } else if (i === doubleIdx) {
        content = doubleTextMessages[Math.floor(Math.random() * doubleTextMessages.length)]
      } else {
        content = sender === 'user'
          ? userMessages[(i * 3 + consultationId) % userMessages.length]
          : assistantMessages[(i * 5 + consultationId) % assistantMessages.length]
      }

      messages.push({
        id: i + 1,
        sender,
        content,
        time: t.toISOString().replace('T', ' ').slice(0, 19),
      })
    }
    return messages
  }

  // mock 情绪日志数据
  const userNames = ['小明', '阿花', '大刘', '小美', '老张', '静静', '阿杰', '小七', '木子', '圆圆']

  // 情绪标签按正面→中性→负面排序，方便 mock 生成时按语义匹配分数
  const positiveMoods: { label: string; scoreRange: [number, number] }[] = [
    { label: '开心', scoreRange: [8, 10] },
    { label: '期待', scoreRange: [7, 9] },
  ]
  const neutralMoods: { label: string; scoreRange: [number, number] }[] = [
    { label: '平静', scoreRange: [5, 7] },
  ]
  const negativeMoods: { label: string; scoreRange: [number, number] }[] = [
    { label: '焦虑', scoreRange: [3, 6] },
    { label: '疲惫', scoreRange: [2, 5] },
    { label: '悲伤', scoreRange: [1, 4] },
    { label: '愤怒', scoreRange: [1, 3] },
    { label: '恐惧', scoreRange: [1, 3] },
  ]
  const allMoods = [...positiveMoods, ...neutralMoods, ...negativeMoods]

  // 根据情绪标签匹配对应内容
  const moodContents: Record<string, string[]> = {
    '开心': [
      '今天阳光很好，去公园散了半小时步，看到小朋友放风筝，心情也跟着明亮了起来。',
      '明天闺蜜要来我的城市出差！已经半年没见了，想想就开心，提前订好了餐厅。',
      '新养了一只小猫，每天回家它都会在门口等我，抱着它的时候所有烦恼都忘了。',
      '面试终于通过了！下个月一号入职新公司，终于可以离开现在这个让人窒息的地方了。',
      '孩子今天语文考了98分，全班第一，看到他高兴的样子，觉得所有的付出都值得。',
      '上周的项目终于验收通过了，客户很满意，领导在会上点名表扬了我，努力没白费。',
    ],
    '期待': [
      '下个月打算去大理旅行，已经订好了机票和民宿，想到洱海边的日出就激动得不行。',
      '今天终于鼓起勇气约了心理咨询师，下周二第一次面询。说实话有点紧张，但也挺期待的。',
      '在咖啡馆看到一个男生在画速写，画的是窗外街景，很好看。鼓起勇气搭了句话，他说可以教我。',
      '收到心仪公司的面试通知了！虽然只是初试，但能走到这一步已经很开心了。',
    ],
    '平静': [
      '工作还是一如既往地忙碌，但今天没有特别的感觉，平平淡淡的一天。',
      '今天什么事都没发生，也不想做什么，窝在沙发上看了一整天的剧。',
      '把冬天的衣服打包捐了，整理了三大箱，家里清爽了很多，心里也跟着清爽了。',
      '晚饭做了番茄鸡蛋面，吃的时候想起了妈妈的味道，给妈妈发了个微信说想她了。',
      '骑车路过江边看到特别美的晚霞，停下来看了十分钟，感觉世界温柔了一瞬间。',
    ],
    '焦虑': [
      '下周三有个重要的汇报，从早上起床就开始紧张，心跳得很快，做了十分钟深呼吸才好一点。',
      '失眠的第三晚，凌晨两点还在刷手机，明天还要早起开会，焦虑到不行。',
      '半夜又醒来了，窗外下雨，雨声让我更清醒了，脑子里全是乱七八糟的事。',
      '最近总是忍不住去检查门锁和煤气，出门要反复确认十几遍，知道没必要但就是控制不住。',
    ],
    '疲惫': [
      '连加了三天班，感觉身体被掏空了，下班回家倒头就睡，连洗漱的力气都没有。',
      '今天不想说话，不想回消息，不想出门。手机开了飞行模式，给自己放一天假。',
      '小王离职之后，我一个人干两个人的活，领导还觉得理所当然，越想越来气。',
      '最近食欲特别差，什么都不想吃，一个月瘦了八斤，朋友都说我脸色很差。',
    ],
    '悲伤': [
      '和家里打了电话，聊到一半突然很想哭，说不上为什么，就是觉得特别孤单。',
      '最近总是莫名其妙想哭，做什么都提不起劲，以前喜欢的事情现在也觉得索然无味。',
      '和男朋友分手一个月了，还是走不出来，每天都会偷偷看他朋友圈，心里特别难受。',
      '地铁上看到一个女孩抱着花等人，突然想起自己很久没有收到过花了。',
    ],
    '愤怒': [
      '同事在会上当着所有人的面否定我的方案，当时就火了，忍了好久才没发作。',
      '年底的绩效考核出来了，我居然是团队垫底，明明这一年我做了那么多，太不公平了。',
      '房东突然说要涨房租，一个月涨了八百，在这个城市生活越来越累了。',
      '和室友因为水电费的事情吵了一架，已经三天没说话了，在家也待得很不舒服。',
    ],
    '恐惧': [
      '最近新闻看得太多了，晚上总是做噩梦，梦到各种不好的事情发生，醒来一身冷汗。',
      '医生说妈妈的检查结果还没出来，虽然她说没事，但我心里一直悬着，害怕接到医院电话。',
      '晚上一个人走夜路回家，总感觉身后有人跟着，心跳得特别快，几乎是小跑回去的。',
    ],
  }

  // 情绪触发因素
  const moodTriggers: Record<string, string[]> = {
    '开心': ['与朋友相聚', '获得成就感', '收到好消息', '享受美好时光', '家人温馨互动'],
    '期待': ['即将到来的旅行', '新的人生机遇', '有趣的社交活动', '计划中的改变'],
    '平静': ['日常规律生活', '独处时光', '整理收纳', '自然风景'],
    '焦虑': ['工作汇报/考试', '人际冲突', '健康担忧', '经济压力', '未知的不确定性'],
    '疲惫': ['长期加班', '情绪压抑', '睡眠不足', '生活琐事积累'],
    '悲伤': ['与家人分离', '感情挫折', '自我否定', '触景生情'],
    '愤怒': ['被不公平对待', '努力未被认可', '利益受损', '价值观冲突'],
    '恐惧': ['负面新闻信息', '亲人健康问题', '人身安全担忧', '对未来的不确定感'],
  }

  // AI 分析结果 & 建议（按情绪标签映射）
  const aiData: Record<string, { analysis: { primaryEmotion: string; emotionNature: string; riskLevel: (i: number) => string }; suggestions: { riskDescription: string; advice: string }[] }> = {
    '开心': {
      analysis: { primaryEmotion: '积极愉悦', emotionNature: '正面情绪', riskLevel: () => '低风险' },
      suggestions: [
        { riskDescription: '当前情绪状态积极健康，无异常波动，未发现明显风险信号。', advice: '建议记录当下的积极体验，建立"积极情绪库"，在未来低谷时可以回顾这些资源。' },
        { riskDescription: '情绪基调愉悦稳定，社会功能良好，心理韧性处于较高水平。', advice: '尝试将这份愉悦延伸到日常小事中，培养发现美好的习惯，积极情绪会在人际互动中被放大。' },
        { riskDescription: '情绪能量充沛，社会联结感强，对生活保持开放和接纳的态度。', advice: '这是与身边人分享的好时机，主动表达感谢和欣赏，让正面体验在关系中流动。' },
      ],
    },
    '期待': {
      analysis: { primaryEmotion: '期待向往', emotionNature: '正面情绪', riskLevel: () => '低风险' },
      suggestions: [
        { riskDescription: '期待感驱动行为动力，当前情绪面向未来而非沉溺过去，整体风险较低。', advice: '将大目标拆解为小的行动步骤，在等待中保持参与感和掌控感，避免期待落空后的失落。' },
        { riskDescription: '对未来事件的积极预期带来愉悦感，但伴随轻微的不确定性焦虑，属正常范围。', advice: '保持适度的期待能提升幸福感，同时做好预案也能让结果不如预期时更快恢复。' },
        { riskDescription: '正向期待有助于维持动力，但需注意避免过度理想化导致现实落差。', advice: '在期待的同时关注当下的生活节奏，避免因过度聚焦未来而忽略眼前的自我照顾。' },
      ],
    },
    '平静': {
      analysis: { primaryEmotion: '平静稳定', emotionNature: '中性情绪', riskLevel: () => '低风险' },
      suggestions: [
        { riskDescription: '情绪基线稳定，无明显波动或压抑倾向，处于健康的情绪平衡状态。', advice: '这是进行自我反思和内省的好时机，可以借此整理近期的情绪变化规律。' },
        { riskDescription: '情绪状态平稳，未检测到焦虑或抑郁指标，心理状态保持在正常区间。', advice: '保持规律的作息和适度的运动有助于维持情绪的稳定基线，平静不等于平淡。' },
        { riskDescription: '情绪波动幅度小，自我调节能力良好，但略显缺乏积极情绪的激活。', advice: '在日常中加入一些微小的新鲜感，比如换一条回家的路、尝试新菜谱，为生活注入活力。' },
      ],
    },
    '焦虑': {
      analysis: { primaryEmotion: '轻度焦虑', emotionNature: '负面情绪', riskLevel: (i: number) => i % 3 === 0 ? '高风险' : '中风险' },
      suggestions: [
        { riskDescription: '检测到明显的焦虑信号，主要表现为对未来事件的过度担忧，伴随睡眠质量下降。', advice: '尝试将担忧写下来，区分"能控制的事"和"无法控制的事"，把注意力集中在前者。' },
        { riskDescription: '焦虑水平超过日常波动范围，出现反复思虑和躯体紧张表现，需要关注。', advice: '进行 4-7-8 呼吸法：吸气 4 秒，屏息 7 秒，缓慢呼出 8 秒，重复 3-5 轮。减少下午 3 点后的咖啡因摄入。' },
        { riskDescription: '焦虑已对睡眠和日常专注力产生影响，且持续时间超过一周，建议干预。', advice: '睡前 1 小时放下手机，用暖光阅读或听轻音乐替代。' },
        { riskDescription: '焦虑症状持续时间较长且强度较高，已显著影响日常生活功能，需专业介入。', advice: '建议预约一次心理咨询，专业帮助能提供更有效的应对策略，认知行为疗法对焦虑有良好效果。' },
      ],
    },
    '疲惫': {
      analysis: { primaryEmotion: '倦怠疲惫', emotionNature: '负面情绪', riskLevel: (i: number) => i % 4 === 0 ? '高风险' : '中风险' },
      suggestions: [
        { riskDescription: '检测到精力透支信号，可能源于长期高压工作或情绪压抑，身体处于代偿状态。', advice: '请优先保证睡眠质量，即使白天很忙，也留出 15 分钟的"空白时间"不做任何事。' },
        { riskDescription: '倦怠感涉及多个生活领域，能量持续消耗而补给不足，存在发展为倦怠综合征的风险。', advice: '倦怠往往不是单一原因造成的，尝试找出最大的能量消耗源，从那个点开始调整。' },
        { riskDescription: '疲惫伴随情绪麻木和动力下降，自我照顾能力明显减弱，需警惕进一步恶化。', advice: '学会说"不"是保护自己的重要能力，回顾近期的承诺，看看哪些可以延后或拒绝。' },
        { riskDescription: '持续精疲力竭伴随身体症状（食欲改变、体重下降），建议排查生理性原因。', advice: '建议进行一次身体检查，排除甲状腺、贫血等生理性原因，同时减少不必要的能量支出。' },
      ],
    },
    '悲伤': {
      analysis: { primaryEmotion: '低落悲伤', emotionNature: '负面情绪', riskLevel: (i: number) => i % 5 === 0 ? '高风险' : '中风险' },
      suggestions: [
        { riskDescription: '检测到低落情绪，可能与近期丧失或分离体验相关，属于正常哀伤反应范围。', advice: '悲伤是有价值的情绪，允许自己感受它，而不是急着"变好"。每天设定一件小事来完成，建立微小掌控感。' },
        { riskDescription: '悲伤情绪持续时间延长，出现退缩和孤独感加重的趋势，社交功能有所下降。', advice: '尝试和信任的朋友或家人表达感受，哪怕只是说一句"我今天不太好"，孤独感会放大悲伤的强度。' },
        { riskDescription: '低落情绪伴随兴趣丧失和自我价值感下降，已触及抑郁筛查的警戒线。', advice: '每天坚持做一件过去喜欢的小事，哪怕只有十分钟。微小的愉悦体验有助于重建情绪的积极反馈。' },
        { riskDescription: '症状模式与抑郁症高度吻合：持续悲伤、兴趣丧失、睡眠食欲改变超过 2 周。', advice: '请务必联系心理咨询师或精神科医生进行评估，这不是软弱，而是对自己负责的勇敢行为。' },
      ],
    },
    '愤怒': {
      analysis: { primaryEmotion: '愤怒不满', emotionNature: '负面情绪', riskLevel: (i: number) => i % 3 === 0 ? '高风险' : '中风险' },
      suggestions: [
        { riskDescription: '检测到明显的愤怒情绪，与近期遭遇的不公平对待或边界被侵犯有关，属情境性反应。', advice: '愤怒是边界被侵犯的信号，在情绪最激烈时先给自己 10 分钟冷静，避免冲动反应。' },
        { riskDescription: '愤怒情绪频发且强度较高，存在将愤怒内化或外化的双重风险，需要建设性释放渠道。', advice: '尝试"情绪书写"：把感受全部写下来不加修饰，写完后决定是否需要沟通。运动也是转化愤怒的好方式。' },
        { riskDescription: '积累的愤怒已影响人际关系和日常情绪稳定性，愤怒背后可能存在未被满足的核心需求。', advice: '冷静后用"I"语句表达需求（如"我感到不被尊重"），这比指责对方更容易达成有效沟通。' },
        { riskDescription: '愤怒伴随报复性想法或持续的怨恨情绪，存在理性判断被情绪遮蔽的风险。', advice: '如果发现自己反复回想不愉快的事件且难以停止，建议寻求心理咨询帮助来打破这个循环。' },
      ],
    },
    '恐惧': {
      analysis: { primaryEmotion: '恐惧不安', emotionNature: '负面情绪', riskLevel: () => '高风险' },
      suggestions: [
        { riskDescription: '检测到高度恐惧反应，过度警觉和灾难化思维明显，应激系统持续激活中。', advice: '尝试区分"真实的危险"和"想象中的威胁"，把恐惧具体化往往会发现它比想象中更容易应对。' },
        { riskDescription: '恐惧已影响睡眠质量和日常安全感，回避行为开始限制正常生活范围。', advice: '进行"最坏情况"练习：写下最害怕发生的事，再写下应对方案。直面恐惧通常比回避更能降低恐惧。' },
        { riskDescription: '持续暴露于负面信息源加剧了恐惧感，形成"信息摄入→恐惧→更多搜索→更恐惧"的恶性循环。', advice: '设定每天查看新闻的时间上限（如 30 分钟），睡前一小时完全断开信息流，让神经系统有时间恢复。' },
        { riskDescription: '恐惧程度已显著影响睡眠、社交和日常功能，且持续时间较长，需要专业心理干预。', advice: '强烈建议寻求专业心理帮助，针对恐惧和创伤有成熟的治疗方案。你不需要独自面对这一切。' },
      ],
    },
  }

  const mockEmotionals = Array.from({ length: 58 }, (_, i) => {
    const daysAgo = Math.floor(Math.random() * 90)
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60))
    const userIdx = i % 10

    // 按语义选取情绪：正面/中性/负面混合，保持真实分布
    const mood = allMoods[i % allMoods.length]
    const [min, max] = mood.scoreRange
    const score = Math.floor(Math.random() * (max - min + 1)) + min

    const contents = moodContents[mood.label]
    const content = contents[i % contents.length]

    const triggerList = moodTriggers[mood.label]
    const trigger = triggerList[i % triggerList.length]

    const ai = aiData[mood.label]
    const aiAnalysis = {
      primaryEmotion: ai.analysis.primaryEmotion,
      emotionIntensity: Math.floor(Math.random() * 30) + score * 7,
      riskLevel: ai.analysis.riskLevel(i),
      emotionNature: ai.analysis.emotionNature,
    }
    const suggestion = ai.suggestions[i % ai.suggestions.length]
    const aiSuggestion = {
      riskDescription: suggestion.riskDescription,
      advice: suggestion.advice,
    }

    // 睡眠时长和压力水平与评分负相关
    const sleepDuration = score >= 7 ? Math.floor(Math.random() * 3) + 8   // 8-10 小时
      : score >= 4 ? Math.floor(Math.random() * 4) + 5                      // 5-8 小时
      : Math.floor(Math.random() * 4) + 2                                   // 2-5 小时
    const pressureLevel = score >= 7 ? Math.floor(Math.random() * 20) + 10  // 10-30
      : score >= 4 ? Math.floor(Math.random() * 25) + 35                    // 35-60
      : Math.floor(Math.random() * 25) + 65                                  // 65-90

    return {
      id: i + 1,
      userId: 1000 + userIdx,
      userName: userNames[userIdx],
      moodScore: score,
      moodLabel: mood.label,
      content,
      sleepDuration,
      pressureLevel,
      moodTrigger: trigger,
      aiAnalysis,
      aiSuggestion,
      createdAt: d.toISOString().replace('T', ' ').slice(0, 19),
    }
  })

  return {
    name: 'mock-api',
    configureServer(server) {
      // ==================== 登录 ====================
      server.middlewares.use('/api/auth/login', async (req, res, next) => {
        if (req.method !== 'POST') return next()

        try {
          const { username, password } = JSON.parse(await readBody(req))

          if (!password || password.length < 6) {
            return json(res, { code: 400, message: '密码至少 6 位', data: null })
          }

          const isEmail = username?.includes('@')
          const displayName = username || 'admin'
          // admin 登录 → 管理员角色；其他用户名 → 普通用户
          const isAdmin = username === 'admin'

          json(res, {
            code: 200, message: 'ok',
            data: {
              token: 'mock-jwt-token-' + (isAdmin ? 'admin' : 'user') + '-xxxxx',
              userInfo: {
                id: isAdmin ? 1 : 1001,
                username: isEmail ? username : displayName,
                nickname: isEmail ? displayName.split('@')[0] : displayName,
                avatar: '', // 空值 → el-avatar 展示首字兜底
                roles: isAdmin ? ['admin'] : ['user'],
              },
            },
          })
        } catch {
          json(res, { code: 400, message: '请求格式错误', data: null })
        }
      })

      // ==================== 注册 ====================
      server.middlewares.use('/api/auth/register', async (req, res, next) => {
        if (req.method !== 'POST') return next()

        try {
          const { username, password } = JSON.parse(await readBody(req))

          if (!username?.trim()) {
            return json(res, { code: 400, message: '用户名不能为空', data: null })
          }
          if (!password || password.length < 6) {
            return json(res, { code: 400, message: '密码至少 6 位', data: null })
          }
          // 模拟用户名重复检查
          if (username === 'admin') {
            return json(res, { code: 409, message: '用户名已存在', data: null })
          }

          // 注册成功，返回空 data（需跳转到登录页）
          json(res, { code: 200, message: '注册成功', data: null })
        } catch {
          json(res, { code: 400, message: '请求格式错误', data: null })
        }
      })

      // ==================== 知识文章：CRUD ====================
      server.middlewares.use('/api/knowledge/articles', async (req, res, next) => {
        // GET 列表 / 详情
        if (req.method === 'GET') {
          const url = new URL(req.url!, 'http://localhost')
          // 路径末段是数字 → 详情
          const id = Number(url.pathname.split('/').pop())
          if (id) {
            const article = mockArticles.find((a) => a.id === id)
            if (!article) return json(res, { code: 404, message: '文章不存在', data: null })
            return json(res, { code: 200, message: 'ok', data: article })
          }

          const title = url.searchParams.get('title') || undefined
          const category = url.searchParams.get('category') || undefined
          const status = url.searchParams.get('status') || undefined
          const page = Number(url.searchParams.get('page')) || 1
          const pageSize = Number(url.searchParams.get('pageSize')) || 10

          let filtered = mockArticles
          if (title) filtered = filtered.filter((a) => a.title.includes(title))
          if (category) filtered = filtered.filter((a) => a.category === category)
          if (status) filtered = filtered.filter((a) => a.status === status)

          const total = filtered.length
          const start = (page - 1) * pageSize
          const list = filtered.slice(start, start + pageSize)

          return json(res, { code: 200, message: 'ok', data: { list, total } })
        }

        // PUT 更新
        if (req.method === 'PUT') {
          try {
            const id = Number(req.url!.split('/').pop()?.split('?')[0])
            const idx = mockArticles.findIndex((a) => a.id === id)
            if (idx === -1) return json(res, { code: 404, message: '文章不存在', data: null })

            const body = JSON.parse(await readBody(req))
            mockArticles[idx] = { ...mockArticles[idx], ...body }
            return json(res, { code: 200, message: '更新成功', data: mockArticles[idx] })
          } catch {
            return json(res, { code: 400, message: '请求格式错误', data: null })
          }
        }

        // POST 创建
        if (req.method === 'POST') {
          try {
            const body = JSON.parse(await readBody(req))
            const newArticle = {
              id: mockArticles.length + 1,
              title: body.title || '',
              content: body.content || '',
              category: body.category || 'mental-health',
              author: '系统管理员',
              summary: body.summary || '',
              coverImage: body.coverImage || '',
              tags: body.tags || [],
              status: 'draft' as const,
              views: 0,
              createdAt: new Date().toISOString().split('T')[0],
            }
            mockArticles.unshift(newArticle)
            return json(res, { code: 200, message: '创建成功', data: newArticle })
          } catch {
            return json(res, { code: 400, message: '请求格式错误', data: null })
          }
        }

        // DELETE 删除
        if (req.method === 'DELETE') {
          const id = Number(req.url!.split('/').pop()?.split('?')[0])
          const idx = mockArticles.findIndex((a) => a.id === id)
          if (idx === -1) return json(res, { code: 404, message: '文章不存在', data: null })

          mockArticles.splice(idx, 1)
          return json(res, { code: 200, message: '删除成功', data: null })
        }

        next()
      })

      // ==================== 咨询记录 ====================
      server.middlewares.use('/api/consultations/records', async (req, res, next) => {
        // GET 列表 / 详情
        if (req.method === 'GET') {
          const url = new URL(req.url!, 'http://localhost')
          // 路径末段是数字 → 详情
          const id = Number(url.pathname.split('/').pop())
          if (id) {
            const record = mockConsultations.find((c) => c.id === id)
            if (!record) return json(res, { code: 404, message: '咨询记录不存在', data: null })
            const messages = generateMockMessages(id, record.messageCount, record.firstMessage)
            const lastMsg = messages[messages.length - 1]
            return json(res, { code: 200, message: 'ok', data: { ...record, messages, messageCount: messages.length, lastMessageTime: lastMsg.time } })
          }

          const page = Number(url.searchParams.get('page')) || 1
          const pageSize = Number(url.searchParams.get('pageSize')) || 10

          const total = mockConsultations.length
          const start = (page - 1) * pageSize
          const list = mockConsultations.slice(start, start + pageSize)

          return json(res, { code: 200, message: 'ok', data: { list, total } })
        }

        // DELETE 删除
        if (req.method === 'DELETE') {
          const id = Number(req.url!.split('/').pop())
          const idx = mockConsultations.findIndex((c) => c.id === id)
          if (idx === -1) return json(res, { code: 404, message: '咨询记录不存在', data: null })

          mockConsultations.splice(idx, 1)
          return json(res, { code: 200, message: '删除成功', data: null })
        }

        next()
      })

      // ==================== 情绪日志 ====================
      server.middlewares.use('/api/emotional/records', async (req, res, next) => {
        // GET 列表 / 详情
        if (req.method === 'GET') {
          const url = new URL(req.url!, 'http://localhost')
          // 路径末段是数字 → 详情
          const id = Number(url.pathname.split('/').pop())
          if (id) {
            const record = mockEmotionals.find((e) => e.id === id)
            if (!record) return json(res, { code: 404, message: '情绪记录不存在', data: null })
            return json(res, { code: 200, message: 'ok', data: record })
          }

          const page = Number(url.searchParams.get('page')) || 1
          const pageSize = Number(url.searchParams.get('pageSize')) || 10
          const userId = url.searchParams.get('userId') || undefined
          const moodScoreRange = url.searchParams.get('moodScoreRange') || undefined
          const moodLabel = url.searchParams.get('moodLabel') || undefined

          let filtered = mockEmotionals
          if (userId) filtered = filtered.filter((e) => String(e.userId) === userId)
          if (moodScoreRange) {
            const [min, max] = moodScoreRange.split('-').map(Number)
            filtered = filtered.filter((e) => e.moodScore >= min && e.moodScore <= max)
          }
          if (moodLabel) filtered = filtered.filter((e) => e.moodLabel === moodLabel)

          const total = filtered.length
          const start = (page - 1) * pageSize
          // 列表只返回轻量字段，剔除详情专属数据
          const list = filtered.slice(start, start + pageSize).map(({ sleepDuration, pressureLevel, moodTrigger, aiAnalysis, aiSuggestion, ...item }) => item)

          return json(res, { code: 200, message: 'ok', data: { list, total } })
        }

        // DELETE 删除
        if (req.method === 'DELETE') {
          const id = Number(req.url!.split('/').pop())
          const idx = mockEmotionals.findIndex((e) => e.id === id)
          if (idx === -1) return json(res, { code: 404, message: '情绪记录不存在', data: null })

          mockEmotionals.splice(idx, 1)
          return json(res, { code: 200, message: '删除成功', data: null })
        }

        next()
      })

      // ==================== 仪表盘 ====================
      server.middlewares.use('/api/dashboard', async (req, res, next) => {
        if (req.method !== 'GET') return next()

        const url = new URL(req.url!, 'http://localhost')
        const range = url.searchParams.get('range') || '30d'

        // 基于已有 mock 数据计算统计指标
        const totalEmotional = mockEmotionals.length
        const totalConsultations = mockConsultations.length
        const todayStr = new Date().toISOString().split('T')[0]

        const todayEmotional = mockEmotionals.filter((e) => e.createdAt.startsWith(todayStr)).length
        const todayConsultations = mockConsultations.filter((c) => c.startedAt.startsWith(todayStr)).length

        const avgScore = Math.round((mockEmotionals.reduce((s, e) => s + e.moodScore, 0) / totalEmotional) * 10) / 10
        const highRiskCount = mockEmotionals.filter((e) => e.aiAnalysis.riskLevel === '高风险').length

        // 活跃用户：最近 7 天有过情绪记录的用户
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const activeUserIds = new Set(
          mockEmotionals
            .filter((e) => new Date(e.createdAt) >= sevenDaysAgo)
            .map((e) => e.userId),
        )

        // 情绪分布
        const emotionDistMap: Record<string, number> = {}
        mockEmotionals.forEach((e) => {
          emotionDistMap[e.moodLabel] = (emotionDistMap[e.moodLabel] || 0) + 1
        })

        // 风险分布
        const riskDistMap: Record<string, number> = { '低风险': 0, '中风险': 0, '高风险': 0 }
        mockEmotionals.forEach((e) => {
          riskDistMap[e.aiAnalysis.riskLevel] = (riskDistMap[e.aiAnalysis.riskLevel] || 0) + 1
        })

        // 趋势数据生成：按 range 决定总天数和聚合粒度
        const totalDays = range === '7d' ? 7 : range === '90d' ? 90 : 30
        const groupSize = range === '7d' ? 1 : range === '90d' ? 7 : 1 // 90 天按周聚合

        const generateTrend = (base: number, variance: number) => {
          const raw: { date: string; value: number }[] = []
          for (let i = 0; i < totalDays; i++) {
            const d = new Date()
            d.setDate(d.getDate() - (totalDays - 1 - i))
            raw.push({
              date: d.toISOString().split('T')[0],
              value: Math.max(0, base + Math.floor(Math.random() * variance * 2) - variance),
            })
          }

          if (groupSize === 1) return raw

          // 按周聚合
          const grouped: { date: string; value: number }[] = []
          for (let i = 0; i < raw.length; i += groupSize) {
            const chunk = raw.slice(i, i + groupSize)
            const avgVal = Math.round((chunk.reduce((s, d) => s + d.value, 0) / chunk.length) * 10) / 10
            grouped.push({ date: chunk[0].date, value: avgVal })
          }
          return grouped
        }

        const moodTrendRaw = generateTrend(Math.round(avgScore * 10) / 10, 2)
        // 日粒度时做平滑
        if (groupSize === 1 && moodTrendRaw.length >= 3) {
          for (let i = 2; i < moodTrendRaw.length; i++) {
            moodTrendRaw[i].value = Math.round(
              Math.min(10, Math.max(1, moodTrendRaw[i].value * 0.3 + moodTrendRaw[i - 1].value * 0.4 + moodTrendRaw[i - 2].value * 0.3)) * 10,
            ) / 10
          }
        }

        const moodTrend = moodTrendRaw
        const consultationTrend = generateTrend(14, 7)
        const userActivityTrend = generateTrend(activeUserIds.size, 10)

        json(res, {
          code: 200,
          message: 'ok',
          data: {
            totalUsers: 10,
            activeUsers: activeUserIds.size,
            emotionalLogs: { total: totalEmotional, todayNew: todayEmotional },
            consultations: { total: totalConsultations, todayNew: todayConsultations },
            avgMoodScore: avgScore,
            highRiskCount,
            moodTrend,
            emotionDistribution: Object.entries(emotionDistMap).map(([label, count]) => ({ label, count })),
            riskDistribution: Object.entries(riskDistMap).map(([label, count]) => ({ label, count })),
            consultationTrend,
            userActivityTrend,
          },
        })
      })

      // ==================== 用户端 - 首页 ====================
      server.middlewares.use('/api/user/home', async (req, res, next) => {
        if (req.method !== 'GET') return next()

        const url = new URL(req.url!, 'http://localhost')
        const userId = Number(url.searchParams.get('userId')) || 1001

        // 为当前请求用户补充最近 7 天的 mock 数据（保证"本周统计"不空）
        const now2 = new Date()
        for (let d = 0; d < 7; d++) {
          const date = new Date(now2)
          date.setDate(now2.getDate() - d)
          // 最近 4 天保证有记录，跳过已有该日期的
          if (d >= 4) continue
          const dateStr = date.toISOString().split('T')[0]
          const hasRecord = mockEmotionals.some((e) => e.userId === userId && e.createdAt.startsWith(dateStr))
          if (!hasRecord) {
            const mood = allMoods[d % allMoods.length]
            const [min, max] = mood.scoreRange
            const score = Math.floor(Math.random() * (max - min + 1)) + min
            const contents = moodContents[mood.label]
            const triggerList = moodTriggers[mood.label]
            const ai = aiData[mood.label]
            const suggestion = ai.suggestions[d % ai.suggestions.length]
            const newId = Math.max(0, ...mockEmotionals.map((e) => e.id)) + 1 + d
            mockEmotionals.push({
              id: newId,
              userId,
              userName: userNames[userId % 10],
              moodScore: score,
              moodLabel: mood.label,
              content: contents[d % contents.length],
              sleepDuration: score >= 7 ? 8 : score >= 4 ? 6 : 4,
              pressureLevel: score >= 7 ? 20 : score >= 4 ? 50 : 75,
              moodTrigger: triggerList[d % triggerList.length],
              aiAnalysis: {
                primaryEmotion: ai.analysis.primaryEmotion,
                emotionIntensity: score * 8 + d * 2,
                riskLevel: ai.analysis.riskLevel(d),
                emotionNature: ai.analysis.emotionNature,
              },
              aiSuggestion: { riskDescription: suggestion.riskDescription, advice: suggestion.advice },
              createdAt: dateStr + ' ' + (10 + d).toString().padStart(2, '0') + ':00:00',
            })
          }
        }

        // 该用户的情绪记录（按时间倒序）
        const userEmotionals = mockEmotionals
          .filter((e) => e.userId === userId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

        // 该用户的咨询记录
        const userConsultations = mockConsultations
          .filter((c) => c.userId === userId)
          .sort((a, b) => b.lastMessageTime.localeCompare(a.lastMessageTime))

        // 今日
        const todayStr = new Date().toISOString().split('T')[0]
        const todayRecord = userEmotionals.find((e) => e.createdAt.startsWith(todayStr))

        // 本周范围
        const now = new Date()
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        const weekStr = weekAgo.toISOString().split('T')[0]

        // 本周情绪记录
        const weekEmotionals = userEmotionals.filter((e) => e.createdAt >= weekStr)
        const weekChatMessages = userConsultations
          .filter((c) => c.lastMessageTime >= weekStr)
          .reduce((sum, c) => sum + c.messageCount, 0)
        const weekAvgScore = weekEmotionals.length > 0
          ? Math.round((weekEmotionals.reduce((s, e) => s + e.moodScore, 0) / weekEmotionals.length) * 10) / 10
          : 0

        // 统计卡片
        const stats = {
          todayMoodScore: todayRecord?.moodScore || 0,
          todayMoodLabel: todayRecord?.moodLabel || '',
          weekMoodCount: weekEmotionals.length,
          weekChatCount: weekChatMessages,
          weekAvgScore,
        }

        // 最近 7 天情绪趋势
        const recentMoods = Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          const dateStr = d.toISOString().split('T')[0]
          const record = userEmotionals.find((e) => e.createdAt.startsWith(dateStr))
          return record
            ? { date: dateStr, score: record.moodScore, label: record.moodLabel }
            : { date: dateStr, score: 0, label: '无记录' }
        })

        // 最近 3 条对话
        const recentChats = userConsultations.slice(0, 3).map((c) => ({
          id: c.id,
          title: c.firstMessage.length > 20 ? c.firstMessage.slice(0, 20) + '…' : c.firstMessage,
          lastMessage: c.firstMessage,
          lastTime: c.lastMessageTime,
          messageCount: c.messageCount,
        }))

        // 每日寄语
        const dailyQuotes = [
          '每一次对话都是一次自我发现。',
          '你不需要独自承担一切，这里有人倾听。',
          '休息不是懒惰，是身心健康的需要。',
          '你已经做得够好了，给自己一点肯定吧。',
          '情绪不分好坏，每一种都是你的真实感受。',
          '改变从一小步开始，今天你迈出了这一步。',
          '感受到痛苦，意味着你依然在意，这是活着的证明。',
        ]

        json(res, {
          code: 200, message: 'ok',
          data: {
            dailyQuote: dailyQuotes[new Date().getDay() % dailyQuotes.length],
            stats,
            recentMoods,
            recentChats,
          },
        })
      })

      // ==================== 用户端 - 聊天 ====================
      // 内存中维护的用户会话（按 userId 存储，dev server 重启后重置）
      const userSessions: Record<number, Array<{
        id: number
        title: string
        messages: Array<{ id: number; sender: 'user' | 'assistant'; content: string; time: string }>
      }>> = {}

      // 为已有 mock 咨询数据预建会话
      const initUserSessions = (userId: number) => {
        if (!userSessions[userId]) {
          userSessions[userId] = mockConsultations
            .filter((c) => c.userId === userId)
            .map((c) => ({
              id: c.id,
              title: c.firstMessage.length > 18 ? c.firstMessage.slice(0, 18) + '…' : c.firstMessage,
              messages: generateMockMessages(c.id, c.messageCount, c.firstMessage),
            }))
        }
      }

      // AI 回复池
      const aiReplies = [
        '谢谢你愿意和我分享这些，能具体说说是什么让你有这样的感受吗？',
        '我听到了你的困扰，这种感觉确实不容易。你之前有尝试过什么方法来应对吗？',
        '每个人都会有这样的时候，你的感受是完全正常的。要不要试试换个角度看这件事？',
        '听你这么说，我能感受到你内心的挣扎。如果现在给自己一个小小的安慰，那会是什么？',
        '你提到的情况我很关注。除了这些外在因素，你觉得自己内心的声音是怎么说的？',
        '这是一个很重要的觉察。当你开始注意到这些的时候，改变其实已经悄悄开始了。',
        '不用着急，我们慢慢来。有时候，仅仅是说出来，就已经是向前迈了一大步。',
        '我理解你的感受。如果用一个词来形容你现在的状态，那会是什么？',
        '你的情绪是合理的，不要否定自己的感受。要不要试试今天给自己五分钟，什么都不做，只是呼吸？',
        '听起来你经历了很多。在这么多压力之中，你还愿意来这里和我聊，这本身就很了不起。',
        '我很好奇，如果这些事情发生在你最亲近的朋友身上，你会怎么安慰他？你能用同样的温柔对待自己吗？',
        '这个发现很有意义。你能觉察到这些，说明你对自己的了解比想象中更深。',
      ]

      server.middlewares.use('/api/user/chat/send', async (req, res, next) => {
        if (req.method !== 'POST') return next()

        try {
          const { sessionId, content, userId } = JSON.parse(await readBody(req))
          if (!content?.trim()) return json(res, { code: 400, message: '消息不能为空', data: null })

          initUserSessions(userId || 1001)
          const sessions = userSessions[userId || 1001]

          let session = sessionId ? sessions.find((s) => s.id === sessionId) : null
          // 不存在则新建会话
          if (!session) {
            const newId = Math.max(0, ...sessions.map((s) => s.id)) + 1
            session = {
              id: newId,
              title: content.length > 18 ? content.slice(0, 18) + '…' : content,
              messages: [],
            }
            sessions.unshift(session)
          }

          const now = new Date()
          const timeStr = now.toISOString().replace('T', ' ').slice(0, 19)
          const userMsg = {
            id: session.messages.length + 1,
            sender: 'user' as const,
            content,
            time: timeStr,
          }
          session.messages.push(userMsg)

          // 模拟 AI 延迟回复
          await new Promise((r) => setTimeout(r, 600 + Math.random() * 800))

          const aiMsg = {
            id: session.messages.length + 1,
            sender: 'assistant' as const,
            content: aiReplies[Math.floor(Math.random() * aiReplies.length)],
            time: new Date().toISOString().replace('T', ' ').slice(0, 19),
          }
          session.messages.push(aiMsg)

          // 更新会话标题（用第一条用户消息）
          if (session.messages.filter((m) => m.sender === 'user').length === 1) {
            session.title = content.length > 18 ? content.slice(0, 18) + '…' : content
          }

          json(res, { code: 200, message: 'ok', data: { userMessage: userMsg, aiReply: aiMsg } })
        } catch {
          json(res, { code: 400, message: '请求格式错误', data: null })
        }
      })

      server.middlewares.use('/api/user/chat/sessions', async (req, res, next) => {
        if (req.method !== 'GET') return next()

        const url = new URL(req.url!, 'http://localhost')
        const userId = Number(url.searchParams.get('userId')) || 1001
        const id = Number(url.pathname.split('/').pop())

        initUserSessions(userId)
        const sessions = userSessions[userId]

        // 路径末段是数字 → 返回该会话消息
        if (id) {
          const session = sessions.find((s) => s.id === id)
          if (!session) return json(res, { code: 404, message: '会话不存在', data: null })
          return json(res, { code: 200, message: 'ok', data: session.messages })
        }

        // 否则返回会话列表
        const list = sessions.map((s) => ({
          id: s.id,
          title: s.title,
          lastMessage: s.messages.length > 0 ? s.messages[s.messages.length - 1].content : '',
          lastTime: s.messages.length > 0 ? s.messages[s.messages.length - 1].time : '',
          messageCount: s.messages.length,
        }))
        json(res, { code: 200, message: 'ok', data: list })
      })

      // ==================== 用户端 - 心情记录 ====================
      // 内存中的用户心情记录（dev server 重启后重置）
      const userMoodRecords: Record<number, Array<{
        id: number; userId: number; userName: string; moodScore: number; moodLabel: string
        content: string; moodTrigger: string; sleepDuration: number; pressureLevel: number
        aiAnalysis: any; aiSuggestion: any; createdAt: string
      }>> = {}

      const initUserMoods = (userId: number) => {
        if (!userMoodRecords[userId]) {
          userMoodRecords[userId] = mockEmotionals
            .filter((e) => e.userId === userId)
            .map((e) => ({ ...e }))
        }
      }

      server.middlewares.use('/api/user/mood', async (req, res, next) => {
        const url = new URL(req.url!, 'http://localhost')
        const userId = Number(url.searchParams.get('userId')) || 1001

        initUserMoods(userId)

        // POST 创建
        if (req.method === 'POST') {
          try {
            const body = JSON.parse(await readBody(req))
            if (!body.moodScore || !body.moodLabel) {
              return json(res, { code: 400, message: '情绪评分和标签不能为空', data: null })
            }

            const records = userMoodRecords[body.userId || userId]
            const newRecord = {
              id: records.length > 0 ? Math.max(...records.map((r) => r.id)) + 1 : 1,
              userId: body.userId || userId,
              userName: body.userName || '用户',
              moodScore: body.moodScore,
              moodLabel: body.moodLabel,
              content: body.content || '',
              moodTrigger: body.moodTrigger || '',
              sleepDuration: body.sleepDuration || 0,
              pressureLevel: body.pressureLevel || 0,
              aiAnalysis: {
                primaryEmotion: body.moodLabel,
                emotionIntensity: body.moodScore * 10,
                riskLevel: body.moodScore >= 7 ? '低风险' : body.moodScore >= 4 ? '中风险' : '高风险',
                emotionNature: body.moodScore >= 7 ? '正面情绪' : body.moodScore >= 4 ? '中性情绪' : '负面情绪',
              },
              aiSuggestion: {
                riskDescription: '已记录心情，AI 会根据你的情绪变化提供建议。',
                advice: body.moodScore >= 7
                  ? '你的状态不错！保持积极的心态，享受美好的一天。'
                  : '关注自己的情绪很重要，如果持续低落，不妨和 AI 咨询师聊聊。',
              },
              createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
            }
            records.unshift(newRecord)
            return json(res, { code: 200, message: '记录成功', data: null })
          } catch {
            return json(res, { code: 400, message: '请求格式错误', data: null })
          }
        }

        // GET 列表
        if (req.method === 'GET') {
          const page = Number(url.searchParams.get('page')) || 1
          const pageSize = Number(url.searchParams.get('pageSize')) || 10

          const records = userMoodRecords[userId] || []
          const total = records.length
          const start = (page - 1) * pageSize
          const list = records.slice(start, start + pageSize).map(({ aiAnalysis, aiSuggestion, sleepDuration, pressureLevel, moodTrigger, userId, userName, ...item }) => item)

          return json(res, { code: 200, message: 'ok', data: { list, total } })
        }

        // DELETE 删除
        if (req.method === 'DELETE') {
          const id = Number(req.url!.split('/').pop())
          // 在所有用户的心情记录中查找并删除
          for (const uid of Object.keys(userMoodRecords)) {
            const records = userMoodRecords[Number(uid)]
            const idx = records.findIndex((r) => r.id === id)
            if (idx !== -1) {
              records.splice(idx, 1)
              return json(res, { code: 200, message: '删除成功', data: null })
            }
          }
          return json(res, { code: 404, message: '心情记录不存在', data: null })
        }

        next()
      })

      // ==================== 文件上传 ====================
      server.middlewares.use('/api/file/upload', async (req, res, next) => {
        if (req.method !== 'POST') return next()

        // mock：直接返回一个假 URL，不真实存储文件
        json(res, {
          code: 200,
          message: 'ok',
          data: { url: 'https://picsum.photos/400/240' },
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), mockApiPlugin()],
  // 开发服务器代理，把 /api 请求转发到后端（mock 插件命中的请求不会走到代理）
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  //配置路径别名
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
