<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
    name: '아버지',
    texts: [
      { id: 1, content: '우리집의 든든한 기둥 아빠!! 사랑합니다.' },
      { id: 2, content: '아버지는 언제나 저의 영웅입니다.' },
      { id: 3, content: '저의 최고의 선물은 아버지입니다.' }
    ]
  },
  {
    id: 2,
    name: '어머니',
    texts: [
      { id: 4, content: '정성으로 우리를 돌봐주시는 엄마!! 사랑합니다.' },
      { id: 5, content: '우리 엄마여서 고마워요. 사랑해요^^' },
      { id: 6, content: '엄마!! 낳아주시고 키워주셔서 감사해요.' }
    ]
  },
  {
    id: 3,
    name: '자녀',
    texts: [
      { id: 7, content: '우리 딸 사랑해~딸이 있어 언제나 행복해^^' },
      { id: 8, content: '우리 아들 사랑해~아들이 있어 언제나 행복해^^' },
      { id: 9, content: '우리 가족 언제나 행복하자!! 사랑한다.' }
    ]
  },
  {
    id: 4,
    name: '할머니',
    texts: [
      { id: 10, content: '조건 없는 사랑을 주시는 할머니!! 존경합니다.' },
      { id: 11, content: '늘 건강하세요. 사랑해요 할머니~' },
      { id: 12, content: '할머니 보고싶어요. 전화할께요~' }
    ]
  },
  {
    id: 5,
    name: '할아버지',
    texts: [
      { id: 13, content: '열심히 살아오신 세월을 존경합니다. 할아버지!!' },
      { id: 14, content: '늘 건강하세요. 사랑해요 할아버지~' },
      { id: 15, content: '할아버지 보고싶어요. 전화할께요~' }
    ]
  },
  {
    id: 6,
    name: '손자',
    texts: [
      { id: 16, content: '우리 손자 손녀가 나의 보물이다. 사랑한다.' },
      { id: 17, content: '아프지 말고 쑥쑥 크자!' },
      { id: 18, content: '우린 언제나 너희 편이다. 화이팅!!' }
    ]
  },
  {
    id: 7,
    name: '부부',
    texts: [
      { id: 19, content: '여보 사랑해요~' },
      { id: 20, content: '당신과 함께한 모든 순간이 소중해' },
      { id: 21, content: '내 인생의 동반자가 되줘서 고마워' }
    ]
  },
  {
    id: 8,
    name: '기념일',
    texts: [
      { id: 22, content: '생신 축하드려요~ 행복한 하루 보내세요^^' },
      { id: 23, content: '오늘이 가장 젊은날!! 생신 축하드리고 행복하세요^^' },
      { id: 24, content: '언제나 신혼부부 같으신 어머니, 아버지~ 결혼 기념일 축하드려요^^' }
    ]
  }
])

const selectedCategory = ref(categories.value[0].id)
const selectedText = ref(store.selectedText)

const currentTexts = computed(() => {
  return categories.value.find(cat => cat.id === selectedCategory.value)?.texts || []
})

const selectText = (textId: number) => {
  selectedText.value = String(textId)
  store.setText(String(textId))
  router.push('/final')
}

// 컴포넌트 마운트 시 캐릭터 타입 체크
onMounted(() => {
  const characterId = store.selectedCharacter
  if (!characterId) {
    router.push('/character')
    return
  }

  // characters 배열에서 선택된 캐릭터 찾기
  const selectedChar = store.characters.find(char => char.id === characterId)
  if (!selectedChar || selectedChar.type !== 'patmal') {
    router.push('/character')
  }
})
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
        :class="{ selected: selectedText === String(text.id) }"
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