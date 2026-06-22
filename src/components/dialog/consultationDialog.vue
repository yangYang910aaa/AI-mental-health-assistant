<template>
  <el-dialog
    v-model="detailDialogVisible"
    title="咨询会话详情"
    width="900px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <!-- 会话概要 -->
    <div class="session-meta">
      <el-avatar :size="44" class="meta-avatar">
        {{ props.detailRow?.userNickName?.charAt(0) }}
      </el-avatar>
      <div class="meta-info">
        <div class="meta-name">{{ props.detailRow?.userNickName }}</div>
        <div class="meta-sub">
          <span>{{ props.detailRow?.startedAt }}</span>
          <span class="meta-sep">·</span>
          <span>共 {{ props.detailRow?.messageCount }} 条消息</span>
        </div>
      </div>
    </div>

    <el-divider />

    <!-- 对话消息 -->
    <div class="messages-container">
      <div
        v-for="msg in props.detailRow?.messages"
        :key="msg.id"
        class="message-row"
        :class="msg.sender === 'user' ? 'is-user' : 'is-assistant'"
      >
        <!-- AI -->
        <template v-if="msg.sender === 'assistant'">
          <el-avatar :size="36" class="msg-avatar">
            {{ props.detailRow?.aiName?.charAt(0) }}
          </el-avatar>
          <div class="msg-body">
            <div class="msg-sender">{{ props.detailRow?.aiName }}</div>
            <div class="msg-bubble">{{ msg.content }}</div>
            <div class="msg-time">{{ msg.time }}</div>
          </div>
        </template>

        <!-- 用户：头像在右，像微信 -->
        <template v-else>
          <el-avatar :size="36" class="msg-avatar">
            {{ props.detailRow?.userNickName?.charAt(0) }}
          </el-avatar>
          <div class="msg-body">
            <div class="msg-sender">
              {{ props.detailRow?.userNickName }}
              <span v-if="msg.flagged" class="crisis-tag">⚠ 危机预警</span>
            </div>
            <div class="msg-bubble">{{ msg.content }}</div>
            <div class="msg-time">{{ msg.time }}</div>
          </div>
        </template>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="detailDialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import type { Consultation } from '@/api/consultations'

const props = defineProps({
    showDetailDialog: { 
        type: Boolean, 
        default: false 
    },
    detailRow: { 
        type:Object as PropType<Consultation>, 
        default: null 
    },
})
const emit = defineEmits(['update:showDetailDialog'])

const detailDialogVisible = computed({
  get: () => props.showDetailDialog,
  set: (val) => emit('update:showDetailDialog', val),
})
</script>

<style scoped lang="scss">
// ==================== 会话概要 ====================

.session-meta {
  display: flex;
  align-items: center;
  gap: 12px;

  .meta-avatar {
    background: #fdf6ee;
    color: #e0a860;
    font-weight: 600;
    flex-shrink: 0;
  }

  .meta-info {
    .meta-name {
      font-size: 16px;
      font-weight: 600;
      color: #5d4037;
    }

    .meta-sub {
      font-size: 13px;
      color: #b0a090;
      margin-top: 2px;

      .meta-sep {
        margin: 0 6px;
      }
    }
  }
}

// ==================== 消息列表 ====================

.messages-container {
  max-height: 500px;
  overflow-y: auto;
  padding: 4px 0;
}

.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;

  .msg-avatar {
    flex-shrink: 0;
    font-weight: 600;
  }

  .msg-body {
    max-width: 65%;

    .msg-sender {
      font-size: 12px;
      color: #b0a090;
      margin-bottom: 4px;
      padding: 0 2px;
    }

    .msg-bubble {
      padding: 14px 18px;
      border-radius: 20px;
      font-size: 14px;
      line-height: 1.7;
      word-break: break-word;
    }

    .msg-time {
      font-size: 12px;
      color: #ccc0b0;
      margin-top: 4px;
      padding: 0 2px;
    }
  }

  // AI：左对齐，米白底
  &.is-assistant {
    .msg-avatar {
      background: #fdf6ee;
      color: #e0a860;
    }

    .msg-bubble {
      background: #fdf6ee;
      color: #5d4037;
      border-top-left-radius: 4px;
    }
  }

  // 用户：右对齐，浅绿底
  &.is-user {
    flex-direction: row-reverse;

    .msg-avatar {
      background: #e8f5e9;
      color: #81c784;
    }

    .msg-body {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      .msg-bubble {
        background: #e8f5e9;
        color: #3e4a3b;
        border-top-right-radius: 4px;
      }
    }
  }

  // 危机预警标签
  .crisis-tag {
    display: inline-block;
    background: #fef0f0;
    border: 1px solid #fbc4c4;
    color: #e84747;
    border-radius: 4px;
    padding: 0 6px;
    font-size: 12px;
    font-weight: 600;
    margin-left: 6px;
  }
}

// ==================== Element Plus 弹窗 ====================

:deep(.el-dialog__header) {
  border-bottom: 1px solid #f0ebe0;
  padding: 18px 24px 14px;

  .el-dialog__title {
    font-size: 17px;
    font-weight: 600;
    color: #5d4037;
  }
}

:deep(.el-dialog__body) {
  padding: 16px 24px 24px;
}
</style>
