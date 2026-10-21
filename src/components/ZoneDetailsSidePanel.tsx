import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  ShieldAlert, 
  BookOpen, 
  Pencil, 
  Trash2, 
  Sparkles, 
  Database, 
  FileText, 
  ExternalLink,
  ChevronRight,
  Layers,
  MapPin,
  Tag,
  Radio,
  Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { RoomAnnotation } from '../types';
import { fetchZoneDetails } from '../lib/firebase';
import { chatWithLore } from '../services/aiService';
import { NARRATION_VOICES, audioNarration, useAudioNarration } from '../services/audioNarrationService';
import { toast } from 'sonner';

interface ZoneDetailsSidePanelProps {
  zone: RoomAnnotation | null;
  isOpen: boolean;
  onClose: () => void;
  onEditZone?: (zone: RoomAnnotation) => void;
  onEdit?: (zone: RoomAnnotation) => void;
  onDeleteZone?: (zoneId: string) => void;
  onDelete?: (zoneId: string) => void;
  onSendToChat?: (text: string, title: string) => void;
  onBroadcastReadAloud?: (text: string, title: string, voiceId?: string) => Promise<void> | void;
  loreSources?: { id: string; name: string; type: 'text' | 'pdf'; content: string }[];
  campaignId?: string;
  sceneId?: string;
  onOpenBriefing?: (zone: RoomAnnotation) => void;
}

