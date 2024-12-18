import { defineStore } from 'pinia'

export const useFilterStore = defineStore('filter', {
  state: () => ({
    selectedCamera: '',
    selectedBackground: null as number | null,
    selectedCharacter: null as number | null,
    selectedText: ''
  }),

  actions: {
    setCamera(cameraId: string) {
      this.selectedCamera = cameraId
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
      this.selectedCamera = ''
      this.selectedBackground = null
      this.selectedCharacter = null
      this.selectedText = ''
    }
  }
}) 