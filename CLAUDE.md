# mental-health — AI 心理健康助手

Vue 3 + TypeScript + Vite 管理后台前端项目。当前处于**前端先行**阶段，所有 API 通过 vite.config.ts mock 拦截，后端开发后移除 mock 插件即可对接。

---

## 技术栈

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

## 常用命令

```bash
pnpm dev          # 启动开发服务器（默认 http://localhost:5173）
pnpm build        # 类型检查 + 构建（vue-tsc -b && vite build）
pnpm preview      # 预览构建产物
pnpm add <pkg>    # 安装依赖
```

---

## 目录结构与文件职责

```
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
├── api/                             # 按模块拆分，每个文件一个业务域
│   ├── auth.ts                      # 登录/注册/退出 + UserInfo 类型
│   ├── knowledge.ts                 # 文章 CRUD + 分类/标签常量
│   ├── consultations.ts             # 咨询记录 CRUD + Message 类型
│   ├── emotional.ts                 # 情绪日志 CRUD + MoodLabel/AiAnalysis 类型
│   ├── dashboard.ts                 # 数据分析：KPI + 趋势 + 分布
│   └── file.ts                      # 文件上传
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
│   │   ├── backToLayout.vue         # 后台布局容器
│   │   ├── sideBar.vue              # 左侧菜单（按 ROUTE_NAMES 定位路由）
│   │   ├── navBar.vue               # 顶栏（折叠 + 用户头像下拉）
│   │   ├── pageHead.vue             # 页面标题栏（title + 按钮插槽）
│   │   └── tableSearch.vue          # 通用搜索表单（formItem 配置驱动）
│   ├── dialog/
│   │   ├── articleDialog.vue        # 文章新增/编辑弹窗（共用，含 wangEditor）
│   │   ├── consultationDialog.vue   # 咨询详情弹窗（温暖治愈风聊天气泡）
│   │   └── emotionalDialog.vue      # 情绪详情弹窗（AI 分析 + 风险描述 + 专业建议）
│   └── login/
│       └── authLayout.vue           # 登录/注册布局（渐变背景 + 装饰浮动圆）
│
└── views/
    ├── admin-page/
    │   ├── dashboard.vue            # 数据分析（6 KPI 卡片 + 5 ECharts 图表）✅ 已完成
    │   ├── knowledge.vue            # 知识文章（列表 + 搜索 + CRUD）✅ 已完成
    │   ├── consultations.vue        # 咨询记录（列表 + 分页 + 详情 + 删除）✅ 已完成
    │   └── emotional.vue            # 情绪日志（列表 + 搜索 + 详情 + 删除）✅ 已完成
    └── login/
        ├── login.vue                # 登录页（完整：校验 + API + 回首页）
        └── register.vue             # 注册页（占位）
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
/api/knowledge/articles       知识文章 CRUD
/api/consultations/records    咨询记录 CRUD
/api/file/upload              通用文件上传
```

每个模块一个前缀（`/knowledge/`、`/consultations/`），RESTful 风格：
- `GET    /knowledge/articles`        列表
- `POST   /knowledge/articles`        创建
- `PUT    /knowledge/articles/:id`    更新
- `DELETE /knowledge/articles/:id`    删除
- `GET    /consultations/records`     列表（分页）
- `GET    /consultations/records/:id` 详情（含 messages）
- `DELETE /consultations/records/:id` 删除

### 3. 路由命名

路径精简：`/back`（后台）`/auth`（认证），redirect 到 `/back/knowledge`。

```ts
export const ROUTE_NAMES = { backLayout, dashboard, knowledge, consultations, emotional, login, register } as const
router.push({ name: ROUTE_NAMES.knowledge })  // ✅ 用常量，不硬编码
```

### 4. localStorage Key 约定

| Key | 写方 | 读方 |
|-----|------|------|
| `token` | login.vue | request.ts 请求拦截器 |
| `userInfo` | user store setUser() | user store 初始化恢复 |

### 5. 富文本（wangEditor）

- 包：`@wangeditor/editor-for-vue@5.x`（Vue 3 专版）
- 封面和编辑器插图在 mock 模式下都用 FileReader 直接转 data URL 存储
- 后端就绪后替换为 `uploadFile()` → POST `/api/file/upload`
- 编辑器 `v-if="dialogVisible"` 保证每次打开都全新创建

### 6. 图片上传（mock 阶段）

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
Consultation { id, userId, userNickName, aiName, lastMessageContent, lastMessageTime, messageCount, startedAt, messages?: Message[] }
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

- **ECharts 按需引入**：`main.ts` 注册 CanvasRenderer + LineChart/BarChart/PieChart + 8 个交互组件（含 MarkLine/MarkArea/MarkPoint）
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

## 当前接口清单

| 接口 | 方法 | 状态 |
|------|------|------|
| `/api/auth/login` | POST | ✅ mock |
| `/api/auth/register` | POST | ⚠️ 定义了未用 |
| `/api/knowledge/articles` | GET | ✅ mock |
| `/api/knowledge/articles` | POST | ✅ mock |
| `/api/knowledge/articles/:id` | PUT | ✅ mock |
| `/api/knowledge/articles/:id` | DELETE | ✅ mock |
| `/api/consultations/records` | GET | ✅ mock |
| `/api/consultations/records/:id` | GET | ✅ mock |
| `/api/consultations/records/:id` | DELETE | ✅ mock |
| `/api/emotional/records` | GET | ✅ mock |
| `/api/emotional/records/:id` | GET | ✅ mock |
| `/api/emotional/records/:id` | DELETE | ✅ mock |
| `/api/dashboard` | GET | ✅ mock |
| `/api/file/upload` | POST | ⚠️ mock 返回随机图 |

---

## 待办事项

| 模块 | 内容 | 优先级 |
|------|------|--------|
| 导航守卫 | 按角色拦截 /back 和 /auth，登出逻辑 | 🔴 下一步 |
| 注册页 | register.vue 完整实现 | 🟢 |
| 角色分流 | admin→后台，user→普通用户端 | 🟢 |
| 后端对接 | 移除 mock 插件，接真实 API | 🔴 |

---

## 代码规范

- 组件命名：PascalCase（如 `sideBar.vue`、`pageHead.vue`）
- 新页面放 `src/views/`，复用组件放 `src/components/`
- import 分组顺序：vue → 第三方 → 内部
- SCSS 嵌套 ≤ 3 层，`:deep()` 穿透 Element Plus 内部样式
- `!important` 仅用于覆盖第三方 UI 库默认样式
- Pinia store 统一 setup function 风格
- Props：简单类型用泛型 `defineProps<T>()`，复杂类型用运行时声明 + `PropType`
- Emits：`defineEmits(['eventName'])`

## 路径别名

- `@` → `./src`，`vite.config.ts` + `tsconfig.app.json` 双端配置

## Git 仓库

- Remote：`git@github.com:yangYang910aaa/AI-mental-health-assistant.git`
- 默认分支：`main`
