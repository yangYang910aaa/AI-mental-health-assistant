import { computed, reactive, ref, type Ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { BusinessError } from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { updateProfile, changePassword } from '@/api/auth'
import { uploadFile } from '@/api/file'

/**
 * 个人中心共享逻辑 —— 头像上传、昵称编辑、密码修改。
 * 用户端和管理端共用。
 *
 * @param fileInput         模板 ref，指向 hidden file input（组件自己声明，满足 vue-tsc）
 * @param passwordFormRef   模板 ref，指向密码 el-form（同上）
 * @param defaultInitial    头像占位首字，用户端 'U'，管理端 '管'
 */
export function useProfile(
  fileInput: Ref<HTMLInputElement | undefined>,
  passwordFormRef: Ref<FormInstance | undefined>,
  defaultInitial = 'U',
) {
  const userStore = useUserStore()

  // ==================== 头像 ====================

  const avatarPreview = ref<string>(userStore.userInfo?.avatar || '')
  const userInitial = computed(() => userStore.displayName?.charAt(0) || defaultInitial)

  const triggerUpload = () => {
    fileInput.value?.click()
  }

  const handleAvatarChange = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

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
      const updated = await updateProfile({ avatar: result.url })
      userStore.setUser(updated)
      avatarPreview.value = result.url
      ElMessage.success('头像已更新')
    } catch (err: any) {
      if (!(err instanceof BusinessError)) ElMessage.error(err.message || '头像上传失败')
    }

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

  return {
    // 头像
    avatarPreview,
    userInitial,
    triggerUpload,
    handleAvatarChange,
    // 昵称
    nickname,
    savingNickname,
    saveNickname,
    // 密码
    passwordForm,
    passwordRules,
    savingPassword,
    savePassword,
  }
}
