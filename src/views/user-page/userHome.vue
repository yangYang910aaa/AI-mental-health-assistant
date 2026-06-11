<template>
  <div class="user-home">
    <!-- ==================== 欢迎区 ==================== -->
    <div class="welcome-section">
      <div class="welcome-text">
        <h2 class="greeting">{{ greeting }}，{{ userStore.displayName || '朋友' }}</h2>
        <p class="date">{{ todayStr }}</p>
      </div>
      <div class="daily-quote">
        <el-icon><Sunrise /></el-icon>
        <span>{{ homeData?.dailyQuote || '正在加载…' }}</span>
      </div>
    </div>

    <!-- ==================== 四张统计卡片 ==================== -->
    <div class="stats-row">
      <!-- 今日心情 -->
      <div class="stat-card" :class="{ 'is-empty': !stats.todayMoodScore }" @click="router.push({ name: ROUTE_NAMES.userMood })">
        <div class="stat-icon" style="background: #fef3e2; color: #f5a623">
          <el-icon :size="22"><Sunny /></el-icon>
        </div>
        <div class="stat-body">
          <template v-if="stats.todayMoodScore">
            <span class="stat-value">{{ stats.todayMoodScore }}<small>/10</small></span>
            <span class="stat-tag" :style="{ background: labelColor(stats.todayMoodLabel), color: '#fff' }">{{ stats.todayMoodLabel }}</span>
          </template>
          <template v-else>
            <span class="stat-value empty">未记录</span>
          </template>
          <span class="stat-label">今日心情</span>
        </div>
      </div>

      <!-- 本周记录 -->
      <div class="stat-card" @click="router.push({ name: ROUTE_NAMES.userMood })">
        <div class="stat-icon" style="background: #e8f0e4; color: #8b9e7e">
          <el-icon :size="22"><EditPen /></el-icon>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ stats.weekMoodCount }}<small> 次</small></span>
          <span class="stat-meta">本周心情记录</span>
        </div>
      </div>

      <!-- 本周对话 -->
      <div class="stat-card" @click="router.push({ name: ROUTE_NAMES.userChat })">
        <div class="stat-icon" style="background: #e4eff4; color: #5a8a9a">
          <el-icon :size="22"><ChatDotRound /></el-icon>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ stats.weekChatCount }}<small> 条</small></span>
          <span class="stat-meta">本周对话消息</span>
        </div>
      </div>

      <!-- 本周平均情绪 -->
      <div class="stat-card" @click="router.push({ name: ROUTE_NAMES.userMood })">
        <div class="stat-icon" :style="weekAvgStyle.iconBg">
          <el-icon :size="22"><TrendCharts /></el-icon>
        </div>
        <div class="stat-body">
          <span class="stat-value" :style="{ color: weekAvgStyle.color }">
            {{ stats.weekAvgScore || '—' }}<small v-if="stats.weekAvgScore">/10</small>
          </span>
          <span class="stat-meta">{{ weekAvgStyle.label }}</span>
        </div>
      </div>
    </div>

    <!-- ==================== 情绪趋势 + 最近对话 ==================== -->
    <div class="bottom-row">
      <!-- 最近 7 天情绪趋势 -->
      <div class="section-card trend-section">
        <h3 class="section-title">最近 7 天情绪</h3>
        <v-chart v-if="trendOption" :option="trendOption" style="height: 280px" />
        <div v-else class="empty-tip">暂无情绪数据</div>
      </div>

      <!-- 最近对话 -->
      <div class="section-card chats-section">
        <h3 class="section-title">最近对话</h3>
        <div v-if="homeData?.recentChats?.length" class="chat-list">
          <div
            v-for="chat in homeData.recentChats"
            :key="chat.id"
            class="chat-item"
            @click="router.push({ name: ROUTE_NAMES.userChat })"
          >
            <div class="chat-item-top">
              <span class="chat-title">{{ chat.title }}</span>
              <span class="chat-time">{{ formatTime(chat.lastTime) }}</span>
            </div>
            <p class="chat-preview">{{ chat.lastMessage }}</p>
            <span class="chat-count">{{ chat.messageCount }} 条消息</span>
          </div>
        </div>
        <div v-else class="empty-tip">
          <p>还没有对话记录</p>
          <el-button size="small" type="primary" @click="router.push({ name: ROUTE_NAMES.userChat })">开始第一次对话</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Sunrise, Sunny, EditPen, ChatDotRound, TrendCharts } from '@element-plus/icons-vue'
import VChart from 'vue-echarts'
import { ROUTE_NAMES } from '@/router'
import { useUserStore } from '@/stores/user'
import { getUserHome, type HomeData, type HomeStats } from '@/api/user'
import { MOOD_LABEL_COLORS } from '@/api/emotional'

const router = useRouter()
const userStore = useUserStore()

// 首页数据：包含用户信息、统计信息、最近对话等
const homeData = ref<HomeData | null>(null)

// 默认空统计
const stats = computed<HomeStats>(() => homeData.value?.stats || {
  todayMoodScore: 0, todayMoodLabel: '',
  weekMoodCount: 0, weekChatCount: 0, weekAvgScore: 0,
})

