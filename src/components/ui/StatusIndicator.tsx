import React from 'react';

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'processing';
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  sublabel,
  size = 'md',
}) => {
  const dotColor = {
    online: 'bg-emerald-500 ring-emerald-500/20',
    offline: 'bg-slate-400 ring-slate-400/20',
    warning: 'bg-amber-500 ring-amber-500/20',
    processing: 'bg-blue-500 ring-blue-500/20 animate-pulse',
  }[status];

  const dotSize = size === 'sm' ? 'w-2 h-2 ring-2' : 'w-2.5 h-2.5 ring-4';

  return (
    <div className="inline-flex items-center gap-2 select-none">
      <span className={`rounded-full ${dotSize} ${dotColor} shrink-0`} />
      {(label || sublabel) && (
        <div className="flex flex-col leading-tight">
          {label && (
            <span className="text-xs font-semibold text-slate-800">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-[10px] text-slate-500 font-mono">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
