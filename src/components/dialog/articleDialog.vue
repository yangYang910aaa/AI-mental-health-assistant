<template>
    <el-dialog
        :title="formData.id ? '编辑文章' : '新增文章'"
        v-model="dialogVisible"
        width="50%"
        @close="handleClose"
    >
        <el-form :model="formData" ref="formRef" :rules="rules" label-width="120px">
            <el-form-item label="文章标题" prop="title">
                <el-input v-model="formData.title" placeholder="请输入文章标题" maxlength="200" show-word-limit clearable />
            </el-form-item>
            <el-form-item label="所属分类" prop="category">
                <el-select v-model="formData.category" placeholder="请选择所属分类">
                    <el-option v-for="item in categories" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
            </el-form-item>
            <el-form-item label="文章摘要" prop="summary">
                <el-input type="textarea" v-model="formData.summary" placeholder="请输入摘要(可选)" maxlength="1000" show-word-limit clearable :rows="4" />
            </el-form-item>
            <el-form-item label="标签" prop="tags">
                <el-select v-model="formData.tags" placeholder="请选择标签"  filterable allow-create multiple >
                    <el-option v-for="tag in tags" :key="tag" :label="tag" :value="tag" />
                </el-select>
            </el-form-item>
            <el-form-item label="封面图片" prop="coverImage">
                <div class="cover-upload">
                    <el-upload
                        class="cover-uploader"
                        action="#"
                        :show-file-list="false"
                        :before-upload="beforeUpload"
                        :http-request="handleUploadRequest"
                        accept="image/*"
                    >
                        <img v-if="coverUrl" :src="coverUrl" class="cover-preview" />
                        <div class="cover-placeholder" v-else>
                            <p>点击上传封面</p>
                        </div>
                    </el-upload>
                        <el-button type="danger" @click="handleRemoveCover" v-if="coverUrl">移除封面</el-button>
                </div>
            </el-form-item>
            <el-form-item label="文章内容" prop="content">
                <div class="editor-wrapper" v-if="dialogVisible">
                    <Toolbar :editor="editorRef" :defaultConfig="toolbarConfig" mode="default" />
                    <Editor
                        v-model="contentHtml"
                        :defaultConfig="editorConfig"
                        mode="default"
                        @onCreated="handleEditorCreated"
                    />
                    <div class="editor-footer">
                        <span>{{ wordCount }} 字</span>
                    </div>
                </div>
            </el-form-item>
        </el-form>
        <div v-if="previewVisible">
            <h3>预览效果</h3>
            <div v-html="contentHtml"></div>
        </div>
        <template #footer>
            <el-button type="primary" @click="previewVisible=!previewVisible">{{ previewVisible?'隐藏预览':'预览效果' }}</el-button>
            <el-button @click="handleClose">关闭</el-button>
            <el-button @click="handleSubmit" :loading="loading" type="danger">{{ formData.id ? '更新' : '创建' }}</el-button>
        </template>
    </el-dialog>
</template>
<script setup lang="ts">
import { ref, reactive, computed, shallowRef, watch } from 'vue'
import type { PropType } from 'vue'
import type { FormInstance, UploadRequestOptions } from 'element-plus'
import type { ArticleCategory } from '@/api/knowledge'
import { createArticle, updateArticle } from '@/api/knowledge'
import type { Article } from '@/api/knowledge'
import { uploadFile } from '@/api/file'
import { ElMessage } from 'element-plus'

// 富文本编辑器
import type { IDomEditor, IToolbarConfig, IEditorConfig } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'

// 接收父组件传递的 visible（控制 dialog 显隐）和分类列表、标签列表
// article 有值 → 编辑模式，无值 → 新增模式
const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    categories: {
        type: Array as PropType<ArticleCategory[]>,
        default: () => [],
    },
    tags:{
        type:Array as PropType<string[]>,
        default:()=>[]
    },
    article: {
        type: Object as PropType<Article | null>,
        default: null,
    },
})
//向父组件传递dialogVisible属性:更新visible
const emit=defineEmits(['update:visible', 'success'])

const dialogVisible=computed({
    get(){
        return props.visible
    },
    set(val){
        emit('update:visible',val)
    }
})
const formRef = ref<FormInstance>()

//表单数据
const formData=reactive({
    id:'',//文章id
    title:'',//文章标题
    content:'',//文章内容
    coverImage:'',//封面图片
    category:'',//分类
    summary:'',//摘要
    tags:[] as string[],//标签（多选，必须是数组）
})

//表单校验规则
const rules=reactive({
    title:[
        {required:true,message:'请输入文章标题',trigger:'blur'}
    ],
    category:[
        {required:true,message:'请选择所属分类',trigger:'change'}
    ],
    content:[
        {required:true,message:'请输入文章内容',trigger:'blur'},
        {validator:( 
          _rule: unknown,
          _value: unknown,
          callback: (error?: Error) => void
        ) => {
            // 去掉 HTML 标签后判断是否有文字
            const text=contentHtml.value.replace(/<[^>]*>/g,'').trim()
            if(!text) callback(new Error('文章内容不能为空'))
            else callback()
        },trigger:'blur'}
    ],
})

