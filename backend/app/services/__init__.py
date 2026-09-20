from .preprocessing_service import preprocessing_service, PreprocessingService
from .ocr_service import ocr_manager, OCRManager, TesseractOCREngine
from .storage_service import storage_service, StorageService
from .confidence_service import confidence_scoring_engine, ConfidenceScoringEngine
from .export_service import export_service, ExportService

# Helper aliases for backwards compatibility
def get_all_documents(status=None):
    return storage_service.get_all(status)

def get_document(doc_id):
    return storage_service.get_by_id(doc_id)

def get_stats():
    docs = storage_service.get_all()
    return {
        "total_documents": len(docs),
        "approved": len([d for d in docs if d.get("status") == "APPROVED"]),
        "rejected": len([d for d in docs if d.get("status") == "REJECTED"]),
        "awaiting": len([d for d in docs if d.get("status") == "AWAITING_REVIEW"]),
    }

def initialize_ocr():
    return ocr_manager.initialize_engine()
