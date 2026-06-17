// 心情记录种子数据 —— seed.ts 和 seed-moods.ts 共享

// ==================== 评分区间 ====================

export const SCORE_RANGE: Record<string, [number, number]> = {
  '开心': [7, 10], '焦虑': [3, 6], '平静': [5, 7], '疲惫': [3, 5],
  '悲伤': [2, 4], '愤怒': [3, 6], '恐惧': [2, 4], '期待': [7, 9],
}

// ==================== AI 分析数据 ====================

export const AI_DATA: Record<string, {
  analysis: { primaryEmotion: string; emotionIntensity: [number, number]; riskLevel: string; emotionNature: string }
  suggestions: { riskDescription: string; advice: string }[]
}> = {
  '开心': {
    analysis: { primaryEmotion: '积极愉悦', emotionIntensity: [70, 85], riskLevel: '低风险', emotionNature: '正面情绪' },
    suggestions: [
      { riskDescription: '当前情绪状态积极健康，心理弹性良好。', advice: '记录当下的积极体验，建立"积极情绪库"，在情绪低落时回顾。' },
      { riskDescription: '愉悦感有助于增强免疫系统和创造力。', advice: '将这份能量转化为行动力，完成一件你一直想做的事。' },
      { riskDescription: '积极情绪是心理韧性的重要缓冲。', advice: '不妨把这份心情分享给身边的人，快乐会加倍。' },
    ],
  },
  '焦虑': {
    analysis: { primaryEmotion: '轻度焦虑', emotionIntensity: [45, 65], riskLevel: '中风险', emotionNature: '负面情绪' },
    suggestions: [
      { riskDescription: '检测到明显的焦虑信号，可能伴随躯体化反应。', advice: '尝试将担忧的事写下来，区分"能控制的"和"无法控制的"，逐一制定应对计划。' },
      { riskDescription: '焦虑水平处于中度区间，会影响睡眠质量和注意力。', advice: '每天给自己 15 分钟"焦虑时间"，其余时间把焦虑想法标记后搁置。' },
      { riskDescription: '压力事件触发了焦虑反应，持续时间值得关注。', advice: '深呼吸练习：吸气 4 秒 → 屏息 4 秒 → 呼气 6 秒，连续做 5 组。' },
    ],
  },
  '平静': {
    analysis: { primaryEmotion: '平静稳定', emotionIntensity: [50, 65], riskLevel: '低风险', emotionNature: '中性情绪' },
    suggestions: [
      { riskDescription: '情绪基线稳定，处于良好的心理平衡状态。', advice: '保持规律作息，平静不等于平淡，这是心理健康的重要标志。' },
      { riskDescription: '中性情绪为思考和专注提供了良好条件。', advice: '适合利用这段时间进行需要深度思考的工作或学习。' },
    ],
  },
  '疲惫': {
    analysis: { primaryEmotion: '倦怠疲惫', emotionIntensity: [30, 50], riskLevel: '高风险', emotionNature: '负面情绪' },
    suggestions: [
      { riskDescription: '检测到精力透支信号，长期疲劳可能导致职业倦怠。', advice: '请优先保证睡眠质量，暂时减少非必要社交活动，给身心留出恢复空间。' },
      { riskDescription: '身心俱疲的状态容易引发更多负面情绪。', advice: '每天留出 15-30 分钟的"空白时间"，不做任何事，只是放空。' },
      { riskDescription: '持续疲劳可能掩盖潜在的健康问题。', advice: '建议去医院做一次常规体检，排除甲状腺、贫血等生理因素。' },
    ],
  },
  '悲伤': {
    analysis: { primaryEmotion: '低落情绪', emotionIntensity: [35, 55], riskLevel: '中风险', emotionNature: '负面情绪' },
    suggestions: [
      { riskDescription: '悲伤情绪是对失落或遗憾的自然反应。', advice: '允许自己感受悲伤，不要急着"振作起来"。流泪也是一种释放。' },
      { riskDescription: '目前处于情感低潮期，社交退缩可能加剧低落。', advice: '尝试联系一位你信任的人，哪怕只是简单地说一句"我今天不太开心"。' },
    ],
  },
  '愤怒': {
    analysis: { primaryEmotion: '愤怒情绪', emotionIntensity: [50, 70], riskLevel: '中风险', emotionNature: '负面情绪' },
    suggestions: [
      { riskDescription: '愤怒是本能的边界保护反应，但压抑或爆发都可能伤害自己或他人。', advice: '在回复任何话之前，先停顿 3 秒。写一封不会发出的信，释放情绪后再决定行动。' },
      { riskDescription: '检测到持续的愤怒情绪，可能积累为慢性压力。', advice: '运动是释放愤怒的健康方式——快走、跑步或打球都可以帮助消耗多余的应激能量。' },
    ],
  },
  '恐惧': {
    analysis: { primaryEmotion: '恐惧不安', emotionIntensity: [45, 65], riskLevel: '高风险', emotionNature: '负面情绪' },
    suggestions: [
      { riskDescription: '恐惧情绪触发了明显的回避倾向。', advice: '将恐惧的事情具体化：写下来，评估它实际发生的概率，以及你的应对资源。' },
      { riskDescription: '对未来的不确定感正在消耗心理能量。', advice: '区分"事实"和"脑海中放大的想象"，把注意力拉回到此刻安全的环境中。' },
      { riskDescription: '持续恐惧可能演变为广泛性焦虑。', advice: '如果恐惧已经影响日常功能超过两周，建议寻求专业心理咨询。' },
    ],
  },
  '期待': {
    analysis: { primaryEmotion: '期待向往', emotionIntensity: [65, 80], riskLevel: '低风险', emotionNature: '正面情绪' },
    suggestions: [
      { riskDescription: '期待感是行为动力的重要来源，健康积极。', advice: '将大目标拆解为可执行的小步骤，在等待中保持参与感，延长期待的幸福感。' },
      { riskDescription: '正面期待情绪有助于提升日常幸福感。', advice: '可以和朋友分享你的期待，共同憧憬会让这份情绪更加鲜活。' },
    ],
  },
}

