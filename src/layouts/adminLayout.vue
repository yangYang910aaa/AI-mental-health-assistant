<template>
  <div class="back-to-layout">
    <el-container class="main-container">
      <sideBar/>
      <el-container>
        <el-header >
          <navBar/>
        </el-header>
        <el-main>
          <router-view class="content-container"/>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import sideBar from '@/components/admin-page/sideBar.vue'
import navBar from '@/components/admin-page/navBar.vue'
</script>
<style lang="scss" scoped>
.back-to-layout{
    height: 100vh;
    background: #fff;
    .main-container{
      height: 100%;
      .el-header{
        height: 70px !important;
      }
      .el-main {
        padding: 10px;
      }
      .content-container{
        padding: 20px;
        min-height: calc(100vh - 70px);
      }
    }
}
</style>
