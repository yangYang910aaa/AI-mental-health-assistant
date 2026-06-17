# mental-health — AI 心理健康助手

Vue 3 + TypeScript + Vite 全栈项目。后端已搭建（Fastify + Prisma 7 + MySQL），认证（登录/注册）已对接真实数据库，其余 API 仍由 vite.config.ts mock 接管，逐步迁移中。

---

## 技术栈

### 前端

| 类别 | 选型 | 版本 |
|------|------|------|
| 框架 | Vue 3（`<script setup lang="ts">` SFC） | ^3.5 |
| 语言 | TypeScript | ~6.0 |
| 构建 | Vite | ^8.0 |
| 包管理 | pnpm | 10.33 |
| UI 库 | Element Plus | ^2.14 |
| 状态管理 | Pinia（setup function 风格） | ^3.0 |
| 路由 | Vue Router（`createWebHistory`） | 4.6 |
| CSS | SCSS（`lang="scss" scoped`） | — |
| 图标 | `@element-plus/icons-vue`（全局注册） | ^2.3 |
| 富文本 | wangEditor v5（`@wangeditor/editor-for-vue`） | ^5.1 |
| 请求 | Axios | ^1.17 |

### 后端

| 类别 | 选型 | 版本 |
|------|------|------|
| 运行时 | Node.js | v24.16 |
| 框架 | Fastify 5（原生 TypeScript，零 @types/* 依赖） | ^5.8 |
| ORM | Prisma 7 + `@prisma/adapter-mariadb` | ^7.8 |
| 数据库 | MySQL（通过 mariadb 驱动连接） | — |
| 认证 | JWT（`jsonwebtoken`）+ bcryptjs 密码加密 | — |
| 校验 | Fastify 内置 JSON Schema | — |

## 常用命令

```bash
# 前端
pnpm dev              # 启动前端（http://localhost:5173）
pnpm build            # 类型检查 + 构建

# 后端（先 cd server）
pnpm dev              # 启动后端（http://localhost:3000）
pnpm db:migrate       # Prisma 数据库迁移
pnpm db:seed          # 填充种子数据
pnpm db:studio        # Prisma 可视化管理

# 一键启动前后端
pnpm dev:all          # concurrently 同时跑前端 + 后端
```

---

## 目录结构与文件职责

```
server/                                # 后端（Fastify + Prisma 7 + MySQL）
├── src/
│   ├── index.ts                       # Fastify 入口，注册插件/路由，监听 :3000
│   ├── db.ts                          # Prisma 7 客户端（mariadb 适配器 + dotenv）
│   ├── routes/
│   │   ├── auth.ts                    # POST /api/auth/login + register + GET /me
│   │   ├── knowledge.ts               # 知识文章 CRUD + /suggestions 标题联想
│   │   ├── mood.ts                    # 用户心情记录 CRUD（POST + GET 列表/详情 + DELETE）
│   │   ├── home.ts                    # 用户首页聚合（情绪统计 + 趋势 + 最近对话）
│   │   └── file.ts                    # POST /api/file/upload（multipart + UUID 存储）
│   ├── middleware/
│   │   └── jwtAuth.ts                 # JWT 签发 signToken() + 必须登录 requireAuth
│   └── utils/
│       ├── format.ts                  # formatDateTime() —— Date → "YYYY-MM-DD HH:mm:ss"
│       └── validate.ts                # parseId() —— 路径参数正整数校验（失败自动回 400）
├── prisma/
│   ├── schema.prisma                  # 数据模型：User/MoodRecord/ChatSession/ChatMessage/Article
│   ├── seed.ts                        # 种子：2 用户 + 5 文章 + 5 心情 + 1 会话(6 条消息)
│   └── migrations/                    # Prisma 迁移历史
├── scripts/
│   ├── kill-port.js                   # predev 钩子，释放 3000 端口残留
│   ├── seed-moods.ts                  # 单独填充心情记录（42 条，7 天均匀分布）
│   └── seed-articles.ts               # 单独填充文章（+20 篇）
├── prisma.config.ts                   # Prisma 7 连接配置（datasource.url）
├── .env                               # DATABASE_URL + JWT_SECRET（不入 git）
└── package.json                       # 独立依赖（fastify/prisma/bcryptjs/jsonwebtoken）

src/
├── main.ts                          # 入口：createPinia + ElementPlus + Router + 全局图标注册
├── App.vue                          # 根组件，仅 <router-view>
├── style.scss                       # 全局 CSS reset + Element Plus 覆盖
├── vite-env.d.ts                    # Vite 类型 + *.vue 模块声明 + wangEditor 类型补丁
│
├── types/
│   └── router.d.ts                  # 扩展 RouteMeta：title、icon
│
├── utils/
│   └── request.ts                   # Axios 封装（核心基础设施）
│       ├── 单泛型 API：request.get<T>() / post<T>() 只需一个泛型
│       ├── HTTP 状态码驱动：后端直接使用 HTTP 200/401/403/500 等
│       ├── 401 → 清 token + replace 跳登录（防抖锁）
│       ├── 403 → 弹提示，不跳转
│       └── BusinessError 类：携带 code 字段
│
├── layouts/                         # 布局壳子（组装导航 + 内容区，路由直接引用）
│   ├── adminLayout.vue              # 管理端：侧边栏 + 顶栏 + <router-view>
│   ├── userLayout.vue               # 用户端：顶栏 + <router-view>
│   └── authLayout.vue               # 认证页：渐变背景 + 装饰浮动圆 + 居中卡片
│
├── api/                             # 按模块拆分，每个文件一个业务域 + 共享常量
│   ├── auth.ts                      # 登录/注册/退出 + UserInfo 类型
│   ├── knowledge.ts                 # 文章 CRUD + 分类/标签常量
│   ├── consultations.ts             # 咨询记录 CRUD + Message 类型
│   ├── emotional.ts                 # 情绪日志 CRUD + 共享常量（标签、颜色、工具函数）
│   ├── dashboard.ts                 # 数据分析：KPI + 趋势 + 分布
│   ├── file.ts                      # 文件上传
│   └── user.ts                      # 用户端 API（首页、聊天、心情记录）
│
├── stores/
│   ├── admin.ts                     # 侧边栏折叠状态
│   └── user.ts                      # 用户信息、登录状态、localStorage 持久化
│
├── router/
│   └── index.ts                     # 路由配置（命名路由 + 懒加载 + ROUTE_NAMES 常量）
│
├── components/
│   ├── admin-page/
│   │   ├── sideBar.vue              # 左侧菜单（按 ROUTE_NAMES 定位路由）
│   │   ├── navBar.vue               # 顶栏（折叠 + 用户头像下拉）
│   │   ├── pageHead.vue             # 页面标题栏（title + 按钮插槽）
│   │   └── tableSearch.vue          # 通用搜索表单（formItem 配置驱动）
│   ├── user-page/
│   │   └── userNav.vue              # 用户端顶栏导航（Logo + 链接 + 用户菜单）
│   ├── dialog/
│   │   ├── articleDialog.vue        # 文章新增/编辑弹窗（共用，含 wangEditor）
│   │   ├── consultationDialog.vue   # 咨询详情弹窗（温暖治愈风聊天气泡）
│   │   └── emotionalDialog.vue      # 情绪详情弹窗（AI 分析 + 风险描述 + 专业建议）
│
└── views/
    ├── admin-page/
    │   ├── dashboard.vue            # 数据分析（6 KPI 卡片 + 5 ECharts 图表）✅ 已完成
    │   ├── knowledge.vue            # 知识文章（列表 + 搜索 + CRUD）✅ 已完成
    │   ├── consultations.vue        # 咨询记录（列表 + 分页 + 详情 + 删除）✅ 已完成
    │   └── emotional.vue            # 情绪日志（列表 + 搜索 + 详情 + 删除）✅ 已完成
    ├── user-page/
    │   ├── userHome.vue             # 个人首页（统计卡片 + 趋势 + 最近对话）✅ 已完成
    │   ├── userChat.vue             # AI 对话（会话列表 + 聊天气泡 + mock 回复）✅ 已完成
    │   ├── userMood.vue             # 心情记录（表单 + 历史列表）✅ 已完成
    │   ├── userArticles.vue         # 健康知识列表（卡片网格 + 搜索筛选）✅ 已完成
    │   ├── userArticleDetail.vue    # 文章详情（富文本渲染）✅ 已完成
    │   └── userProfile.vue          # 个人中心（占位）⚠️ 占位
    └── login/
        ├── login.vue                # 登录页（完整：校验 + API + 角色分流跳转）
        └── register.vue             # 注册页（完整：表单校验 + API）
```

---

## 关键架构决策

### 1. HTTP 错误处理：单通道（HTTP 状态码）

**后端直接使用 HTTP 状态码表达错误**，不在 HTTP 200 的 body 里塞 code=401/403。

```
HTTP 200 → 成功分支 → body.code 一定为 200
HTTP 401/403/500… → 失败分支 → 唯一错误入口
```

`request.ts` 的响应拦截器只保留一条 401 路径（失败分支），不再同时维护两套。

### 2. API 路径规范

```
/api/auth/login               认证
/api/auth/register            注册
/api/knowledge/articles       知识文章 CRUD
/api/consultations/records    咨询记录 CRUD
/api/emotional/records        情绪日志 CRUD
/api/dashboard                数据分析
/api/file/upload              通用文件上传
/api/user/home                用户端首页数据
/api/user/chat/sessions       用户聊天会话
/api/user/chat/send           用户发送消息
/api/user/mood                用户心情记录
```

每个模块一个前缀（`/knowledge/`、`/consultations/`、`/user/`），RESTful 风格：
- `GET    /knowledge/articles`        列表
- `POST   /knowledge/articles`        创建
- `PUT    /knowledge/articles/:id`    更新
- `DELETE /knowledge/articles/:id`    删除
- `GET    /knowledge/articles/:id`    详情（新增）
- `GET    /consultations/records`     列表（分页）
- `GET    /consultations/records/:id` 详情（含 messages）
- `DELETE /consultations/records/:id` 删除
- `GET    /emotional/records`         情绪日志列表
- `GET    /emotional/records/:id`     情绪日志详情
- `DELETE /emotional/records/:id`     删除情绪日志

### 3. 路由命名与导航守卫

三套路由：`/back`（管理后台）、`/user`（用户端）、`/auth`（认证）。根路径 `/` redirect 到 `/auth/login`。

```ts
export const ROUTE_NAMES = {
  backLayout, dashboard, knowledge, consultations, emotional,       // 管理端
  userLayout, userHome, userChat, userMood, userArticles,           // 用户端
  userArticleDetail, userProfile,
  login, register,                                                  // 认证
} as const
router.push({ name: ROUTE_NAMES.knowledge })  // ✅ 用常量，不硬编码
```

导航守卫逻辑（`router.beforeEach`）：
- `/back/*` → 需 token + admin 角色，缺一则跳 `/auth/login?redirect=原路径`
- `/user/*` → 需 token，缺则跳登录
- `/auth/*` → 已有 token 则按角色分流：admin → `/back/knowledge`，普通用户 → `/user/home`

### 4. 共享常量与工具函数

多页面共用的常量、映射表、工具函数**统一放在对应 `api/` 模块中导出**，不在 `.vue` 文件里重复定义。

当前 `api/emotional.ts` 导出的共享资源：
```ts
MOOD_LABELS        // 情绪标签数组
MOOD_LABEL_COLORS  // 情绪标签 → 颜色映射（全项目唯一来源）
moodScoreColor()   // 情绪评分 → 颜色
SCORE_MARKS        // 滑条 emoji 标记
TRIGGER_OPTIONS    // 触发因素选项
```

所有引用情绪颜色的文件（userHome、userMood、dashboard、emotional、emotionalDialog）均从 `api/emotional.ts` import，修改颜色只需改一处。

### 5. localStorage Key 约定

| Key | 写方 | 读方 |
|-----|------|------|
| `token` | login.vue | request.ts 请求拦截器 |
| `userInfo` | user store setUser() | user store 初始化恢复 |

### 6. 富文本（wangEditor）

- 包：`@wangeditor/editor-for-vue@5.x`（Vue 3 专版）
- 封面和编辑器插图在 mock 模式下都用 FileReader 直接转 data URL 存储
- 后端就绪后替换为 `uploadFile()` → POST `/api/file/upload`
- 编辑器 `v-if="dialogVisible"` 保证每次打开都全新创建

### 7. 图片上传（mock 阶段）

当前使用 FileReader 将图片转 base64 data URL：
- 封面预览 → `coverUrl`（data URL）
- 存储值 → `formData.coverImage`（data URL）
- 编辑器插图 → 同逻辑

后端就绪后，在 `articleDialog.vue` 的两处搜索 `FileReader` 替换为 `uploadFile()` 调用。

---

## 已完成模块：知识文章

### 列表页 `knowledge.vue`

| 功能 | 说明 |
|------|------|
| 搜索 | title（回车搜索）、category（选中即搜）、status（选中即搜） |
| 表格 | 封面（72×48 缩略图）、标题、分类、作者、状态标签、阅读量、发布时间 |
| 分页 | 10/20/50 条，切换 pageSize 回第 1 页 |
| 排序 | 阅读量、发布时间可排序 |
| 新增 | 打开 articleDialog（表单为空） |
| 编辑 | 打开 articleDialog（表单回填） |
| 发布/下线 | 切换 published/offline/draft |
| 删除 | 确认弹窗 → 删除 → 刷新列表 |

### 编辑弹窗 `articleDialog.vue`

| 功能 | 说明 |
|------|------|
| 标题 | 最多 200 字，显示字数 |
| 分类 | 下拉选择（CATEGORIES 常量） |
| 摘要 | textarea，可选，最多 1000 字 |
| 标签 | 多选 + 可创建（TAGS 常量） |
| 封面 | 上传 + 预览 + 移除 |
| 内容 | wangEditor 富文本 + 字数统计 |
| 模式 | `formData.id` 为空 → 新增，有值 → 编辑 |
| 预览 | 点击"预览效果"渲染 `v-html` |

### API `api/knowledge.ts`

```ts
fetchArticles(params)           // GET    /knowledge/articles
createArticle(params)           // POST   /knowledge/articles
updateArticle(id, params)       // PUT    /knowledge/articles/:id
deleteArticle(id)               // DELETE /knowledge/articles/:id
```

### Mock `vite.config.ts`

一个 handler 处理 `/api/knowledge/articles`，按 method 分发 GET/POST/PUT/DELETE，内存数组存储，dev server 重启后重置。

---

## 已完成模块：咨询记录

### 列表页 `consultations.vue`

| 功能 | 说明 |
|------|------|
| 表格 | 对话用户、对话记录（两行：AI名称+时间 / 内容预览）、消息数量、开始时间 |
| 分页 | 10/20/50 条，切换 pageSize 回第 1 页 |
| 详情 | 打开 consultationDialog（按钮 loading 防重复点击） |
| 删除 | 确认弹窗 → 删除 → 刷新（末页最后一条自动回上一页） |

### 详情弹窗 `consultationDialog.vue`

| 功能 | 说明 |
|------|------|
| 会话概要 | 用户头像（首字）+ 昵称 + 开始时间 + 消息数 |
| 对话消息 | 聊天气泡，AI 米白底左对齐 / 用户浅绿底右对齐 |
| 关闭 | 右上角 X + 底部关闭按钮 |
| 风格 | 温暖治愈系暖色调 |

### API `api/consultations.ts`

```ts
// 类型
Consultation { id, userId, userNickName, aiName, firstMessage, lastMessageTime, messageCount, startedAt, messages?: Message[] }
Message { id, sender: 'user' | 'assistant', content, time }
ConsultationListParams { page, pageSize }
ConsultationListResult { list: Consultation[], total: number }

// 接口
getConsultations(params)          // GET    /consultations/records
getConsultationDetail(id)         // GET    /consultations/records/:id
deleteConsultation(id)            // DELETE /consultations/records/:id
```

### Mock

一个 handler 处理 `/api/consultations/records`，按 method + URL 末段分发 GET 列表/GET 详情/DELETE。`generateMockMessages(id, msgCount)` 按记录动态生成 4~12 条对话，`messageCount` 与生成数量一致。

---

## 已完成模块：情绪日志

### 列表页 `emotional.vue`

| 功能 | 说明 |
|------|------|
| 搜索 | userId（回车搜索）、moodScoreRange（选中即搜）、moodLabel（选中即搜） |
| 表格 | 用户ID、用户名、情绪评分（SVG 圆环红/橙/绿）、情绪标签（8色 dark tag）、记录内容、记录时间 |
| 分页 | 10/20/50 条，切换 pageSize 回第 1 页 |
| 详情 | 打开 emotionalDialog（按钮 loading 防重复点击，独立 API 请求） |
| 删除 | 确认弹窗 → 删除 → 刷新（末页最后一条自动回上一页） |

### 详情弹窗 `emotionalDialog.vue`

| 区块 | 内容 |
|------|------|
| 用户信息 | 用户ID、用户名、记录时间 |
| 情绪状态 | 10 星评分、情绪标签（彩色 tag）、夜间睡眠时长（/12h）、压力水平（进度条 绿/橙/红） |
| 日志内容 | 情绪触发因素、记录内容 |
| AI 分析结果 | 主要情绪（tag）、情绪强度（进度条随情绪色）、风险等级（绿/橙/红 tag）、情绪性质（正面绿/中性灰/负面红 tag） |
| AI 建议 | 风险描述卡片 + 专业建议卡片（紫调渐变背景） |

### API `api/emotional.ts`

```ts
// 类型
EmotionalListItem { id, userId, userName, moodScore, moodLabel, content, createdAt }       // 列表轻量
Emotional extends EmotionalListItem { sleepDuration, pressureLevel, moodTrigger, aiAnalysis, aiSuggestion }  // 详情完整
AiAnalysis { primaryEmotion, emotionIntensity, riskLevel, emotionNature }
aiSuggestion { riskDescription, advice }

// 接口
getEmotionalList(params)          // GET    /emotional/records（列表，返回轻量字段）
getEmotionalDetail(id)            // GET    /emotional/records/:id（详情，返回完整字段）
deleteEmotional(id)               // DELETE /emotional/records/:id
```

### 数据模型设计要点

- **轻量列表 / 重量详情分离**：列表只返回 7 个字段，点详情才单独请求完整数据，避免列表一次加载大量 AI 分析文案
- **情绪评分与标签语义关联**：开心/期待→正面高分(7-10)，平静→中性中分(5-7)，焦虑/疲惫/悲伤/愤怒/恐惧→负面低分(1-4)
- **AI 分析字段内聚**：`aiAnalysis` 一个对象包含 4 个子项（主要情绪、情绪强度、风险等级、情绪性质），`aiSuggestion` 拆为风险描述 + 专业建议

### Mock

一个 handler 处理 `/api/emotional/records`，按 method + URL 末段分发 GET 列表/GET 详情/DELETE。列表响应剥离 `sleepDuration/pressureLevel/moodTrigger/aiAnalysis/aiSuggestion` 五个重字段。58 条数据覆盖 8 种情绪标签，每种含对应文案。

---

## 已完成模块：数据分析

### 仪表盘 `dashboard.vue`

| 区域 | 内容 |
|------|------|
| KPI 卡片 | 总用户数、活跃用户（+活跃率进度条）、情绪日志（今日新增）、咨询会话（今日新增）、平均情绪（x/10 + 进度条 + 状态文字）、高风险（占比 + 红色预警底色） |
| 情绪趋势 | 折线图 + 渐变填充 + 三色背景带（良好/一般/关注）+ 均值虚线 + 最新值大头钉，HTML 图例标注，独立时间切换（7d/30d/90d） |
| 情绪分布 | 环形图 + 环形中心总计数 + 外侧标签 + 百分比 tooltip |
| 咨询趋势 | 渐变柱状图 + 均值虚线 + 最新值大头钉，独立时间切换 |
| 风险分布 | 环形图 + 环形中心高风险数 + 外侧标签 + 百分比 tooltip |
| 活跃度趋势 | 折线图 + 渐变填充 + 均值虚线 + 最新值大头钉，独立时间切换 |

### 技术要点

- **ECharts 按需引入**：`main.ts` 注册 CanvasRenderer + LineChart/BarChart/PieChart + 9 个交互组件（Title、Tooltip、Legend、Grid、Toolbox、Graphic、MarkLine、MarkArea、MarkPoint）
- **三个趋势图独立切换**：每个图维护自己的 `range` 状态和趋势数据，切换一个不影响另外两个
- **HTML 图例**：情绪趋势图的"良好/一般/关注"图例用 HTML 实现，避免 ECharts 内部 label 和折线重叠
- **KPI 与 mock 数据联动**：所有 KPI 和分布图数据来源于 `mockEmotionals` / `mockConsultations`，趋势图以真实均值为基线加随机波动

### API `api/dashboard.ts`

```ts
DashboardData { totalUsers, activeUsers, emotionalLogs, consultations, avgMoodScore, highRiskCount, moodTrend, emotionDistribution, riskDistribution, consultationTrend, userActivityTrend }
getDashboardData(range: '7d' | '30d' | '90d')  // GET /dashboard?range=30d
```

### Mock

基于已有 `mockEmotionals` / `mockConsultations` 实时计算 KPI 和分布，趋势按 range 生成不同粒度（7d/30d 日粒度，90d 周聚合）。

---

## 已完成模块：用户端

### 个人首页 `userHome.vue`

| 区域 | 内容 |
|------|------|
| 欢迎区 | 动态问候语（早上好/下午好/晚上好）+ 日期 + AI 每日寄语 |
| 统计卡片（4张） | 今日心情（评分+标签）、本周记录次数、本周对话消息数、本周平均情绪（自动变色：良好/需关注/建议求助） |
| 情绪趋势图 | 7 天迷你折线图 + 良好线标记 + 渐变填充 |
| 最近对话 | 3 条对话预览卡片，点击跳 AI 对话页 |

每张统计卡片可点击跳对应页面，今日未记录时显示"未记录"占位。

### AI 对话 `userChat.vue`

| 功能 | 说明 |
|------|------|
| 会话列表 | 左侧可折叠面板，展示历史对话，点击切换 |
| 聊天气泡 | 用户绿色靠右 / AI 米白靠左，带头像和时间 |
| 消息输入 | 底部 textarea + 发送按钮，回车发送 |
| 新建对话 | 顶部按钮 + 右侧自动聚焦输入框 |
| Mock 回复 | AI 延迟 0.6-1.4s 随机回复预设文案，有打字动画（三个跳动圆点） |
| 乐观更新 | 用户消息立即显示，AI 回复到达后替换临时 ID |

⚠️ 当前 mock 回复为随机预设文案，**与用户消息内容无关**。后续需替换为关键词匹配回复或接真实 AI API。

### 心情记录 `userMood.vue`

| 区域 | 内容 |
|------|------|
| 记录表单 | 情绪评分（1-10 slider + emoji 标记 + 数字显示）、情绪标签（8 色 chip 选择）、触发因素（下拉+可输入）、睡眠时长（数字输入）、压力水平（0-100 slider + 数字显示）、记录内容（textarea） |
| 历史列表 | 当前用户的历史记录，每条显示评分圆点 + 标签 + 内容 + 时间，分页展示 |

表单标签已加深（`#374151`），表单项间距加大（24px）。

### 健康知识 `userArticles.vue` + `userArticleDetail.vue`

| 功能 | 说明 |
|------|------|
| 文章列表 | 3 列响应式卡片网格，封面 + 分类标签 + 标题 + 摘要 + 元信息 |
| 搜索筛选 | 标题关键词搜索 + 分类下拉筛选 |
| 文章详情 | 独立页面，富文本渲染 + 标签 + 返回按钮，只读无 CRUD |
| 分页 | 12 条/页 |

复用 `api/knowledge.ts` 的 `fetchArticles` 和 `fetchArticleDetail`，仅查 `status: 'published'`。

### 个人中心 `userProfile.vue`

占位页面，后续接入共享的账户设置组件。

### API `api/user.ts`

```ts
// 类型
HomeData { dailyQuote, stats: HomeStats, recentMoods, recentChats }
HomeStats { todayMoodScore, todayMoodLabel, weekMoodCount, weekChatCount, weekAvgScore }
ChatSession { id, title, lastMessage, lastTime, messageCount }
ChatMessage { id, sender, content, time }
SendMessageResult { userMessage, aiReply }
CreateMoodParams { userId, userName, moodScore, moodLabel, content, ... }

// 接口
getUserHome(userId)                   // GET /user/home
getChatSessions(userId)              // GET /user/chat/sessions
getChatMessages(sessionId)           // GET /user/chat/sessions/:id
sendMessage(sessionId, content, uid) // POST /user/chat/send
createMood(params)                   // POST /user/mood
getUserMoods(userId, page, size)     // GET /user/mood
```

### Mock

用户端首页 mock 会为当前请求用户自动补最近 4 天的情绪记录，保证"本周统计"卡片不空。聊天 mock 在内存中维护会话和消息，支持新建会话、发送消息、AI 延迟回复，dev server 重启后重置。

---

## 当前接口清单

| 接口 | 方法 | 状态 |
|------|------|------|
| `/api/auth/login` | POST | ✅ 真实后端（MySQL 查用户 + bcrypt + JWT） |
| `/api/auth/register` | POST | ✅ 真实后端（MySQL 写入 + 用户名去重） |
| `/api/auth/me` | GET | ✅ 真实后端（JWT 验证 + 返回用户信息） |
| `/api/knowledge/articles` | GET | ✅ 真实后端（分页 + title/category/status 筛选） |
| `/api/knowledge/articles` | POST | ✅ 真实后端（admin 鉴权 + JSON Schema 校验） |
| `/api/knowledge/articles/suggestions` | GET | ✅ 真实后端（title 模糊联想，最多 10 条） |
| `/api/knowledge/articles/:id` | GET | ✅ 真实后端（ID 正整数校验） |
| `/api/knowledge/articles/:id` | PUT | ✅ 真实后端（admin 鉴权 + 部分更新） |
| `/api/knowledge/articles/:id` | DELETE | ✅ 真实后端（admin 鉴权 + ID 校验） |
| `/api/file/upload` | POST | ✅ 真实后端（multipart + UUID 存储） |
| `/api/consultations/records` | GET | ⚠️ mock |
| `/api/consultations/records/:id` | GET | ⚠️ mock |
| `/api/consultations/records/:id` | DELETE | ⚠️ mock |
| `/api/emotional/records` | GET | ⚠️ mock |
| `/api/emotional/records/:id` | GET | ⚠️ mock |
| `/api/emotional/records/:id` | DELETE | ⚠️ mock |
| `/api/dashboard` | GET | ⚠️ mock |
| `/api/user/home` | GET | ✅ 真实后端（聚合 MoodRecord + ChatSession） |
| `/api/user/chat/sessions` | GET | ⚠️ mock |
| `/api/user/chat/sessions/:id` | GET | ⚠️ mock |
| `/api/user/chat/send` | POST | ⚠️ mock（随机回复，与用户输入无关） |
| `/api/user/mood` | POST | ✅ 真实后端（JSON Schema 校验 + 创建记录） |
| `/api/user/mood` | GET | ✅ 真实后端（分页 + userId 筛选 + moodLabel 筛选） |
| `/api/user/mood/:id` | GET | ✅ 真实后端（返回全量字段含睡眠/压力/触发因素） |
| `/api/user/mood/:id` | DELETE | ✅ 真实后端（ID 正整数校验 + 存在性检查） |

> ✅ = 真实后端  ⚠️ = 仍在 vite.config.ts mock 插件中

---

## 接下来要做的事

### 🔴 第一优先级：逐步迁移 mock → 真实后端

当前 `/api/auth/*`、`/api/knowledge/*`、`/api/file/*`、`/api/user/mood/*`、`/api/user/home` 已接入真实数据库。其余接口仍在 `vite.config.ts` mock 中。
按顺序逐个迁移到 `server/src/routes/`：

| 顺序 | 模块 | 涉及表 | 需新增路由文件 | 状态 |
|------|------|--------|---------------|------|
| 1 | 知识文章 CRUD | Article | `server/src/routes/knowledge.ts` | ✅ 已完成 |
| 2 | 心情记录 | MoodRecord | `server/src/routes/mood.ts` | ✅ 已完成 |
| 3 | 用户首页 | User/MoodRecord/ChatSession | `server/src/routes/home.ts` | ✅ 已完成 |
| 4 | 聊天会话 & 消息 | ChatSession/ChatMessage | `server/src/routes/chat.ts` | ❌ |
| 5 | 咨询记录（管理端） | ChatSession/ChatMessage | `server/src/routes/consultations.ts` | ❌ |
| 6 | 情绪日志（管理端） | MoodRecord | `server/src/routes/emotional.ts` | ❌ |
| 7 | 仪表盘数据 | 聚合查询 | `server/src/routes/dashboard.ts` | ❌ |
| 8 | 文件上传 | 文件存储 | `server/src/routes/file.ts` | ✅ 已完成 |

每迁移一个模块，就删除 `vite.config.ts` 中对应的 mock handler。
全部迁移完成后，删除整个 mock 插件。

### 🔴 第二优先级：AI 对话接入 Claude API

`userChat.vue` 当前 mock 回复为随机预设文案，与用户输入无关。
需在 `server/src/routes/chat.ts` 中接入 Claude API：

- 安装 `@anthropic-ai/sdk`
- 编写 System Prompt（定义 AI 为"宁渡"心理健康助手）
- 支持流式 SSE 响应（打字机效果）
- 方案演进：直调 LLM → 注入知识库文章 → 接入工具调用（查情绪历史等）

详见 CLAUDE.md 末尾"AI 对话方案"章节。

### 🟡 第三优先级：功能完善

| 模块 | 内容 |
|------|------|
| 个人中心 | `userProfile.vue` 完整实现（编辑资料、修改密码） |
| AI 情绪分析 | 心情记录提交后调用 AI 生成 `aiAnalysis` / `aiSuggestion` |
| 代码整理 | 提取 `formatTime` 到 `utils/format.ts` 共享 |
| 代码整理 | 提取重复 CSS（table 样式、卡片）为公共样式 |

---

## 已修复的问题

- **登录 401 跳页**：`request.ts` 中 401 处理排除 `/auth/login` 路径，密码错误不再触发跳转
- **退出登录 dropdown 压扁**：`userNav.vue` 加 `:teleported="false"` + `transition: none`
- **`@types/express` 版本冲突**：Express → Fastify 后彻底消除，零 `@types/*` 依赖
- **心情记录删除**：`userMood.vue` 新增删除按钮，末页边界处理
- **mock 文章数据缺失**：补全 `coverImage` / `content` / `tags` 三个字段

---

## 代码规范

- 组件命名：PascalCase（如 `sideBar.vue`、`pageHead.vue`）
- 路由页面放 `src/views/`，可复用组件放 `src/components/`，布局壳子放 `src/layouts/`
- **共享常量/工具函数**放对应 `api/` 模块中导出，不在 `.vue` 文件里重复定义
- **静态常量不放 Pinia store**，store 只管理响应式状态（userInfo、isCollapsed 等）
- import 分组顺序：vue → 第三方 → 内部
- SCSS 嵌套 ≤ 3 层，`:deep()` 穿透 Element Plus 内部样式
- `!important` 仅用于覆盖第三方 UI 库默认样式
- Pinia store 统一 setup function 风格
- Props：简单类型用泛型 `defineProps<T>()`，复杂类型用运行时声明 + `PropType`
- Emits：`defineEmits(['eventName'])`

## 全局样式约定

- `html` 设置 `overflow-y: scroll`，始终显示滚动条，防止浮层触发滚动条切换导致布局抖动
- Element Plus label 颜色默认偏淡（`#909399`），表单页按需用 `:deep(.el-form-item__label)` 加深

## 路径别名

- `@` → `./src`，`vite.config.ts` + `tsconfig.app.json` 双端配置

---

## AI 对话方案

### 整体架构

```
浏览器 → Vue 前端 → server/src/routes/chat.ts → Claude API
                         ↓
                    Prisma → MySQL（会话/消息持久化）
```

### 方案一：直调 LLM（起步）

在 `server/src/routes/chat.ts` 中，`POST /api/user/chat/send` 接到消息后：

1. 从 MySQL 读取当前会话的历史消息
2. 拼装 System Prompt（定义 AI 为"宁渡"心理健康助手，温暖共情风格）
3. 调用 `@anthropic-ai/sdk`，流式 SSE 返回
4. 消息落库保存

**新增依赖**：`@anthropic-ai/sdk`
**前端改动**：无（API 路径不变，只是 mock → 真实 AI）

### 方案二：+ 知识库注入

在方案一的基础上，用关键词匹配将已有的知识文章片段注入 prompt：

```
用户消息 → 匹配相关文章标题/标签 → 拼入 System Prompt → LLM 生成
```

不上向量数据库，直接用 MySQL `LIKE` 或全文索引做关键词匹配。

### 方案三：+ Agent 工具调用

给 AI 配 Function Calling / Tool Use：

- `getMoodHistory(days)` → 查用户近期情绪趋势
- `searchKnowledge(query)` → 搜知识库
- `suggestExercise(type)` → 推荐呼吸法/正念练习

AI 能"看到"用户的历史情绪数据，给出个性化建议。

### 分步实施建议

1. 先完成所有 CRUD 接口迁移（mock → 真实后端），会话和消息能持久化
2. 再接 Claude API（方案一），保证基础对话流畅
3. 效果满意后按需升级到方案二/三

---

## Git 仓库

- Remote：`git@github.com:yangYang910aaa/AI-mental-health-assistant.git`
- 默认分支：`main`
