import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
} from 'lucide-react';
import { DocumentRecord, DocumentStatus, NavigationTab } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { deleteDocument } from '../services/api';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Select,
  Modal,
  EmptyState,
} from '../components/ui';

interface RecordsPageProps {
  documents: DocumentRecord[];
  onSelectDoc: (doc: DocumentRecord) => void;
  onNavigate: (tab: NavigationTab) => void;
  onRefresh: () => void;
}

export const RecordsPage: React.FC<RecordsPageProps> = ({
  documents,
  onSelectDoc,
  onNavigate,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('ALL');
  const [inspectDoc, setInspectDoc] = useState<DocumentRecord | null>(null);

  // Helper to detect certificate category
  const detectCertType = (doc: DocumentRecord): string => {
    const name = (doc.original_filename + ' ' + (doc.ocr?.text || '')).toLowerCase();
    if (name.includes('birth') || name.includes('nacimiento') || name.includes('naissance')) return 'Birth';
    if (name.includes('death') || name.includes('defuncion') || name.includes('deces')) return 'Death';
    if (name.includes('marriage') || name.includes('matrimonio') || name.includes('mariage')) return 'Marriage';
    if (name.includes('degree') || name.includes('diploma') || name.includes('university') || name.includes('graduat')) return 'Academic';
    return 'General';
  };

  // Filter logic
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Search filter
      const matchesSearch =
        doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.ocr?.text && doc.ocr.text.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // 2. Certificate type filter
      const certType = detectCertType(doc);
      if (selectedType !== 'ALL' && certType !== selectedType) return false;

      // 3. Status filter
      if (selectedStatus !== 'ALL' && doc.status !== selectedStatus) return false;

      // 4. Confidence filter
      const conf = doc.ocr?.average_confidence;
      if (selectedConfidence !== 'ALL') {
        if (selectedConfidence === 'HIGH' && (conf === undefined || conf < 80)) return false;
        if (selectedConfidence === 'MEDIUM' && (conf === undefined || conf < 60 || conf >= 80)) return false;
        if (selectedConfidence === 'LOW' && (conf === undefined || conf >= 60)) return false;
      }

      return true;
    });
  }, [documents, searchTerm, selectedType, selectedStatus, selectedConfidence]);

  const handleDelete = async (doc: DocumentRecord) => {
    if (window.confirm(`Delete record for certificate '${doc.original_filename}'?`)) {
      await deleteDocument(doc.id);
      onRefresh();
    }
  };

  return (
    <div id="records-page-container" className="space-y-4 max-w-7xl mx-auto">
      {/* Filters & Search Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <Input
                placeholder="Search by filename, ID, or text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>

            {/* Certificate Type Filter */}
            <div>
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Certificate Types' },
                  { value: 'Birth', label: 'Birth Certificate' },
                  { value: 'Death', label: 'Death Certificate' },
                  { value: 'Marriage', label: 'Marriage Certificate' },
                  { value: 'Academic', label: 'Academic Diploma' },
                  { value: 'General', label: 'General Certificate' },
                ]}
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'AWAITING_REVIEW', label: 'Awaiting Review' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                  { value: 'LOW_CONFIDENCE', label: 'Low Confidence' },
                  { value: 'OCR_EXTRACTED', label: 'OCR Extracted' },
                  { value: 'UPLOADED', label: 'Uploaded' },
                ]}
              />
            </div>

            {/* Confidence Filter */}
            <div>
              <Select
                value={selectedConfidence}
                onChange={(e) => setSelectedConfidence(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Confidence Levels' },
                  { value: 'HIGH', label: 'High (≥ 80%)' },
                  { value: 'MEDIUM', label: 'Medium (60% - 79%)' },
                  { value: 'LOW', label: 'Low (< 60%)' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Records Table */}
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100">
          <div>
            <CardTitle>Archived Certificates</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredDocs.length} of {documents.length} recorded documents
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('export')}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Export to Excel
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {filteredDocs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No certificates match your filters"
              description="Try adjusting your search query, type selection, or status filters."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedType('ALL');
                    setSelectedStatus('ALL');
                    setSelectedConfidence('ALL');
                  }}
                >
                  Reset Filters
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Document</TableHead>
                  <TableHead>Certificate Type</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => {
                  const certType = detectCertType(doc);
                  const conf = doc.ocr?.average_confidence;
                  const lang = doc.ocr?.language || 'eng';

                  return (
                    <TableRow key={doc.id}>
                      {/* Document */}
                      <TableCell>
                        <div className="font-semibold text-slate-900 truncate max-w-[200px]" title={doc.original_filename}>
                          {doc.original_filename}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">ID: {doc.id}</div>
                      </TableCell>

                      {/* Certificate Type */}
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {certType}
                        </span>
                      </TableCell>

                      {/* Language */}
                      <TableCell>
                        <span className="font-mono text-xs text-slate-700 uppercase">
                          {lang}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={doc.status} />
                      </TableCell>

                      {/* Confidence */}
                      <TableCell>
                        {conf !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                conf >= 80
                                  ? 'bg-emerald-500'
                                  : conf >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span className="font-mono text-xs font-semibold text-slate-800">
                              {conf.toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">—</span>
                        )}
                      </TableCell>

                      {/* Reviewed */}
                      <TableCell>
                        {doc.reviewed_at ? (
                          <div>
                            <div className="text-xs text-slate-800 font-medium">
                              {doc.reviewer || 'Registrar Officer'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {doc.reviewed_at.substring(0, 10)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Pending Review</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setInspectDoc(doc)}
                            title="Inspect Audit"
                          >
                            <History className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <button
                            onClick={() => handleDelete(doc)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete certificate"
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

      {/* Audit Trail Modal */}
      {inspectDoc && (
        <Modal
          isOpen={Boolean(inspectDoc)}
          onClose={() => setInspectDoc(null)}
          title={`Certificate Audit Trail: ${inspectDoc.original_filename}`}
          description={`Registered ID: ${inspectDoc.id}`}
          maxWidth="xl"
          footer={
            <Button size="sm" onClick={() => setInspectDoc(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[11px]">Ingested On</span>
                <span className="font-semibold text-slate-800">{inspectDoc.created_at.substring(0, 16)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Review Status</span>
                <StatusBadge status={inspectDoc.status} />
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Reviewer</span>
                <span className="font-semibold text-slate-800">{inspectDoc.reviewer || 'Not reviewed'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Average OCR</span>
                <span className="font-mono font-semibold text-slate-800">
                  {inspectDoc.ocr?.average_confidence?.toFixed(1) ?? 'N/A'}%
                </span>
              </div>
            </div>

            {inspectDoc.rejection_reason && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                <span className="font-bold block text-[11px] uppercase">Rejection Reason</span>
                <span>{inspectDoc.rejection_reason}</span>
              </div>
            )}

            {inspectDoc.approval_notes && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                <span className="font-bold block text-[11px] uppercase">Registrar Approval Notes</span>
                <span>{inspectDoc.approval_notes}</span>
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-800 mb-2">Extracted Metadata Fields ({inspectDoc.extracted_fields?.length ?? 0})</h4>
              {inspectDoc.extracted_fields && inspectDoc.extracted_fields.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {inspectDoc.extracted_fields.map((f, i) => (
                    <div key={i} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">{f.label || f.field}:</span>{' '}
                        <span className="text-slate-900">{f.reviewer_edited_value || f.value}</span>
                        {f.english_value && (
                          <span className="text-slate-500 ml-2">({f.english_value})</span>
                        )}
                      </div>
                      <Badge variant={f.level === 'LOW' ? 'low' : f.level === 'MEDIUM' ? 'medium' : 'high'} size="sm">
                        {f.level} ({Math.round(f.score * 100)}%)
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">No extracted fields recorded.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
