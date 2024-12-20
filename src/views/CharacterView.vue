<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFilterStore } from '@/stores/filterStore'
import char1 from '@/assets/characters/daram_panel.png'
import char2 from '@/assets/characters/daram_patmal_panel.png'
import char3 from '@/assets/characters/wind_panel.png'
import char4 from '@/assets/characters/wind_patmal_panel.png'
import char5 from '@/assets/characters/wind_korean_trad_panel.png'
import char6 from '@/assets/characters/wind_korean_trad_patmal_panel.png'
import char7 from '@/assets/characters/wind_superman_panel.png'
import char8 from '@/assets/characters/aram_panel.png'
import char9 from '@/assets/characters/aram_heart_panel.png'
import char10 from '@/assets/characters/aram_patmal_panel.png'
import char11 from '@/assets/characters/sky_panel.png'
import char12 from '@/assets/characters/sky_patmal_panel.png'

const router = useRouter()
const store = useFilterStore()

const characters = ref([
  { id: 1, name: '다람이', url: char1, type: 'normal' },
  { id: 2, name: '다람이 말풍선', url: char2, type: 'patmal' },
  { id: 3, name: '바람이', url: char3, type: 'normal' },
  { id: 4, name: '바람이 말풍선', url: char4, type: 'patmal' },
  { id: 5, name: '바람이 한복', url: char5, type: 'normal' },
  { id: 6, name: '바람이 한복 말풍선', url: char6, type: 'patmal' },
  { id: 7, name: '바람이 슈퍼맨', url: char7, type: 'normal' },
  { id: 8, name: '아람이', url: char8, type: 'normal' },
  { id: 9, name: '아람이 하트', url: char9, type: 'normal' },
  { id: 10, name: '아람이 말풍선', url: char10, type: 'patmal' },
  { id: 11, name: '하늘이', url: char11, type: 'normal' },
  { id: 12, name: '하늘이 말풍선', url: char12, type: 'patmal' }
])

const selectedCharacter = ref(store.selectedCharacter)

const selectCharacter = (characterId: number) => {
  selectedCharacter.value = characterId
  store.setCharacter(characterId)
  
  const selectedChar = characters.value.find(char => char.id === characterId)
  if (selectedChar?.type === 'patmal') {
    router.push('/text')
  } else {
    router.push('/final')
  }
}
</script>

<template>
  <div class="character-select">
    <h1>캐릭터 선택</h1>
    
    <div class="character-grid">
      <div 
        v-for="char in characters" 
        :key="char.id"
        class="character-item"
        :class="{ selected: selectedCharacter === char.id }"
        @click="selectCharacter(char.id)"
      >
        <img :src="char.url" :alt="char.name">
        <span class="character-name">{{ char.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.character-select {
  padding: 1rem;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.character-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  background: #f5f5f5;
  padding: 1rem;
}

.character-item.selected {
  border-color: #42b883;
}

.character-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.character-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  text-align: center;
}
</style> 