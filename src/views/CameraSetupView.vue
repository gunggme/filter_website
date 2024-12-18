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

// 안드로이드 체크 함수
const isAndroid = () => /Android/i.test(navigator.userAgent)

// 카메라 권한 요청
const requestCameraPermission = async () => {
  try {
    // 안드로이드의 경우 더 단순한 제약조건으로 시도
    const constraints = {
      video: isAndroid() ? true : { width: { ideal: 1280 }, height: { ideal: 720 } }
    }
    await navigator.mediaDevices.getUserMedia(constraints)
    return true
  } catch (error) {
    console.error('카메라 권한 요청 실패:', error)
    alert('카메라 권한이 필요합니다. 설정에서 카메라 권한을 허용해주세요.')
    return false
  }
}

// 카메라 목록 가져오기
const getCameras = async () => {
  try {
    // 먼저 카메라 권한 요청
    const hasPermission = await requestCameraPermission()
    if (!hasPermission) return

    if (isAndroid()) {
      // 안드로이드의 경우 단순화된 카메라 목록
      cameras.value = [
        { deviceId: 'environment', label: '후면 카메라', kind: 'videoinput' },
        { deviceId: 'user', label: '전면 카메라', kind: 'videoinput' }
      ] as MediaDeviceInfo[]
      
      // 기본값으로 후면 카메라 선택
      selectedCamera.value = 'environment'
      await startCamera()
    } else {
      // PC의 경우 실제 디바이스 목록 사용
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoCameras = devices.filter(device => device.kind === 'videoinput')
      cameras.value = videoCameras
      
      if (videoCameras.length > 0) {
        selectedCamera.value = videoCameras[0].deviceId
        await startCamera()
      }
    }
  } catch (error) {
    console.error('카메라 목록을 가져오는데 실패했습니다:', error)
  }
}

// 카메라 시작
const startCamera = async () => {
  try {
    // 이전 스트림이 있다면 정지
    if (videoRef.value?.srcObject) {
      const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }

    let constraints: MediaStreamConstraints
    
    if (isAndroid()) {
      // 안드로이드용 단순화된 제약조건
      constraints = {
        video: {
          facingMode: selectedCamera.value === 'environment' ? 'environment' : 'user'
        }
      }
    } else {
      // PC용 제약조건
      constraints = {
        video: {
          deviceId: selectedCamera.value ? { exact: selectedCamera.value } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }
    }

    console.log('카메라 시작 시도:', constraints)
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    console.log('카메라 스트림 획득 성공')

    if (videoRef.value) {
      videoRef.value.srcObject = stream
      isStreamActive.value = true

      // 비디오 로드 완료 대기
      await new Promise((resolve) => {
        videoRef.value!.onloadedmetadata = () => {
          console.log('비디오 메타데이터 로드됨')
          resolve(true)
        }
      })

      // 안드로이드에서 화면 방향 처리
      const track = stream.getVideoTracks()[0]
      console.log('활성 트랙:', track.getSettings())
      
      // 후면 카메라 확인
      const settings = track.getSettings()
      if (settings.facingMode === 'environment') {
        videoRef.value.style.transform = 'scaleX(1)'
      }
    }
  } catch (error) {
    console.error('카메라 시작 실패:', error)
    isStreamActive.value = false
    
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          alert('카메라 권한이 거부되었습니다.')
          break
        case 'NotFoundError':
          alert('카메라를 찾을 수 없습니다.')
          break
        case 'NotReadableError':
          alert('카메라가 사용 중입니다.')
          break
        default:
          alert('카메라 시작 중 오류가 발생했습니다: ' + error.name)
      }
    } else {
      alert('알 수 없는 오류가 발생했습니다.')
    }
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

// 화면 방향 변경 감지
const handleOrientationChange = () => {
  if (selectedCamera.value && isStreamActive.value) {
    startCamera()
  }
}

onMounted(async () => {
  try {
    console.log('컴포넌트 마운트됨, 환경:', isAndroid() ? '안드로이드' : 'PC')
    await getCameras()
    
    // 화면 방향 변경 이벤트 리스너 등록 (안드로이드인 경우에만)
    if (isAndroid()) {
      window.addEventListener('orientationchange', handleOrientationChange)
      window.addEventListener('resize', handleOrientationChange)
    }
  } catch (error) {
    console.error('초기화 중 오류 발생:', error)
  }
})

onUnmounted(() => {
  // 이벤트 리스너 제거
  window.removeEventListener('orientationchange', handleOrientationChange)
  window.removeEventListener('resize', handleOrientationChange)

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
          muted
          :style="{ transform: isAndroid() && selectedCamera === 'environment' ? 'scaleX(1)' : 'scaleX(-1)' }"
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
  position: relative;
  margin: 0 auto;
  max-width: 100vh;
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
  margin-top: auto;
}

.android-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #757575;
  border-radius: 4px;
  background-color: #FFFFFF;
  font-size: 16px;
  color: #212121;
  height: 48px;
}

.android-button {
  width: 100%;
  min-height: 48px;
}

.android-button:disabled {
  background-color: #BDBDBD;
  cursor: not-allowed;
}

/* 안드로이드 대응을 위한 추가 스타일 */
@media screen and (orientation: landscape) {
  .preview-container {
    aspect-ratio: 4/3;
    max-height: 80vh;
  }

  .camera-controls {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.9);
    z-index: 1000;
  }
}
</style> 