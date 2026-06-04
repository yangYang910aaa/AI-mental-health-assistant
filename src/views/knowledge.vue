<template>
  <div>
    <pageHead title="知识文章">
      <template #buttons>
        <el-button type="primary">新增</el-button>
      </template>
    </pageHead>

    <tableSearch :formItem="formItem" @search="handleSearch" />

    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%; margin-top: 16px"
    >
      <el-table-column prop="title" label="文章标题" min-width="220" show-overflow-tooltip fixed="left" />
      <el-table-column label="分类" width="120">
        <template #default="{ row }">
          {{ categoryMap[row.category] || row.category }}
        </template>
      </el-table-column>
      <el-table-column prop="author" label="作者" width="100" />
      <el-table-column label="状态" width="90"> 
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="views" label="阅读量" width="100" sortable />
      <el-table-column prop="createdAt" label="创建时间" width="120" sortable />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link>编辑</el-button>
          <el-button
            :type="row.status === 'published' ? 'warning' : 'success'"
            link
          >
            {{ row.status === 'published' ? '下线' : '发布' }}
          </el-button>
          <el-button type="danger" link>删除</el-button>
        </template>
      </el-table-column>
    </el-table>

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
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, computed } from 'vue'
import pageHead from '@/components/pageHead.vue'
import tableSearch from '@/components/tableSearch.vue'
import { fetchArticles, CATEGORIES } from '@/api/knowledge'
import type { Article } from '@/api/knowledge'

// ==================== 搜索表单 ====================

const formItem = [
  { label: '文章标题', prop: 'title', comp: 'input', placeholder: '请输入文章标题' },
  {
    label: '文章分类',prop: 'category',
    comp: 'select',
    placeholder: '请选择文章分类',
    options: CATEGORIES.map((c) => ({ label: c.label, value: c.value })),
  },
  { label: '状态', prop: 'status', comp: 'select', placeholder: '请选择状态',
    options: [
      { label: '已发布', value: 'published' },
      { label: '草稿', value: 'draft' },
      { label: '已下线', value: 'offline' },
    ],
  },
]

// ==================== 数据状态 ====================

const loading = ref(false)
const tableData = ref<Article[]>([])

// 搜索参数
const searchParams = reactive({
  title: '',
  category: '',
  status: '',
})

// 分页状态
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 工具 ====================

// ==================== 状态映射 ====================
//字段映射：status->label，新状态=>保留原名
const statusLabel = (status: string) =>
  ({ published: '已发布', draft: '草稿', offline: '已下线' } as Record<string, string>)[status] || status

//已发布=>success,绿色，草稿=>info,蓝色，已下线=>warning,黄色
const statusTagType = (status: string): 'success' | 'info' | 'warning' =>
  ({ published: 'success', draft: 'info', offline: 'warning' } as Record<string, 'success' | 'info' | 'warning'>)[status] || 'info'

//label=>value,value=>label。map:{'mental-health':'心理健康'}
const categoryMap = computed(() => {
  const map: Record<string, string> = {}
  CATEGORIES.forEach((c) => (map[c.value] = c.label))
  return map
})

// ==================== 数据加载 ====================

const loadData = async () => {
  loading.value = true
  try {
    const result = await fetchArticles({
      title: searchParams.title || undefined,
      category: searchParams.category || undefined,
      status: searchParams.status || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    tableData.value = result.list
    pagination.total = result.total
  } finally {
    loading.value = false
  }
}

const handleSearch = (formData: { title: string; category: string; status: string }) => {
  searchParams.title = formData.title
  searchParams.category = formData.category
  searchParams.status = formData.status
  pagination.page = 1
  loadData()
}

const handleSizeChange = () => {
  pagination.page = 1
  loadData()
}

// ==================== 初始化 ====================

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
// ==================== 表格美化 ====================

:deep(.el-table) {
  // 整体圆角
  border-radius: 6px;
  overflow: hidden;

  // 去掉外框，靠单元格底部分隔线区分行
  border: none !important;

  // 表头
  .el-table__header th {
    background: #f0f2f5 !important;
    font-weight: 600;
    color: #303133;
    border-bottom: 2px solid #e4e7ed !important;
    padding: 14px 0;
  }

  // 内容行
  .el-table__body td {
    border-bottom: 1px solid #ebeef5;
    padding: 14px 0;
  }

  // zebra 条纹（替代 stripe 属性）
  .el-table__row:nth-child(even) td {
    background: #fafafa;
  }

  // hover
  .el-table__row:hover td {
    background: #ecf5ff !important;
  }

  // 去掉表格左边框和右边框
  th,
  td {
    border-left: none !important;
    border-right: none !important;
  }
}

// 分页区
.pagination-info {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  margin-top: 0;
}
</style>
