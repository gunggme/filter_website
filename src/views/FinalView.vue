<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFilterStore } from '@/stores/filterStore'
import cameraSound from '@/assets/CameraSound.mp3'

const router = useRouter()
const store = useFilterStore()

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number | null = null

const isCountingDown = ref(false)
const countdown = ref(3)
const capturedImage = ref('')

// 안드로이드 체크 함수
const isAndroid = () => /Android/i.test(navigator.userAgent)

// 카메라 사운드 객체 생성
const sound = new Audio(cameraSound)

// 카메라 시작
const startCamera = async () => {
  try {
    if (!videoRef.value || !canvasRef.value || !store.selectedCamera) return

    // 이전 스트림이 있다면 정지
    if (videoRef.value.srcObject) {
      const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }

    let constraints: MediaStreamConstraints

    if (isAndroid()) {
      constraints = {
        video: {
          facingMode: store.selectedCamera.facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 0.5625 }
        }
      }
    } else {
      constraints = {
        video: {
          deviceId: { exact: store.selectedCamera.deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 0.5625 }
        }
      }
    }

    console.log('카메라 시작 시도:', constraints)
    const stream = await navigator.mediaDevices.getUserMedia(constraints)

    if (videoRef.value) {
      videoRef.value.srcObject = stream

      // 비디오 메타데이터 로드 완료 대기
      await new Promise((resolve) => {
        videoRef.value!.onloadedmetadata = () => {
          const { videoWidth, videoHeight } = videoRef.value!
          
          // 캔버스 크기를 비디오 크기에 맞춤
          canvasRef.value!.width = videoWidth
          canvasRef.value!.height = videoHeight
          resolve(true)
        }
      })

      // 캔버스에 비디오 프레임 그리기
      const renderFrame = () => {
        if (videoRef.value && canvasRef.value) {
          const ctx = canvasRef.value.getContext('2d')
          if (ctx) {
            ctx.drawImage(videoRef.value, 0, 0, canvasRef.value.width, canvasRef.value.height)
          }
          animationFrameId = requestAnimationFrame(renderFrame)
        }
      }
      renderFrame()
    }
  } catch (error) {
    console.error('카메라 시작 실패:', error)
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      alert('카메라 권한이 필요합니다. 설정���서 카메라 권한을 허용해주세요.')
    } else {
      alert('카메라를 시작할 수 없습니다. 다시 시도해주세요.')
    }
  }
}

// 카메라 정지
const stopCamera = () => {
  if (videoRef.value?.srcObject) {
    const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
    tracks.forEach(track => track.stop())
    videoRef.value.srcObject = null
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
}

// 카운트다운 후 사진 촬영
const startCapture = async () => {
  if (isCountingDown.value) return
  
  isCountingDown.value = true
  countdown.value = 3

  const countdownInterval = setInterval(() => {
    countdown.value--
    
    // 1초일 때 사운드 재생
    if (countdown.value === 1) {
      sound.play()
    }
    
    if (countdown.value === 0) {
      clearInterval(countdownInterval)
      setTimeout(() => {
        captureImage()
        isCountingDown.value = false
      }, 500) // 0이 잠깐 보이도록 지연
    }
  }, 1000)
}

// 이미지 캡처 및 저장
const captureImage = () => {
  if (!canvasRef.value) return

  try {
    // 캔버스를 base64 문자열로 변환
    const dataUrl = canvasRef.value.toDataURL('image/jpeg', 0.8)
    
    // 상태 초기화
    isCountingDown.value = false
    
    // 카메라 정지
    stopCamera()
    
    // sessionStorage를 사용하여 이미지 데이터 전달
    sessionStorage.setItem('capturedImage', dataUrl)
    
    // 프리뷰 페이지로 이동
    router.push('/preview')
  } catch (error) {
    console.error('이미지 저장 오류:', error)
    isCountingDown.value = false
  }
}

onMounted(async () => {
  await startCamera()
})

onUnmounted(() => {
  stopCamera()
})
</script>

<template>
  <div class="camera-app">
    <div class="top-controls">
      <button 
        class="back-button"
        @click="$router.push('/camera-setup')"
      >
        <span class="material-icons">arrow_back</span>
      </button>
    </div>

    <div class="camera-container">
      <div class="camera-view">
        <video 
          ref="videoRef" 
          autoplay 
          playsinline
          muted
        ></video>
        <canvas 
          ref="canvasRef"
        ></canvas>
        
        <!-- 카운트다운 오버레이 -->
        <div 
          v-if="isCountingDown" 
          class="countdown-overlay"
        >
          <div class="countdown-number">{{ countdown }}</div>
        </div>
      </div>
    </div>

    <div class="bottom-controls">
      <div 
        class="capture-button" 
        @click="startCapture"
        :class="{ 'disabled': isCountingDown }"
      >
        <div class="inner-circle"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.camera-app {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  display: flex;
  flex-direction: column;
}

.top-controls {
  position: absolute;
  top: env(safe-area-inset-top, 0);
  left: 0;
  right: 0;
  height: 60px;
  padding: 16px;
  display: flex;
  align-items: center;
  z-index: 100;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
}

.camera-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.camera-view {
  width: 100%;
  height: 0;
  padding-bottom: 177.78%; /* 16:9 비율을 위한 패딩 (9/16 * 100) */
  position: relative;
  background: #000;
}

video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bottom-controls {
  position: absolute;
  bottom: env(safe-area-inset-bottom, 0);
  left: 0;
  right: 0;
  height: 120px;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
  z-index: 100;
}

.capture-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  padding: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inner-circle {
  width: 90%;
  height: 90%;
  border-radius: 50%;
  background: white;
  transition: all 0.2s ease;
}

.capture-button:active .inner-circle {
  width: 85%;
  height: 85%;
}

.back-button {
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.back-button:active {
  background: rgba(255,255,255,0.2);
}

/* 가로 모드 방지 */
@media screen and (orientation: landscape) {
  .camera-app {
    transform: rotate(-90deg);
    transform-origin: left top;
    width: 100vh;
    height: 100vw;
    position: absolute;
    top: 100%;
    left: 0;
  }
}

.countdown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.countdown-number {
  font-size: 120px;
  color: white;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  animation: countdownPulse 1s ease-in-out infinite;
}

.capture-button.disabled {
  opacity: 0.5;
  pointer-events: none;
}

@keyframes countdownPulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style> 