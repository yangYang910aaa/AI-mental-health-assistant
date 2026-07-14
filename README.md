# 宁渡 (Ningdu) — AI 心理健康助手

「宁渡」是一个全栈 AI 心理健康助手应用。它以温暖、共情的方式为用户提供倾听陪伴、情绪记录、心理健康知识科普，并通过 AI 大模型实现智能对话、危机预警和长期记忆等能力。管理端提供数据分析仪表盘、咨询记录管理和情绪日志查看功能。

> 💡 **"宁渡"** 意为"宁静地渡过"——AI 不是医生，而是一位温柔又有边界的陪伴者，帮助用户渡过情绪的低谷。

---

## ✨ 功能特性

### 🧑‍🤝‍🧑 用户端

| 功能 | 说明 |
|------|------|
| **AI 智能对话** | 基于 DeepSeek V4 Pro，SSE 流式打字机效果，支持深度思考模式 |
| **心情记录** | 记录每日情绪评分、标签、触发因素、睡眠和压力水平 |
| **情绪分析** | AI 自动分析情绪状态，生成风险描述和专业建议 |
| **健康知识** | 25 篇循证心理健康文章，涵盖焦虑、抑郁、CBT、正念等话题 |
| **长期记忆** | 跨会话记住用户关键信息，让每次对话更懂你 |
| **危机预警** | 31 类关键词 + AI 语义审核双重检测，自动触发安抚和求助引导 |
| **个人中心** | 头像上传、资料编辑、密码修改 |

### 🛠️ 管理端

| 功能 | 说明 |
|------|------|
| **数据分析仪表盘** | 6 项 KPI 卡片 + 5 张 ECharts 图表（情绪趋势、分布、咨询趋势等） |
| **咨询记录管理** | 查看所有用户对话记录，危机标记 ⚠ 醒目提示 |
| **情绪日志管理** | 查看用户情绪详情和 AI 分析结果 |
| **知识文章管理** | 富文本编辑器（wangEditor）创作和发布文章 |

---

## 🏗️ 技术栈

### 前端

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 语言 | TypeScript |
| 构建 | Vite |
| UI 库 | Element Plus |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| CSS | SCSS（scoped） |
| 图表 | ECharts 6 + vue-echarts |
| 富文本 | wangEditor v5 |
| HTTP | Axios |

### 后端

| 类别 | 选型 |
|------|------|
| 运行时 | Node.js |
| 框架 | Fastify 5 |
| ORM | Prisma 7 + MariaDB 适配器 |
| 数据库 | MySQL |
| 认证 | JWT + bcryptjs |
| 校验 | Fastify JSON Schema |
| 邮件 | nodemailer（SMTP） |

### AI 层

| 类别 | 选型 |
|------|------|
| 大模型 | DeepSeek V4 Pro |
| 调用方式 | SSE 流式（打字机效果） |
| 深度思考 | thinking enabled + reasoning_effort: medium |
| 知识库 | 25 篇心理健康文章，轻量 RAG |
| 记忆系统 | 提取 → LCS 去重 → 检索注入 |
| 安全检测 | 关键词预筛 + AI 语义二次审核 |

---

## 📐 系统架构

```
┌──────────────────────────────────────────────────┐
│                   浏览器                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ 用户端 UI │ │ 管理端 UI │ │ 认证页面  │         │
│  └─────┬────┘ └────┬─────┘ └────┬─────┘         │
│        └───────────┼────────────┘                │
│                    │ Axios + SSE                  │
└────────────────────┼─────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────┐
│              Fastify 5 后端                        │
│  ┌─────────────────┴──────────────────┐          │
│  │          路由层 (routes/)            │          │
│  │  auth / chat / mood / home /        │          │
│  │  knowledge / consultations /        │          │
│  │  emotional / dashboard / memory     │          │
│  └───────┬─────────────────────────────┘          │
│          │                                        │
│  ┌───────┴─────────────────────────────┐          │
│  │          AI 核心模块 (ai/)            │          │
│  │  ┌────────┐ ┌───────┐ ┌─────────┐  │          │
│  │  │ client │ │context│ │ safety  │  │          │
│  │  │ 调 API │ │拼prompt│ │危机检测 │  │          │
│  │  └────────┘ └───────┘ └─────────┘  │          │
│  │  ┌────────┐ ┌───────────┐           │          │
│  │  │ memory │ │  prompts  │           │          │
│  │  │长期记忆│ │  角色设定  │           │          │
│  │  └────────┘ └───────────┘           │          │
│  └───────┬─────────────────────────────┘          │
│          │                                        │
│  ┌───────┴─────────────────────────────┐          │
│  │      Prisma 7 + MySQL               │          │
│  │  User / MoodRecord / Memory /       │          │
│  │  ChatSession / ChatMessage / Article │          │
│  └─────────────────────────────────────┘          │
└───────────────────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────┐
│              DeepSeek API                          │
│         (deepseek-v4-pro)                         │
└──────────────────────────────────────────────────┘
```

