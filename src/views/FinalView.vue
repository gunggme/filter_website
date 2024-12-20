<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation'
import { FaceMesh } from '@mediapipe/face_mesh'
import { Camera } from '@mediapipe/camera_utils'
import { useFilterStore } from '@/stores/filterStore'

const store = useFilterStore()

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

      // 얼굴이 인식된 경우 캐릭터와 텍스트 그리기
      if (faces.length > 0 && characterImageRef.value) {
        faces.forEach(face => {
          const box = face.boundingBox
          const x = box.xCenter * width
          const y = (box.yCenter - box.height * 0.1) * height
          
          const characterWidth = width * 0.8
          const characterHeight = (characterWidth / characterImageRef.value!.width) * characterImageRef.value!.height
          const characterX = x - characterWidth / 2
          const characterY = y - characterHeight * 0.5

          // 캐릭터 그리기
          ctx.drawImage(
            characterImageRef.value!,
            characterX,
            characterY,
            characterWidth,
            characterHeight
          )

          // 말풍선 캐릭터인 경우 텍스트 그리기
          const selectedChar = store.characters.find(char => char.id === store.selectedCharacter)
          if (selectedChar?.type === 'patmal' && getSelectedText.value) {
            // 말풍선 영역 계산 (캐릭터 이미지의 상단 부분)
            const bubbleX = x
            const bubbleY = characterY + characterHeight * 0.8
            const bubbleWidth = characterWidth * 0.6

            // 텍스트 그리기
            drawTextOnBubble(ctx, getSelectedText.value, bubbleX, bubbleY, bubbleWidth)
          }
        })
      }
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

// 안드로이드 체크 함수 추가
const isAndroid = () => /Android/i.test(navigator.userAgent)

// 카메라 시작
const startCamera = async () => {
  try {
    if (!videoRef.value || !canvasRef.value || !store.selectedCamera) return

    // 이전 스트림이 있다면 정지
    if (videoRef.value.srcObject) {
      const tracks = (videoRef.value.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }

    // 저장된 카메라 정보 사용
    let constraints: MediaStreamConstraints

    if (store.selectedCamera.isAndroid) {
      // 안드로이드용 제약 조건
      constraints = {
        video: {
          facingMode: store.selectedCamera.facingMode,
          width: { ideal: store.selectedCamera.width },
          height: { ideal: store.selectedCamera.height }
        }
      }
    } else {
      // PC용 제약 조건
      constraints = {
        video: {
          deviceId: { exact: store.selectedCamera.deviceId },
          width: { ideal: store.selectedCamera.width },
          height: { ideal: store.selectedCamera.height }
        }
      }
    }

    console.log('카메라 시작 시도:', constraints)
    const stream = await navigator.mediaDevices.getUserMedia(constraints)

    if (videoRef.value) {
      videoRef.value.srcObject = stream

      // 비디오 메타데이터가 로드되면 캔버스 크기를 설정합니다
      await new Promise((resolve) => {
        videoRef.value!.onloadedmetadata = () => {
          const { videoWidth, videoHeight } = videoRef.value!
          
          // 화면 방향에 따른 캔버스 크기 조정
          if (window.innerHeight > window.innerWidth) {
            // 세로 모드
            canvasRef.value!.width = videoHeight
            canvasRef.value!.height = videoWidth
          } else {
            // 가로 모드
            canvasRef.value!.width = videoWidth
            canvasRef.value!.height = videoHeight
          }
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
    }
  } catch (error) {
    console.error('카메라 시작 실패:', error)
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      alert('카메라 권한이 필요합니다. 설정에서 카메라 권한을 허용해주세요.')
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
}

// 문구 데이터 가져오기
const getSelectedText = computed(() => {
  const textId = Number(store.selectedText)
  const allTexts = [
    '우리집의 든든한 기둥 아빠!! 사랑합니다.',
    '아버지는 언제나 저의 영웅입니다.',
    '저의 최고의 선물은 아버지입니다.',
    '정성으로 우리를 돌봐주시는 엄마!! 사랑합니다.',
    '우리 엄마여서 고마워요. 사랑해요^^',
    '엄마!! 낳아주시고 키워주셔서 감사해요.',
    '우리 딸 사랑해~딸이 있어 언제나 행복해^^',
    '우리 아들 사랑해~아들이 있어 언제나 행복해^^',
    '우리 가족 언제나 행복하자!! 사랑한다.',
    '조건 없는 사랑을 주시는 할머니!! 존경합니다.',
    '늘 건강하세요. 사랑해요 할머니~',
    '할머니 보고싶어요. 전화할께요~',
    '열심히 살아오신 세월을 존경합니다. 할아버지!!',
    '늘 건강하세요. 사랑해요 할아버지~',
    '할아버지 보고싶어요. 전화할께요~',
    '우리 손자 손녀가 나의 보물이다. 사랑한다.',
    '아프지 말고 쑥쑥 크자!',
    '우린 언제나 너희 편이다. 화이팅!!',
    '여보 사랑해요~',
    '당신과 함께한 모든 순간이 소중해',
    '내 인생의 동반자가 되줘서 고마워',
    '생신 축하드려요~ 행복한 하루 보내세요^^',
    '오늘이 가장 젊은날!! 생신 축하드리고 행복하세요^^',
    '언제나 신혼부부 같으신 어머니, 아버지~ 결혼 기념일 축하드려요^^'
  ]
  return textId > 0 && textId <= allTexts.length ? allTexts[textId - 1] : ''
})

// 말풍선에 텍스트 그리기
const drawTextOnBubble = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) => {
  ctx.save()
  
  // 텍스트 스타일 설정
  ctx.font = '24px Arial'
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  // 텍스트 줄바꿈 처리
  const words = text.split('')
  let line = ''
  let lines = []
  const lineHeight = 30
  
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n]
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width
    
    if (testWidth > maxWidth && n > 0) {
      lines.push(line)
      line = words[n]
    } else {
      line = testLine
    }
  }
  lines.push(line)
  
  // 텍스트 그리기
  let posY = y - ((lines.length - 1) * lineHeight) / 2
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, posY)
    posY += lineHeight
  }
  
  ctx.restore()
}

