import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Radio,
  Eye,
  Lock,
  Search,
  Plus,
  Maximize,
  Minimize,
  Loader2,
  Upload,
  Swords,
  Shield,
  Heart
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { RoomAnnotation, ChapterPdfDigest } from '../types';
import { Monster } from '../types/monster';
import { updateRoomAnnotation } from '../lib/updateRoomAnnotation';
import { saveMonster, uploadAndRegisterAsset } from '../lib/firebase';
import { resolveMonster, isExactMonsterMatch, isNonCreatureStatOrItem, SRD_MONSTERS } from '../data/srdMonstersCatalog';
import { extractAndResolveRoomMonsters } from '../services/roomMonsterExtractor';
import { ChapterFlowPanel } from './ChapterFlowPanel';
import { toast } from 'sonner';
import { NARRATION_VOICES, audioNarration, useAudioNarration } from '../services/audioNarrationService';

export function matchRoomInDigest(roomNum: string, roomName: string, label: string, digestRooms?: any[]) {
  if (!digestRooms || digestRooms.length === 0) return null;
  const clean = (s?: string) => (s || '').toLowerCase().replace(/^(area|room|zone)\s*/i, '').replace(/[\s\-_:]/g, '');
  const targetNum = clean(roomNum);
  const targetName = clean(roomName);
  const targetLabel = clean(label);

  return digestRooms.find(r => {
    const rNum = clean(r.roomNumber);
    const rName = clean(r.roomName);
    if (targetNum && rNum && (targetNum === rNum || `v${targetNum}` === rNum || targetNum === `v${rNum}` || rNum.endsWith(targetNum) || targetNum.endsWith(rNum))) {
      return true;
    }
    if (targetLabel && rNum && (targetLabel.includes(rNum) || rNum.includes(targetLabel))) {
      return true;
    }
    if (targetName && rNum && (targetName.includes(rNum) || rNum.includes(targetName))) {
      return true;
    }
    if (rName && targetName && (rName.includes(targetName) || targetName.includes(rName))) {
      return true;
    }
    return false;
  });
}

export interface RoomBriefingDrawerProps {
  room: RoomAnnotation | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRoom?: (updatedRoom: RoomAnnotation) => void;
  onDeleteRoom?: (roomId: string) => void;
  onBroadcastReadAloud?: (text: string, title: string, voiceId?: string) => Promise<void> | void;
  campaignId?: string;
  chapterId?: string;
  sceneId?: string;
  activeSessionId?: string;
  campaignPdfs?: { id: string; name: string; url?: string; fileType?: string }[];
  chapterPdfDigest?: ChapterPdfDigest | null;
  availableMonsters?: Monster[];
  onSpawnMonsterToken?: (tokenData: { name: string; avatarUrl: string; hp: number; ac: number; size: number; polygonPoints?: number[]; customMonsterData?: Monster }) => void;
  initialTab?: 'room' | 'flow';
  activeSceneTitle?: string;
  activeDmNotes?: string;
  roomAnnotations?: RoomAnnotation[];
  onSelectRoomByNumber?: (roomNumber: string) => void;
  onUpdateDigest?: (updatedDigest: ChapterPdfDigest) => Promise<void> | void;
  onRedrawPolygon?: (room: RoomAnnotation) => void;
}

