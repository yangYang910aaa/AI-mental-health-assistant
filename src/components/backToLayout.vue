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
import sideBar from './sideBar.vue'
import navBar from './navBar.vue'
</script>
<style lang="scss" scoped>
.back-to-layout{
    height: 100vh;
    .main-container{
      height: 100%;
      .el-header{
        height: 70px !important;
      }
      .content-container{
        margin:-10px 0 0 -10px;
        padding: 20px;
        background: white;
        min-height: calc(100vh - 70px);
      }
    }
} 
</style>