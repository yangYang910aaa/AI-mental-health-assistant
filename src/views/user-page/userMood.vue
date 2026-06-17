<template>
  <div class="user-mood">
    <h2 class="page-title">心情记录</h2>

    <!-- ==================== 记录表单 ==================== -->
    <div class="mood-form-card">
        <h3 class="form-title">记录此刻心情</h3>
        <el-form :model="form" label-position="top" class="mood-form">
          <!-- 情绪评分 -->
          <el-form-item label="情绪评分" style="margin-bottom: 35px;">
            <el-slider v-model="form.moodScore" :min="1" :max="10" show-input :marks="scoreMarks" />
          </el-form-item>

          <!-- 情绪标签 -->
          <el-form-item label="情绪标签" >
            <div class="label-options">
              <span
                v-for="label in MOOD_LABELS"
                :key="label"
                class="label-chip"
                :class="{ active: form.moodLabel === label }"
                :style="form.moodLabel === label ? { background: labelColor(label), color: '#fff', borderColor: labelColor(label) } : {}"
                @click="form.moodLabel = label"
              >
                {{ label }}
              </span>
            </div>
          </el-form-item>

          <!-- 触发因素 + 睡眠 -->
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="触发因素（选填）">
                <el-autocomplete
                  v-model="form.moodTrigger"
                  placeholder="选择或输入"
                  clearable
                  :fetch-suggestions="filterTriggers"
                  :trigger-on-focus="true"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="睡眠时长（小时）">
                <el-input-number v-model="form.sleepDuration" :min="0" :max="24" :step="0.5" :precision="1" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <!-- 压力水平 -->
          <el-form-item label="压力水平（0-100）">
            <el-slider v-model="form.pressureLevel" :min="0" :max="100" show-input />
          </el-form-item>

          <!-- 记录内容 -->
          <el-form-item label="记录内容">
            <el-input v-model="form.content" type="textarea" :rows="3" placeholder="写下你想记录的任何事情…" />
          </el-form-item>

          <el-button type="primary" :loading="submitting" @click="handleSubmit" class="submit-btn">
            {{ submitting ? '记录中…' : '保存记录' }}
          </el-button>
        </el-form>
      </div>

      <!-- ==================== 历史记录 ==================== -->
      <div class="mood-history">
        <h3 class="history-title">历史记录</h3>

        <!-- 情绪标签筛选 -->
        <div class="label-filter">
          <span
            v-for="label in MOOD_LABELS"
            :key="label"
            class="filter-chip"
            :class="{ active: selectedLabel === label }"
            :style="selectedLabel === label ? { background: labelColor(label), color: '#fff', borderColor: labelColor(label) } : {}"
            @click="onLabelFilter(label)"
          >
            {{ label }}
          </span>
        </div>

        <div v-if="moodList.length" class="mood-list">
          <div v-for="item in moodList" :key="item.id" class="mood-item" @click="openDetail(item.id)">
            <div class="mood-item-left">
              <span class="mood-score-dot" :style="{ background: moodColor(item.moodScore) }">{{ item.moodScore }}</span>
              <span class="mood-label-tag" :style="{ background: labelColor(item.moodLabel), color: '#fff' }">
                {{ item.moodLabel }}
              </span>
            </div>
            <div class="mood-item-content">
              <p>{{ item.content || '（无文字记录）' }}</p>
              <span class="mood-item-time">{{ item.createdAt }}</span>
            </div>
            <el-tooltip content="删除" placement="top">
              <el-button
                class="mood-item-delete"
                type="danger"
                :icon="Delete"
                circle
                :loading="deletingId === item.id"
                @click.stop="handleDelete(item.id)"
              />
            </el-tooltip>
          </div>
        </div>
        <div v-else class="empty-history">还没有心情记录，记录第一条吧</div>

        <div v-if="total > pageSize" class="pagination-wrap">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="total"
            :page-size="pageSize"
            v-model:current-page="currentPage"
            @current-change="loadHistory"
          />
        </div>
      </div>

      <!-- ==================== 详情弹窗 ==================== -->
      <el-dialog v-model="detailVisible" width="440px" destroy-on-close :show-close="true" class="mood-detail-dialog">
        <template #header>
          <span class="dialog-header-text" >心情记录详情</span>
        </template>

        <div v-loading="detailLoading" class="detail-body" v-if="detailRecord">
          <!-- ===== 情绪仪表盘 ===== -->
          <div class="mood-hero">
            <div
              class="mood-score-ring"
              :style="{
                '--ring-color': moodColor(detailRecord.moodScore),
                '--ring-bg': moodColor(detailRecord.moodScore) + '22',
              }"
            >
              <span class="score-number">{{ detailRecord.moodScore }}</span>
              <span class="score-divider">/</span>
              <span class="score-total">10</span>
            </div>
            <span
              class="mood-label-badge"
              :style="{ background: labelColor(detailRecord.moodLabel), color: '#fff' }"
            >
              {{ detailRecord.moodLabel }}
            </span>
          </div>

          <!-- ===== 信息卡片网格 ===== -->
          <div class="info-grid">
            <div class="info-card">
              <div class="info-icon">🌙</div>
              <div class="info-body">
                <span class="info-label">睡眠时长</span>
                <span class="info-number">{{ detailRecord.sleepDuration }}<small> 小时</small></span>
              </div>
            </div>
            <div class="info-card">
              <div class="info-icon">⚡</div>
              <div class="info-body">
                <span class="info-label">压力水平</span>
                <span class="info-number">{{ detailRecord.pressureLevel }}<small> / 100</small></span>
              </div>
              <el-progress
                :percentage="detailRecord.pressureLevel"
                :show-text="false"
                :stroke-width="4"
                :color="detailRecord.pressureLevel > 70 ? '#e57373' : detailRecord.pressureLevel > 40 ? '#f4a460' : '#6b9e7e'"
                class="info-progress"
              />
            </div>
            <div class="info-card" v-if="detailRecord.moodTrigger">
              <div class="info-icon">🎯</div>
              <div class="info-body">
                <span class="info-label">触发因素</span>
                <span class="info-value">{{ detailRecord.moodTrigger }}</span>
              </div>
            </div>
            <div class="info-card">
              <div class="info-icon">🕐</div>
              <div class="info-body">
                <span class="info-label">记录时间</span>
                <span class="info-value">{{ detailRecord.createdAt }}</span>
              </div>
            </div>
          </div>

          <!-- ===== 记录内容卡片 ===== -->
          <div class="content-card" v-if="detailRecord.content">
            <div class="content-card-header">
              <span class="content-icon">💬</span>
              <span>记录内容</span>
            </div>
            <p class="content-text">{{ detailRecord.content }}</p>
          </div>
        </div>
      </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { MOOD_LABELS, MOOD_LABEL_COLORS, moodScoreColor, SCORE_MARKS, TRIGGER_OPTIONS } from '@/api/emotional'
