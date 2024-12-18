<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation'
import { FaceMesh } from '@mediapipe/face_mesh'
import { Camera } from '@mediapipe/camera_utils'
import { useFilterStore } from '@/stores/filterStore'

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const backgroundImageRef = ref<HTMLImageElement | null>(null)
const characterImageRef = ref<HTMLImageElement | null>(null)
let selfieSegmentation: SelfieSegmentation | null = null
let faceMesh: any = null
let animationFrameId: number | null = null
let faces: any[] = []
let previousFace: any = null
const smoothingFactor = 0.2
let lastProcessTime = 0
const processInterval = 1000 / 30

const store = useFilterStore()

// backgroundImages와 characterImages 객체를 Record 타입으로 정의
const backgroundImages: Record<number, () => Promise<typeof import('*.png')>> = {
  1: () => import('@/assets/backgrounds/bg1.png'),
  2: () => import('@/assets/backgrounds/bg2.png'),
  3: () => import('@/assets/backgrounds/bg3.png'),
  4: () => import('@/assets/backgrounds/bg4.png')
}

const characterImages: Record<number, () => Promise<typeof import('*.png')>> = {
  1: () => import('@/assets/characters/daram_panel.png'),
  2: () => import('@/assets/characters/daram_patmal_panel.png'),
  3: () => import('@/assets/characters/wind_panel.png'),
  4: () => import('@/assets/characters/wind_patmal_panel.png'),
  5: () => import('@/assets/characters/wind_korean_trad_panel.png'),
  6: () => import('@/assets/characters/wind_korean_trad_patmal_panel.png'),
  7: () => import('@/assets/characters/wind_superman_panel.png'),
  8: () => import('@/assets/characters/aram_panel.png'),
  9: () => import('@/assets/characters/aram_heart_panel.png'),
  10: () => import('@/assets/characters/aram_patmal_panel.png'),
  11: () => import('@/assets/characters/sky_panel.png'),
  12: () => import('@/assets/characters/sky_patmal_panel.png')
}

// Face Mesh 초기화
const initializeFaceMesh = async () => {
  faceMesh = new FaceMesh({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`
    }
  })

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
    selfieMode: true
  })

  faceMesh.onResults((results: any) => {
    const now = Date.now()
    if (now - lastProcessTime < processInterval) return
    lastProcessTime = now

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

      const currentFace = {
        boundingBox: {
          xCenter: (minX + maxX) / 2,
          yCenter: (minY + maxY) / 2,
          width: maxX - minX,
          height: maxY - minY
        }
      }

      if (previousFace) {
        // 이전 프레임과 현재 프레임 사이의 보간
        currentFace.boundingBox.xCenter = 
          previousFace.boundingBox.xCenter * (1 - smoothingFactor) + 
          currentFace.boundingBox.xCenter * smoothingFactor
        
        currentFace.boundingBox.yCenter = 
          previousFace.boundingBox.yCenter * (1 - smoothingFactor) + 
          currentFace.boundingBox.yCenter * smoothingFactor
        
        currentFace.boundingBox.width = 
          previousFace.boundingBox.width * (1 - smoothingFactor) + 
          currentFace.boundingBox.width * smoothingFactor
        
        currentFace.boundingBox.height = 
          previousFace.boundingBox.height * (1 - smoothingFactor) + 
          currentFace.boundingBox.height * smoothingFactor
      }
      
      faces = [currentFace]
      previousFace = {...currentFace}
    } else if (previousFace) {
      faces = [previousFace]
    } else {
      faces = []
    }
  })

  await faceMesh.initialize()
}

// 이미지 압축
const compressImage = (canvas: HTMLCanvasElement, quality = 0.8, maxWidth = 1920) => {
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return null

  let width = canvas.width
  let height = canvas.height

  if (width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }

  tempCanvas.width = width
  tempCanvas.height = height

  tempCtx.imageSmoothingEnabled = true
  tempCtx.imageSmoothingQuality = 'high'
  tempCtx.drawImage(canvas, 0, 0, width, height)

  return tempCanvas.toDataURL('image/jpeg', quality)
}

// 이미지 저장
const saveImage = () => {
  if (!canvasRef.value) return

  try {
    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = canvasRef.value.width
    finalCanvas.height = canvasRef.value.height
    const finalCtx = finalCanvas.getContext('2d')
    if (!finalCtx) return

    finalCtx.drawImage(canvasRef.value, 0, 0)
    
    if (store.selectedText) {
      finalCtx.font = '32px Arial'
      finalCtx.fillStyle = 'white'
      finalCtx.textAlign = 'center'
      finalCtx.textBaseline = 'bottom'
      finalCtx.strokeStyle = 'black'
      finalCtx.lineWidth = 4
      finalCtx.strokeText(store.selectedText, finalCanvas.width / 2, finalCanvas.height - 30)
      finalCtx.fillText(store.selectedText, finalCanvas.width / 2, finalCanvas.height - 30)
    }

    const compressedImage = compressImage(finalCanvas, 0.8)
    if (!compressedImage) return

    const link = document.createElement('a')
    link.download = 'photo.jpg'
    link.href = compressedImage
    link.click()
  } catch (error) {
    console.error('이미지 저장 오류:', error)
  }
}

// 세그멘테이션 결과 처리
const onResults = (results: any) => {
  if (!canvasRef.value || !backgroundImageRef.value) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height

  try {
    ctx.clearRect(0, 0, width, height)
    
    // 배경 이미지 그리기
    ctx.drawImage(backgroundImageRef.value, 0, 0, width, height)

    if (results.segmentationMask) {
      // 임시 캔버스 생성
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = width
      tempCanvas.height = height
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return

      // 마스크 적용
      tempCtx.drawImage(results.segmentationMask, 0, 0, width, height)
      tempCtx.globalCompositeOperation = 'source-in'
      tempCtx.drawImage(results.image, 0, 0, width, height)

      // 합성
      ctx.drawImage(tempCanvas, 0, 0)

      // 얼굴이 인식된 경우 캐릭터 그리기
      if (faces.length > 0 && characterImageRef.value) {
        faces.forEach(face => {
          const box = face.boundingBox
          const x = box.xCenter * width
          const y = (box.yCenter - box.height * 0.1) * height
          
          // 세로 모드 기준으로 캐릭터 크기 조정
          const screenRatio = window.innerHeight / window.innerWidth
          const characterWidth = width * 0.8
          const characterHeight = (characterWidth / characterImageRef.value!.width) * characterImageRef.value!.height

          // 캐릭터가 화면 상단에 위치하도록 y 위치 조정
          const adjustedY = y - characterHeight * 0.4

          ctx.drawImage(
            characterImageRef.value!,
            x - characterWidth / 2,
            adjustedY,
            characterWidth,
            characterHeight
          )
        })
      }
    }

    // 텍스트 표시
    if (store.selectedText) {
      ctx.font = '32px Arial'
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.strokeStyle = 'black'
      ctx.lineWidth = 4
      ctx.strokeText(store.selectedText, width / 2, height - 30)
      ctx.fillText(store.selectedText, width / 2, height - 30)
    }
  } catch (error) {
    console.error('결과 처리 오류:', error)
  }
}

// MediaPipe 초기화
const initializeSelfieSegmentation = async () => {
  selfieSegmentation = new SelfieSegmentation({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`
    }
  })

  await selfieSegmentation.initialize()

  selfieSegmentation.onResults(onResults)
  selfieSegmentation.setOptions({
    modelSelection: 1,
    selfieMode: true,
  })
}

