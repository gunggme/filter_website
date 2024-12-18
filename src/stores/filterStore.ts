import { defineStore } from 'pinia'

interface CameraInfo {
  deviceId: string
  facingMode: 'environment' | 'user'
  isAndroid: boolean
}

export const useFilterStore = defineStore('filter', {
  state: () => ({
    selectedCamera: null as CameraInfo | null,
    selectedBackground: null as number | null,
    selectedCharacter: null as number | null,
    selectedText: ''
  }),

  actions: {
    setCamera(cameraInfo: CameraInfo) {
      this.selectedCamera = cameraInfo
    },
    setBackground(backgroundId: number) {
      this.selectedBackground = backgroundId
    },
    setCharacter(characterId: number) {
      this.selectedCharacter = characterId
    },
    setText(text: string) {
      this.selectedText = text
    },
    reset() {
      this.selectedCamera = null
      this.selectedBackground = null
      this.selectedCharacter = null
      this.selectedText = ''
    }
  }
}) 