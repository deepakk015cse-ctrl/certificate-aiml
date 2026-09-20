import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Globe,
  HardDrive,
  RefreshCw,
  Terminal,
  FileCheck2,
  Lock,
  FolderOpen,
} from 'lucide-react';
import { SystemStatus } from '../types';
import { fetchSystemStatus } from '../services/api';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  LoadingState,
} from '../components/ui';

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSystemStatus();
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div id="settings-page-container" className="max-w-4xl mx-auto space-y-6">
      {/* 1. Processing Configuration Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Pipeline & OCR Configuration</CardTitle>
            <CardDescription>
              Local inference configurations, pluggable engine strategies, and language packs.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadStatus}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Reload Config
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Default OCR Engine
              </span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                {status?.ocr_engine.name || 'Tesseract OCR (Engine 1)'}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Architecture supports swappable backends (PaddleOCR, EasyOCR) via standard interface.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Confidence Thresholding
              </span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                65% Minimum Score
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Scans scoring below 65% average confidence are automatically flagged for human review.
              </p>
            </div>
          </div>

          {/* Installed Languages */}
          <div>
            <span className="text-xs font-semibold text-slate-700 block mb-2">
              Configured Languages for Certificate Analysis
            </span>
            <div className="flex flex-wrap gap-2">
              {status?.supported_languages ? (
                Object.entries(status.supported_languages).map(([code, name]) => (
                  <Badge key={code} variant="neutral" size="md">
                    <strong className="uppercase mr-1">{code}:</strong> {name}
                  </Badge>
                ))
              ) : (
                <Badge variant="neutral" size="md">
                  English (eng), Spanish (spa), French (fra), German (deu), Hindi (hin)
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Computer Vision Pipeline Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Computer Vision Enhancement Steps</CardTitle>
          <CardDescription>
            Algorithms applied automatically during certificate ingestion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {[
              'Hough Line Transform Skew Detection & Auto-Rotation',
              'CLAHE (Contrast Limited Adaptive Histogram Equalization)',
              'Bilateral Edge-Preserving Denoising',
              'Morphological Background Gradient Illumination Normalization',
            ].map((step, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-700 font-medium">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Storage Root Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Storage Directory & Retention</CardTitle>
          <CardDescription>
            Archival locations for processed certificates and audit logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-800 block">Certificate Storage Path</span>
              <span className="text-slate-500 font-mono text-[11px]">
                {status?.environment.storage_root || './backend/storage/documents'}
              </span>
            </div>
            <Badge variant="success" size="sm">
              Local Filesystem
            </Badge>
          </div>

          <div className="text-[11px] text-slate-500">
            Audit logs and verified records are persisted locally in accordance with academic registrar standards.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