// 배경 이미지 로드
const loadBackgroundImage = async () => {
  if (!store.selectedBackground) return
  
  try {
    const importedImage = await backgroundImages[store.selectedBackground]()
    const img = new Image()
    img.src = importedImage.default
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })
    backgroundImageRef.value = img
  } catch (error) {
    console.error('배경 이미지 로드 실패:', error)
  }
}

// 캐릭터 이미지 로드
const loadCharacterImage = async () => {
  if (!store.selectedCharacter) return

  try {
    const importedImage = await characterImages[store.selectedCharacter]()
    const img = new Image()
    img.src = importedImage.default
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })
    characterImageRef.value = img
  } catch (error) {
    console.error('캐릭터 이미지 로드 실패:', error)
  }
}

// 카메라 스트림 처리
const startCamera = async () => {
  try {
    if (!videoRef.value || !canvasRef.value) return

    // 비디오 및 캔버스 크기 설정
    const constraints = {
      video: {
        deviceId: store.selectedCamera || undefined,
        width: { ideal: window.innerWidth },
        height: { ideal: window.innerHeight }
      }
    }

    // 먼저 카메라 스트림을 가져옵니다
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    videoRef.value.srcObject = stream

    // 비디오 메타데이터가 로드되면 캔버스 크기를 설정합니다
    await new Promise((resolve) => {
      videoRef.value!.onloadedmetadata = () => {
        const { videoWidth, videoHeight } = videoRef.value!
        canvasRef.value!.width = videoWidth
        canvasRef.value!.height = videoHeight
        resolve(true)
      }
    })

    // MediaPipe 초기화를 순차적으로 진행
    await initializeSelfieSegmentation()
    await initializeFaceMesh()

    // Camera 유틸리티 설정
    const camera = new Camera(videoRef.value, {
      onFrame: async () => {
        if (videoRef.value) {
          try {
            await selfieSegmentation!.send({ image: videoRef.value })
            await faceMesh.send({ image: videoRef.value })
          } catch (error) {
            console.error('프레임 처리 오류:', error)
          }
        }
      },
      width: canvasRef.value.width,
      height: canvasRef.value.height
    })

    await camera.start()
  } catch (error) {
    console.error('카메라 시작 실패:', error)
  }
}

onMounted(async () => {
  await loadBackgroundImage()
  await loadCharacterImage()
  startCamera()
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  if (videoRef.value?.srcObject) {
    const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
    tracks.forEach(track => track.stop())
  }
  if (selfieSegmentation) {
    selfieSegmentation.close()
  }
  if (faceMesh) {
    faceMesh.close()
  }
})
</script>

<template>
  <div class="final-view android-screen">
    <div class="toolbar">
      <h1>최종 화면</h1>
    </div>

    <div class="content">
      <div class="camera-container">
        <video 
          ref="videoRef" 
          autoplay 
          playsinline
          muted
        ></video>
        <canvas 
          ref="canvasRef"
        ></canvas>
      </div>

      <div class="action-buttons">
        <button 
          class="android-button secondary"
          @click="$router.push('/background')"
        >
          배경 다시 선택하기
        </button>
        <button 
          class="android-button"
          @click="saveImage"
        >
          사진 저장하기
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

.camera-container {
  width: 100%;
  aspect-ratio: 3/4;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

video {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
}

canvas {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.action-buttons {
  display: flex;
  gap: 16px;
  padding: 16px;
  margin-top: auto;
}

.android-button {
  flex: 1;
}

.android-button.secondary {
  background-color: #03DAC6;
}
</style> 