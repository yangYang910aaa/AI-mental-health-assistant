# mental-health — AI 心理健康助手

Vue 3 + TypeScript + Vite 全栈项目。后端已搭建（Fastify + Prisma 7 + MySQL），所有 API 已从 mock 迁至真实数据库。

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
| 邮件 | nodemailer（SMTP，忘记密码发送验证码） | ^9.0 |

## 常用命令

```bash
# 前端
pnpm dev              # 启动前端（http://localhost:5173）
pnpm build            # vue-tsc -b + vite build 类型检查 + 构建
pnpm preview          # 预览生产构建

# 后端（先 cd server）
pnpm dev              # 启动后端（http://localhost:3000），predev 自动释放端口
pnpm build            # tsc 编译
pnpm start            # node dist/index.js 生产启动
pnpm db:migrate       # Prisma 数据库迁移
pnpm db:seed          # 填充种子数据
pnpm db:seed-moods    # 单独填充心情记录
pnpm db:seed-articles # 单独填充文章
pnpm db:studio        # Prisma 可视化管理

# 一键启动前后端
pnpm dev:all          # concurrently 同时跑前端 + 后端
pnpm dev:server       # 仅启动后端
```

---

## 目录结构与文件职责

```
server/                                # 后端（Fastify + Prisma 7 + MySQL）
├── src/
│   ├── index.ts                       # Fastify 入口：cors/multipart/static 插件 + 50MB bodyLimit + 全局错误处理（FST_ERR_VALIDATION 字段级详情映射 + 5xx 通用遮罩） + SIGINT/SIGTERM 优雅关闭 + 监听 :3000
│   ├── db.ts                          # Prisma 7 客户端（@prisma/adapter-mariadb 适配器 + dotenv）
│   ├── types/
│   │   └── fastify.d.ts               # 扩展 FastifyRequest（挂载 user: JwtPayload，requireAuth 后可用）
│   ├── routes/
│   │   ├── auth.ts                    # 登录/注册/验证 + 忘记密码/重置密码 + profile + password
│   │   ├── knowledge.ts               # 知识文章 CRUD + /suggestions 标题联想
│   │   ├── mood.ts                    # 用户心情记录 CRUD（POST + GET 列表/详情 + DELETE）
│   │   ├── emotional.ts               # 管理端情绪日志（列表/详情/删除，需 admin）
│   │   ├── home.ts                    # 用户首页聚合（情绪统计 + 趋势 + 最近对话）
│   │   ├── file.ts                    # POST /api/file/upload（multipart + UUID 存储）
│   │   ├── consultations.ts           # 管理端咨询记录（列表/详情/删除，需 admin，ChatSession + ChatMessage）
│   │   ├── chat.ts                    # AI 聊天（会话列表/消息/发送 SSE 流式/删除，需登录，对接 DeepSeek API，含 SSE 心跳 + 客户端断连检测 + buildUserContext 提取）
│   │   ├── memory.ts                  # 长期记忆管理（列表/删除单条/清空，需登录）
│   │   └── dashboard.ts               # 数据分析（KPI 聚合 + 趋势，需 admin，JS 端聚合避免 raw SQL 兼容性）
│   ├── middleware/
│   │   └── jwtAuth.ts                 # JWT 签发 signToken() + requireAuth（启动时检查 JWT_SECRET，缺失则抛错）
│   └── utils/
│       ├── format.ts                  # formatDateTime() —— Date → "YYYY-MM-DD HH:mm:ss"
│       ├── validate.ts                # parseId() —— 路径参数正整数校验（失败自动回 400）
│       └── email.ts                   # sendResetEmail() —— nodemailer（QQ SMTP SSL，超时 10s/10s/15s）
│   ├── ai/                            # AI 核心模块（client/context/safety/memory/prompts）
├── prisma/
│   ├── schema.prisma                  # User/MoodRecord/ChatSession(pinned)/ChatMessage(flagged,Cascade)/Memory/Article，含 @@index + updatedAt
│   ├── seed.ts                        # 种子：11 用户 + 15 文章 + 50 心情 + 2 会话
│   └── migrations/                    # Prisma 迁移历史
├── scripts/
│   ├── kill-port.js                   # predev 钩子，释放 3000 端口残留
│   ├── seed-data.ts                   # 心情记录种子共享数据（AI 分析/文案/触发因素）
│   ├── seed-moods.ts                  # 单独填充心情记录（每用户 7 天均匀分布）
│   └── seed-articles.ts               # 单独填充文章（+20 篇）
├── tsconfig.json                      # TS 编译配置（ES2022 / ESNext / strict:true / include: src）
├── prisma.config.ts                   # Prisma 7 连接配置（datasource.url）
├── dist/                              # tsc 编译输出
├── .env                               # DATABASE_URL + JWT_SECRET + SMTP_*（不入 git）
└── package.json                       # 独立依赖（fastify/prisma/bcryptjs/jsonwebtoken/nodemailer）

src/
├── main.ts                          # 入口：createPinia + ElementPlus + Router + vue-echarts 全局注册（v-chart） + ECharts 按需引入 + 全局图标注册
├── App.vue                          # 根组件，仅 <router-view>
├── style.scss                       # 全局 CSS reset + Element Plus 覆盖
├── vite-env.d.ts                    # Vite 类型 + *.vue 模块声明 + wangEditor 类型补丁 + ImportMetaEnv（VITE_API_BASE_URL）
│
├── types/
│   └── router.d.ts                  # 扩展 RouteMeta：title、icon、hidden
│
├── utils/
│   ├── request.ts                   # Axios 封装（核心基础设施）
│   │   ├── 单泛型 API：request.get<T>() / post<T>() / put<T>() / delete<T>() / patch<T>() 只需一个泛型
│   │   ├── BASE_URL 导出供 auth.ts validateToken 复用
│   │   ├── HTTP 状态码驱动：后端直接使用 HTTP 200/401/403/500 等
│   │   ├── 401 → 清 token + userInfo + replace 跳登录（并发防抖锁）
│   │   ├── 403 → 弹提示，不跳转
│   │   ├── showError() 去重：相同文案 3 秒内不重复弹
│   │   ├── silent 模式：传入 { silent: true } 禁用 toast，调用方自行处理
│   │   └── BusinessError 类：携带 code 字段
│   └── sse.ts                       # 通用 SSE 流解析器（异步生成器，buffer 半行 + TextDecoder stream 模式保证任意分块正确解析，支持 AbortSignal）
│
├── layouts/                         # 布局壳子（组装导航 + 内容区，路由直接引用）
│   ├── adminLayout.vue              # 管理端：侧边栏 + 顶栏 + <router-view>
│   ├── userLayout.vue               # 用户端：顶栏 + <router-view>
│   └── authLayout.vue               # 认证页：渐变背景 + 装饰浮动圆 + 居中卡片
│
├── api/                             # 按模块拆分，每个文件一个业务域 + 共享常量
│   ├── auth.ts                      # 登录/注册/退出/忘记密码/重置密码 + UserInfo 类型
│   ├── knowledge.ts                 # 文章 CRUD + 分类/标签常量
│   ├── consultations.ts             # 咨询记录 CRUD + Message 类型
│   ├── emotional.ts                 # 情绪日志 CRUD + 共享常量（标签、颜色、工具函数）
│   ├── dashboard.ts                 # 数据分析：KPI + 趋势 + 分布
│   ├── file.ts                      # 文件上传
│   └── user.ts                      # 用户端 API（首页、聊天、心情记录）
│
├── composables/
│   ├── useProfile.ts                # 个人中心共享逻辑（头像/昵称/邮箱/密码），两端共用
│   └── useChat.ts                   # 聊天状态机（会话管理 + 流式发送 + RAF 节流 + AbortController + generationId 防串 + 错误恢复），userChat.vue 的业务逻辑全在此
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
│   ├── profile/
│   │   └── ProfilePage.vue         # 个人中心共享组件（头像/昵称/邮箱/密码，user/admin 两端复用）
│   ├── dialog/
│   │   ├── articleDialog.vue        # 文章新增/编辑弹窗（共用，含 wangEditor）
│   │   ├── consultationDialog.vue   # 咨询详情弹窗（温暖治愈风聊天气泡，含危机预警标签）
│   │   └── emotionalDialog.vue      # 情绪详情弹窗（AI 分析 + 风险描述 + 专业建议）
│
└── views/
    ├── admin-page/
    │   ├── dashboard.vue            # 数据分析（6 KPI 卡片 + 5 ECharts 图表）✅ 已完成
    │   ├── knowledge.vue            # 知识文章（列表 + 搜索 + CRUD）✅ 已完成
    │   ├── consultations.vue        # 咨询记录（列表 + 分页 + 详情 + 删除）✅ 已完成
    │   ├── emotional.vue            # 情绪日志（列表 + 搜索 + 详情 + 删除）✅ 已完成
    │   └── adminProfile.vue         # 管理员个人中心（头像/昵称/邮箱/密码，复用 useProfile）✅ 已完成
    ├── user-page/
    │   ├── userHome.vue             # 个人首页（统计卡片 + 趋势 + 最近对话）✅ 已完成
    │   ├── userChat.vue             # AI 对话（会话列表 + 聊天气泡 + SSE 流式打字机效果）✅ 已完成
    │   ├── userMood.vue             # 心情记录（表单 + 历史列表）✅ 已完成
    │   ├── userArticles.vue         # 健康知识列表（卡片网格 + 搜索筛选）✅ 已完成
    │   ├── userArticleDetail.vue    # 文章详情（富文本渲染）✅ 已完成
    │   ├── userProfile.vue          # 个人中心（头像/昵称/邮箱 + 修改密码）✅ 已完成
    │   └── userMemory.vue           # 长期记忆管理（查看/删除/清空）✅ 已完成
    ├── login/
    │   ├── login.vue                # 登录页（用户名/邮箱 + 密码，支持邮箱/用户名登录，带忘记密码入口）
    │   ├── register.vue             # 注册页（用户名 + 邮箱(必填) + 昵称(选填) + 密码）
    │   └── forgotPassword.vue       # 忘记密码（邮箱 → 6位验证码 → 新密码，单页面三步）
    └── NotFound.vue                 # 404 页面（根据登录态 + 角色智能跳转）
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

其他关键特性：
- `showError()` 错误去重：相同文案 3 秒内只弹一个 toast
- `silent: true` 配置：调用方可禁用 toast 自行处理（chat 发消息失败时气泡标红而非弹窗）
- 401 并发防抖：`isRedirecting` 锁防止多个请求同时过期时重复跳转
- `userInfo` 同步清理：401 时 token 和 userInfo 一起清，路由守卫不会读到过期角色信息

### 2. API 路径规范

```
/api/auth/login               登录（支持用户名或邮箱）
/api/auth/register            注册（邮箱必填）
/api/auth/me                  验证 token
/api/auth/profile             更新个人资料（昵称/头像/邮箱）
/api/auth/password            修改密码
/api/auth/forgot-password     忘记密码——发送 6 位验证码邮件
/api/auth/reset-password      重置密码——验证码 + 新密码
/api/knowledge/articles       知识文章 CRUD
/api/consultations/records    咨询记录 CRUD
/api/emotional/records        情绪日志 CRUD
/api/dashboard                数据分析
/api/file/upload              通用文件上传
/api/user/home                用户端首页数据
/api/user/chat/sessions       用户聊天会话
/api/user/chat/send           用户发送消息（SSE 流式）
/api/user/mood                用户心情记录
/api/user/memories            长期记忆管理
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
- `GET    /user/chat/sessions`        用户会话列表
- `GET    /user/chat/sessions/:id`    会话消息列表
- `POST   /user/chat/send`            发送消息（SSE 流式）
- `DELETE /user/chat/sessions/:id`    删除会话
- `GET    /emotional/records`         情绪日志列表
- `GET    /emotional/records/:id`     情绪日志详情
- `DELETE /emotional/records/:id`     删除情绪日志

