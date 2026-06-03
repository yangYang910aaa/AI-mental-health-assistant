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
| 路由 | Vue Router（hash history） | 4.6 |
| CSS | SCSS（`lang="scss" scoped`） | — |
| 图标 | `@element-plus/icons-vue`（全局注册） | ^2.3 |

## 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 类型检查 + 构建（vue-tsc -b && vite build）
pnpm preview      # 预览构建产物
pnpm add <pkg>    # 安装依赖
```

## 目录结构

```
mental-health/
├── index.html                     # 入口 HTML
├── vite.config.ts                 # Vite 配置（插件、@ 别名）
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
    ├── stores/
    │   └── admin.ts               # Pinia store：侧边栏折叠状态
    ├── router/
    │   └── index.ts               # 路由配置（命名路由 + 懒加载 + ROUTE_NAMES 常量）
    ├── components/
    │   ├── backToLayout.vue       # 后台布局容器（el-container + 侧边栏 + 顶栏 + 主区域）
    │   ├── sideBar.vue            # 左侧菜单（el-menu router 模式 + 折叠切换）
    │   ├── navBar.vue             # 顶部导航栏（折叠按钮 + 用户下拉菜单）
    │   ├── pageHead.vue           # 页面标题栏（标题 + action 插槽）
    │   └── tableSearch.vue        # 通用搜索表单（动态表单项 + 查询/重置）
    └── views/
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
/backLayout（父路由；redirect → dashboard）
├── dashboard   # 数据分析
├── knowledge   # 知识文章
├── consultations  # 咨询记录
└── emotional   # 情感分析
```

全部使用 `() => import(...)` 懒加载。

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
- `!important` 仅用于覆盖第三方 UI 库默认样式（Element Plus），其他地方避免

## Git 仓库

- Remote：`git@github.com:yangYang910aaa/AI-mental-health-assistant.git`
- 默认分支：`main`
