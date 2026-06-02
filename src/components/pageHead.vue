<template>
    <div class="page-head">
        <p class="page-title">{{props.title}}</p>
        <div class="action-btn">
            <slot name="buttons"></slot>
        </div>
    </div>
</template>
<script lang="ts" setup>
interface Props {
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '页面标题',
})
</script>
<style lang="scss" scoped>
.page-head{
    display: flex;
    align-items: center;
    justify-content: space-between;
    .page-title{
        font-size: 24px;
        color:#29323c;
    }
}
</style>