import React from 'react';
import {
  LayoutDashboard,
  Files,
  CheckCircle2,
  FolderArchive,
  FileSpreadsheet,
  Settings,
  Activity,
  ShieldCheck,
  X,
} from 'lucide-react';
import { NavigationTab } from '../types';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  totalDocs: number;
  awaitingReviewCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'neutral' | 'amber';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  totalDocs,
  awaitingReviewCount = 0,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // Normalize current tab for sidebar highlighting
  const activeNavId: NavigationTab =
    currentTab === 'upload' || currentTab === 'preprocessing' || currentTab === 'ocr'
      ? 'documents'
      : currentTab;

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: Files,
      badge: totalDocs > 0 ? totalDocs : undefined,
      badgeVariant: 'neutral',
    },
    {
      id: 'review',
      label: 'Review Queue',
      icon: CheckCircle2,
      badge: awaitingReviewCount > 0 ? awaitingReviewCount : undefined,
      badgeVariant: 'amber',
    },
    {
      id: 'records',
      label: 'Records',
      icon: FolderArchive,
    },
    {
      id: 'export',
      label: 'Export',
      icon: FileSpreadsheet,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
    {
      id: 'status',
      label: 'System Status',
      icon: Activity,
    },
  ];

  const sidebarContent = (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full shrink-0 select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-100 flex items-center justify-center border border-slate-700 shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white leading-none">
              CertiExtract
            </div>
            <div className="text-[11px] text-slate-400 mt-1 leading-none">
              Offline Certificate Processing
            </div>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isSelected = activeNavId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-slate-800 text-white font-semibold shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isSelected ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${
                    item.badgeVariant === 'amber'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span className="font-mono">CertiExtract v1.2</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Air-Gapped
          </span>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:flex h-full shrink-0">{sidebarContent}</div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 flex h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