export const RoomBriefingDrawer: React.FC<RoomBriefingDrawerProps> = ({
  room,
  isOpen,
  onClose,
  onUpdateRoom,
  onDeleteRoom,
  onBroadcastReadAloud,
  campaignId,
  chapterId,
  sceneId,
  activeSessionId,
  campaignPdfs = [],
  chapterPdfDigest,
  availableMonsters = [],
  onSpawnMonsterToken,
  initialTab = 'room',
  activeSceneTitle,
  activeDmNotes,
  roomAnnotations = [],
  onSelectRoomByNumber,
  onUpdateDigest,
  onRedrawPolygon
}) => {
  const [activeRoom, setActiveRoom] = useState<RoomAnnotation | null>(room);
  const [drawerTab, setDrawerTab] = useState<'room' | 'flow'>(initialTab);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDmNotesExpanded, setIsDmNotesExpanded] = useState(true);
  const [isMonstersExpanded, setIsMonstersExpanded] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [broadcastedSuccess, setBroadcastedSuccess] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const { isPlaying: isSpeaking } = useAudioNarration();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable form fields
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editRoomName, setEditRoomName] = useState('');
  const [editBoxedText, setEditBoxedText] = useState('');
  const [editDmNotes, setEditDmNotes] = useState('');
  const [editPdfSection, setEditPdfSection] = useState('');
  const [editPdfPage, setEditPdfPage] = useState<number | ''>('');
  const [editColor, setEditColor] = useState('#f59e0b');

  // Chapter PDF room linking states in drawer
  const [showDrawerRoomsDropdown, setShowDrawerRoomsDropdown] = useState(false);
  const [selectedPdfRoomNum, setSelectedPdfRoomNum] = useState('');
  const [manualMonsters, setManualMonsters] = useState<any[]>([]);
  const [showMonsterSelect, setShowMonsterSelect] = useState(false);
  const [monsterSearchQuery, setMonsterSearchQuery] = useState('');
  const monsterDropdownRef = useRef<HTMLDivElement>(null);
  const emptyStateDropdownRef = useRef<HTMLDivElement>(null);
  const monsterSearchInputRef = useRef<HTMLInputElement>(null);
  const currentRoomIdRef = useRef<string | null>(null);
  const [isDmNotesMaximized, setIsDmNotesMaximized] = useState(false);
  const [showFullDmNotesModal, setShowFullDmNotesModal] = useState(false);
  const [hiddenMonsterNames, setHiddenMonsterNames] = useState<string[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('wizard');

  // Room Zone Monster Customizer Modal State
  const [editingRoomMonster, setEditingRoomMonster] = useState<{
    originalName: string;
    monster: Monster;
    count: number;
  } | null>(null);
  const [alsoSaveToCompendium, setAlsoSaveToCompendium] = useState(true);
  const [isSavingRoomMonster, setIsSavingRoomMonster] = useState(false);
  const [isUploadingMonsterAvatar, setIsUploadingMonsterAvatar] = useState(false);
  const monsterAvatarInputRef = useRef<HTMLInputElement>(null);

  // Combined available monsters from compendium and SRD
  const allAvailableMonsters = useMemo(() => {
    const list = [...availableMonsters];
    for (const def of SRD_MONSTERS) {
      if (!list.some(m => m.name.toLowerCase() === def.name.toLowerCase() || m.monsterId === def.monsterId)) {
        list.push(def);
      }
    }
    return list;
  }, [availableMonsters]);

  // Currently resolved monsters for this room zone
  const currentRoomMonsters = useMemo(() => {
    if (!activeRoom) return [];
    const matchedDigestRoom = matchRoomInDigest(
      activeRoom.roomNumber || '',
      activeRoom.roomName || '',
      activeRoom.label || '',
      chapterPdfDigest?.rooms
    );
    return extractAndResolveRoomMonsters({
      manualMonsters,
      roomMonsters: activeRoom.monsters,
      digestMonsters: matchedDigestRoom?.monsters,
      dmNotes: activeRoom.dmNotes,
      digestDmNotes: matchedDigestRoom?.dmNotes,
      roomNumber: activeRoom.roomNumber,
      roomName: activeRoom.roomName,
      label: activeRoom.label,
      allAvailableMonsters,
      hiddenMonsterNames
    });
  }, [activeRoom, manualMonsters, chapterPdfDigest?.rooms, allAvailableMonsters, hiddenMonsterNames]);

  // Close monster dropdown on outside click or Escape key
  useEffect(() => {
    if (!showMonsterSelect) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTopDropdown = monsterDropdownRef.current && monsterDropdownRef.current.contains(target);
      const inEmptyDropdown = emptyStateDropdownRef.current && emptyStateDropdownRef.current.contains(target);
      if (!inTopDropdown && !inEmptyDropdown) {
        setShowMonsterSelect(false);
        setMonsterSearchQuery('');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMonsterSelect(false);
        setMonsterSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMonsterSelect]);

  // Auto-focus search input when monster dropdown opens
  useEffect(() => {
    if (showMonsterSelect) {
      const timer = setTimeout(() => {
        monsterSearchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showMonsterSelect]);

  // Synchronously update monsters state and persist to Firestore in background
  const updateMonstersState = (nextMonsters: any[], nextHidden: string[]) => {
    if (!activeRoom) return;
    setManualMonsters(nextMonsters);
    setHiddenMonsterNames(nextHidden);
    const updatedData: RoomAnnotation = {
      ...activeRoom,
      monsters: nextMonsters,
      hiddenMonsterNames: nextHidden
    };
    setActiveRoom(updatedData);
    if (onUpdateRoom) {
      onUpdateRoom(updatedData);
    }
    // Background auto-save to Firestore (graceful, non-blocking)
    updateRoomAnnotation({
      campaignId,
      chapterId,
      sceneId,
      zone: updatedData,
      activeSessionId
    }).catch((err) => {
      console.warn('[RoomBriefingDrawer] Background auto-save monsters warning:', err);
    });
  };

  // Helper to materialize current resolved room monsters into full objects
  const materializeCurrentRoomMonsters = () => {
    return currentRoomMonsters.map(entry => ({
      ...entry.monster,
      count: Math.max(1, entry.count || 1)
    }));
  };

  const handleAddMonster = (monsterOrName: Monster | string, count: number = 1) => {
    if (!monsterOrName) return;

    let targetMonster: Monster;
    let targetCount = count;

    if (typeof monsterOrName === 'string') {
      const trimmed = monsterOrName.trim();
      if (!trimmed) return;
      const res = resolveMonster(trimmed, allAvailableMonsters);
      targetMonster = res.monster;
      targetCount = res.count || count;
    } else {
      targetMonster = monsterOrName;
      targetCount = typeof (monsterOrName as any).count === 'number' && (monsterOrName as any).count > 0
        ? (monsterOrName as any).count
        : count;
    }

    const mName = targetMonster.name.trim();
    // Remove from hiddenMonsterNames so it's guaranteed visible
    const nextHidden = hiddenMonsterNames.filter(h => h.toLowerCase() !== mName.toLowerCase());

    const baseList = materializeCurrentRoomMonsters();
    const existingIdx = baseList.findIndex(m => m.name?.trim().toLowerCase() === mName.toLowerCase());

    let nextMonsters: any[];
    if (existingIdx !== -1) {
      const existing = baseList[existingIdx];
      nextMonsters = [...baseList];
      nextMonsters[existingIdx] = {
        ...existing,
        count: (existing.count || 1) + targetCount
      };
    } else {
      nextMonsters = [...baseList, { ...targetMonster, count: targetCount }];
    }

    updateMonstersState(nextMonsters, nextHidden);
    setShowMonsterSelect(false);
    setMonsterSearchQuery('');
    setIsMonstersExpanded(true);
    toast.success(`Added ${targetCount > 1 ? `${targetCount}x ` : ''}${mName} to room`);
  };

  const handleIncreaseCount = (monster: Monster) => {
    const mName = monster.name.trim().toLowerCase();
    const nextHidden = hiddenMonsterNames.filter(h => h.toLowerCase() !== mName);
    const baseList = materializeCurrentRoomMonsters();
    const existingIdx = baseList.findIndex(item => item.name?.trim().toLowerCase() === mName);

    let nextMonsters: any[];
    if (existingIdx !== -1) {
      const existing = baseList[existingIdx];
      nextMonsters = [...baseList];
      nextMonsters[existingIdx] = {
        ...existing,
        count: (existing.count || 1) + 1
      };
    } else {
      nextMonsters = [...baseList, { ...monster, count: 2 }];
    }
    updateMonstersState(nextMonsters, nextHidden);
  };

  const handleDecreaseCount = (monster: Monster, currentCount: number) => {
    const mName = monster.name.trim().toLowerCase();
    const baseList = materializeCurrentRoomMonsters();
    if (currentCount <= 1) {
      const nextHidden = [...hiddenMonsterNames.filter(h => h.toLowerCase() !== mName), monster.name];
      const nextMonsters = baseList.filter(item => item.name?.trim().toLowerCase() !== mName);
      updateMonstersState(nextMonsters, nextHidden);
      toast.info(`Removed ${monster.name} from room`);
    } else {
      const existingIdx = baseList.findIndex(item => item.name?.trim().toLowerCase() === mName);
      let nextMonsters: any[];
      if (existingIdx !== -1) {
        const existing = baseList[existingIdx];
        nextMonsters = [...baseList];
        nextMonsters[existingIdx] = {
          ...existing,
          count: Math.max(1, (existing.count || currentCount) - 1)
        };
      } else {
        nextMonsters = [...baseList, { ...monster, count: currentCount - 1 }];
      }
      updateMonstersState(nextMonsters, hiddenMonsterNames);
    }
  };

  const handleRemoveMonster = (monster: Monster) => {
    const mName = monster.name.trim().toLowerCase();
    const baseList = materializeCurrentRoomMonsters();
    const nextHidden = [...hiddenMonsterNames.filter(h => h.toLowerCase() !== mName), monster.name];
    const nextMonsters = baseList.filter(item => item.name?.trim().toLowerCase() !== mName);
    updateMonstersState(nextMonsters, nextHidden);
    toast.info(`Removed ${monster.name} from room display`);
  };

  const handleOpenRoomMonsterCustomizer = (monster: Monster, count: number) => {
    const clonedMonster: Monster = {
      ...monster,
      traits: Array.isArray(monster.traits) ? monster.traits.map(t => ({ ...t })) : [],
      actions: Array.isArray(monster.actions) ? monster.actions.map(a => ({ ...a })) : []
    };
    setEditingRoomMonster({
      originalName: monster.name,
      monster: clonedMonster,
      count: Math.max(1, count || 1)
    });
    setAlsoSaveToCompendium(true);
  };

  const handleMonsterAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingRoomMonster) return;
    setIsUploadingMonsterAvatar(true);
    try {
      const url = await uploadAndRegisterAsset(file, 'token');
      setEditingRoomMonster(prev => prev ? {
        ...prev,
        monster: { ...prev.monster, avatarUrl: url }
      } : null);
      toast.success('Monster token avatar uploaded!');
    } catch (err) {
      console.error('[RoomBriefingDrawer] Monster avatar upload failed:', err);
      toast.error('Failed to upload monster token avatar');
    } finally {
      setIsUploadingMonsterAvatar(false);
    }
  };

  const handleSaveCustomizedRoomMonster = async () => {
    if (!editingRoomMonster || !activeRoom) return;
    const trimmedName = (editingRoomMonster.monster.name || '').trim();
    if (!trimmedName) {
      toast.error('Monster name cannot be empty.');
      return;
    }

    setIsSavingRoomMonster(true);
    try {
      const origLower = editingRoomMonster.originalName.trim().toLowerCase();
      const newLower = trimmedName.toLowerCase();
      const isRenamed = origLower !== newLower;

      const customId = isRenamed || !editingRoomMonster.monster.monsterId || editingRoomMonster.monster.monsterId.startsWith('srd_')
        ? `custom_room_${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`
        : editingRoomMonster.monster.monsterId;

      const updatedMonster: Monster = {
        ...editingRoomMonster.monster,
        monsterId: customId,
        name: trimmedName,
        baseMonsterName: editingRoomMonster.monster.baseMonsterName || editingRoomMonster.originalName,
        ac: Number(editingRoomMonster.monster.ac) || 10,
        hp: Number(editingRoomMonster.monster.hp) || 10,
        str: Number(editingRoomMonster.monster.str) || 10,
        dex: Number(editingRoomMonster.monster.dex) || 10,
        con: Number(editingRoomMonster.monster.con) || 10,
        int: Number(editingRoomMonster.monster.int) || 10,
        wis: Number(editingRoomMonster.monster.wis) || 10,
        cha: Number(editingRoomMonster.monster.cha) || 10,
        isCustom: true,
        isRoomCustom: true,
        source: 'Room Zone Custom',
        updatedAt: Date.now()
      };

      const targetCount = Math.max(1, Number(editingRoomMonster.count) || 1);
      const baseList = materializeCurrentRoomMonsters();
      const existingIdx = baseList.findIndex(item => item.name?.trim().toLowerCase() === origLower);

      const roomMonsterEntry = {
        ...updatedMonster,
        count: targetCount
      };

      let nextMonsters: any[];
      if (existingIdx !== -1) {
        nextMonsters = [...baseList];
        nextMonsters[existingIdx] = roomMonsterEntry;
      } else {
        nextMonsters = [...baseList, roomMonsterEntry];
      }

      // If renamed, hide the original name so DM Notes / PDF Digest doesn't re-add an unedited duplicate
      let nextHidden = hiddenMonsterNames.filter(h => h.toLowerCase() !== newLower);
      if (isRenamed && !nextHidden.some(h => h.toLowerCase() === origLower)) {
        nextHidden = [...nextHidden, editingRoomMonster.originalName];
      }

      // Persist directly to this Room Zone in Firestore
      const updatedRoomData: RoomAnnotation = {
        ...activeRoom,
        monsters: nextMonsters,
        hiddenMonsterNames: nextHidden
      };

      setManualMonsters(nextMonsters);
      setHiddenMonsterNames(nextHidden);
      setActiveRoom(updatedRoomData);
      if (onUpdateRoom) {
        onUpdateRoom(updatedRoomData);
      }

      await updateRoomAnnotation({
        campaignId,
        chapterId,
        sceneId,
        zone: updatedRoomData,
        activeSessionId
      });

      // Optionally also save to the global Custom Monster Compendium
      if (alsoSaveToCompendium) {
        const compendiumMonster: Monster = {
          ...updatedMonster,
          isCustom: true,
          source: 'Custom Compendium'
        };
        await saveMonster(compendiumMonster);
      }

      setEditingRoomMonster(null);
      toast.success(
        alsoSaveToCompendium
          ? `Saved "${trimmedName}" to Room Zone & Custom Monster Compendium!`
          : `Saved customized "${trimmedName}" to Room Zone!`
      );
    } catch (err) {
      console.error('[RoomBriefingDrawer] Failed to save customized room monster:', err);
      toast.error('Failed to save customized monster');
    } finally {
      setIsSavingRoomMonster(false);
    }
  };

  // Synchronize drawerTab when initialTab or room changes
  useEffect(() => {
    if (initialTab === 'flow' || !room) {
      setDrawerTab('flow');
    } else if (room) {
      setDrawerTab('room');
    }
  }, [initialTab, room?.id]);

  // Synchronize internal state when room prop changes
  useEffect(() => {
    if (!room) {
      currentRoomIdRef.current = null;
      setActiveRoom(null);
      setSelectedPdfRoomNum('');
      setManualMonsters([]);
      setHiddenMonsterNames([]);
      return;
    }

    const isNewRoom = currentRoomIdRef.current !== room.id;
    if (isNewRoom) {
      currentRoomIdRef.current = room.id;
      setDrawerTab('room');
      setIsEditMode(false);
      setConfirmDelete(false);
      setShowDrawerRoomsDropdown(false);
      setIsMonstersExpanded(false);
      setShowMonsterSelect(false);
      setMonsterSearchQuery('');
    }

    const roomNum = room.roomNumber || (room.label ? room.label.split(/[\s\-:]/)[0] : '1');
    const rName = room.roomName || (room.label ? room.label.replace(/^.*?[\-:]\s*/, '') : 'Zone');

    // Check for matching room in chapterPdfDigest
    const matchedDigestRoom = matchRoomInDigest(roomNum, rName, room.label, chapterPdfDigest?.rooms);

    let effectiveNotes = room.dmNotes || '';
    let effectiveBoxedText = room.boxedText || '';
    let effectiveRoomName = rName;
    let effectivePdfSection = room.pdfSection || '';
    let effectiveMonsters: any[] = (room.monsters && room.monsters.length > 0)
      ? room.monsters.filter((m: any) => !isNonCreatureStatOrItem(m))
      : [];

    if (matchedDigestRoom) {
      if (!effectiveNotes && matchedDigestRoom.dmNotes) {
        effectiveNotes = matchedDigestRoom.dmNotes;
      }
      if (!effectiveBoxedText && matchedDigestRoom.boxedText) {
        effectiveBoxedText = matchedDigestRoom.boxedText;
      }
      if ((!effectiveRoomName || effectiveRoomName === 'Zone' || effectiveRoomName.startsWith('Room ')) && matchedDigestRoom.roomName) {
        effectiveRoomName = matchedDigestRoom.roomName;
      }
      if (!effectivePdfSection) {
        effectivePdfSection = matchedDigestRoom.sceneTitle || (chapterPdfDigest?.chapterTitle ? `${chapterPdfDigest.chapterTitle} - Room ${matchedDigestRoom.roomNumber}` : `Room ${matchedDigestRoom.roomNumber}`);
      }
      if (effectiveMonsters.length === 0 && matchedDigestRoom.monsters && matchedDigestRoom.monsters.length > 0) {
        effectiveMonsters = matchedDigestRoom.monsters.filter((m: any) => !isNonCreatureStatOrItem(m));
      }
    } else {
      // Fallback default for Area V8
      const cleanNum = roomNum.toLowerCase().replace(/^(area|room|zone)\s*/i, '').replace(/[\s\-_:]/g, '');
      if ((cleanNum === 'v8' || cleanNum === '8' || room.label.toLowerCase().includes('v8')) && !effectiveNotes) {
        effectiveNotes = "Area V8: 9 Zombies lurk in this room, shuffling mindlessly in the shadows until disturbed.";
        if (!effectiveRoomName || effectiveRoomName === 'Zone' || effectiveRoomName.startsWith('Room ')) {
          effectiveRoomName = "Area V8";
        }
        if (effectiveMonsters.length === 0) {
          effectiveMonsters = ['9x Zombie'];
        }
      }
    }

    const mergedRoom: RoomAnnotation = {
      ...room,
      roomNumber: roomNum,
      roomName: effectiveRoomName,
      label: `${roomNum ? `${roomNum} - ` : ''}${effectiveRoomName}`,
      dmNotes: effectiveNotes,
      boxedText: effectiveBoxedText,
      pdfSection: effectivePdfSection,
      monsters: effectiveMonsters
    };

    setActiveRoom(mergedRoom);

    if (isNewRoom) {
      setEditRoomNumber(roomNum);
      setEditRoomName(effectiveRoomName);
      setEditBoxedText(effectiveBoxedText);
      setEditDmNotes(effectiveNotes);
      setEditPdfSection(effectivePdfSection);
      setEditPdfPage(room.pdfPage !== undefined ? room.pdfPage : (matchedDigestRoom ? 1 : ''));
      setEditColor(room.color || '#f59e0b');
      setManualMonsters(effectiveMonsters);
      setHiddenMonsterNames((room as any).hiddenMonsterNames || []);
      setSelectedPdfRoomNum(roomNum);
    }
  }, [room?.id]);

  if (!isOpen) return null;

  if (!activeRoom || drawerTab === 'flow') {
    const fallbackRoomTitle = activeRoom
      ? `${activeRoom.roomNumber ? `${activeRoom.roomNumber}: ` : ''}${activeRoom.roomName || activeRoom.label || 'Room'}`
      : null;

    return (
      <div
        id="room-briefing-drawer-overlay"
        className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          id="room-briefing-drawer-panel"
          className="fixed inset-y-0 right-0 w-full max-w-lg bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-right"
        >
          {/* Header in Chapter Flow Mode */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-850 bg-zinc-900/90 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  Non-Room Module Guide
                </span>
                <h2 className="text-sm font-bold text-zinc-100 truncate font-mono">
                  {chapterPdfDigest?.chapterTitle || activeSceneTitle || 'Chapter Flow & Rules'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeRoom && (
                <button
                  type="button"
                  onClick={() => setDrawerTab('room')}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all border cursor-pointer bg-zinc-800 hover:bg-zinc-750 text-amber-300 border-amber-500/30"
                  title={`Return to ${fallbackRoomTitle}`}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span className="max-w-[110px] truncate">{activeRoom.roomNumber || 'Room'}</span>
                </button>
              )}
              <button
                id="btn-close-room-drawer"
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 transition-colors cursor-pointer"
                title="Close Guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chapter Flow Body */}
          <div className="flex-1 overflow-y-auto p-5 pb-20 flex flex-col gap-5 custom-scrollbar">
            <ChapterFlowPanel
              chapterPdfDigest={chapterPdfDigest}
              activeSceneTitle={activeSceneTitle}
              activeDmNotes={activeDmNotes}
              roomAnnotations={roomAnnotations}
              availableMonsters={allAvailableMonsters}
              onBroadcastReadAloud={onBroadcastReadAloud}
              onSpawnMonsterToken={(tokenData) => {
                if (onSpawnMonsterToken) {
                  onSpawnMonsterToken({
                    ...tokenData,
                    polygonPoints: activeRoom?.polygonPoints
                  });
                }
              }}
              onSelectRoomByNumber={(rNum) => {
                if (onSelectRoomByNumber) {
                  onSelectRoomByNumber(rNum);
                  setDrawerTab('room');
                }
              }}
              onUpdateDigest={onUpdateDigest}
            />
          </div>
        </div>
      </div>
    );
  }

  const roomNumber = activeRoom.roomNumber || (activeRoom.label ? activeRoom.label.split(/[\s\-:]/)[0] : '1');
  const roomName = activeRoom.roomName || (activeRoom.label ? activeRoom.label.replace(/^.*?[\-:]\s*/, '') : 'Zone');
  const displayTitle = `${roomNumber ? `${roomNumber}: ` : ''}${roomName}`;
  const accentColor = activeRoom.color || '#f59e0b';
  const hasPolygon = activeRoom.polygonPoints && activeRoom.polygonPoints.length >= 6;
  const vertexCount = hasPolygon ? activeRoom.polygonPoints!.length / 2 : 4;

  const handleCopyBoxedText = () => {
    if (!activeRoom.boxedText) return;
    navigator.clipboard.writeText(activeRoom.boxedText);
    setCopiedText(true);
    toast.success('Read-aloud text copied to clipboard');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleBroadcast = async () => {
    if (!activeRoom.boxedText) {
      toast.error('No read-aloud text available for this room.');
      return;
    }
    if (onBroadcastReadAloud) {
      try {
        setIsBroadcasting(true);
        await onBroadcastReadAloud(activeRoom.boxedText, displayTitle, selectedVoice);
        setBroadcastedSuccess(true);
        setTimeout(() => setBroadcastedSuccess(false), 2500);
      } catch (err: any) {
        console.error('[RoomBriefingDrawer] Broadcast error:', err);
        toast.error('Failed to broadcast read-aloud to players');
      } finally {
        setIsBroadcasting(false);
      }
    }
  };

  const handleToggleSpeech = async () => {
    if (!activeRoom.boxedText) {
      toast.error('No text to narrate.');
      return;
    }

    if (isSpeaking) {
      audioNarration.stop();
      return;
    }

    try {
      await audioNarration.play({
        text: activeRoom.boxedText,
        voiceId: selectedVoice,
      });
    } catch (err) {
      console.error("TTS error:", err);
      toast.error("Failed to generate narration audio.");
    }
  };

  const handleOpenPdfPage = (pageNumber?: number) => {
    const targetPage = pageNumber ?? activeRoom.pdfPage;
    if (!targetPage) {
      toast.info('No PDF page specified for this room.');
      return;
    }

    // Try finding an uploaded PDF in campaign assets
    const pdfAsset = campaignPdfs.find((p) => p.url && p.url.endsWith('.pdf')) || campaignPdfs[0];

    if (pdfAsset?.url) {
      window.open(`${pdfAsset.url}#page=${targetPage}`, '_blank');
      toast.info(`Opening campaign PDF at Page ${targetPage}`);
    } else {
      toast.info(`PDF Reference: ${activeRoom.pdfSection || 'Module'} — Page ${targetPage}`);
    }
  };

  const handleSave = async () => {
    if (!activeRoom) return;
    setIsSaving(true);

    try {
      const parsedPage = typeof editPdfPage === 'number' ? editPdfPage : editPdfPage ? parseInt(editPdfPage, 10) : undefined;
      const updatedData: RoomAnnotation = {
        ...activeRoom,
        roomNumber: editRoomNumber.trim(),
        roomName: editRoomName.trim(),
        label: `${editRoomNumber.trim() ? `${editRoomNumber.trim()} - ` : ''}${editRoomName.trim()}`,
        boxedText: editBoxedText,
        dmNotes: editDmNotes,
        pdfSection: editPdfSection.trim(),
        pdfPage: isNaN(parsedPage as number) ? undefined : parsedPage,
        color: editColor,
        monsters: manualMonsters,
        hiddenMonsterNames: hiddenMonsterNames
      };

      // Write to Firestore across collections
      await updateRoomAnnotation({
        campaignId,
        chapterId,
        sceneId,
        zone: updatedData,
        activeSessionId
      });

      setActiveRoom(updatedData);
      if (onUpdateRoom) {
        onUpdateRoom(updatedData);
      }

      setIsEditMode(false);
      toast.success(`Updated room "${updatedData.label}" in Firestore`);
    } catch (err) {
      console.error('[RoomBriefingDrawer] Save error:', err);
      toast.error('Failed to save room updates to Firestore');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (onDeleteRoom && activeRoom) {
      onDeleteRoom(activeRoom.id);
      onClose();
      toast.success(`Room "${displayTitle}" deleted`);
    }
  };

  return (
    <div
      id="room-briefing-drawer-overlay"
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="room-briefing-drawer-panel"
        className="fixed inset-y-0 right-0 w-full max-w-lg bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850 bg-zinc-900/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-4 h-4 rounded-md shrink-0 shadow-md ring-1 ring-white/20"
              style={{ backgroundColor: isEditMode ? editColor : accentColor }}
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
                  {hasPolygon ? `Polygon Room (${vertexCount} pts)` : 'Room Zone'}
                </span>
                {activeRoom.pdfPage && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 border border-zinc-700">
                    p. {activeRoom.pdfPage}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-zinc-100 truncate font-mono" title={displayTitle}>
                {displayTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Switch to Chapter Flow Guide */}
            <button
              type="button"
              onClick={() => setDrawerTab('flow')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all border cursor-pointer bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
              title="Open Chapter Flow, Story Hooks, Dungeon Rules & Roaming Patrols"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Guide</span>
            </button>

            {/* Edit Mode Toggle */}
            {isEditMode && (
              <button
                onClick={handleSave}
                className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all border cursor-pointer bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30"
                title="Save Room Details"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            )}
            <button
              id="btn-drawer-toggle-edit"
              onClick={() => {
                if (isEditMode) {
                  // Revert edits
                  setEditRoomNumber(roomNumber);
                  setEditRoomName(roomName);
                  setEditBoxedText(activeRoom.boxedText || '');
                  setEditDmNotes(activeRoom.dmNotes || '');
                  setEditPdfSection(activeRoom.pdfSection || '');
                  setEditPdfPage(activeRoom.pdfPage !== undefined ? activeRoom.pdfPage : '');
                  setEditColor(activeRoom.color || '#f59e0b');
                  setIsEditMode(false);
                } else {
                  setIsEditMode(true);
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                isEditMode
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
              title={isEditMode ? 'Cancel Editing' : 'Edit Room Details'}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Cancel' : 'Edit'}</span>
            </button>

            {/* Close Button */}
            <button
              id="btn-close-room-drawer"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 transition-colors cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 pb-20 flex flex-col gap-5 custom-scrollbar">
          {isEditMode ? (
            /* ================= EDIT MODE FORM ================= */
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Room #</label>
                  <input
                    type="text"
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    placeholder="e.g. C5"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-xl text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Room Name</label>
                  <input
                    type="text"
                    value={editRoomName}
                    onChange={(e) => setEditRoomName(e.target.value)}
                    placeholder="e.g. Sarcelle's Cell"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-xl text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Player Read-Aloud Textarea */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Player Read-Aloud Boxed Text
                  </label>
                  <span className="text-[10px] text-zinc-500">Shared with players</span>
                </div>
                <textarea
                  value={editBoxedText}
                  onChange={(e) => setEditBoxedText(e.target.value)}
                  placeholder="The cold stone walls drip with moisture. A faint rattling comes from the rusted iron chains..."
                  rows={5}
                  className="w-full p-3 bg-zinc-900 border border-zinc-750 rounded-xl text-xs text-zinc-100 leading-relaxed font-sans focus:outline-none focus:border-amber-500 resize-y"
                />
              </div>

              {/* DM Secret Notes Textarea */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase text-rose-400 font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    DM Secret Notes (Hidden from Players)
                  </label>
                  <span className="text-[10px] text-zinc-500">Traps, DCs, Tactics</span>
                </div>
                <textarea
                  value={editDmNotes}
                  onChange={(e) => setEditDmNotes(e.target.value)}
                  placeholder="DC 15 Investigation reveals the loose floorboard under the cot. 2 Skeletons animate when the chest is disturbed..."
                  rows={5}
                  className="w-full p-3 bg-zinc-900 border border-zinc-750 rounded-xl text-xs text-zinc-100 leading-relaxed font-sans focus:outline-none focus:border-rose-500 resize-y"
                />
              </div>

              {/* PDF Chapter Link Section */}
              {chapterPdfDigest?.rooms && chapterPdfDigest.rooms.length > 0 && (
                <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-300 font-bold flex items-center gap-1.5 uppercase">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Link to PDF Chapter Room
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDrawerRoomsDropdown(!showDrawerRoomsDropdown)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold font-mono"
                    >
                      {showDrawerRoomsDropdown ? '[Close]' : '[Link PDF Room]'}
                    </button>
                  </div>
                  
                  {showDrawerRoomsDropdown ? (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search PDF rooms..."
                          value={selectedPdfRoomNum}
                          onChange={(e) => setSelectedPdfRoomNum(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                      <div className="max-h-36 overflow-y-auto border border-zinc-900 rounded-lg p-1 bg-zinc-950 divide-y divide-zinc-900 sidebar-scrollbar">
                        {chapterPdfDigest.rooms
                          .filter(r => !selectedPdfRoomNum || r.roomNumber.toLowerCase().includes(selectedPdfRoomNum.toLowerCase()) || r.roomName.toLowerCase().includes(selectedPdfRoomNum.toLowerCase()))
                          .map((r, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setEditRoomNumber(r.roomNumber);
                                setEditRoomName(r.roomName);
                                setEditBoxedText(r.boxedText || '');
                                setEditDmNotes(r.dmNotes || '');
                                if (r.sceneTitle) {
                                  setEditPdfSection(r.sceneTitle);
                                } else if (chapterPdfDigest.chapterTitle) {
                                  setEditPdfSection(`${chapterPdfDigest.chapterTitle} - Room ${r.roomNumber}`);
                                } else {
                                  setEditPdfSection(`Room ${r.roomNumber}`);
                                }
                                if (r.monsters && r.monsters.length > 0) {
                                  setManualMonsters(r.monsters);
                                }
                                setShowDrawerRoomsDropdown(false);
                                toast.success(`Linked to PDF Room "${r.roomNumber}: ${r.roomName}"`);
                              }}
                              className="w-full text-left px-2 py-1.5 text-xs font-mono flex items-center justify-between hover:bg-zinc-850 text-zinc-300 transition-colors rounded cursor-pointer"
                            >
                              <span>
                                <strong className="text-amber-400 font-bold">{r.roomNumber}</strong>: {r.roomName}
                              </span>
                              {r.sceneTitle && (
                                <span className="text-[9px] text-zinc-500 shrink-0 max-w-[120px] truncate">{r.sceneTitle}</span>
                              )}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-400 leading-normal">
                      Automatically link this map zone to any of the digested rooms in the chapter PDF to populate details.
                    </div>
                  )}
                </div>
              )}

              {/* PDF Cross-Reference Fields */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold">PDF Module / Section</label>
                  <input
                    type="text"
                    value={editPdfSection}
                    onChange={(e) => setEditPdfSection(e.target.value)}
                    placeholder="e.g. Chapter 2: The Dungeons"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold">PDF Page #</label>
                  <input
                    type="number"
                    value={editPdfPage}
                    onChange={(e) => setEditPdfPage(e.target.value ? parseInt(e.target.value, 10) : '')}
                    placeholder="e.g. 42"
                    min={1}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Color Picker & Redraw Polygon */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold">Pin Color:</label>
                  <div className="flex items-center gap-2">
                    {['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${
                          editColor === c ? 'scale-125 border-white ring-2 ring-white/30' : 'border-black/40 hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {onRedrawPolygon && activeRoom && (
                  <button
                    type="button"
                    id="btn-drawer-edit-redraw-polygon"
                    onClick={() => {
                      const parsedPage = typeof editPdfPage === 'number' ? editPdfPage : editPdfPage ? parseInt(editPdfPage, 10) : undefined;
                      const currentDraft: RoomAnnotation = {
                        ...activeRoom,
                        roomNumber: editRoomNumber.trim(),
                        roomName: editRoomName.trim(),
                        label: `${editRoomNumber.trim() ? `${editRoomNumber.trim()} - ` : ''}${editRoomName.trim()}`,
                        boxedText: editBoxedText,
                        dmNotes: editDmNotes,
                        pdfSection: editPdfSection.trim(),
                        pdfPage: isNaN(parsedPage as number) ? undefined : parsedPage,
                        color: editColor,
                        monsters: manualMonsters,
                        hiddenMonsterNames: hiddenMonsterNames
                      };
                      onRedrawPolygon(currentDraft);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    title="Trace a new polygon boundary on the battlemap for this room zone"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Redraw Polygon</span>
                  </button>
                )}
              </div>

              {/* Save & Cancel Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  id="btn-drawer-save-changes"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving to Firestore...' : 'Save Updates to Firestore'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================= VIEW MODE ================= */
            <>
              {/* Player Read-Aloud Box */}
              <div className="flex flex-col gap-2.5 bg-gradient-to-b from-amber-950/20 to-zinc-900/60 border border-amber-500/30 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[11px] font-mono uppercase font-black tracking-wider text-amber-300">
                      Player Read-Aloud Box
                    </span>
                  </div>

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
                    {/* TTS Button */}
                    <button
                      type="button"
                      onClick={handleToggleSpeech}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isSpeaking
                          ? 'bg-amber-500 text-zinc-950 border-amber-400'
                          : 'bg-zinc-850 text-zinc-400 hover:text-zinc-200 border-zinc-750'
                      }`}
                      title={isSpeaking ? 'Stop narration' : 'Narrate with Text-to-Speech'}
                    >
                      {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>

                    {/* Copy to Clipboard */}
                    <button
                      type="button"
                      onClick={handleCopyBoxedText}
                      className="p-1.5 rounded-lg bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-750 transition-colors cursor-pointer"
                      title="Copy read-aloud text"
                    >
                      {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Boxed Content */}
                {activeRoom.boxedText ? (
                  <div className="text-zinc-200 text-xs leading-relaxed font-serif italic bg-zinc-950/70 p-3.5 rounded-xl border border-amber-500/20 shadow-inner max-h-56 overflow-y-auto custom-scrollbar">
                    <ReactMarkdown>{activeRoom.boxedText}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-zinc-500 text-xs italic">
                    No player read-aloud text drafted. Click "Edit" above to write narrative text for this room.
                  </div>
                )}

                {/* Broadcast to Players CTA */}
                {activeRoom.boxedText && (
                  <button
                    type="button"
                    id="btn-broadcast-room-text"
                    onClick={handleBroadcast}
                    disabled={isBroadcasting}
                    className={`w-full mt-1 py-2 px-3 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      broadcastedSuccess
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : isBroadcasting
                        ? 'bg-amber-600/30 text-amber-300 border-amber-500/50 animate-pulse'
                        : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                    } disabled:opacity-50`}
                    title="Send this read-aloud description and selected voice exclusively to player viewports"
                  >
                    {broadcastedSuccess ? (
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
                        <span>Broadcast Read-Aloud to Players</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* DM Secret Notes Section (Collapsible & Restrained) */}
              <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/95 p-4 shadow-md overflow-hidden shrink-0 relative isolate">
                {/* Header */}
                <div
                  className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 cursor-pointer w-full select-none"
                  onClick={() => setIsDmNotesExpanded(!isDmNotesExpanded)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsDmNotesExpanded(!isDmNotesExpanded); }}
                >
                  <span className="font-mono text-xs text-zinc-200 flex items-center gap-2 font-bold uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    DM Secret Notes (Hidden from Players)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowFullDmNotesModal(true); }}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                        title="Expand to Full View"
                    >
                        <Maximize className="w-4 h-4" />
                    </button>
                    {isDmNotesExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Restrained Scrollable Outer Wrapper */}
                {isDmNotesExpanded && (
                  <div className="flex flex-col rounded-xl bg-zinc-950/90 border border-zinc-800/90 overflow-hidden shadow-inner">
                    <div className="p-3.5 max-h-72 sm:max-h-80 overflow-y-auto custom-scrollbar break-words text-zinc-200 text-xs sm:text-sm leading-relaxed font-sans select-text">
                      {activeRoom.dmNotes ? (
                        <div className="break-words space-y-2 text-zinc-200 [&_p]:leading-relaxed [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-rose-400 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-rose-300 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-zinc-200 [&_strong]:text-amber-300 [&_strong]:font-semibold [&_em]:text-zinc-300 [&_blockquote]:border-l-2 [&_blockquote]:border-rose-500/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-zinc-400">
                          <ReactMarkdown>{activeRoom.dmNotes}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-center text-zinc-500 text-xs italic py-3">
                          No secret DM notes recorded for this room. Click "Edit" above to record tactical secrets.
                        </div>
                      )}
                    </div>
                    
                    {/* Clear visual bottom boundary footer */}
                    {activeRoom.dmNotes && (
                      <div className="px-3.5 py-2 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0">
                        <span className="flex items-center gap-1.5 text-rose-400/90 font-medium">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>End of DM Notes (Confidential)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowFullDmNotesModal(true)}
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-semibold hover:underline cursor-pointer transition-colors"
                          title="Open full view modal"
                        >
                          <Maximize className="w-3.5 h-3.5" />
                          <span>Expand Fullscreen</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Full-screen DM Notes Modal */}
              {showFullDmNotesModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowFullDmNotesModal(false)}>
                      <div className="bg-zinc-950 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-4">
                              <h2 className="font-mono text-lg text-zinc-100 font-bold uppercase tracking-wider flex items-center gap-2">
                                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                                  DM Secret Notes
                              </h2>
                              <button onClick={() => setShowFullDmNotesModal(false)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
                                  <X className="w-5 h-5" />
                              </button>
                          </div>
                          <div className="flex-1 overflow-y-auto custom-scrollbar prose prose-invert prose-zinc max-w-none text-base leading-relaxed text-zinc-300 font-sans whitespace-pre-wrap">
                              <ReactMarkdown>{activeRoom?.dmNotes || ''}</ReactMarkdown>
                          </div>
                      </div>
                  </div>
              )}

              {/* Contextual Linked Chapter Events / Roaming Patrols for this Room */}
              {(() => {
                const targetNum = (activeRoom.roomNumber || '').trim().toLowerCase();
                if (!targetNum || !chapterPdfDigest) return null;

                const linkedPatrols = (chapterPdfDigest.roamingEncounters || []).filter((p) => {
                  const inRelated = (p.relatedRooms || []).some((r) => r.trim().toLowerCase() === targetNum);
                  const inRoute = new RegExp(`\\b${targetNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(p.routeOrTrigger || '');
                  return inRelated || inRoute;
                });

                const linkedBeats = (chapterPdfDigest.storyBeats || []).filter((b) =>
                  (b.relatedRooms || []).some((r) => r.trim().toLowerCase() === targetNum)
                );

                if (linkedPatrols.length === 0 && linkedBeats.length === 0) return null;

                return (
                  <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Linked Chapter Events & Patrols ({linkedPatrols.length + linkedBeats.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setDrawerTab('flow')}
                        className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                      >
                        Open Chapter Flow →
                      </button>
                    </div>
                    {linkedPatrols.map((patrol) => (
                      <div key={patrol.id} className="p-2 rounded-xl bg-zinc-950/80 border border-rose-500/25 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold font-mono text-rose-300">🚨 Patrol: {patrol.title}</span>
                          <button
                            type="button"
                            onClick={() => setDrawerTab('flow')}
                            className="px-2 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold cursor-pointer"
                          >
                            View Patrol
                          </button>
                        </div>
                        {patrol.routeOrTrigger && (
                          <span className="text-[11px] text-zinc-400 font-mono">{patrol.routeOrTrigger}</span>
                        )}
                      </div>
                    ))}
                    {linkedBeats.map((beat) => (
                      <div key={beat.id} className="p-2 rounded-xl bg-zinc-950/80 border border-amber-500/20 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-bold font-mono text-amber-200 block truncate">📖 {beat.title}</span>
                          {beat.triggerCondition && (
                            <span className="text-[10px] text-zinc-400 font-mono block truncate">Trigger: {beat.triggerCondition}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setDrawerTab('flow')}
                          className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold shrink-0 cursor-pointer"
                        >
                          Read Beat
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Detected Monsters & Spawning Section */}
              {(() => {
                const matchedDigestRoom = matchRoomInDigest(
                  activeRoom.roomNumber || '',
                  activeRoom.roomName || '',
                  activeRoom.label || '',
                  chapterPdfDigest?.rooms
                );

                const cleanRoomNum = (activeRoom.roomNumber || activeRoom.label || '').toLowerCase().replace(/^(area|room|zone)\s*/i, '').replace(/[\s\-_:]/g, '');
                const isRoomV8 = cleanRoomNum === 'v8' ||
                  (activeRoom.label || '').toLowerCase().includes('v8') ||
                  (activeRoom.roomName || '').toLowerCase().includes('v8') ||
                  (activeRoom.roomName || '').toLowerCase().includes('coffin maker');

                const uniqueMonsterEntries = extractAndResolveRoomMonsters({
                  manualMonsters,
                  roomMonsters: activeRoom.monsters,
                  digestMonsters: matchedDigestRoom?.monsters,
                  dmNotes: activeRoom.dmNotes,
                  digestDmNotes: matchedDigestRoom?.dmNotes,
                  roomNumber: activeRoom.roomNumber,
                  roomName: activeRoom.roomName,
                  label: activeRoom.label,
                  allAvailableMonsters,
                  hiddenMonsterNames
                });

                const totalMonstersCount = uniqueMonsterEntries.reduce((sum, e) => sum + e.count, 0);

                const sizeToNumber = (sz?: string): number => {
                  if (!sz) return 1;
                  const s = String(sz).toLowerCase();
                  if (s === 'large') return 2;
                  if (s === 'huge') return 3;
                  if (s === 'gargantuan') return 4;
                  return 1;
                };

                const handleSpawnAll = () => {
                  let spawnedCount = 0;
                  uniqueMonsterEntries.forEach(({ monster: m, count }) => {
                    for (let i = 0; i < count; i++) {
                      onSpawnMonsterToken?.({
                        name: count > 1 ? `${m.name} ${i + 1}` : m.name,
                        avatarUrl: m.avatarUrl || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150',
                        hp: m.hp || 10,
                        ac: m.ac || 10,
                        size: sizeToNumber(m.size),
                        polygonPoints: activeRoom?.polygonPoints,
                        customMonsterData: m
                      });
                      spawnedCount++;
                    }
                  });
                  toast.success(`Spawned ${spawnedCount} monster tokens onto battlemap!`);
                };

                const handleSpawnSingle = (m: Monster, count: number) => {
                  for (let i = 0; i < count; i++) {
                    onSpawnMonsterToken?.({
                      name: count > 1 ? `${m.name} ${i + 1}` : m.name,
                      avatarUrl: m.avatarUrl || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150',
                      hp: m.hp || 10,
                      ac: m.ac || 10,
                      size: sizeToNumber(m.size),
                      polygonPoints: activeRoom?.polygonPoints,
                      customMonsterData: m
                    });
                  }
                  toast.success(`Spawned ${count > 1 ? `${count}x ` : ''}${m.name} onto battlemap!`);
                };

                return (
                  <div 
                    className={`flex flex-col gap-3 p-4 rounded-2xl bg-red-950/20 border border-red-900/40 shadow-lg transition-all duration-200 shrink-0 relative ${showMonsterSelect ? 'z-30' : 'z-10'}`}
                  >
                    {/* Collapsible Header */}
                    <div
                      className="flex items-center justify-between cursor-pointer select-none group w-full"
                      onClick={() => setIsMonstersExpanded(!isMonstersExpanded)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsMonstersExpanded(!isMonstersExpanded); }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-xs font-mono font-bold text-zinc-100 uppercase tracking-wider truncate">
                          Monsters & Encounters ({totalMonstersCount})
                        </span>
                        {isRoomV8 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-red-900/40 text-red-300 border border-red-700/50 shrink-0">
                            Area V8
                          </span>
                        )}
                        {!isMonstersExpanded && uniqueMonsterEntries.length > 0 && (
                          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-zinc-900/90 border border-zinc-800 truncate max-w-[170px]">
                            {uniqueMonsterEntries.map(e => `${e.count}x ${e.monster.name}`).join(', ')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {totalMonstersCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSpawnAll();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow shadow-red-950/50 cursor-pointer"
                            title="Spawn all monsters onto map"
                          >
                            Spawn All ({totalMonstersCount})
                          </button>
                        )}
                        <button
                          type="button"
                          className="p-1 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
                          aria-label={isMonstersExpanded ? "Collapse Monsters Section" : "Expand Monsters Section"}
                        >
                          {isMonstersExpanded ? (
                            <ChevronUp className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Quick collapsed hint preview */}
                    {!isMonstersExpanded && (
                      <div
                        onClick={() => setIsMonstersExpanded(true)}
                        className="flex items-center justify-between pt-1 border-t border-red-900/20 text-[11px] font-mono text-zinc-400/90 hover:text-zinc-200 transition-colors cursor-pointer"
                      >
                        <span className="truncate">
                          {uniqueMonsterEntries.length > 0
                            ? `${totalMonstersCount} creature${totalMonstersCount > 1 ? 's' : ''} queued — click to expand details & tokens`
                            : 'Monsters section collapsed — click to add or load creatures'}
                        </span>
                        <span className="text-[10px] text-red-400 font-bold shrink-0 ml-2 hover:underline">
                          Expand &rarr;
                        </span>
                      </div>
                    )}

                    {/* Expanded Content */}
                    {isMonstersExpanded && (() => {
                      const query = monsterSearchQuery.trim().toLowerCase();
                      const filteredMonstersToAdd = allAvailableMonsters
                        .filter(m => {
                          if (!query) return true;
                          const nameMatch = m.name?.toLowerCase().includes(query);
                          const crMatch = m.challenge ? `cr ${m.challenge}`.toLowerCase().includes(query) || m.challenge.toLowerCase().includes(query) : false;
                          const typeMatch = m.type ? m.type.toLowerCase().includes(query) : false;
                          return nameMatch || crMatch || typeMatch;
                        })
                        .sort((a, b) => a.name.localeCompare(b.name));

                      return (
                      <div className="flex flex-col gap-3 pt-2 border-t border-red-900/30 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] text-zinc-400 font-mono leading-normal">
                            Monsters detected for this room. Click "Spawn" to drop live battlemap tokens into the polygon bounds.
                          </p>

                          <div ref={monsterDropdownRef} className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setShowMonsterSelect(!showMonsterSelect);
                                if (showMonsterSelect) setMonsterSearchQuery('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-1.5 border border-zinc-700 transition-colors cursor-pointer shadow-sm active:scale-95"
                              title="Add Monster to this Room"
                            >
                              <Plus className="w-3.5 h-3.5 text-red-400" />
                              <span className="font-semibold">Add Monster</span>
                            </button>
                            {showMonsterSelect && (
                              <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-96 animate-in fade-in zoom-in-95 duration-150">
                                {/* Search & Header */}
                                <div className="p-2.5 pb-2 border-b border-zinc-800 flex flex-col gap-2 bg-zinc-900/90">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                      <Sparkles className="w-3 h-3 text-red-400" />
                                      Select Monster to Add
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-500 font-medium">
                                      {filteredMonstersToAdd.length} creature{filteredMonstersToAdd.length === 1 ? '' : 's'}
                                    </span>
                                  </div>
                                  <div className="relative flex items-center">
                                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
                                    <input
                                      ref={monsterSearchInputRef}
                                      type="text"
                                      value={monsterSearchQuery}
                                      onChange={(e) => setMonsterSearchQuery(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          if (filteredMonstersToAdd.length > 0) {
                                            handleAddMonster(filteredMonstersToAdd[0]);
                                          } else if (monsterSearchQuery.trim()) {
                                            handleAddMonster(monsterSearchQuery.trim());
                                          }
                                        }
                                      }}
                                      placeholder="Search by name, type, CR (Enter to add)..."
                                      className="w-full bg-zinc-950 border border-zinc-750 focus:border-red-500/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 font-sans outline-none transition-colors"
                                    />
                                    {monsterSearchQuery && (
                                      <button
                                        type="button"
                                        onClick={() => setMonsterSearchQuery('')}
                                        className="absolute right-2 p-0.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                                        title="Clear search"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  {monsterSearchQuery.trim() && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddMonster(monsterSearchQuery.trim())}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-700/60 text-red-200 text-xs font-mono flex items-center justify-between transition-colors cursor-pointer text-left"
                                    >
                                      <span>+ Add <strong>"{monsterSearchQuery.trim()}"</strong></span>
                                      <span className="text-[10px] text-red-300 font-bold">↵</span>
                                    </button>
                                  )}
                                </div>

                                {/* Scrollable Monster List */}
                                <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-0.5 sidebar-scrollbar max-h-64">
                                  {filteredMonstersToAdd.length > 0 ? (
                                    filteredMonstersToAdd.map((m) => (
                                      <button
                                        key={m.monsterId}
                                        type="button"
                                        onClick={() => handleAddMonster(m)}
                                        className="w-full text-left px-2.5 py-2 hover:bg-zinc-800/80 active:bg-zinc-800 text-xs text-zinc-200 rounded-lg flex items-center justify-between transition-colors group cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                          {m.avatarUrl ? (
                                            <img src={m.avatarUrl} alt={m.name} className="w-6 h-6 rounded-full object-cover shrink-0 border border-zinc-750" />
                                          ) : (
                                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-bold shrink-0">
                                              {m.name[0]}
                                            </div>
                                          )}
                                          <div className="flex flex-col min-w-0">
                                            <span className="font-medium text-zinc-200 group-hover:text-white truncate">
                                              {m.name}
                                            </span>
                                            {m.type && (
                                              <span className="text-[10px] text-zinc-500 capitalize truncate">
                                                {m.size ? `${m.size} ` : ''}{m.type}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-[10px] text-zinc-400 font-mono bg-zinc-950/70 border border-zinc-800 px-1.5 py-0.5 rounded">
                                            CR {m.challenge}
                                          </span>
                                          <Plus className="w-3.5 h-3.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="py-6 px-3 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
                                      <p className="text-xs font-mono">No creatures match "{monsterSearchQuery}"</p>
                                      {monsterSearchQuery.trim() && (
                                        <button
                                          type="button"
                                          onClick={() => handleAddMonster(monsterSearchQuery.trim())}
                                          className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-mono font-bold cursor-pointer transition-colors shadow"
                                        >
                                          + Add "{monsterSearchQuery.trim()}" as Creature
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                    {uniqueMonsterEntries.length === 0 ? (
                      <div ref={emptyStateDropdownRef} className="p-4 rounded-xl border border-dashed border-red-900/40 bg-zinc-950/50 text-center flex flex-col items-center gap-2.5">
                        <p className="text-xs text-zinc-400 font-mono">No creatures currently attached to this room.</p>
                        {isRoomV8 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const zombie = allAvailableMonsters.find(m => m.name.toLowerCase() === 'zombie') || SRD_MONSTERS.find(m => m.name.toLowerCase() === 'zombie');
                              if (zombie) {
                                handleAddMonster(zombie, 9);
                              } else {
                                handleAddMonster('Zombie', 9);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/50 transition-all active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Load Area V8: 9x Zombies</span>
                          </button>
                        ) : showMonsterSelect ? (
                          <div className="w-full text-left bg-zinc-900/95 border border-zinc-700/80 rounded-xl p-3 flex flex-col gap-2.5 shadow-xl animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                                Select Monster from Compendium
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowMonsterSelect(false);
                                  setMonsterSearchQuery('');
                                }}
                                className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                              >
                                [Cancel]
                              </button>
                            </div>
                            <div className="relative flex items-center">
                              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
                              <input
                                type="text"
                                value={monsterSearchQuery}
                                onChange={(e) => setMonsterSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (filteredMonstersToAdd.length > 0) {
                                      handleAddMonster(filteredMonstersToAdd[0]);
                                    } else if (monsterSearchQuery.trim()) {
                                      handleAddMonster(monsterSearchQuery.trim());
                                    }
                                  }
                                }}
                                autoFocus
                                placeholder="Search by name, type, CR (press Enter to add)..."
                                className="w-full bg-zinc-950 border border-zinc-700 focus:border-red-500 rounded-lg pl-8 pr-7 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none"
                              />
                              {monsterSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setMonsterSearchQuery('')}
                                  className="absolute right-2 p-0.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                                  title="Clear search"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            {monsterSearchQuery.trim() && (
                              <button
                                type="button"
                                onClick={() => handleAddMonster(monsterSearchQuery.trim())}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-700/60 text-red-200 text-xs font-mono flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <span>+ Add <strong>"{monsterSearchQuery.trim()}"</strong> to Room</span>
                                <span className="text-[10px] text-red-300 font-bold">Press Enter ↵</span>
                              </button>
                            )}
                            <div className="max-h-56 overflow-y-auto flex flex-col gap-1 sidebar-scrollbar">
                              {filteredMonstersToAdd.slice(0, 30).map((m) => (
                                <button
                                  key={m.monsterId}
                                  type="button"
                                  onClick={() => handleAddMonster(m)}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-800 active:bg-zinc-750 text-xs text-zinc-200 rounded-lg flex items-center justify-between transition-colors group cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {m.avatarUrl ? (
                                      <img src={m.avatarUrl} alt={m.name} className="w-6 h-6 rounded-full object-cover shrink-0 border border-zinc-700" />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-bold shrink-0">
                                        {m.name[0]}
                                      </div>
                                    )}
                                    <span className="font-medium text-zinc-200 group-hover:text-white truncate">{m.name}</span>
                                    {m.type && <span className="text-[10px] text-zinc-500 capitalize truncate">({m.type})</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] text-zinc-400 font-mono bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded">
                                      CR {m.challenge}
                                    </span>
                                    <Plus className="w-3.5 h-3.5 text-red-400 opacity-0 group-hover:opacity-100" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMonsterSelect(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-zinc-700 transition-all active:scale-95 shadow"
                          >
                            <Plus className="w-3.5 h-3.5 text-red-400" />
                            <span>Choose Creature from Compendium</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {uniqueMonsterEntries.map(({ monster: m, count, source, matchedSnippet }, mIdx) => {
                          const isMonsterCustomized = Boolean(
                            m.isCustom ||
                            m.isRoomCustom ||
                            m.source === 'Custom Compendium' ||
                            m.source === 'Room Zone Custom'
                          );
                          return (
                          <div
                            key={mIdx}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border transition-colors relative group min-w-0 overflow-hidden shadow-sm ${
                              isMonsterCustomized
                                ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400/60'
                                : 'bg-zinc-900/90 border-zinc-800/80 hover:border-zinc-700'
                            }`}
                          >
                            <div
                              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                              onClick={() => handleOpenRoomMonsterCustomizer(m, count)}
                              title={`Click to customize ${m.name} for this room zone`}
                            >
                              {m.avatarUrl ? (
                                <img
                                  src={m.avatarUrl}
                                  alt={m.name}
                                  className="w-10 h-10 rounded-full border border-zinc-700/80 object-cover shrink-0 shadow-sm"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300 font-bold font-mono text-xs shrink-0 shadow-sm">
                                  {m.name[0]}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                  <span className="text-xs font-bold text-zinc-100 group-hover:text-amber-200 transition-colors font-mono truncate max-w-[180px] sm:max-w-[220px]" title={m.name}>
                                    {m.name}
                                  </span>
                                  {count > 1 && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-red-900/50 text-red-300 font-bold text-[10px] font-mono border border-red-800/50 shrink-0">
                                      ×{count}
                                    </span>
                                  )}
                                  {isMonsterCustomized && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                      ★ Custom
                                    </span>
                                  )}
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono border shrink-0 ${
                                      source === 'manual'
                                        ? 'bg-amber-950/50 text-amber-300 border-amber-700/40'
                                        : source === 'digest'
                                          ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/40'
                                          : 'bg-sky-950/50 text-sky-300 border-sky-700/40'
                                    }`}
                                    title={
                                      matchedSnippet
                                        ? `Detected in DM Notes: "...${matchedSnippet}..."`
                                        : source === 'digest'
                                          ? 'Verified from Chapter PDF Digest'
                                          : 'Saved to Room Zone'
                                    }
                                  >
                                    {source === 'manual' ? 'Room Saved' : source === 'digest' ? 'PDF Digest' : 'DM Notes'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
                                  CR {m.challenge} · AC {m.ac} · HP {m.hp}
                                  {m.actions && m.actions.length > 0 ? ` · ${m.actions.length} action${m.actions.length === 1 ? '' : 's'}` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {/* Customize Room Monster Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenRoomMonsterCustomizer(m, count)}
                                className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                title={`Edit & customize ${m.name} stats, attacks, and traits for this Room Zone`}
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Customize</span>
                              </button>

                              {/* Quantity Adjustment */}
                              <div className="flex items-center bg-zinc-800/90 rounded-lg border border-zinc-700/80 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleDecreaseCount(m, count)}
                                  className="px-2 py-1 text-zinc-400 hover:text-white font-mono text-xs transition-colors cursor-pointer hover:bg-zinc-700/50"
                                  title="Decrease count"
                                >
                                  -
                                </button>
                                <span className="text-[10px] font-bold text-zinc-200 font-mono px-1.5">
                                  {count}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleIncreaseCount(m)}
                                  className="px-2 py-1 text-zinc-400 hover:text-white font-mono text-xs transition-colors cursor-pointer hover:bg-zinc-700/50"
                                  title="Increase count"
                                >
                                  +
                                </button>
                              </div>

                              {/* Spawn Button */}
                              {onSpawnMonsterToken && (
                                <button
                                  type="button"
                                  onClick={() => handleSpawnSingle(m, count)}
                                  className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-[10px] font-bold transition-all active:scale-95 shadow-md shadow-red-950/50 flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  Spawn {count > 1 ? `(${count})` : ''}
                                </button>
                              )}

                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveMonster(m)}
                                className="p-1 rounded-lg text-zinc-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                                title={`Hide ${m.name}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

              {/* Redraw Polygon & Delete Zone Confirmation */}
              <div className="pt-2 flex items-center justify-between gap-2">
                {onRedrawPolygon && activeRoom ? (
                  <button
                    type="button"
                    id="btn-drawer-view-redraw-polygon"
                    onClick={() => onRedrawPolygon(activeRoom)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Redraw this room zone's polygon boundary on the battlemap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Redraw Polygon</span>
                  </button>
                ) : <div />}

                <button
                  type="button"
                  onClick={handleDelete}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    confirmDelete
                      ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                      : 'bg-zinc-900 text-zinc-500 hover:text-rose-400 border-zinc-800 hover:border-rose-500/30'
                  }`}
                  title="Remove this room annotation from map and Firestore"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{confirmDelete ? 'Confirm Delete?' : 'Delete Room'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Room Zone Monster Customizer Modal */}
      {editingRoomMonster && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setEditingRoomMonster(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] bg-zinc-950 border border-amber-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-zinc-900/95 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                  <Pencil className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                      Room Zone Monster Customizer
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 truncate max-w-[180px]">
                      {displayTitle}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100 font-mono truncate">
                    Customize: {editingRoomMonster.monster.name || editingRoomMonster.originalName}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRoomMonster(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close Customizer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              {/* Avatar + Name + Count Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
                <div
                  onClick={() => monsterAvatarInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-700 hover:border-amber-500 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group shrink-0"
                  title="Click to upload custom token art"
                >
                  {editingRoomMonster.monster.avatarUrl ? (
                    <>
                      <img
                        src={editingRoomMonster.monster.avatarUrl}
                        alt={editingRoomMonster.monster.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload className="w-4 h-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-zinc-500 group-hover:text-amber-400" />
                      <span className="text-[9px] text-zinc-500 mt-0.5 font-mono">Token</span>
                    </>
                  )}
                  <input
                    ref={monsterAvatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleMonsterAvatarUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
                      Monster Name (in this Room Zone)
                    </label>
                    <input
                      type="text"
                      value={editingRoomMonster.monster.name || ''}
                      onChange={(e) =>
                        setEditingRoomMonster((prev) =>
                          prev ? { ...prev, monster: { ...prev.monster, name: e.target.value } } : null
                        )
                      }
                      placeholder="e.g. Captain Vane (Wight)"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
                      Count in Room
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={editingRoomMonster.count}
                      onChange={(e) =>
                        setEditingRoomMonster((prev) =>
                          prev ? { ...prev, count: Math.max(1, parseInt(e.target.value, 10) || 1) } : null
                        )
                      }
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-xs font-mono font-bold text-amber-300 text-center focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Size, Type, Alignment, CR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">Size</label>
                  <select
                    value={editingRoomMonster.monster.size || 'Medium'}
                    onChange={(e) =>
                      setEditingRoomMonster((prev) =>
                        prev ? { ...prev, monster: { ...prev.monster, size: e.target.value as any } } : null
                      )
                    }
                    className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    {['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">Type</label>
                  <input
                    type="text"
                    value={editingRoomMonster.monster.type || ''}
                    onChange={(e) =>
                      setEditingRoomMonster((prev) =>
                        prev ? { ...prev, monster: { ...prev.monster, type: e.target.value } } : null
                      )
                    }
                    placeholder="Undead, Fiend..."
                    className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">Alignment</label>
                  <input
                    type="text"
                    value={editingRoomMonster.monster.alignment || ''}
                    onChange={(e) =>
                      setEditingRoomMonster((prev) =>
                        prev ? { ...prev, monster: { ...prev.monster, alignment: e.target.value } } : null
                      )
                    }
                    placeholder="Chaotic Evil"
                    className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">Challenge (CR)</label>
                  <input
                    type="text"
                    value={editingRoomMonster.monster.challenge || ''}
                    onChange={(e) =>
                      setEditingRoomMonster((prev) =>
                        prev ? { ...prev, monster: { ...prev.monster, challenge: e.target.value } } : null
                      )
                    }
                    placeholder="3 (700 XP)"
                    className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Core Combat Stats: AC, HP, HP Formula, Speed */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                <div>
                  <label className="text-[10px] font-mono uppercase text-blue-400 font-bold flex items-center gap-1 mb-1">
                    <Shield className="w-3 h-3" /> Armor Class
                  </label>
                  <input
                    type="number"
                    value={editingRoomMonster.monster.ac ?? 10}
                    onChange={(e) =>
                      setEditingRoomMonster((prev) =>
                        prev ? { ...prev, monster: { ...prev.monster, ac: parseInt(e.target.value, 10) || 10 } } : null
                      )
                    }
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1 mb-1">
                    <Heart className="w-3 h-3" /> Hit Points
                  </label>
                  <input
                    type="number"
                    value={editingRoomMonster.monster.hp ?? 10}
                    onChange={(e) =>
                      setEditingRoomMonster((prev) =>
                        prev ? { ...prev, monster: { ...prev.monster, hp: parseInt(e.target.value, 10) || 1 } } : null
                      )
                    }
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
                    HP Formula
                  </label>
                  <input
                    type="text"
                    value={editingRoomMonster.monster.hpFormula || ''}
                    onChange={(e) =>
                      setEditingRoomMonster((prev) =>
                        prev ? { ...prev, monster: { ...prev.monster, hpFormula: e.target.value } } : null
                      )
                    }
                    placeholder="(8d8 + 16)"
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-amber-400 font-bold block mb-1">
                    Speed
                  </label>
                  <input
                    type="text"
                    value={editingRoomMonster.monster.speed || ''}
                    onChange={(e) =>
                      setEditingRoomMonster((prev) =>
                        prev ? { ...prev, monster: { ...prev.monster, speed: e.target.value } } : null
                      )
                    }
                    placeholder="30 ft., fly 60 ft."
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Ability Scores */}
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-2">
                  Ability Scores
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((stat) => (
                    <div key={stat} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-center">
                      <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
                        {stat}
                      </span>
                      <input
                        type="number"
                        value={(editingRoomMonster.monster as any)[stat] ?? 10}
                        onChange={(e) =>
                          setEditingRoomMonster((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  monster: {
                                    ...prev.monster,
                                    [stat]: parseInt(e.target.value, 10) || 10
                                  }
                                }
                              : null
                          )
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1 text-center text-xs font-mono font-bold text-zinc-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Secondary Details: Saves, Skills, Resistances, Senses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">Saving Throws</label>
                  <input
                    type="text"
                    value={editingRoomMonster.monster.savingThrows || ''}
                    onChange={(e) =>
                      setEditingRoomMonster((prev) =>
                        prev ? { ...prev, monster: { ...prev.monster, savingThrows: e.target.value } } : null
                      )
                    }
                    placeholder="Wis +4, Cha +5"
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">Skills</label>
                  <input
                    type="text"
                    value={editingRoomMonster.monster.skills || ''}
                    onChange={(e) =>
                      setEditingRoomMonster((prev) =>
                        prev ? { ...prev, monster: { ...prev.monster, skills: e.target.value } } : null
                      )
                    }
                    placeholder="Perception +4, Stealth +5"
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">Damage Resistances / Immunities</label>
                  <input
                    type="text"
                    value={editingRoomMonster.monster.damageResistances || ''}
                    onChange={(e) =>
                      setEditingRoomMonster((prev) =>
                        prev ? { ...prev, monster: { ...prev.monster, damageResistances: e.target.value } } : null
                      )
                    }
                    placeholder="necrotic; bludgeoning, piercing, slashing"
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">Senses & Languages</label>
                  <input
                    type="text"
                    value={editingRoomMonster.monster.senses || ''}
                    onChange={(e) =>
                      setEditingRoomMonster((prev) =>
                        prev ? { ...prev, monster: { ...prev.monster, senses: e.target.value } } : null
                      )
                    }
                    placeholder="Darkvision 60 ft., Passive Perception 14"
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Special Traits Editor */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Special Traits & Passive Features
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingRoomMonster((prev) =>
                        prev
                          ? {
                              ...prev,
                              monster: {
                                ...prev.monster,
                                traits: [...(prev.monster.traits || []), { name: 'New Trait', description: '' }]
                              }
                            }
                          : null
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Trait
                  </button>
                </div>
                {(editingRoomMonster.monster.traits || []).length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic">No special traits configured.</p>
                ) : (
                  <div className="space-y-2">
                    {(editingRoomMonster.monster.traits || []).map((trait, tIdx) => (
                      <div key={tIdx} className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={trait.name}
                            onChange={(e) => {
                              const next = [...(editingRoomMonster.monster.traits || [])];
                              next[tIdx] = { ...next[tIdx], name: e.target.value };
                              setEditingRoomMonster((prev) =>
                                prev ? { ...prev, monster: { ...prev.monster, traits: next } } : null
                              );
                            }}
                            placeholder="Trait Name (e.g. Sunlight Sensitivity)"
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = (editingRoomMonster.monster.traits || []).filter((_, i) => i !== tIdx);
                              setEditingRoomMonster((prev) =>
                                prev ? { ...prev, monster: { ...prev.monster, traits: next } } : null
                              );
                            }}
                            className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                            title="Remove Trait"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={trait.description}
                          onChange={(e) => {
                            const next = [...(editingRoomMonster.monster.traits || [])];
                            next[tIdx] = { ...next[tIdx], description: e.target.value };
                            setEditingRoomMonster((prev) =>
                              prev ? { ...prev, monster: { ...prev.monster, traits: next } } : null
                            );
                          }}
                          placeholder="Trait description..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Combat Actions & Attacks Editor */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase text-red-400 font-bold flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5" />
                    Combat Actions & Attacks
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingRoomMonster((prev) =>
                        prev
                          ? {
                              ...prev,
                              monster: {
                                ...prev.monster,
                                actions: [
                                  ...(prev.monster.actions || []),
                                  {
                                    name: 'New Attack',
                                    type: 'attack',
                                    attackBonus: 5,
                                    damage: '1d8 + 3 slashing',
                                    reachRange: 'reach 5 ft.',
                                    description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) slashing damage.'
                                  }
                                ]
                              }
                            }
                          : null
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Action
                  </button>
                </div>
                {(editingRoomMonster.monster.actions || []).length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic">No combat actions configured.</p>
                ) : (
                  <div className="space-y-2.5">
                    {(editingRoomMonster.monster.actions || []).map((act, aIdx) => (
                      <div key={aIdx} className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            value={act.name}
                            onChange={(e) => {
                              const next = [...(editingRoomMonster.monster.actions || [])];
                              next[aIdx] = { ...next[aIdx], name: e.target.value };
                              setEditingRoomMonster((prev) =>
                                prev ? { ...prev, monster: { ...prev.monster, actions: next } } : null
                              );
                            }}
                            placeholder="Action Name (e.g. Life Drain)"
                            className="sm:col-span-5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-bold text-red-300 focus:outline-none focus:border-red-500"
                          />
                          <div className="sm:col-span-3 flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1">
                            <span className="text-[10px] text-zinc-500 font-mono">Hit +</span>
                            <input
                              type="number"
                              value={act.attackBonus ?? ''}
                              onChange={(e) => {
                                const next = [...(editingRoomMonster.monster.actions || [])];
                                next[aIdx] = {
                                  ...next[aIdx],
                                  attackBonus: e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                                };
                                setEditingRoomMonster((prev) =>
                                  prev ? { ...prev, monster: { ...prev.monster, actions: next } } : null
                                );
                              }}
                              placeholder="5"
                              className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                            />
                          </div>
                          <input
                            type="text"
                            value={act.damage || ''}
                            onChange={(e) => {
                              const next = [...(editingRoomMonster.monster.actions || [])];
                              next[aIdx] = { ...next[aIdx], damage: e.target.value };
                              setEditingRoomMonster((prev) =>
                                prev ? { ...prev, monster: { ...prev.monster, actions: next } } : null
                              );
                            }}
                            placeholder="2d6 + 3 necrotic"
                            className="sm:col-span-3 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-mono text-amber-300 focus:outline-none focus:border-red-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = (editingRoomMonster.monster.actions || []).filter((_, i) => i !== aIdx);
                              setEditingRoomMonster((prev) =>
                                prev ? { ...prev, monster: { ...prev.monster, actions: next } } : null
                              );
                            }}
                            className="sm:col-span-1 p-1 text-zinc-500 hover:text-red-400 flex justify-center cursor-pointer"
                            title="Remove Action"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={act.description}
                          onChange={(e) => {
                            const next = [...(editingRoomMonster.monster.actions || [])];
                            next[aIdx] = { ...next[aIdx], description: e.target.value };
                            setEditingRoomMonster((prev) =>
                              prev ? { ...prev, monster: { ...prev.monster, actions: next } } : null
                            );
                          }}
                          placeholder="Full action description..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-red-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-zinc-900/95 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={alsoSaveToCompendium}
                  onChange={(e) => setAlsoSaveToCompendium(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500"
                />
                <span>
                  Also save to <strong className="text-amber-300">★ Custom Monster Compendium</strong>
                </span>
              </label>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingRoomMonster(null)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingRoomMonster || isUploadingMonsterAvatar}
                  onClick={handleSaveCustomizedRoomMonster}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingRoomMonster ? 'Saving...' : 'Save to Room Zone'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomBriefingDrawer;
