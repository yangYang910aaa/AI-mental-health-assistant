<template>
  <div class="article-detail">
    <!-- 返回按钮 -->
    <div class="back-row">
      <el-button text :icon="ArrowLeft" @click="router.back()">返回列表</el-button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span>加载中…</span>
    </div>

    <!-- 文章内容 -->
    <template v-else-if="article">
      <div class="article-header">
        <span class="category-tag">{{ categoryLabel }}</span>
        <h1 class="article-title">{{ article.title }}</h1>
        <div class="article-meta">
          <span>{{ article.author }}</span>
          <span>{{ article.views }} 次阅读</span>
          <span>{{ article.createdAt }}</span>
        </div>
        <div v-if="article.tags?.length" class="article-tags">
          <el-tag v-for="tag in article.tags" :key="tag" size="small">{{ tag }}</el-tag>
        </div>
      </div>

      <div class="article-body" v-html="article.content" />
    </template>

    <!-- 文章不存在 -->
    <div v-else class="not-found">文章不存在或已删除</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Loading } from '@element-plus/icons-vue'
import { fetchArticleDetail, CATEGORIES, type Article } from '@/api/knowledge'

// ==================== 路由 ====================
const route = useRoute()
const router = useRouter()

// ==================== 文章状态 ====================
const article = ref<Article | null>(null)
const loading = ref(true)

/** 分类 value → 中文 label */
const categoryLabel = computed(() => {
  if (!article.value) return ''
  return CATEGORIES.find((c) => c.value === article.value!.category)?.label || article.value!.category
})

// ==================== 数据加载 ====================
const loadArticle = async () => {
  const id = Number(route.params.id)
  if (!id) return
  loading.value = true
  try {
    article.value = await fetchArticleDetail(id)
  } catch {
    article.value = null
  } finally {
    loading.value = false
  }
}

// ==================== 初始化 ====================
onMounted(() => loadArticle())
</script>

<style lang="scss" scoped>
.article-detail {
  max-width: 800px;
  margin: 0 auto;

  .back-row {
    margin-bottom: 16px;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 80px;
    color: #9ca3af;
    font-size: 14px;
  }

  .article-header {
    background: #fff;
    border-radius: 14px;
    padding: 28px 32px;
    margin-bottom: 20px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

    .category-tag {
      font-size: 12px;
      color: #8b9e7e;
      background: #e8f0e4;
      padding: 3px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
      display: inline-block;
    }
    .article-title {
      font-size: 24px;
      font-weight: 700;
      color: #2c3e2d;
      margin: 0 0 12px;
      line-height: 1.4;
    }
    .article-meta {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: #9ca3af;
    }

    .article-tags {
      display: flex;
      gap: 8px;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid #f0ede8;
    }
  }

  .article-body {
    background: #fff;
    border-radius: 14px;
    padding: 28px 32px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    font-size: 15px;
    line-height: 1.8;
    color: #374151;

    // 基础富文本样式
    :deep(p) { margin: 0 0 12px; }
    :deep(h2) { font-size: 18px; margin: 24px 0 12px; color: #2c3e2d; }
    :deep(h3) { font-size: 16px; margin: 20px 0 10px; color: #374151; }
    :deep(ul), :deep(ol) { padding-left: 20px; margin: 0 0 12px; }
    :deep(li) { margin-bottom: 6px; }
    :deep(blockquote) {
      border-left: 3px solid #8b9e7e;
      padding: 8px 16px;
      margin: 0 0 12px;
      background: #f8f6f3;
      border-radius: 0 8px 8px 0;
      color: #6b7280;
    }
    :deep(img) { max-width: 100%; border-radius: 8px; margin: 12px 0; }
  }

  .not-found {
    text-align: center;
    padding: 80px;
    color: #9ca3af;
    font-size: 15px;
  }
}
</style>
