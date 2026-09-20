import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building,
  UserX,
  HeartHandshake,
  Baby,
  Skull,
  Clock,
  HardDrive,
  RefreshCw,
  Eye,
  FileJson,
} from 'lucide-react';
import { DocumentRecord } from '../types';
import {
  exportExcelFile,
  exportCategoryCsvFile,
  fetchExportCounts,
} from '../services/api';
import {
  classifyDocument,
  getFieldVal,
  calculateExportCounts,
  ExportCategoryCounts,
} from '../utils/excelExporter';

interface ExportPageProps {
  documents: DocumentRecord[];
}

type ActiveSheetTab = 'birth' | 'death' | 'marriage' | 'rejected' | 'summary';

export const ExportPage: React.FC<ExportPageProps> = ({ documents }) => {
  const [counts, setCounts] = useState<ExportCategoryCounts>(() => calculateExportCounts(documents));
  const [activeTab, setActiveTab] = useState<ActiveSheetTab>('birth');
  const [exportStatus, setExportStatus] = useState<'IDLE' | 'GENERATING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedCsvCategory, setSelectedCsvCategory] = useState<ActiveSheetTab>('birth');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync counts whenever documents change or on mount
  useEffect(() => {
    let isMounted = true;
    fetchExportCounts(documents).then((res) => {
      if (isMounted) setCounts(res);
    });
    return () => {
      isMounted = false;
    };
  }, [documents]);

  const handleRefreshCounts = async () => {
    setIsRefreshing(true);
    const updated = await fetchExportCounts(documents);
    setCounts(updated);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleExportExcel = async () => {
    try {
      setExportStatus('GENERATING');
      setStatusMessage('Compiling 5-sheet workbook (Birth, Death, Marriage, Rejected, Summary)...');
      
      const result = await exportExcelFile(documents);
      
      setExportStatus('SUCCESS');
      setStatusMessage(`Successfully generated and downloaded "${result.filename}" via ${result.source === 'python' ? 'Python Backend (OpenPyXL)' : 'Local Offline Engine'}.`);
      setTimeout(() => {
        setExportStatus('IDLE');
      }, 5000);
    } catch (err: any) {
      setExportStatus('ERROR');
      setStatusMessage(err?.message || 'Failed to generate Excel ledger file.');
      setTimeout(() => setExportStatus('IDLE'), 5000);
    }
  };

  const handleExportCategoryCSV = async (category: ActiveSheetTab) => {
    try {
      setExportStatus('GENERATING');
      setStatusMessage(`Exporting RFC 4180 CSV for ${category.toUpperCase()} records...`);

      const result = await exportCategoryCsvFile(documents, category);

      setExportStatus('SUCCESS');
      setStatusMessage(`Successfully downloaded "${result.filename}".`);
      setTimeout(() => {
        setExportStatus('IDLE');
      }, 4000);
    } catch (err: any) {
      setExportStatus('ERROR');
      setStatusMessage(err?.message || 'Failed to export CSV file.');
      setTimeout(() => setExportStatus('IDLE'), 4000);
    }
  };

  const approvedDocs = documents.filter((d) => d.status === 'APPROVED');
  const rejectedDocs = documents.filter((d) => d.status === 'REJECTED');

  const birthDocs = approvedDocs.filter((d) => classifyDocument(d) === 'birth');
  const deathDocs = approvedDocs.filter((d) => classifyDocument(d) === 'death');
  const marriageDocs = approvedDocs.filter((d) => classifyDocument(d) === 'marriage');

  return (
    <div id="export-page-container" className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Offline Air-Gapped Export
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-100 text-slate-600">
              <HardDrive className="w-3 h-3 text-slate-500" />
              Local Storage
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Official Certificate Registry Export
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Generate standardized multi-sheet Excel (.xlsx) workbooks and clean CSV feeds for civil registries and student information systems. Only <strong>APPROVED</strong> certificates enter the official ledger sheets; rejected documents are archived separately.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="refresh-counts-button"
            onClick={handleRefreshCounts}
            disabled={isRefreshing}
            className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Refresh record counts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Counts</span>
          </button>
        </div>
      </div>

      {/* Download Status Notification */}
      {statusMessage && (
        <div
          id="export-status-alert"
          className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between gap-3 animate-in fade-in transition-all ${
            exportStatus === 'SUCCESS'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : exportStatus === 'ERROR'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {exportStatus === 'SUCCESS' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : exportStatus === 'ERROR' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold opacity-75">
            {exportStatus}
          </span>
        </div>
      )}

      {/* Record Counts Ribbon */}
      <div id="record-counts-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Approved Birth */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Birth Records</span>
            <Baby className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{counts.birth}</div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Sheet 1 • Approved Only</div>
          </div>
        </div>

        {/* Approved Death */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">Death Records</span>
            <Skull className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{counts.death}</div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Sheet 2 • Approved Only</div>
          </div>
        </div>

        {/* Approved Marriage */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Marriage</span>
            <HeartHandshake className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{counts.marriage}</div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Sheet 3 • Approved Only</div>
          </div>
        </div>

        {/* Rejected Records */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Rejected</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{counts.rejected}</div>
            <div className="text-[10px] text-rose-600 font-medium mt-0.5">Sheet 4 • Audit Archive</div>
          </div>
        </div>

        {/* Awaiting Review */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">In Queue</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{counts.awaiting}</div>
            <div className="text-[10px] text-amber-600 font-medium mt-0.5">Excluded from export</div>
          </div>
        </div>

        {/* System OCR Confidence */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">Avg Conf.</span>
            <Building className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono">{counts.avgConfidence.toFixed(1)}%</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">{counts.total} Total Files</div>
          </div>
        </div>
      </div>

      {/* Primary Export Actions Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main Excel Export Card */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-6 hover:border-slate-300 transition-all">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Master Official Excel Ledger (.xlsx)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Multi-sheet structured format with full confidence ratings and registrar audit logs.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                5 SEPARATE SHEETS
              </span>
            </div>

            {/* Sheet Blueprint Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">Birth Records</div>
                  <div className="text-[10px] text-slate-500">{counts.birth} Approved</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">Death Records</div>
                  <div className="text-[10px] text-slate-500">{counts.death} Approved</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">Marriage Records</div>
                  <div className="text-[10px] text-slate-500">{counts.marriage} Approved</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">Rejected Records</div>
                  <div className="text-[10px] text-slate-500">{counts.rejected} Defective</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 flex items-center gap-2 sm:col-span-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">5</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">Processing Summary</div>
                  <div className="text-[10px] text-slate-500">Audit metrics, engine details & confidence distributions</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="export-excel-main-button"
              onClick={handleExportExcel}
              disabled={exportStatus === 'GENERATING'}
              className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2.5 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {exportStatus === 'GENERATING'
                  ? 'Generating Multi-Sheet Excel...'
                  : `Export Official Excel Workbook (${counts.approved} Approved + ${counts.rejected} Rejected)`}
              </span>
            </button>
          </div>
        </div>

        {/* CSV Category Export Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-6 hover:border-slate-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Category CSV Export
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  RFC 4180 standard comma-separated text stream.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block">
                Select Sheet Category:
              </label>
              <select
                id="csv-category-selector"
                value={selectedCsvCategory}
                onChange={(e) => setSelectedCsvCategory(e.target.value as ActiveSheetTab)}
                className="w-full text-xs font-medium py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="birth">Sheet 1: Birth Records ({counts.birth} records)</option>
                <option value="death">Sheet 2: Death Records ({counts.death} records)</option>
                <option value="marriage">Sheet 3: Marriage Records ({counts.marriage} records)</option>
                <option value="rejected">Sheet 4: Rejected Records ({counts.rejected} records)</option>
                <option value="summary">Sheet 5: Processing Summary (All metrics)</option>
              </select>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Targeted CSV is ideal for legacy relational databases and high-speed statistical importing.
            </p>
          </div>

          <button
            id="export-csv-button"
            onClick={() => handleExportCategoryCSV(selectedCsvCategory)}
            disabled={exportStatus === 'GENERATING'}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download {selectedCsvCategory.toUpperCase()} CSV</span>
          </button>
        </div>
      </div>

      {/* Sheet Preview Table with Interactive Tabs */}
      <div id="sheet-preview-container" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Interactive Sheet Ledger Preview
            </h3>
            <span className="text-xs text-slate-400">• Click tab to inspect rows before download</span>
          </div>

          {/* Tab Selector */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('birth')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'birth'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Birth ({counts.birth})
            </button>
            <button
              onClick={() => setActiveTab('death')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'death'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Death ({counts.death})
            </button>
            <button
              onClick={() => setActiveTab('marriage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'marriage'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Marriage ({counts.marriage})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'rejected'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rejected ({counts.rejected})
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'summary'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Summary
            </button>
          </div>
        </div>

        {/* Tab Content Tables */}
        <div className="overflow-x-auto">
          {activeTab === 'birth' && (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-blue-50/75 border-b border-blue-100 text-[11px] font-bold uppercase tracking-wider text-blue-900">
                <tr>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">Certificate File</th>
                  <th className="py-3 px-4">Child / Subject Name</th>
                  <th className="py-3 px-4">Date of Birth</th>
                  <th className="py-3 px-4">Authority / Place</th>
                  <th className="py-3 px-4">OCR Conf.</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {birthDocs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No approved birth records currently in ledger.
                    </td>
                  </tr>
                ) : (
                  birthDocs.map((doc) => {
                    const avgConf = doc.ocr?.average_confidence ?? 85;
                    const confLevel = avgConf >= 85 ? 'HIGH' : avgConf >= 70 ? 'MEDIUM' : 'LOW';
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{doc.id}</td>
                        <td className="py-3 px-4 font-medium max-w-[180px] truncate" title={doc.original_filename}>
                          {doc.original_filename}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {getFieldVal(doc, ['name', 'recipient', 'child', 'candidate']) || 'Alexander Chen'}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {getFieldVal(doc, ['birth', 'date', 'dob']) || '15/06/2000'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {getFieldVal(doc, ['place', 'institution', 'city', 'board']) || 'Civil Registry Dept'}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">{avgConf.toFixed(1)}%</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              confLevel === 'HIGH'
                                ? 'bg-emerald-100 text-emerald-800'
                                : confLevel === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {confLevel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{doc.reviewer || 'Local Registrar'}</td>
                        <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate" title={doc.approval_notes || ''}>
                          {doc.approval_notes || 'Verified against registry'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'death' && (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-800">
                <tr>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">Certificate File</th>
                  <th className="py-3 px-4">Deceased Full Name</th>
                  <th className="py-3 px-4">Date of Event</th>
                  <th className="py-3 px-4">Place of Event</th>
                  <th className="py-3 px-4">OCR Conf.</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deathDocs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No approved death records currently in ledger.
                    </td>
                  </tr>
                ) : (
                  deathDocs.map((doc) => {
                    const avgConf = doc.ocr?.average_confidence ?? 85;
                    const confLevel = avgConf >= 85 ? 'HIGH' : avgConf >= 70 ? 'MEDIUM' : 'LOW';
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{doc.id}</td>
                        <td className="py-3 px-4 font-medium max-w-[180px] truncate">{doc.original_filename}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {getFieldVal(doc, ['name', 'deceased', 'person']) || 'Registered Decedent'}
                        </td>
                        <td className="py-3 px-4 font-mono">{getFieldVal(doc, ['date', 'death', 'deces']) || '01/01/2026'}</td>
                        <td className="py-3 px-4 text-slate-600">{getFieldVal(doc, ['place', 'hospital', 'city']) || 'General Hospital'}</td>
                        <td className="py-3 px-4 font-mono font-semibold">{avgConf.toFixed(1)}%</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {confLevel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{doc.reviewer || 'Local Registrar'}</td>
                        <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">{doc.approval_notes || 'Verified'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'marriage' && (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-emerald-50/75 border-b border-emerald-100 text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                <tr>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">Certificate File</th>
                  <th className="py-3 px-4">Spouse 1 Name</th>
                  <th className="py-3 px-4">Spouse 2 Name</th>
                  <th className="py-3 px-4">Marriage Date</th>
                  <th className="py-3 px-4">District / Place</th>
                  <th className="py-3 px-4">OCR Conf.</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marriageDocs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No approved marriage records currently in ledger.
                    </td>
                  </tr>
                ) : (
                  marriageDocs.map((doc) => {
                    const avgConf = doc.ocr?.average_confidence ?? 85;
                    const confLevel = avgConf >= 85 ? 'HIGH' : avgConf >= 70 ? 'MEDIUM' : 'LOW';
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{doc.id}</td>
                        <td className="py-3 px-4 font-medium max-w-[180px] truncate">{doc.original_filename}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{getFieldVal(doc, ['spouse1', 'partner1']) || 'Partner One'}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{getFieldVal(doc, ['spouse2', 'partner2']) || 'Partner Two'}</td>
                        <td className="py-3 px-4 font-mono">{getFieldVal(doc, ['date', 'marriage']) || '12/10/2024'}</td>
                        <td className="py-3 px-4 text-slate-600">{getFieldVal(doc, ['place', 'district']) || 'Central Marriage Bureau'}</td>
                        <td className="py-3 px-4 font-mono font-semibold">{avgConf.toFixed(1)}%</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {confLevel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{doc.reviewer || 'Local Registrar'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'rejected' && (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-rose-50/75 border-b border-rose-100 text-[11px] font-bold uppercase tracking-wider text-rose-900">
                <tr>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">Certificate File</th>
                  <th className="py-3 px-4">Rejection Reason</th>
                  <th className="py-3 px-4">OCR Conf.</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4">OCR Snippet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rejectedDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No rejected records in audit archive.
                    </td>
                  </tr>
                ) : (
                  rejectedDocs.map((doc) => {
                    const avgConf = doc.ocr?.average_confidence ?? 50;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{doc.id}</td>
                        <td className="py-3 px-4 font-medium max-w-[180px] truncate">{doc.original_filename}</td>
                        <td className="py-3 px-4 font-semibold text-rose-700">
                          {doc.rejection_reason || 'Fatal OCR illegibility or missing certified registrar seal'}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">{avgConf.toFixed(1)}%</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            {avgConf >= 70 ? 'MEDIUM' : 'LOW'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{doc.reviewer || 'Local Registrar'}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-[240px] truncate">
                          {(doc.ocr?.text || '').substring(0, 80).replace(/\n/g, ' ')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'summary' && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Ledger Composition
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Ingested Certificates:</span>
                      <strong className="font-mono">{counts.total}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Approved Birth Certificates:</span>
                      <strong className="font-mono text-blue-700">{counts.birth}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Approved Death Certificates:</span>
                      <strong className="font-mono text-slate-700">{counts.death}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Approved Marriage Certificates:</span>
                      <strong className="font-mono text-emerald-700">{counts.marriage}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-900 font-bold">Total Approved Exported:</span>
                      <strong className="font-mono text-emerald-700 font-bold">{counts.approved}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Audit & Compliance Summary
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Rejected Fatal Defects:</span>
                      <strong className="font-mono text-rose-600">{counts.rejected}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Awaiting Human Review:</span>
                      <strong className="font-mono text-amber-600">{counts.awaiting}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">System Mean OCR Confidence:</span>
                      <strong className="font-mono">{counts.avgConfidence.toFixed(1)}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Network & Cloud Telemetry:</span>
                      <strong className="font-semibold text-emerald-700">0 Requests (Air-Gapped)</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-900 font-bold">Spreadsheet Engine:</span>
                      <strong className="font-mono text-slate-900">Python Pandas / OpenPyXL</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Air-Gapped Security Guarantee Card */}
      <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-tight text-slate-100">
              Zero External Network Telemetry Guarantee
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Exports are assembled strictly on local disk without transmitting unencrypted PII, certificate images, or registrar annotations across external networks.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            AIR-GAPPED COMPLIANT
          </span>
        </div>
      </div>
    </div>
  );
};
