<template>
  <div class="user-memory">
    <div class="page-header">
      <h2 class="page-title">记忆管理</h2>
      <span class="page-sub">AI 记住的关于你的信息。你可以随时删除。</span>
    </div>

    <div v-if="loading" class="loading-state">加载中…</div>

    <template v-else>
      <!-- 无记忆 -->
      <div v-if="!items.length" class="empty-state">
        <p>还没有任何关于你的记忆</p>
        <p class="hint">多和 AI 聊聊天，它会慢慢了解你</p>
      </div>

      <!-- 记忆列表 -->
      <div v-else class="memory-list">
        <div v-for="item in items" :key="item.id" class="memory-item">
          <span class="memory-category">{{ item.category || '其他' }}</span>
          <p class="memory-content">{{ item.content }}</p>
          <el-button
            text
            :icon="Delete"
            :loading="deletingId === item.id"
            class="delete-btn"
            @click="handleDelete(item.id)"
          />
        </div>
      </div>

      <!-- 清空全部 -->
      <div v-if="items.length" class="footer-actions">
        <el-button text type="danger" @click="handleClear">清空全部记忆</el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { getMemories, deleteMemory, clearMemories, type MemoryItem } from '@/api/user'

const items = ref<MemoryItem[]>([])
const loading = ref(true)
const deletingId = ref(0)

const load = async () => {
  loading.value = true
  try {
    items.value = await getMemories()
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id: number) => {
  deletingId.value = id
  try {
    await deleteMemory(id)
    items.value = items.value.filter((i) => i.id !== id)
    ElMessage.success('已删除')
  } catch {
    // 拦截器已提示
  } finally {
    deletingId.value = 0
  }
}

const handleClear = async () => {
  try {
    await ElMessageBox.confirm('确定清空 AI 对你的全部记忆？', '确认清空', {
      type: 'warning', confirmButtonText: '清空', cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await clearMemories()
    items.value = []
    ElMessage.success('已清空全部记忆')
  } catch {
    // 拦截器已提示
  }
}

onMounted(() => load())
</script>

<style lang="scss" scoped>
.user-memory {
  max-width: 700px;
  margin: 0 auto;

  .page-header {
    margin-bottom: 24px;
    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: #2c3e2d;
      margin: 0 0 6px;
    }
    .page-sub {
      font-size: 13px;
      color: #9ca3af;
    }
  }

  .loading-state, .empty-state {
    text-align: center;
    padding: 48px;
    color: #9ca3af;
    font-size: 14px;
    .hint { font-size: 13px; color: #c4bfb4; margin-top: 4px; }
  }

  .memory-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .memory-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,.04);

    .memory-category {
      flex-shrink: 0;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 12px;
      background: #e8f0e4;
      color: #6b8a65;
      margin-top: 1px;
    }

    .memory-content {
      flex: 1;
      margin: 0;
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
    }

    .delete-btn {
      flex-shrink: 0;
      opacity: 0;
      transition: opacity .15s;
      color: #c4bfb4;
    }
    &:hover .delete-btn { opacity: 1; }
  }

  .footer-actions {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #f0ede8;
    text-align: center;
  }
}
</style>
