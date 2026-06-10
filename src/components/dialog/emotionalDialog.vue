<template>
  <el-dialog
    v-model="dialogVisible"
    title="情绪日志详情"
    width="900px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div v-if="detailRow" class="detail-wrap">
      <!-- 用户信息 -->
      <div class="detail-section">
        <h4>用户信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">{{ detailRow.userId }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ detailRow.userName }}</el-descriptions-item>
          <el-descriptions-item label="记录时间">{{ detailRow.createdAt }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 情绪状态 -->
      <div class="detail-section">
        <h4>情绪状态</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="情绪评分">
            <el-rate :model-value="detailRow.moodScore" :max="10" disabled show-score />
          </el-descriptions-item>
          <el-descriptions-item label="情绪标签">
            <el-tag :color="moodColor(detailRow.moodLabel)" effect="dark">{{ detailRow.moodLabel }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="夜间睡眠时长">
            <span class="metric-val">{{ detailRow.sleepDuration }}</span>
            <span class="metric-unit">/12 小时</span>
          </el-descriptions-item>
          <el-descriptions-item label="压力水平">
            <el-progress
              :percentage="detailRow.pressureLevel"
              :color="pressureColor(detailRow.pressureLevel)"
              :stroke-width="8"
            />
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 日志内容 -->
      <div class="detail-section">
        <h4>日志内容</h4>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="情绪触发因素">{{ detailRow.moodTrigger || '无' }}</el-descriptions-item>
          <el-descriptions-item label="记录内容">{{ detailRow.content || '无' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- AI 分析结果 -->
      <div class="detail-section">
        <h4>AI 分析结果</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="主要情绪">
            <el-tag :color="moodColor(detailRow.moodLabel)" effect="dark" size="large">
              {{ detailRow.aiAnalysis.primaryEmotion }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="情绪强度">
            <el-progress
              :percentage="detailRow.aiAnalysis.emotionIntensity"
              :color="moodColor(detailRow.moodLabel)"
              :stroke-width="8"
            />
          </el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <el-tag :type="riskTagType(detailRow.aiAnalysis.riskLevel)" effect="dark">
              {{ detailRow.aiAnalysis.riskLevel }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="情绪性质">
            <el-tag :type="natureTagType(detailRow.aiAnalysis.emotionNature)" effect="dark">
              {{ detailRow.aiAnalysis.emotionNature }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- AI 建议 -->
      <div class="detail-section">
        <h4>风险描述</h4>
        <div class="ai-suggestion-card">
          <p>{{ detailRow.aiSuggestion.riskDescription }}</p>
        </div>
      </div>
      <div class="detail-section">
        <h4>专业建议</h4>
        <div class="ai-suggestion-card">
          <p>{{ detailRow.aiSuggestion.advice }}</p>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button type="primary" @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import type { Emotional } from '@/api/emotional'

const props = defineProps({
  showDetailDialog: {
    type: Boolean,
    default: false,
  },
  detailRow: {
    type: Object as PropType<Emotional>,
    default: null,
  },
})
const emit = defineEmits(['update:showDetailDialog'])
const dialogVisible = computed({
  get: () => props.showDetailDialog,
  set: (val) => emit('update:showDetailDialog', val),
})

// ==================== 工具函数 ====================

// 情绪标签颜色映射
const moodColor = (label: string): string => {
  const map: Record<string, string> = {
    '开心': '#f4a460',
    '平静': '#5d9bdc',
    '焦虑': '#e0a220',
    '悲伤': '#7b8fce',
    '愤怒': '#e85c5c',
    '疲惫': '#9d8bb0',
    '期待': '#5dbd7a',
    '恐惧': '#8b5cf6',
  }
  return map[label] || '#909399'
}

// 压力水平颜色映射
const pressureColor = (val: number): string => {
  if (val <= 30) return '#67c23a'
  if (val <= 60) return '#e6a23c'
  return '#f56c6c'
}

// 风险等级标签类型映射
const riskTagType = (level: string): 'success' | 'warning' | 'danger' | 'info' => {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    '低风险': 'success',
    '中风险': 'warning',
    '高风险': 'danger',
  }
  return map[level] || 'info'
}

// 情绪性质标签类型映射
const natureTagType = (nature: string): 'success' | 'info' | 'danger' => {
  if (nature === '正面情绪') return 'success'
  if (nature === '中性情绪') return 'info'
  return 'danger'
}
</script>

<style scoped lang="scss">
// ==================== 区块标题 ====================

.detail-section {
  margin-bottom: 20px;

  h4 {
    margin: 0 0 10px;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    padding-left: 10px;
    border-left: 3px solid #626aef;
  }
}

// ==================== 度量值 ====================

.metric-val {
  font-weight: 700;
  font-size: 16px;
  color: #303133;
}

.metric-unit {
  font-size: 12px;
  color: #909399;
  margin-left: 2px;
}

// ==================== AI 建议卡片 ====================

.ai-suggestion-card {
  background: linear-gradient(135deg, #f5f3ff 0%, #faf8ff 100%);
  border: 1px solid #e8e4f0;
  border-radius: 8px;
  padding: 20px 24px;

  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.8;
    color: #4a4458;
  }
}

// ==================== Element Plus 弹窗 ====================

:deep(.el-dialog__header) {
  border-bottom: 1px solid #f0ebe0;
  padding: 18px 24px 14px;

  .el-dialog__title {
    font-size: 17px;
    font-weight: 600;
    color: #5d4037;
  }
}

:deep(.el-dialog__body) {
  padding: 16px 24px 24px;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
  color: #606266;
}
</style>
