<template>
    <el-form :model="formData" ref="formRef" @keyup.enter="onEnter" @submit.prevent>
        <el-row :gutter="24">
            <template v-for="item in formItemWithCol" :key="item.prop">
                <el-col v-bind="item.col" >
                    <el-form-item :label="item.label" :prop="item.prop">
                        <component
                          v-model="formData[item.prop]"
                          :is="isComp(item.comp)"
                          :placeholder="item.placeholder"
                          :clearable="item.comp !== 'select'"
                          :fetch-suggestions="item.fetchSuggestions"
                          :trigger-on-focus="item.triggerOnFocus"
                          :value-key="item['value-key']"
                          @select="item.onSelect"
                          @change="item.comp === 'select' && submitForm()"
                        >
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
            <el-button color="#626aef" :icon="Search" @click="submitForm">查询</el-button>
            <el-button type="danger" :icon="RefreshRight" @click="resetForm">重置</el-button>
        </el-row>
    </el-form>
</template>

<script setup lang="ts">
import { RefreshRight, Search } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
import type { PropType } from 'vue'
import { ref,reactive,computed } from 'vue'

const formRef=ref<FormInstance>()
// 表单数据（输入组件 v-model 绑定均为字符串）
const formData: Record<string, string> = reactive({})

// 搜索表单配置项——模板实际访问的属性显式标注，其余通过索引签名兼容
interface FormItem {
  label: string
  prop: string
  comp: string
  placeholder: string
  col?: Record<string, number>
  options?: Array<{ label: string; value: string }>
  fetchSuggestions?: Function
  triggerOnFocus?: boolean
  onSelect?: Function
  [key: string]: unknown
}
//接收父组件传递的 formItem 数组,props是一个响应式对象,里面包裹了formItem数组
const props = defineProps({
  formItem: {
    type: Array as PropType<FormItem[]>,
    default: () => [],
  },
})

// comp 类型 → 组件名字符串映射，后续扩展直接加 key
const COMP_MAP: Record<string, string> = {
  input: 'el-input',
  select: 'el-select',
  autocomplete: 'el-autocomplete',
}

const isComp = (comp: string): string => {
  return COMP_MAP[comp] ?? COMP_MAP.input//如果comp不在COMP_MAP中，默认使用input组件
}
//定义子组件触发的事件
const emit = defineEmits(['search'])

// 给每个 formItem 补上 el-col 的响应式栅格配置
const formItemWithCol = computed(() =>
  props.formItem.map(
    (item): FormItem => ({
      ...item,
      //不同屏幕宽度下的栅格配置，默认24列
      col: item.col ?? { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 },
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

// 输入框按回车触发查询（select 用 @change 即时触发，不走这里）
const onEnter = () => {
  submitForm()
}
</script>

<style lang="scss" scoped>

</style>
