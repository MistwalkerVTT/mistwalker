import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Sparkles,
  ShieldAlert,
  Volume2,
  VolumeX,
  Send,
  Copy,
  Check,
  Users,
  Footprints,
  MapPin,
  Lock,
  Flame,
  Compass,
  Trophy,
  AlertTriangle,
  Search,
  Loader2,
  ChevronRight,
  Skull,
  KeyRound
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  ChapterPdfDigest,
  ChapterStoryBeat,
  ChapterGeneralFeature,
  ChapterRoamingEncounter,
  ChapterNpcProfile,
  RoomAnnotation,
  NARRATION_VOICES
} from '../types';
import { Monster } from '../types/monster';
import { SRD_MONSTERS, resolveMonster, isNonCreatureStatOrItem } from '../data/srdMonstersCatalog';
import { extractAndResolveRoomMonsters } from '../services/roomMonsterExtractor';
import { digestChapterFlow } from '../services/aiService';
import { audioNarration, useAudioNarration } from '../services/audioNarrationService';
import { toast } from 'sonner';

export interface ChapterFlowPanelProps {
  chapterPdfDigest?: ChapterPdfDigest | null;
  activeSceneTitle?: string;
  activeDmNotes?: string;
  roomAnnotations?: RoomAnnotation[];
  availableMonsters?: Monster[];
  selectedVoice: string;
  onSelectVoice: (voiceId: string) => void;
  onBroadcastReadAloud?: (text: string, title: string, voiceId?: string) => Promise<void> | void;
  onSpawnMonsterToken?: (tokenData: {
    name: string;
    avatarUrl: string;
    hp: number;
    ac: number;
    size: number;
    polygonPoints?: number[];
  }) => void;
  onSelectRoom?: (roomNumber: string) => void;
  onUpdateDigest?: (updatedDigest: ChapterPdfDigest) => Promise<void> | void;
}

type FlowSubTab = 'story' | 'rules' | 'patrols_npcs' | 'rooms';
type AlertLevel = 0 | 1 | 2 | 3;

const ALERT_STATES: Array<{ level: AlertLevel; label: string; color: string; desc: string }> = [
  {
    level: 0,
    label: 'Calm',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: 'Guards & NPCs follow normal routines; passive Perception applies.'
  },
  {
    level: 1,
    label: 'Suspicious',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: 'Guards investigate noises/missing items; advantage on Perception checks.'
  },
  {
    level: 2,
    label: 'High Alert',
    color: 'bg-orange-500/25 text-orange-300 border-orange-500/50',
    desc: 'Patrols double up; checkpoints locked; reinforcements readied.'
  },
  {
    level: 3,
    label: 'Lockdown',
    color: 'bg-red-600/30 text-red-200 border-red-500/60',
    desc: 'Alarms triggered; exits sealed; boss/reinforcements actively hunting.'
  }
];

const PHASE_META: Record<
  ChapterStoryBeat['phase'],
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  hook: {
    label: 'Act I • Quest Hook & Briefing',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: <Compass className="w-3.5 h-3.5 text-amber-400" />
  },
  arrival: {
    label: 'Act I • Arrival & Perimeter',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    icon: <MapPin className="w-3.5 h-3.5 text-sky-400" />
  },
  event: {
    label: 'Act II • Triggered Story Event',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    icon: <Flame className="w-3.5 h-3.5 text-purple-400" />
  },
  climax: {
    label: 'Act III • Climax & Turning Point',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
  },
  conclusion: {
    label: 'Epilogue • Conclusion & Rewards',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: <Trophy className="w-3.5 h-3.5 text-emerald-400" />
  }
};

