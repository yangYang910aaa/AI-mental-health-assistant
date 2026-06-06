/// <reference types="vite/client" />

// 扩展 Vite 环境变量类型，让 TS 认识自定义的 VITE_* 变量
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// 让 TS 能识别 .vue 文件
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

// @wangeditor/editor-for-vue 的 exports 字段阻止了 TS 解析类型
declare module '@wangeditor/editor-for-vue';
