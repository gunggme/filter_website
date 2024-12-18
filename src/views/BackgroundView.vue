<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFilterStore } from '@/stores/filterStore'
import bg1 from '@/assets/backgrounds/bg1.png'
import bg2 from '@/assets/backgrounds/bg2.png'
import bg3 from '@/assets/backgrounds/bg3.png'
import bg4 from '@/assets/backgrounds/bg4.png'

const router = useRouter()
const store = useFilterStore()

const backgrounds = ref([
  { id: 1, name: '배경1', url: bg1 },
  { id: 2, name: '배경2', url: bg2 },
  { id: 3, name: '배경3', url: bg3 },
  { id: 4, name: '배경4', url: bg4 },
])

const selectedBackground = ref(store.selectedBackground)

const selectBackground = (backgroundId: number) => {
  selectedBackground.value = backgroundId
  store.setBackground(backgroundId)
  router.push('/character')
}
</script>

<template>
  <div class="background-view android-screen">
    <div class="toolbar">
      <h1>배경 선택</h1>
    </div>

    <div class="content">
      <div class="background-grid">
        <div 
          v-for="bg in backgrounds" 
          :key="bg.id"
          class="background-item"
          :class="{ 'selected': selectedBackground === bg.id }"
          @click="selectBackground(bg.id)"
        >
          <img :src="bg.url" :alt="bg.name">
          <div class="selection-overlay" v-if="selectedBackground === bg.id">
            <span class="material-icons">check_circle</span>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button 
          class="android-button secondary"
          @click="$router.push('/camera-setup')"
        >
          이전
        </button>
        <button 
          class="android-button"
          @click="$router.push('/character')"
          :disabled="!selectedBackground"
        >
          다음
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.android-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #FFFFFF;
}

.toolbar {
  padding: 16px;
  background-color: #6200EE;
  color: white;
  elevation: 4;
}

.toolbar h1 {
  font-size: 20px;
  font-weight: 500;
}

.content {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.background-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 16px;
}

.background-item {
  position: relative;
  aspect-ratio: 3/4;
  border-radius: 8px;
  overflow: hidden;
  elevation: 2;
  cursor: pointer;
}

.background-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.background-item.selected {
  border: 2px solid #6200EE;
}

.selection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(98, 0, 238, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
}

.selection-overlay .material-icons {
  color: white;
  font-size: 48px;
}

.action-buttons {
  display: flex;
  gap: 16px;
  padding: 16px;
  margin-top: auto;
}

.android-button {
  flex: 1;
}

.android-button.secondary {
  background-color: #03DAC6;
}

.android-button:disabled {
  background-color: #BDBDBD;
  cursor: not-allowed;
}
</style> 