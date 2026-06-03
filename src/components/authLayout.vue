<template>
  <div class="auth-layout">
    <!-- 背景装饰元素 -->
    <!--
      背景装饰圆：右上，左下的三个渐变圆
    -->
    <div class="bg-decoration">
      <div class="deco-circle deco-1" />
      <div class="deco-circle deco-2" />
      <div class="deco-circle deco-3" />
    </div>

    <!-- 内容区：居中卡片由子路由渲染 -->
    <div class="auth-wrapper">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.auth-layout {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #faf7f2 0%, #f0ede4 30%, #e8ede4 70%, #e4ece4 100%);
  overflow: hidden;
  // ============ 背景装饰 ============
    // 三个半透明大圆，缓慢浮动
    .bg-decoration {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        .deco-circle {
            display: block;
            position: absolute;
            border-radius: 50%;
            animation: float 12s ease-in-out infinite;

            // deco-1：右上角最大的鼠尾草绿圆，一半溢出屏幕
            &.deco-1 {
                width: 420px;
                height: 420px;
                background: #c4d8c8;
                opacity: 0.45;
                top: -140px;
                right: -120px;
                animation-delay: 0s;
            }

            // deco-2：左下角暖米色圆
            &.deco-2 {
                width: 280px;
                height: 280px;
                background: #d8cdb8;
                opacity: 0.4;
                bottom: -90px;
                left: -70px;
                animation-delay: -4s;
            }

            // deco-3：中左区域的鼠尾草绿小圆，完全在视口内
            &.deco-3 {
                width: 200px;
                height: 200px;
                background: #c4d8c8;
                opacity: 0.35;
                top: 55%;
                left: 8%;
                animation-delay: -8s;
            }
        }
    }
    // ============ 内容居中容器 ============
    .auth-wrapper {
    position: relative;
    z-index: 1;
    width: 420px;
    max-width: 90vw;
    }
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(15px, -20px) scale(1.05); }
  66%      { transform: translate(-10px, 10px) scale(0.95); }
}

</style>
