import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  indicatorColor?: 'neutral' | 'blue' | 'amber' | 'emerald' | 'rose';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  indicatorColor = 'neutral',
  onClick,
}) => {
  const dotColors = {
    neutral: 'bg-slate-400',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 truncate">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
          {value}
        </div>
        <div className="flex items-center gap-1.5" title="Category status">
          <span className={`w-2 h-2 rounded-full ${dotColors[indicatorColor]}`} />
        </div>
      </div>
    </div>
  );
};
