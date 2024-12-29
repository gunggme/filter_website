<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
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
import char5 from '@/assets/characters/wind_korean_trad_panel.png'
import char6 from '@/assets/characters/wind_korean_trad_patmal_panel.png'
import char7 from '@/assets/characters/wind_superman_panel.png'
import char8 from '@/assets/characters/aram_panel.png'
import char9 from '@/assets/characters/aram_heart_panel.png'
import char10 from '@/assets/characters/aram_patmal_panel.png'
import char11 from '@/assets/characters/sky_panel.png'
import char12 from '@/assets/characters/sky_patmal_panel.png'

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
  { id: 5, name: '바람이 한복', url: char5 },
  { id: 6, name: '바람이 한복 말풍선', url: char6 },
  { id: 7, name: '바람이 슈퍼맨', url: char7 },
  { id: 8, name: '아람이', url: char8 },
  { id: 9, name: '아람이 하트', url: char9 },
  { id: 10, name: '아람이 말풍선', url: char10 },
  { id: 11, name: '하늘이', url: char11 },
  { id: 12, name: '하늘이 말풍선', url: char12 }
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
  5: char5,
  6: char6,
  7: char7,
  8: char8,
  9: char9,
  10: char10,
  11: char11,
  12: char12
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
const characterScale = ref(1)

const capturedImage = ref('')
const processedImage = ref('')
const isLoading = ref(false)

let selfieSegmentation: SelfieSegmentation | null = null
let faceMesh: FaceMesh | null = null

// 새로운 상태 변수들 추가
const showQRModal = ref(false)
const qrImageData = ref('')
const isUploading = ref(false)
const uploadError = ref('')

// 문구 관련 상태 추가
const showTextEditor = ref(false)
const customText = ref('')
const selectedCategory = ref(1)

// 텍스트 카테고리 데이터
const categories = ref([
  {
    id: 1,
    name: '아버지',
    texts: [
      { id: 1, content: '든든한 아빠!\n사랑합니다' },
      { id: 2, content: '아빠는 항상\n우리의 영웅!.' },
      { id: 3, content: '최고의 선물\n우리 아빠' }
    ]
  },
  {
    id: 2,
    name: '어머니',
    texts: [
      { id: 4, content: '애정 듬뿍 엄마!\n사랑합니다.' },
      { id: 5, content: '우리 엄마여서\n고마워요' },
      { id: 6, content: '최고의 선물,\n우리 엄마' }
    ]
  },
  {
    id: 3,
    name: '자녀',
    texts: [
      { id: 7, content: '딸이 있어\n항상 행복해' },
      { id: 8, content: '아들이 있어\n언제나 행복해' },
      { id: 9, content: '우리 가족\n언제나 행복하자' }
    ]
  },
  {
    id: 4,
    name: '할머니',
    texts: [
      { id: 10, content: '사랑하는 할머니\n존경합니다' },
      { id: 11, content: '늘 건강하세요\n할머니' },
      { id: 12, content: '할머니 보고싶어요\n전화할게요' }
    ]
  },
  {
    id: 5,
    name: '할아버지',
    texts: [
      { id: 13, content: '사랑하는 할아버지\n존경합니다' },
      { id: 14, content: '늘 건강하세요\n할아버지' },
      { id: 15, content: '할아버지 보고싶어요\n전화할게요' }
    ]
  },
  {
    id: 6,
    name: '손자',
    texts: [
      { id: 16, content: '우리 손자가\n나의 보물이다.' },
      { id: 17, content: '아프지 말고\n쑥쑥 크자' },
      { id: 18, content: '우린 언제나\n너희 편이다.' }
    ]
  },
  {
    id: 7,
    name: '부부',
    texts: [
      { id: 19, content: '여보 사랑해요' },
      { id: 20, content: '당신과 함께한\n모든것이 소중해' },
      { id: 21, content: '내 인생의 절반\n항상 고마워' }
    ]
  },
  {
    id: 8,
    name: '기념일',
    texts: [
      { id: 22, content: '생신 축하드려요' },
      { id: 23, content: '행복한 하루 보내세요' },
      { id: 24, content: '잉꼬부부 엄마아빠\n결혼기념일 축하드려요' }
    ]
  }
])

// 현재 선택된 카테고리의 텍스트들을 반환하는 computed 속성
const currentTexts = computed(() => {
  return categories.value.find(cat => cat.id === selectedCategory.value)?.texts || []
})

