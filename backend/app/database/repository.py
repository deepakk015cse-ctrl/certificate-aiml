import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from .models import (
    DocumentModel,
    ExtractedFieldModel,
    ReviewModel,
    ProcessingLogModel,
)

class DocumentRepository:
    """
    SQLAlchemy repository for all local SQLite operations.
    Fully thread-safe, air-gapped, offline, and ACID-compliant.
    """

    def __init__(self, db: Session):
        self.db = db

    # -------------------------------------------------------------
    # Helper: Convert ORM Document Model to API-compliant dict
    # -------------------------------------------------------------
    @staticmethod
    def to_dict(doc: DocumentModel) -> Dict[str, Any]:
        """Maps SQLite DocumentModel to the existing frontend DocumentRecord interface."""
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Map extracted fields
        fields_list = []
        for f in doc.extracted_fields:
            fields_list.append({
                "id": f.id,
                "field": f.field_name,
                "field_name": f.field_name,
                "value": f.translated_value or f.original_value,
                "original_value": f.original_value,
                "original_extracted_value": f.original_value,
                "translated_value": f.translated_value,
                "reviewer_edited_value": f.translated_value if f.translated_value != f.original_value else None,
                "score": f.confidence_score,
                "confidence_score": f.confidence_score,
                "level": f.confidence_level,
                "confidence_level": f.confidence_level,
                "reason": f.confidence_reason,
                "confidence_reason": f.confidence_reason,
                "is_edited": bool(f.translated_value and f.translated_value != f.original_value),
            })

        # Map reviews into audit trail
        audit_trail = []
        for r in doc.reviews:
            reviewer_name = doc.reviewer or "Human Reviewer"
            audit_trail.append({
                "field": "DOCUMENT_REVIEW_DECISION",
                "original_value": "AWAITING_REVIEW",
                "reviewer_edited_value": r.review_status,
                "confidence": (doc.average_ocr_confidence or 85.0) / 100.0,
                "confidence_level": "HIGH" if r.review_status == "APPROVED" else "LOW",
                "review_status": r.review_status,
                "review_timestamp": r.reviewed_at,
                "reviewer": reviewer_name,
                "notes": r.rejection_reason or doc.approval_notes or "Review action recorded in SQLite",
            })

        # Preprocessing info block
        preprocessed = None
        if doc.processed_file_path or doc.image_quality_score > 0:
            preprocessed = {
                "processed": True,
                "quality_score": doc.image_quality_score,
                "skew_angle": doc.skew_angle or 0.0,
                "output_path": doc.processed_file_path,
                "processed_url": f"/api/files/preprocessed/{doc.filename}" if doc.processed_file_path else None,
                "warnings": [] if doc.image_quality_score >= 0.75 else ["Lower contrast detected; normalized by CLAHE"],
                "steps_applied": [
                    "Hough Line Transform Skew Detection & Auto-Rotation",
                    "Adaptive CLAHE Equalization",
                    "Bilateral Edge-Preserving Denoising",
                ],
            }

        # OCR info block
        ocr_block = None
        if doc.raw_ocr_text or doc.average_ocr_confidence > 0:
            ocr_block = {
                "text": doc.raw_ocr_text or "",
                "average_confidence": doc.average_ocr_confidence or 0.0,
                "language": doc.source_language or "eng",
                "engine": "Tesseract OCR 5.3 (Local Edge)",
                "char_count": len(doc.raw_ocr_text or ""),
                "word_count": len((doc.raw_ocr_text or "").split()),
                "warnings": ["Low confidence OCR (<65%)"] if (doc.average_ocr_confidence or 0.0) < 65.0 else [],
                "regions": [],
            }

        # Status compatibility: Map internal DB statuses to frontend status types
        frontend_status = doc.processing_status
        if frontend_status == "REVIEW_REQUIRED":
            frontend_status = "AWAITING_REVIEW"

        return {
            "id": doc.id,
            "filename": doc.filename,
            "original_filename": doc.original_filename or doc.filename,
            "file_path": doc.file_path,
            "file_type": doc.file_type or "image/png",
            "file_size": doc.file_size or 0,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
            "certificate_type": doc.certificate_type or "General",
            "source_language": doc.source_language or "eng",
            "status": frontend_status,
            "processing_status": doc.processing_status,
            "image_quality_score": doc.image_quality_score,
            "original_url": f"/api/files/uploads/{doc.filename}",
            "preprocessed": preprocessed,
            "ocr": ocr_block,
            "extracted_fields": fields_list,
            "approval_notes": doc.approval_notes,
            "rejection_reason": doc.rejection_reason,
            "reviewer": doc.reviewer,
            "reviewed_at": doc.reviewed_at,
            "audit_trail": audit_trail,
        }

    # -------------------------------------------------------------
    # 1. Document Creation & Retrieval
    # -------------------------------------------------------------
    def create_document(
        self,
        doc_id: str,
        filename: str,
        file_path: str,
        certificate_type: str = "General",
        source_language: str = "eng",
        processing_status: str = "UPLOADED",
        image_quality_score: float = 0.0,
        original_filename: Optional[str] = None,
        file_type: Optional[str] = "image/png",
        file_size: Optional[int] = 0,
    ) -> DocumentModel:
        """Inserts a new document record and logs the UPLOAD stage."""
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        doc = DocumentModel(
            id=doc_id,
            filename=filename,
            file_path=file_path,
            certificate_type=certificate_type,
            source_language=source_language,
            processing_status=processing_status,
            image_quality_score=image_quality_score,
            created_at=now_str,
            updated_at=now_str,
            original_filename=original_filename or filename,
            file_type=file_type,
            file_size=file_size,
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)

        # Log UPLOAD stage
        self.log_stage(
            document_id=doc_id,
            stage="UPLOAD",
            status="SUCCESS",
            message=f"Document uploaded and indexed into SQLite: {filename}",
        )

        return doc

    def get_by_id(self, doc_id: str) -> Optional[DocumentModel]:
        """Retrieves a document by primary key."""
        return self.db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()

    def get_all(self, status: Optional[str] = None) -> List[DocumentModel]:
        """Retrieves documents with optional status filtering."""
        query = self.db.query(DocumentModel).order_by(DocumentModel.created_at.desc())
        if status and isinstance(status, str) and status != "ALL":
            # Support both AWAITING_REVIEW and REVIEW_REQUIRED
            if status == "AWAITING_REVIEW":
                query = query.filter(DocumentModel.processing_status.in_(["AWAITING_REVIEW", "REVIEW_REQUIRED"]))
            else:
                query = query.filter(DocumentModel.processing_status == status)
        return query.all()

    def delete(self, doc_id: str) -> bool:
        """Deletes a document and its cascading relationships."""
        doc = self.get_by_id(doc_id)
        if not doc:
            return False
        self.db.delete(doc)
        self.db.commit()
        return True

    # -------------------------------------------------------------
    # 2. Stage Logging
    # -------------------------------------------------------------
    def log_stage(
        self,
        document_id: str,
        stage: str,
        status: str,
        message: Optional[str] = None,
    ) -> ProcessingLogModel:
        """
        Records a major pipeline processing stage in processing_logs.
        Stages: UPLOAD, PREPROCESSING, OCR, CLASSIFICATION, EXTRACTION, TRANSLATION, CONFIDENCE, REVIEW, EXPORT
        """
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log = ProcessingLogModel(
            document_id=document_id,
            processing_stage=stage.upper(),
            status=status.upper(),
            message=message,
            created_at=now_str,
        )
        self.db.add(log)
        self.db.commit()
        return log

    def get_logs_for_document(self, document_id: str) -> List[ProcessingLogModel]:
        """Returns ordered processing logs for a certificate."""
        return (
            self.db.query(ProcessingLogModel)
            .filter(ProcessingLogModel.document_id == document_id)
            .order_by(ProcessingLogModel.id.asc())
            .all()
        )

    # -------------------------------------------------------------
    # 3. Preprocessing Update
    # -------------------------------------------------------------
    def update_preprocessing(
        self,
        doc_id: str,
        quality_score: float,
        skew_angle: float,
        processed_file_path: str,
    ) -> Optional[DocumentModel]:
        """Updates quality score, skew correction, and marks PREPROCESSING complete."""
        doc = self.get_by_id(doc_id)
        if not doc:
            return None

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        doc.image_quality_score = quality_score
        doc.skew_angle = skew_angle
        doc.processed_file_path = processed_file_path
        doc.updated_at = now_str
        if doc.processing_status == "UPLOADED":
            doc.processing_status = "PROCESSED"

        self.db.commit()
        self.db.refresh(doc)

        self.log_stage(
            document_id=doc_id,
            stage="PREPROCESSING",
            status="SUCCESS",
            message=f"Vision enhancement completed: quality {quality_score:.2f}, skew {skew_angle:.1f}°",
        )
        return doc

    # -------------------------------------------------------------
    # 4. OCR, Extraction & Confidence Storage
    # -------------------------------------------------------------
    def save_ocr_and_extracted_fields(
        self,
        doc_id: str,
        raw_text: str,
        average_confidence: float,
        language: str,
        certificate_type: str,
        fields: List[Dict[str, Any]],
    ) -> Optional[DocumentModel]:
        """
        Stores raw OCR text, document classification, and structured extracted fields.
        Strictly preserves original extracted text separate from translated/reviewed edits.
        """
        doc = self.get_by_id(doc_id)
        if not doc:
            return None

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        doc.raw_ocr_text = raw_text
        doc.average_ocr_confidence = average_confidence
        doc.source_language = language
        doc.certificate_type = certificate_type
        doc.updated_at = now_str

        # Remove existing fields if re-running OCR extraction
        self.db.query(ExtractedFieldModel).filter(ExtractedFieldModel.document_id == doc_id).delete()

        # Insert extracted fields with confidence values
        has_low_conf = False
        for f in fields:
            score = float(f.get("score") or f.get("confidence_score") or 0.0)
            level = str(f.get("level") or f.get("confidence_level") or "MEDIUM")
            if level == "LOW" or score < 65.0:
                has_low_conf = True

            orig_val = str(f.get("original_value") or f.get("original_extracted_value") or f.get("value") or "")
            trans_val = f.get("translated_value") or orig_val

            field_model = ExtractedFieldModel(
                id=str(f.get("id") or uuid.uuid4())[:12],
                document_id=doc_id,
                field_name=str(f.get("field") or f.get("field_name") or "Field"),
                original_value=orig_val,
                translated_value=trans_val,
                confidence_score=score,
                confidence_level=level,
                confidence_reason=f.get("reason") or f.get("confidence_reason"),
                created_at=now_str,
                updated_at=now_str,
            )
            self.db.add(field_model)

        # Set status based on confidence
        if average_confidence < 65.0 or has_low_conf:
            doc.processing_status = "REVIEW_REQUIRED"
        else:
            doc.processing_status = "AWAITING_REVIEW"

        self.db.commit()
        self.db.refresh(doc)

        # Stage logs
        self.log_stage(doc_id, "OCR", "SUCCESS", f"Tesseract extraction complete (avg conf: {average_confidence:.1f}%)")
        self.log_stage(doc_id, "CLASSIFICATION", "SUCCESS", f"Categorized as: {certificate_type} Certificate")
        self.log_stage(doc_id, "EXTRACTION", "SUCCESS", f"Extracted {len(fields)} structured key-value entities")
        self.log_stage(doc_id, "TRANSLATION", "SUCCESS", f"Transliterated values for language: {language}")
        self.log_stage(
            doc_id,
            "CONFIDENCE",
            "SUCCESS",
            f"Confidence calculated (Overall: {average_confidence:.1f}%, Status: {doc.processing_status})",
        )

        return doc

    # -------------------------------------------------------------
    # 5. Field Updates & Human Review Edits (Preserving Originals)
    # -------------------------------------------------------------
    def update_field_value(
        self,
        document_id: str,
        field_name: str,
        new_value: str,
        reviewer_name: str = "Human Reviewer",
    ) -> Optional[ExtractedFieldModel]:
        """
        Updates a field while strictly preserving the original extracted value.
        Original extracted value remains in original_value; new_value is placed in translated_value.
        """
        field = (
            self.db.query(ExtractedFieldModel)
            .filter(
                ExtractedFieldModel.document_id == document_id,
                ExtractedFieldModel.field_name == field_name,
            )
            .first()
        )
        if not field:
            return None

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        # Keep field.original_value untouched!
        field.translated_value = new_value
        field.updated_at = now_str

        # Record reviewer changes in reviews table
        review = ReviewModel(
            id=str(uuid.uuid4())[:12],
            document_id=document_id,
            review_status="PENDING",
            reviewer_changes=f"Field '{field_name}' edited from '{field.original_value}' to '{new_value}' by {reviewer_name}",
            reviewed_at=now_str,
        )
        self.db.add(review)
        self.db.commit()
        self.db.refresh(field)

        return field

    # -------------------------------------------------------------
    # 6. Human Review Approvals & Rejections
    # -------------------------------------------------------------
    def approve_document(
        self,
        doc_id: str,
        reviewer: str = "Human Reviewer",
        notes: Optional[str] = "Approved by registrar verification",
        edited_fields: Optional[List[Dict[str, Any]]] = None,
    ) -> Optional[DocumentModel]:
        """Approves a document, applies any final field adjustments, and logs the decision."""
        doc = self.get_by_id(doc_id)
        if not doc:
            return None

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Process any edited fields submitted with review
        if edited_fields:
            for ef in edited_fields:
                fname = ef.get("field") or ef.get("field_name")
                fval = ef.get("reviewer_edited_value") or ef.get("value")
                if fname and fval:
                    existing = (
                        self.db.query(ExtractedFieldModel)
                        .filter(
                            ExtractedFieldModel.document_id == doc_id,
                            ExtractedFieldModel.field_name == fname,
                        )
                        .first()
                    )
                    if existing:
                        existing.translated_value = fval
                        existing.updated_at = now_str

        doc.processing_status = "APPROVED"
        doc.approval_notes = notes
        doc.reviewer = reviewer
        doc.reviewed_at = now_str
        doc.updated_at = now_str

        review = ReviewModel(
            id=str(uuid.uuid4())[:12],
            document_id=doc_id,
            review_status="APPROVED",
            reviewer_changes=notes or "All fields verified and approved",
            rejection_reason=None,
            reviewed_at=now_str,
        )
        self.db.add(review)
        self.db.commit()
        self.db.refresh(doc)

        self.log_stage(doc_id, "REVIEW", "SUCCESS", f"Document approved by {reviewer}. Notes: {notes}")
        return doc

    def reject_document(
        self,
        doc_id: str,
        reason: str,
        reviewer: str = "Human Reviewer",
        notes: Optional[str] = None,
    ) -> Optional[DocumentModel]:
        """Rejects a document with an explicit rejection reason."""
        doc = self.get_by_id(doc_id)
        if not doc:
            return None

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        doc.processing_status = "REJECTED"
        doc.rejection_reason = reason
        doc.approval_notes = notes
        doc.reviewer = reviewer
        doc.reviewed_at = now_str
        doc.updated_at = now_str

        review = ReviewModel(
            id=str(uuid.uuid4())[:12],
            document_id=doc_id,
            review_status="REJECTED",
            reviewer_changes=f"Rejected: {reason}",
            rejection_reason=reason,
            reviewed_at=now_str,
        )
        self.db.add(review)
        self.db.commit()
        self.db.refresh(doc)

        self.log_stage(doc_id, "REVIEW", "FAILED", f"Document rejected by {reviewer}. Reason: {reason}")
        return doc

    # -------------------------------------------------------------
    # 7. Dashboard Statistics
    # -------------------------------------------------------------
    def get_dashboard_stats(self) -> Dict[str, Any]:
        """Computes live aggregated dashboard counts from the SQLite database."""
        total = self.db.query(func.count(DocumentModel.id)).scalar() or 0
        
        # Processed = not just UPLOADED
        processed = (
            self.db.query(func.count(DocumentModel.id))
            .filter(DocumentModel.processing_status != "UPLOADED")
            .scalar() or 0
        )
        
        # Awaiting review / review required
        awaiting = (
            self.db.query(func.count(DocumentModel.id))
            .filter(DocumentModel.processing_status.in_(["AWAITING_REVIEW", "REVIEW_REQUIRED"]))
            .scalar() or 0
        )
        
        # Approved
        approved = (
            self.db.query(func.count(DocumentModel.id))
            .filter(DocumentModel.processing_status == "APPROVED")
            .scalar() or 0
        )
        
        # Rejected
        rejected = (
            self.db.query(func.count(DocumentModel.id))
            .filter(DocumentModel.processing_status == "REJECTED")
            .scalar() or 0
        )
        
        # Low confidence
        low_confidence = (
            self.db.query(func.count(DocumentModel.id))
            .filter(
                (DocumentModel.processing_status == "LOW_CONFIDENCE") |
                (DocumentModel.processing_status == "REVIEW_REQUIRED") |
                (DocumentModel.average_ocr_confidence < 65.0)
            )
            .scalar() or 0
        )

        # Average OCR confidence
        avg_ocr = (
            self.db.query(func.avg(DocumentModel.average_ocr_confidence))
            .filter(DocumentModel.average_ocr_confidence > 0)
            .scalar()
        )
        avg_ocr_score = round(float(avg_ocr), 1) if avg_ocr is not None else 0.0

        return {
            "total_documents": total,
            "processed": processed,
            "awaiting_review": awaiting,
            "approved": approved,
            "rejected": rejected,
            "low_confidence": low_confidence,
            "average_ocr_confidence": avg_ocr_score,
        }
