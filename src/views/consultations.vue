<template>
  <div>
    <pageHead title="咨询记录" />
    <el-table :data="tableData" v-loading="loading" style="width: 100%; margin-top: 16px">
      <!-- 对话用户 -->
      <el-table-column prop="userNickName" label="对话用户" width="140" align="center" />

      <!-- 对话记录：两行复合展示 -->
      <el-table-column label="对话记录" min-width="320" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="conversation-cell">
            <div class="conversation-header">
              <span class="conversation-ai">{{ row.aiName }}</span>
              <span class="conversation-time">{{ row.lastMessageTime }}</span>
            </div>
            <p class="conversation-preview">{{ row.lastMessageContent }}</p>
          </div>
        </template>
      </el-table-column>

      <!-- 消息数量 -->
      <el-table-column prop="messageCount" label="消息数量" width="130" align="center" />

      <!-- 开始时间 -->
      <el-table-column prop="startedAt" label="开始时间" width="180" align="center" />

      <!-- 操作 -->
      <el-table-column label="操作" width="150" fixed="right" align="center">
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
    <consultationDialog  
    v-model:showDetailDialog="showDetailDialog"
    :detailRow="detailRow"
    />
   </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import pageHead from '@/components/pageHead.vue'
import { getConsultations,getConsultationDetail,deleteConsultation } from '@/api/consultations'
import type { Consultation } from '@/api/consultations'
import consultationDialog from '@/components/consultationDialog.vue'
import { ElMessage,ElMessageBox } from 'element-plus'

const loading = ref(false)
const tableData = ref<Consultation[]>([])

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// 加载咨询记录列表
const loadData = async () => {
  loading.value = true
  try {
    const result = await getConsultations({
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    tableData.value = result.list
    pagination.total = result.total
  } finally {
    loading.value = false
  }
}
// 处理分页大小改变
const handleSizeChange = () => {
  pagination.page = 1
  loadData()
}


// ==================== 详细弹窗 ====================
const showDetailDialog = ref(false)
const detailLoadingId = ref<number | null>(null)
const detailRow = ref<Consultation>()

const openDetailDialog = async (row: Consultation) => {
  detailLoadingId.value = row.id
  try {
    const result = await getConsultationDetail(row.id)
    detailRow.value = result
    showDetailDialog.value = true
  } finally {
    detailLoadingId.value = null
  }
}

// ==================== 删除咨询记录 ====================
const handleDelete = async (row: Consultation) => {
  try {
    await ElMessageBox.confirm(`确定要删除 「${row.userNickName}」 的咨询记录吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteConsultation(row.id)
    ElMessage.success('删除成功')
    // 删完当前页最后一条时回上一页
    if (tableData.value.length === 1 && pagination.page > 1) {
      pagination.page--
    }
    loadData()
  } catch {
    // 用户取消或接口报错（拦截器已提示）
  }
}

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

// ==================== 对话记录单元格 ====================

.conversation-cell {
  .conversation-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 6px;

    .conversation-ai {
      font-size: 13px;
      color: #303133;
      font-weight: 600;
    }

    .conversation-time {
      font-size: 14px;
      color: #606266;
      font-weight: 500;
    }
  }

  .conversation-preview {
    margin: 0;
    font-size: 13px;
    color: #606266;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

// ==================== 分页 ====================

.pagination-info {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  margin-top: 16px;
}
</style>
