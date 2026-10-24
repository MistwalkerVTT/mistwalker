import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Tag, 
  BookOpen, 
  ShieldAlert, 
  Palette, 
  Sparkles,
  MapPin,
  FileText,
  Search,
  Check,
  RotateCcw
} from 'lucide-react';
import { RoomAnnotation, ChapterPdfDigest } from '../types';
import { chatWithLore } from '../services/aiService';

interface RoomHotspotEditorModalProps {
  annotation?: RoomAnnotation | null;
  initialAnnotation?: RoomAnnotation | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: RoomAnnotation) => void;
  onDelete?: (id: string) => void;
  onRedrawPolygon?: (annotation: RoomAnnotation) => void;
  loreSources?: { id: string; name: string; type: 'text' | 'pdf'; content: string }[];
  chapterPdfDigest?: ChapterPdfDigest | null;
}

const PRESET_COLORS = [
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Indigo', hex: '#6366f1' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Cyan', hex: '#06b6d4' },
  { label: 'Purple', hex: '#a855f7' }
];

export const RoomHotspotEditorModal: React.FC<RoomHotspotEditorModalProps> = ({
  annotation,
  initialAnnotation,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onRedrawPolygon,
  loreSources = [],
  chapterPdfDigest
}) => {
  const currentAnno = annotation || initialAnnotation || null;
  const [roomNumber, setRoomNumber] = useState('');
  const [roomName, setRoomName] = useState('');
  const [boxedText, setBoxedText] = useState('');
  const [dmNotes, setDmNotes] = useState('');
  const [color, setColor] = useState('#f59e0b');
  const [pdfSection, setPdfSection] = useState('');
  const [pdfPage, setPdfPage] = useState('');
  const [isPullingPdf, setIsPullingPdf] = useState(false);
  const [pullPdfSuccess, setPullPdfSuccess] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);

  // New chapter pdf auto-matching and selection states
  const [showRoomsDropdown, setShowRoomsDropdown] = useState(false);
  const [digestMatchFound, setDigestMatchFound] = useState<any | null>(null);

  useEffect(() => {
    if (currentAnno) {
      setRoomNumber(currentAnno.roomNumber || '');
      setRoomName(currentAnno.roomName || (currentAnno.label?.includes('-') ? currentAnno.label.split('-')[1]?.trim() : currentAnno.label) || '');
      setBoxedText(currentAnno.boxedText || '');
      setDmNotes(currentAnno.dmNotes || '');
      setColor(currentAnno.color || '#f59e0b');
      setPdfSection(currentAnno.pdfSection || '');
      setPdfPage(currentAnno.pdfPage ? String(currentAnno.pdfPage) : '');
    } else {
      setRoomNumber('');
      setRoomName('');
      setBoxedText('');
      setDmNotes('');
      setColor('#f59e0b');
      setPdfSection('');
      setPdfPage('');
    }
    setIsPullingPdf(false);
    setPullPdfSuccess(false);
    setPullError(null);
    setShowRoomsDropdown(false);
    setDigestMatchFound(null);
  }, [currentAnno, isOpen]);

  // Handle active matching when roomNumber is typed
  useEffect(() => {
    if (chapterPdfDigest?.rooms && roomNumber.trim()) {
      const cleanNum = roomNumber.trim().toLowerCase();
      const match = chapterPdfDigest.rooms.find(
        r => r.roomNumber.toLowerCase() === cleanNum ||
             r.roomNumber.toLowerCase() === `g${cleanNum}` ||
             `g${r.roomNumber.toLowerCase()}` === cleanNum
      );
      setDigestMatchFound(match || null);
    } else {
      setDigestMatchFound(null);
    }
  }, [roomNumber, chapterPdfDigest]);

  const handleApplyDigestRoom = (r: any) => {
    setRoomNumber(r.roomNumber);
    setRoomName(r.roomName);
    setBoxedText(r.boxedText || '');
    setDmNotes(r.dmNotes || '');
    if (r.sceneTitle) {
      setPdfSection(r.sceneTitle);
    } else if (chapterPdfDigest?.chapterTitle) {
      setPdfSection(`${chapterPdfDigest.chapterTitle} - Room ${r.roomNumber}`);
    } else {
      setPdfSection(`Room ${r.roomNumber}`);
    }
    setDigestMatchFound(r);
    setShowRoomsDropdown(false);
  };

  if (!isOpen || !currentAnno) return null;

  const handlePullFromCampaignPdf = async () => {
    const queryTerm = [roomNumber, roomName].filter(Boolean).join(' ').trim() || currentAnno.label;
    if (!queryTerm) {
      setPullError('Please provide a Room Number or Name first to search the campaign PDF.');
      return;
    }

    if (!loreSources || loreSources.length === 0) {
      setPullError('No campaign PDF or lore sources uploaded yet. Add your campaign PDF in the Lore Master panel on the left sidebar to enable automatic PDF extraction.');
      return;
    }

    setIsPullingPdf(true);
    setPullError(null);

    try {
      const prompt = `You are extracting adventure module room details for "${queryTerm}".
Based strictly on the provided campaign lore and PDF documents, find the section for Area/Room "${queryTerm}".
You MUST extract the EXACT, verbatim read-aloud boxed text under "boxedText", and the EXACT, verbatim room notes, descriptions, secrets, traps, DCs, and statistics under "dmNotes" exactly as they appear word-for-word in the source PDF. DO NOT summarize, paraphrase, interpret, or synthesize. We need EXACTLY what is written in the PDF, with zero interpretation or summary.
Please respond in the following EXACT JSON format (and nothing else, no markdown fences if possible, or json block):
{
  "roomName": "Extracted Room or Chamber Title",
  "boxedText": "EXACT word-for-word player-facing text from PDF",
  "dmNotes": "EXACT word-for-word DM tactical notes/DC guidelines/secrets from PDF"
}`;

      const responseText = await chatWithLore([], prompt, loreSources);
      
      // Parse JSON from model response
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      try {
        const parsed = JSON.parse(cleanJson);
        if (parsed.roomName && !roomName.trim()) {
          setRoomName(parsed.roomName);
        }
        if (parsed.boxedText) {
          setBoxedText(parsed.boxedText);
        }
        if (parsed.dmNotes) {
          setDmNotes(parsed.dmNotes);
        }
        setPullPdfSuccess(true);
        setTimeout(() => setPullPdfSuccess(false), 3000);
      } catch (parseErr) {
        // Fallback: populate dmNotes with raw response if JSON parsing fails
        if (responseText) {
          setDmNotes(prev => prev ? `${prev}\n\n--- Extracted from Campaign PDF ---\n${responseText}` : responseText);
          setPullPdfSuccess(true);
          setTimeout(() => setPullPdfSuccess(false), 3000);
        } else {
          setPullError('Could not find specific room entries in the campaign documents.');
        }
      }
    } catch (err: any) {
      console.error('Error pulling from campaign PDF:', err);
      setPullError(err?.message || 'Failed to query campaign documents.');
    } finally {
      setIsPullingPdf(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = roomNumber.trim();
    const cleanName = roomName.trim();
    const combinedLabel = cleanNum && cleanName ? `${cleanNum}: ${cleanName}` : cleanNum || cleanName || 'Room Hotspot';

    onSave({
      ...currentAnno,
      roomNumber: cleanNum || undefined,
      roomName: cleanName || undefined,
      label: combinedLabel,
      boxedText: boxedText.trim(),
      dmNotes: dmNotes.trim(),
      pdfSection: pdfSection.trim() || undefined,
      pdfPage: pdfPage ? parseInt(pdfPage, 10) : undefined,
      color: color || '#f59e0b'
    });
  };

  const hasPolygon = currentAnno.polygonPoints && currentAnno.polygonPoints.length >= 6;

  return (
    <div 
      id="room-hotspot-editor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="room-hotspot-editor-dialog"
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-4 h-4 rounded-md shadow-sm border border-white/20"
              style={{ backgroundColor: color }}
            />
            <div>
              <h2 className="text-sm font-bold text-zinc-100 font-mono flex items-center gap-2">
                <span>Room Hotspot & Zone Annotation</span>
                {hasPolygon && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Polygon Zone ({currentAnno.polygonPoints!.length / 2} pts)
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-zinc-400 font-mono">
                Saved to Firebase for instant DM lookup during campaign run
              </p>
            </div>
          </div>
          <button
            id="btn-close-hotspot-editor"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {/* Room Number & Room Name Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-1 relative">
              <label className="text-xs font-mono font-bold text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Room #</span>
                </span>
                {chapterPdfDigest?.rooms && chapterPdfDigest.rooms.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRoomsDropdown(!showRoomsDropdown)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold font-mono"
                  >
                    [Browse PDF]
                  </button>
                )}
              </label>
              <input
                id="input-hotspot-room-number"
                type="text"
                value={roomNumber}
                onChange={(e) => {
                  setRoomNumber(e.target.value);
                  setShowRoomsDropdown(true);
                }}
                onFocus={() => setShowRoomsDropdown(true)}
                placeholder="e.g. G10, 4"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-amber-500 rounded-xl text-xs text-white placeholder:text-zinc-600 outline-none font-mono transition-colors"
                autoFocus
              />

              {showRoomsDropdown && chapterPdfDigest?.rooms && chapterPdfDigest.rooms.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl max-h-48 overflow-y-auto z-[60] p-1.5 space-y-1 sidebar-scrollbar">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800 shrink-0">
                    <span className="text-[10px] font-mono font-bold text-zinc-400">Select PDF Room:</span>
                    <button
                      type="button"
                      onClick={() => setShowRoomsDropdown(false)}
                      className="text-[9px] font-bold text-zinc-500 hover:text-zinc-300"
                    >
                      Close
                    </button>
                  </div>
                  {chapterPdfDigest.rooms
                    .filter(r => !roomNumber || r.roomNumber.toLowerCase().includes(roomNumber.toLowerCase()) || r.roomName.toLowerCase().includes(roomNumber.toLowerCase()))
                    .map((r, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyDigestRoom(r)}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-zinc-800 text-xs font-mono flex items-center justify-between gap-2 text-zinc-300 transition-colors"
                      >
                        <span className="truncate">
                          <strong className="text-amber-400 font-bold">{r.roomNumber}</strong>: {r.roomName}
                        </span>
                        {r.sceneTitle && (
                          <span className="text-[9px] text-zinc-500 shrink-0 max-w-[80px] truncate">{r.sceneTitle}</span>
                        )}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Room / Zone Name</span>
              </label>
              <input
                id="input-hotspot-room-name"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. The Parlor or Secret Armory"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-amber-500 rounded-xl text-xs text-white placeholder:text-zinc-600 outline-none font-mono transition-colors"
                required
              />
            </div>
          </div>

          {digestMatchFound && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
              <div className="min-w-0">
                <span className="text-[10px] font-bold font-mono text-emerald-400 block uppercase tracking-wider">
                  Matched Room in PDF Chapter!
                </span>
                <span className="text-xs font-mono font-bold text-zinc-200 truncate block">
                  {digestMatchFound.roomNumber}: {digestMatchFound.roomName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleApplyDigestRoom(digestMatchFound)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold font-mono flex items-center gap-1 shrink-0 shadow-md active:scale-95 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300 fill-amber-300" />
                Auto-fill
              </button>
            </div>
          )}

          {/* AI Auto-Pull from Campaign PDF button */}
          <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-zinc-200 font-mono">Campaign PDF Assistant</span>
              </div>
              <button
                type="button"
                id="btn-pull-from-pdf"
                onClick={handlePullFromCampaignPdf}
                disabled={isPullingPdf || (!roomNumber.trim() && !roomName.trim() && !currentAnno.label)}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-all disabled:opacity-40 cursor-pointer active:scale-95"
                title="Search and extract room description and DM notes from uploaded campaign PDF"
              >
                {isPullingPdf ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Pulling from PDF...</span>
                  </>
                ) : pullPdfSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Extracted!</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Pull from Campaign PDF</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 leading-normal">
              Uses uploaded campaign PDFs (e.g. Keys from the Golden Vault, Vecna) to automatically fill the read-aloud description and DM traps/secrets.
            </p>
            {pullError && (
              <div className="text-[11px] text-amber-300 font-mono p-2 bg-amber-950/40 rounded-lg border border-amber-800/40">
                {pullError}
              </div>
            )}
          </div>

          {/* Color Accent Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-blue-400" />
              <span>Overlay Accent Color</span>
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-lg transition-transform flex items-center justify-center border ${
                    color === c.hex ? 'scale-110 border-white shadow-md' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-lg bg-transparent border-0 cursor-pointer"
                title="Custom color"
              />
            </div>
          </div>

          {/* Read-Aloud Boxed Text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Read-Aloud Room Description (Boxed Text)</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Player-Safe</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Descriptive sensory text to read or broadcast directly to the player chat stream.
            </p>
            <textarea
              id="input-hotspot-boxed-text"
              rows={4}
              value={boxedText}
              onChange={(e) => setBoxedText(e.target.value)}
              placeholder="The scent of dried rosewood and old parchment fills this opulent parlor. In the center of the room stands a gilded pedestal..."
              className="w-full p-3 bg-zinc-900 border border-zinc-750 focus:border-amber-500 rounded-xl text-xs text-amber-100 placeholder:text-zinc-600 outline-none font-serif leading-relaxed transition-colors"
            />
          </div>

          {/* DM Specific Instructions */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-red-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span>DM Specific Instructions (Traps, DCs, Tactics, Secrets)</span>
              </label>
              <span className="text-[10px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded font-mono font-bold">DM ONLY</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Hidden traps, Perception DCs, enemy stealth modifiers, and secret tactical notes from the campaign book.
            </p>
            <textarea
              id="input-hotspot-dm-notes"
              rows={4}
              value={dmNotes}
              onChange={(e) => setDmNotes(e.target.value)}
              placeholder="DC 15 Wisdom (Perception) spots the pressure plate beneath the rug. DC 14 Dex thieves' tools disarms. 2 Gargoyles animate if the chest is opened without the brass key."
              className="w-full p-3 bg-zinc-900 border border-zinc-750 focus:border-red-500 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 outline-none font-sans leading-relaxed transition-colors"
            />
          </div>

          {/* Campaign Notes & PDF Section Linkage */}
          <div className="space-y-2 p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-blue-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Linked Campaign Notes / PDF Chapter</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Adventure Module Ref</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <input
                  id="input-hotspot-pdf-section"
                  type="text"
                  value={pdfSection}
                  onChange={(e) => setPdfSection(e.target.value)}
                  placeholder="e.g. Chapter 2 · Area 1A Guard Post"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-blue-500 rounded-xl text-xs text-white placeholder:text-zinc-600 outline-none font-mono transition-colors"
                />
              </div>
              <div className="sm:col-span-1">
                <input
                  id="input-hotspot-pdf-page"
                  type="number"
                  value={pdfPage}
                  onChange={(e) => setPdfPage(e.target.value)}
                  placeholder="Page #"
                  min={1}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-blue-500 rounded-xl text-xs text-white placeholder:text-zinc-600 outline-none font-mono transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-850">
            <div className="flex items-center gap-2">
              {onDelete && (
                <button
                  type="button"
                  id="btn-delete-hotspot"
                  onClick={() => onDelete(currentAnno.id)}
                  className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
              {onRedrawPolygon && (
                <button
                  type="button"
                  id="btn-redraw-hotspot-polygon"
                  onClick={() => {
                    const cleanNum = roomNumber.trim();
                    const cleanName = roomName.trim();
                    const combinedLabel = cleanNum && cleanName ? `${cleanNum}: ${cleanName}` : cleanNum || cleanName || 'Room Hotspot';
                    onRedrawPolygon({
                      ...currentAnno,
                      roomNumber: cleanNum || undefined,
                      roomName: cleanName || undefined,
                      label: combinedLabel,
                      boxedText: boxedText.trim(),
                      dmNotes: dmNotes.trim(),
                      pdfSection: pdfSection.trim() || undefined,
                      pdfPage: pdfPage ? parseInt(pdfPage, 10) : undefined,
                      color: color || '#f59e0b'
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Redraw the polygon boundary for this room zone on the battlemap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Redraw Polygon</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-mono transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-hotspot"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-all active:scale-95 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save to Firebase</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomHotspotEditorModal;