export const ChapterFlowPanel: React.FC<ChapterFlowPanelProps> = ({
  chapterPdfDigest,
  activeSceneTitle,
  activeDmNotes,
  roomAnnotations = [],
  availableMonsters = [],
  selectedVoice,
  onSelectVoice,
  onBroadcastReadAloud,
  onSpawnMonsterToken,
  onSelectRoom,
  onUpdateDigest
}) => {
  const [subTab, setSubTab] = useState<FlowSubTab>('story');
  const [alertLevel, setAlertLevel] = useState<AlertLevel>(0);
  const [isExtractingFlow, setIsExtractingFlow] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [roomSearch, setRoomSearch] = useState('');
  const { isPlaying: isSpeaking } = useAudioNarration();

  const allMonstersCatalog = useMemo(() => {
    const map = new Map<string, Monster>();
    for (const m of SRD_MONSTERS) map.set(m.name.toLowerCase(), m);
    for (const m of availableMonsters) {
      if (m?.name) map.set(m.name.toLowerCase(), m);
    }
    return Array.from(map.values());
  }, [availableMonsters]);

  // Backward-compatible synthesis: if the digest was created before `storyBeats` existed,
  // automatically synthesize beats, features, and NPCs from `digestSummary` and `scenes[]`.
  const effectiveStoryBeats: ChapterStoryBeat[] = useMemo(() => {
    if (chapterPdfDigest?.storyBeats && chapterPdfDigest.storyBeats.length > 0) {
      return chapterPdfDigest.storyBeats;
    }

    const fallbackBeats: ChapterStoryBeat[] = [];
    if (chapterPdfDigest?.digestSummary) {
      fallbackBeats.push({
        id: 'synth_overview',
        phase: 'hook',
        title: chapterPdfDigest.chapterTitle || chapterPdfDigest.adventureTitle || 'Adventure Briefing & Overview',
        trigger: 'Session Start / Quest Hook',
        boxedText: chapterPdfDigest.scenes?.[0]?.boxedText || '',
        dmNotes: chapterPdfDigest.digestSummary,
        monsters: [],
        relatedRooms: chapterPdfDigest.scenes?.[0]?.roomNumbers || []
      });
    }

    if (Array.isArray(chapterPdfDigest?.scenes)) {
      chapterPdfDigest.scenes.forEach((sc, idx) => {
        if (!sc.summary && !sc.suggestedDmNotes && !sc.boxedText) return;
        // Avoid duplicating boxedText if already shown in overview beat
        const boxed = idx === 0 && fallbackBeats.length > 0 ? '' : (sc.boxedText || '');
        fallbackBeats.push({
          id: `synth_scene_${idx}`,
          phase: idx === 0 ? 'arrival' : idx === (chapterPdfDigest.scenes.length - 1) ? 'climax' : 'event',
          title: sc.sceneTitle || `Scene ${idx + 1}`,
          trigger: sc.roomNumbers?.length ? `Areas ${sc.roomNumbers.slice(0, 5).join(', ')}` : 'Scene Progression',
          boxedText: boxed,
          dmNotes: [sc.summary, sc.suggestedDmNotes].filter(Boolean).join('\n\n'),
          monsters: [],
          relatedRooms: sc.roomNumbers || []
        });
      });
    }

    if (fallbackBeats.length === 0 && activeDmNotes) {
      fallbackBeats.push({
        id: 'synth_active_scene',
        phase: 'hook',
        title: activeSceneTitle || 'Current Scene DM Guide',
        trigger: 'Active Map',
        boxedText: '',
        dmNotes: activeDmNotes,
        monsters: [],
        relatedRooms: []
      });
    }

    return fallbackBeats;
  }, [chapterPdfDigest, activeDmNotes, activeSceneTitle]);

  const effectiveGeneralFeatures: ChapterGeneralFeature[] = useMemo(() => {
    if (chapterPdfDigest?.generalFeatures && chapterPdfDigest.generalFeatures.length > 0) {
      return chapterPdfDigest.generalFeatures;
    }
    const list: ChapterGeneralFeature[] = [];
    if (Array.isArray(chapterPdfDigest?.scenes)) {
      for (const sc of chapterPdfDigest.scenes) {
        if (Array.isArray(sc.trapsAndHazards)) {
          for (const h of sc.trapsAndHazards) {
            list.push({
              category: 'alarm',
              title: `${sc.sceneTitle}: Hazard / Trap`,
              details: h
            });
          }
        }
        if (Array.isArray(sc.loot)) {
          for (const l of sc.loot) {
            list.push({
              category: 'other',
              title: `${sc.sceneTitle}: Key Treasure / Objective`,
              details: l
            });
          }
        }
      }
    }
    return list;
  }, [chapterPdfDigest]);

  const effectiveRoamingEncounters: ChapterRoamingEncounter[] = useMemo(() => {
    if (chapterPdfDigest?.roamingEncounters && chapterPdfDigest.roamingEncounters.length > 0) {
      return chapterPdfDigest.roamingEncounters;
    }
    return [];
  }, [chapterPdfDigest]);

  const effectiveNpcs: ChapterNpcProfile[] = useMemo(() => {
    if (chapterPdfDigest?.npcs && chapterPdfDigest.npcs.length > 0) {
      return chapterPdfDigest.npcs;
    }
    const list: ChapterNpcProfile[] = [];
    const seen = new Set<string>();
    if (Array.isArray(chapterPdfDigest?.scenes)) {
      for (const sc of chapterPdfDigest.scenes) {
        if (Array.isArray(sc.keyNpcs)) {
          for (const rawNpc of sc.keyNpcs) {
            const clean = String(rawNpc || '').trim();
            if (!clean || seen.has(clean.toLowerCase())) continue;
            seen.add(clean.toLowerCase());
            list.push({
              id: `synth_npc_${seen.size}`,
              name: clean,
              role: `Featured in ${sc.sceneTitle}`,
              locationOrSchedule: sc.roomNumbers?.length ? `Associated rooms: ${sc.roomNumbers.join(', ')}` : sc.sceneTitle,
              voicePreset: 'wizard'
            });
          }
        }
      }
    }
    return list;
  }, [chapterPdfDigest]);

  const hasDeepScannedFlow = Boolean(
    (chapterPdfDigest?.storyBeats && chapterPdfDigest.storyBeats.length > 0) ||
    (chapterPdfDigest?.generalFeatures && chapterPdfDigest.generalFeatures.length > 0) ||
    (chapterPdfDigest?.roamingEncounters && chapterPdfDigest.roamingEncounters.length > 0)
  );

  const handleDeepScanFlow = async () => {
    if (!chapterPdfDigest) {
      toast.error('No chapter PDF digest loaded for this scene yet.');
      return;
    }
    setIsExtractingFlow(true);
    const toastId = toast.loading('Analyzing non-room story beats, dungeon rules, patrols & NPCs...');
    try {
      const flowData = await digestChapterFlow({
        pdfPath: chapterPdfDigest.pdfUrl,
        chapterTitle: chapterPdfDigest.chapterTitle || activeSceneTitle || 'Chapter',
        campaignTitle: chapterPdfDigest.adventureTitle || 'Campaign',
        digestSummary: chapterPdfDigest.digestSummary,
        scenes: chapterPdfDigest.scenes,
        rooms: (chapterPdfDigest.rooms || []).map(r => ({
          roomNumber: r.roomNumber,
          roomName: r.roomName
        }))
      });

      const updatedDigest: ChapterPdfDigest = {
        ...chapterPdfDigest,
        storyBeats: flowData.storyBeats,
        generalFeatures: flowData.generalFeatures,
        roamingEncounters: flowData.roamingEncounters,
        npcs: flowData.npcs
      };

      await onUpdateDigest?.(updatedDigest);
      toast.success(
        `Extracted ${flowData.storyBeats.length} story beats, ${flowData.generalFeatures.length} dungeon rules, ${flowData.roamingEncounters.length} patrols & ${flowData.npcs.length} NPCs!`,
        { id: toastId }
      );
    } catch (err: any) {
      console.error('[ChapterFlowPanel] Deep scan error:', err);
      toast.error(err?.message || 'Failed to extract non-room chapter flow', { id: toastId });
    } finally {
      setIsExtractingFlow(false);
    }
  };

  const handleSpeakText = async (id: string, text: string, voiceOverride?: string) => {
    if (!text) return;
    if (isSpeaking && speakingId === id) {
      audioNarration.stop();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(id);
    try {
      await audioNarration.play({
        text,
        voiceId: voiceOverride || selectedVoice
      });
    } catch {
      toast.error('Audio narration failed');
    } finally {
      setSpeakingId(null);
    }
  };

  const handleBroadcastText = async (id: string, text: string, title: string, voiceOverride?: string) => {
    if (!text || !onBroadcastReadAloud) return;
    setBroadcastingId(id);
    try {
      await onBroadcastReadAloud(text, title, voiceOverride || selectedVoice);
      toast.success(`Broadcast "${title}" to Player View!`);
    } catch {
      toast.error('Failed to broadcast to players');
    } finally {
      setBroadcastingId(null);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sizeToNumber = (sz?: string): number => {
    if (!sz) return 1;
    const s = String(sz).toLowerCase();
    if (s === 'large') return 2;
    if (s === 'huge') return 3;
    if (s === 'gargantuan') return 4;
    return 1;
  };

  const handleSpawnMonstersList = (monstersList: Array<{ monster: Monster; count: number }>, targetRoomCode?: string) => {
    if (!onSpawnMonsterToken || monstersList.length === 0) return;

    // If a targetRoomCode matches a placed polygon room on the map, spawn inside that polygon; otherwise spawn on map
    let targetPolygon: number[] | undefined;
    if (targetRoomCode) {
      const cleanCode = targetRoomCode.toLowerCase().replace(/^(area|room|zone)\s*/i, '').trim();
      const matchedAnno = roomAnnotations.find(
        a => (a.roomNumber || '').toLowerCase().trim() === cleanCode
      );
      if (matchedAnno?.polygonPoints && matchedAnno.polygonPoints.length >= 6) {
        targetPolygon = matchedAnno.polygonPoints;
      }
    }

    let totalSpawned = 0;
    for (const { monster: m, count } of monstersList) {
      for (let i = 0; i < count; i++) {
        onSpawnMonsterToken({
          name: count > 1 ? `${m.name} ${i + 1}` : m.name,
          avatarUrl: m.avatarUrl || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150',
          hp: m.hp || 15,
          ac: m.ac || 12,
          size: sizeToNumber(m.size),
          polygonPoints: targetPolygon
        });
        totalSpawned++;
      }
    }
    toast.success(`Spawned ${totalSpawned} token${totalSpawned > 1 ? 's' : ''} onto the battlemap!`);
  };

  const placedRoomNumbersSet = useMemo(() => {
    const set = new Set<string>();
    for (const a of roomAnnotations) {
      if (a.roomNumber) {
        set.add(a.roomNumber.toLowerCase().replace(/^(area|room|zone)\s*/i, '').trim());
      }
    }
    return set;
  }, [roomAnnotations]);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Chapter Header & Deep-Scan Enricher */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/35 via-zinc-900/90 to-zinc-950 border border-amber-500/30 shadow-lg space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
              {chapterPdfDigest?.adventureTitle || 'Campaign Adventure Flow'}
            </span>
            <h3 className="text-sm font-bold text-zinc-100 font-mono truncate">
              {chapterPdfDigest?.chapterTitle || activeSceneTitle || 'Chapter Non-Room Conductor'}
            </h3>
          </div>

          {chapterPdfDigest && (
            <button
              type="button"
              onClick={handleDeepScanFlow}
              disabled={isExtractingFlow}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              title="Scan PDF for non-room story beats, general dungeon features, roaming patrols, and NPC roleplay profiles"
            >
              {isExtractingFlow ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{hasDeepScannedFlow ? 'Refresh Flow' : 'Deep-Scan PDF Flow'}</span>
            </button>
          )}
        </div>

        {/* Interactive Dungeon Tension / Alert Tracker */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-zinc-400 uppercase font-bold">Dungeon Alert / Tension State:</span>
            <span className="text-zinc-300 font-semibold">{ALERT_STATES[alertLevel].label}</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {ALERT_STATES.map((st) => (
              <button
                key={st.level}
                type="button"
                onClick={() => setAlertLevel(st.level)}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                  alertLevel === st.level
                    ? `${st.color} ring-1 ring-white/20 shadow-sm`
                    : 'bg-zinc-900/70 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-400 font-sans italic">
            {ALERT_STATES[alertLevel].desc}
          </p>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono text-[10px] font-bold">
        <button
          type="button"
          onClick={() => setSubTab('story')}
          className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
            subTab === 'story'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Compass className="w-3 h-3 shrink-0" />
          <span className="truncate">Story ({effectiveStoryBeats.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('rules')}
          className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
            subTab === 'rules'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <KeyRound className="w-3 h-3 shrink-0" />
          <span className="truncate">Rules ({effectiveGeneralFeatures.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('patrols_npcs')}
          className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
            subTab === 'patrols_npcs'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-3 h-3 shrink-0" />
          <span className="truncate">NPCs ({effectiveNpcs.length + effectiveRoamingEncounters.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('rooms')}
          className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
            subTab === 'rooms'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">Rooms ({chapterPdfDigest?.rooms?.length || roomAnnotations.length})</span>
        </button>
      </div>

      {/* 3. SUB-TAB 1: CHRONOLOGICAL STORY FLOW (Hook -> Arrival -> Events -> Climax -> Conclusion) */}
      {subTab === 'story' && (
        <div className="flex flex-col gap-3.5">
          {effectiveStoryBeats.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 text-center space-y-2">
              <p className="text-xs font-mono text-zinc-400">
                No chapter PDF story flow loaded yet.
              </p>
              <p className="text-[11px] text-zinc-500">
                Upload & digest your chapter PDF in Campaign Manager, or click "Deep-Scan PDF Flow" above.
              </p>
            </div>
          ) : (
            effectiveStoryBeats.map((beat) => {
              const meta = PHASE_META[beat.phase] || PHASE_META.event;
              const beatMonsters = extractAndResolveRoomMonsters({
                roomMonsters: beat.monsters,
                dmNotes: beat.dmNotes,
                allAvailableMonsters: allMonstersCatalog
              });

              return (
                <div
                  key={beat.id}
                  className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-md flex flex-col gap-3"
                >
                  {/* Phase & Trigger Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border flex items-center gap-1.5 ${meta.badgeClass}`}>
                      {meta.icon}
                      <span>{meta.label}</span>
                    </span>
                    {beat.trigger && (
                      <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-400">
                        ⚡ {beat.trigger}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-zinc-100 font-mono">
                    {beat.title}
                  </h4>

                  {/* Boxed Read-Aloud Text (if present) */}
                  {beat.boxedText && beat.boxedText.trim() && (
                    <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          Read-Aloud Boxed Text
                        </span>

                        <div className="flex items-center gap-1.5">
                          <select
                            value={selectedVoice}
                            onChange={(e) => onSelectVoice(e.target.value)}
                            className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-amber-300 focus:outline-none"
                          >
                            {NARRATION_VOICES.map((v) => (
                              <option key={v.id} value={v.id}>
                                🎙️ {v.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleSpeakText(beat.id, beat.boxedText!)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 border cursor-pointer transition-all ${
                              isSpeaking && speakingId === beat.id
                                ? 'bg-red-600 text-white border-red-500'
                                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40'
                            }`}
                          >
                            {isSpeaking && speakingId === beat.id ? (
                              <>
                                <VolumeX className="w-3 h-3" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                <span>Speak</span>
                              </>
                            )}
                          </button>

                          {onBroadcastReadAloud && (
                            <button
                              type="button"
                              onClick={() => handleBroadcastText(beat.id, beat.boxedText!, beat.title)}
                              disabled={broadcastingId === beat.id}
                              className="px-2 py-1 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                              title="Send read-aloud text & voice to Player View"
                            >
                              <Send className="w-3 h-3" />
                              <span>Players</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopyText(beat.id, beat.boxedText!)}
                            className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer"
                            title="Copy read-aloud text"
                          >
                            {copiedId === beat.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-amber-100/95 italic font-serif leading-relaxed whitespace-pre-wrap pl-2.5 border-l-2 border-amber-500/60">
                        <ReactMarkdown>{beat.boxedText}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* DM Guidance & Mechanics */}
                  {beat.dmNotes && (
                    <div className="text-xs text-zinc-300 leading-relaxed font-sans prose prose-invert prose-xs max-w-none whitespace-pre-wrap">
                      <ReactMarkdown>{beat.dmNotes}</ReactMarkdown>
                    </div>
                  )}

                  {/* Related Room Jump Chips */}
                  {beat.relatedRooms && beat.relatedRooms.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] font-mono text-zinc-500">Connected Rooms:</span>
                      {beat.relatedRooms.map((rCode, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onSelectRoom?.(rCode)}
                          className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-amber-500/20 text-amber-300 border border-zinc-700 hover:border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Jump to Room ${rCode}`}
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{rCode}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Event Monsters Spawn Strip */}
                  {beatMonsters.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-red-950/25 border border-red-900/40 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Skull className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        {beatMonsters.map((bm, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-red-950/60 border border-red-800/50 text-red-200 text-[10px] font-mono font-bold"
                          >
                            {bm.count}× {bm.monster.name}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSpawnMonstersList(beatMonsters, beat.relatedRooms?.[0])}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-mono font-bold cursor-pointer shadow"
                      >
                        Spawn Event Monsters
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. SUB-TAB 2: GENERAL DUNGEON FEATURES & GLOBAL RULES */}
      {subTab === 'rules' && (
        <div className="flex flex-col gap-3">
          {effectiveGeneralFeatures.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 text-center space-y-2">
              <p className="text-xs font-mono text-zinc-400">
                No dungeon-wide rules extracted yet.
              </p>
              <p className="text-[11px] text-zinc-500">
                Click "Deep-Scan PDF Flow" above to extract standard Door AC/HP/DCs, Ceilings, Lighting, and Magical Wards from the chapter PDF.
              </p>
            </div>
          ) : (
            effectiveGeneralFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-zinc-900/85 border border-zinc-800 space-y-1.5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {feat.title}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[9px] font-mono uppercase text-zinc-400">
                    {feat.category}
                  </span>
                </div>
                {feat.mechanics && (
                  <div className="px-2.5 py-1 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] font-mono font-bold text-amber-200">
                    🎲 {feat.mechanics}
                  </div>
                )}
                <p className="text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {feat.details}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. SUB-TAB 3: ROAMING PATROLS & CHAPTER NPCs */}
      {subTab === 'patrols_npcs' && (
        <div className="flex flex-col gap-4">
          {/* Roaming Patrols Section */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-red-400 font-bold flex items-center gap-1.5">
              <Footprints className="w-3.5 h-3.5" />
              Roaming Patrols & Dynamic Encounters ({effectiveRoamingEncounters.length})
            </h4>

            {effectiveRoamingEncounters.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 text-xs font-mono text-zinc-500 text-center">
                No roaming patrols indexed yet. Click "Deep-Scan PDF Flow" to detect guard routes & random encounters.
              </div>
            ) : (
              effectiveRoamingEncounters.map((patrol) => {
                const patrolMonsters = extractAndResolveRoomMonsters({
                  roomMonsters: patrol.monsters,
                  dmNotes: patrol.description,
                  allAvailableMonsters: allMonstersCatalog
                });

                return (
                  <div
                    key={patrol.id}
                    className="p-3.5 rounded-2xl bg-red-950/15 border border-red-900/40 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-mono font-bold text-zinc-100">{patrol.name}</h5>
                        <span className="text-[10px] font-mono text-amber-300 block mt-0.5">
                          🔄 {patrol.routeOrTrigger}
                        </span>
                      </div>
                      {patrolMonsters.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSpawnMonstersList(patrolMonsters, patrol.relatedRooms?.[0])}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-mono font-bold cursor-pointer shrink-0 shadow"
                        >
                          Spawn Patrol
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {patrol.description}
                    </p>

                    {patrol.relatedRooms && patrol.relatedRooms.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-zinc-500">Patrol Route:</span>
                        {patrol.relatedRooms.map((rCode, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => onSelectRoom?.(rCode)}
                            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-700 text-[10px] font-mono font-bold cursor-pointer"
                          >
                            {rCode}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Dramatis Personae (NPCs) Section */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-800">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Dramatis Personae • Chapter NPCs ({effectiveNpcs.length})
            </h4>

            {effectiveNpcs.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 text-xs font-mono text-zinc-500 text-center">
                No named NPCs indexed yet.
              </div>
            ) : (
              effectiveNpcs.map((npc) => {
                const resolvedNpcMonster =
                  npc.statblock && !isNonCreatureStatOrItem(npc.statblock)
                    ? resolveMonster(`${npc.name} (${npc.statblock})`, allMonstersCatalog)
                    : null;

                return (
                  <div
                    key={npc.id}
                    className="p-3.5 rounded-2xl bg-zinc-900/85 border border-zinc-800 space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-zinc-100">{npc.name}</span>
                          {npc.statblock && (
                            <span className="px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/50 text-red-300 text-[9px] font-mono font-bold">
                              {npc.statblock}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-amber-400/90 block">{npc.role}</span>
                      </div>

                      {resolvedNpcMonster && onSpawnMonsterToken && (
                        <button
                          type="button"
                          onClick={() =>
                            handleSpawnMonstersList([{ monster: resolvedNpcMonster.monster, count: 1 }])
                          }
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-200 hover:text-white border border-zinc-700 text-[10px] font-mono font-bold cursor-pointer transition-colors shrink-0"
                        >
                          + Spawn Token
                        </button>
                      )}
                    </div>

                    {npc.appearance && (
                      <p className="text-[11px] text-zinc-300 font-sans">
                        <strong className="text-zinc-400 font-mono">Appearance: </strong>
                        {npc.appearance}
                      </p>
                    )}
                    {npc.personality && (
                      <p className="text-[11px] text-zinc-300 font-sans">
                        <strong className="text-zinc-400 font-mono">Roleplay & Mannerisms: </strong>
                        {npc.personality}
                      </p>
                    )}
                    {npc.secretOrMotivation && (
                      <p className="text-[11px] text-rose-200/90 font-sans bg-rose-950/25 border border-rose-900/40 p-2 rounded-lg">
                        <strong className="text-rose-400 font-mono">Secret / Motivation: </strong>
                        {npc.secretOrMotivation}
                      </p>
                    )}
                    {npc.locationOrSchedule && (
                      <p className="text-[10px] text-zinc-400 font-mono">
                        📍 {npc.locationOrSchedule}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 4: QUICK ROOM INDEX & JUMPER */}
      {subTab === 'rooms' && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              placeholder="Filter rooms by code or name (e.g. G4, Vault)..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            {(chapterPdfDigest?.rooms || [])
              .filter((r) => {
                if (!roomSearch.trim()) return true;
                const q = roomSearch.toLowerCase();
                return (
                  (r.roomNumber || '').toLowerCase().includes(q) ||
                  (r.roomName || '').toLowerCase().includes(q)
                );
              })
              .map((r, idx) => {
                const cleanCode = (r.roomNumber || '').toLowerCase().replace(/^(area|room|zone)\s*/i, '').trim();
                const isPlaced = placedRoomNumbersSet.has(cleanCode);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectRoom?.(r.roomNumber)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/40 flex items-center justify-between gap-2 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold shrink-0">
                        {r.roomNumber}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-200 group-hover:text-white block truncate">
                          {r.roomName}
                        </span>
                        {r.sceneTitle && (
                          <span className="text-[10px] font-mono text-zinc-500 block truncate">
                            {r.sceneTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPlaced && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 text-[9px] font-mono">
                          On Map
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
