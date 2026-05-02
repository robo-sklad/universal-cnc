from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from typing import Optional
import tempfile
from pydantic import BaseModel

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене укажите только ваш домен, например: ["https://robo-sklad.vercel.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Получаем API-ключ из переменных окружения Vercel
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "iN2MxrUmzvjSJkuuVaML6X2kf2xsFzbU")

# Модель для запроса чата
class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None

# Функция для отправки запроса к Mistral API
async def send_to_mistral(message: str, context: Optional[str] = None) -> str:
    import httpx

    prompt = message
    if context:
        prompt = f"Контекст из базы знаний:\n{context}\n\nВопрос пользователя: {message}"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "mistral-tiny",
                "messages": [
                    {
                        "role": "system",
                        "content": "Ты — полезный ассистент на русском языке. Отвечай подробно и по делу."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.7,
            },
        )
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Mistral API error: {response.text}")
        data = response.json()
        return data["choices"][0]["message"]["content"]

# Эндпоинт для чата
@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        response = await send_to_mistral(request.message, request.context)
        return JSONResponse(content={"response": response})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Эндпоинт для загрузки файлов
@app.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    try:
        temp_dir = tempfile.mkdtemp()
        file_path = os.path.join(temp_dir, file.filename)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        return JSONResponse(
            content={
                "status": "success",
                "filename": file.filename,
                "message": "Файл временно сохранён."
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Эндпоинт для проверки работы сервера
@app.get("/")
async def root():
    return {"message": "Mistral Advanced Bot Backend is running on Vercel!"}