### 3. 路由命名与导航守卫

四套路由：`/back`（管理后台）、`/user`（用户端）、`/auth`（认证）、`/:pathMatch(.*)*`（404 兜底）。根路径 `/` redirect 到 `/auth/login`。

```ts
export const ROUTE_NAMES = {
  // 后台路由
  backLayout, dashboard, knowledge, consultations, emotional, adminProfile,
  // 用户端路由
  userLayout, userHome, userChat, userMood, userArticles, userMemory,
  userArticleDetail, userProfile,
  // 认证路由
  authLayout, login, register, forgotPassword,
} as const
router.push({ name: ROUTE_NAMES.dashboard })  // ✅ 用常量，不硬编码
```

导航守卫逻辑（两层：路由级 `beforeEnter` + 全局 `beforeEach`）：

**路由级 `beforeEnter`（[router/index.ts](src/router/index.ts)）：**
- `/back/*` → `beforeEnter` 只校验 admin 角色（token 校验在 beforeEach），非 admin 踢回登录页
- `/user/*` → `meta: { requiresAuth: true }`，需登录但不校验角色（管理员也能访问用户端）

**全局 `beforeEach`：**
- **首次 token 验证**：`tokenChecked` / `tokenValid` 标志位。首次进入时调用 `validateToken()` 向后端验证 token 有效性，无效则同步清除 `token` + `userInfo`
- `requiresAuth` 路由 → 未登录则跳 `/auth/login?redirect=原路径`
- `/auth/*` 认证路由 → 已登录则按角色分流：admin → `/back/dashboard`，普通用户 → `/user/home`
- `/:pathMatch(.*)*` → 404 页面（`views/NotFound.vue`），已登录用户显示"返回首页/管理后台"，未登录显示"返回登录"

