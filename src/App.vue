<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-container">
    <router-view></router-view>
  </div>
</template>

<style>
/* 전역 스타일 */
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --primary-color: #6200EE;
  --secondary-color: #757575;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: #000;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.app-container {
  height: 100vh;
  width: 100vw;
  padding-top: var(--safe-area-inset-top);
  padding-bottom: var(--safe-area-inset-bottom);
  display: flex;
  flex-direction: column;
}

/* 공통 버튼 스타일 */
.android-button {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  background: var(--primary-color);
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.android-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.android-button.secondary {
  background: var(--secondary-color);
}

/* 공통 헤더 스타일 */
.screen-header {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: rgba(0, 0, 0, 0.8);
  z-index: 100;
}

/* 공통 컨테이너 스타일 */
.screen-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 공통 하단 컨트롤 스타일 */
.bottom-controls {
  padding: 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  display: flex;
  gap: 16px;
}

/* 가로 모드 방지 */
@media screen and (orientation: landscape) {
  .app-container {
    transform: rotate(-90deg);
    transform-origin: left top;
    width: 100vh;
    height: 100vw;
    position: absolute;
    top: 100%;
    left: 0;
  }
}
</style>
