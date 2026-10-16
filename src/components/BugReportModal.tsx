import React, { useState, useEffect, useRef } from 'react';
import {
  Bug,
  X,
  Send,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Paperclip,
  ZoomIn
} from 'lucide-react';
import { BugCategory, BugSeverity, BugEnvironmentInfo } from '../types/bugReport';
import { createBugReport, uploadScreenshot } from '../services/bugReportService';
import { toast } from 'sonner';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenManager?: () => void;
  environmentInfo?: BugEnvironmentInfo;
}

const CATEGORIES: { id: BugCategory; label: string }[] = [
  { id: 'lighting_walls', label: 'Lighting, Walls & Doors' },
  { id: 'fog_of_war', label: 'Fog of War & Vision' },
  { id: 'room_zones', label: 'Room Polygon Zones & Briefings' },
  { id: 'campaign', label: 'Campaign Manager & Scenes' },
  { id: 'combat_tokens', label: 'Combat Tracker & Tokens' },
  { id: 'compendium_monsters', label: 'Compendium & Monsters' },
  { id: 'ai_suite', label: 'AI Suite & Narration' },
  { id: 'performance', label: 'Performance & Latency' },
  { id: 'ui_layout', label: 'UI & Layout' },
  { id: 'other', label: 'Other Issue' }
];