// 말풍선 캐릭터 ID 목록
const patmalCharacterIds = [2, 4, 6, 10, 12]

// 말풍선이 없는 캐릭터만 필터링하는 computed 속성으로 수정
const filteredCharacters = computed(() => {
  return characters.value.filter(char => !patmalCharacterIds.includes(char.id))
})

// 캐릭터별 얼굴 위치 설정 타입 정의
interface FacePosition {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotate: number;
}

interface CharacterFacePositions {
  [key: number]: FacePosition;
}

const characterFacePositions: CharacterFacePositions = {
  // 일반 캐릭터
  1: { scale: 0.45, offsetX: 0.48, offsetY: 0.3, rotate: 15 },  // 다람이
  3: { scale: 0.42, offsetX: 0.54, offsetY: 0.26, rotate: 10 },  // 바람이
  5: { scale: 0.37, offsetX: 0.54, offsetY: 0.3, rotate: 10 },  // 바람이 한복
  7: { scale: 0.42, offsetX: 0.47, offsetY: 0.18, rotate: -5 },  // 바람이 슈퍼맨
  8: { scale: 0.42, offsetX: 0.5, offsetY: 0.35, rotate: -3 },  // 아람이
  9: { scale: 0.42, offsetX: 0.52, offsetY: 0.35, rotate: 14 },  // 아람이 하트
  11: { scale: 0.42, offsetX: 0.43, offsetY: 0.3, rotate: -15 }, // 하늘이

  // 말풍선 캐릭터
  2: { scale: 0.3, offsetX: 0.5, offsetY: 0.15, rotate: 0 },   // 다람이 말풍선
  4: { scale: 0.3, offsetX: 0.5, offsetY: 0.15, rotate: 0 },   // 바람이 말풍선
  6: { scale: 0.3, offsetX: 0.5, offsetY: 0.15, rotate: 0 },   // 바람이 한복 말풍선
  10: { scale: 0.3, offsetX: 0.5, offsetY: 0.15, rotate: 0 },  // 아람이 말풍선
  12: { scale: 0.3, offsetX: 0.5, offsetY: 0.15, rotate: 0 }   // 하늘이 말풍선
}

// 캐릭터별 문구 스타일 설정
interface TextStyle {
  fontSize: number;
  offsetX: number;
  offsetY: number;
  maxWidth: number;
  lineHeight: number;
  rotate: number;
}

interface CharacterTextStyles {
  [key: number]: TextStyle;
}

const characterTextStyles: CharacterTextStyles = {
  // 일반 캐릭터 (캐릭터 아래에 텍스트)
  1: { fontSize: 70, offsetX: 0.5, offsetY: 0.2, maxWidth: 2, lineHeight: 1.2, rotate: 0 },  // 다람이
  3: { fontSize: 70, offsetX: 0.5, offsetY: 0.2, maxWidth: 2, lineHeight: 1.2, rotate: 0 },  // 바람이
  5: { fontSize: 70, offsetX: 0.5, offsetY: 0.2, maxWidth: 2, lineHeight: 1.2, rotate: 0 },  // 바람이 한복
  7: { fontSize: 70, offsetX: 0.5, offsetY: 0.2, maxWidth: 2, lineHeight: 1.2, rotate: 0 },  // 바람이 슈퍼맨
  8: { fontSize: 70, offsetX: 0.5, offsetY: 0.2, maxWidth: 2, lineHeight: 1.2, rotate: 0 },  // 아람이
  9: { fontSize: 70, offsetX: 0.5, offsetY: 0.2, maxWidth: 2, lineHeight: 1.2, rotate: 0 },  // 아람이 하트
  11: { fontSize: 70, offsetX: 0.5, offsetY: 0.2, maxWidth: 2, lineHeight: 1.2, rotate: 0 }, // 하늘이

  // 말풍선 캐릭터 (말풍선 안에 텍스트)
  2: { fontSize: 28, offsetX: 0.5, offsetY: 0.8, maxWidth: 0.7, lineHeight: 1.3, rotate: 0 },   // 다람이 말풍선
  4: { fontSize: 32, offsetX: 0.5, offsetY: 0.8, maxWidth: 0.8, lineHeight: 1.2, rotate: 0 },   // 바람이 말풍선
  6: { fontSize: 30, offsetX: 0.5, offsetY: 0.8, maxWidth: 0.75, lineHeight: 1.3, rotate: 0 },  // 바람이 한복 말풍선
  10: { fontSize: 28, offsetX: 0.5, offsetY: 0.8, maxWidth: 0.7, lineHeight: 1.3, rotate: 0 },  // 아람이 말풍선
  12: { fontSize: 32, offsetX: 0.5, offsetY: 0.8, maxWidth: 0.8, lineHeight: 1.2, rotate: 0 }   // 하늘이 말풍선
}