// ==================== 情绪内容文案 ====================

export const MOOD_CONTENTS: Record<string, string[]> = {
  '开心': ['今天天气很好，去公园散了步，心情不错。', '收到了一个意想不到的好消息，开心！', '给自己做了一顿丰盛的晚餐，很治愈。', '和朋友聊了会天，心情好了很多。', '晚上睡得不错，醒来精力充沛。', '今天感觉状态不错，完成了很多事情。'],
  '焦虑': ['下周三有个重要汇报，从早上就开始紧张。', '总觉得心里堵得慌，但又说不上为什么。', '最近几天都是靠咖啡撑着，心跳一直很快。', '反复检查了很多遍，还是觉得事情没做完。', '一想到明天的会议就睡不着。'],
  '平静': ['今天什么事也没发生，平平淡淡的。', '做了一次冥想，心情平静了很多。', '听了一期很有启发的播客，对很多事情有了新看法。', '下午在窗边晒了会太阳，很惬意。', '刚读完一本书，受到很多启发。'],
  '疲惫': ['今天加班到很晚，感觉好累。', '连开了三个会，脑子已经转不动了。', '感觉最近没什么动力，做什么都提不起劲。', '好像有点感冒，身体不太舒服。', '连续好几天没睡好，白天一直打哈欠。'],
  '悲伤': ['今天想起了很久以前的事情，有些难过。', '和一个重要的朋友吵架了，心里很难受。', '参加了一场告别聚会，回来的路上心情很复杂。', '看了一部关于分离的电影，哭了好一阵。', '翻到旧的相册，有些人和事都变了。'],
  '愤怒': ['遇到一个难缠的问题，搞了好久才解决，期间想砸键盘。', '被人插队了，明明已经等了好久。', '辛辛苦苦做的方案被一句话否定了，很气。', '约好了时间结果对方迟到半小时，一点解释都没有。', '发现有人在背后说我坏话，心里很不舒服。'],
  '恐惧': ['走夜路回家的时候总觉得后面有人跟着。', '害怕体检报告出来会有什么不好的结果。', '最近天气异常，总是担心会发生什么事。', '鼓起勇气想要表白，但到了跟前还是退缩了。', '对未来感到很迷茫，不知道这条路对不对。'],
  '期待': ['下个月打算去大理旅行，已经订好了机票和民宿！', '投了一个很中意的岗位，收到了面试通知。', '这个周末终于可以回家看看爸妈了。', '报了一个感兴趣的兴趣班，下周开始上课。', '快递显示想要的东西已经到楼下了。'],
}

// ==================== 触发因素 ====================

export const MOOD_TRIGGERS: Record<string, string[]> = {
  '开心': ['好消息', '休闲娱乐', '与人交流', '运动锻炼', '自我照顾', '享受美食'],
  '焦虑': ['工作压力', '学业考试', '财务担忧', '人际关系', '未知的未来'],
  '平静': ['日常规律生活', '冥想练习', '阅读', '晒太阳', '休闲放松'],
  '疲惫': ['长期加班', '睡眠不好', '健康问题', '过度劳累', '工作压力'],
  '悲伤': ['人际关系', '失去或离别', '怀旧情绪', '家庭问题', '孤独感'],
  '愤怒': ['不公平对待', '被人冒犯', '工作挫折', '失信于人', '被误解'],
  '恐惧': ['安全担忧', '健康问题', '未知的恐惧', '人际关系', '人生方向'],
  '期待': ['即将到来的旅行', '好消息', '家庭团聚', '学习新技能', '期待已久的物品'],
}

// ==================== 睡眠和压力（与评分负相关） ====================

export const sleepPressure = (score: number) => ({
  sleepDuration: +(score >= 7 ? 7 + Math.random() * 3 : score >= 4 ? 5 + Math.random() * 3 : 3 + Math.random() * 3).toFixed(1),
  pressureLevel: score >= 7 ? Math.floor(Math.random() * 30) + 5 : score >= 4 ? Math.floor(Math.random() * 40) + 30 : Math.floor(Math.random() * 35) + 55,
})
