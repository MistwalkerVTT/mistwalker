import React from 'react';
import { 
  X, 
  Send, 
  Eye, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldAlert, 
  Lock, 
  BookOpen, 
  ExternalLink,
  Pencil
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { RoomAnnotation } from '../types';

interface RoomBriefingModalProps {
  annotation: RoomAnnotation | null;
  isOpen: boolean;
  onClose: () => void;
  onSendToChat: (text: string, title: string) => void;
  onEdit?: (annotation: RoomAnnotation) => void;
  onPlayTTS?: (text: string) => void;
  isPlayingTTS?: boolean;
}

export const RoomBriefingModal: React.FC<RoomBriefingModalProps> = ({
  annotation,
  isOpen,
  onClose,
  onSendToChat,
  onEdit,
  onPlayTTS,
  isPlayingTTS = false
}) => {
  const [copiedBoxed, setCopiedBoxed] = React.useState(false);
  const [sentSuccess, setSentSuccess] = React.useState(false);

  if (!isOpen || !annotation) return null;

  const handleCopyBoxed = () => {
    if (!annotation.boxedText) return;
    navigator.clipboard.writeText(annotation.boxedText);
    setCopiedBoxed(true);
    setTimeout(() => setCopiedBoxed(false), 2000);
  };

  const handleSendToChat = () => {
    if (!annotation.boxedText.trim()) return;
    onSendToChat(annotation.boxedText, annotation.label);
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 2500);
  };

  return (
    <div 
      id="room-briefing-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="room-briefing-dialog"
        className="w-full max-w-xl max-h-[85vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              className="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm"
              style={{ backgroundColor: annotation.color || '#f59e0b' }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                Room Briefing & Read-Aloud
              </span>
              <h2 className="text-base font-bold text-zinc-100 truncate font-mono" title={annotation.label}>
                {annotation.label || 'Unnamed Area'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onEdit && (
              <button
                id="btn-edit-hotspot-from-briefing"
                onClick={() => {
                  onEdit(annotation);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-750 text-xs font-mono flex items-center gap-1.5 transition-all"
                title="Edit Hotspot geometry, label, or notes"
              >
                <Pencil className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit</span>
              </button>
            )}
            <button
              id="btn-close-room-briefing"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
              title="Close briefing"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Section 1: Read-Aloud Boxed Text (Flavor for Players) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold font-mono text-amber-300 uppercase tracking-wider">
                  Read-Aloud (Boxed Text)
                </span>
              </div>
              
              <div className="flex items-center gap-1.5">
                {onPlayTTS && annotation.boxedText && (
                  <button
                    id="btn-tts-boxed-text"
                    onClick={() => onPlayTTS(annotation.boxedText)}
                    className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 text-[11px] font-mono flex items-center gap-1 transition-colors"
                    title="Narrate read-aloud text with AI Voice"
                  >
                    {isPlayingTTS ? (
                      <>
                        <VolumeX className="w-3 h-3 text-red-400" />
                        <span className="text-red-300">Stop</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 text-amber-400" />
                        <span>Narrate</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  id="btn-copy-boxed-text"
                  onClick={handleCopyBoxed}
                  disabled={!annotation.boxedText}
                  className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 text-[11px] font-mono flex items-center gap-1 transition-colors disabled:opacity-40"
                  title="Copy read-aloud text to clipboard"
                >
                  {copiedBoxed ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedBoxed ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {annotation.boxedText ? (
              <div 
                id="briefing-boxed-text-display"
                className="p-4 rounded-xl bg-amber-950/20 border-l-4 border-amber-500 border-y border-r border-amber-500/30 text-amber-100 text-xs sm:text-sm leading-relaxed italic shadow-inner font-serif"
              >
                <div className="markdown-body">
                  <ReactMarkdown>{annotation.boxedText}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-dashed border-zinc-800 text-zinc-500 text-xs italic text-center">
                No read-aloud description specified for this area. Click "Edit" to add boxed text.
              </div>
            )}
          </div>

          {/* Section 2: DM Specific Instructions (Traps, DCs, Tactics, Secrets) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold font-mono text-red-400 uppercase tracking-wider">
                DM Confidential (Traps, DCs & Secrets)
              </span>
              <span className="text-[10px] bg-red-950/60 text-red-300 border border-red-800/60 px-1.5 py-0.2 rounded font-mono">
                DM ONLY
              </span>
            </div>

            {annotation.dmNotes ? (
              <div 
                id="briefing-dm-notes-display"
                className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-200 text-xs sm:text-sm leading-relaxed font-sans shadow-sm"
              >
                <div className="markdown-body">
                  <ReactMarkdown>{annotation.dmNotes}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-dashed border-zinc-800 text-zinc-500 text-xs italic text-center">
                No secret DM instructions configured for this room.
              </div>
            )}
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="px-5 py-3.5 border-t border-zinc-850 bg-zinc-900/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-zinc-400 font-mono">
            <span>Coordinates: </span>
            <span className="text-zinc-300 font-bold">
              {Math.round(annotation.bounds.x)}%, {Math.round(annotation.bounds.y)}%
            </span>
            <span className="text-zinc-500 ml-1">
              ({Math.round(annotation.bounds.width)}% × {Math.round(annotation.bounds.height)}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-briefing-send-to-chat"
              onClick={handleSendToChat}
              disabled={!annotation.boxedText?.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-amber-950/50 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Broadcast read-aloud description to the Player View and Chat Stream"
            >
              {sentSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Sent to Chat!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Read-Aloud to Chat</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomBriefingModal;
