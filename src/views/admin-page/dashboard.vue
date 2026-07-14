<template>
  <div>
    <pageHead title="数据分析" />

    <!-- KPI 卡片 -->
    <el-row :gutter="16" class="kpi-row">
      <el-col :xs="12" :sm="8" :md="4" v-for="card in kpiCards" :key="card.label">
        <div class="kpi-card" :class="{ 'kpi-card--alert': card.alert }" :style="{ borderLeftColor: card.color }">
          <div class="kpi-icon" :style="{ background: card.color }">
            <el-icon :size="22"><component :is="card.icon" /></el-icon>
          </div>
          <div class="kpi-text">
            <div class="kpi-label">{{ card.label }}</div>
            <div class="kpi-value">
              {{ card.value }}<span v-if="card.suffix" class="kpi-suffix">{{ card.suffix }}</span>
            </div>
            <div class="kpi-sub" :class="{ 'kpi-sub--hi': card.subHi }">{{ card.sub }}</div>
            <div v-if="card.progress != null" class="kpi-bar">
              <div class="kpi-bar-fill" :style="{ width: card.progress + '%', background: card.progressColor || card.color }" />
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 情绪趋势 + 情绪分布 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="24" :md="16">
        <div class="chart-card">
          <div class="chart-header">
            <h4>情绪趋势</h4>
            <el-radio-group v-model="moodRange" size="small" @change="loadMoodTrend">
              <el-radio-button value="7d">近7天</el-radio-button>
              <el-radio-button value="30d">近30天</el-radio-button>
              <el-radio-button value="90d">近3月</el-radio-button>
            </el-radio-group>
          </div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot" style="background: rgba(103,194,58,0.35)"></span>良好 7–10</span>
            <span class="legend-item"><span class="legend-dot" style="background: rgba(230,162,60,0.35)"></span>一般 4–6</span>
            <span class="legend-item"><span class="legend-dot" style="background: rgba(245,108,108,0.35)"></span>关注 1–3</span>
          </div>
          <v-chart :option="moodTrendOption" style="height: 300px" />
        </div>
      </el-col>
      <el-col :span="24" :md="8">
        <div class="chart-card">
          <h4>情绪分布</h4>
          <v-chart :option="emotionDistOption" style="height: 320px" />
        </div>
      </el-col>
    </el-row>

    <!-- 咨询趋势 + 风险分布 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="24" :md="16">
        <div class="chart-card">
          <div class="chart-header">
            <h4>咨询会话趋势</h4>
            <el-radio-group v-model="consultationRange" size="small" @change="loadConsultationTrend">
              <el-radio-button value="7d">近7天</el-radio-button>
              <el-radio-button value="30d">近30天</el-radio-button>
              <el-radio-button value="90d">近3月</el-radio-button>
            </el-radio-group>
          </div>
          <v-chart :option="consultationTrendOption" style="height: 300px" />
        </div>
      </el-col>
      <el-col :span="24" :md="8">
        <div class="chart-card">
          <h4>风险等级分布</h4>
          <v-chart :option="riskDistOption" style="height: 300px" />
        </div>
      </el-col>
    </el-row>

    <!-- 用户活跃度 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="24">
        <div class="chart-card">
          <div class="chart-header">
            <h4>用户活跃度趋势</h4>
            <el-radio-group v-model="activityRange" size="small" @change="loadActivityTrend">
              <el-radio-button value="7d">近7天</el-radio-button>
              <el-radio-button value="30d">近30天</el-radio-button>
              <el-radio-button value="90d">近3月</el-radio-button>
            </el-radio-group>
          </div>
          <v-chart :option="userActivityOption" style="height: 280px" />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { User, UserFilled, Notebook, ChatLineSquare, Sunny, Warning } from '@element-plus/icons-vue'
import pageHead from '@/components/admin-page/pageHead.vue'
import { getDashboardData } from '@/api/dashboard'
import type { DashboardData } from '@/api/dashboard'
import { MOOD_LABEL_COLORS } from '@/api/emotional'

type RangeKey = '7d' | '30d' | '90d'

/** ECharts axis tooltip formatter 入参（trigger: 'axis'） */
type TooltipAxisParam = { marker: string; axisValue: string; value: number }

/** ECharts item tooltip formatter 入参（trigger: 'item'） */
type TooltipItemParam = { marker: string; name: string; value: number; percent: string }

// ==================== KPI + 分布数据（不随范围变化） ====================
const kpiData = ref<DashboardData>()

// ==================== 三个趋势各自独立 ====================
const moodRange = ref<RangeKey>('30d')
const moodTrendData = ref<DashboardData['moodTrend']>([])

const consultationRange = ref<RangeKey>('30d')
const consultationTrendData = ref<DashboardData['consultationTrend']>([])

