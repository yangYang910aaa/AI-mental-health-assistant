<template>
  <div class="user-chat">
    <!-- ==================== 左侧：会话列表 ==================== -->
    <div class="chat-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <span v-show="!sidebarCollapsed" class="sidebar-title">对话记录</span>
        <el-button
          :icon="sidebarCollapsed ? Expand : Fold"
          text
          @click="sidebarCollapsed = !sidebarCollapsed"
        />
      </div>
      <div v-show="!sidebarCollapsed" class="session-list">
        <div class="new-chat-btn" @click="startNewChat">
          <el-icon><Plus /></el-icon>
          <span>新建对话</span>
        </div>
        <div
          v-for="s in sessions"
          :key="s.id"
          class="session-item"
          :class="{ active: s.id === activeSessionId, pinned: s.pinned }"
          @click="switchSession(s.id)"
        >
          <div class="session-item-top">
            <span class="session-title">
              <el-icon v-if="s.pinned" class="pin-icon" :size="12"><Top /></el-icon>
              {{ s.title }}
            </span>
            <div class="session-item-actions">
              <span class="session-time">{{ formatTime(s.lastTime) }}</span>
              <el-dropdown trigger="click" @command="handleSessionAction($event, s)" class="session-menu">
                <span class="menu-trigger" @click.stop><el-icon :size="20"><MoreFilled /></el-icon></span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rename">
                      <el-icon><Edit /></el-icon>重命名
                    </el-dropdown-item>
                    <el-dropdown-item command="pin">
                      <el-icon><Top /></el-icon>{{ s.pinned ? '取消置顶' : '置顶' }}
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" class="danger-item">
                      <el-icon><Delete /></el-icon>删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          <p class="session-preview">{{ s.lastMessage }}</p>
        </div>
        <div v-if="!sessions.length && !loadingSessions" class="empty-sessions">
          <p>暂无对话记录</p>
        </div>
      </div>
    </div>

    <!-- ==================== 右侧：对话区域 ==================== -->
    <div class="chat-main">
      <!-- 顶部状态栏 -->
      <div class="chat-header">
        <span class="chat-title">{{ currentSessionTitle }}</span>
        <span v-if="activeSessionId" class="chat-meta">{{ messages.length }} 条消息</span>
      </div>

      <!-- 消息列表 -->
      <div class="chat-messages" ref="messagesContainerRef">
        <div v-if="!messages.length && !isGenerating" class="chat-empty">
          <el-icon :size="40" color="#d4cfc4"><ChatDotRound /></el-icon>
          <p>开始和 AI 咨询师聊聊吧</p>
          <p class="sub">在这里你可以自由表达，所有对话都会被温柔倾听</p>
        </div>

        <div
          v-for="(msg, idx) in messages"
          :key="msg.id"
          class="chat-bubble"
          :class="msg.sender === 'user' ? 'user-bubble' : 'ai-bubble'"
        >
          <div class="bubble-avatar">
            <el-avatar v-if="msg.sender === 'assistant'" :size="32" class="ai-avatar">
              <el-icon><Sunrise /></el-icon>
            </el-avatar>
            <el-avatar v-else :size="32" :src="userStore.userInfo?.avatar || ''">
              {{ userStore.displayName?.charAt(0) || '我' }}
            </el-avatar>
          </div>
          <div class="bubble-content">
            <div class="bubble-text" :class="{ error: msg.error && msg.sender === 'assistant' }">
              {{ msg.content }}
              <!-- 错误气泡 → 重试入口 -->
              <template v-if="msg.error && msg.sender === 'assistant' && idx === messages.length - 1">
                <a class="retry-link" @click="retryMessage">重新生成</a>
              </template>
            </div>
            <span class="bubble-time">{{ msg.time ? msg.time.slice(11, 16) : '' }}</span>
          </div>
        </div>

      </div>

      <!-- 输入区域 -->
      <div class="chat-input-area">
        <el-input
          ref="inputRef"
          v-model="inputText"
          type="textarea"
          :rows="2"
          :placeholder="isGenerating ? 'AI 正在生成中…' : '输入你想说的话…'"
          resize="none"
          :disabled="isGenerating"
          @keydown.enter.exact.prevent="sendMessage"
        />
        <el-button
          v-if="!isGenerating"
          type="primary"
          :icon="Promotion"
          :disabled="!inputText.trim()"
          @click="sendMessage"
        >
          发送
        </el-button>
        <el-button
          v-else
          type="danger"
          :icon="Close"
          @click="stopGeneration"
        >
          停止生成
        </el-button>
      </div>
      <div class="chat-input-hint">
        按 <kbd>Enter</kbd> 发送，<kbd>Shift</kbd> + <kbd>Enter</kbd> 换行
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * userChat —— AI 对话页
 *
 * 职责：模板 + 样式。所有业务逻辑委托给 useChat() composable。
 */
