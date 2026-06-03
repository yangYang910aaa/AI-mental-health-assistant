# mental-health — AI 心理健康助手

Vue 3 + TypeScript + Vite 管理后台前端项目。

## 技术栈

| 类别 | 选型 | 版本 |
|------|------|------|
| 框架 | Vue 3（`<script setup lang="ts">` SFC） | ^3.5 |
| 语言 | TypeScript | ~6.0 |
| 构建 | Vite | ^8.0 |
| 包管理 | pnpm | 10.33 |
| UI 库 | Element Plus | ^2.14 |
| 状态管理 | Pinia（setup function 风格） | ^3.0 |
| 路由 | Vue Router（HTML5 history） | 4.6 |
| CSS | SCSS（`lang="scss" scoped`） | — |
| 图标 | `@element-plus/icons-vue`（全局注册） | ^2.3 |

## 常用命令

```bash
pnpm dev          # 启动开发服务器（默认 http://localhost:5173）
pnpm build        # 类型检查 + 构建（vue-tsc -b && vite build）
pnpm preview      # 预览构建产物
pnpm add <pkg>    # 安装依赖
```

## 目录结构

```
mental-health/
├── index.html                     # 入口 HTML
├── vite.config.ts                 # Vite 配置（Vue 插件 + @ 别名 + /api 代理）
├── tsconfig.json                  # TS 项目引用入口
├── tsconfig.app.json              # 应用代码 TS 配置
├── tsconfig.node.json             # Node 侧 TS 配置
├── public/                        # 静态资源（不经过编译）
└── src/
    ├── main.ts                    # 应用入口：createPinia + ElementPlus + Router 注册
    ├── App.vue                    # 根组件，仅放 <router-view>
    ├── style.scss                 # 全局样式（CSS reset + 基础变量）
    ├── vite-env.d.ts              # 声明 *.vue 模块类型，让 TS 识别 .vue 文件
    ├── assets/                    # 编译时资源（logo.svg 等）
    ├── types/
    │   └── router.d.ts            # 扩展 RouteMeta 接口，声明 title、icon
    ├── utils/
    │   └── request.ts             # Axios 封装（拦截器、状态码处理、BusinessError）
    ├── api/
    │   └── auth.ts                # 登录/注册/退出 API
    ├── stores/
    │   ├── admin.ts               # Pinia store：侧边栏折叠状态
    │   └── user.ts                # Pinia store：用户信息、登录状态、setUser/clearUser
    ├── router/
    │   └── index.ts               # 路由配置（命名路由 + 懒加载 + ROUTE_NAMES 常量）
    ├── components/
    │   ├── backToLayout.vue       # 后台布局容器（el-container + 侧边栏 + 顶栏 + 主区域）
    │   ├── sideBar.vue            # 左侧菜单（el-menu router 模式 + 折叠切换）
    │   ├── navBar.vue             # 顶部导航栏（折叠按钮 + 用户下拉菜单）
    │   ├── pageHead.vue           # 页面标题栏（标题 + action 插槽）
    │   ├── tableSearch.vue        # 通用搜索表单（动态表单项 + 查询/重置）
    │   └── authLayout.vue         # 登录/注册布局（渐变背景 + 装饰浮动圆）
    └── views/
        ├── login.vue              # 登录页
        ├── register.vue           # 注册页（开发中）
        ├── dashboard.vue          # 数据分析
        ├── knowledge.vue          # 知识文章
        ├── consultations.vue      # 咨询记录
        └── emotional.vue          # 情感分析
```

## 路径别名

- `@` → `./src`，同时配置于 `vite.config.ts`（构建）和 `tsconfig.app.json`（TS 类型检查）

```ts
import Foo from '@/components/Foo.vue'  // 推荐
import Foo from '../components/Foo.vue'  // 也行
```

## 代理配置

Vite dev server 将 `/api/*` 请求代理到 `http://localhost:3000/api/*`，配置在 `vite.config.ts` 的 `server.proxy` 中。

前端通过相对路径 `/api` 作为 axios baseURL，开发时走代理，生产时同域部署或 Nginx 反代。

## TypeScript 配置要点

- `noUnusedLocals: true` — 未使用的局部变量报错
- `noUnusedParameters: true` — 未使用的参数报错
- `erasableSyntaxOnly: true` — 仅允许可擦除的类型语法
- `noFallthroughCasesInSwitch: true` — 禁止 switch 穿透
- `baseUrl: "."` + `paths: { "@/*": ["./src/*"] }` — 路径别名
- 应用代码 extends `@vue/tsconfig/tsconfig.dom.json`