### 4. 共享常量与工具函数

多页面共用的常量、映射表、工具函数**统一放在对应 `api/` 模块中导出**，不在 `.vue` 文件里重复定义。

当前 `api/emotional.ts` 导出的共享资源：
```ts
MOOD_LABELS        // 情绪标签数组
MOOD_LABEL_COLORS  // 情绪标签 → 颜色映射（全项目唯一来源）
labelColor()       // 情绪标签 → 颜色（userHome/userMood/emotionalDialog 共用）
moodScoreColor()   // 情绪评分 → 颜色
SCORE_MARKS        // 滑条 emoji 标记
TRIGGER_OPTIONS    // 触发因素选项
```

所有引用情绪颜色的文件（userHome、userMood、dashboard、emotional、emotionalDialog）均从 `api/emotional.ts` import，修改颜色只需改一处。

### 5. localStorage / sessionStorage Key 约定

| Key | 写方 | 读方 |
|-----|------|------|
| `token` | login.vue | request.ts 请求拦截器 |
| `userInfo` | user store setUser() | user store 初始化恢复 |
| `login:pendingEmail` (sessionStorage) | login.vue goForgot() | login.vue 初始化（保留离开前的输入） |

### 6. 忘记密码流程

采用 **6 位数字验证码** 方式（非邮件链接），单页面完成：

