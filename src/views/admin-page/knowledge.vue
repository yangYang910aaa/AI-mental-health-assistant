<template>
  <div>
    <pageHead title="知识文章">
      <template #buttons>
        <el-button type="primary" @click="openAddDialog" :icon="Plus">新增</el-button>
      </template>
    </pageHead>

    <tableSearch :formItem="formItem" @search="handleSearch" />

    <el-table
      :data="tableData"
      v-loading="loading"
      style="width: 100%; margin-top: 16px"
    >
      <el-table-column label="封面" width="100">
        <template #default="{ row }">
          <el-image
            v-if="row.coverImage"
            :src="row.coverImage"
            fit="cover"
            style="width: 72px; height: 48px; border-radius: 4px"
            lazy
          />
          <span v-else class="no-cover">无</span>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="文章标题" min-width="220" show-overflow-tooltip fixed="left" />
      <el-table-column label="分类" width="130" align="center">
        <template #default="{ row }">
          {{ categoryMap[row.category] || row.category }}
        </template>
      </el-table-column>
      <el-table-column prop="author" label="作者" width="120" align="center" />
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)"  effect="dark" round>
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="views" label="阅读量" width="110" sortable align="center" />
      <el-table-column prop="createdAt" label="发布时间" width="130" sortable align="center" />
      <el-table-column label="操作" width="220" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button
            :type="row.status === 'published' ? 'warning' : 'success'"
            link
            @click="handleStatusChange(row)"
          >
            {{ row.status === 'published' ? '下线' : '发布' }}
          </el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
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
    <articleDialog
    v-model:visible="dialogVisible"
    :article="currentArticle"
    :categories="CATEGORIES"
    :tags="TAGS"
    @success="onArticleCreated" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import pageHead from '@/components/admin-page/pageHead.vue'
import tableSearch from '@/components/admin-page/tableSearch.vue'
import { fetchArticles, CATEGORIES, updateArticle, deleteArticle, fetchTitleSuggestions } from '@/api/knowledge'
import type { Article, TitleSuggestion } from '@/api/knowledge'
import articleDialog from '@/components/dialog/articleDialog.vue'
import { TAGS } from '@/api/knowledge'
import { Plus } from '@element-plus/icons-vue'

// ==================== 搜索表单 ====================
const formItem = [
  {
    label: '文章标题', prop: 'title', comp: 'autocomplete',
    placeholder: '请输入文章标题',
    'value-key': 'title',//联想结果的标题字段
    triggerOnFocus: false,//不自动触发联想
    // 自定义联想函数
    fetchSuggestions: async (queryString: string, cb: (results: TitleSuggestion[]) => void) => {
      if (!queryString || queryString.trim().length === 0) return cb([])
      try {
        const result = await fetchTitleSuggestions(queryString.trim())
        cb(result)
      } catch {
        cb([])
      }
    },
    onSelect: (item: TitleSuggestion) => {
      searchParams.title = item.title
      pagination.page = 1
      loadData()
    },
  },
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
const dialogVisible = ref(false)

//// 搜索参数
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

// ==================== 列表数据加载 ====================

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
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

// 文章创建成功后刷新列表
const onArticleCreated = () => {
  dialogVisible.value = false
  loadData()
}

// 处理搜索表单
const handleSearch = (formData: { title: string; category: string; status: string }) => {
  searchParams.title = formData.title
  searchParams.category = formData.category
  searchParams.status = formData.status
  pagination.page = 1
  loadData()
}

// 处理分页大小改变
const handleSizeChange = () => {
  pagination.page = 1
  loadData()
}

// ==================== 编辑文章 ====================
const currentArticle = ref<Article | null>(null)

const handleEdit = (row: Article) => {
  currentArticle.value = row
  dialogVisible.value = true
}

// 新增时清空 currentArticle
const openAddDialog = () => {
  currentArticle.value = null
  dialogVisible.value = true
}

// ==================== 发布 / 下线 ====================
const handleStatusChange = async (row: Article) => {
  const newStatus=row.status==='published'?'offline':'published'
  await updateArticle(row.id,{status:newStatus})
  ElMessage.success(newStatus==='published'?'已发布':'已下线')
  loadData()
}

// ==================== 删除文章 ====================
const handleDelete = async (row: Article) => {
  try {
    await ElMessageBox.confirm(`确定要删除「${row.title}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteArticle(row.id)
    ElMessage.success('删除成功')
    // 删完当前页最后一条时回上一页
    if (tableData.value.length === 1 && pagination.page > 1) {
      pagination.page--
    }
    loadData()
  } catch {
    // 用户取消或错误
  }
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

.no-cover {
  color: #c0c4cc;
  font-size: 12px;
}

// 分页区
.pagination-info {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  margin-top: 0;
}
</style>
