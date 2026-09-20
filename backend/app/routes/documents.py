import uuid
import datetime
import shutil
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse

from ..config import UPLOADS_DIR, PREPROCESSED_DIR, DB_FILE
from ..models.schemas import (
    DocumentRecordSchema,
    ReviewSubmissionSchema,
    DashboardStatsSchema,
    ExtractedFieldSchema,
    AuditEntrySchema,
)
from ..services.storage_service import storage_service
from ..services.preprocessing_service import preprocessing_service
from ..services.ocr_service import ocr_manager
from ..services.sample_generator import SampleGenerator
from ..services.confidence_service import confidence_scoring_engine

router = APIRouter()

@router.get("/dashboard/stats", response_model=DashboardStatsSchema)
def get_dashboard_stats():
    docs = storage_service.get_all()
    total = len(docs)
    processed = len([d for d in docs if d.get("preprocessed") is not None or d.get("ocr") is not None])
    awaiting = len([d for d in docs if d.get("status") == "AWAITING_REVIEW"])
    approved = len([d for d in docs if d.get("status") == "APPROVED"])
    rejected = len([d for d in docs if d.get("status") == "REJECTED"])
    low_conf = len([d for d in docs if d.get("status") == "LOW_CONFIDENCE"])

    ocr_confs = [
        d["ocr"]["average_confidence"]
        for d in docs
        if d.get("ocr") and d["ocr"].get("average_confidence", 0) > 0
    ]
    avg_conf = round(sum(ocr_confs) / len(ocr_confs), 1) if ocr_confs else 0.0

    return {
        "total_documents": total,
        "processed": processed,
        "awaiting_review": awaiting,
        "approved": approved,
        "rejected": rejected,
        "low_confidence": low_conf,
        "average_ocr_confidence": avg_conf,
    }

@router.get("/documents", response_model=List[DocumentRecordSchema])
def list_documents(status: Optional[str] = Query(default=None)):
    status_filter = status if isinstance(status, str) else None
    return storage_service.get_all(status_filter)

@router.get("/documents/{doc_id}", response_model=DocumentRecordSchema)
def get_document(doc_id: str):
    doc = storage_service.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.post("/upload", response_model=DocumentRecordSchema)
async def upload_document(file: UploadFile = File(...)):
    doc_id = str(uuid.uuid4())[:8]
    ext = Path(file.filename).suffix.lower()
    saved_filename = f"{doc_id}_{file.filename}"
    file_path = UPLOADS_DIR / saved_filename

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = file_path.stat().st_size

    new_doc = {
        "id": doc_id,
        "filename": saved_filename,
        "original_filename": file.filename,
        "file_type": file.content_type or f"application/{ext.replace('.', '')}",
        "file_size": file_size,
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "UPLOADED",
        "original_url": f"/api/files/uploads/{saved_filename}",
        "preprocessed": None,
        "ocr": None,
        "extracted_fields": None,
        "approval_notes": None,
        "rejection_reason": None,
        "reviewer": None,
        "reviewed_at": None,
        "audit_trail": [],
    }

    return storage_service.create(new_doc)

@router.post("/documents/{doc_id}/preprocess", response_model=DocumentRecordSchema)
def preprocess_document(doc_id: str):
    doc = storage_service.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    input_path = UPLOADS_DIR / doc["filename"]
    if not input_path.exists():
        raise HTTPException(status_code=400, detail="Source image file not found on disk")

    output_filename = f"proc_{doc['filename']}"
    output_path = PREPROCESSED_DIR / output_filename

    prep_data = preprocessing_service.process(str(input_path), str(output_path))
    prep_data["processed_url"] = f"/api/files/preprocessed/{output_filename}"

    updates = {
        "preprocessed": prep_data,
        "status": "PREPROCESSED" if doc["status"] == "UPLOADED" else doc["status"],
    }
    return storage_service.update(doc_id, updates)

@router.post("/documents/{doc_id}/ocr", response_model=DocumentRecordSchema)
def run_ocr(doc_id: str, lang: str = Query("eng")):
    doc = storage_service.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Prefer preprocessed image if available
    target_path = None
    prep = doc.get("preprocessed")
    if prep and prep.get("output_path"):
        cand = Path(prep["output_path"])
        if cand.exists():
            target_path = cand

    if not target_path:
        target_path = UPLOADS_DIR / doc["filename"]

    if not target_path.exists():
        raise HTTPException(status_code=400, detail="Document image file not found on disk")

    ocr_data = ocr_manager.extract(str(target_path), lang=lang)

    quality = prep.get("quality_score", 0.90) if prep else 0.88
    skew = prep.get("skew_angle", 0.0) if prep else 0.0
    avg_conf = ocr_data.get("average_confidence", 85.0)

    # Extract structured fields and evaluate confidence per field
    fields = confidence_scoring_engine.extract_structured_fields(
        raw_text=ocr_data["text"],
        filename=doc["filename"],
        language=lang,
        avg_ocr_conf=avg_conf,
        quality_score=quality,
        skew_angle=skew,
    )

    new_status = "AWAITING_REVIEW"
    # Prioritize low confidence if average OCR confidence is low OR any field is LOW
    if avg_conf < 65.0 or any(f.get("level") == "LOW" for f in fields):
        new_status = "LOW_CONFIDENCE"

    updates = {
        "ocr": ocr_data,
        "extracted_fields": fields,
        "status": new_status,
    }
    return storage_service.update(doc_id, updates)