1. 输入注册邮箱 → 获取验证码（15 分钟冷却，前后端双重限制）
2. 输入 6 位验证码 + 新密码 + 确认密码 → 重置
3. 完成 → 跳回登录页（自动带回邮箱/用户名）

安全措施：
- 防用户枚举：无论邮箱是否存在，统一返回"验证码已发送"
- 验证码 bcrypt 哈希存储，15 分钟过期
- 一次性使用：重置成功后立即清空
- 邮件发送失败自动回滚，不残留令牌

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
fetchArticles(params)              // GET    /knowledge/articles
fetchArticleDetail(id)             // GET    /knowledge/articles/:id
createArticle(params)              // POST   /knowledge/articles
updateArticle(id, params)          // PUT    /knowledge/articles/:id
deleteArticle(id)                  // DELETE /knowledge/articles/:id
fetchTitleSuggestions(query)       // GET    /knowledge/articles/suggestions
```

> 以上接口均已迁至真实后端，Mock 插件已删除。

---

## 已完成模块：咨询记录

### 列表页 `consultations.vue`

| 功能 | 说明 |
|------|------|
| 表格 | 对话用户（含危机预警 ⚠ 图标）、对话记录（AI名称+时间 / 内容预览）、消息数量、开始时间 |
| 分页 | 10/20/50 条，切换 pageSize 回第 1 页 |
| 详情 | 打开 consultationDialog（按钮 loading 防重复点击，消息含 crisis-tag） |
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
Message { id, sender: 'user' | 'assistant', content, time, flagged?: boolean }
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

### 后端实现

已迁至真实后端 `server/src/routes/emotional.ts`，基于 MoodRecord + User JOIN 查询，admin 鉴权。列表返回轻量字段，详情返回全量含 AI 分析。

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
| 消息输入 | 底部 textarea + 发送按钮，回车发送，Shift+Enter 换行 |
| 新建对话 | 顶部按钮 + 右侧自动聚焦输入框 |
| SSE 流式回复 | `sendMessageStream` 通过 fetch + `parseSSEStream()` 接收 SSE（meta/chunk/done/error），打字机效果实时渲染，支持 AbortSignal 取消 |
| 乐观更新 | 用户消息立即显示（临时 ID），onMeta 替换为真实消息，onChunk 逐字追加 AI 气泡 |

后端实现见 `server/src/routes/chat.ts`，对接 **DeepSeek API**（`deepseek-chat` 模型），System Prompt 定义 AI 为"宁渡"心理健康助手（温暖共情 + 安全边界）。

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

### 个人中心 `userProfile.vue` + `adminProfile.vue`

两人页面合并为共享组件 `ProfilePage.vue`（由 `useProfile(fileInput, passwordFormRef, defaultInitial)` composable 提供所有逻辑），各自路由文件只是薄壳。
| 区域 | 内容 |
|------|------|
| 头像区 | hover 相机覆盖层 → 文件选择 → `uploadFile()` → `PUT /api/auth/profile` → `userStore.setUser()` 刷新导航栏 |
| 基本资料 | 用户名（只读）、可编辑邮箱/昵称 + 保存按钮、带 prop 的角色标签 |
| 修改密码 | 旧密码 + 新密码 + 确认新密码，校验通过后 `PUT /api/auth/password` |

共用逻辑：`useProfile` composable（头像/昵称/邮箱/密码）+ `ProfilePage.vue`（模板/样式）。

### API `api/user.ts`

```ts
// 类型
HomeData { dailyQuote, stats: HomeStats, recentMoods, recentChats }
ChatSession { id, title, lastMessage, lastTime, messageCount }
ChatMessage { id, sender, content, time, error? }
SendMessageResult { userMessage, aiReply }
CreateMoodParams { moodScore, moodLabel, content, ... }     // userId 由 JWT 获取
MoodAnalysis { primaryEmotion, emotionIntensity, riskLevel, emotionNature }
MoodSuggestion { riskDescription, advice }
MemoryItem { id, content, category, createdAt }

