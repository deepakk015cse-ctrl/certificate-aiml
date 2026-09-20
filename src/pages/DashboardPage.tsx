import React from 'react';
import {
  Files,
  Wand2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  UploadCloud,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { DashboardStats, DocumentRecord, NavigationTab } from '../types';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { Button, Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui';

interface DashboardPageProps {
  stats: DashboardStats;
  recentDocs: DocumentRecord[];
  onNavigate: (tab: NavigationTab) => void;
  onSelectDoc: (doc: DocumentRecord) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  recentDocs,
  onNavigate,
  onSelectDoc,
}) => {
  const displayDocs = recentDocs.slice(0, 5);

  return (
    <div id="dashboard-container" className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Metric Cards Grid (Exactly the 6 required cards) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Document Ingestion & Verification Metrics
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Real-Time Edge Ledger
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <StatCard
            label="Total Documents"
            value={stats.total_documents}
            icon={Files}
            indicatorColor="neutral"
            onClick={() => onNavigate('records')}
          />
          <StatCard
            label="Processed"
            value={stats.processed}
            icon={Wand2}
            indicatorColor="blue"
            onClick={() => onNavigate('documents')}
          />
          <StatCard
            label="Awaiting Review"
            value={stats.awaiting_review}
            icon={Clock}
            indicatorColor="amber"
            onClick={() => onNavigate('review')}
          />
          <StatCard
            label="Approved"
            value={stats.approved}
            icon={CheckCircle2}
            indicatorColor="emerald"
            onClick={() => onNavigate('records')}
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            icon={XCircle}
            indicatorColor="rose"
            onClick={() => onNavigate('records')}
          />
          <StatCard
            label="Low Confidence"
            value={stats.low_confidence}
            icon={AlertTriangle}
            indicatorColor="amber"
            onClick={() => onNavigate('records')}
          />
        </div>
      </div>

      {/* 2. Main Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Documents Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle>Recent Certificates</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Recently ingested scans awaiting inspection or verified.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('records')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View All Records
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {displayDocs.length === 0 ? (
              <EmptyState
                icon={Files}
                title="No certificate scans registered"
                description="Upload certificates or import samples to initiate offline processing."
                action={
                  <Button size="sm" onClick={() => onNavigate('documents')} leftIcon={<UploadCloud className="w-3.5 h-3.5" />}>
                    Upload Certificates
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Ingested</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {displayDocs.map((doc) => {
                    const avgConf = doc.ocr?.average_confidence;
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="font-semibold text-slate-900 truncate max-w-[200px]" title={doc.original_filename}>
                            {doc.original_filename}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {doc.id}</div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={doc.status} />
                        </TableCell>
                        <TableCell>
                          {avgConf !== undefined ? (
                            <span className="font-mono text-xs font-semibold text-slate-700">
                              {avgConf.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500">
                            {doc.created_at.substring(0, 10)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onSelectDoc(doc);
                              onNavigate('review');
                            }}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right 1 Col: Platform Status & Quick Overview */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Offline Engine Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">OCR Engine:</span>
                  <span className="font-semibold text-slate-800 font-mono">Local Tesseract</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Translation:</span>
                  <span className="font-semibold text-slate-800 font-mono">Local Dictionary / Rule Engine</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Extraction:</span>
                  <span className="font-semibold text-slate-800 font-mono">Local Regex & Layout NER</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Storage:</span>
                  <span className="font-semibold text-slate-800 font-mono">Local Edge Disk</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Internet Required:</span>
                  <span className="font-bold text-emerald-700 font-mono">No (Air-Gapped)</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => onNavigate('status')}
                >
                  View Full Diagnostics
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Workflow Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-start"
                leftIcon={<UploadCloud className="w-4 h-4" />}
                onClick={() => onNavigate('documents')}
              >
                Upload Certificates
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Clock className="w-4 h-4 text-amber-600" />}
                onClick={() => onNavigate('review')}
              >
                Inspect Review Queue ({stats.awaiting_review})
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
