from .schemas import (
    OCRRegionSchema,
    OCRMetadataSchema,
    PreprocessingMetadataSchema,
    ExtractedFieldSchema,
    AuditEntrySchema,
    DocumentRecordSchema,
    ReviewSubmissionSchema,
    DashboardStatsSchema,
)

# Backwards compatibility aliases
OCRRegion = OCRRegionSchema
OCRMetadata = OCRMetadataSchema
PreprocessingMetadata = PreprocessingMetadataSchema
ExtractedField = ExtractedFieldSchema
AuditEntry = AuditEntrySchema
DocumentRecord = DocumentRecordSchema
ReviewRequest = ReviewSubmissionSchema
DashboardStats = DashboardStatsSchema
DocumentStatus = str