// 关闭弹窗时，重置表单数据和封面预览
const handleClose = () => {
  formRef.value?.resetFields()
  coverUrl.value = ''
  emit('update:visible', false)
}

// ==================== 上传封面图片 ====================
const coverUrl = ref('')
const uploading = ref(false)

// 上传前校验
const beforeUpload = (file: File) => {
  const isImage = /^image\//.test(file.type)
  if (!isImage) {
    ElMessage.error('请上传图片文件类型')
    return false
  }
  const maxSize = 6 * 1024 * 1024 // 6MB
  if (file.size > maxSize) {
    ElMessage.error('图片大小不能超过6MB')
    return false
  }
  return true
}

// 上传封面图片
const handleUploadRequest = async (options: UploadRequestOptions) => {
  uploading.value = true

  // 真实后端上传
  try {
    const result = await uploadFile(options.file)//result:{url:'}
    coverUrl.value = result.url
    formData.coverImage = result.url
    uploading.value = false
    options.onSuccess({ url: result.url })
  } catch {
    uploading.value = false
    ElMessage.error('封面上传失败')
    options.onError(new Error('上传失败'))
  }
}

// 移除封面图片
const handleRemoveCover=()=>{
    coverUrl.value=''
    formData.coverImage=''
}

// ==================== 富文本编辑器 ====================
const editorRef = shallowRef<IDomEditor>()
const contentHtml = ref('')
//内容预览
const previewVisible = ref(false)

// 编辑器初始化后拿到实例
const handleEditorCreated = (editor: IDomEditor) => {
  editorRef.value = editor
}

// 同步编辑器内容到表单
watch(contentHtml, (val) => {
  formData.content = val
})

// 工具栏配置
const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ['group-video'], // 不需要视频按钮
}

// 编辑器配置
const editorConfig: Partial<IEditorConfig> = {
  placeholder: '请输入文章内容…',
  autoFocus: false,
  MENU_CONF: {
    uploadImage: {
      // 自定义上传：接入项目的 uploadFile，
      // 后端好了之后图片就能直接存入服务器
      async customUpload(file: File, insertFn: (url: string) => void) {
        try {
          const result = await uploadFile(file)
          insertFn(result.url)
        } catch {
          ElMessage.error('图片上传失败')
        }
      },
    },
  },
}

// 字数统计（去掉 HTML 标签后的纯文本长度）
const wordCount = computed(() => {
  const text = contentHtml.value.replace(/<[^>]*>/g, '').trim()
  return text.length
})


// ==================== 弹窗打开时回填 / 清空表单数据 ====================
watch(dialogVisible, (val) => {
  if (!val) {
    contentHtml.value = ''
    return  // 关闭时不处理表单，handleClose 已 resetFields
  }

  const a = props.article
  if (a) {
    // 编辑模式：回填已有数据
    formData.id = String(a.id)
    formData.title = a.title
    formData.category = a.category
    formData.summary = a.summary || ''
    formData.tags = a.tags || []
    formData.coverImage = a.coverImage || ''
    coverUrl.value = a.coverImage || ''
    contentHtml.value = a.content || ''
  } else {
    // 新增模式：清空所有
    formData.id = ''
    formData.title = ''
    formData.content = ''
    formData.category = ''
    formData.summary = ''
    formData.tags = []
    formData.coverImage = ''
    coverUrl.value = ''
    contentHtml.value = ''
  }
})

// ==================== 提交表单 ====================
const loading = ref(false)
const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    if (formData.id) {
      // 编辑模式
      await updateArticle(Number(formData.id), {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        summary: formData.summary,
        coverImage: formData.coverImage,
        tags: formData.tags,
      })
      ElMessage.success('保存成功')
    } else {
      // 新增模式
      await createArticle({
        title: formData.title,
        content: formData.content,
        category: formData.category,
        summary: formData.summary,
        coverImage: formData.coverImage,
        tags: formData.tags,
      })
      ElMessage.success('创建成功')
    }
    emit('success')
    handleClose()
  } catch {
    // 错误由拦截器处理
  } finally {
    loading.value = false
  }
}
</script>
<style scoped lang="scss">
// ==================== 富文本编辑器 ====================
.editor-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;

  :deep(.w-e-toolbar) {
    border-bottom: 1px solid #dcdfe6;
  }

  :deep(.w-e-text-container) {
    height: 400px;
  }

  .editor-footer {
    display: flex;
    justify-content: flex-end;
    padding: 4px 12px;
    font-size: 12px;
    color: #909399;
    border-top: 1px solid #ebeef5;
    background: #fafafa;
  }
}

.cover-placeholder {
    width: 200px;
    height: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #8b949e;
    background: #f6f8fa;
    border: 1px dashed #d0d7de;
    border-radius: 6px;
    cursor: pointer;
}
// 预览图片
.cover-preview {
    width: 200px;
    height: 120px;
    object-fit: cover;
    border-radius: 6px;
}
</style>