// MediaPipe 초기화
const initializeMediaPipe = async () => {
  try {
    console.log('MediaPipe 초기화 시작')
    
    // 이전 인스턴스가 있다면 정리
    if (faceMesh) {
      await faceMesh.close()
      faceMesh = null
    }
    if (selfieSegmentation) {
      await selfieSegmentation.close()
      selfieSegmentation = null
    }
    
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
    console.log('Selfie Segmentation 초기화 완료')

    // Face Mesh 초기화
    faceMesh = new FaceMesh({
      locateFile: (file) => {
        const path = `/mediapipe/face_mesh/${file}`
        console.log('FaceMesh 파일 경로:', path)
        return path
      }
    })
    console.log('FaceMesh 인스턴스 생성됨')

    await faceMesh.initialize()
    console.log('FaceMesh 초기화 완료')

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })
    console.log('FaceMesh 옵션 설정 완료')
  } catch (error) {
    console.error('MediaPipe 초기화 실패:', error)
    // 에러 발생 시 인스턴스 정리
    if (faceMesh) {
      await faceMesh.close()
      faceMesh = null
    }
    if (selfieSegmentation) {
      await selfieSegmentation.close()
      selfieSegmentation = null
    }
  }
}

// 이미지 프로세싱
const processImage = async (applyBackground: boolean = false) => {
  if (!capturedImage.value) return
  
  isLoading.value = true
  
  try {
    // MediaPipe가 초기화되지 않았다면 다시 초기화
    if (!faceMesh || !selfieSegmentation) {
      await initializeMediaPipe()
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const originalImage = new Image()
    originalImage.src = capturedImage.value
    await new Promise((resolve) => {
      originalImage.onload = resolve
    })

    canvas.width = originalImage.width
    canvas.height = originalImage.height

    // 1. 배경 이미지 먼저 그리기
    if (store.selectedBackground) {
      const bgImage = new Image()
      const bgSrc = backgroundImages[store.selectedBackground]
      if (bgSrc) {
        bgImage.src = bgSrc
        await new Promise((resolve) => {
          bgImage.onload = resolve
        })
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height)
      }
    }

    // 캐릭터 크기와 위치 계산 (실제로 그리지는 않음)
    let charWidth = 0
    let charHeight = 0
    let charX = 0
    let charY = 0

    if (store.selectedCharacter) {
      const charImage = new Image()
      charImage.src = characterImages[store.selectedCharacter]
      await new Promise((resolve) => {
        charImage.onload = () => {
          // 캐릭터 크기 계산 (기본 크기를 120%로 유지)
          charWidth = canvas.width * 1.2 * characterScale.value
          charHeight = (charWidth / charImage.width) * charImage.height

          // 캐릭터 위치 계산 (항상 중앙)
          charX = (canvas.width - charWidth) / 2
          charY = (canvas.height - charHeight) / 2

          resolve(true)
        }
      })
    }

    // 2. 얼굴 인식 및 세그멘테이션
    if (faceMesh && selfieSegmentation) {
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

            // 얼굴 영역 ��산 (좌우 패딩을 더 크게 설정)
            const paddingVertical = 0.3  // 상하 패딩
            const paddingHorizontal = 0.5  // 좌우 패딩을 더 크게 설정
            
            const faceWidth = (maxX - minX) * canvas.width
            const faceHeight = (maxY - minY) * canvas.height
            const faceX = Math.max(0, minX * canvas.width - faceWidth * paddingHorizontal)
            const faceY = Math.max(0, minY * canvas.height - faceHeight * paddingVertical)
            const paddedWidth = faceWidth * (1 + paddingHorizontal * 2)
            const paddedHeight = faceHeight * (1 + paddingVertical * 2)

            // 얼굴 영역만 추출
            const faceCanvas = document.createElement('canvas')
            faceCanvas.width = paddedWidth
            faceCanvas.height = paddedHeight
            const faceCtx = faceCanvas.getContext('2d')
            if (!faceCtx) return

            // 얼굴 마스크 생성 (타원형을 좌우로 더 길게)
            faceCtx.beginPath()
            faceCtx.ellipse(
              paddedWidth / 2,
              paddedHeight / 2,
              paddedWidth / 2,  // x 반경을 더 크게 설정
              paddedHeight / 2.2,
              0,
              0,
              Math.PI * 2
            )
            faceCtx.closePath()
            faceCtx.clip()

            // 얼굴 부분만 그리기
            faceCtx.drawImage(
              originalImage,
              faceX, faceY, paddedWidth, paddedHeight,
              0, 0, paddedWidth, paddedHeight
            )

            // 얼굴을 캐릭터 구멍 위치에 맞춰 그리기
            const characterPosition = characterFacePositions[store.selectedCharacter] || { scale: 0.5, offsetX: 0.5, offsetY: 0.3, rotate: 0 }
            const targetWidth = charWidth * characterPosition.scale
            const targetHeight = (targetWidth / paddedWidth) * paddedHeight
            const targetX = charX + charWidth * characterPosition.offsetX - targetWidth / 2
            const targetY = charY + charHeight * characterPosition.offsetY

            // 회전 적용
            if (characterPosition.rotate !== 0) {
              ctx.save()
              ctx.translate(targetX + targetWidth / 2, targetY + targetHeight / 2)
              ctx.rotate(characterPosition.rotate * Math.PI / 180)
              ctx.translate(-(targetX + targetWidth / 2), -(targetY + targetHeight / 2))
            }

            // 얼굴 그리기
            ctx.drawImage(
              faceCanvas,
              targetX, targetY,
              targetWidth, targetHeight
            )

            // 회전 복원
            if (characterPosition.rotate !== 0) {
              ctx.restore()
            }
          }
          resolve(true)
        })
        faceMesh!.send({image: originalImage})
      })
    }

    // 3. 마지막으로 캐릭터와 문구 그리기
    if (store.selectedCharacter) {
      const charImage = new Image()
      charImage.src = characterImages[store.selectedCharacter]
      await new Promise((resolve) => {
        charImage.onload = () => {
          // 캐릭터 그리기
          ctx.drawImage(charImage, charX, charY, charWidth, charHeight)

          // 문구 그리기
          if (customText.value && characterTextStyles[store.selectedCharacter]) {
            const textStyle = characterTextStyles[store.selectedCharacter]
            
            // 텍스트 스타일 설정
            ctx.font = `${textStyle.fontSize}px KyoboHandwriting`
            ctx.fillStyle = 'black'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            // 텍스트 위치 계산
            const textX = charX + charWidth * textStyle.offsetX
            const textY = charY + charHeight * textStyle.offsetY

            // 회전 적용 (필요한 경우)
            if (textStyle.rotate !== 0) {
              ctx.save()
              ctx.translate(textX, textY)
              ctx.rotate(textStyle.rotate * Math.PI / 180)
              ctx.translate(-textX, -textY)
            }

            // 텍스트 줄바꿈 처리
            const maxWidth = charWidth * textStyle.maxWidth
            const words = customText.value.split('')
            let line = ''
            let lines = []
            
            for (let i = 0; i < words.length; i++) {
              const testLine = line + words[i]
              const metrics = ctx.measureText(testLine)
              const testWidth = metrics.width

              if (testWidth > maxWidth && line) {
                lines.push(line)
                line = words[i]
              } else {
                line = testLine
              }
            }
            lines.push(line)

            // 여러 줄의 텍스트 그리기
            lines.forEach((line, i) => {
              const lineY = textY + (i - (lines.length - 1) / 2) * (textStyle.fontSize * textStyle.lineHeight)
              
              // 텍스트 외곽선 (일반 캐릭터는 흰색 외곽선)
              ctx.strokeStyle = 'black'
              ctx.lineWidth = 4
              ctx.strokeText(line, textX, lineY)
              
              // 텍스트 내부
              ctx.fillText(line, textX, lineY)
            })

            // 회전 복원 (필요한 경우)
            if (textStyle.rotate !== 0) {
              ctx.restore()
            }
          }
          resolve(true)
        }
      })
    }

    processedImage.value = canvas.toDataURL('image/jpeg', 0.8)
  } catch (error) {
    console.error('이미지 처리 중 오류:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  console.log('컴포넌트 마운트됨')
  const imageData = sessionStorage.getItem('capturedImage')
  
  if (imageData) {
    console.log('이미지 데이터 존재')
    capturedImage.value = imageData
    sessionStorage.removeItem('capturedImage')
    
    // MediaPipe 초기화
    await initializeMediaPipe()
    
    // 초기 배경 설정 (배경1)
    store.setBackground(1)
    
    // 초기 캐릭터 설정 (캐릭터1)
    selectedCharacter.value = 1
    store.setCharacter(1)
    
    // 이미지 처리 (배경과 캐릭터 적용)
    await processImage(true)
  } else {
    console.log('이미지 데이터 없음, final로 리다이렉트')
    router.push('/final')
  }
})

