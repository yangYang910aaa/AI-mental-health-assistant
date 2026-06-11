<template>
  <div>
    <pageHead title="情绪日志" />
    <tableSearch :formItem="formItem" @search="handleSearch" />
    <el-table :data="tableData" v-loading="loading" style="width: 100%; margin-top: 16px">
      <!-- 用户ID -->
      <el-table-column prop="userId" label="用户ID" width="100" align="center" />

      <!-- 用户名 -->
      <el-table-column prop="userName" label="用户名" width="120" align="center" />

      <!-- 情绪评分 -->
      <el-table-column label="情绪评分" width="110" align="center">
        <template #default="{ row }">
          <svg class="ring" viewBox="0 0 40 40" width="40" height="40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#ebeef5" stroke-width="4" />
            <circle
              cx="20" cy="20" r="16" fill="none"
              :stroke="ringColor(row.moodScore)"
              stroke-width="4"
              stroke-linecap="round"
              :stroke-dasharray="100.53"
              :stroke-dashoffset="100.53 - 100.53 * row.moodScore / 10"
              transform="rotate(-90 20 20)"
              style="transition: stroke-dashoffset 0.3s ease"
            />
            <text x="20" y="24" text-anchor="middle" font-size="12" font-weight="700" fill="#303133">
              {{ row.moodScore }}
            </text>
          </svg>
        </template>
      </el-table-column>

      <!-- 情绪标签 -->
      <el-table-column prop="moodLabel" label="情绪标签" width="110" align="center">
        <template #default="{ row }">
          <el-tag :color="moodColor(row.moodLabel)" effect="dark">{{ row.moodLabel }}</el-tag>
        </template>
      </el-table-column>

      <!-- 记录内容 -->
      <el-table-column prop="content" label="记录内容" min-width="280" show-overflow-tooltip />

      <!-- 记录时间 -->
      <el-table-column prop="createdAt" label="记录时间" width="180" align="center" />

      <!-- 操作 -->
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link :loading="detailLoadingId === row.id" @click="openDetailDialog(row)">详情</el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-info">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadData"
        @size-change="handleSizeChange"
      />
    </div>
    <!-- 详情弹窗 -->
    <emotionalDialog
      v-model:showDetailDialog="detailDialogVisible"
      :detailRow="detailRow"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import pageHead from '@/components/admin-page/pageHead.vue'
import tableSearch from '@/components/admin-page/tableSearch.vue'
import type { Emotional, EmotionalListItem } from '@/api/emotional'
import { getEmotionalList, getEmotionalDetail, deleteEmotional, MOOD_LABELS, MOOD_LABEL_COLORS } from '@/api/emotional'
import { ElMessage, ElMessageBox } from 'element-plus'
import emotionalDialog from '@/components/dialog/emotionalDialog.vue'

// ==================== 数据加载 ====================
const tableData = ref<EmotionalListItem[]>([])
const loading = ref(false)
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// 搜索参数
const searchParams = reactive({
  userId: '',
  moodScoreRange: '',
  moodLabel: '',
})

const loadData = async () => {
  loading.value = true
  try {
    const result = await getEmotionalList({
      userId: searchParams.userId || undefined,
      moodScoreRange: searchParams.moodScoreRange || undefined,
      moodLabel: searchParams.moodLabel || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    tableData.value = result.list
    pagination.total = result.total
  } catch (error) {
    ElMessage.error('加载情绪日志失败')
  } finally {
    loading.value = false
  }
}

const handleSizeChange = () => {
  pagination.page = 1
  loadData()
}

// ==================== 搜索表单 ====================
const formItem = [
  { label: '用户ID', prop: 'userId', comp: 'input', placeholder: '请输入用户ID' },
  {
    label: '情绪评分',
    prop: 'moodScoreRange',
    comp: 'select',
    placeholder: '请选择情绪评分范围',
    options: [
      { label: '低分(1-3)', value: '1-3' },
      { label: '中分(4-6)', value: '4-6' },
      { label: '高分(7-10)', value: '7-10' },
    ],
  },
  {
    label: '情绪标签',
    prop: 'moodLabel',
    comp: 'select',
    placeholder: '请选择情绪标签',
    options: MOOD_LABELS.map((l) => ({ label: l, value: l })),
  },
]

// 处理搜索表单
const handleSearch = (formData: { userId: string; moodScoreRange: string; moodLabel: string }) => {
  searchParams.userId = formData.userId
  searchParams.moodScoreRange = formData.moodScoreRange
  searchParams.moodLabel = formData.moodLabel
  pagination.page = 1
  loadData()
}

// ==================== 详细弹窗 ====================
const detailDialogVisible = ref(false)
const detailLoadingId = ref<number | null>(null) //防止重复点击详情按钮
const detailRow = ref<Emotional>()

const openDetailDialog = async (row: EmotionalListItem) => {
  detailLoadingId.value = row.id
  try {
    const result = await getEmotionalDetail(row.id)
    detailRow.value = result
    detailDialogVisible.value = true
  } finally {
    detailLoadingId.value = null
  }
}

// ==================== 删除 ====================
const handleDelete = async (row: EmotionalListItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除「${row.userName}」的情绪记录吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteEmotional(row.id)
    ElMessage.success('删除成功')
    // 删完当前页最后一条时回上一页
    if (tableData.value.length === 1 && pagination.page > 1) {
      pagination.page--
    }
    loadData()
  } catch {
   }
}

// ==================== 情绪标签样式 ====================
const ringColor = (score: number): string => {
  if (score <= 3) return '#f56c6c'
  if (score <= 6) return '#e6a23c'
  return '#67c23a'
}

const moodColor = (label: string): string => MOOD_LABEL_COLORS[label] || '#909399'

// ==================== 初始化 ====================
onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
// ==================== 表格美化 ====================

:deep(.el-table) {
  border-radius: 6px;
  overflow: hidden;
  border: none !important;

  .el-table__header th {
    background: #f0f2f5 !important;
    font-weight: 600;
    color: #303133;
    border-bottom: 2px solid #e4e7ed !important;
    padding: 14px 0;
  }

  .el-table__body td {
    border-bottom: 1px solid #ebeef5;
    padding: 14px 0;
  }

  .el-table__row:nth-child(even) td {
    background: #fafafa;
  }

  .el-table__row:hover td {
    background: #ecf5ff !important;
  }

  th,
  td {
    border-left: none !important;
    border-right: none !important;
  }
}

// ==================== 情绪评分圆环 ====================
// SVG 内联，无额外 SCSS

// ==================== 分页 ====================

.pagination-info {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  margin-top: 16px;
}
</style>