import { ref, watch, nextTick } from 'vue'
import {
  Expand, Fold, Plus, Promotion, Sunrise, ChatDotRound,
  MoreFilled, Top, Edit, Delete, Close,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useChat } from '@/composables/useChat'

const userStore = useUserStore()

// 所有聊天状态和方法来自 composable
const {
  sessions,
  messages,
  activeSessionId,
  inputText,
  isGenerating,
  sidebarCollapsed,
  loadingSessions,
  currentSessionTitle,
  switchSession,
  startNewChat,
  sendMessage,
  stopGeneration,
  retryMessage,
  handleSessionAction,
  scrollToBottom,
  focusInput,
  formatTime,
} = useChat()

// 模板 ref —— 滚动容器 + 输入框
const messagesContainerRef = ref<HTMLElement>()
const inputRef = ref<any>()

// 消息变化时滚到底
watch(
  () => messages.value.length,
  () => scrollToBottom(messagesContainerRef.value),
)

// 切会话后聚焦输入框
watch(activeSessionId, () => focusInput(inputRef.value))

// 初始聚焦（onMounted 在 useChat 内部已调用 loadSessions + switchSession）
nextTick(() => focusInput(inputRef.value))
</script>

<!-- ==================== 样式 ==================== -->

<style lang="scss" scoped>
.user-chat {
  display: flex;
  height: calc(100vh - 60px - 48px);
  margin: -24px;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;

  // ==================== 左侧会话列表 ====================
  .chat-sidebar {
    width: 260px;
    border-right: 1px solid #f0ede6;
    display: flex;
    flex-direction: column;
    transition: width 0.2s;
    flex-shrink: 0;

    &.collapsed {
      width: 48px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border-bottom: 1px solid #f0ede6;
      .sidebar-title { font-size: 14px; font-weight: 600; color: #374151; }
    }

    .session-list {
      flex: 1;
      overflow-y: auto;
    }

    .new-chat-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 10px 12px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px dashed #d4cfc4;
      color: #8b9e7e;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
      &:hover { background: #f8f6f3; }
    }

    .session-item {
      padding: 12px;
      margin: 0 6px 4px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s;
      position: relative;
      &:hover { background: #f8f6f3; }
      &.active { background: #e8f0e4; }

      .pin-icon {
        color: #8b9e7e;
        margin-right: 2px;
        flex-shrink: 0;
      }

      .session-item-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        .session-title {
          font-size: 13px; font-weight: 500; color: #374151;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          display: flex; align-items: center; gap: 2px;
          flex: 1; min-width: 0; margin-right: 4px;
        }
      }

      .session-item-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        .session-time { font-size: 11px; color: #9ca3af; }
        .menu-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px; height: 28px;
          color: #9ca3af;
          cursor: pointer;
          border-radius: 6px;
          opacity: 0.55;
          transition: opacity 0.15s, background 0.15s, color 0.15s;
          &:hover { background: #e5e7eb; color: #374151; opacity: 1; }
        }
      }

      .session-preview {
        margin: 0;
        font-size: 12px;
        color: #9ca3af;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .empty-sessions {
      padding: 24px;
      text-align: center;
      font-size: 13px;
      color: #b0ad9f;
    }
  }

  // ==================== 右侧对话区 ====================
  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid #f0ede6;
    .chat-title { font-size: 15px; font-weight: 600; color: #374151; }
    .chat-meta { font-size: 14px; color: #9ca3af; }
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    background: #faf9f7;
  }

  .chat-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 8px;
    p {
      margin: 0;
      font-size: 16px;
      color: #9ca3af;
      &.sub { font-size: 13px; color: #c4bfb4; }
    }
  }

  .chat-bubble {
    display: flex;
    gap: 10px;
    margin-bottom: 18px;
    max-width: 80%;

    &.user-bubble {
      margin-left: auto;
      flex-direction: row-reverse;
      .bubble-content {
        align-items: flex-end;
        .bubble-text {
          background: #d5e8cf;
          border-radius: 16px 4px 16px 16px;
        }
      }
    }
    &.ai-bubble {
      .bubble-content {
        .bubble-text {
          background: #fff;
          border-radius: 4px 16px 16px 16px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
      }
    }

    .bubble-avatar { flex-shrink: 0; }

    .ai-avatar {
      background: linear-gradient(135deg, #f9d56e, #f5a623);
      color: #fff;
      :deep(.el-icon) { font-size: 18px; }
    }

    .bubble-content {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .bubble-text {
        padding: 10px 14px;
        font-size: 14px;
        line-height: 1.6;
        color: #374151;

        &.error {
          background: #fef0f0 !important;
          color: #e84747;
          border-radius: 4px 16px 16px 16px !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          white-space: pre-wrap;
        }

        .retry-link {
          display: inline-block;
          margin-top: 6px;
          color: #8b9e7e;
          text-decoration: underline;
          cursor: pointer;
          font-size: 13px;
          &:hover { color: #6b7e5e; }
        }
      }

      .bubble-time {
        font-size: 11px;
        color: #c4bfb4;
        padding: 0 4px;
      }
    }
  }

  // 输入区
  .chat-input-area {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 12px 20px;
    border-top: 1px solid #f0ede6;

    :deep(.el-textarea__inner) {
      border-radius: 10px;
      font-size: 14px;
      box-shadow: 0 0 0 1px #e8e5df inset;
      &:focus { box-shadow: 0 0 0 1px #a4a090 inset; }
    }

    .el-button {
      height: 42px;
      border-radius: 10px;
      &.el-button--primary {
        background: #8b9e7e;
        border-color: #8b9e7e;
        &:hover { background: #7a8e6f !important; }
      }
    }
  }

  .chat-input-hint {
    text-align: left;
    padding: 4px 20px 10px;
    font-size: 13px;
    color: #9ca3af;
    kbd {
      display: inline-block;
      padding: 1px 6px;
      font-size: 12px;
      color: #6b7280;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      line-height: 1.5;
    }
  }
}

</style>

<style lang="scss">
/* ==================== 下拉菜单全局美化 ==================== */
.el-dropdown-menu {
  padding: 4px !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04) !important;
  border: none !important;
  min-width: 140px !important;
}

.el-dropdown-menu .el-dropdown-menu__item {
  padding: 8px 12px !important;
  border-radius: 7px !important;
  margin: 2px 0 !important;
  font-size: 14px !important;
  line-height: 1.4 !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  transition: background 0.12s, color 0.12s !important;
}

.el-dropdown-menu .el-dropdown-menu__item .el-icon {
  font-size: 16px !important;
}

.el-dropdown-menu .el-dropdown-menu__item:hover {
  background: #f5f5f5 !important;
  color: #374151 !important;
}

.el-dropdown-menu .danger-item {
  color: #f56c6c !important;
}

.el-dropdown-menu .danger-item:hover {
  background-color: #fef0f0 !important;
  color: #e64545 !important;
}

.el-dropdown-menu .el-dropdown-menu__item.is-divided {
  margin-top: 6px !important;
  padding-top: 10px !important;
  border-top: 1px solid #f0f0f0 !important;
}
</style>
