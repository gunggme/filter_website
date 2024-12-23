<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFilterStore } from '@/stores/filterStore'
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation'
import { FaceMesh } from '@mediapipe/face_mesh'

// 모든 이미지 imports를 상단으로 이동
import bg1 from '@/assets/backgrounds/bg1.png'
import bg2 from '@/assets/backgrounds/bg2.png'
import bg3 from '@/assets/backgrounds/bg3.png'
import bg4 from '@/assets/backgrounds/bg4.png'

import char1 from '@/assets/characters/daram_panel.png'
import char2 from '@/assets/characters/daram_patmal_panel.png'
import char3 from '@/assets/characters/wind_panel.png'
import char4 from '@/assets/characters/wind_patmal_panel.png'

const route = useRoute()
const router = useRouter()
const store = useFilterStore()

// 배경 이미지 데이터
const backgrounds = ref([
  { id: 1, name: '배경1', url: bg1 },
  { id: 2, name: '배경2', url: bg2 },
  { id: 3, name: '배경3', url: bg3 },
  { id: 4, name: '배경4', url: bg4 },
])

// 캐릭터 데이터
const characters = ref([
  { id: 1, name: '다람이', url: char1 },
  { id: 2, name: '다람이 말풍선', url: char2 },
  { id: 3, name: '바람이', url: char3 },
  { id: 4, name: '바람이 말풍선', url: char4 },
])

// characterImages 타입 정의 추가
type CharacterImageMap = {
  [key: number]: string;
}

// 캐릭터 이미지 매핑 수정
const characterImages: CharacterImageMap = {
  1: char1,
  2: char2,
  3: char3,
  4: char4,
}

// backgroundImages 타입 수정 및 배경 처리 로직 수정
const backgroundImages: Record<string | number, string> = {
  1: bg1,
  2: bg2,
  3: bg3,
  4: bg4,
}

// 편집 모드 상태
const editMode = ref<'background' | 'character'>('background')
const selectedCharacter = ref<number | null>(null)
const isDragging = ref(false)
const dragPosition = ref({ x: 0, y: 0 })
const characterScale = ref(1)

const capturedImage = ref('')
const processedImage = ref('')
const isLoading = ref(false)

let selfieSegmentation: SelfieSegmentation | null = null
let faceMesh: FaceMesh | null = null

// MediaPipe 초기화
const initializeMediaPipe = async () => {
  try {
    // Selfie Segmentation 초기화
    selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => {
        return `/mediapipe/selfie_segmentation/${file}`
      }
    })
    await selfieSegmentation.initialize()
    selfieSegmentation.setOptions({
      modelSelection: 1
    })

    // Face Mesh 초기화
    faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `/mediapipe/face_mesh/${file}`
      }
    })
    await faceMesh.initialize()
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })
  } catch (error) {
    console.error('MediaPipe 초기화 실패:', error)
  }
}

