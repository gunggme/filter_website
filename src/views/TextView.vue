<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFilterStore } from '@/stores/filterStore'

const router = useRouter()
const store = useFilterStore()

interface TextCategory {
  id: number
  name: string
  texts: Array<{
    id: number
    content: string
  }>
}

const categories = ref<TextCategory[]>([
  {
    id: 1,
    name: '인사말',
    texts: [
      { id: 1, content: '안녕하세요!' },
      { id: 2, content: '반갑습니다!' },
      { id: 3, content: '좋은 하루 되세요!' }
    ]
  },
  {
    id: 2,
    name: '축하',
    texts: [
      { id: 4, content: '축하합니다!' },
      { id: 5, content: '멋져요!' },
      { id: 6, content: '최고예요!' }
    ]
  },
  {
    id: 3,
    name: '응원',
    texts: [
      { id: 7, content: '힘내세요!' },
      { id: 8, content: '할 수 있어요!' },
      { id: 9, content: '파이팅!' }
    ]
  }
])

const selectedCategory = ref(categories.value[0].id)
const selectedText = ref(store.selectedText)

const currentTexts = computed(() => {
  return categories.value.find(cat => cat.id === selectedCategory.value)?.texts || []
})

const selectText = (textId: number) => {
  selectedText.value = textId
  store.setText(textId)
  router.push('/final')
}
</script>

<template>
  <div class="text-select">
    <h1>문구 선택</h1>
    
    <div class="category-select">
      <button
        v-for="category in categories"
        :key="category.id"
        :class="{ active: selectedCategory === category.id }"
        @click="selectedCategory = category.id"
      >
        {{ category.name }}
      </button>
    </div>

    <div class="text-grid">
      <div
        v-for="text in currentTexts"
        :key="text.id"
        class="text-item"
        :class="{ selected: selectedText === text.id }"
        @click="selectText(text.id)"
      >
        {{ text.content }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-select {
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
}

.category-select {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.category-select button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: #f1f1f1;
  cursor: pointer;
  font-size: 1rem;
}

.category-select button.active {
  background: #42b883;
  color: white;
}

.text-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.text-item {
  padding: 1rem;
  border-radius: 8px;
  background: #f5f5f5;
  cursor: pointer;
  text-align: center;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.text-item:hover {
  background: #e5e5e5;
}

.text-item.selected {
  border-color: #42b883;
  background: #f0f9f4;
}

@media (max-width: 768px) {
  .category-select {
    flex-direction: column;
  }
  
  .category-select button {
    width: 100%;
  }
  
  .text-grid {
    grid-template-columns: 1fr;
  }
}
</style> 