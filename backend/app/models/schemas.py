from pydantic import BaseModel, Field
from typing import List, Optional, Tuple, Dict, Any

class OCRRegionSchema(BaseModel):
    text: str
    confidence: float
    bbox: Tuple[int, int, int, int]  # [x, y, w, h]

class OCRMetadataSchema(BaseModel):
    text: str
    average_confidence: float
    language: str
    engine: str = "Tesseract OCR (Local Edge)"
    char_count: int
    word_count: int
    regions: List[OCRRegionSchema] = []
    warnings: List[str] = []

class PreprocessingMetadataSchema(BaseModel):
    processed: bool = True
    quality_score: float = 0.85
    skew_angle: float = 0.0
    original_dimensions: Optional[Tuple[int, int]] = (1200, 1600)
    processed_dimensions: Optional[Tuple[int, int]] = (1200, 1600)
    warnings: List[str] = []
    steps_applied: List[str] = []
    output_path: Optional[str] = None
    processed_url: Optional[str] = None

class ExtractedFieldSchema(BaseModel):
    field: str
    label: str = ""
    value: str
    english_value: Optional[str] = None
    score: float = 0.0
    level: str = "MEDIUM"  # "HIGH", "MEDIUM", "LOW"
    reasons: List[str] = []
    is_required: bool = True
    is_edited: bool = False
    original_extracted_value: str = ""
    reviewer_edited_value: Optional[str] = None
    english_value_edited: Optional[str] = None

class AuditEntrySchema(BaseModel):
    field: str
    original_value: str
    reviewer_edited_value: str
    confidence: float
    confidence_level: str
    review_status: str
    review_timestamp: str
    reviewer: str
    notes: Optional[str] = None

class DocumentRecordSchema(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    created_at: str
    status: str
    original_url: str
    preprocessed: Optional[PreprocessingMetadataSchema] = None
    ocr: Optional[OCRMetadataSchema] = None
    extracted_fields: Optional[List[ExtractedFieldSchema]] = None
    approval_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    reviewer: Optional[str] = None
    reviewed_at: Optional[str] = None
    audit_trail: Optional[List[AuditEntrySchema]] = None

class ReviewSubmissionSchema(BaseModel):
    status: str
    notes: Optional[str] = ""
    rejection_reason: Optional[str] = None
    reviewer: Optional[str] = "Human Reviewer"
    edited_fields: Optional[List[ExtractedFieldSchema]] = None

class DashboardStatsSchema(BaseModel):
    total_documents: int
    processed: int
    awaiting_review: int
    approved: int
    rejected: int
    low_confidence: int
    average_ocr_confidence: float
