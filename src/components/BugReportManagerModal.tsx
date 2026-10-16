import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  X,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
  Save,
  Bug,
  Activity,
  Layers,
  Sparkles,
  Image as ImageIcon,
  ZoomIn
} from 'lucide-react';
import { BugReport, BugStatus, BugCategory, BugSeverity } from '../types/bugReport';
import { getBugReports, updateBugReport, deleteBugReport } from '../services/bugReportService';
import { toast } from 'sonner';

interface BugReportManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReportModal?: () => void;
}

const STATUS_CONFIG: Record<BugStatus, { label: string; badge: string; color: string }> = {
  open: { label: 'Open', badge: 'bg-red-500/20 text-red-300 border-red-500/40', color: 'text-red-400' },
  investigating: { label: 'Investigating', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', color: 'text-amber-400' },
  resolved: { label: 'Resolved', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', color: 'text-emerald-400' }
};

const SEVERITY_CONFIG: Record<BugSeverity, { label: string; badge: string }> = {
  low: { label: 'Low', badge: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  medium: { label: 'Medium', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  high: { label: 'High', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  critical: { label: 'Critical', badge: 'bg-red-500/20 text-red-300 border-red-500/40' }
};

export const BugReportManagerModal: React.FC<BugReportManagerModalProps> = ({
  isOpen,
  onClose,
  onOpenReportModal
}) => {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BugStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | BugCategory>('all');

  // Editing state for selected report
  const [activeDmNotes, setActiveDmNotes] = useState('');
  const [activeStatus, setActiveStatus] = useState<BugStatus>('open');
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const list = await getBugReports();
      setReports(list);
      if (list.length > 0 && !selectedReportId) {
        setSelectedReportId(list[0].id);
        setActiveDmNotes(list[0].dmNotes || '');
        setActiveStatus(list[0].status || 'open');
      }
    } catch (err) {
      console.error('Failed to load bug reports:', err);
      toast.error('Failed to fetch bug reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReports();
    }
  }, [isOpen]);

  const selectedReport = useMemo(() => {
    return reports.find(r => r.id === selectedReportId) || null;
  }, [reports, selectedReportId]);

  useEffect(() => {
    if (selectedReport) {
      setActiveDmNotes(selectedReport.dmNotes || '');
      setActiveStatus(selectedReport.status || 'open');
    }
  }, [selectedReport]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = r.title.toLowerCase().includes(q);
        const inDesc = r.description.toLowerCase().includes(q);
        const inNotes = (r.dmNotes || '').toLowerCase().includes(q);
        const inScene = (r.environment?.activeSceneTitle || '').toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inNotes && !inScene) return false;
      }
      return true;
    });
  }, [reports, statusFilter, categoryFilter, searchQuery]);

  if (!isOpen) return null;

  const handleSaveNotes = async () => {
    if (!selectedReport) return;
    setIsSaving(true);
    try {
      await updateBugReport(selectedReport.id, {
        dmNotes: activeDmNotes,
        status: activeStatus
      });
      setReports(prev =>
        prev.map(r =>
          r.id === selectedReport.id
            ? { ...r, dmNotes: activeDmNotes, status: activeStatus, updatedAt: Date.now() }
            : r
        )
      );
      toast.success('Report updated successfully');
    } catch (err) {
      console.error('Failed to update report:', err);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bug report?')) return;
    try {
      await deleteBugReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      if (selectedReportId === id) {
        setSelectedReportId(null);
      }
      toast.success('Bug report deleted');
    } catch (err) {
      console.error('Failed to delete report:', err);
      toast.error('Failed to delete bug report');
    }
  };

  const handleCopyMarkdown = (report: BugReport) => {
    const md = `### Bug Report: ${report.title}
- **Status:** ${report.status.toUpperCase()}
- **Severity:** ${report.severity.toUpperCase()}
- **Category:** ${report.category}
- **Date:** ${new Date(report.createdAt).toLocaleString()}
- **Active Scene:** ${report.environment?.activeSceneTitle || 'N/A'}
- **Tokens / Walls / Zones:** ${report.environment?.tokenCount ?? 'N/A'} tokens / ${report.environment?.wallCount ?? 'N/A'} walls / ${report.environment?.zoneCount ?? 'N/A'} zones
${report.screenshotUrl ? `- **Screenshot:** ${report.screenshotUrl}\n` : ''}
#### Description:
${report.description}

${report.stepsToReproduce ? `#### Steps to Reproduce:\n${report.stepsToReproduce}\n` : ''}
${report.screenshotUrl ? `#### Attached Screenshot:\n![${report.screenshotName || 'Screenshot'}](${report.screenshotUrl})\n` : ''}
${report.dmNotes ? `#### DM Notes:\n${report.dmNotes}\n` : ''}`;

    navigator.clipboard.writeText(md);
    toast.success('Markdown copied to clipboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Bug Reports & DM Notes Manager
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {reports.length} total
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Track reported glitches, inspect session diagnostics, and write resolution notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenReportModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReportModal();
                }}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md shadow-red-900/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Bug className="w-3.5 h-3.5" />
                <span>+ Report New Bug</span>
              </button>
            )}

            <button
              onClick={loadReports}
              disabled={loading}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Refresh reports list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2.5 bg-zinc-900/40 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by title, description, or notes..."
              className="w-full bg-transparent text-zinc-200 placeholder-zinc-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              {(['all', 'open', 'investigating', 'resolved'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-zinc-800 text-zinc-100 shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Split: List & Details */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Bug List */}
          <div className="w-80 sm:w-96 border-r border-zinc-800 flex flex-col bg-zinc-950/40">
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/80">
              {loading ? (
                <div className="p-8 text-center text-xs text-zinc-500">Loading reports...</div>
              ) : filteredReports.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No bug reports found matching filters.
                </div>
              ) : (
                filteredReports.map(report => {
                  const isSelected = report.id === selectedReportId;
                  const statusConf = STATUS_CONFIG[report.status || 'open'];
                  const sevConf = SEVERITY_CONFIG[report.severity || 'medium'];

                  return (
                    <div
                      key={report.id}
                      onClick={() => {
                        setSelectedReportId(report.id);
                        setActiveDmNotes(report.dmNotes || '');
                        setActiveStatus(report.status || 'open');
                      }}
                      className={`p-3.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 border-l-2 border-amber-500'
                          : 'hover:bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-zinc-200 line-clamp-1">
                          {report.title}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${statusConf.badge}`}>
                          {statusConf.label}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2">
                        {report.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span className={`px-1 rounded border ${sevConf.badge}`}>
                          {sevConf.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {report.screenshotUrl && (
                            <span className="flex items-center gap-1 text-sky-400" title="Includes attached screenshot">
                              <ImageIcon className="w-3 h-3" />
                              <span className="text-[9px]">IMG</span>
                            </span>
                          )}
                          <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Bug Inspector & DM Notes */}
          <div className="flex-1 flex flex-col bg-zinc-900/20 overflow-y-auto">
            {selectedReport ? (
              <div className="p-6 space-y-6">
                {/* Header Card */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100 mb-1">
                        {selectedReport.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                        <span>ID: {selectedReport.id}</span>
                        <span>•</span>
                        <span>Created: {new Date(selectedReport.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyMarkdown(selectedReport)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition"
                        title="Copy as Markdown"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(selectedReport.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition"
                        title="Delete Bug Report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status & Severity Badges */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Status:</span>
                      <select
                        value={activeStatus}
                        onChange={(e) => setActiveStatus(e.target.value as BugStatus)}
                        className="px-2 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-200 font-medium"
                      >
                        <option value="open">Open</option>
                        <option value="investigating">Investigating</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Category:</span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs border border-zinc-700 capitalize">
                        {selectedReport.category.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Severity:</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs border ${SEVERITY_CONFIG[selectedReport.severity].badge}`}>
                        {SEVERITY_CONFIG[selectedReport.severity].label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description & Reproduction Steps */}
                <div className="space-y-4">
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                      Observed Behavior
                    </h4>
                    <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {selectedReport.description}
                    </p>
                  </div>

                  {selectedReport.stepsToReproduce && (
                    <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Steps to Reproduce
                      </h4>
                      <div className="text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {selectedReport.stepsToReproduce}
                      </div>
                    </div>
                  )}
                </div>

                {/* Attached Screenshot / Visual Evidence Card */}
                {selectedReport.screenshotUrl && (
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" />
                        Attached Screenshot / Visual Evidence
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLightboxImageUrl(selectedReport.screenshotUrl!)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 hover:text-white border border-zinc-700 transition flex items-center gap-1 cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
                          <span>Enlarge</span>
                        </button>
                        <a
                          href={selectedReport.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition cursor-pointer"
                          title="Open original in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <div
                      onClick={() => setLightboxImageUrl(selectedReport.screenshotUrl!)}
                      className="group relative max-h-80 w-fit rounded-lg overflow-hidden border border-zinc-700/80 bg-black cursor-pointer shadow-lg"
                    >
                      <img
                        src={selectedReport.screenshotUrl}
                        alt={selectedReport.screenshotName || 'Attached Screenshot'}
                        className="max-h-80 w-auto object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-medium text-xs">
                        <ZoomIn className="w-5 h-5 text-sky-400" />
                        <span>Click to view full size</span>
                      </div>
                    </div>
                    {selectedReport.screenshotName && (
                      <div className="text-[10px] font-mono text-zinc-500 mt-1.5 truncate">
                        File: {selectedReport.screenshotName}
                      </div>
                    )}
                  </div>
                )}

                {/* Environment / Telemetry Box */}
                {selectedReport.environment && (
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      Captured Diagnostics
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                        <div className="text-[10px] text-zinc-500">Scene</div>
                        <div className="text-zinc-200 truncate">{selectedReport.environment.activeSceneTitle || 'None'}</div>
                      </div>
                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                        <div className="text-[10px] text-zinc-500">Tokens / Walls</div>
                        <div className="text-zinc-200">{selectedReport.environment.tokenCount ?? 0} tokens / {selectedReport.environment.wallCount ?? 0} walls</div>
                      </div>
                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                        <div className="text-[10px] text-zinc-500">Room Zones</div>
                        <div className="text-zinc-200">{selectedReport.environment.zoneCount ?? 0} zones</div>
                      </div>
                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                        <div className="text-[10px] text-zinc-500">Resolution</div>
                        <div className="text-zinc-200 truncate">{selectedReport.environment.screenResolution || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DM Notes Section */}
                <div className="bg-zinc-950/80 border border-amber-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      DM & Developer Notes / Resolution Log
                    </h4>
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      disabled={isSaving}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save Notes & Status'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={activeDmNotes}
                    onChange={(e) => setActiveDmNotes(e.target.value)}
                    placeholder="Write your private DM notes, root cause analysis, or resolution checklist here..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-zinc-500">
                Select a bug report from the list to view details and notes.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div
            className="relative max-w-5xl max-h-[92vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 text-xs text-zinc-400">
              <span className="truncate max-w-md font-mono text-zinc-300">
                {selectedReport?.screenshotName || 'Screenshot Lightbox Preview'}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Raw / Full Size</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImageUrl(null)}
                  className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <img
              src={lightboxImageUrl}
              alt="Enlarged screenshot"
              className="max-w-full max-h-[84vh] rounded-xl border border-zinc-700 object-contain shadow-2xl bg-zinc-950"
            />
          </div>
        </div>
      )}
    </div>
  );
};
