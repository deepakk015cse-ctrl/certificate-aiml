export type DocumentStatus =
  | 'UPLOADED'
  | 'PREPROCESSED'
  | 'OCR_EXTRACTED'
  | 'AWAITING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'LOW_CONFIDENCE';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ExtractedField {
  field: string;
  label: string;
  value: string;
  english_value?: string;
  score: number;
  level: ConfidenceLevel;
  reasons: string[];
  is_required: boolean;
  is_edited?: boolean;
  original_extracted_value: string;
  reviewer_edited_value?: string;
  english_value_edited?: string;
}

export interface AuditEntry {
  field: string;
  original_value: string;
  reviewer_edited_value: string;
  confidence: number;
  confidence_level: ConfidenceLevel | string;
  review_status: DocumentStatus | string;
  review_timestamp: string;
  reviewer: string;
  notes?: string | null;
}

export interface PreprocessingMetadata {
  processed: boolean;
  quality_score: number;
  skew_angle: number;
  original_dimensions: [number, number];
  processed_dimensions: [number, number];
  warnings: string[];
  steps_applied: string[];
  output_path?: string;
  processed_url?: string;
}

export interface OCRRegion {
  text: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, w, h]
}

export interface OCRMetadata {
  text: string;
  average_confidence: number;
  language: string;
  regions: OCRRegion[];
  warnings: string[];
  engine: string;
  char_count: number;
  word_count: number;
  handwriting_limitations_flag?: boolean;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
  status: DocumentStatus;
  original_url: string;
  preprocessed?: PreprocessingMetadata | null;
  ocr?: OCRMetadata | null;
  extracted_fields?: ExtractedField[] | null;
  approval_notes?: string | null;
  rejection_reason?: string | null;
  reviewer?: string | null;
  reviewed_at?: string | null;
  audit_trail?: AuditEntry[] | null;
}

export interface DashboardStats {
  total_documents: number;
  processed: number;
  awaiting_review: number;
  approved: number;
  rejected: number;
  low_confidence: number;
  average_ocr_confidence: number;
}

export interface SystemStatus {
  system_name: string;
  stage: string;
  network_status: {
    offline_enforced: boolean;
    external_ai_apis_blocked: boolean;
    cloud_dependencies: string;
  };
  ocr_engine: {
    name: string;
    active: boolean;
    version: string;
    languages_loaded: string[];
    swappable_architecture: string;
  };
  preprocessing_pipeline: {
    engine: string;
    supported_steps: string[];
  };
  environment: {
    python_version: string;
    os: string;
    total_documents_stored: number;
    storage_root: string;
  };
  supported_languages: Record<string, string>;
}

export type NavigationTab =
  | 'dashboard'
  | 'documents'
  | 'upload'
  | 'preprocessing'
  | 'ocr'
  | 'review'
  | 'records'
  | 'export'
  | 'settings'
  | 'status';