const activityRange = ref<RangeKey>('30d')
const activityTrendData = ref<DashboardData['userActivityTrend']>([])

// 首次加载
const initLoad = async () => {
  try {
    const result = await getDashboardData('30d')
    kpiData.value = result
    moodTrendData.value = result.moodTrend
    consultationTrendData.value = result.consultationTrend
    activityTrendData.value = result.userActivityTrend
  } catch { /* 拦截器已提示 */ }
}

// 各趋势独立刷新
const loadMoodTrend = async () => {
  try {
    const result = await getDashboardData(moodRange.value)
    moodTrendData.value = result.moodTrend
  } catch { /* 拦截器已提示 */ }
}
const loadConsultationTrend = async () => {
  try {
    const result = await getDashboardData(consultationRange.value)
    consultationTrendData.value = result.consultationTrend
  } catch { /* 拦截器已提示 */ }
}
const loadActivityTrend = async () => {
  try {
    const result = await getDashboardData(activityRange.value)
    activityTrendData.value = result.userActivityTrend
  } catch { /* 拦截器已提示 */ }
}

// ==================== KPI 卡片配置 ====================
const kpiCards = computed(() => {
  if (!kpiData.value) return []
  const d = kpiData.value
  const activeRate = d.totalUsers > 0 ? Math.round((d.activeUsers / d.totalUsers) * 100) : 0
  const riskRate = d.emotionalLogs.total > 0 ? Math.round((d.highRiskCount / d.emotionalLogs.total) * 100) : 0
  return [
    { label: '总用户数',     value: d.totalUsers.toLocaleString(), suffix: '', sub: '累计注册用户',     subHi: false, icon: User,           color: '#626aef', alert: false, progress: null },
    { label: '活跃用户',     value: d.activeUsers,  suffix: '', sub: `活跃率 ${activeRate}%`, subHi: false, icon: UserFilled,     color: '#5dbd7a', alert: false, progress: activeRate, progressColor: '#5dbd7a' },
    { label: '情绪日志',     value: d.emotionalLogs.total, suffix: '', sub: `今日新增：${d.emotionalLogs.todayNew}`, subHi: true, icon: Notebook,       color: '#f4a460', alert: false, progress: null },
    { label: '咨询会话',     value: d.consultations.total, suffix: '', sub: `今日新增：${d.consultations.todayNew}`, subHi: true, icon: ChatLineSquare, color: '#5d9bdc', alert: false, progress: null },
    { label: '平均情绪',     value: d.avgMoodScore, suffix: '/10', sub: d.avgMoodScore >= 7 ? '整体情绪良好' : d.avgMoodScore >= 5 ? '整体情绪一般' : '整体情绪偏低', subHi: false, icon: Sunny, color: '#e0a220', alert: false, progress: d.avgMoodScore * 10, progressColor: d.avgMoodScore >= 7 ? '#67c23a' : d.avgMoodScore >= 5 ? '#e6a23c' : '#f56c6c' },
    { label: '高风险',       value: d.highRiskCount, suffix: '', sub: `占比 ${riskRate}%`, subHi: true, icon: Warning, color: '#e85c5c', alert: true,  progress: riskRate, progressColor: '#e85c5c' },
  ]
})

// ==================== 情绪趋势折线图 ====================
const moodTrendOption = computed(() => {
  const trend = moodTrendData.value
  if (!trend.length) return {}
  const values = trend.map((t) => t.value)
  const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
  return {
    toolbox: { feature: { saveAsImage: { title: '保存' } }, right: 12, top: 4 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e4e7ed',
      textStyle: { color: '#303133', fontSize: 12 },
      formatter: (params: TooltipAxisParam[]) => {
        const p = params[0]
        return `<strong>${p.axisValue}</strong><br/>情绪指数：<b style="color:#626aef">${p.value}/10</b>`
      },
    },
    grid: { left: 44, right: 52, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: trend.map((t) => t.date.slice(5)),
      axisLabel: { fontSize: 10, color: '#909399', interval: 'auto' },
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value', min: 1, max: 10, interval: 1,
      name: '分', nameTextStyle: { fontSize: 11, color: '#909399' },
      axisLabel: { fontSize: 11, color: '#909399' },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
    },
    series: [{
        type: 'line', data: values, smooth: true,
        symbol: 'emptyCircle', symbolSize: 8,
        lineStyle: { color: '#626aef', width: 2.5 },
        itemStyle: { color: '#626aef', borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(98,106,239,0.2)' },
              { offset: 1, color: 'rgba(98,106,239,0.02)' },
            ],
          },
        },
        markArea: {
          silent: true,
          data: [
            [{ yAxis: 7, itemStyle: { color: 'rgba(103,194,58,0.15)' } }, { yAxis: 10 }],
            [{ yAxis: 4, itemStyle: { color: 'rgba(230,162,60,0.15)' } }, { yAxis: 7 }],
            [{ yAxis: 1, itemStyle: { color: 'rgba(245,108,108,0.15)' } }, { yAxis: 4 }],
          ],
        },
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: '#e0a220', type: 'dashed', width: 1.5 },
          label: { show: true, position: 'insideEndTop', formatter: `均 ${avg}`, fontSize: 10, color: '#e0a220', backgroundColor: '#fff', padding: [2, 5], borderRadius: 3 },
          data: [{ type: 'average', name: '均值' }],
        },
      markPoint: {
        data: [
          {
            name: '最新',
            coord: [trend[trend.length - 1].date.slice(5), values[values.length - 1]],
            value: values[values.length - 1],
            symbol: 'pin',
            symbolSize: 42,
            itemStyle: { color: '#626aef' },
            label: { show: true, formatter: '最新\n{c}', fontSize: 10, fontWeight: 'bold', color: '#fff', lineHeight: 13 },
          },
        ],
      },
    }],
  }
})