// 이미지 프로세싱
const processImage = async (applyBackground: boolean = false) => {
  if (!capturedImage.value) return
  
  isLoading.value = true
  
  try {
    // 캔버스 생성
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 원본 이미지 로드
    const originalImage = new Image()
    originalImage.src = capturedImage.value
    await new Promise((resolve) => {
      originalImage.onload = resolve
    })

    // 캔버스 크기 설정
    canvas.width = originalImage.width
    canvas.height = originalImage.height

    // 기본적으로 원본 이미지 그리기
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height)

    // 배경 선택된 경우에만 세그멘테이션 및 배경 합성 처리
    if (applyBackground && store.selectedBackground) {
      await initializeMediaPipe()

      if (selfieSegmentation) {
        await new Promise((resolve) => {
          selfieSegmentation!.onResults((results) => {
            if (results.segmentationMask) {
              const tempCanvas = document.createElement('canvas')
              tempCanvas.width = canvas.width
              tempCanvas.height = canvas.height
              const tempCtx = tempCanvas.getContext('2d')
              if (!tempCtx) return

              tempCtx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height)
              tempCtx.globalCompositeOperation = 'source-in'
              tempCtx.drawImage(originalImage, 0, 0, canvas.width, canvas.height)

              // 배경 이미지 처리 수정
              const bgImage = new Image()
              const bgSrc = backgroundImages[store.selectedBackground]
              if (bgSrc) {
                bgImage.src = bgSrc
                bgImage.onload = () => {
                  ctx.clearRect(0, 0, canvas.width, canvas.height)
                  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height)
                  ctx.drawImage(tempCanvas, 0, 0)
                  resolve(true)
                }
                bgImage.onerror = () => {
                  console.error('배경 이미지 로드 실패')
                  resolve(true)
                }
              } else {
                console.error('선택된 배경 이미지가 없습니다')
                resolve(true)
              }
            } else {
              resolve(true)
            }
          })
          selfieSegmentation!.send({ image: originalImage })
        })
      }
    }

    // 얼굴 인식 및 캐릭터 위치 조정
    if (faceMesh && store.selectedCharacter) {
      await new Promise((resolve) => {
        faceMesh!.onResults((results) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0]
            
            // 얼굴 바운딩 박스 계산
            let minX = 1, minY = 1, maxX = 0, maxY = 0
            landmarks.forEach((landmark: any) => {
              minX = Math.min(minX, landmark.x)
              minY = Math.min(minY, landmark.y)
              maxX = Math.max(maxX, landmark.x)
              maxY = Math.max(maxY, landmark.y)
            })

            // 얼굴 중심점과 크기 계산
            const faceWidth = (maxX - minX) * canvas.width
            const faceHeight = (maxY - minY) * canvas.height
            const faceCenterX = (minX + maxX) / 2 * canvas.width
            const faceCenterY = (minY + maxY) / 2 * canvas.height

            // 캐릭터 이미지 로드 및 배치
            const charImage = new Image()
            charImage.src = characterImages[store.selectedCharacter]
            charImage.onload = () => {
              // 캐릭터 크기 계산 (얼굴 크기 기준)
              const charWidth = faceWidth * 3 * characterScale.value // 얼굴 크기의 3배로 조정
              const charHeight = (charWidth / charImage.width) * charImage.height

              // 캐릭터 위치 계산 (얼굴이 프레임 안에 오도록)
              let charX = faceCenterX - (charWidth / 2)
              // 얼굴이 프레임의 중앙 약간 위쪽에 오도록 조정
              let charY = faceCenterY - (charHeight * 0.55)

              // 드래그 중인 경우 위치 조정
              if (isDragging.value) {
                const offsetX = charWidth / 2
                const offsetY = charHeight * 0.55
                charX = dragPosition.value.x - offsetX
                charY = dragPosition.value.y - offsetY
              }

              // 캐릭터가 화면 밖으로 나가지 않도록 조정
              const adjustedX = Math.max(0, Math.min(charX, canvas.width - charWidth))
              const adjustedY = Math.max(0, Math.min(charY, canvas.height - charHeight))

              // 캐릭터 그리기
              ctx.drawImage(charImage, adjustedX, adjustedY, charWidth, charHeight)
              resolve(true)
            }
          } else {
            // 얼굴이 감지되지 않은 경우
            const charImage = new Image()
            charImage.src = characterImages[store.selectedCharacter]
            charImage.onload = () => {
              const charWidth = canvas.width * 0.6 * characterScale.value // 화면 너비의 60%로 조정
              const charHeight = (charWidth / charImage.width) * charImage.height
              
              // 화면 중앙에 배치
              let charX = (canvas.width - charWidth) / 2
              let charY = (canvas.height - charHeight) / 2

              // 드래그 중인 경우 위치 조정
              if (isDragging.value) {
                const offsetX = charWidth / 2
                const offsetY = charHeight * 0.55
                charX = dragPosition.value.x - offsetX
                charY = dragPosition.value.y - offsetY
              }

              const adjustedX = Math.max(0, Math.min(charX, canvas.width - charWidth))
              const adjustedY = Math.max(0, Math.min(charY, canvas.height - charHeight))

              ctx.drawImage(charImage, adjustedX, adjustedY, charWidth, charHeight)
              resolve(true)
            }
          }
        })
        faceMesh!.send({ image: originalImage })
      })
    }

    // 처리된 이미지 저장
    processedImage.value = canvas.toDataURL('image/jpeg', 0.8)
  } catch (error) {
    console.error('이미지 처리 중 오류:', error)
  } finally {
    isLoading.value = false
    // MediaPipe 인스턴스 정리
    if (selfieSegmentation) {
      selfieSegmentation.close()
    }
    if (faceMesh) {
      faceMesh.close()
    }
  }
}

onMounted(async () => {
  const imageData = sessionStorage.getItem('capturedImage')
  
  if (imageData) {
    capturedImage.value = imageData
    sessionStorage.removeItem('capturedImage')
    await processImage(false) // 초기에는 배경 적용하지 않음
  } else {
    router.push('/final')
  }
})

// 컴포넌트 언마운트 시 이미지 데이터 정리
onUnmounted(() => {
  sessionStorage.removeItem('capturedImage')
})

const retake = () => {
  router.push('/final')
}