// 컴포넌트 언마운트 시 이미지 데이터 정리
onUnmounted(async () => {
  sessionStorage.removeItem('capturedImage')
  if (faceMesh) {
    await faceMesh.close()
    faceMesh = null
  }
  if (selfieSegmentation) {
    await selfieSegmentation.close()
    selfieSegmentation = null
  }
})

const retake = () => {
  router.push('/final')
}

const confirm = async () => {
  if (!processedImage.value) return
  
  showQRModal.value = true  // 먼저 모달을 표시
  isUploading.value = true
  uploadError.value = ''
  
  try {
    // 현재 캔버스의 최종 이미지(문구 포함)를 가져옴
    const finalImage = processedImage.value
    
    // Base64 데이터를 Blob으로 변환
    const base64Data = finalImage.split(',')[1]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/png' })
    
    // FormData 생성 및 일 추가
    const formData = new FormData()
    formData.append('file', blob, 'photo.png')
    
    // 이미지 업로드 요청
    const response = await fetch('http://34.29.113.34:8000/proxy/img', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error('이미지 업로드 실패')
    }
    
    // 응답으로 받은 이미지 데이터를 QR 코드로 표시
    const imageBlob = await response.blob()
    qrImageData.value = URL.createObjectURL(imageBlob)
    
  } catch (error) {
    console.error('업로드 중 오류:', error)
    uploadError.value = '이미지 업로드 중 오류가 발생했습니다.'
  } finally {
    isUploading.value = false
  }
}

