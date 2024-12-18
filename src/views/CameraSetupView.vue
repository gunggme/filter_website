<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFilterStore } from '@/stores/filterStore'

const router = useRouter()
const store = useFilterStore()

const videoRef = ref<HTMLVideoElement | null>(null)
const cameras = ref<MediaDeviceInfo[]>([])
const selectedCamera = ref(store.selectedCamera || '')
const isStreamActive = ref(false)

const getCameras = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    cameras.value = devices.filter(device => device.kind === 'videoinput')
  } catch (error) {
    console.error('카메라 목록을 가져오는데 실패했습니다:', error)
  }
}

const startCamera = async () => {
  // 이전 스트림이 있다면 정지
  if (videoRef.value?.srcObject) {
    const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
    tracks.forEach(track => track.stop())
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: selectedCamera.value }
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      isStreamActive.value = true
    }
  } catch (error) {
    console.error('카메라 시작 실패:', error)
    isStreamActive.value = false
  }
}

const handleCameraChange = () => {
  if (selectedCamera.value) {
    startCamera()
  }
}

const handleNext = () => {
  if (selectedCamera.value && isStreamActive.value) {
    store.setCamera(selectedCamera.value)
    router.push('/background')
  }
}

onMounted(async () => {
  await getCameras()
  if (store.selectedCamera) {
    selectedCamera.value = store.selectedCamera
    startCamera()
  }
})

// 컴포넌트가 언마운트될 때 카메라 스트림 정리
onUnmounted(() => {
  if (videoRef.value?.srcObject) {
    const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
    tracks.forEach(track => track.stop())
  }
})
</script>

<template>
  <div class="camera-setup android-screen">
    <div class="toolbar">
      <h1>카메라 설정</h1>
    </div>
    
    <div class="content">
      <div class="preview-container">
        <video 
          ref="videoRef" 
          autoplay 
          playsinline
          :style="{ transform: 'scaleX(-1)' }"
        ></video>
      </div>

      <div class="camera-controls">
        <select 
          v-model="selectedCamera" 
          class="android-select"
          @change="handleCameraChange"
        >
          <option value="">카메라 선택</option>
          <option 
            v-for="camera in cameras" 
            :key="camera.deviceId" 
            :value="camera.deviceId"
          >
            {{ camera.label }}
          </option>
        </select>

        <button 
          class="android-button"
          @click="handleNext"
          :disabled="!selectedCamera"
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

.preview-container {
  width: 100%;
  aspect-ratio: 3/4;
  background-color: #000000;
  border-radius: 8px;
  overflow: hidden;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.android-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #757575;
  border-radius: 4px;
  background-color: #FFFFFF;
  font-size: 16px;
  color: #212121;
}

.android-button:disabled {
  background-color: #BDBDBD;
  cursor: not-allowed;
}
</style> 