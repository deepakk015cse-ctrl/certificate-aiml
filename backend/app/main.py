from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import APP_TITLE, APP_VERSION
from .routes.health import router as health_router
from .routes.status import router as status_router
from .routes.documents import router as documents_router
from .routes.export import router as export_router
from .database import init_db
from .services.sample_generator import generate_sample_certificates

app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description="Offline-first certificate data extraction & approval platform backend using OpenCV, SQLite, and local Tesseract OCR"
)

# Allow local CORS for Vite dev server and custom proxying
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/")
def root_health():
    return {"status": "healthy", "service": "Offline Certificate Platform Backend"}

# Register routes under /api
app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(status_router, prefix="/api", tags=["Status"])
app.include_router(documents_router, prefix="/api", tags=["Documents"])
app.include_router(export_router, prefix="/api", tags=["Export"])

@app.on_event("startup")
def on_startup():
    print("[BACKEND] Starting Offline Certificate Extraction & Approval Platform...")
    print("[BACKEND] Network Mode: 100% Offline (No Cloud APIs / No Gemini / No OpenAI)")
    init_db()
    print("[BACKEND] Local SQLite database verified and active.")
    try:
        generate_sample_certificates()
        print("[BACKEND] Initial sample certificates verified and ready.")
    except Exception as e:
        print(f"[BACKEND WARNING] Sample generator skipped: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
