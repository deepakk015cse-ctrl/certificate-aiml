import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from .connection import Base

class DocumentModel(Base):
    """
    Documents Table: Stores certificate metadata, source paths, and processing states.
    All file data is stored locally on disk; SQLite stores paths and normalized attributes.
    """
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    certificate_type = Column(String(64), nullable=True, default="General")
    source_language = Column(String(16), nullable=False, default="eng")
    processing_status = Column(
        String(32),
        nullable=False,
        default="UPLOADED",
        index=True,
    )  # UPLOADED, PROCESSING, PROCESSED, REVIEW_REQUIRED, APPROVED, REJECTED, FAILED
    image_quality_score = Column(Float, nullable=False, default=0.0)
    created_at = Column(String(32), nullable=False, default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    updated_at = Column(String(32), nullable=False, default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    # Backward-compatible metadata attributes for seamless UI rendering
    original_filename = Column(String(255), nullable=True)
    file_type = Column(String(64), nullable=True, default="image/png")
    file_size = Column(Integer, nullable=True, default=0)
    processed_file_path = Column(String(512), nullable=True)
    skew_angle = Column(Float, nullable=True, default=0.0)
    raw_ocr_text = Column(Text, nullable=True)
    average_ocr_confidence = Column(Float, nullable=True, default=0.0)
    approval_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    reviewer = Column(String(128), nullable=True)
    reviewed_at = Column(String(32), nullable=True)

    # Relationships with cascading deletion
    extracted_fields = relationship(
        "ExtractedFieldModel",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="ExtractedFieldModel.id",
    )
    reviews = relationship(
        "ReviewModel",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="ReviewModel.reviewed_at.desc()",
    )
    processing_logs = relationship(
        "ProcessingLogModel",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="ProcessingLogModel.id.asc()",
    )


class ExtractedFieldModel(Base):
    """
    Extracted Fields Table: Holds each localized/extracted field from a certificate.
    Maintains strict separation between original extracted values and reviewer corrections.
    """
    __tablename__ = "extracted_fields"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4())[:12])
    document_id = Column(String(64), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name = Column(String(128), nullable=False)
    original_value = Column(Text, nullable=False)
    translated_value = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=False, default=0.0)
    confidence_level = Column(String(16), nullable=False, default="MEDIUM")  # HIGH, MEDIUM, LOW
    confidence_reason = Column(Text, nullable=True)
    created_at = Column(String(32), nullable=False, default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    updated_at = Column(String(32), nullable=False, default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    # Relationship back to document
    document = relationship("DocumentModel", back_populates="extracted_fields")


class ReviewModel(Base):
    """
    Reviews Table: Records human verification reviews, reviewer edits, and decisions.
    """
    __tablename__ = "reviews"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4())[:12])
    document_id = Column(String(64), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    review_status = Column(String(32), nullable=False, default="PENDING")  # PENDING, APPROVED, REJECTED
    reviewer_changes = Column(Text, nullable=True)  # JSON or serialized changes
    rejection_reason = Column(Text, nullable=True)
    reviewed_at = Column(String(32), nullable=False, default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    # Relationship back to document
    document = relationship("DocumentModel", back_populates="reviews")


class ProcessingLogModel(Base):
    """
    Processing Logs Table: Audits each major processing stage.
    Stages: UPLOAD, PREPROCESSING, OCR, CLASSIFICATION, EXTRACTION, TRANSLATION, CONFIDENCE, REVIEW, EXPORT
    """
    __tablename__ = "processing_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String(64), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    processing_stage = Column(String(32), nullable=False)
    status = Column(String(32), nullable=False)  # SUCCESS, PENDING, FAILED, PROCESSING
    message = Column(Text, nullable=True)
    created_at = Column(String(32), nullable=False, default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    # Relationship back to document
    document = relationship("DocumentModel", back_populates="processing_logs")
