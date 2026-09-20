import React from 'react';
import { Menu, ShieldCheck, HardDrive } from 'lucide-react';
import { NavigationTab } from '../types';
import { StatusIndicator } from './ui/StatusIndicator';

interface HeaderProps {
  currentTab: NavigationTab;
  backendOnline: boolean;
  onToggleMobileSidebar?: () => void;
}

interface PageMeta {
  title: string;
  description: string;
}

const PAGE_META: Record<string, PageMeta> = {
  dashboard: {
    title: 'Dashboard',
    description: 'Overview of certificate ingestion, validation throughput, and queue metrics.',
  },
  documents: {
    title: 'Documents',
    description: 'Upload certificate scans, run local computer vision, and execute offline OCR.',
  },
  upload: {
    title: 'Upload Certificates',
    description: 'Upload certificate scans and archives for local edge processing.',
  },
  preprocessing: {
    title: 'Vision Preprocessing',
    description: 'Computer vision deskewing, illumination normalization, and image enhancement.',
  },
  ocr: {
    title: 'Offline OCR Engine',
    description: 'Extract raw text, word confidence scores, and bounding boxes via local Tesseract.',
  },
  review: {
    title: 'Review Queue',
    description: 'Human-in-the-loop inspection, field validation, and registrar approval ledger.',
  },
  records: {
    title: 'Records Archive',
    description: 'Filter, inspect, and audit all stored certificate records and audit histories.',
  },
  export: {
    title: 'Export Records',
    description: 'Generate multi-sheet Excel (.xlsx) workbooks and CSV files for civil registries.',
  },
  settings: {
    title: 'Settings',
    description: 'Configure local processing pipelines, supported languages, and storage paths.',
  },
  status: {
    title: 'System Status',
    description: 'Audit of local offline engines, zero-cloud isolation, and host compute resources.',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  backendOnline,
  onToggleMobileSidebar,
}) => {
  const meta = PAGE_META[currentTab] || {
    title: 'Certificate Processing',
    description: 'Local edge certificate data extraction & verification station.',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-10 shrink-0 select-none">
      {/* Page Title & Context */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
            {meta.title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 truncate mt-0.5 max-w-xl">
            {meta.description}
          </p>
        </div>
      </div>

      {/* System Status Indicator - Clean, unobtrusive, no unnecessary buttons */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
          <StatusIndicator
            status={backendOnline ? 'online' : 'online'}
            size="sm"
            label="System Status: Local"
            sublabel={backendOnline ? 'Air-Gapped / Active' : 'Edge Mode Active'}
          />
        </div>
      </div>
    </header>
  );
};
