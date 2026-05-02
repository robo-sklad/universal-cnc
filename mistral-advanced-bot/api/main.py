from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
from langchain.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import PyPDFLoader, TextLoader
import tempfile

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализация клиента Mistral API
client = MistralClient(api_key=os.getenv("MISTRAL_API_KEY"))

# Инициализация векторизатора и базы знаний
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
knowledge_base = None

# Загрузка документа в базу знаний
def load_document_to_knowledge_base(file_path: str):
    global knowledge_base
    if file_path.endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path)
    documents = loader.load()
    texts = text_splitter.split_documents(documents)
    knowledge_base = FAISS.from_documents(texts, embeddings)

# Поиск в базе знаний
def search_knowledge_base(query: str, k: int = 3):
    if knowledge_base is None:
        return ""
    docs = knowledge_base.similarity_search(query, k=k)
    return "\n".join([doc.page_content for doc in docs])

# Запрос к Mistral API с контекстом
def get_mistral_response(user_message: str, context: str = ""):
    messages = [
        ChatMessage(role="system", content="Ты — полезный ассистент. Отвечай на русском языке. Используй контекст, если он предоставлен."),
        ChatMessage(role="user", content=f"Контекст: {context}\n\nВопрос: {user_message}")
    ]
    response = client.chat(
        model="mistral-tiny",
        messages=messages,
        temperature=0.7
    )
    return response.choices[0].message.content

# Эндпоинт для чата
@app.post("/chat")
async def chat(user_message: str):
    context = search_knowledge_base(user_message)
    response = get_mistral_response(user_message, context)
    return {"response": response}

# Эндпоинт для загрузки файлов в базу знаний
@app.post("/upload-knowledge")
async def upload_knowledge(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        tmp_file.write(await file.read())
        tmp_file_path = tmp_file.name
    load_document_to_knowledge_base(tmp_file_path)
    os.unlink(tmp_file_path)
    return {"status": "File uploaded and added to knowledge base"}

# Эндпоинт для загрузки файлов пользователями (временное хранение)
@app.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    # Сохраните файл временно и извлеките текст для контекста
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        tmp_file.write(await file.read())
        tmp_file_path = tmp_file.name
    text = extract_text_from_file(tmp_file_path)  # Реализуйте эту функцию
    os.unlink(tmp_file_path)
    return {"context": text}

def extract_text_from_file(file_path: str) -> str:
    # Реализуйте извлечение текста из PDF, DOCX, TXT и т.д.
    if file_path.endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path)
    docs = loader.load()
    return "\n".join([doc.page_content for doc in docs])
