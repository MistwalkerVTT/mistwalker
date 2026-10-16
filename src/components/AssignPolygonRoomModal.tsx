import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tag,
  Pentagon,
  BookOpen,
  FileText,
  Skull,
  Check,
  X,
  Search,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ChapterPdfDigest, ChapterRoomDetail, RoomAnnotation } from '../types';

export interface AssignPolygonRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  polygonPoints: number[]; // percentage coordinates [x1, y1, x2, y2, ...]
  bounds: { x: number; y: number; width: number; height: number };
  chapterPdfDigest?: ChapterPdfDigest | null;
  existingRoomAnnotations?: RoomAnnotation[];
  suggestedRoomNumber?: string;
  onConfirm: (roomData: {
    roomNumber: string;
    roomName: string;
    boxedText: string;
    dmNotes: string;
    monsters: string[];
    pdfSection?: string;
    matchedPdfRoom?: ChapterRoomDetail | null;
  }) => void;
}

/**
 * Flexible room key matcher: matches codes like "g14", "G14", "14", "Area G14", "Room 14"
 */
export function findMatchingPdfRoom(
  query: string,
  rooms?: ChapterRoomDetail[] | null
): ChapterRoomDetail | null {
  if (!rooms || rooms.length === 0 || !query.trim()) return null;

  const raw = query.trim().toLowerCase();
  // Strip prefixes like "area", "room", "zone", "#", and spaces/punctuation
  const clean = raw.replace(/^(area|room|zone|#)\s*/i, '').replace(/[\s\-_:]/g, '');

  // 1. Exact match on raw roomNumber
  let match = rooms.find(
    (r) => (r.roomNumber || '').trim().toLowerCase() === raw
  );
  if (match) return match;

  // 2. Exact match on cleaned roomNumber
  match = rooms.find((r) => {
    const rClean = (r.roomNumber || '')
      .trim()
      .toLowerCase()
      .replace(/^(area|room|zone|#)\s*/i, '')
      .replace(/[\s\-_:]/g, '');
    return rClean === clean;
  });
  if (match) return match;

  // 3. Prefix-insensitive number match (e.g. user typed "14", PDF has "G14", or vice-versa)
  const queryDigitsOnly = clean.replace(/^[a-z]+/i, '');
  if (queryDigitsOnly.length > 0) {
    match = rooms.find((r) => {
      const rClean = (r.roomNumber || '')
        .trim()
        .toLowerCase()
        .replace(/^(area|room|zone|#)\s*/i, '')
        .replace(/[\s\-_:]/g, '');
      const rDigitsOnly = rClean.replace(/^[a-z]+/i, '');
      return rDigitsOnly === queryDigitsOnly && rDigitsOnly.length > 0;
    });
    if (match) return match;
  }

  // 4. Room Name exact or prefix match
  match = rooms.find((r) => {
    const rNameClean = (r.roomName || '').trim().toLowerCase();
    return rNameClean === raw || rNameClean.startsWith(raw);
  });
  if (match) return match;

  return null;
}

export const AssignPolygonRoomModal: React.FC<AssignPolygonRoomModalProps> = ({
  isOpen,
  onClose,
  polygonPoints,
  bounds,
  chapterPdfDigest,
  existingRoomAnnotations = [],
  suggestedRoomNumber = '',
  onConfirm
}) => {
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Default suggested number if none provided
  const defaultNextNum = useMemo(() => {
    if (suggestedRoomNumber) return suggestedRoomNumber;
    return String(existingRoomAnnotations.length + 1);
  }, [suggestedRoomNumber, existingRoomAnnotations.length]);

  // Reset and auto-focus strictly once when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setRoomNumberInput(suggestedRoomNumber || '');
      setRoomNameInput('');
      setFilterQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen, suggestedRoomNumber]);

  // Handle escape key independently without wiping state
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Live matching against PDF digest
  const matchedRoom = useMemo(() => {
    return findMatchingPdfRoom(roomNumberInput, chapterPdfDigest?.rooms);
  }, [roomNumberInput, chapterPdfDigest?.rooms]);

  // Auto-fill room name if matched from PDF and user hasn't overridden it
  useEffect(() => {
    if (matchedRoom) {
      setRoomNameInput(matchedRoom.roomName || '');
    }
  }, [matchedRoom]);

  // Available rooms list from PDF digest
  const pdfRoomsList = useMemo(() => {
    if (!chapterPdfDigest?.rooms) return [];
    const placedCodes = new Set(
      existingRoomAnnotations.map((a) => (a.roomNumber || '').toLowerCase().trim())
    );

    return chapterPdfDigest.rooms.map((r) => {
      const isPlaced = placedCodes.has(r.roomNumber.toLowerCase().trim());
      return {
        ...r,
        isPlaced
      };
    });
  }, [chapterPdfDigest?.rooms, existingRoomAnnotations]);

  // Filtered rooms for quick-selection list
  const filteredPdfRooms = useMemo(() => {
    if (!filterQuery.trim()) return pdfRoomsList;
    const q = filterQuery.toLowerCase().trim();
    return pdfRoomsList.filter(
      (r) =>
        r.roomNumber.toLowerCase().includes(q) ||
        r.roomName.toLowerCase().includes(q)
    );
  }, [pdfRoomsList, filterQuery]);

  if (!isOpen) return null;

  const handleSelectPdfRoom = (room: ChapterRoomDetail) => {
    setRoomNumberInput(room.roomNumber);
    setRoomNameInput(room.roomName || '');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const assignedNumber = roomNumberInput.trim() || defaultNextNum;
    const assignedName =
      roomNameInput.trim() ||
      matchedRoom?.roomName ||
      `Room ${assignedNumber}`;

    onConfirm({
      roomNumber: assignedNumber,
      roomName: assignedName,
      boxedText: matchedRoom?.boxedText || '',
      dmNotes: matchedRoom?.dmNotes || '',
      monsters: matchedRoom?.monsters || [],
      pdfSection: matchedRoom?.sceneTitle || undefined,
      matchedPdfRoom: matchedRoom
    });
  };

  const vertexCount = polygonPoints.length / 2;

  return (
    <div
      id="assign-polygon-room-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 pointer-events-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden text-zinc-100 font-sans animate-in fade-in zoom-in-95 duration-150 relative z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-950/40">
              <Pentagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                Assign Room Number
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {vertexCount} Vertices
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Type a room code (e.g. <span className="font-mono text-amber-300">g14</span>) to link verbatim boxed text & DM notes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title="Cancel polygon"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Main Input Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 space-y-1.5">
              <label className="block text-[11px] font-mono uppercase font-bold text-zinc-300">
                Room Number <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={roomNumberInput}
                  onChange={(e) => setRoomNumberInput(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder={`e.g. g14`}
                  className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-amber-300 font-mono text-sm font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all select-text"
                  autoFocus
                />
                <Tag className="w-4 h-4 text-zinc-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[11px] font-mono uppercase font-bold text-zinc-300">
                Room Name / Title
              </label>
              <input
                type="text"
                value={roomNameInput}
                onChange={(e) => setRoomNameInput(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder={matchedRoom?.roomName || `e.g. Guard Post, Torture Chamber`}
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all select-text"
              />
            </div>
          </div>

          {/* Matched Room from Pre-loaded PDF Banner */}
          {matchedRoom ? (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 space-y-2.5 shadow-md shadow-emerald-950/30 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Associated with PDF Room {matchedRoom.roomNumber}:</span>
                  <span className="text-white font-sans">{matchedRoom.roomName}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Auto-Linked
                </span>
              </div>

              {/* Boxed Text Preview */}
              {matchedRoom.boxedText && (
                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-emerald-500/20 text-amber-200/90 text-xs italic font-serif leading-relaxed line-clamp-3">
                  &ldquo;{matchedRoom.boxedText}&rdquo;
                </div>
              )}

              {/* DM Notes Preview */}
              {matchedRoom.dmNotes && (
                <div className="text-[11px] text-zinc-300 font-sans line-clamp-2">
                  <span className="font-bold font-mono text-zinc-400">DM Notes: </span>
                  {matchedRoom.dmNotes}
                </div>
              )}

              {/* Monsters Preview */}
              {matchedRoom.monsters && matchedRoom.monsters.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Skull className="w-3.5 h-3.5 text-red-400" />
                  {matchedRoom.monsters.map((m, mIdx) => (
                    <span
                      key={mIdx}
                      className="px-2 py-0.5 rounded bg-red-950/50 border border-red-500/30 text-red-300 text-[10px] font-mono font-bold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : roomNumberInput.trim() ? (
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-400 text-xs flex items-center justify-between font-mono">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-zinc-500" />
                <span>
                  No PDF match for &ldquo;{roomNumberInput}&rdquo;. Will create as a custom room.
                </span>
              </div>
            </div>
          ) : null}

          {/* Quick-Select Pills from Loaded Chapter PDF */}
          {pdfRoomsList.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-400 text-[11px] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>Rooms from Adventure PDF ({pdfRoomsList.length}):</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Click to select</span>
              </div>

              <div className="max-h-36 overflow-y-auto p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-wrap gap-1.5">
                {filteredPdfRooms.map((r, idx) => {
                  const isCurrentMatch =
                    (roomNumberInput.trim().toLowerCase() === r.roomNumber.trim().toLowerCase()) ||
                    (matchedRoom && matchedRoom.roomNumber.trim().toLowerCase() === r.roomNumber.trim().toLowerCase());
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectPdfRoom(r);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                        isCurrentMatch
                          ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-950/40 ring-2 ring-amber-300'
                          : r.isPlaced
                          ? 'bg-zinc-800/40 text-zinc-500 hover:text-zinc-300 border border-zinc-700/40'
                          : 'bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700/60'
                      }`}
                      title={`${r.roomNumber}: ${r.roomName}`}
                    >
                      <span className="font-bold">{r.roomNumber}</span>
                      <span className="max-w-[120px] truncate opacity-80">{r.roomName}</span>
                      {r.isPlaced && <Check className="w-3 h-3 text-zinc-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold font-mono text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Assign Room & Continue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
