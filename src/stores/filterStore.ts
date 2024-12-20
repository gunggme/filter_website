import { ref } from 'vue'
import { defineStore } from 'pinia'

// CameraInfo 인터페이스 정의
interface CameraInfo {
  deviceId: string
  facingMode: string
  width: number
  height: number
}

export const useFilterStore = defineStore('filter', () => {
  const selectedCamera = ref<CameraInfo | null>(null)
  const selectedBackground = ref(0)
  const selectedCharacter = ref(0)
  const selectedText = ref('')

  // characters 정보 추가
  const characters = ref([
    { id: 1, name: '다람이', type: 'normal' },
    { id: 2, name: '다람이 말풍선', type: 'patmal' },
    { id: 3, name: '바람이', type: 'normal' },
    { id: 4, name: '바람이 말풍선', type: 'patmal' },
    { id: 5, name: '바람이 한복', type: 'normal' },
    { id: 6, name: '바람이 한복 말풍선', type: 'patmal' },
    { id: 7, name: '바람이 슈퍼맨', type: 'normal' },
    { id: 8, name: '아람이', type: 'normal' },
    { id: 9, name: '아람이 하트', type: 'normal' },
    { id: 10, name: '아람이 말풍선', type: 'patmal' },
    { id: 11, name: '하늘이', type: 'normal' },
    { id: 12, name: '하늘이 말풍선', type: 'patmal' }
  ])

  const setCamera = (camera: CameraInfo) => {
    selectedCamera.value = camera
  }

  const setBackground = (backgroundId: number) => {
    selectedBackground.value = backgroundId
  }

  const setCharacter = (characterId: number) => {
    selectedCharacter.value = characterId
  }

  const setText = (text: string) => {
    selectedText.value = text
  }

  return {
    selectedCamera,
    selectedBackground,
    selectedCharacter,
    selectedText,
    characters,
    setCamera,
    setBackground,
    setCharacter,
    setText
  }
}) 