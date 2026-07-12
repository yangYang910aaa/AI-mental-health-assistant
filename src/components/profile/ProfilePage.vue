<template>
  <div :class="role === 'admin' ? 'admin-profile' : 'user-profile'">
    <!-- ==================== 头像区 ==================== -->
    <div class="profile-card">
      <div class="avatar-section">
        <div class="avatar-wrapper" @click="triggerUpload" title="点击更换头像">
          <el-avatar :src="avatarPreview || userInitial" :size="100" class="avatar-img">
            {{ userInitial }}
          </el-avatar>
          <div class="avatar-overlay">
            <el-icon :size="24"><Camera /></el-icon>
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style="display: none"
          @change="handleAvatarChange"
        />
        <p class="avatar-hint">点击更换头像</p>
      </div>

      <!-- ==================== 基本资料 ==================== -->
      <div class="info-section">
        <h3 class="section-title">基本资料</h3>

        <div class="info-row">
          <span class="info-label">用户名</span>
          <span class="info-value muted">{{ userStore.userInfo?.username }}</span>
        </div>

        <div class="info-row">
          <span class="info-label">邮箱</span>
          <div class="info-edit">
            <el-input
              v-model="email"
              :maxlength="255"
              placeholder="请输入邮箱"
              class="nick-input"
              @keyup.enter="saveEmail"
            />
            <el-button type="primary" size="small" :loading="savingEmail" @click="saveEmail">
              保存
            </el-button>
          </div>
        </div>

        <div class="info-row">
          <span class="info-label">昵称</span>
          <div class="info-edit">
            <el-input
              v-model="nickname"
              :maxlength="50"
              show-word-limit
              placeholder="请输入昵称"
              class="nick-input"
              @keyup.enter="saveNickname"
            />
            <el-button type="primary" size="small" :loading="savingNickname" @click="saveNickname">
              保存
            </el-button>
          </div>
        </div>

        <div class="info-row">
          <span class="info-label">角色</span>
          <el-tag v-if="role === 'admin'" type="danger">管理员</el-tag>
          <el-tag v-else size="small">普通用户</el-tag>
        </div>
      </div>
    </div>

    <!-- ==================== 修改密码 ==================== -->
    <div class="profile-card">
      <h3 class="section-title">修改密码</h3>

      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
        label-position="left"
        class="password-form"
      >
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password
            placeholder="请输入旧密码" @keyup.enter="savePassword" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password
            placeholder="至少 6 位" @keyup.enter="savePassword" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password
            placeholder="请再次输入新密码" @keyup.enter="savePassword" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="savingPassword" @click="savePassword">
            修改密码
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Camera } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
import { useProfile } from '@/composables/useProfile'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  role: 'user' | 'admin'
  defaultInitial: string
}>()

const fileInput = ref<HTMLInputElement>()
const passwordFormRef = ref<FormInstance>()

const {
  avatarPreview,
  userInitial,
  triggerUpload,
  handleAvatarChange,
  nickname, savingNickname, saveNickname,
  email, savingEmail, saveEmail,
  passwordForm, passwordRules, savingPassword, savePassword,
} = useProfile(fileInput, passwordFormRef, props.defaultInitial)

const userStore = useUserStore()
</script>

<style lang="scss" scoped>
.user-profile,
.admin-profile {
  max-width: 640px;
  margin: 0 auto;

  .profile-card {
    background: #fff;
    border-radius: 16px;
    padding: 28px 32px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid #ebeef5;
    margin-bottom: 20px;
  }

  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 24px;
    border-bottom: 1px solid #f0ede6;
    margin-bottom: 24px;
  }

  .avatar-wrapper {
    position: relative;
    cursor: pointer;
    border-radius: 50%;

    .avatar-img {
      display: block;
      :deep(img) { object-fit: cover; }
    }

    .avatar-overlay {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      opacity: 0;
      transition: opacity 0.2s;
    }

    &:hover .avatar-overlay { opacity: 1; }
  }

  .avatar-hint {
    margin: 10px 0 0;
    font-size: 13px;
    color: #9ca3af;
  }

  .section-title {
    font-size: 17px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 18px;
  }

  .info-section .info-row {
    display: flex;
    align-items: center;
    padding: 12px 0;

    .info-label {
      width: 70px;
      font-size: 14px;
      color: #6b7280;
      flex-shrink: 0;
    }

    .info-value {
      font-size: 14px;
      color: #374151;
      &.muted { color: #9ca3af; }
    }

    .info-edit {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      .nick-input { max-width: 280px; }
    }
  }

  .password-form {
    margin-top: 4px;
    :deep(.el-form-item__label) { color: #6b7280; }
    :deep(.el-input) { max-width: 320px; }
  }
}
</style>