---

## 🚀 快速开始

### 前提条件

- **Node.js** ≥ 24
- **pnpm** ≥ 10
- **MySQL** 数据库

### 1. 克隆项目

```bash
git clone git@github.com:yangYang910aaa/AI-mental-health-assistant.git
cd AI-mental-health-assistant
```

### 2. 安装依赖

```bash
# 前端依赖
pnpm install

# 后端依赖
cd server && pnpm install && cd ..
```

### 3. 配置环境变量

在 `server/.env` 中配置：

```env
# 数据库连接
DATABASE_URL="mysql://user:password@localhost:3306/mental_health"

# JWT 密钥（请修改为随机字符串）
JWT_SECRET="your-secret-key-change-me"

# DeepSeek API（必填，否则 AI 对话不可用）
DEEPSEEK_API_KEY="sk-xxxxxxxxxxxxxxxx"

# SMTP 邮件（可选，忘记密码功能需要）
SMTP_HOST="smtp.qq.com"
SMTP_PORT="465"
SMTP_USER="your-email@qq.com"
SMTP_PASS="your-smtp-password"
```

### 4. 初始化数据库

```bash
cd server
pnpm db:migrate      # 运行数据库迁移
pnpm db:seed         # 填充种子数据（11 用户 + 15 文章 + 50 心情记录 + 18 会话）
cd ..
```

### 5. 启动开发服务器

```bash
# 一键启动前后端
pnpm dev:all

# 或分别启动
pnpm dev              # 前端 → http://localhost:5173
pnpm dev:server       # 后端 → http://localhost:3000
```

### 6. 访问应用

| 角色 | 用户名 | 密码 | 地址 |
|------|--------|------|------|
| 管理员 | `admin` | `admin123` | `http://localhost:5173/back/dashboard` |
| 普通用户 | `zhangsan` | `123456` | `http://localhost:5173/user/home` |

> 更多种子用户见 `server/prisma/seed.ts`，密码均为 `123456`。

---

## 📁 项目结构

```
mental-health/
├── src/                        # 前端源码
│   ├── api/                    # API 请求模块 + 共享常量
│   ├── components/             # 可复用组件
│   │   ├── admin-page/         # 管理端通用组件
│   │   ├── user-page/          # 用户端通用组件
│   │   ├── dialog/             # 弹窗组件
│   │   └── profile/            # 个人中心共享组件
│   ├── composables/            # 组合式函数（useChat / useProfile）
│   ├── layouts/                # 布局壳子
│   ├── router/                 # 路由配置 + 导航守卫
│   ├── stores/                 # Pinia 状态管理
│   ├── utils/                  # 工具函数（request / sse）
│   ├── views/                  # 页面组件
│   │   ├── admin-page/         # 管理后台页面
│   │   ├── user-page/          # 用户端页面
│   │   └── login/              # 认证页面
│   └── style.scss              # 全局样式
│
├── server/                     # 后端源码
│   ├── src/
│   │   ├── index.ts            # Fastify 入口
│   │   ├── db.ts               # Prisma 客户端
│   │   ├── ai/                 # AI 核心模块 ⭐
│   │   │   ├── client.ts       # DeepSeek API 客户端（流式/非流式 + 重试）
│   │   │   ├── context.ts      # 上下文拼装（Token 预算 + 滑动窗口）
│   │   │   ├── safety.ts       # 危机检测（关键词 + AI 语义审核）
│   │   │   ├── memory.ts       # 长期记忆（提取 → 去重 → 检索）
│   │   │   └── prompts/        # System Prompt 角色设定
│   │   ├── routes/             # 路由处理（11 个模块）
│   │   ├── middleware/         # JWT 认证中间件
│   │   ├── utils/              # 工具函数（邮件/格式化/校验）
│   │   └── types/              # TypeScript 类型扩展
│   ├── prisma/
│   │   ├── schema.prisma       # 数据模型定义（6 张表）
│   │   └── seed.ts             # 种子数据
│   ├── scripts/                # 辅助脚本
│   └── public/uploads/         # 文件上传目录
│
├── CLAUDE.md                   # Claude Code 项目文档
└── package.json                # 前端依赖 + 脚本
```

---

## 🔌 API 概览

所有接口均在 `/api` 路径下，使用 HTTP 状态码直接表达成功/失败。

### 认证 (`/api/auth`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 登录（支持用户名或邮箱） |
| POST | `/auth/register` | 注册 |
| GET | `/auth/me` | 验证 Token |
| PUT | `/auth/profile` | 更新个人资料 |
| PUT | `/auth/password` | 修改密码 |
| POST | `/auth/forgot-password` | 发送重置验证码 |
| POST | `/auth/reset-password` | 重置密码 |

