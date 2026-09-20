from fastapi import APIRouter
from ..services.ocr_service import initialize_ocr

router = APIRouter()

@router.get("/health")
def get_health():
    ocr_status = initialize_ocr()
    return {
        "status": "online_locally",
        "mode": "100% Offline (Local Edge Execution)",
        "cloud_apis": False,
        "ocr_engine": ocr_status.get("engine", "Tesseract Local"),
        "tesseract_initialized": ocr_status.get("initialized", False),
        "tesseract_version": ocr_status.get("version", "unknown"),
        "installed_languages": ocr_status.get("languages", [])
    }
