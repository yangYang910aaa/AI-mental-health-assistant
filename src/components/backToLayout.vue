<template>
  <div class="back-to-layout">
    <el-container>
      <sideBar/>
      <el-container>
        <el-header>
          <navBar/>
        </el-header>
        <el-main>
          <router-view/>
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

}
</style>