import { useUserStore } from '@/stores/user'
import { createMood, getUserMoods, getUserMoodDetail, deleteMood, type UserMoodItem, type UserMoodDetail } from '@/api/user'

const userStore = useUserStore()

// ==================== 表单状态 ====================
const form = reactive({
  moodScore: 5,
  moodLabel: '平静',
  content: '',
  moodTrigger: '',
  sleepDuration: 7,
  pressureLevel: 30,
})
//提交中:
const submitting = ref(false)

// 要删除的记录ID
const deletingId = ref(0)

// 情绪评分滑块标记
const scoreMarks = SCORE_MARKS

// 触发因素选项
const triggerOptions = TRIGGER_OPTIONS

// 触发因素自动补全：只返回匹配的已有选项，不显示原始输入文字
const filterTriggers = (queryString: string, cb: (results: Array<{ value: string }>) => void) => {
  const q = queryString.trim().toLowerCase()
  cb(
    q
      ? triggerOptions.filter((t) => t.toLowerCase().includes(q)).map((t) => ({ value: t }))
      : triggerOptions.map((t) => ({ value: t })),
  )
}

// 情绪标签颜色映射
const moodColor = moodScoreColor

// 情绪标签颜色映射
const labelColor = (label: string) => MOOD_LABEL_COLORS[label] || '#8b9e7e'


