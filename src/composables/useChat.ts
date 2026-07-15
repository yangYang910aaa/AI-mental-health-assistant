/**
 * useChat —— 聊天状态机。
 *
 * 抽离 userChat.vue 中所有非 UI 逻辑：
 * - 会话管理（列表/切换/新建/删除/重命名/置顶）
 * - 流式消息发送（乐观更新 + SSE 消费 + RAF 节流）
 * - 取消生成（AbortController）
 * - 错误恢复（保留部分内容 + 可重试）
 * - 切换安全性（generationId 防串消息）
 *
 * 用法：
 * ```ts
 * const chat = useChat()
 * // 模板直接绑定 chat.sessions / chat.messages / chat.isGenerating ...
 * // 按钮绑 chat.sendMessage() / chat.stopGeneration() / chat.retryMessage()
 * ```
 */

import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import {
  getChatSessions,
  getChatMessages,
  sendMessageStream,
  renameSession,
  togglePinSession,
  deleteChatSession,
  type ChatSession,
  type ChatMessage,
} from '@/api/user'

// ==================== 类型 ====================

export interface ChatState {
  sessions: ReturnType<typeof ref<ChatSession[]>>
  messages: ReturnType<typeof ref<ChatMessage[]>>
  activeSessionId: ReturnType<typeof ref<number | null>>
  inputText: ReturnType<typeof ref<string>>
  isGenerating: ReturnType<typeof ref<boolean>>
  sidebarCollapsed: ReturnType<typeof ref<boolean>>
  currentSessionTitle: ReturnType<typeof computed<string>>
  loadSessions: () => Promise<void>
  switchSession: (id: number) => Promise<void>
  startNewChat: () => void
  sendMessage: () => Promise<void>
  stopGeneration: () => void
  retryMessage: () => Promise<void>
  handleSessionAction: (command: string, session: ChatSession) => Promise<void>
  scrollToBottom: (container: HTMLElement | undefined) => void
  focusInput: (inputEl: { focus?: () => void } | undefined) => void
  formatTime: (time: string) => string
}

// ==================== 实现 ====================

