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
                <el-select v-model="form.moodTrigger" placeholder="选择或输入" clearable allow-create filterable>
                  <el-option v-for="t in triggerOptions" :key="t" :label="t" :value="t" />
                </el-select>
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
        <div v-if="moodList.length" class="mood-list">
          <div v-for="item in moodList" :key="item.id" class="mood-item">
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
                @click="handleDelete(item.id)"
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { MOOD_LABELS, MOOD_LABEL_COLORS, moodScoreColor, SCORE_MARKS, TRIGGER_OPTIONS } from '@/api/emotional'
import { useUserStore } from '@/stores/user'
import { createMood, getUserMoods, deleteMood, type UserMoodItem } from '@/api/user'

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

// 加载历史记录
const loadHistory = async (page = 1) => {
  try {
    const userId = userStore.userInfo?.id || 1001
    const result = await getUserMoods(userId, page, pageSize)
    moodList.value = result.list
    total.value = result.total
  } catch {
    moodList.value = []
  }
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
      margin: 0 0 16px;
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