export const ZoneDetailsSidePanel: React.FC<ZoneDetailsSidePanelProps> = ({
  zone,
  isOpen,
  onClose,
  onEditZone,
  onEdit,
  onDeleteZone,
  onDelete,
  onSendToChat,
  onBroadcastReadAloud,
  loreSources = [],
  campaignId,
  sceneId,
  onOpenBriefing
}) => {
  const [activeZone, setActiveZone] = useState<RoomAnnotation | null>(zone);
  const [isLoadingFirestore, setIsLoadingFirestore] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [sentChatSuccess, setSentChatSuccess] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const { isPlaying: isSpeaking } = useAudioNarration();
  const [selectedVoice, setSelectedVoice] = useState('wizard');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiPdfInsights, setAiPdfInsights] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // When zone changes or panel opens, fetch fresh details from Firestore
  useEffect(() => {
    setActiveZone(zone);
    setAiPdfInsights(null);
    setConfirmDelete(false);

    if (zone?.id) {
      let isMounted = true;
      setIsLoadingFirestore(true);

      fetchZoneDetails(zone.id, campaignId)
        .then((fresh) => {
          if (isMounted && fresh) {
            setActiveZone(fresh);
          }
        })
        .catch((err) => {
          console.warn('[ZoneDetailsSidePanel] Firestore fetch note:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoadingFirestore(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [zone?.id, campaignId]);

  if (!isOpen || !activeZone) return null;

  const roomNumber = activeZone.roomNumber || (activeZone.label ? activeZone.label.split(/[\s\-:]/)[0] : '1');
  const roomName = activeZone.roomName || (activeZone.label ? activeZone.label.replace(/^.*?[\-:]\s*/, '') : 'Zone');
  const displayTitle = `${roomNumber ? `${roomNumber}: ` : ''}${roomName}`;
  const accentColor = activeZone.color || '#f59e0b';
  const hasPolygon = activeZone.polygonPoints && activeZone.polygonPoints.length >= 6;
  const vertexCount = hasPolygon ? activeZone.polygonPoints!.length / 2 : 4;

  const handleCopyBoxedText = () => {
    if (!activeZone.boxedText) return;
    navigator.clipboard.writeText(activeZone.boxedText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSendToChat = () => {
    if (!activeZone.boxedText || !onSendToChat) return;
    onSendToChat(activeZone.boxedText, displayTitle);
    setSentChatSuccess(true);
    setTimeout(() => setSentChatSuccess(false), 2500);
  };

  const handleBroadcastToPlayers = async () => {
    if (!activeZone.boxedText) return;
    if (onBroadcastReadAloud) {
      try {
        setIsBroadcasting(true);
        await onBroadcastReadAloud(activeZone.boxedText, displayTitle, selectedVoice);
        setBroadcastSuccess(true);
        setTimeout(() => setBroadcastSuccess(false), 2500);
      } catch (err: any) {
        console.error('[ZoneDetailsSidePanel] Broadcast error:', err);
        toast.error('Failed to broadcast read-aloud to players');
      } finally {
        setIsBroadcasting(false);
      }
    } else if (onSendToChat) {
      handleSendToChat();
    }
  };

  const handleToggleSpeech = async () => {
    if (!activeZone.boxedText) return;

    if (isSpeaking) {
      audioNarration.stop();
      return;
    }

    try {
      await audioNarration.play({
        text: activeZone.boxedText,
        voiceId: selectedVoice,
      });
    } catch (err) {
      console.error("TTS error:", err);
      toast.error("Failed to generate narration audio.");
    }
  };

  const handleQueryPdfLore = async () => {
    const queryTerm = `${roomNumber} ${roomName} ${activeZone.pdfSection || ''}`.trim();
    if (!queryTerm) return;

    setIsAiSearching(true);
    try {
      const prompt = `You are a Dungeon Master's assistant analyzing an adventure module.
Explain key tactical insights, monster behavior, and story secrets for Room/Area: "${queryTerm}".
Summarize in 2 concise paragraphs:
1. Environment & Hazards (perception checks, traps, lighting)
2. Tactical & Lore Secrets (enemy motivations, treasure, key triggers)
Focus strictly on module lore.`;

      const result = await chatWithLore([], prompt, loreSources);
      setAiPdfInsights(result);
    } catch (err: any) {
      setAiPdfInsights(`Could not query PDF lore: ${err?.message || 'Check connection.'}`);
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleEditClick = () => {
    if (onEditZone) onEditZone(activeZone);
    else if (onEdit) onEdit(activeZone);
  };

  const handleDeleteClick = () => {
    if (onDeleteZone) onDeleteZone(activeZone.id);
    else if (onDelete) onDelete(activeZone.id);
  };

  const canEdit = !!(onEditZone || onEdit);
  const canDelete = !!(onDeleteZone || onDelete);

  return (
    <aside
      id="zone-details-side-panel"
      className="fixed top-0 right-0 h-full w-96 max-w-[90vw] z-40 bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Top Header */}
      <div className="p-4 border-b border-zinc-855 bg-zinc-900/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm border border-white/20"
            style={{ backgroundColor: accentColor }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                Map Zone Details
              </span>
              {isLoadingFirestore && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono animate-pulse">
                  Syncing...
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-zinc-100 truncate font-mono" title={displayTitle}>
              {displayTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {canEdit && (
            <button
              id="btn-edit-zone-sidepanel"
              onClick={handleEditClick}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Edit Zone Information"
            >
              <Pencil className="w-4 h-4 text-amber-400" />
            </button>
          )}
          <button
            id="btn-close-zone-sidepanel"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Close Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Badges / Meta bar */}
      <div className="px-4 py-2 bg-zinc-900/40 border-b border-zinc-850 flex items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-300 font-bold border border-zinc-700">
            Room #{roomNumber}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-300">
            {hasPolygon ? `Polygon (${vertexCount} pts)` : 'Rect Bounds'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <Database className="w-3 h-3 text-emerald-400" />
          <span>Firestore Synced</span>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Read-Aloud Boxed Text Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Read-Aloud (Boxed Text)</span>
            </label>
            <div className="flex items-center gap-1">
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="p-1 rounded bg-zinc-850 text-zinc-300 border border-zinc-750 text-[10px] font-mono cursor-pointer hover:border-zinc-600 focus:outline-none focus:border-amber-500/50"
                title="Select Narration Voice Archetype"
              >
                {NARRATION_VOICES.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </select>
              <button
                id="btn-tts-zone"
                onClick={handleToggleSpeech}
                disabled={!activeZone.boxedText}
                className={`p-1.5 rounded-md border text-[10px] font-mono flex items-center gap-1 transition-all ${
                  isSpeaking
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow'
                    : 'bg-zinc-800 border-zinc-750 text-zinc-300 hover:text-white disabled:opacity-40'
                }`}
                title={isSpeaking ? 'Stop Speech' : 'Read Aloud with Audio Speech'}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                id="btn-copy-boxed-text"
                onClick={handleCopyBoxedText}
                disabled={!activeZone.boxedText}
                className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-mono transition-all disabled:opacity-40"
                title="Copy Boxed Text"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {onSendToChat && (
                <button
                  id="btn-send-to-chat"
                  onClick={handleSendToChat}
                  disabled={!activeZone.boxedText}
                  className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold flex items-center gap-1 shadow transition-all disabled:opacity-40"
                  title="Broadcast to Player View & Chat"
                >
                  {sentChatSuccess ? <Check className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                  <span>{sentChatSuccess ? 'Sent!' : 'To Chat'}</span>
                </button>
              )}
            </div>
          </div>

          {activeZone.boxedText ? (
            <>
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 font-serif text-xs text-amber-100/90 leading-relaxed shadow-inner">
                <ReactMarkdown>{activeZone.boxedText}</ReactMarkdown>
              </div>

              {/* Broadcast to Players CTA */}
              {(onBroadcastReadAloud || onSendToChat) && (
                <button
                  type="button"
                  id="btn-broadcast-zone-players"
                  onClick={handleBroadcastToPlayers}
                  disabled={isBroadcasting}
                  className={`w-full py-2 px-3 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-md ${
                    broadcastSuccess
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : isBroadcasting
                      ? 'bg-amber-600/30 text-amber-300 border-amber-500/50 animate-pulse'
                      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400 shadow-amber-500/20'
                  } disabled:opacity-50`}
                  title="Broadcast read-aloud description and play selected voice exclusively in Player View"
                >
                  {broadcastSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Broadcasted to Players!</span>
                    </>
                  ) : isBroadcasting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Broadcasting Voice to Players...</span>
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4" />
                      <span>Broadcast to Players</span>
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-500 italic font-mono text-center">
              No flavor text written yet. Click Edit to add player-facing room descriptions.
            </div>
          )}
        </div>

        {/* DM Notes & Secrets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>DM Secrets & Tactical Notes</span>
            </label>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 font-mono font-bold border border-red-900/50">
              DM ONLY
            </span>
          </div>

          {activeZone.dmNotes ? (
            <div className="p-3 rounded-xl bg-zinc-900 border border-red-950/60 font-sans text-xs text-zinc-200 leading-relaxed space-y-1.5">
              <ReactMarkdown>{activeZone.dmNotes}</ReactMarkdown>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-500 italic font-mono text-center">
              No secret DM notes or trap DCs configured.
            </div>
          )}
        </div>

        {/* Campaign Notes & PDF Linkage */}
        <div className="space-y-2 p-3 bg-zinc-900/70 rounded-xl border border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-blue-400">
              <FileText className="w-3.5 h-3.5" />
              <span>Linked Campaign Lore & PDF</span>
            </div>
            {activeZone.pdfPage && (
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                Page {activeZone.pdfPage}
              </span>
            )}
          </div>

          <div className="text-xs font-mono text-zinc-300">
            {activeZone.pdfSection ? (
              <div className="flex items-center gap-1.5 text-blue-300 bg-blue-950/30 p-2 rounded-lg border border-blue-800/40">
                <ChevronRight className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="truncate">{activeZone.pdfSection}</span>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-500 italic">
                No specific PDF chapter link assigned.
              </p>
            )}
          </div>

          {/* AI Lore Master Button */}
          <button
            id="btn-ai-query-pdf-lore"
            onClick={handleQueryPdfLore}
            disabled={isAiSearching}
            className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{isAiSearching ? 'Searching Campaign Lore...' : 'Query Campaign Lore Assistant'}</span>
          </button>

          {aiPdfInsights && (
            <div className="p-3 rounded-lg bg-zinc-950 border border-amber-500/30 text-xs font-sans text-amber-200/90 leading-relaxed animate-in fade-in">
              <div className="font-mono font-bold text-[10px] text-amber-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Campaign Lore Synthesis</span>
              </div>
              <ReactMarkdown>{aiPdfInsights}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Zone Geometry Summary */}
        <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-850 text-[11px] font-mono text-zinc-400 space-y-1">
          <div className="flex items-center justify-between text-zinc-300 font-bold">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-400" />
              <span>Zone Coordinates</span>
            </span>
            <span className="text-[10px] text-zinc-500">{activeZone.id}</span>
          </div>
          <div>Vertices: {vertexCount} points</div>
          <div>Bounds: ({Math.round(activeZone.bounds?.x ?? 50)}%, {Math.round(activeZone.bounds?.y ?? 50)}%) - {Math.round(activeZone.bounds?.width ?? 6)}% × {Math.round(activeZone.bounds?.height ?? 3)}%</div>
          {activeZone.updatedAt && (
            <div className="text-[10px] text-zinc-500">
              Last saved: {new Date(activeZone.updatedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-4 border-t border-zinc-850 bg-zinc-900/80 flex items-center justify-between gap-2 shrink-0">
        {confirmDelete ? (
          <div className="flex items-center gap-2 w-full">
            <span className="text-[11px] font-mono text-red-300 flex-1">Delete zone?</span>
            <button
              onClick={() => {
                if (onDeleteZone) onDeleteZone(activeZone.id);
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 font-mono text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            {canDelete && (
              <button
                id="btn-delete-zone-sidepanel"
                onClick={() => setConfirmDelete(true)}
                className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-xs font-mono transition-colors"
                title="Delete Zone"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {onOpenBriefing && (
                <button
                  type="button"
                  onClick={() => onOpenBriefing(activeZone)}
                  className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-800/50 text-xs font-mono font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  title="Open Room Briefing and Monster Tokens"
                >
                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
                  <span>Monsters & Briefing</span>
                </button>
              )}
              {canEdit && (
                <button
                  id="btn-open-editor-from-sidepanel"
                  onClick={handleEditClick}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-all cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Zone</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default ZoneDetailsSidePanel;
