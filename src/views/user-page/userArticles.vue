<template>
  <div class="user-articles">
    <h2 class="page-title">健康知识</h2>

    <!-- ==================== 搜索 + 筛选 ==================== -->
    <div class="search-bar">
      <el-input
        v-model="searchTitle"
        placeholder="搜索文章标题…"
        clearable
        :prefix-icon="Search"
        class="search-input"
        @keyup.enter="handleSearch"
      />
      <el-select v-model="filterCategory" placeholder="全部分类" clearable @change="handleSearch">
        <el-option v-for="c in CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
      </el-select>
    </div>

    <!-- ==================== 文章卡片列表 ==================== -->
    <div v-if="articles.length" class="article-grid">
      <div
        v-for="article in articles"
        :key="article.id"
        class="article-card"
        @click="goDetail(article.id)"
      >
        <div class="card-cover">
          <img v-if="article.coverImage" :src="article.coverImage" alt="封面" />
          <div v-else class="cover-placeholder">
            <el-icon :size="32"><Reading /></el-icon>
          </div>
        </div>
        <div class="card-body">
          <span class="card-category">{{ categoryLabel(article.category) }}</span>
          <h4 class="card-title">{{ article.title }}</h4>
          <p class="card-summary">{{ article.summary || '暂无摘要' }}</p>
          <div class="card-meta">
            <span>{{ article.author }}</span>
            <span>{{ article.views }} 次阅读</span>
            <span>{{ article.createdAt }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="empty-list">暂无文章</div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination-wrap">
      <el-pagination
        background
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        v-model:current-page="currentPage"
        @current-change="loadArticles"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Reading } from '@element-plus/icons-vue'
import { fetchArticles, CATEGORIES, type Article } from '@/api/knowledge'
import { ROUTE_NAMES } from '@/router'

// ==================== 跳转 ====================
const router = useRouter()
const goDetail = (id: number) => {
  router.push({ name: ROUTE_NAMES.userArticleDetail, params: { id } })
}

// ==================== 列表状态 ====================
const articles = ref<Article[]>([])
// 总记录数:用于分页
const total = ref(0)
const currentPage = ref(1)
const pageSize = 12
const loading = ref(false)

// ==================== 数据加载 ====================
const loadArticles = async (page = 1) => {
  loading.value = true
  try {
    const result = await fetchArticles({
      title: searchTitle.value || undefined,
      category: filterCategory.value || undefined,
      status: 'published', // 用户端只看已发布
      page,
      pageSize,
    })
    articles.value = result.list
    total.value = result.total
  } catch {
    articles.value = []
  } finally {
    loading.value = false
  }
}

// ==================== 搜索/筛选 ====================
const searchTitle = ref('') // 搜索标题:用户输入的搜索关键词
const filterCategory = ref('') // 筛选分类:用户选择的分类

const handleSearch = () => {
  currentPage.value = 1
  loadArticles(1)
}


/** 分类 value → 中文 label */
const categoryLabel = (value: string) =>
  CATEGORIES.find((c) => c.value === value)?.label || value

// ==================== 初始化 ====================
onMounted(() => loadArticles())
</script>

<style lang="scss" scoped>
.user-articles {
  max-width: 1000px;
  margin: 0 auto;

  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: #2c3e2d;
    margin: 0 0 20px;
  }

  // ==================== 搜索 ====================
  .search-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    .search-input { width: 280px; }
  }

  // ==================== 卡片网格 ====================
  .article-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;

    @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
    @media (max-width: 600px) { grid-template-columns: 1fr; }
  }

  .article-card {
    background: #fff;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .card-cover {
      height: 140px;
      background: #f3f0eb;
      img {
        width: 100%; height: 100%;
        object-fit: cover;
      }
      .cover-placeholder {
        width: 100%; height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #d4cfc4;
      }
    }

    .card-body {
      padding: 14px 16px 16px;
      .card-category {
        font-size: 12px;
        color: #8b9e7e;
        background: #e8f0e4;
        padding: 2px 8px;
        border-radius: 6px;
      }
      .card-title {
        font-size: 15px;
        font-weight: 600;
        color: #374151;
        margin: 8px 0 6px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .card-summary {
        font-size: 13px;
        color: #9ca3af;
        margin: 0 0 10px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .card-meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: #c4bfb4;
      }
    }
  }

  .empty-list {
    text-align: center;
    padding: 48px;
    color: #9ca3af;
    font-size: 14px;
  }

  .pagination-wrap {
    margin-top: 24px;
    display: flex;
    justify-content: center;
  }
}
</style>
