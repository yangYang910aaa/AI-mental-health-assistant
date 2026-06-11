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
          :class="{ active: s.id === activeSessionId }"
          @click="switchSession(s.id)"
        >
          <div class="session-item-top">
            <span class="session-title">{{ s.title }}</span>
            <span class="session-time">{{ formatTime(s.lastTime) }}</span>
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
        <span class="chat-title">{{ activeSessionId ? currentSessionTitle : '新对话' }}</span>
        <span v-if="activeSessionId" class="chat-meta">{{ messages.length }} 条消息</span>
      </div>

      <!-- 消息列表 -->
      <div class="chat-messages" ref="messagesContainer">
        <div v-if="!messages.length && !aiLoading" class="chat-empty">
          <el-icon :size="40" color="#d4cfc4"><ChatDotRound /></el-icon>
          <p>开始和 AI 咨询师聊聊吧</p>
          <p class="sub">在这里你可以自由表达，所有对话都会被温柔倾听</p>
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          class="chat-bubble"
          :class="msg.sender === 'user' ? 'user-bubble' : 'ai-bubble'"
        >
          <div class="bubble-avatar">
            <el-avatar v-if="msg.sender === 'assistant'" :size="32" src="">
              <el-icon><Sunrise /></el-icon>
            </el-avatar>
            <el-avatar v-else :size="32">{{ userStore.displayName?.charAt(0) || '我' }}</el-avatar>
          </div>
          <div class="bubble-content">
            <div class="bubble-text">{{ msg.content }}</div>
            <span class="bubble-time">{{ msg.time.slice(11, 16) }}</span>
          </div>
        </div>

        <!-- AI 正在输入... -->
        <div v-if="aiLoading" class="chat-bubble ai-bubble">
          <div class="bubble-avatar">
            <el-avatar :size="32"><el-icon><Sunrise /></el-icon></el-avatar>
          </div>
          <div class="bubble-content">
            <div class="bubble-text typing">
              <span class="dot" />
              <span class="dot" />
              <span class="dot" />
            </div>
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
          placeholder="输入你想说的话…"
          resize="none"
          @keydown.enter.exact="handleSend"
        />
        <el-button
          type="primary"
          :icon="Promotion"
          :loading="aiLoading"
          :disabled="!inputText.trim()"
          @click="handleSend"
        >
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Expand, Fold, Plus, Promotion, Sunrise, ChatDotRound } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getChatSessions, getChatMessages, sendMessage, type ChatSession, type ChatMessage } from '@/api/user'

const userStore = useUserStore()

// 左边栏是否折叠
const sidebarCollapsed = ref(false)

// 当前会话 ID
const activeSessionId = ref<number | null>(null)

// 会话列表记录:包含用户的所有对话记录
const sessions = ref<ChatSession[]>([])

// 当前会话消息列表:具体某个对话的所有消息，包含用户和 AI 的消息
const messages = ref<ChatMessage[]>([])

// 对话窗口的输入框文本
const inputText = ref('')

// AI 是否正在输入...
const aiLoading = ref(false)

// 加载会话列表
const loadingSessions = ref(false)

// 消息列表容器
const messagesContainer = ref<HTMLElement>()

// 输入框引用
const inputRef = ref<any>()

// 当前会话标题
const currentSessionTitle = computed(() => {
  const s = sessions.value.find((s) => s.id === activeSessionId.value)
  return s?.title || '新对话'
})

// 滚动到最底部:确保最新消息可见
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return ''
  const d = new Date(time.replace(' ', 'T'))
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return time.slice(11, 16) // 今天显示 HH:mm
  return time.slice(5, 10) // 其他显示 MM-DD
}

// 加载会话列表
const loadSessions = async () => {
  loadingSessions.value = true
  try {
    const userId = userStore.userInfo?.id || 1001
    sessions.value = await getChatSessions(userId)
  } catch {
    sessions.value = []
  } finally {
    loadingSessions.value = false
  }
}