const confirm = () => {
  // 처리된 이미지 저장
  if (processedImage.value) {
    const link = document.createElement('a')
    link.download = 'processed_photo.jpg'
    link.href = processedImage.value
    link.click()
  }
}

// 캐릭터 선택 함수
const selectCharacter = async (characterId: number) => {
  selectedCharacter.value = characterId
  store.setCharacter(characterId)
  await processImage(store.selectedBackground !== null)
}

// 드래그 이벤트 핸들러
const startDrag = (e: MouseEvent | TouchEvent) => {
  if (!selectedCharacter.value) return
  isDragging.value = true
  const pos = 'touches' in e ? e.touches[0] : e
  dragPosition.value = { x: pos.clientX, y: pos.clientY }
}

const onDrag = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return
  const pos = 'touches' in e ? e.touches[0] : e
  // 드래그 위치 업데이트 및 이미지 재처리
  dragPosition.value = { x: pos.clientX, y: pos.clientY }
  processImage(store.selectedBackground !== null)
}

const endDrag = () => {
  isDragging.value = false
}

// 캐릭터 크기 조절
const adjustScale = (delta: number) => {
  characterScale.value = Math.max(0.5, Math.min(2, characterScale.value + delta))
  processImage(store.selectedBackground !== null)
}

// 누락된 selectBackground 함수 추가
const selectBackground = async (backgroundId: number) => {
  try {
    store.setBackground(backgroundId)
    await processImage(true)
  } catch (error) {
    console.error('배경 선택 중 오류:', error)
  }
}

</script>

<template>
  <div class="preview-screen">
    <div class="preview-container">
      <img 
        v-if="processedImage && !isLoading" 
        :src="processedImage" 
        alt="Processed photo"
        class="preview-image"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="endDrag"
        @touchstart="startDrag"
        @touchmove="onDrag"
        @touchend="endDrag"
      >
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">이미지 처리 중...</div>
      </div>
    </div>
    
    <!-- 편집 모드 선택 -->
    <div class="edit-mode-selector">
      <button 
        :class="{ active: editMode === 'background' }"
        @click="editMode = 'background'"
      >
        배경 선택
      </button>
      <button 
        :class="{ active: editMode === 'character' }"
        @click="editMode = 'character'"
      >
        캐릭터 선택
      </button>
    </div>

    <!-- 배경 선택기 -->
    <div 
      v-if="editMode === 'background'" 
      class="selector-panel"
    >
      <div 
        v-for="bg in backgrounds" 
        :key="bg.id"
        class="item"
        :class="{ selected: store.selectedBackground === bg.id }"
        @click="selectBackground(bg.id)"
      >
        <img :src="bg.url" :alt="bg.name">
      </div>
    </div>

    <!-- 캐릭터 선택기 -->
    <div 
      v-if="editMode === 'character'" 
      class="selector-panel"
    >
      <div 
        v-for="char in characters" 
        :key="char.id"
        class="item"
        :class="{ selected: selectedCharacter === char.id }"
        @click="selectCharacter(char.id)"
      >
        <img :src="char.url" :alt="char.name">
      </div>
    </div>

    <!-- 크기 조절 컨트롤 -->
    <div v-if="selectedCharacter" class="scale-controls">
      <button @click="adjustScale(-0.1)">-</button>
      <span>{{ Math.round(characterScale * 100) }}%</span>
      <button @click="adjustScale(0.1)">+</button>
    </div>
    
    <div class="preview-controls">
      <button 
        class="android-button secondary"
        @click="retake"
        :disabled="isLoading"
      >
        다시 찍기
      </button>
      <button 
        class="android-button"
        @click="confirm"
        :disabled="isLoading || !processedImage"
      >
        완료
      </button>
    </div>
  </div>
</template>

<style scoped>
.preview-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 편집 모드 선택기 */
.edit-mode-selector {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  z-index: 10;
}

/* 선택기 패널 */
.selector-panel {
  position: absolute;
  bottom: calc(76px + var(--safe-area-inset-bottom));
  left: 0;
  right: 0;
  height: 100px;
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow-x: auto;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
}

/* 크기 조절 컨트롤 */
.scale-controls {
  position: absolute;
  top: 80px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px;
  border-radius: 8px;
  z-index: 10;
}

/* 하단 컨트롤 */
.preview-controls {
  padding: 16px;
  padding-bottom: calc(16px + var(--safe-area-inset-bottom));
  display: flex;
  gap: 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  z-index: 10;
}

/* 로딩 오버레이 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

/* 나머지 스타일은 유지 */
</style> 