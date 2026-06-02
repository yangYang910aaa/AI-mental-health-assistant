<template>
    <div>
        <pageHead title="知识文章">
            <template #buttons>
                <el-button type="primary">新增</el-button>
            </template>
        </pageHead>
        <tableSearch :formItem="formItem" @search="handleSearch"/>
    </div>
</template>
<script setup lang="ts">
import pageHead from '@/components/pageHead.vue'
import tableSearch from '@/components/tableSearch.vue'

const formItem=[
    {label:'文章标题',prop:'title',comp:'input',placeholder:'请输入文章标题'},
    {label:'文章分类',prop:'category',comp:'select',placeholder:'请选择文章分类',options:[
        {label:'心理健康',value:'mental-health'},
        {label:'情绪管理',value:'emotion-management'}
    ]},
]

const handleSearch=(formData:any)=>{
    console.log(formData)
}
</script>
