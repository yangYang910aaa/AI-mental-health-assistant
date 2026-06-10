import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.scss'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import VueECharts from 'vue-echarts'

// ECharts 按需注册（vue-echarts 需要手动注册渲染器和组件）
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent,
  GraphicComponent,
  MarkLineComponent,
  MarkAreaComponent,
  MarkPointComponent,
} from 'echarts/components'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent,
  GraphicComponent,
  MarkLineComponent,
  MarkAreaComponent,
  MarkPointComponent,
])

const app = createApp(App)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册 ECharts 组件（全局可用 <v-chart>）
app.component('v-chart', VueECharts)

app.use(createPinia())
app.use(ElementPlus)
app.use(router)
app.mount('#app')
