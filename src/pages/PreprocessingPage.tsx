import React, { useState } from 'react';
import {
  Wand2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { DocumentRecord, NavigationTab } from '../types';
import { triggerPreprocessing } from '../services/api';

interface PreprocessingPageProps {
  document: DocumentRecord | null;
  onUpdateDocument: (updated: DocumentRecord) => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const PreprocessingPage: React.FC<PreprocessingPageProps> = ({
  document,
  onUpdateDocument,
  onNavigate,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!document) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <Wand2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          No Certificate Selected for Preprocessing
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please upload a new document or select an existing scan from the header dropdown to run deskewing, illumination correction, and contrast enhancement.
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

  const handleRunPreprocessing = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const updated = await triggerPreprocessing(document.id);
      onUpdateDocument(updated);
    } catch (err: any) {
      setError(err.message || 'Preprocessing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const prep = document.preprocessed;
  const qualityScore = prep ? Math.round(prep.quality_score * 100) : null;
  const isDegraded = prep && prep.quality_score < 0.45;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
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
            Local Computer Vision Preprocessing Pipeline
          </h2>
          <p className="text-xs text-slate-500">
            OpenCV & NumPy offline transformations: Skew rectification, CLAHE contrast, bilateral filtering, illumination flattening.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleRunPreprocessing}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{prep ? 'Re-run Preprocessing' : 'Run Preprocessing Pipeline'}</span>
          </button>

          {prep && (
            <button
              onClick={() => onNavigate('ocr')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>Proceed to OCR</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quality & Degraded Image Warning Banner */}
      {prep && (
        <div
          className={`p-4 rounded-xl border text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
            isDegraded
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : prep.warnings.length > 0
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {isDegraded ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>Quality Assessment Score: {qualityScore}%</span>
                {isDegraded && (
                  <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-800 text-[10px] uppercase font-mono">
                    Severe Degradation Warning
                  </span>
                )}
              </div>
              <div className="text-[11px] mt-0.5">
                {isDegraded
                  ? 'Warning: This document scan is heavily degraded or blurred. Downstream OCR results may be incomplete or unreliable.'
                  : prep.warnings.length > 0
                  ? 'Preprocessing warnings detected. Transformations were automatically applied to stabilize text.'
                  : 'Document quality is high. Optimal for local OCR character recognition.'}
              </div>

              {/* Warning list */}
              {prep.warnings.length > 0 && (
                <ul className="mt-2 space-y-1 list-disc list-inside text-[11px] font-medium">
                  {prep.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="text-right font-mono text-[11px]">
              <div>Skew Corrected: <strong className="text-slate-800">{prep.skew_angle}°</strong></div>
              <div>Resized: {prep.processed_dimensions.join(' × ')} px</div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Comparison: Original Image -> Processed Image */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ORIGINAL IMAGE */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Original Image (Raw Input)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Format: {document.file_type}
            </span>
          </div>

          <div className="p-4 bg-slate-100 flex-1 flex items-center justify-center min-h-[380px] overflow-hidden">
            <img
              src={document.original_url}
              alt="Original scan"
              className="max-h-[500px] w-auto max-w-full object-contain rounded-lg shadow-sm border border-slate-300 bg-white"
            />
          </div>

          <div className="p-3 bg-white border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Raw upload resolution</span>
            <span className="font-mono">{(document.file_size / 1024).toFixed(1)} KB</span>
          </div>
        </div>

        {/* PROCESSED IMAGE */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                Processed Image (Normalized for OCR)
              </h3>
            </div>
            {prep && (
              <span className="text-[11px] text-indigo-700 font-mono font-medium">
                CV Pipeline Applied
              </span>
            )}
          </div>

          <div className="p-4 bg-slate-100 flex-1 flex items-center justify-center min-h-[380px] overflow-hidden">
            {prep?.processed_url ? (
              <img
                src={prep.processed_url}
                alt="Preprocessed document"
                className="max-h-[500px] w-auto max-w-full object-contain rounded-lg shadow-sm border border-slate-300 bg-white"
              />
            ) : isProcessing ? (
              <div className="text-center space-y-3 p-8">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <div className="text-xs font-semibold text-slate-700">
                  Executing Computer Vision Pipeline...
                </div>
                <div className="text-[11px] text-slate-500 max-w-xs">
                  Detecting Hough skew lines, applying CLAHE adaptive histogram, bilateral filtering & background normalization.
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 p-8 text-slate-400">
                <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
                <div className="text-xs font-semibold text-slate-600">
                  Not Preprocessed Yet
                </div>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Click "Run Preprocessing Pipeline" above to deskew, denoise, and enhance contrast.
                </p>
              </div>
            )}
          </div>

          <div className="p-3 bg-white border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Ready for offline character recognition</span>
            <span className="font-mono text-indigo-600 font-medium">
              {prep ? 'Deskewed & CLAHE Enhanced' : 'Pending Action'}
            </span>
          </div>
        </div>
      </div>

      {/* Applied Transformations Breakdown */}
      {prep && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Executed Transformation Pipeline</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Engine: OpenCV Headless + NumPy
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-mono">1. Skew Rectification</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                {Math.abs(prep.skew_angle) > 0.3 ? `${prep.skew_angle}° Rotated` : 'Aligned (0.0°)'}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">Hough transform text baseline alignment.</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-mono">2. Contrast Normalization</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">CLAHE Equalization</div>
              <div className="text-[11px] text-slate-600 mt-1">Adaptive histogram on L-channel in LAB space.</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-mono">3. Illumination Flattening</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">Shadow Division</div>
              <div className="text-[11px] text-slate-600 mt-1">Morphological background subtraction.</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-mono">4. Edge-Preserving Denoise</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">Bilateral Filter</div>
              <div className="text-[11px] text-slate-600 mt-1">Removes paper speckles while preserving font edges.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