onMounted(async () => {
  await loadBackgroundImage()
  await loadCharacterImage()
  await startCamera()
})

onUnmounted(() => {
  stopCamera()
  if (selfieSegmentation) {
    selfieSegmentation.close()
  }
  if (faceMesh) {
    faceMesh.close()
  }
})
</script>

<template>
  <div class="camera-app">
    <div class="top-controls">
      <button 
        class="back-button"
        @click="$router.push('/background')"
      >
        <span class="material-icons">arrow_back</span>
      </button>
    </div>

    <div class="camera-view">
      <video 
        ref="videoRef" 
        autoplay 
        playsinline
        muted
        :style="{ transform: store.selectedCamera?.facingMode === 'environment' ? 'scaleX(1)' : 'scaleX(-1)' }"
      ></video>
      <canvas 
        ref="canvasRef"
      ></canvas>
    </div>

    <div class="bottom-controls">
      <div class="control-button preview-button">
        <span class="material-icons">photo_library</span>
      </div>
      <div class="capture-button" @click="saveImage">
        <div class="inner-circle"></div>
      </div>
      <div class="control-button switch-button">
        <span class="material-icons">flip_camera_ios</span>
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
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  padding: 16px;
  display: flex;
  align-items: center;
  z-index: 100;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
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

.camera-view {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
}

video, canvas {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

video {
  opacity: 0;
}

.bottom-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  padding: 20px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
}

.control-button {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
}

.control-button:active {
  background: rgba(255,255,255,0.4);
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

/* 안드로이드 대응을 위한 추가 스타일 */
@media screen and (orientation: landscape) {
  .bottom-controls {
    right: 120px;
    height: 100%;
    width: 120px;
    flex-direction: column;
    background: linear-gradient(to left, rgba(0,0,0,0.5), transparent);
  }
}

/* 노치 디스플레이 응 */
@supports (padding-top: env(safe-area-inset-top)) {
  .top-controls {
    padding-top: calc(16px + env(safe-area-inset-top));
    height: calc(60px + env(safe-area-inset-top));
  }

  .bottom-controls {
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
  }
}
</style> 