// ==================== 情绪分布环形图 ====================
const emotionDistOption = computed(() => {
  if (!kpiData.value) return {}
  const dist = kpiData.value.emotionDistribution
  const colors = MOOD_LABEL_COLORS
  const total = dist.reduce((s, d) => s + d.count, 0)
  return {
    toolbox: { feature: { saveAsImage: { title: '保存' } }, right: 8, top: 4 },
    tooltip: {
      trigger: 'item',
      formatter: (p: TooltipItemParam) => `${p.marker} ${p.name}：<b>${p.value}</b> 条（${p.percent}%）`,
    },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    graphic: {
      type: 'text',
      left: 'center',
      top: '38%',
      style: {
        text: `共\n${total} 条`,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 'bold',
        color: '#303133',
        lineHeight: 18,
      },
    },
    series: [{
      type: 'pie', radius: ['50%', '75%'], center: ['50%', '46%'],
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: true, position: 'outside', formatter: '{b}', fontSize: 10, color: '#606266' },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' }, scaleSize: 6 },
      data: dist.map((d) => ({ name: d.label, value: d.count, itemStyle: { color: colors[d.label] || '#909399' } })),
    }],
  }
})

// ==================== 风险分布环形图 ====================
const riskDistOption = computed(() => {
  if (!kpiData.value) return {}
  const dist = kpiData.value.riskDistribution
  const colors: Record<string, string> = { '低风险': '#5dbd7a', '中风险': '#e0a220', '高风险': '#e85c5c' }
  const high = dist.find((d) => d.label === '高风险')?.count || 0
  return {
    toolbox: { feature: { saveAsImage: { title: '保存' } }, right: 8, top: 4 },
    tooltip: {
      trigger: 'item',
      formatter: (p: TooltipItemParam) => `${p.marker} ${p.name}：<b>${p.value}</b> 条（${p.percent}%）`,
    },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    graphic: {
      type: 'text',
      left: 'center',
      top: '38%',
      style: {
        text: `${high}\n高风险`,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 'bold',
        color: high > 0 ? '#e85c5c' : '#303133',
        lineHeight: 18,
      },
    },
    series: [{
      type: 'pie', radius: ['50%', '75%'], center: ['50%', '46%'],
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: true, position: 'outside', formatter: '{b}', fontSize: 10, color: '#606266' },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' }, scaleSize: 6 },
      data: dist.map((d) => ({ name: d.label, value: d.count, itemStyle: { color: colors[d.label] || '#909399' } })),
    }],
  }
})

// ==================== 咨询趋势柱状图 ====================
const consultationTrendOption = computed(() => {
  const trend = consultationTrendData.value
  if (!trend.length) return {}
  const values = trend.map((t) => t.value)
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  return {
    toolbox: { feature: { saveAsImage: { title: '保存' } }, right: 8, top: 4 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e4e7ed',
      textStyle: { color: '#303133', fontSize: 12 },
      formatter: (params: TooltipAxisParam[]) => {
        const p = params[0]
        const diff = p.value - avg
        const diffStr = diff >= 0 ? `+${diff}` : `${diff}`
        const diffColor = diff >= 0 ? '#67c23a' : '#f56c6c'
        return `<strong>${p.axisValue}</strong><br/>咨询量：<b>${p.value} 次</b><br/>较均值：<span style="color:${diffColor}">${diffStr}</span>`
      },
    },
    grid: { left: 48, right: 52, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: trend.map((t) => t.date.slice(5)),
      axisLabel: { fontSize: 10, color: '#909399', interval: 'auto' },
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: '次', nameTextStyle: { fontSize: 11, color: '#909399' },
      axisLabel: { fontSize: 11, color: '#909399' },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
    },
    series: [{
      type: 'bar', data: values, barWidth: '55%',
      itemStyle: { color: '#5d9bdc', borderRadius: [6, 6, 0, 0] },
      emphasis: { itemStyle: { color: '#4090d0' } },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: '#f56c6c', type: 'dashed', width: 1.5 },
        label: { show: true, position: 'insideEndTop', formatter: `均 ${avg}`, fontSize: 10, color: '#f56c6c', backgroundColor: '#fff', padding: [2, 5], borderRadius: 3 },
        data: [{ type: 'average', name: '均值' }],
      },
      markPoint: {
        data: [{
          name: '最新',
          coord: [trend[trend.length - 1].date.slice(5), values[values.length - 1]],
          value: values[values.length - 1],
          symbol: 'pin',
          symbolSize: 42,
          itemStyle: { color: '#5d9bdc' },
          label: { show: true, formatter: '最新\n{c}', fontSize: 10, fontWeight: 'bold', color: '#fff', lineHeight: 13 },
        }],
      },
    }],
  }
})