// ==================== 历史列表 ====================
const moodList = ref<UserMoodItem[]>([])
// 总记录数:用于分页
const total = ref(0)
// 当前页码
const currentPage = ref(1)
// 每页记录数
const pageSize = 10
// 当前选中的情绪标签筛选（空 = 全部）
const selectedLabel = ref('')

// 加载历史记录
const loadHistory = async (page = 1) => {
  try {
    const userId = userStore.userInfo?.id || 1001
    const result = await getUserMoods(userId, page, pageSize, selectedLabel.value || undefined)
    moodList.value = result.list
    total.value = result.total
  } catch {
    moodList.value = []
  }
}

// 切换标签筛选
const onLabelFilter = (label: string) => {
  selectedLabel.value = selectedLabel.value === label ? '' : label
  currentPage.value = 1
  loadHistory(1)
}

// ==================== 提交 ====================
const handleSubmit = async () => {
  if (!form.moodLabel) {
    ElMessage.warning('请选择情绪标签')
    return
  }
  submitting.value = true
  try {
    await createMood({
      userId: userStore.userInfo?.id || 1001,
      userName: userStore.displayName || '用户',
      moodScore: form.moodScore,
      moodLabel: form.moodLabel,
      moodTrigger: form.moodTrigger || undefined,
      sleepDuration: form.sleepDuration,
      pressureLevel: form.pressureLevel,
      content: form.content,
    })
    ElMessage.success('心情记录成功')
    // 重置表单部分字段
    form.content = ''
    form.moodTrigger = ''
    currentPage.value = 1
    await loadHistory(1)
  } catch {
    // 错误由拦截器处理
  } finally {
    submitting.value = false
  }
}
// ==================== 详情弹窗 ====================
const detailVisible = ref(false)
const detailRecord = ref<UserMoodDetail | null>(null)
const detailLoading = ref(false)

const openDetail = async (id: number) => {
  detailVisible.value = true
  detailLoading.value = true
  detailRecord.value = null
  try {
    detailRecord.value = await getUserMoodDetail(id)
  } catch {
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

// ==================== 删除 ====================
const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这条心情记录吗？', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return // 取消
  }
  
  deletingId.value = id
  try {
    await deleteMood(id)
    ElMessage.success('删除成功')

    // 如果当前页只剩一条且不是第一页，回到上一页
    if (moodList.value.length === 1 && currentPage.value > 1) {
      currentPage.value--
    }
    await loadHistory(currentPage.value)
  } catch {
    // 错误由拦截器处理
  } finally {
    deletingId.value = 0
  }
}

// ==================== 初始化 ====================
onMounted(() => loadHistory())

</script>

