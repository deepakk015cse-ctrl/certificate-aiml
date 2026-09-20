import React, { useState } from 'react';
import {
  ScanText,
  RefreshCw,
  AlertTriangle,
  Copy,
  Globe,
  ShieldCheck,
  ArrowRight,
  PenTool,
  Hash,
  Activity,
} from 'lucide-react';
import { DocumentRecord, NavigationTab } from '../types';
import { triggerOCR } from '../services/api';

interface OCRPageProps {
  document: DocumentRecord | null;
  onUpdateDocument: (updated: DocumentRecord) => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const OCRPage: React.FC<OCRPageProps> = ({
  document,
  onUpdateDocument,
  onNavigate,
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>('eng');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!document) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <ScanText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          No Certificate Selected for OCR
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please select a certificate from the dashboard or upload a document scan to extract multilingual text using local offline Tesseract OCR.
        </p>
        <button
          onClick={() => onNavigate('upload')}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
        >
          Go to Upload Page
        </button>
      </div>
    );
  }

  const handleRunOCR = async () => {
    setIsExtracting(true);
    setError(null);
    try {
      const updated = await triggerOCR(document.id, selectedLang);
      onUpdateDocument(updated);
    } catch (err: any) {
      setError(err.message || 'OCR extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopyText = () => {
    if (document.ocr?.text) {
      navigator.clipboard.writeText(document.ocr.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const ocr = document.ocr;
  const avgConf = ocr ? Math.round(ocr.average_confidence) : null;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              Doc ID: {document.id}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-600">
              {document.original_filename}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-1">
            Local Offline OCR Character Extraction
          </h2>
          <p className="text-xs text-slate-500">
            Engine: Open-source Tesseract 5.3 (Local Edge). Zero cloud connectivity required.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">Lang:</span>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="text-xs bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="eng">English (eng)</option>
              <option value="fra">French (fra)</option>
              <option value="spa">Spanish (spa)</option>
              <option value="deu">German (deu)</option>
              <option value="hin">Hindi (hin)</option>
              <option value="multilingual">Multilingual Auto (All 5)</option>
            </select>
          </div>

          <button
            onClick={handleRunOCR}
            disabled={isExtracting}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isExtracting ? 'animate-spin' : ''}`} />
            <span>{ocr ? 'Re-extract OCR' : 'Run Local Offline OCR'}</span>
          </button>

          {ocr && (
            <button
              onClick={() => onNavigate('review')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>Proceed to Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Handwriting Limitations Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <PenTool className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold flex items-center gap-2">
            <span>Handwriting & Seal Accuracy Notice (Standard Edge Constraint)</span>
            <span className="px-2 py-0.2 rounded bg-amber-200 text-amber-800 text-[10px] font-mono">
              Offline Tesseract Reality
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800">
            Classical offline OCR excels at printed typography, certificates, and serif/sans headers. Handwritten cursive signatures, registrar stamps, embossed seals, or degraded handwritten student names naturally demonstrate lower word-level confidence. Human registrar review remains essential.
          </p>
        </div>
      </div>

      {/* OCR Metrics Summary Cards */}
      {ocr && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Average Confidence</span>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold tracking-tight font-mono ${
                  avgConf && avgConf >= 75
                    ? 'text-emerald-700'
                    : avgConf && avgConf >= 60
                    ? 'text-amber-700'
                    : 'text-orange-700'
                }`}
              >
                {ocr.average_confidence.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400 font-sans">
                {avgConf && avgConf >= 75 ? 'High Confidence' : 'Review Required'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Characters / Words</span>
              <Hash className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight font-mono text-slate-900">
              {ocr.char_count} <span className="text-xs font-normal text-slate-500">chars ({ocr.word_count} words)</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Language Pack</span>
              <Globe className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight font-mono text-slate-900 uppercase">
              {ocr.language}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Execution Engine</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 text-xs font-bold text-slate-900">
              {ocr.engine}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
              100% Offline • No Remote Call
            </div>
          </div>
        </div>
      )}

      {/* Main OCR Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Extracted Text Pane */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Extracted Certificate Text
              </h3>
              <p className="text-[11px] text-slate-500">
                Raw character recognition output produced by local Tesseract
              </p>
            </div>
            {ocr?.text && (
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors shadow-2xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            )}
          </div>

          <div className="p-5 flex-1 min-h-[360px]">
            {isExtracting ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-8">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                <div className="text-xs font-semibold text-slate-700">
                  Running Local Offline Character Recognition...
                </div>
                <div className="text-[11px] text-slate-500 max-w-sm">
                  Segmenting text lines, computing page layout analysis (PSM 3), and computing character confidence without internet access.
                </div>
              </div>
            ) : ocr?.text ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
                  {ocr.text}
                </div>

                {ocr.warnings.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-orange-50 border border-orange-200 text-[11px] text-orange-900 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                      <span>OCR Engine Observations:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {ocr.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 p-8 text-slate-400">
                <ScanText className="w-10 h-10 text-slate-300" />
                <div className="text-xs font-semibold text-slate-600">
                  OCR Has Not Been Executed Yet
                </div>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Click "Run Local Offline OCR" above to extract multilingual text with confidence scoring.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Certificate Visualizer / Source Preview */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Scanned Source Document
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {document.preprocessed ? 'Using Preprocessed Scan' : 'Using Original Scan'}
            </span>
          </div>

          <div className="p-4 bg-slate-100 flex-1 flex items-center justify-center min-h-[360px] overflow-hidden">
            <img
              src={document.preprocessed?.processed_url || document.original_url}
              alt="Scan preview"
              className="max-h-[460px] w-auto max-w-full object-contain rounded-lg shadow-sm border border-slate-300 bg-white"
            />
          </div>

          <div className="p-3 bg-white border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Confidence Threshold: 65%</span>
            <span className="text-indigo-600 font-medium">Ready for Human Review</span>
          </div>
        </div>
      </div>

      {/* Word-Level Confidence & Bounding Regions Table */}
      {ocr && ocr.regions && ocr.regions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recognized Word Regions & Confidence Matrix
              </h3>
              <p className="text-[11px] text-slate-500">
                Word-level granularity from Tesseract image_to_data bounding boxes
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Total Words: {ocr.regions.length}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Word / Token</th>
                  <th className="px-4 py-2.5">Confidence</th>
                  <th className="px-4 py-2.5">Bounding Box [X, Y, W, H]</th>
                  <th className="px-4 py-2.5 text-right">Reliability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {ocr.regions.slice(0, 30).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2 font-medium font-sans text-slate-900">
                      {r.text}
                    </td>
                    <td className="px-4 py-2 font-semibold">
                      <span
                        className={
                          r.confidence >= 80
                            ? 'text-emerald-700'
                            : r.confidence >= 55
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }
                      >
                        {r.confidence}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      [{r.bbox.join(', ')}]
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.confidence >= 80 ? (
                        <span className="text-emerald-700 font-sans text-[10px]">Verified High</span>
                      ) : r.confidence >= 55 ? (
                        <span className="text-amber-700 font-sans text-[10px]">Fair</span>
                      ) : (
                        <span className="text-rose-700 font-sans text-[10px] font-bold">Manual Flag</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
