<template>
    <el-form :model="formData" ref="formRef">
        <el-row :gutter="24">         
            <template v-for="item in formItemWithCol" :key="item.prop">
                <el-col v-bind="item.col" >
                    <el-form-item :label="item.label" :prop="item.prop">
                        <component v-model="formData[item.prop]" :is="isComp(item.comp)" :placeholder="item.placeholder" >    
                            <template v-if="item.comp==='select'">
                                <el-option label="全部" value=""/>
                                <el-option 
                                v-for="option in item.options" 
                                :key="option.value" 
                                :label="option.label" 
                                :value="option.value"/>
                            </template>
                        </component>
                    </el-form-item>
                </el-col>
            </template>
        </el-row>
        <el-row>
            <el-button type="primary" @click="submitForm">查询</el-button>
            <el-button type="danger" @click="resetForm">重置</el-button>
        </el-row>
    </el-form>
</template>

<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import type { PropType } from 'vue'
import { ref,reactive,computed } from 'vue'

const formRef=ref<FormInstance>()
//表单数据
const formData:Record<string,any>=reactive({})

// 搜索表单的类型限制——核心字段有提示，扩展字段随便加
interface FormItem {
  label: string
  prop: string
  comp: string
  placeholder: string
  [key: string]: any  // 其他属性（options、col、multiple…）自由传递，不报类型错误
}
//接收父组件传递的 formItem 数组
const props = defineProps({
  formItem: {
    type: Array as PropType<FormItem[]>,
    default: () => [],
  },
})

// 根据 comp 返回对应的组件
const isComp=(comp:string)=>{
    return{
        input:'el-input',
        select:'el-select',
    }[comp]
}

const emit = defineEmits(['search'])

// 给每个 formItem 补上 el-col 的响应式栅格配置
const formItemWithCol = computed(() =>
  props.formItem.map(
    (item): FormItem => ({
      ...item,
      col: { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 },
    })
  )
)
// 提交表单
const submitForm=()=>{
    emit('search',formData)
}

// 重置表单
const resetForm = () => {
    //先重置表单，再触发查询
    formRef.value?.resetFields()
    emit('search',formData)
}
</script>

<style lang="scss" scoped>

</style>
