import React from 'react';
import { DocumentStatus } from '../types';

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const configMap: Record<DocumentStatus, { label: string; bg: string; text: string; dot: string }> = {
    UPLOADED: {
      label: 'Uploaded',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      dot: 'bg-slate-400',
    },
    PREPROCESSED: {
      label: 'Preprocessed',
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      dot: 'bg-sky-500',
    },
    OCR_EXTRACTED: {
      label: 'OCR Extracted',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500',
    },
    AWAITING_REVIEW: {
      label: 'Awaiting Review',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      dot: 'bg-amber-500',
    },
    APPROVED: {
      label: 'Approved',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      dot: 'bg-emerald-500',
    },
    REJECTED: {
      label: 'Rejected',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
    },
    LOW_CONFIDENCE: {
      label: 'Low Confidence',
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      dot: 'bg-orange-500',
    },
  };

  const current = configMap[status] || configMap.UPLOADED;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${current.bg} ${current.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
};
