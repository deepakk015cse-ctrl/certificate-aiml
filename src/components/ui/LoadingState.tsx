import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  submessage?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  submessage,
}) => {
  return (
    <div className="p-12 text-center flex flex-col items-center justify-center">
      <Loader2 className="w-6 h-6 text-slate-700 animate-spin mb-3" />
      <div className="text-xs font-semibold text-slate-800">{message}</div>
      {submessage && <div className="text-[11px] text-slate-500 mt-0.5">{submessage}</div>}
    </div>
  );
};