@router.put("/documents/{doc_id}/fields", response_model=DocumentRecordSchema)
def update_document_fields(
    doc_id: str,
    fields: List[ExtractedFieldSchema],
    reviewer: str = Query("Human Reviewer"),
    notes: Optional[str] = Query("Field corrections saved by reviewer"),
):
    doc = storage_service.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    audit_trail = list(doc.get("audit_trail") or [])

    # Identify changes and log audit entry for each modified field
    field_dicts = [f.dict() if hasattr(f, "dict") else f for f in fields]
    for f in field_dicts:
        if f.get("is_edited"):
            orig = f.get("original_extracted_value", f.get("value", ""))
            edited = f.get("reviewer_edited_value") or f.get("value", "")
            audit_trail.append({
                "field": f.get("field", ""),
                "original_value": orig,
                "reviewer_edited_value": edited,
                "confidence": f.get("score", 0.0),
                "confidence_level": f.get("level", "MEDIUM"),
                "review_status": doc.get("status", "AWAITING_REVIEW"),
                "review_timestamp": now_str,
                "reviewer": reviewer,
                "notes": notes,
            })

    updates = {
        "extracted_fields": field_dicts,
        "audit_trail": audit_trail,
    }
    return storage_service.update(doc_id, updates)

@router.post("/documents/{doc_id}/review", response_model=DocumentRecordSchema)
def review_document(doc_id: str, submission: ReviewSubmissionSchema):
    doc = storage_service.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    audit_trail = list(doc.get("audit_trail") or [])

    # Process edited fields if submitted
    current_fields = doc.get("extracted_fields") or []
    if submission.edited_fields:
        current_fields = [f.dict() if hasattr(f, "dict") else f for f in submission.edited_fields]
        for f in current_fields:
            if f.get("is_edited"):
                audit_trail.append({
                    "field": f.get("field", ""),
                    "original_value": f.get("original_extracted_value", f.get("value", "")),
                    "reviewer_edited_value": f.get("reviewer_edited_value") or f.get("value", ""),
                    "confidence": f.get("score", 0.0),
                    "confidence_level": f.get("level", "MEDIUM"),
                    "review_status": submission.status,
                    "review_timestamp": now_str,
                    "reviewer": submission.reviewer or "Human Reviewer",
                    "notes": submission.notes or "",
                })

    # Log document-level review action in audit trail
    audit_trail.append({
        "field": "DOCUMENT_REVIEW_DECISION",
        "original_value": doc.get("status", "AWAITING_REVIEW"),
        "reviewer_edited_value": submission.status,
        "confidence": doc.get("ocr", {}).get("average_confidence", 85.0) / 100.0 if doc.get("ocr") else 0.85,
        "confidence_level": "HIGH" if submission.status == "APPROVED" else "LOW",
        "review_status": submission.status,
        "review_timestamp": now_str,
        "reviewer": submission.reviewer or "Human Reviewer",
        "notes": submission.rejection_reason if submission.status == "REJECTED" else (submission.notes or "Decision recorded"),
    })

    updates = {
        "status": submission.status,
        "approval_notes": submission.notes,
        "rejection_reason": submission.rejection_reason,
        "reviewer": submission.reviewer,
        "reviewed_at": now_str,
        "extracted_fields": current_fields,
        "audit_trail": audit_trail,
    }
    return storage_service.update(doc_id, updates)

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    doc = storage_service.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Cleanup files
    raw = UPLOADS_DIR / doc["filename"]
    if raw.exists():
        raw.unlink(missing_ok=True)

    if doc.get("preprocessed") and doc["preprocessed"].get("output_path"):
        proc = Path(doc["preprocessed"]["output_path"])
        if proc.exists():
            proc.unlink(missing_ok=True)

    storage_service.delete(doc_id)
    return {"message": "Document deleted successfully"}

@router.get("/documents/{doc_id}/logs")
def get_document_processing_logs(doc_id: str):
    """Retrieves SQLite processing logs for a specific certificate pipeline lifecycle."""
    doc = storage_service.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    logs = storage_service.get_processing_logs(doc_id)
    return {
        "document_id": doc_id,
        "filename": doc["filename"],
        "logs": logs,
    }

@router.post("/database/backup")
def trigger_database_backup():
    """Generates an offline local snapshot of certiextract.db in backend/data/backups/."""
    try:
        backup_path = storage_service.backup_database()
        return {
            "status": "SUCCESS",
            "message": "Local SQLite database backup generated successfully",
            "backup_path": backup_path,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate backup: {str(e)}")

@router.get("/database/backups")
def list_database_backups():
    """Returns all available offline SQLite backups."""
    backups = storage_service.list_backups()
    return {"backups": backups, "count": len(backups)}

@router.get("/database/stats")
def get_database_stats():
    """Returns SQLite storage metrics, table statistics, and database file status."""
    stats = storage_service.get_dashboard_stats()
    db_file = DB_FILE
    db_size = db_file.stat().st_size if db_file.exists() else 0
    return {
        "database_file": str(db_file),
        "database_size_bytes": db_size,
        "is_offline": True,
        "engine": "SQLite 3 (WAL mode)",
        "metrics": stats,
    }

@router.post("/seed-samples")
def seed_samples():
    docs = SampleGenerator.seed_samples()
    return {"message": f"Successfully seeded {len(docs)} sample certificates", "documents": docs}

@router.get("/files/uploads/{filename}")
def serve_upload_file(filename: str):
    path = UPLOADS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)

@router.get("/files/preprocessed/{filename}")
def serve_preprocessed_file(filename: str):
    path = PREPROCESSED_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)
