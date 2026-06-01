# mental-health

Vue 3 + TypeScript + Vite 前端项目。

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3.5（`<script setup>` SFC） |
| 语言 | TypeScript 6.0 |
| 构建 | Vite 8.0 |
| 包管理 | pnpm |
| 类型检查 | vue-tsc 3.2 |
| CSS | 原生 CSS（支持 light/dark 主题） |

## 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 类型检查 + 构建（vue-tsc -b && vite build）
pnpm preview      # 预览构建产物
```

## 目录结构

```
mental-health/
├── index.html              # 入口 HTML
├── vite.config.ts          # Vite 配置（@vitejs/plugin-vue）
├── tsconfig.json           # TS 项目引用入口
├── tsconfig.app.json       # 应用代码 TS 配置（extends @vue/tsconfig）
├── tsconfig.node.json      # Node 侧 TS 配置（vite.config 等）
├── public/                 # 静态资源（不经过编译）
└── src/
    ├── main.ts             # 应用入口，createApp + mount
    ├── App.vue             # 根组件
    ├── style.css           # 全局样式（CSS 变量 + 主题）
    ├── assets/             # 编译时资源（图片等）
    └── components/         # 组件目录
```

## TypeScript 配置要点

- `noUnusedLocals: true` — 未使用的局部变量报错
- `noUnusedParameters: true` — 未使用的参数报错
- `erasableSyntaxOnly: true` — 仅允许可擦除的类型语法
- `noFallthroughCasesInSwitch: true` — 禁止 switch 穿透
- 应用代码 extends `@vue/tsconfig/tsconfig.dom.json`

## 代码规范

- 使用 `<script setup lang="ts">` 编写 SFC
- CSS 变量定义在 `:root` 中，主题切换通过 `@media (prefers-color-scheme: dark)` 实现
- 组件命名：PascalCase（如 `HelloWorld.vue`）
- 新页面/功能组件放在 `src/components/` 下，复杂时可建子目录