### 用户端 (`/api/user`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/user/home` | 首页聚合数据 |
| GET | `/user/chat/sessions` | 会话列表 |
| GET | `/user/chat/sessions/:id` | 会话消息 |
| POST | `/user/chat/send` | 发送消息（SSE 流式） |
| PUT | `/user/chat/sessions/:id` | 重命名会话 |
| PUT | `/user/chat/sessions/:id/pin` | 切换置顶 |
| DELETE | `/user/chat/sessions/:id` | 删除会话 |
| POST | `/user/mood` | 创建心情记录 |
| GET | `/user/mood` | 心情记录列表 |
| GET | `/user/mood/:id` | 心情记录详情 |
| DELETE | `/user/mood/:id` | 删除心情记录 |
| GET | `/user/memories` | 长期记忆列表 |
| DELETE | `/user/memories/:id` | 删除单条记忆 |
| DELETE | `/user/memories` | 清空全部记忆 |

### 管理端

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/dashboard` | 数据分析 KPI + 趋势 |
| CRUD | `/knowledge/articles` | 知识文章管理 |
| GET | `/consultations/records` | 咨询记录列表 |
| GET | `/consultations/records/:id` | 咨询详情（含对话） |
| DELETE | `/consultations/records/:id` | 删除咨询记录 |
| GET | `/emotional/records` | 情绪日志列表 |
| GET | `/emotional/records/:id` | 情绪日志详情 |
| DELETE | `/emotional/records/:id` | 删除情绪日志 |
| POST | `/file/upload` | 文件上传 |

---

## 🧠 AI 核心能力

### 1. 用户信息注入

AI 知道对话对象的昵称、近 7 天心情趋势和最近关注的问题，回复更有针对性。

### 2. 知识库增强 (轻量 RAG)

用户输入直接匹配 25 篇健康知识文章的标题和摘要，将相关知识片段注入上下文，让 AI 分享循证建议。

### 3. 危机检测

```
用户消息 → 31 类关键词快速预筛
         → 去除软化词（"不太"、"好像"等）
         → 命中 → AI 语义二次审核（排除误报如"我妈说活着好累"）
                → 确认危机 → 流式输出安抚文案 + 心理援助热线
```

### 4. 长期记忆

```
对话结束 → 累计 ≥ 4 条用户消息
        → AI 扫描提取可记忆信息
        → LCS（最长公共子串）去重
        → 存入 Memory 表（上限 50 条）
        → 下次对话 → 字符交集打分过滤 → 按类别分组 → 注入 System Prompt
```

---

## 📊 数据库模型

| 表 | 说明 | 关键字段 |
|------|------|------|
| **User** | 用户 | username, email, passwordHash, nickname, avatar, role |
| **MoodRecord** | 心情记录 | moodScore, moodLabel, sleepDuration, pressureLevel, aiAnalysis(JSON) |
| **ChatSession** | 聊天会话 | title, pinned |
| **ChatMessage** | 聊天消息 | sender(user/assistant), content, flagged |
| **Memory** | 长期记忆 | content, category(宠物/家庭/工作/健康/…) |
| **Article** | 知识文章 | title, content, category, coverImage, tags(JSON), status, views |

---

## 🛠️ 常用命令

```bash
# 开发
pnpm dev              # 启动前端
pnpm dev:server       # 启动后端
pnpm dev:all          # 一键启动前后端

# 构建
pnpm build            # 前端类型检查 + 构建
cd server && pnpm build  # 后端 TypeScript 编译

# 数据库
cd server
pnpm db:migrate       # 数据库迁移
pnpm db:seed          # 填充种子数据
pnpm db:studio        # Prisma 可视化管理
pnpm db:seed-moods    # 单独填充心情记录
pnpm db:seed-articles # 单独填充文章
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

### 代码规范

- 组件命名：PascalCase
- 页面放 `views/`，可复用组件放 `components/`，布局放 `layouts/`
- 共享常量和工具函数放在对应 `api/` 模块中统一导出
- Pinia store 使用 setup function 风格
- SCSS 嵌套 ≤ 3 层，`:deep()` 穿透 Element Plus 样式
- Import 分组顺序：vue → 第三方 → 内部

---

## 📄 License

[MIT](LICENSE)

---

## 🙏 致谢

- [DeepSeek](https://deepseek.com/) — 提供 AI 大模型 API
- [Element Plus](https://element-plus.org/) — Vue 3 组件库
- [Fastify](https://fastify.dev/) — 高性能 Node.js 框架
- [Prisma](https://www.prisma.io/) — 下一代 ORM

---

<p align="center">
  <sub>如果你正在经历困难的时刻，请拨打全国心理援助热线 <b>400-161-9995</b>（24 小时免费），或联系你信任的人。你不需要独自面对。</sub>
</p>