<style lang="scss" scoped>
.user-mood {
  max-width: 900px;
  margin: 0 auto;

  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: #2c3e2d;
    margin: 0 0 20px;
  }

  // ==================== 表单卡片 ====================
  .mood-form-card {
    background: #fff;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    margin-bottom: 24px;

    // 表单标签加深
    :deep(.el-form-item__label) {
      color: #374151;
      font-weight: 500;
    }

    // 表单项间距加大
    :deep(.el-form-item) {
      margin-bottom: 24px;
    }

    .form-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 20px;
    }
  }

  .label-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .label-chip {
      padding: 6px 16px;
      border-radius: 20px;
      border: 1px solid #e5e7eb;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
      color: #6b7280;
      &:hover { 
        border-color: #8b9e7e; 
        color: #8b9e7e; 
      }
    }
  }

  .submit-btn {
    border-radius: 10px;
    background: #8b9e7e;
    border-color: #8b9e7e;
    &:hover {
      background: #7a8e6f !important;
      border-color: #7a8e6f !important;
    }
  }

  // ==================== 历史记录 ====================
  .mood-history {
    .history-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 14px;
    }

    .label-filter {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;

      .filter-chip {
        padding: 5px 14px;
        border-radius: 16px;
        font-size: 13px;
        color: #6b7280;
        background: #f3f4f6;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.2s;
        user-select: none;

        &:hover {
          background: #e5e7eb;
          color: #374151;
        }

        &.active {
          font-weight: 500;
        }
      }
    }
  }

  .mood-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .mood-item {
    display: flex;
    gap: 14px;
    padding: 14px 18px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    cursor: pointer;
    transition: box-shadow 0.2s;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .mood-item-delete {
      opacity: 0;
      transition: opacity 0.2s;
      flex-shrink: 0;
      align-self: center;
    }
    &:hover .mood-item-delete {
      opacity: 1;
    }

    .mood-item-left {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;

      .mood-score-dot {
        width: 32px; 
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 13px;
        font-weight: 600;
      }
      .mood-label-tag {
        padding: 1px 8px;
        border-radius: 8px;
        font-size: 11px;
      }
    }

    .mood-item-content {
      flex: 1;
      p { 
        margin: 0; 
        font-size: 14px; 
        color: #374151; 
        line-height: 1.5; }
      .mood-item-time { 
        font-size: 12px; 
        color: #9ca3af; 
        margin-top: 4px; 
        display: inline-block; }
    }
  }

  .empty-history {
    text-align: center;
    padding: 32px;
    color: #9ca3af;
    font-size: 14px;
  }

  .pagination-wrap {
    margin-top: 16px;
    display: flex;
    justify-content: center;
  }
}
</style>

<style scoped lang="scss">
// ==================== 详情弹窗 ====================
.dialog-header-text{
  font-size: 16px;
  font-weight: 600;
  color: #2c3e2d;
}
.detail-body {
  padding: 0 4px;
}

// ===== 情绪仪表盘 =====
.mood-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 0 24px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #f8faf8 0%, #f0f5f0 100%);
  border-radius: 16px;
}

.mood-score-ring {
  width: 108px;
  height: 108px;
  border-radius: 50%;
  background: var(--ring-bg, #e8f5e9);
  border: 5px solid var(--ring-color, #6b9e7e);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

  .score-number {
    font-size: 42px;
    font-weight: 700;
    color: var(--ring-color, #6b9e7e);
    line-height: 1;
  }

  .score-divider {
    font-size: 20px;
    color: #b0b8b0;
    margin: 0 3px;
  }

  .score-total {
    font-size: 20px;
    color: #888;
    font-weight: 500;
  }
}

.mood-label-badge {
  padding: 8px 24px;
  border-radius: 22px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
}

// ===== 信息卡片网格 =====
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.info-card {
  background: #fafbfc;
  border: 1px solid #f0f0f2;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .info-icon {
    font-size: 24px;
    margin-bottom: 4px;
  }

  .info-body {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .info-label {
      font-size: 13px;
      color:#888;
      letter-spacing: 0.5px;
    }

    .info-number {
      font-size: 24px;
      font-weight: 700;
      color: #303133;

      small {
        font-size: 14px;
        font-weight: 400;
        color: #999;
      }
    }

    .info-value {
      font-size: 15px;
      color: #374151;
      font-weight: 500;
      word-break: break-all;
    }
  }

  .info-progress {
    margin-top: 4px;
  }
}

// ===== 记录内容卡片 =====
.content-card {
  background: linear-gradient(135deg, #faf9ff 0%, #f5f3ff 100%);
  border: 1px solid #ede9fe;
  border-radius: 14px;
  padding: 20px;

  .content-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    color: #6b5e9e;
    margin-bottom: 12px;
    font-weight: 600;

    .content-icon {
      font-size: 20px;
    }
  }

  .content-text {
    margin: 0;
    font-size: 15px;
    color: #374151;
    line-height: 1.8;
    white-space: pre-wrap;
  }
}
</style>
