declare module '*.jpg' {
  const value: string
  export default value
}

declare module '*.png' {
  const value: string
  export default value
}

// 이미지 인덱스 시그니처 타입 추가
interface ImageImports {
  [key: number]: () => Promise<typeof import('*.png')>
} 