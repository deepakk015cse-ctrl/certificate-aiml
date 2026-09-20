import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Save,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  FileText,
  Filter,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  DocumentRecord,
  DocumentStatus,
  NavigationTab,
  ExtractedField,
  AuditEntry,
  ConfidenceLevel,
} from '../types';
import { submitReview, saveDocumentFields } from '../services/api';
import { generateFieldsForDocument } from '../utils/confidenceEngine';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Input,
  Select,
  Modal,
  EmptyState,
} from '../components/ui';

interface ReviewPageProps {
  document: DocumentRecord | null;
  documents?: DocumentRecord[];
  onSelectDoc?: (doc: DocumentRecord) => void;
  onUpdateDocument: (updated: DocumentRecord) => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({
  document,
  documents = [],
  onSelectDoc,
  onUpdateDocument,
  onNavigate,
}) => {
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [reviewerName, setReviewerName] = useState('Registrar Officer (Station 01)');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter state
  const [showOnlyLowConfidence, setShowOnlyLowConfidence] = useState(false);

  // Image viewer state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [viewLayer, setViewLayer] = useState<'preprocessed' | 'original'>('preprocessed');

  // Load document fields
  useEffect(() => {
    if (document) {
      if (document.extracted_fields && document.extracted_fields.length > 0) {
        setFields(JSON.parse(JSON.stringify(document.extracted_fields)));
      } else if (document.ocr) {
        const generated = generateFieldsForDocument(
          document.filename,
          document.ocr.language,
          document.ocr.average_confidence,
          document.preprocessed?.quality_score ?? 0.9,
          document.preprocessed?.skew_angle ?? 0.0
        );
        setFields(generated);
      } else {
        setFields([]);
      }
      setNotes(document.approval_notes || '');
      setRejectionReason(document.rejection_reason || '');
      setFeedback(null);
    }
  }, [document?.id, document?.extracted_fields, document?.ocr]);

  // Queue of documents awaiting review or low confidence
  const reviewQueue = useMemo(() => {
    return documents.filter(
      (d) =>
        d.status === 'AWAITING_REVIEW' ||
        d.status === 'LOW_CONFIDENCE' ||
        d.status === 'OCR_EXTRACTED' ||
        d.status === 'PREPROCESSED'
    );
  }, [documents]);

  if (!document) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <EmptyState
          icon={FileText}
          title="No certificate selected for human review"
          description="Select a certificate from the documents ledger or review queue to begin human-in-the-loop verification."
          action={
            <Button size="sm" onClick={() => onNavigate('documents')}>
              Go to Documents
            </Button>
          }
        />
      </div>
    );
  }

  // Handle field edits
  const handleFieldValueChange = (index: number, newValue: string) => {
    const updated = [...fields];
    updated[index].value = newValue;
    updated[index].reviewer_edited_value = newValue;
    updated[index].is_edited = true;
    setFields(updated);
  };

  const handleFieldEnglishChange = (index: number, newEnglish: string) => {
    const updated = [...fields];
    updated[index].english_value = newEnglish;
    updated[index].english_value_edited = newEnglish;
    updated[index].is_edited = true;
    setFields(updated);
  };

  // Save changes
  const handleSaveChanges = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const updated = await saveDocumentFields(document.id, fields);
      onUpdateDocument(updated);
      setFeedback({ type: 'success', message: 'Field changes saved locally.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save changes.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve Document
  const handleApprove = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const updated = await submitReview(
        document.id,
        'APPROVED',
        reviewerName,
        notes || 'Verified authentic by registrar officer',
        undefined,
        fields
      );
      onUpdateDocument(updated);
      setFeedback({ type: 'success', message: `Certificate #${document.id} approved successfully.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Approval failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reject Document
  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please enter a reason for rejecting this certificate.');
      return;
    }
    setIsSubmitting(true);
    setShowRejectDialog(false);
    setFeedback(null);
    try {
      const updated = await submitReview(
        document.id,
        'REJECTED',
        reviewerName,
        notes,
        rejectionReason,
        fields
      );
      onUpdateDocument(updated);
      setFeedback({ type: 'success', message: `Certificate #${document.id} rejected.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Rejection failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter fields if requested
  const displayedFields = showOnlyLowConfidence
    ? fields.filter((f) => f.level === 'LOW')
    : fields;

  const lowConfidenceCount = fields.filter((f) => f.level === 'LOW').length;

  return (
    <div id="review-screen-container" className="space-y-4 max-w-7xl mx-auto">
      {/* Top Review Context Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          {reviewQueue.length > 0 && onSelectDoc && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Queue:</span>
              <select
                value={document.id}
                onChange={(e) => {
                  const target = documents.find((d) => d.id === e.target.value);
                  if (target) onSelectDoc(target);
                }}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-slate-400"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_filename} ({d.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="border-l border-slate-200 pl-3">
            <span className="text-xs text-slate-500 font-mono">
              Status:{' '}
              <strong className="text-slate-900 font-semibold uppercase">{document.status}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lowConfidenceCount > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
              <input
                type="checkbox"
                checked={showOnlyLowConfidence}
                onChange={(e) => setShowOnlyLowConfidence(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
              />
              <span>Highlight Low Confidence ({lowConfidenceCount})</span>
            </label>
          )}

          <div className="text-xs text-slate-500 font-mono">
            Fields: <strong className="text-slate-900">{fields.length}</strong>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* TWO-COLUMN LAYOUT: LEFT = Certificate Preview | RIGHT = Extracted Information */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Certificate Image/Document Preview */}
        <div className="lg:col-span-6 space-y-3">
          <Card className="sticky top-4">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <CardTitle className="text-xs font-bold truncate max-w-xs" title={document.original_filename}>
                  {document.original_filename}
                </CardTitle>
              </div>

              {/* Viewer Controls */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                  <button
                    onClick={() => setViewLayer('preprocessed')}
                    disabled={!document.preprocessed?.processed_url}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      viewLayer === 'preprocessed' && document.preprocessed?.processed_url
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800 disabled:opacity-40'
                    }`}
                  >
                    Cleaned
                  </button>
                  <button
                    onClick={() => setViewLayer('original')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      viewLayer === 'original' || !document.preprocessed?.processed_url
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Original
                  </button>
                </div>

                <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono text-slate-500 min-w-8 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1.0)}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    title="Reset zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>

            {/* Document Image Surface */}
            <div className="relative bg-slate-100/80 min-h-[500px] max-h-[700px] overflow-auto flex items-center justify-center p-4 border-b border-slate-100 select-none">
              <div
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                className="transition-transform duration-150 ease-out shadow-sm rounded border border-slate-300 bg-white"
              >
                <img
                  src={
                    viewLayer === 'preprocessed' && document.preprocessed?.processed_url
                      ? document.preprocessed.processed_url
                      : document.original_url
                  }
                  alt={document.original_filename}
                  className="max-w-full max-h-[650px] object-contain block"
                />
              </div>
            </div>

            {/* Document Details Footer */}
            <div className="p-3 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between font-mono">
              <span>OCR Conf: {document.ocr?.average_confidence?.toFixed(1) ?? 'N/A'}%</span>
              <span>Lang: {document.ocr?.language?.toUpperCase() ?? 'ENG'}</span>
              <span>Quality: {document.preprocessed ? `${(document.preprocessed.quality_score * 100).toFixed(0)}%` : 'Raw'}</span>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Extracted Information */}
        <div className="lg:col-span-6 space-y-4">
          <Card>
            <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle>Extracted Certificate Fields</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect and edit extracted metadata. Low-confidence fields are flagged.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {displayedFields.length} fields displayed
              </span>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5 max-h-[540px] overflow-y-auto">
              {displayedFields.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  {showOnlyLowConfidence
                    ? 'No low-confidence fields detected for this certificate.'
                    : 'No fields have been extracted yet. Run OCR extraction in the Documents tab.'}
                </div>
              ) : (
                displayedFields.map((f, idx) => {
                  const isLow = f.level === 'LOW';
                  const isMedium = f.level === 'MEDIUM';

                  return (
                    <div
                      key={f.field || idx}
                      className={`p-3.5 rounded-lg border transition-all ${
                        isLow
                          ? 'border-rose-200 bg-rose-50/40'
                          : isMedium
                          ? 'border-amber-200 bg-amber-50/20'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {/* Field Header: Name, Level Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 tracking-tight">
                            {f.label || f.field}
                          </span>
                          {f.is_required && (
                            <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wide">
                              Required
                            </span>
                          )}
                          {f.is_edited && (
                            <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              Edited
                            </span>
                          )}
                        </div>

                        {/* Confidence Badge: HIGH / MEDIUM / LOW */}
                        <Badge
                          variant={isLow ? 'low' : isMedium ? 'medium' : 'high'}
                          size="sm"
                          dot
                        >
                          {f.level} ({Math.round(f.score * 100)}%)
                        </Badge>
                      </div>

                      {/* Field Inputs: Original / Extracted Value + English Value */}
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Extracted Value
                          </label>
                          <input
                            type="text"
                            value={f.value}
                            onChange={(e) => handleFieldValueChange(idx, e.target.value)}
                            className={`w-full text-xs rounded-lg border px-3 py-1.5 focus:outline-none focus:ring-2 ${
                              isLow
                                ? 'border-rose-300 focus:ring-rose-400 bg-white text-slate-900'
                                : 'border-slate-300 focus:ring-slate-400 bg-white text-slate-800'
                            }`}
                          />
                        </div>

                        {/* English Value if available */}
                        {(f.english_value !== undefined || f.english_value_edited !== undefined) && (
                          <div>
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              English Normalized Translation
                            </label>
                            <input
                              type="text"
                              value={f.english_value || ''}
                              onChange={(e) => handleFieldEnglishChange(idx, e.target.value)}
                              placeholder="English transliteration/translation"
                              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-slate-50/60 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                          </div>
                        )}
                      </div>

                      {/* Low confidence warning notes if any */}
                      {isLow && f.reasons && f.reasons.length > 0 && (
                        <div className="mt-2 text-[11px] text-rose-700 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                          <span>Flagged: {f.reasons.join('; ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>

            {/* Reviewer Signature & Notes */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Reviewer Sign-off"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Officer name / ID"
                />
                <Input
                  label="Verification Notes (Optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Seal verified against registry"
                />
              </div>
            </div>

            {/* CLEAR ACTIONS AT THE BOTTOM: Save Changes, Approve, Reject */}
            <CardFooter className="flex flex-wrap items-center justify-between gap-2 p-4 bg-white border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveChanges}
                disabled={isSubmitting}
                leftIcon={<Save className="w-3.5 h-3.5 text-slate-600" />}
              >
                Save Changes
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isSubmitting}
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                >
                  Approve Certificate
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Reject Confirmation Modal */}
      <Modal
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        title="Reject Certificate"
        description="Provide an official rejection reason for the permanent audit trail."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmReject}
              disabled={!rejectionReason.trim()}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Rejection Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g., Illegible seal, mismatched birth date, counterfeit watermark suspicion..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
          />
        </div>
      </Modal>
    </div>
  );
};
