//扩展 Vue Router 的 RouteMeta 接口，声明 title 和 icon 字段
declare module 'vue-router' {
  interface RouteMeta {
    /** 侧边栏/标签页标题 */
    title?: string
    /** Element Plus 图标组件名 */
    icon?: string
    /** 不在侧边栏显示（如个人中心） */
    hidden?: boolean
  }
}

export {}