// ==================== 用户活跃度趋势 ====================
const userActivityOption = computed(() => {
  const trend = activityTrendData.value
  if (!trend.length) return {}
  const values = trend.map((t) => t.value)
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  return {
    toolbox: { feature: { saveAsImage: { title: '保存' } }, right: 8, top: 4 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e4e7ed',
      textStyle: { color: '#303133', fontSize: 12 },
      formatter: (params: TooltipAxisParam[]) => {
        const p = params[0]
        const diff = p.value - avg
        const diffStr = diff >= 0 ? `+${diff}` : `${diff}`
        const diffColor = diff >= 0 ? '#67c23a' : '#f56c6c'
        return `<strong>${p.axisValue}</strong><br/>活跃用户：<b style="color:#5dbd7a">${p.value} 人</b><br/>较均值：<span style="color:${diffColor}">${diffStr}</span>`
      },
    },
    grid: { left: 44, right: 52, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: trend.map((t) => t.date.slice(5)),
      axisLabel: { fontSize: 10, color: '#909399', interval: 'auto' },
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: '人', nameTextStyle: { fontSize: 11, color: '#909399' },
      axisLabel: { fontSize: 11, color: '#909399' },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
    },
    series: [{
      type: 'line', data: values, smooth: true,
      symbol: 'emptyCircle', symbolSize: 6,
      lineStyle: { color: '#5dbd7a', width: 2.5 },
      itemStyle: { color: '#5dbd7a', borderColor: '#fff', borderWidth: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(93,189,122,0.22)' },
            { offset: 1, color: 'rgba(93,189,122,0.02)' },
          ],
        },
      },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: '#f4a460', type: 'dashed', width: 1.5 },
        label: { show: true, position: 'insideEndTop', formatter: `均 ${avg}`, fontSize: 10, color: '#f4a460', backgroundColor: '#fff', padding: [2, 5], borderRadius: 3 },
        data: [{ type: 'average', name: '均值' }],
      },
      markPoint: {
        data: [{
          name: '最新',
          coord: [trend[trend.length - 1].date.slice(5), values[values.length - 1]],
          value: values[values.length - 1],
          symbol: 'pin',
          symbolSize: 42,
          itemStyle: { color: '#5dbd7a' },
          label: { show: true, formatter: '最新\n{c}', fontSize: 10, fontWeight: 'bold', color: '#fff', lineHeight: 13 },
        }],
      },
    }],
  }
})

// ==================== 初始化 ====================
onMounted(() => {
  initLoad()
})
</script>

<style lang="scss" scoped>
.kpi-row { margin-bottom: 16px; }

.kpi-card {
  background: #fff;
  border-radius: 8px;
  border-left: 3px solid;
  padding: 18px 16px 14px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  margin-bottom: 12px;
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1); }

  &.kpi-card--alert {
    background: #fef5f5;
    border-left-color: #e85c5c !important;
  }
}

.kpi-icon {
  width: 44px; height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.kpi-text { overflow: hidden; }

.kpi-label { font-size: 13px; color: #909399; margin-bottom: 2px; }

.kpi-value { font-size: 24px; font-weight: 700; color: #303133; line-height: 1.2; }

.kpi-suffix { font-size: 13px; font-weight: 500; color: #67c23a; margin-left: 2px; }

.kpi-sub { font-size: 12px; color: #b0b0b0; margin-top: 2px; }

.kpi-sub--hi { color: #e0a220; font-weight: 600; }

.kpi-bar {
  margin-top: 6px;
  height: 4px;
  border-radius: 2px;
  background: #f0f0f0;
  overflow: hidden;
}

.kpi-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
}

.chart-row { margin-bottom: 16px; }

.chart-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  margin-bottom: 12px;

  h4 { margin: 0; font-size: 15px; font-weight: 600; color: #303133; }
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.chart-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  font-size: 11px;
  color: #606266;
  padding: 0 0 6px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}
</style>