const SEVERITIES: { id: BugSeverity; label: string; color: string; badge: string }[] = [
  { id: 'low', label: 'Low', color: 'text-zinc-400', badge: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  { id: 'medium', label: 'Medium', color: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 'high', label: 'High', color: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { id: 'critical', label: 'Critical', color: 'text-red-400', badge: 'bg-red-500/20 text-red-300 border-red-500/40' }
];

export const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  onClose,
  onOpenManager,
  environmentInfo
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BugCategory>('lighting_walls');
  const [severity, setSeverity] = useState<BugSeverity>('medium');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [dmNotes, setDmNotes] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Screenshot upload states
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = (file: File, fallbackName?: string) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files (PNG, JPG, WebP, GIF) are supported.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Screenshot must be smaller than 15MB.');
      return;
    }

    const name = file.name || fallbackName || `screenshot_${Date.now()}.png`;
    setScreenshotFile(file);
    setScreenshotName(name);

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setScreenshotName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Listen for Ctrl+V clipboard paste when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleProcessFile(file, `clipboard_snip_${Date.now()}.png`);
            toast.success('Screenshot captured from clipboard!');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please provide a brief bug summary');
      return;
    }
    if (!description.trim()) {
      toast.error('Please describe what happened');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalScreenshotUrl: string | undefined = undefined;

      if (screenshotFile || screenshotPreview) {
        setIsUploadingScreenshot(true);
        try {
          finalScreenshotUrl = await uploadScreenshot(
            screenshotFile || screenshotPreview!,
            screenshotName
          );
        } catch (uploadErr) {
          console.warn('Screenshot upload warning, falling back to preview URL:', uploadErr);
          finalScreenshotUrl = screenshotPreview || undefined;
        } finally {
          setIsUploadingScreenshot(false);
        }
      }

      const env: BugEnvironmentInfo = includeDiagnostics && environmentInfo ? environmentInfo : {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        screenResolution: `${window.innerWidth}x${window.innerHeight}`
      };

      await createBugReport({
        title: title.trim(),
        category,
        severity,
        description: description.trim(),
        stepsToReproduce: stepsToReproduce.trim() || undefined,
        dmNotes: dmNotes.trim() || undefined,
        screenshotUrl: finalScreenshotUrl,
        screenshotName: screenshotName.trim() || undefined,
        environment: env
      });

      toast.success('Bug report and notes logged successfully');
      // Reset form
      setTitle('');
      setDescription('');
      setStepsToReproduce('');
      setDmNotes('');
      handleRemoveScreenshot();
      onClose();
    } catch (err) {
      console.error('Failed to submit bug report:', err);
      toast.error('Could not submit bug report to server, but saved locally.');
      onClose();
    } finally {
      setIsSubmitting(false);
      setIsUploadingScreenshot(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Report a Bug & Issue Notes
              </h2>
              <p className="text-xs text-zinc-400">
                Log technical glitches, lighting anomalies, or feature requests with auto-diagnostics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenManager && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenManager();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
                title="View previously reported bugs and DM developer notes"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>View Bug Log</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Bug Summary / Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wall eraser not deleting door segment, or fog lag with 20 tokens"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/60 transition"
            />
          </div>

          {/* Category & Severity Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BugCategory)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-red-500/60 transition"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Severity
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {SEVERITIES.map(s => {
                  const isSelected = severity === s.id;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSeverity(s.id)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                        isSelected
                          ? `${s.badge} ring-1 ring-current`
                          : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Detailed Description <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what happened, what you observed on screen, or error messages encountered..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/60 transition resize-none"
            />
          </div>

          {/* Steps to Reproduce */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Steps to Reproduce (Optional)
            </label>
            <textarea
              rows={2}
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              placeholder="1. Open scene X&#10;2. Click Wall Eraser&#10;3. Drag over wall node"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/60 transition resize-none"
            />
          </div>

          {/* Screenshot Upload Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                Screenshot / Visual Evidence (Optional)
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                PNG, JPG, WebP • Paste with Ctrl+V
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  handleProcessFile(files[0]);
                }
              }}
            />

            {!screenshotPreview ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    handleProcessFile(files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                  isDragging
                    ? 'border-sky-500 bg-sky-500/10 text-sky-200'
                    : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-300">
                  <UploadCloud className="w-5 h-5 text-sky-400" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-zinc-200">
                    <span className="text-sky-400 font-semibold underline">Click to upload</span> or drag and drop
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Or capture a snip with <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">Win+Shift+S</kbd> and paste anywhere with <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">Ctrl+V</kbd>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 flex items-center gap-3">
                <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-zinc-700 shrink-0 bg-black group">
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    className="w-full h-full object-cover"
                  />
                  <a
                    href={screenshotPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition cursor-pointer"
                    title="Open full preview"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </a>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200 truncate">
                      {screenshotName || 'Attached Screenshot'}
                    </span>
                    {screenshotFile && (
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                        ({(screenshotFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Image ready for report upload</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveScreenshot}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition cursor-pointer"
                    title="Remove screenshot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DM Secret Notes / Resolution Idea */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              DM / Developer Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={dmNotes}
              onChange={(e) => setDmNotes(e.target.value)}
              placeholder="Personal reminders, suspected code location, or potential fix..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500/60 transition resize-none"
            />
          </div>

          {/* Diagnostics Card */}
          <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Active Session Telemetry
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-zinc-200">
                <input
                  type="checkbox"
                  checked={includeDiagnostics}
                  onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                  className="rounded border-zinc-700 text-red-500 focus:ring-red-500"
                />
                Include Environment Info
              </label>
            </div>

            {includeDiagnostics && environmentInfo && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-zinc-400">
                <div className="p-1.5 rounded bg-zinc-950/60 border border-zinc-800">
                  <div className="text-[9px] text-zinc-500 uppercase">Active Scene</div>
                  <div className="text-zinc-200 truncate">{environmentInfo.activeSceneTitle || 'None'}</div>
                </div>
                <div className="p-1.5 rounded bg-zinc-950/60 border border-zinc-800">
                  <div className="text-[9px] text-zinc-500 uppercase">Tokens / Walls</div>
                  <div className="text-zinc-200">{environmentInfo.tokenCount ?? 0} tokens / {environmentInfo.wallCount ?? 0} walls</div>
                </div>
                <div className="p-1.5 rounded bg-zinc-950/60 border border-zinc-800">
                  <div className="text-[9px] text-zinc-500 uppercase">Room Zones</div>
                  <div className="text-zinc-200">{environmentInfo.zoneCount ?? 0} zones</div>
                </div>
                <div className="p-1.5 rounded bg-zinc-950/60 border border-zinc-800">
                  <div className="text-[9px] text-zinc-500 uppercase">Resolution</div>
                  <div className="text-zinc-200 truncate">{environmentInfo.screenResolution || `${window.innerWidth}x${window.innerHeight}`}</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-900/30 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isUploadingScreenshot ? (
                <>Uploading Screenshot...</>
              ) : isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Bug Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
