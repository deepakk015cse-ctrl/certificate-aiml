import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Wand2,
  ScanText,
  ArrowRight,
  RefreshCw,
  Layers,
  Eye,
  FileUp,
} from 'lucide-react';
import { DocumentRecord, NavigationTab } from '../types';
import { uploadDocument, deleteDocument, triggerPreprocessing, triggerOCR } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Button, Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, EmptyState } from '../components/ui';

interface DocumentsPageProps {
  documents: DocumentRecord[];
  activeDoc: DocumentRecord | null;
  onSelectDoc: (doc: DocumentRecord) => void;
  onUploadSuccess: (doc: DocumentRecord) => void;
  onUpdateDocument: (updated: DocumentRecord) => void;
  onNavigate: (tab: NavigationTab) => void;
  onRefresh: () => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  documents,
  activeDoc,
  onSelectDoc,
  onUploadSuccess,
  onUpdateDocument,
  onNavigate,
  onRefresh,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<'files' | 'preprocess' | 'ocr'>('files');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedFormats = ['.jpg', '.jpeg', '.png', '.pdf', '.zip'];

  const handleFile = async (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFormats.includes(ext)) {
      setUploadError(`Format '${ext}' is not supported. Please select JPG, JPEG, PNG, PDF, or ZIP.`);
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const doc = await uploadDocument(file);
      onUploadSuccess(doc);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload certificate.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (doc: DocumentRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Remove certificate record '${doc.original_filename}'?`)) {
      await deleteDocument(doc.id);
      onRefresh();
    }
  };

  const handleRunPreprocessing = async () => {
    if (!activeDoc) return;
    setIsProcessing(true);
    try {
      const updated = await triggerPreprocessing(activeDoc.id);
      onUpdateDocument(updated);
    } catch (err: any) {
      alert(err.message || 'Preprocessing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunOCR = async (lang: string = 'eng') => {
    if (!activeDoc) return;
    setIsProcessing(true);
    try {
      const updated = await triggerOCR(activeDoc.id, lang);
      onUpdateDocument(updated);
    } catch (err: any) {
      alert(err.message || 'OCR extraction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine stage states for active document
  const workflowStages = [
    { id: 'upload', label: 'Upload', isComplete: Boolean(activeDoc) },
    { id: 'preprocess', label: 'Preprocess', isComplete: Boolean(activeDoc?.preprocessed) },
    { id: 'ocr', label: 'OCR', isComplete: Boolean(activeDoc?.ocr) },
    { id: 'extract', label: 'Extract', isComplete: Boolean(activeDoc?.extracted_fields && activeDoc.extracted_fields.length > 0) },
    { id: 'translate', label: 'Translate', isComplete: Boolean(activeDoc?.extracted_fields?.some(f => Boolean(f.english_value))) },
    { id: 'confidence', label: 'Confidence', isComplete: Boolean(activeDoc?.extracted_fields?.some(f => Boolean(f.level))) },
    { id: 'review', label: 'Review', isComplete: activeDoc?.status === 'APPROVED' || activeDoc?.status === 'REJECTED' },
  ];

  return (
    <div id="documents-page-container" className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Workflow Progress Indicator */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Processing Pipeline Workflow
            </span>
            {activeDoc && (
              <span className="text-[11px] text-slate-500 font-mono">
                Active Scan: <strong className="text-slate-900">{activeDoc.original_filename}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between overflow-x-auto py-2 gap-2">
            {workflowStages.map((stage, idx) => (
              <React.Fragment key={stage.id}>
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                      stage.isComplete
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : activeDoc && idx === workflowStages.findIndex(s => !s.isComplete)
                        ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {stage.isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      stage.isComplete
                        ? 'text-slate-900 font-semibold'
                        : 'text-slate-500'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
                {idx < workflowStages.length - 1 && (
                  <div className="flex-1 min-w-4 max-w-10 h-0.5 bg-slate-200 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Large Clean Upload Section */}
      <div
        id="document-upload-dropzone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-slate-800 bg-slate-50 scale-[1.005]'
            : 'border-slate-300 hover:border-slate-400 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,.zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Upload Certificates
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Drag and drop files here or browse
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-mono">
            Supported: JPG, JPEG, PNG, PDF, ZIP
          </div>

          {isUploading && (
            <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-slate-800">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Ingesting and storing certificate file locally...</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs for Detailed Processing Inspection */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubView('files')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubView === 'files'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Selected Files ({documents.length})
          </button>
          {activeDoc && (
            <>
              <button
                onClick={() => setActiveSubView('preprocess')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeSubView === 'preprocess'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Vision Preprocessing
              </button>
              <button
                onClick={() => setActiveSubView('ocr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeSubView === 'ocr'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Offline OCR Inspection
              </button>
            </>
          )}
        </div>

        {activeDoc && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('review')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Open in Review Queue
          </Button>
        )}
      </div>

      {/* 4. Sub-View: Selected Files Table */}
      {activeSubView === 'files' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Selected Documents List</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any document to inspect vision enhancements or proceed to human review.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No certificate files uploaded yet"
                description="Use the upload area above to select individual certificates or test ZIP archives."
              />
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Filename</TableHead>
                    <TableHead>File Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Processing Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => {
                    const isSelected = activeDoc?.id === doc.id;
                    const sizeFormatted =
                      doc.file_size > 1024 * 1024
                        ? `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.round(doc.file_size / 1024)} KB`;

                    return (
                      <TableRow
                        key={doc.id}
                        isSelected={isSelected}
                        onClick={() => onSelectDoc(doc)}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                            <div>
                              <div className="font-semibold text-slate-900 truncate max-w-xs" title={doc.original_filename}>
                                {doc.original_filename}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: {doc.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs uppercase text-slate-600">
                            {doc.file_type || doc.original_filename.split('.').pop()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-slate-600">{sizeFormatted}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={doc.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                onSelectDoc(doc);
                                onNavigate('review');
                              }}
                            >
                              Review
                            </Button>
                            <button
                              onClick={(e) => handleDelete(doc, e)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Remove file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. Sub-View: Vision Preprocessing */}
      {activeSubView === 'preprocess' && activeDoc && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Computer Vision Preprocessing</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Local OpenCV algorithms: Hough transform deskew, CLAHE contrast, illumination correction.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleRunPreprocessing}
              isLoading={isProcessing}
              leftIcon={<Wand2 className="w-3.5 h-3.5" />}
            >
              Run Preprocessing
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Original Scan</span>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 h-72 flex items-center justify-center">
                  <img
                    src={activeDoc.original_url}
                    alt="Original scan"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Preprocessed (Cleaned & Deskewed)</span>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 h-72 flex items-center justify-center">
                  {activeDoc.preprocessed?.processed_url ? (
                    <img
                      src={activeDoc.preprocessed.processed_url}
                      alt="Preprocessed output"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 text-center p-4">
                      Click "Run Preprocessing" to deskew and normalize this certificate.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {activeDoc.preprocessed && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Quality Score</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {(activeDoc.preprocessed.quality_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Detected Skew Angle</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {activeDoc.preprocessed.skew_angle.toFixed(2)}°
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                  <span className="text-slate-500 block text-[11px]">Steps Applied</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {activeDoc.preprocessed.steps_applied?.join(', ') || 'CLAHE, Deskew, Denoise'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. Sub-View: Offline OCR Inspection */}
      {activeSubView === 'ocr' && activeDoc && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Offline Tesseract OCR Extraction</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Local multi-language text extraction with word bounding boxes and character confidence scores.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => handleRunOCR(activeDoc.ocr?.language || 'eng')}
              isLoading={isProcessing}
              leftIcon={<ScanText className="w-3.5 h-3.5" />}
            >
              Re-run Local OCR
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeDoc.ocr ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Average Confidence</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {activeDoc.ocr.average_confidence.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Detected Language</span>
                    <span className="font-bold text-slate-900 font-mono uppercase">
                      {activeDoc.ocr.language}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Word Count</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {activeDoc.ocr.word_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Engine</span>
                    <span className="font-bold text-slate-900 font-mono truncate block">
                      {activeDoc.ocr.engine || 'Local Tesseract 5'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700">Extracted Raw Text</span>
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {activeDoc.ocr.text}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={ScanText}
                title="OCR has not been run on this certificate yet"
                description="Execute local Tesseract extraction to extract certificate text and word confidence ratings."
                action={
                  <Button size="sm" onClick={() => handleRunOCR('eng')}>
                    Run Local OCR Extraction
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
