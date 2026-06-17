<template>
  <div class="user-profile">
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
            <el-button
              type="primary"
              size="small"
              :loading="savingNickname"
              @click="saveNickname"
            >
              保存
            </el-button>
          </div>
        </div>

        <div class="info-row">
          <span class="info-label">角色</span>
          <el-tag size="small" :type="userStore.userInfo?.roles?.includes('admin') ? 'danger' : ''">
            {{ userStore.userInfo?.roles?.includes('admin') ? '管理员' : '普通用户' }}
          </el-tag>
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
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            show-password
            placeholder="请输入旧密码"
            @keyup.enter="savePassword"
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            show-password
            placeholder="至少 6 位"
            @keyup.enter="savePassword"
          />
        </el-form-item>

        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入新密码"
            @keyup.enter="savePassword"
          />
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
import { computed, reactive, ref } from 'vue'
import { Camera } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { BusinessError } from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { updateProfile, changePassword } from '@/api/auth'
import { uploadFile } from '@/api/file'

const userStore = useUserStore()
const passwordFormRef = ref<FormInstance>()
const fileInput = ref<HTMLInputElement>()

// ==================== 头像 ====================

const avatarPreview = ref<string>(userStore.userInfo?.avatar || '')

const userInitial = computed(() => userStore.displayName?.charAt(0) || 'U')

/** 触发文件选择 */
const triggerUpload = () => {
  fileInput.value?.click()
}

/** 选完文件后上传 */
const handleAvatarChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 客户端预检
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 5MB')
    return
  }

  try {
    const result = await uploadFile(file)
    // 先保存到后端，成功后再更新预览
    const updated = await updateProfile({ avatar: result.url })
    userStore.setUser(updated)
    avatarPreview.value = result.url
    ElMessage.success('头像已更新')
  } catch (err: any) {
    if (!(err instanceof BusinessError)) ElMessage.error(err.message || '头像上传失败')
  }

  // 重置 input，允许重复选同一文件
  input.value = ''
}

// ==================== 昵称 ====================

const nickname = ref(userStore.userInfo?.nickname || '')
const savingNickname = ref(false)

const saveNickname = async () => {
  if (!nickname.value.trim()) {
    ElMessage.warning('昵称不能为空')
    return
  }
  if (nickname.value === userStore.userInfo?.nickname) {
    ElMessage.info('昵称未更改')
    return
  }

  savingNickname.value = true
  try {
    const updated = await updateProfile({ nickname: nickname.value.trim() })
    userStore.setUser(updated)
    ElMessage.success('昵称已保存')
  } catch (err: any) {
    if (!(err instanceof BusinessError)) ElMessage.error(err.message || '保存失败')
  } finally {
    savingNickname.value = false
  }
}

// ==================== 密码 ====================

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validateConfirm = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('请再次输入新密码'))
  } else if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' },
  ],
}

const savingPassword = ref(false)

const savePassword = async () => {
  const valid = await passwordFormRef.value?.validate().catch(() => false)
  if (!valid) return

  savingPassword.value = true
  try {
    await changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    })
    ElMessage.success('密码修改成功，下次登录时请使用新密码')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    passwordFormRef.value?.resetFields()
  } catch (err: any) {
    if (!(err instanceof BusinessError)) ElMessage.error(err.message || '修改失败')
  } finally {
    savingPassword.value = false
  }
}
</script>

<style lang="scss" scoped>
.user-profile {
  max-width: 640px;
  margin: 0 auto;

  .profile-card {
    background: #fff;
    border-radius: 16px;
    padding: 28px 32px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    margin-bottom: 20px;
  }

  // ==================== 头像区 ====================
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
      :deep(img) {
        object-fit: cover;
      }
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

    &:hover .avatar-overlay {
      opacity: 1;
    }
  }

  .avatar-hint {
    margin: 10px 0 0;
    font-size: 13px;
    color: #9ca3af;
  }

  // ==================== 信息区 ====================
  .section-title {
    font-size: 17px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 18px;
  }

  .info-section {
    .info-row {
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

        &.muted {
          color: #9ca3af;
        }
      }

      .info-edit {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;

        .nick-input {
          max-width: 280px;
        }
      }
    }
  }

  // ==================== 密码区 ====================
  .password-form {
    margin-top: 4px;

    :deep(.el-form-item__label) {
      color: #6b7280;
    }

    :deep(.el-input) {
      max-width: 320px;
    }
  }
}
</style>
