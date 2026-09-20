import json
import os
import shutil
from typing import List, Optional, Dict, Any
from pathlib import Path
from ..config import DATA_DIR, RECORDS_FILE, UPLOADS_DIR, PROCESSED_DIR, DB_FILE
from ..database.connection import SessionLocal, init_db, create_local_backup, list_local_backups
from ..database.models import DocumentModel, ExtractedFieldModel, ReviewModel, ProcessingLogModel
from ..database.repository import DocumentRepository

class SQLiteStorageService:
    """
    Production-grade SQLite Storage Service for CertiExtract.
    Maintains 100% offline local persistence with ACID safety.
    """

    def __init__(self):
        init_db()
        self._migrate_existing_json_if_needed()

    def _migrate_existing_json_if_needed(self):
        """Migrate any legacy JSON records into SQLite on first run if database is empty."""
        db = SessionLocal()
        try:
            repo = DocumentRepository(db)
            count = db.query(DocumentModel).count()
            if count == 0 and RECORDS_FILE.exists():
                try:
                    with open(RECORDS_FILE, "r", encoding="utf-8") as f:
                        records = json.load(f)
                    for r in records:
                        doc_id = r.get("id")
                        if not doc_id:
                            continue
                        filename = r.get("filename", f"{doc_id}.png")
                        file_path = str(UPLOADS_DIR / filename)
                        created = r.get("created_at") or "2026-09-12 10:00:00"
                        status = r.get("status", "UPLOADED")
                        if status == "AWAITING_REVIEW":
                            status = "REVIEW_REQUIRED"

                        doc = repo.create_document(
                            doc_id=doc_id,
                            filename=filename,
                            file_path=file_path,
                            certificate_type=r.get("certificate_type", "General"),
                            source_language=r.get("source_language", "eng"),
                            processing_status=status,
                            image_quality_score=r.get("preprocessed", {}).get("quality_score", 0.85) if r.get("preprocessed") else 0.85,
                            original_filename=r.get("original_filename", filename),
                            file_type=r.get("file_type", "image/png"),
                            file_size=r.get("file_size", 0),
                        )

                        # Migrate extracted fields if present
                        if r.get("extracted_fields"):
                            repo.save_ocr_and_extracted_fields(
                                doc_id=doc_id,
                                raw_text=r.get("ocr", {}).get("text", ""),
                                average_confidence=r.get("ocr", {}).get("average_confidence", 85.0) if r.get("ocr") else 85.0,
                                language=r.get("source_language", "eng"),
                                certificate_type=r.get("certificate_type", "General"),
                                fields=r.get("extracted_fields", []),
                            )
                        
                        # Set final status if approved or rejected
                        if r.get("status") == "APPROVED":
                            repo.approve_document(doc_id, reviewer=r.get("reviewer", "Registrar Reviewer"), notes=r.get("approval_notes"))
                        elif r.get("status") == "REJECTED":
                            repo.reject_document(doc_id, reason=r.get("rejection_reason", "Documentation rejected"), reviewer=r.get("reviewer", "Registrar Reviewer"))

                    print(f"[DATABASE MIGRATION] Migrated {len(records)} existing certificates from JSON into SQLite.")
                except Exception as e:
                    print(f"[DATABASE MIGRATION WARNING] Failed to migrate JSON records: {e}")
        finally:
            db.close()

    def get_all(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            repo = DocumentRepository(db)
            docs = repo.get_all(status)
            return [repo.to_dict(d) for d in docs]
        finally:
            db.close()

    def get_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            repo = DocumentRepository(db)
            doc = repo.get_by_id(doc_id)
            if not doc:
                return None
            return repo.to_dict(doc)
        finally:
            db.close()

    def create(self, record: Dict[str, Any]) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            repo = DocumentRepository(db)
            doc_id = record["id"]
            filename = record["filename"]
            file_path = record.get("file_path") or str(UPLOADS_DIR / filename)

            doc = repo.create_document(
                doc_id=doc_id,
                filename=filename,
                file_path=file_path,
                certificate_type=record.get("certificate_type", "General"),
                source_language=record.get("source_language", "eng"),
                processing_status=record.get("status", "UPLOADED"),
                image_quality_score=record.get("image_quality_score", 0.0),
                original_filename=record.get("original_filename"),
                file_type=record.get("file_type"),
                file_size=record.get("file_size"),
            )
            return repo.to_dict(doc)
        finally:
            db.close()

    def update(self, doc_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            repo = DocumentRepository(db)
            doc = repo.get_by_id(doc_id)
            if not doc:
                return None

            # Handle preprocessing updates
            if "preprocessed" in updates and updates["preprocessed"]:
                prep = updates["preprocessed"]
                repo.update_preprocessing(
                    doc_id=doc_id,
                    quality_score=prep.get("quality_score", 0.85),
                    skew_angle=prep.get("skew_angle", 0.0),
                    processed_file_path=prep.get("output_path", ""),
                )

            # Handle OCR & Extracted fields
            if "extracted_fields" in updates and updates["extracted_fields"]:
                raw_text = updates.get("ocr", {}).get("text", doc.raw_ocr_text or "")
                avg_conf = updates.get("ocr", {}).get("average_confidence", doc.average_ocr_confidence or 85.0)
                lang = updates.get("ocr", {}).get("language", doc.source_language or "eng")
                cert_type = updates.get("certificate_type", doc.certificate_type or "General")

                repo.save_ocr_and_extracted_fields(
                    doc_id=doc_id,
                    raw_text=raw_text,
                    average_confidence=avg_conf,
                    language=lang,
                    certificate_type=cert_type,
                    fields=updates["extracted_fields"],
                )

            # Handle review submission
            if updates.get("status") == "APPROVED":
                repo.approve_document(
                    doc_id=doc_id,
                    reviewer=updates.get("reviewer", "Human Reviewer"),
                    notes=updates.get("approval_notes", "Approved"),
                    edited_fields=updates.get("extracted_fields"),
                )
            elif updates.get("status") == "REJECTED":
                repo.reject_document(
                    doc_id=doc_id,
                    reason=updates.get("rejection_reason", "Rejected during verification"),
                    reviewer=updates.get("reviewer", "Human Reviewer"),
                    notes=updates.get("approval_notes"),
                )

            # Refresh and return
            doc = repo.get_by_id(doc_id)
            return repo.to_dict(doc) if doc else None
        finally:
            db.close()

    def delete(self, doc_id: str) -> bool:
        db = SessionLocal()
        try:
            repo = DocumentRepository(db)
            return repo.delete(doc_id)
        finally:
            db.close()

    def get_dashboard_stats(self) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            repo = DocumentRepository(db)
            return repo.get_dashboard_stats()
        finally:
            db.close()

    def get_processing_logs(self, doc_id: str) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            repo = DocumentRepository(db)
            logs = repo.get_logs_for_document(doc_id)
            return [
                {
                    "id": l.id,
                    "document_id": l.document_id,
                    "processing_stage": l.processing_stage,
                    "status": l.status,
                    "message": l.message,
                    "created_at": l.created_at,
                }
                for l in logs
            ]
        finally:
            db.close()

    def backup_database(self) -> str:
        return create_local_backup()

    def list_backups(self) -> List[Dict[str, Any]]:
        return list_local_backups()

    def reset_with_samples(self, sample_records: List[Dict[str, Any]]):
        """Seeds sample certificates into SQLite database."""
        db = SessionLocal()
        try:
            repo = DocumentRepository(db)
            for r in sample_records:
                doc_id = r.get("id")
                if not doc_id:
                    continue
                # If already in DB, skip or update
                existing = repo.get_by_id(doc_id)
                if not existing:
                    filename = r.get("filename", f"{doc_id}.png")
                    file_path = r.get("file_path") or str(UPLOADS_DIR / filename)
                    doc = repo.create_document(
                        doc_id=doc_id,
                        filename=filename,
                        file_path=file_path,
                        certificate_type=r.get("certificate_type", "General"),
                        source_language=r.get("source_language", "eng"),
                        processing_status=r.get("status", "UPLOADED"),
                        image_quality_score=r.get("preprocessed", {}).get("quality_score", 0.85) if r.get("preprocessed") else 0.85,
                        original_filename=r.get("original_filename", filename),
                        file_type=r.get("file_type", "image/png"),
                        file_size=r.get("file_size", 0),
                    )
                    if r.get("extracted_fields"):
                        repo.save_ocr_and_extracted_fields(
                            doc_id=doc_id,
                            raw_text=r.get("ocr", {}).get("text", ""),
                            average_confidence=r.get("ocr", {}).get("average_confidence", 85.0) if r.get("ocr") else 85.0,
                            language=r.get("source_language", "eng"),
                            certificate_type=r.get("certificate_type", "General"),
                            fields=r.get("extracted_fields", []),
                        )
                    if r.get("status") == "APPROVED":
                        repo.approve_document(doc_id, reviewer=r.get("reviewer", "Registrar Reviewer"), notes=r.get("approval_notes"))
        finally:
            db.close()


storage_service = SQLiteStorageService()
StorageService = SQLiteStorageService

def get_all_documents(status: Optional[str] = None) -> List[Dict[str, Any]]:
    return storage_service.get_all(status)

def get_document(doc_id: str) -> Optional[Dict[str, Any]]:
    return storage_service.get_by_id(doc_id)