## 类型声明体系

### `src/types/router.d.ts` — 扩展 Vue Router 的 RouteMeta
新增字段 title 和 icon，所有 `route.meta?.title` / `route.meta?.icon` 有类型提示。
新增字段方式：在此文件 `RouteMeta` 接口里加一行即可。

### `src/vite-env.d.ts` — *.vue 模块声明
让 TypeScript 把 `.vue` 文件识别为 Vue 组件，import 时不报错。

## 路由设计

### 路由常量 `ROUTE_NAMES`
在 `router/index.ts` 中导出，全局引用用常量而非硬编码字符串：

```ts
import { ROUTE_NAMES } from '@/router'
router.push({ name: ROUTE_NAMES.dashboard })
```

### 结构
```
/back（父路由；redirect → dashboard）
├── dashboard     # 数据分析
├── knowledge     # 知识文章
├── consultations # 咨询记录
└── emotional     # 情感分析

/auth（父路由）
├── login         # 登录
└── register      # 注册
```

全部使用 `() => import(...)` 懒加载。

## Axios 请求封装

`src/utils/request.ts` — 类型安全的 axios 封装：

- **单泛型调用**：`request.post<LoginResult>('/auth/login', params)` 只需传一个泛型
- **状态码全覆盖**：200/401/403/400/404/500/502/503/504 各有对应处理
- **401 防抖**：并发 401 只跳转一次登录页
- **BusinessError**：携带 `code` 字段，调用方可 `if (error.code === 403)` 做分支
- **登录页路径**：`/auth/login`（常量 `LOGIN_PATH`）

## Pinia Store

### `useAdminStore`（setup function 风格）
| 字段 | 类型 | 说明 |
|------|------|------|
| `isCollapsed` | `Ref<boolean>` | 侧边栏是否折叠 |
| `toggleCollapsed()` | `() => void` | 切换折叠状态 |

新建 store 统一用 setup function 风格（`defineStore('name', () => { ... })`）。

## 组件规范

### 通用模式
- 所有组件使用 `<script setup lang="ts">`
- 样式使用 `<style lang="scss" scoped>`
- Props 定义：
  - 简单类型用 `defineProps<{ x: string }>()` + 默认值用 `withDefaults(...)`
  - 复杂类型用运行时声明 `defineProps({ x: { type: X, default: ... } })` 配合 `PropType`
  - **禁止两种写法混着用**（`defineProps<泛型>({ 对象 })` 会报错）
- Emits 用 `defineEmits(['eventName'])`

### `tableSearch.vue` 的 FormItem 接口
核心四字段（label / prop / comp / placeholder）有类型提示，扩展字段通过 `[key: string]: any` 自由传。`comp` 映射表在 `COMP_MAP` 常量中，新增组件类型加一行即可。

### sideBar 路由查找
**不靠数组下标**，靠 `router.options.routes.find(r => r.name === ROUTE_NAMES.backLayout)` 按 name 定位。路径拼接使用路由对象自身的 `path`，不全写死。

## 代码规范

- 组件命名：PascalCase（如 `sideBar.vue`、`pageHead.vue`）
- 新页面放 `src/views/`，复用组件放 `src/components/`
- import 之间用空行分隔，vue / 第三方 / 内部 逻辑分组
- SCSS 嵌套不超过 3 层
- SCSS 风格约定（参照 `authLayout.vue`、`login.vue`、`register.vue`）：
  - 以组件根元素类名为嵌套入口，子元素写在其内部
  - `&.modifier` 表示同元素追加类名；`&:hover` / `&:active` 表示伪类
  - `:deep(.el-xxx)` 穿透 scoped，修改 Element Plus 内部样式
  - `@keyframes` 放在 SCSS 嵌套之外，不和选择器耦合
  - 每个样式区块用 `// ============ 区块名 ============` 注释分隔
  - 关键 CSS 属性加行内注释说明设计意图
- `!important` 仅用于覆盖第三方 UI 库默认样式（Element Plus），其他地方避免

## 路由路径变更记录

原路径 `/backLayout` → `/back`，`/authLayout` → `/auth`。日志、侧边栏注释、跳转链接均已同步更新。

## Git 仓库

- Remote：`git@github.com:yangYang910aaa/AI-mental-health-assistant.git`
- 默认分支：`main`
