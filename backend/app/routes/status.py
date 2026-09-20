import platform
import os
from fastapi import APIRouter
from ..services.ocr_service import initialize_ocr
from ..services.storage_service import get_all_documents
from ..config import DATA_DIR, UPLOADS_DIR, PREPROCESSED_DIR, SUPPORTED_LANGUAGES

router = APIRouter()

@router.get("/status")
def get_system_status():
    ocr_init = initialize_ocr()
    docs = get_all_documents()
    
    return {
        "system_name": "Offline Multilingual Certificate Data Extraction & Approval Platform",
        "stage": "Stage 1 (UI Shell, Local Preprocessing Pipeline, Local Offline OCR)",
        "network_status": {
            "offline_enforced": True,
            "external_ai_apis_blocked": True,
            "cloud_dependencies": "None (Zero Cloud APIs Required)"
        },
        "ocr_engine": {
            "name": "Local Tesseract OCR Engine",
            "active": ocr_init.get("initialized", False),
            "version": ocr_init.get("version", "5.3.0"),
            "languages_loaded": ocr_init.get("languages", []),
            "swappable_architecture": "BaseOCREngine interface ready for PaddleOCR / EasyOCR"
        },
        "preprocessing_pipeline": {
            "engine": "OpenCV + Pillow + NumPy (Local)",
            "supported_steps": [
                "Skew detection & deskewing",
                "CLAHE contrast enhancement",
                "Bilateral edge-preserving denoising",
                "Illumination gradient & shadow correction",
                "Bicubic upscaling for low-DPI scans",
                "Laplacian sharpness & degradation assessment"
            ]
        },
        "environment": {
            "python_version": platform.python_version(),
            "os": platform.platform(),
            "total_documents_stored": len(docs),
            "storage_root": str(DATA_DIR)
        },
        "supported_languages": SUPPORTED_LANGUAGES
    }