// QR 모달 닫기 함수
const closeQRModal = () => {
  showQRModal.value = false
  if (qrImageData.value) {
    URL.revokeObjectURL(qrImageData.value)
    qrImageData.value = ''
  }
}

// 캐릭터 선택 함수 수정
const selectCharacter = async (characterId: number) => {
  // 말풍선이 있는 캐릭터는 선택 불가
  if (patmalCharacterIds.includes(characterId)) {
    return
  }
  
  selectedCharacter.value = characterId
  store.setCharacter(characterId)
  
  // 일반 캐릭터 선택 시 텍스트 에디터 표시
  showTextEditor.value = true
  
  await processImage(store.selectedBackground !== null)
}

// 캐릭터 크기 조절
const adjustScale = (delta: number) => {
  // 크기 조절 범위를 0.5~3.0으로 확장
  characterScale.value = Math.max(0.5, Math.min(3.0, characterScale.value + delta))
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

// 문구 설정 함수
const setText = (text: string) => {
  customText.value = text
  processImage(store.selectedBackground !== null)
}

</script>

<template>
  <div class="preview-screen">
    <!-- 메인 프리뷰 영역 -->
    <div class="preview-container">
      <img 
        v-if="processedImage" 
        :src="processedImage" 
        alt="Processed photo"
        class="preview-image"
      />

      <!-- 크기 조절 컨트롤 -->
      <div v-if="selectedCharacter" class="scale-controls">
        <button class="scale-button" @click="adjustScale(-0.1)">-</button>
        <span class="scale-value">{{ Math.round(characterScale * 100) }}%</span>
        <button class="scale-button" @click="adjustScale(0.1)">+</button>
      </div>

      <!-- 편집 ���튼과 선택기 패널을 하나의 테이너로 묶음 -->
      <div class="editor-container">
        <!-- 편집 버튼 -->
        <div class="edit-buttons">
          <button 
            :class="['edit-button', { active: editMode === 'background' }]"
            @click="editMode = 'background'"
          >
            배경 선택
          </button>
          <button 
            :class="['edit-button', { active: editMode === 'character' }]"
            @click="editMode = 'character'"
          >
            캐릭터 선택
          </button>
        </div>

        <!-- 문구 편집 패널 -->
        <div v-if="showTextEditor" class="text-editor-panel">
          <!-- 카테고리 선택 -->
          <div class="category-select">
            <button
              v-for="category in categories"
              :key="category.id"
              :class="['category-button', { active: selectedCategory === category.id }]"
              @click="selectedCategory = category.id"
            >
              {{ category.name }}
            </button>
          </div>
          
          <!-- 텍스트 선택 -->
          <div class="text-options">
            <button 
              v-for="text in currentTexts"
              :key="text.id"
              :class="['text-option', { active: customText === text.content }]"
              @click="setText(text.content)"
            >
              {{ text.content }}
            </button>
          </div>
        </div>

        <!-- 선택기 패널 -->
        <div 
          v-if="editMode === 'background'" 
          class="selector-panel"
        >
          <div 
            v-for="bg in backgrounds" 
            :key="bg.id"
            :class="['selector-item', { selected: store.selectedBackground === bg.id }]"
            @click="selectBackground(bg.id)"
          >
            <img :src="bg.url" :alt="bg.name">
          </div>
        </div>

        <div 
          v-if="editMode === 'character'" 
          class="selector-panel"
        >
          <div 
            v-for="char in filteredCharacters" 
            :key="char.id"
            :class="['selector-item', { selected: selectedCharacter === char.id }]"
            @click="selectCharacter(char.id)"
          >
            <img :src="char.url" :alt="char.name">
          </div>
        </div>
      </div>

      <!-- 로딩 오버레이 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">처리중...</div>
      </div>
    </div>

    <!-- 하단 컨트롤 -->
    <div class="bottom-controls">
      <button 
        class="control-button secondary"
        @click="retake"
        :disabled="isLoading"
      >
        다시 촬영
      </button>
      <button 
        class="control-button primary"
        @click="confirm"
        :disabled="isLoading || !processedImage"
      >
        저장하기
      </button>
    </div>

    <!-- QR 코드 모달 -->
    <div v-if="showQRModal" class="qr-modal">
      <div class="qr-modal-content">
        <template v-if="isUploading">
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">QR 코드 생성 중...</p>
          </div>
        </template>
        <template v-else>
          <h3>QR 코드</h3>
          <img v-if="qrImageData" :src="qrImageData" alt="QR Code" class="qr-image">
          <p v-if="uploadError" class="error-message">{{ uploadError }}</p>
          <button class="close-button" @click="closeQRModal">닫기</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
  position: relative;
}