// 日期:xxxx年xx月xx日 星期xx
const todayStr = computed(() => {
  const d = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${week[d.getDay()]}`
})

// 问候语：根据时间返回不同的问候语（4:00-12:00 为上午，12:00-18:00 为下午，18:00-24:00 为晚上）
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

// 本周平均情绪 → 颜色和文案
const weekAvgStyle = computed(() => {
  const s = stats.value.weekAvgScore
  if (!s) return { color: '#9ca3af', label: '暂无数据', iconBg: { background: '#f3f4f6', color: '#9ca3af' } }
  if (s >= 7) return { color: '#52c41a', label: '整体良好', iconBg: { background: '#e8f0e4', color: '#52c41a' } }
  if (s >= 4) return { color: '#faad14', label: '需要关注', iconBg: { background: '#fef3e2', color: '#faad14' } }
  return { color: '#ff4d4f', label: '建议寻求帮助', iconBg: { background: '#fde8e8', color: '#ff4d4f' } }
})

// 情绪标签颜色映射：根据情绪标签返回对应颜色（默认 #8b9e7e）
const labelColor = (label: string) => MOOD_LABEL_COLORS[label] || '#8b9e7e'

// 格式化时间：xx 分钟前 或 xx 小时前 或 xxxx-xx-xx 
const formatTime = (time: string) => {
  const d = new Date(time.replace(' ', 'T'))
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return time.slice(5, 10)
}

// 7 天趋势图配置
const trendOption = computed(() => {
  if (!homeData.value?.recentMoods?.length) return null
  const moods = homeData.value.recentMoods
  return {
    grid: { top: 10, right: 10, bottom: 20, left: 35 },
    xAxis: {
      type: 'category',
      data: moods.map((m) => m.date.slice(5)),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { fontSize: 11, color: '#9ca3af' },
    },
    yAxis: {
      type: 'value', min: 0, max: 10,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { fontSize: 11, color: '#9ca3af' },
    },
    series: [{
      type: 'line',
      data: moods.map((m) => m.score || null),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#8b9e7e', width: 2 },
      itemStyle: { color: '#8b9e7e' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(139,158,126,0.25)' },
            { offset: 1, color: 'rgba(139,158,126,0.02)' },
          ],
        },
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#d4d4d4', type: 'dashed', width: 1 },
        data: [{ yAxis: 6, label: { formatter: '良好线', fontSize: 10, color: '#9ca3af' } }],
      },
    }],
  }
})

// 加载用户首页数据
const loadData = async () => {
  try {
    const userId = userStore.userInfo?.id || 1001
    homeData.value = await getUserHome(userId)
  } catch { 
    homeData.value = null
   }
}

onMounted(() => loadData())
</script>

<style lang="scss" scoped>
.user-home {
  max-width: 1200px;
  margin: 0 auto;

  // ==================== 欢迎区 ====================
  .welcome-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;

    .greeting { 
      font-size: 24px; 
      font-weight: 600; 
      color: #2c3e2d; 
      margin: 0 0 4px; 
    }
    .date { 
      font-size: 14px; 
      color: #9b9b8a; 
      margin: 0; 
    }
    .daily-quote {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 24px; background: #fff;
      border-radius: 12px; font-size: 15px; color: #5a7a4e;
      box-shadow: 0 1px 4px rgba(0,0,0,.04); max-width: 360px;
    }
  }

  // ==================== 统计卡片行 ====================
  .stats-row {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat-card {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 24px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 1px 4px rgba(0,0,0,.04);
    cursor: pointer;
    transition: transform .2s, box-shadow .2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,.08);
    }

    &.is-empty {
      .stat-value.empty { color: #b0ad9f; font-size: 16px; }
    }

    .stat-icon {
      width: 48px; height: 48px;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .stat-body {
      display: flex; 
      flex-direction: column; 
      gap: 2px;
      min-width: 0;

      .stat-value {
        font-size: 24px; font-weight: 700; color: #374151; line-height: 1.2;
        small { font-size: 14px; font-weight: 400; color: #9ca3af; }
      }
      .stat-tag {
        display: inline-block; width: fit-content;
        padding: 2px 10px; border-radius: 8px; font-size: 12px;
      }
      .stat-meta {
        font-size: 13px; color: #9b9b8a;
      }
    }
  }

  // ==================== 趋势 + 对话 ====================
  .bottom-row {
    display: flex;
    gap: 20px;
  }

  .section-card {
    background: #fff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,.04);
    flex: 1;

    .section-title { 
      font-size: 17px; 
      font-weight: 600; 
      color: #374151; 
      margin: 0 0 20px; 
    }
    .empty-tip { 
      text-align: center; 
      padding: 36px; 
      color: #9ca3af; 
      font-size: 14px; 
    }
  }

  .chat-list { 
    display: flex; 
    flex-direction: column; 
    gap: 12px; 
  }

  .chat-item {
    padding: 16px;
    border-radius: 12px;
    border: 1px solid #f0ede6;
    cursor: pointer;
    transition: background .2s;

    &:hover { 
      background: #faf9f7; 
    }

    .chat-item-top {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
      .chat-title { 
        font-size: 15px; 
        font-weight: 500; 
        color: #374151; 
      }
      .chat-time { 
        font-size: 12px; 
        color: #9ca3af; 
      }
    }
    .chat-preview { 
      margin: 0 0 6px; 
      font-size: 14px; color: #6b7280; line-height: 1.6;
      display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .chat-count { 
      font-size: 12px; 
      color: #9ca3af; 
    }
  }
}
</style>
