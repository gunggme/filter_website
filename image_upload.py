import requests
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메소드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

async def upload_image(file: UploadFile, upload_url: str):
    # 받은 파일 데이터로 요청 보내기
    files = {'file': file.file}
    response = requests.post(upload_url, files=files)
    
    if response.status_code == 200:
        print('이미지 업로드 성공!')
        return response.content
    else:
        print('이미지 업로드 실패')
        print('상태 코드:', response.status_code)
        return None

@app.post("/proxy/img")
async def proxy_image_upload(file: UploadFile = File(...)):
    target_url = 'http://34.29.113.34:8080/img'
    
    # 이미지 업로드 및 응답 받기
    result = await upload_image(file, target_url)
    
    if result:
        # 이미지 데이터를 클라이언트에게 반환
        return Response(content=result, media_type="image/png")
    else:
        return {"error": "이미지 업로드 실패"}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 