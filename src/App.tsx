import React, { useState, useEffect } from 'react';
import { NavigationTab, DocumentRecord, DashboardStats } from './types';
import {
  fetchDocuments,
  fetchDashboardStats,
  fetchHealth,
} from './services/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ReviewPage } from './pages/ReviewPage';
import { RecordsPage } from './pages/RecordsPage';
import { ExportPage } from './pages/ExportPage';
import { SettingsPage } from './pages/SettingsPage';
import { SystemStatusPage } from './pages/SystemStatusPage';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    total_documents: 0,
    processed: 0,
    awaiting_review: 0,
    approved: 0,
    rejected: 0,
    low_confidence: 0,
    average_ocr_confidence: 0,
  });
  const [backendOnline, setBackendOnline] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const loadData = async () => {
    try {
      try {
        const health = await fetchHealth();
        setBackendOnline(health?.status?.includes('healthy') ?? true);
      } catch {
        setBackendOnline(true);
      }

      const docs = await fetchDocuments();
      setDocuments(docs);

      const st = await fetchDashboardStats();
      setStats(st);

      // Synchronize activeDoc
      if (docs.length > 0) {
        setActiveDoc((prev) => {
          if (!prev) return docs[0];
          const found = docs.find((d) => d.id === prev.id);
          return found || docs[0];
        });
      }
    } catch (e) {
      console.error('Failed to synchronize certificate records:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadSuccess = (doc: DocumentRecord) => {
    setDocuments((prev) => [doc, ...prev]);
    setActiveDoc(doc);
    loadData();
  };

  const handleUpdateDocument = (updated: DocumentRecord) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setActiveDoc(updated);
    fetchDashboardStats().then(setStats);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased selection:bg-slate-200">
      {/* 1. Header across the top */}
      <Header
        currentTab={currentTab}
        backendOnline={backendOnline}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((open) => !open)}
      />

      {/* 2. Body: Sidebar on the left, Main content on the right */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          totalDocs={documents.length}
          awaitingReviewCount={stats.awaiting_review}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentTab === 'dashboard' && (
            <DashboardPage
              stats={stats}
              recentDocs={documents}
              onNavigate={setCurrentTab}
              onSelectDoc={setActiveDoc}
            />
          )}

          {(currentTab === 'documents' ||
            currentTab === 'upload' ||
            currentTab === 'preprocessing' ||
            currentTab === 'ocr') && (
            <DocumentsPage
              documents={documents}
              activeDoc={activeDoc}
              onSelectDoc={setActiveDoc}
              onUploadSuccess={handleUploadSuccess}
              onUpdateDocument={handleUpdateDocument}
              onNavigate={setCurrentTab}
              onRefresh={loadData}
            />
          )}

          {currentTab === 'review' && (
            <ReviewPage
              document={activeDoc}
              documents={documents}
              onSelectDoc={setActiveDoc}
              onUpdateDocument={handleUpdateDocument}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'records' && (
            <RecordsPage
              documents={documents}
              onSelectDoc={setActiveDoc}
              onNavigate={setCurrentTab}
              onRefresh={loadData}
            />
          )}

          {currentTab === 'export' && <ExportPage documents={documents} />}

          {currentTab === 'settings' && <SettingsPage />}

          {currentTab === 'status' && (
            <SystemStatusPage backendOnline={backendOnline} />
          )}
        </main>
      </div>
    </div>
  );
}