// 切换会话
const switchSession = async (sessionId: number) => {
  activeSessionId.value = sessionId
  try {
    messages.value = await getChatMessages(sessionId)
  } catch {
    messages.value = []
  }
  scrollToBottom()
  focusInput()
}

// 聚焦输入框
const focusInput = () => nextTick(() => inputRef.value?.focus())

// 新建对话
const startNewChat = () => {
  activeSessionId.value = null  
  messages.value = [] //AI和用户的消息都为空
  inputText.value = ''// 清空输入框
  focusInput()
}

// 发送消息
const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text || aiLoading.value) return

  inputText.value = ''
  aiLoading.value = true

  // 乐观插入用户消息
  const tempId = Date.now()
  messages.value.push({
    id: tempId,
    sender: 'user',
    content: text,
    time: new Date().toISOString().replace('T', ' ').slice(0, 19),
  })
  scrollToBottom()

  try {
    const userId = userStore.userInfo?.id || 1001
    const result = await sendMessage(activeSessionId.value, text, userId)

    // 替换临时消息
    const idx = messages.value.findIndex((m) => m.id === tempId)
    if (idx !== -1) messages.value[idx] = result.userMessage

    // 添加 AI 回复
    messages.value.push(result.aiReply)

    // 如果是新会话，更新 sessionId 并刷新列表
    if (!activeSessionId.value) {
      activeSessionId.value = result.userMessage.id // mock 里 sessionId 随消息返回
      await loadSessions()
    } else {
      // 更新会话列表中的最后消息
      const s = sessions.value.find((s) => s.id === activeSessionId.value)
      if (s) {
        s.lastMessage = result.aiReply.content
        s.lastTime = result.aiReply.time
        s.messageCount = (s.messageCount || 0) + 2
      }
    }

    scrollToBottom()
  } catch {
    // 错误由拦截器处理
  } finally {
    aiLoading.value = false
  }
}

// ==================== 生命周期 ====================
onMounted(async () => {
  await loadSessions()
  // 若有历史会话，默认选第一个
  if (sessions.value.length > 0) {
    await switchSession(sessions.value[0].id)
  }
})

// 切换会话时滚到底
watch(activeSessionId, () => scrollToBottom())
</script>

<style lang="scss" scoped>
.user-chat {
  display: flex;
  height: calc(100vh - 60px - 48px); // 扣掉顶栏 + padding
  margin: -24px; // 抵消 userLayout 的 padding
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
      &:hover { 
        background: #f8f6f3; 
      }
    }

    .session-item {
      padding: 12px;
      margin: 0 6px 4px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s;
      &:hover { 
        background: #f8f6f3; 
      }
      &.active { 
        background: #e8f0e4; 
      }

      .session-item-top {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        .session-title { font-size: 13px; font-weight: 500; color: #374151; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .session-time { font-size: 11px; color: #9ca3af; flex-shrink: 0; }
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

  // 消息列表
  .chat-messages {
    flex: 1;
    overflow-y: auto;/* 消息多时这里滚动，头部和输入框不滚动 */
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

  // 聊天气泡
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

    .bubble-content {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .bubble-text {
        padding: 10px 14px;
        font-size: 14px;
        line-height: 1.6;
        color: #374151;

        &.typing {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 14px 18px;
          .dot {
            width: 6px; height: 6px;
            border-radius: 50%;
            background: #c4bfb4;
            animation: bounce 1.4s infinite ease-in-out both;
            &:nth-child(1) { animation-delay: -.32s; }
            &:nth-child(2) { animation-delay: -.16s; }
          }
        }
      }

      .bubble-time {
        font-size: 11px;
        color: #c4bfb4;
        padding: 0 4px;
      }
    }
  }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
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
      background: #8b9e7e;
      border-color: #8b9e7e;
      &:hover { background: #7a8e6f !important; }
    }
  }
}
</style>
