import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Archive,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { uploadDocument } from '../services/api';
import { DocumentRecord, NavigationTab } from '../types';

interface UploadPageProps {
  onUploadSuccess: (doc: DocumentRecord) => void;
  onNavigate: (tab: NavigationTab) => void;
  onSeedSamples: () => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({
  onUploadSuccess,
  onNavigate,
  onSeedSamples,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<DocumentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedFormats = ['.jpg', '.jpeg', '.png', '.pdf', '.zip'];

  const handleFile = async (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFormats.includes(ext)) {
      setError(`Format '${ext}' is not supported. Please select JPG, JPEG, PNG, PDF, or ZIP.`);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const doc = await uploadDocument(file);
      setUploadedDoc(doc);
      onUploadSuccess(doc);
    } catch (err: any) {
      setError(err.message || 'Failed to upload certificate.');
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Upload Certificate for Local Offline Processing
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Select individual certificates or bulk ZIP archives. All processing remains on this device.
        </p>
      </div>

      {/* Main Drag-and-Drop Area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,.zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-sm">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h3 className="text-sm font-bold text-slate-900">
          Drop your certificate scan here, or browse files
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Supported offline inputs: <strong className="text-slate-700">JPG, JPEG, PNG, PDF</strong> or compressed <strong className="text-slate-700">ZIP</strong> bundles.
        </p>

        <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 font-mono">
            <ImageIcon className="w-3 h-3 text-slate-600" /> JPG / PNG
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 font-mono">
            <FileText className="w-3 h-3 text-slate-600" /> PDF Document
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 font-mono">
            <Archive className="w-3 h-3 text-slate-600" /> ZIP Archive
          </span>
        </div>

        {isUploading && (
          <div className="mt-6 max-w-xs mx-auto">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 mb-1">
              <span>Storing document securely...</span>
              <span className="animate-pulse">Offline</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Upload Notice</div>
            <div className="text-[11px] mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Success State with Direct Action */}
      {uploadedDoc && (
        <div className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-900">
                Certificate Uploaded Successfully
              </div>
              <div className="text-xs text-slate-600 font-medium">
                {uploadedDoc.original_filename} • {(uploadedDoc.file_size / 1024).toFixed(1)} KB • ID: {uploadedDoc.id}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigate('preprocessing')}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Inspect & Preprocess Scan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('ocr')}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Skip to Offline OCR
            </button>
            <button
              onClick={() => {
                setUploadedDoc(null);
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
            >
              Upload Another
            </button>
          </div>
        </div>
      )}

      {/* Quick Test Samples Seeder Option */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Need sample test certificates?
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Instantly generate synthetic test scans including an English Degree, a French Diploma, and a Skewed scan to test deskewing and offline OCR without uploading personal files.
            </p>
          </div>
        </div>
        <button
          onClick={onSeedSamples}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold shrink-0 transition-colors shadow-2xs"
        >
          Generate Test Scans
        </button>
      </div>

      {/* Security note */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 px-1">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          Zero cloud data leakage guarantee: Files are processed on localhost and not transmitted to any external AI API.
        </span>
      </div>
    </div>
  );
};