export function useChat() {
  // ==================== 状态 ====================

  const sessions = ref<ChatSession[]>([])
  const messages = ref<ChatMessage[]>([])
  const activeSessionId = ref<number | null>(null)
  const inputText = ref('')
  const isGenerating = ref(false)
  const isThinking = ref(false)       // AI 开始生成但还没收到第一个 token
  const showScrollHint = ref(false)   // 用户翻看历史时显示「↓ 新消息」
  const sidebarCollapsed = ref(false)
  const loadingSessions = ref(false)

  // 防串消息：每次 sendMessage 递增，SSE 回调中校验
  let generationId = 0

  // AbortController：供 stopGeneration 使用
  let abortController: AbortController | null = null

  // ==================== 计算属性 ====================

  const currentSessionTitle = computed(() => {
    const s = sessions.value.find((s) => s.id === activeSessionId.value)
    return s?.title || '新对话'
  })

  // ==================== 工具函数 ====================

  /** 智能滚动：用户已在底部附近时才自动滚，否则显示提示按钮 */
  const scrollToBottom = (container: HTMLElement | undefined, force = false) => {
    nextTick(() => {
      if (!container) return
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120
      if (force || atBottom) {
        container.scrollTop = container.scrollHeight
        showScrollHint.value = false
      } else {
        showScrollHint.value = true
      }
    })
  }

  const focusInput = (inputEl: { focus?: () => void } | undefined) => {
    nextTick(() => inputEl?.focus?.())
  }

  const formatTime = (time: string) => {
    if (!time) return ''
    const d = new Date(time.replace(' ', 'T'))
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return time.slice(11, 16) // 今天 → HH:mm
    return time.slice(5, 10) // 其他 → MM-DD
  }

  // ==================== 会话管理 ====================

  const loadSessions = async () => {
    loadingSessions.value = true
    try {
      sessions.value = await getChatSessions()
    } catch {
      sessions.value = []
    } finally {
      loadingSessions.value = false
    }
  }

  const switchSession = async (id: number) => {
    // 切换前先取消当前生成，防止旧回调污染新会话
    stopGeneration()
    activeSessionId.value = id
    try {
      messages.value = await getChatMessages(id)
    } catch {
      messages.value = []
    }
  }

  const startNewChat = () => {
    stopGeneration()
    activeSessionId.value = null
    messages.value = []
    inputText.value = ''
  }

  // ==================== 流式发送 ====================

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    isGenerating.value = false
  }

  const sendMessage = async () => {
    const text = inputText.value.trim()
    if (!text || isGenerating.value) return

    // 原子：清输入 + 置 flag，防止重复发送
    inputText.value = ''
    isGenerating.value = true

    // 递增 generationId，SSE 回调中校验，切换会话后旧回调自动丢弃
    const thisGenId = ++generationId

    // ===== 乐观插入用户消息 =====
    const tempId = Date.now()
    const tempTime = new Date().toISOString().replace('T', ' ').slice(0, 19)
    messages.value.push({
      id: tempId,
      sender: 'user',
      content: text,
      time: tempTime,
    })

    // ===== 创建 AbortController =====
    abortController = new AbortController()
    const signal = abortController.signal

    // 流式回调中使用的变量
    let aiBubbleIndex = -1

    // ===== RAF 节流：chunk 先攒到 plain string，每帧最多 flush 一次 =====
    let _accumulated = ''
    let _rafHandle = 0 // RAF handle，0 表示无待 flush

    const flushChunk = () => {
      _rafHandle = 0
      if (aiBubbleIndex >= 0 && messages.value[aiBubbleIndex]) {
        messages.value[aiBubbleIndex] = {
          ...messages.value[aiBubbleIndex],
          content: _accumulated,
        }
      }
    }

    try {
      await sendMessageStream(
        activeSessionId.value,
        text,
        {
          onMeta({ sessionId, userMessage }) {
            // 校验：会话可能已在流式过程中被切换
            if (generationId !== thisGenId) return

            // 替换临时用户消息为真实消息
            const idx = messages.value.findIndex((m) => m.id === tempId)
            if (idx !== -1) messages.value[idx] = userMessage

            // 创建空 AI 气泡
            messages.value.push({
              id: -Date.now(),
              sender: 'assistant',
              content: '',
              time: '',
            })
            aiBubbleIndex = messages.value.length - 1
            _accumulated = ''
            isThinking.value = true

            // 新会话 → 记录 sessionId
            if (!activeSessionId.value) {
              activeSessionId.value = sessionId
            }
          },

          onChunk({ content }) {
            if (generationId !== thisGenId) return
            if (aiBubbleIndex < 0) return

            // 收到第一个 token → 结束思考动画
            if (isThinking.value) isThinking.value = false

            //不断累加内容
            _accumulated += content

            // RAF 节流：同一帧内多次 chunk 只 flush 一次
            if (!_rafHandle) {
              _rafHandle = requestAnimationFrame(flushChunk)
            }
          },

          async onDone({ aiReply }) {
            if (generationId !== thisGenId) return

            // 先把 RAF 残留 flush 掉
            if (_rafHandle) {
              cancelAnimationFrame(_rafHandle)
              _rafHandle = 0
            }
            // 用后端返回的完整消息替换
            if (aiBubbleIndex >= 0 && messages.value[aiBubbleIndex]) {
              messages.value[aiBubbleIndex] = aiReply
            }

            await loadSessions()
            isGenerating.value = false
            isThinking.value = false
            abortController = null
          },

          onError(message) {
            if (generationId !== thisGenId) return

            // 保留已收到的 AI 内容，标记为错误（不替换整个气泡）
            if (aiBubbleIndex >= 0 && messages.value[aiBubbleIndex]) {
              const curr = messages.value[aiBubbleIndex]
              const prefix = curr.content
                ? curr.content + '\n\n⚠ 生成中断'
                : 'AI 回复生成失败，请稍后重试'
              messages.value[aiBubbleIndex] = {
                ...curr,
                content: prefix,
                error: true,
              }
            }

            console.error('[Chat] 流式发送失败:', message)
            isGenerating.value = false
            isThinking.value = false
            abortController = null
          },
        },
        signal,
      )
    } catch (err: unknown) {
      // AbortError → 用户主动取消，静默退出
      if (err instanceof DOMException && err.name === 'AbortError') {
        // 取消残留 RAF，防止旧 flushChunk 在下一轮会话中覆盖错误消息
        if (_rafHandle) {
          cancelAnimationFrame(_rafHandle)
          _rafHandle = 0
        }
        // flush 已收到的内容，保留在气泡中
        if (aiBubbleIndex >= 0 && messages.value[aiBubbleIndex]) {
          messages.value[aiBubbleIndex] = {
            ...messages.value[aiBubbleIndex],
            content: _accumulated,
          }
        }
        isGenerating.value = false
        isThinking.value = false
        abortController = null
        return
      }
      // 其他异常已在 onError 中处理，这里做最后兜底
      isGenerating.value = false
      isThinking.value = false
      abortController = null
    }
  }

  /** 重试最后一条失败的消息——删除失败的 AI 气泡后重新发送 */
  const retryMessage = async () => {
    if (isGenerating.value) return
    if (messages.value.length === 0) return

    // 找最后一条用户消息
    const lastMsg = messages.value[messages.value.length - 1]
    const isAiError =
      lastMsg.sender === 'assistant' && lastMsg.error

    if (isAiError) {
      // 删除失败的 AI 气泡，用原用户消息文本重新发送
      const toRetry = messages.value[messages.value.length - 2]
      if (toRetry?.sender === 'user') {
        messages.value.pop() // 只删 AI 气泡，保留用户消息在列表和 DB 中
        inputText.value = toRetry.content
        await sendMessage()
      }
    }
  }

  // ==================== 会话操作 ====================

  const handleSessionAction = async (command: string, session: ChatSession) => {
    switch (command) {
      case 'rename':
        try {
          const { value } = await ElMessageBox.prompt('请输入新标题', '重命名', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputValue: session.title,
            inputValidator: (v: string) => v.trim().length > 0 || '标题不能为空',
          })
          if (value?.trim()) {
            await renameSession(session.id, value.trim())
            session.title = value.trim()
          }
        } catch { /* 用户取消 */ }
        break

      case 'pin':
        try {
          const result = await togglePinSession(session.id)
          session.pinned = result.pinned
          sessions.value.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
            return 0
          })
        } catch { /* 忽略 */ }
        break

      case 'delete':
        try {
          await ElMessageBox.confirm('删除后对话记录不可恢复，确定删除？', '删除对话', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
          })
          await deleteChatSession(session.id)
          sessions.value = sessions.value.filter((s) => s.id !== session.id)
          if (activeSessionId.value === session.id) {
            startNewChat()
          }
        } catch { /* 用户取消 */ }
        break
    }
  }

  // ==================== 生命周期 ====================

  onMounted(async () => {
    await loadSessions()
    if (sessions.value.length > 0) {
      await switchSession(sessions.value[0].id)
    }
  })

  // ==================== 导出 ====================

  return {
    // 状态
    sessions,
    messages,
    activeSessionId,
    inputText,
    isGenerating,
    isThinking,
    showScrollHint,
    sidebarCollapsed,
    loadingSessions,
    // 计算
    currentSessionTitle,
    // 方法
    loadSessions,
    switchSession,
    startNewChat,
    sendMessage,
    stopGeneration,
    retryMessage,
    handleSessionAction,
    scrollToBottom,
    focusInput,
    formatTime,
  }
}