.preview-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  position: absolute;
  top: 0;
  left: 0;
}

/* 크기 조절 컨트롤 */
.scale-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
}

.scale-button {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
}

.scale-value {
  min-width: 48px;
  text-align: center;
  color: white;
  font-size: 14px;
}

/* 편집 컨테이너 */
.editor-container {
  position: absolute;
  bottom: calc(76px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 편집 버튼 */
.edit-buttons {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.5);
}

.edit-button {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.edit-button.active {
  background: var(--primary-color);
}

/* 선택기 패널 */
.selector-panel {
  height: 100px;
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow-x: auto;
  background: rgba(0, 0, 0, 0.5);
}

.selector-item {
  flex: 0 0 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
}

.selector-item.selected {
  border-color: var(--primary-color);
}

.selector-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 하단 컨트롤 */
.bottom-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  display: flex;
  gap: 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  z-index: 10;
}

.control-button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  color: white;
}

.control-button.primary {
  background: var(--primary-color);
}

.control-button.secondary {
  background: var(--secondary-color);
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 16px;
  color: white;
  font-size: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 가로 모드 방지 */
@media screen and (orientation: landscape) {
  .preview-screen {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
    transform-origin: center center;
    width: 100vh;
    height: 100vw;
    background: #000;
  }
}

/* QR 코드 모달 */
.qr-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.qr-modal-content {
  background: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  max-width: 90%;
  width: 300px;
}

.qr-modal-content h3 {
  margin: 0 0 16px 0;
  color: #333;
}

.qr-image {
  width: 200px;
  height: 200px;
  margin: 16px auto;
  display: block;
}

.error-message {
  color: red;
  margin: 8px 0;
}

.close-button {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 16px;
}

.close-button:hover {
  opacity: 0.9;
}

/* 문구 편집 패널 */
.text-editor-panel {
  padding: 8px;
  background: rgba(0, 0, 0, 0.5);
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-select {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.category-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}

.category-button.active {
  background: var(--primary-color);
}

.text-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.text-option {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  white-space: normal;
  word-break: keep-all;
  line-height: 1.4;
}

.text-option.active {
  background: var(--primary-color);
}

/* QR 모달 로딩 스타일 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 1rem;
  color: #333;
  font-size: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@font-face {
  font-family: 'KyoboHandwriting';
  src: url('@/assets/fonts/KyoboHandwriting2020pdy.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}
</style> 