// 接口
  getUserHome()                          // GET /user/home（JWT）
  getChatSessions()                      // GET /user/chat/sessions（JWT）
  getChatMessages(sessionId)             // GET /user/chat/sessions/:id
  sendMessage(sessionId, content, deepThinking?)       // POST /user/chat/send（非流式）
  sendMessageStream(sessionId, content, callbacks, signal?, deepThinking?) // POST /user/chat/send（SSE 流式，signal 用于取消，deepThinking 默认 false）
  renameSession(sessionId, title)        // PUT /user/chat/sessions/:id
  togglePinSession(sessionId)            // PUT /user/chat/sessions/:id/pin
  deleteChatSession(sessionId)           // DELETE /user/chat/sessions/:id
  createMood(params)                     // POST /user/mood（JWT + 异步 AI 分析）
  getUserMoods(page, size, label)        // GET /user/mood（JWT）
  getUserMoodDetail(id)                  // GET /user/mood/:id（全量含 AI 分析）
  deleteMood(id)                         // DELETE /user/mood/:id
  getMemories()                          // GET /user/memories
  deleteMemory(id)                       // DELETE /user/memories/:id
  clearMemories()                        // DELETE /user/memories
```

### Mock

用户端首页 mock 会为当前请求用户自动补最近 4 天的情绪记录，保证"本周统计"卡片不空。聊天接口已迁至真实后端（`server/src/routes/chat.ts`），不再走 mock。

---

## 当前接口清单

| 接口 | 方法 | 状态 |
|------|------|------|
| `/api/auth/login` | POST | ✅ 真实后端（MySQL 查用户 + bcrypt + JWT） |
| `/api/auth/register` | POST | ✅ 真实后端（MySQL 写入 + 用户名去重） |
| `/api/auth/me` | GET | ✅ 真实后端（JWT 验证 + 返回用户信息） |
| `/api/auth/profile` | PUT | ✅ 真实后端（需登录，更新昵称/头像/邮箱） |
| `/api/auth/password` | PUT | ✅ 真实后端（需登录，旧密码比对 + 更新） |
| `/api/auth/forgot-password` | POST | ✅ 真实后端（nodemailer 发送 6 位验证码，15 分钟冷却） |
| `/api/auth/reset-password` | POST | ✅ 真实后端（验证码 + 新密码，令牌一次性使用） |
| `/api/knowledge/articles` | GET | ✅ 真实后端（分页 + title/category/status 筛选） |
| `/api/knowledge/articles` | POST | ✅ 真实后端（admin 鉴权 + JSON Schema 校验） |
| `/api/knowledge/articles/suggestions` | GET | ✅ 真实后端（title 模糊联想，最多 10 条） |
| `/api/knowledge/articles/:id` | GET | ✅ 真实后端（ID 正整数校验） |
| `/api/knowledge/articles/:id` | PUT | ✅ 真实后端（admin 鉴权 + 部分更新） |
| `/api/knowledge/articles/:id` | DELETE | ✅ 真实后端（admin 鉴权 + ID 校验） |
| `/api/file/upload` | POST | ✅ 真实后端（multipart + UUID 存储） |
| `/api/consultations/records` | GET | ✅ 真实后端（admin 鉴权，ChatSession + User JOIN + 首/尾消息） |
| `/api/consultations/records/:id` | GET | ✅ 真实后端（admin 鉴权，含完整对话消息） |
| `/api/consultations/records/:id` | DELETE | ✅ 真实后端（admin 鉴权，级联删除消息） |
| `/api/emotional/records` | GET | ✅ 真实后端（admin 鉴权，MoodRecord + User JOIN） |
| `/api/emotional/records/:id` | GET | ✅ 真实后端（admin 鉴权，全量字段含 AI 分析） |
| `/api/emotional/records/:id` | DELETE | ✅ 真实后端（admin 鉴权，ID 正整数校验） |
| `/api/dashboard` | GET | ✅ 真实后端（admin 鉴权，聚合 User/MoodRecord/ChatSession） |
| `/api/user/home` | GET | ✅ 真实后端（聚合 MoodRecord + ChatSession） |
| `/api/user/chat/sessions` | GET | ✅ 真实后端（JWT 认证，置顶优先排序，含 pinned 字段） |
| `/api/user/chat/sessions/:id` | GET | ✅ 真实后端（归属权校验，完整消息列表） |
| `/api/user/chat/send` | POST | ✅ 真实后端（SSE 流式 + DeepSeek V4 Pro + 深度思考 + 历史上下文 20 条） |
| `/api/user/chat/sessions/:id` | PUT | ✅ 真实后端（重命名会话，上限 200 字符） |
| `/api/user/chat/sessions/:id/pin` | PUT | ✅ 真实后端（切换置顶，返回新状态） |
| `/api/user/chat/sessions/:id` | DELETE | ✅ 真实后端（归属权校验，级联删除消息） |
| `/api/user/mood` | POST | ✅ 真实后端（JWT 认证 + JSON Schema 校验 + 异步 AI 分析） |
| `/api/user/mood` | GET | ✅ 真实后端（JWT 认证 + 分页 + moodLabel 筛选） |
| `/api/user/mood/:id` | GET | ✅ 真实后端（返回全量字段含 AI 分析） |
| `/api/user/mood/:id` | DELETE | ✅ 真实后端（JWT 认证 + 存在性检查） |
| `/api/user/memories` | GET | ✅ 真实后端（JWT 认证，返回当前用户全部记忆） |
| `/api/user/memories/:id` | DELETE | ✅ 真实后端（JWT 认证 + 身份校验） |
| `/api/user/memories` | DELETE | ✅ 真实后端（JWT 认证，清空全部记忆） |

> ✅ 全部已完成，mock 插件已删除。长期记忆、AI 情绪分析、危机标记均已落库并可前端交互。

---

## 项目当前状态

### ✅ 已完成全部三层梯队

| 梯队 | 功能 | 状态 |
|------|------|------|
| 🥇 | 用户信息注入——AI 知道用户昵称 + 近 7 天心情趋势 | ✅ |
| 🥇 | 知识库 RAG——25 篇真实文章，用户原话直接匹配摘要 | ✅ |
| 🥈 | 危机标记——31 关键词 + 软化词双轮匹配，管理端列表/详情双处预警 | ✅ |
| 🥈 | AI 情绪分析——提交心情后异步生成 `aiAnalysis` + `aiSuggestion` | ✅ |
| 🥈 | 对话自动摘要 | ❌ 不需要 |
| 🥉 | 长期记忆——跨会话记住用户信息，提取→去重→检索全链路 | ✅ |
| 🥉 | 语音、心情联动 | ❌ 不需要 |
| 优化 | 鉴权补齐（mood/home +JWT）、文件保护、代码去重、错误 UX | ✅ |

---

## 已修复的问题

- **登录 401 跳页**：`request.ts` 中 401 处理排除 `/auth/login` 路径，密码错误不再触发跳转
- **退出登录 dropdown 压扁**：`userNav.vue` 加 `:teleported="false"` + `transition: none`
- **`@types/express` 版本冲突**：Express → Fastify 后彻底消除，零 `@types/*` 依赖
- **心情记录删除**：`userMood.vue` 新增删除按钮，末页边界处理
- **mock 文章数据缺失**：补全 `coverImage` / `content` / `tags` 三个字段
- **种子数据扩充**：用户 2→11 人（admin + 10 普通用户），心情记录 5→50 条含完整 AI 分析，文章 5→15 篇，用户名规则统一（拼音 → 中文昵称）
- **种子数据重构**：提取 `scripts/seed-data.ts` 共享数据，消除 `seed.ts` 与 `seed-moods.ts` 间 ~200 行重复
- **个人中心实现**：`userProfile.vue` 头像上传 + 昵称编辑 + 密码修改，后端 `PUT /api/auth/profile` + `PUT /api/auth/password`
- **request.ts 双弹消息**：非 401/403 错误分支统一 reject `BusinessError`，组件 catch 检查 `instanceof` 避免重复 ElMessage
- **mood.ts 冗余字段**：移除 schema 和 handler 中写传不存的 `userName` 字段
- **管理端个人中心**：新建 `adminProfile.vue`，抽取 `useProfile` composable 共享头像/昵称/密码逻辑
- **管理端默认跳转**：三处统一为 `/back/dashboard`（路由 redirect + 导航守卫 + 登录页按钮）
- **种子聊天数据**：聊天会话 2→18 个（每用户 1-2 个，4-8 条消息，0-15 天分散）
- **dashboard 除零风险**：`activeRate` / `riskRate` 加零除保护
- **userId 硬编码兜底**：三页 `|| 1001` 改为 `?? 0`，token 异常时 API 报错而非静默写错用户
- **request.ts 全面加固**：`showError()` 3 秒去重 + `silent` 配置 + 401 路径精确匹配 + `userInfo` 同步清理 + 成功分支 `data` 安全网 + 类型铁律注释
- **全局重复弹窗清理**：`consultations.vue` / `emotional.vue` 删除双重 `ElMessage.error`
- **emotional.vue ringColor**：替换为 `api/emotional.ts` 导出的 `moodScoreColor`，消除重复颜色逻辑
- **consultations.ts 列表优化**：列表不再加载全量消息，改为 `messages.take(1)` + 批量 `distinct` 首条用户消息
- **emotional.ts / mood.ts sleepDuration**：`instanceof Object` → `typeof === 'object' && !== null` 收窄
- **mood.ts detail**：`...record` 展开改为显式字段 + `pressureLevel ?? 0`
- **userArticleDetail ID 无效**：`loading` 停止 + 跳转列表，不再永远转圈
- **userArticles total**：API 报错时同步清 `total=0`，分页组件不残留
- **userMood 详情弹窗**：报错保留弹窗不闪关，用户可重试
- **userHome formatTime**：加空值保护
- **login 返回首页**：从 admin `knowledge` 改为公开 `userArticles`
- **邮箱支持**：User 模型 + email 字段，登录支持用户名/邮箱双模式，注册邮箱必填，忘记密码通过邮箱发送 6 位验证码
- **忘记密码**：新建 `forgotPassword.vue`，nodemailer 发 6 位验证码，60s 前后端双重冷却，bcrypt 哈希存储一次性令牌
- **个人中心邮箱编辑**：`useProfile` 新增邮箱编辑逻辑，`userProfile.vue` / `adminProfile.vue` 同步展示和编辑
- **注册昵称 bug**：修复注册时昵称被 username 覆盖的问题（`nickname: username` → `nickname: nickname?.trim() \|\| username`）
- **login 页面清理**：删除登录页"返回首页"按钮，注册页/忘记密码页统一改为"返回登录"
- **login 输入保留**：离开登录页去忘记密码时用 sessionStorage 保留已输入内容，回来后自动填入
- **聊天模块迁移**：chat 3 个接口从 mock → 真实后端 `server/src/routes/chat.ts`，前端 `sendMessageStream` 实现 SSE 流式解析
- **AI 对话接入**：对接 DeepSeek API（`deepseek-chat` 模型），System Prompt 定义"宁渡"角色，SSE 流式打字机效果，30s 超时保护
- **chat.ts 删除会话**：新增 `DELETE /api/user/chat/sessions/:id`，归属权校验 + 级联删除消息
- **userChat.vue 流式完善**：`sendMessageStream` 替代原 mock 延迟回复，支持 meta/chunk/done/error 四事件，乐观更新 + 打字机实时渲染
- **长期记忆**：新增 `Memory` 表 + `ai/memory.ts` + `routes/memory.ts` + `userMemory.vue`，跨会话记住用户关键信息，提取→去重→检索全链路
- **危机标记**：`ChatMessage.flagged` 字段 + `safety.ts` 31 关键词 + 软化词双轮匹配，管理端列表 ⚠ 图标 + 详情红标
- **AI 情绪分析**：`mood.ts` 异步调用 DeepSeek 生成 `aiAnalysis`/`aiSuggestion`，用户端心情详情弹窗可查看
- **知识库内容重写**：15 篇核心 + 10 篇补充，每篇含循证实践建议，原 placeholder 替换
- **鉴权补齐**：`mood.ts` + `home.ts` 加 JWT 认证，userId 从令牌提取而非信任客户端传参
- **client.ts 去重**：提取公共 `callDeepSeek()`，`streamChat`/`chat` 共享请求逻辑
- **RAG 简化**：取消 2-gram 拆词 + 停用词过滤，直接用用户原话 `LIKE` 匹配文章
- **记忆提取优化**：攒 ≥4 条用户消息才触发，减少无效 AI 调用
- **标签重复**：`labelColor` 提取到 `api/emotional.ts` 一处定义，userHome/userMood/emotionalDialog 共用
- **用户头像**：聊天页用户气泡显示上传头像而非永远首字符
- **AI 头像**：暖金渐变底 + 太阳图标
- **文章标签**：修复 `JSON.stringify` 双重编码导致 `v-for` 逐字符拆开；加 `flex-wrap` 防溢出
- **心情详情**：加 `serialize()` tags 解析 + 加载失败显示「重新加载」按钮
- **AI 回复失败**：聊天框显示红色气泡「AI 回复生成失败，请稍后重试」
- **个人中心合并**：`userProfile.vue` + `adminProfile.vue` → 共享 `ProfilePage.vue`
- **auth 注释**：60s→15 分钟冷却时间
- **file 上传**：加 `mkdirSync` + pipeline try/catch
- **dashboard 查询**：高风险分析加 90 天时间窗口 + `take: 10000`
- **memory createdAt**：加 `formatDateTime()` 格式化，保持 API 响应一致
- **forgotPassword**：空 catch 加 `ElMessage.error`
- **userArticles**：加载时显示「加载中…」
- **knowledge 状态切换**：加 try/catch，失败不弹假成功

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
浏览器 → Vue 前端（userChat.vue → useChat composable）→ api/user.ts（sendMessageStream / SSE 流式）
                                        ↓
                        server/src/routes/chat.ts（路由编排层）
                           ├── JWT 认证 + 会话管理
                           ├── 委托 ai/context.ts 拼装 prompt
                           └── 委托 ai/client.ts 调 DeepSeek

server/src/ai/                        ← AI 核心模块
├── client.ts            纯 API 调用：streamChat() 流式 / chat() 非流式，共用 callDeepSeek()
├── context.ts           上下文拼装：System Prompt + 历史 + 知识库 + 用户信息 + 长期记忆
├── safety.ts            安全检测：31 关键词 + 软化词双轮匹配 → checkCrisis()
├── memory.ts            长期记忆：extractMemories() 提取 / saveMemories() 去重存库 / getMemoryContext() 检索
└── prompts/
    └── system.ts        System Prompt + buildSystemPrompt()
```

### 分层职责

| 层 | 文件 | 职责 | 修改频率 |
|----|------|------|---------|
| API 客户端 | `ai/client.ts` | HTTP 请求、SSE 解析、超时控制 | 几乎不改 |
| 上下文 | `ai/context.ts` | 拼装 messages[]，注入用户信息/知识库 | **功能升级主要改这里** |
| 安全 | `ai/safety.ts` | 危机检测、内容过滤 | 按需补充关键词 |
| Prompt | `ai/prompts/system.ts` | AI 人设文案 | 调风格时改 |
| 路由 | `routes/chat.ts` | JWT → 校验 → 委托 → SSE → 落库 | 加新接口时改 |
| 前端 API | `src/api/user.ts` | `sendMessageStream()` + CRUD 函数，委托 `sse.ts` 解析 | 加接口时改 |
| 前端逻辑 | `src/composables/useChat.ts` | 聊天状态机，流式发送/取消/节流/重试 | 改交互时改 |
| 前端 UI | `src/views/user-page/userChat.vue` | 模板 + 样式壳，调用 useChat | 改交互时改 |

### 方案一：直调 LLM + 深度思考 ✅

`POST /api/user/chat/send` 完整流程：

1. JWT 认证 → 确定 / 创建会话 → 保存用户消息 + **危机检测**（命中 → `flagged=true`）
2. 并行查询：用户信息 + 近期心情 + 历史 20 条 + 知识库文章 + **长期记忆**
3. `ai/context.ts` 拼装完整 `messages[]`（System Prompt + 用户上下文 + 记忆 + 知识库 + 历史）
4. `ai/client.ts` 调 DeepSeek V4 Pro（`stream: true` + `thinking: enabled` + `reasoning_effort: medium`）
5. SSE 流式推送：`event: meta` → `event: chunk` → `event: done`（失败则推送 error + 红色气泡）
6. 保存 AI 回复 → 首条用户消息自动设为会话标题
7. SSE 结束后异步提取长期记忆（攒 ≥4 条用户消息才触发）

**模型参数**：`temperature: 0.7` / `max_tokens: 800` / `top_p: 0.9`

### 方案二：用户信息注入 ✅

`chat.ts` 中并行查 User 表（昵称）+ MoodRecord 表（近 7 天记录）→ 构造 `userContext` → 传入 `buildSystemPrompt()` → AI 回复自然引用用户情绪状态。

### 方案三：知识库注入（轻量 RAG）✅

用户原话 `LIKE` 匹配 Article 表的 `title` + `summary` → 最多 3 篇 → `knowledgeSnippets` 注入 prompt。25 篇真实内容覆盖焦虑、抑郁、CBT、睡眠、正念、社交焦虑等话题。

### 方案四：长期记忆 ✅

`ai/memory.ts`——提取：每轮对话后 AI 扫描抽取可记忆信息 → 5 字去重 → 存 `Memory` 表（上限 50 条）。检索：下次对话时取全部记忆 → 分类分组 → 注入 System Prompt。用户可在「记忆管理」页查看/删除/清空。

### 方案五：Agent 工具调用（未来扩展点）

给 AI 配 Function Calling / Tool Use：
- `getMoodHistory(days)` → 查用户近期情绪趋势
- `searchKnowledge(query)` → 搜知识库
- `suggestExercise(type)` → 推荐呼吸法/正念练习

---

## Git 仓库

- Remote：`git@github.com:yangYang910aaa/AI-mental-health-assistant.git`
- 默认分支：`main`
