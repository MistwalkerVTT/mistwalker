import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Save,
  FolderOpen,
  Users,
  Plus,
  Sparkles,
  Play,
  Pencil,
  Pentagon,
  Layers,
  Radio,
  Share2,
  Scroll,
  Music,
  Swords,
  ChevronDown,
  MoreHorizontal,
  Library,
  Cloud,
  CloudOff
} from 'lucide-react';
import { toast } from 'sonner';
import { getPlayerViewUrl, getActiveSessionId, getDmViewUrl } from '../lib/sessionUrl';
import { Campaign, Scene } from '../lib/firebase';
import { CampaignMode } from '../types';

interface MainCampaignBarProps {
  activeSceneInfo: {
    campaignId: string;
    chapterId: string;
    sceneId: string;
    sceneTitle: string;
    mapWidth?: number;
    mapHeight?: number;
    mapUrl?: string;
  } | null;
  campaigns: Campaign[];
  tokenCount: number;
  onQuickSave: () => void;
  isQuickSaving: boolean;
  onOpenSaveModal: () => void;
  onOpenLoadModal: () => void;
  onOpenCampaignManager: () => void;
  onOpenArenaManager?: () => void;
  onOpenMonsterCompendium?: () => void;
  onOpenCharacterCompendium?: () => void;
  onOpenAlliesCompendium?: () => void;
  onOpenDdbSync?: () => void;
  onOpenDndChatbot?: () => void;
  onOpenHandoutsJournal?: () => void;
  hasUnreadHandouts?: boolean;
  onOpenAudioMixer?: () => void;
  activeAudioLoopCount?: number;
  onOpenChapterGuide?: () => void;
  isFirebaseConnected?: boolean;
  onRelinkMap?: () => void;
  onForceSync?: () => void;
  campaignMode: CampaignMode;
  onModeChange: (mode: CampaignMode) => void;
  tool?: string;
  setTool?: (tool: string) => void;
  activeMapId?: 'DM1' | 'DM2' | 'DM3';
  liveMapId?: 'DM1' | 'DM2' | 'DM3';
  onMapSwitch?: (id: 'DM1' | 'DM2' | 'DM3') => void;
}

/** Small vertical divider between logical groups */
const Divider: React.FC = () => <div className="w-px self-stretch my-0.5 bg-zinc-800/90 shrink-0" />;

/** Lightweight dropdown that closes on outside click / Escape */
const BarMenu: React.FC<{
  id: string;
  label?: string;
  title: string;
  icon: React.ReactNode;
  buttonClassName: string;
  children: (close: () => void) => React.ReactNode;
}> = ({ id, label, title, icon, buttonClassName, children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${buttonClassName} ${open ? 'ring-1 ring-amber-400/60' : ''}`}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {icon}
        {label && <span>{label}</span>}
        <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 mt-1.5 min-w-[210px] p-1.5 rounded-xl bg-zinc-950/98 backdrop-blur-xl border border-zinc-700/80 shadow-2xl z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{
  id?: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  accent?: string;
  onClick: () => void;
  badge?: React.ReactNode;
}> = ({ id, icon, label, hint, accent = 'text-zinc-200', onClick, badge }) => (
  <button
    id={id}
    type="button"
    role="menuitem"
    onClick={onClick}
    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-bold hover:bg-zinc-800/80 transition-colors cursor-pointer"
    title={hint}
  >
    <span className={`shrink-0 ${accent}`}>{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-zinc-100">{label}</span>
      {hint && <span className="block text-[9px] font-normal text-zinc-500 truncate">{hint}</span>}
    </span>
    {badge}
  </button>
);

export const MainCampaignBar: React.FC<MainCampaignBarProps> = React.memo(({
  activeSceneInfo,
  campaigns,
  tokenCount,
  onQuickSave,
  isQuickSaving,
  onOpenSaveModal,
  onOpenLoadModal,
  onOpenCampaignManager,
  onOpenArenaManager,
  onOpenMonsterCompendium,
  onOpenCharacterCompendium,
  onOpenAlliesCompendium,
  onOpenDdbSync,
  onOpenDndChatbot,
  onOpenHandoutsJournal,
  hasUnreadHandouts,
  onOpenAudioMixer,
  activeAudioLoopCount = 0,
  onOpenChapterGuide,
  isFirebaseConnected = true,
  onRelinkMap,
  onForceSync,
  campaignMode,
  onModeChange,
  tool,
  setTool,
  activeMapId,
  liveMapId,
  onMapSwitch
}) => {
  // Find active campaign name
  const activeCampaign = campaigns.find(c => c.campaignId === activeSceneInfo?.campaignId);
  const activeChapter = activeCampaign?.chapters.find(ch => ch.chapterId === activeSceneInfo?.chapterId);
  const isOnline = isFirebaseConnected !== false;
  const needsSync = Boolean(activeMapId && liveMapId && activeMapId !== liveMapId);

  const hasLibrary = Boolean(
    onOpenMonsterCompendium || onOpenCharacterCompendium || onOpenAlliesCompendium || onOpenDdbSync || onOpenArenaManager || onOpenCampaignManager
  );

  return (
    <div
      id="main-campaign-bar"
      className="absolute top-3 left-4 z-40 flex flex-wrap items-center gap-x-2 gap-y-1.5 bg-zinc-950/90 backdrop-blur-md border border-zinc-800/90 rounded-2xl px-3 py-1.5 shadow-2xl text-xs font-mono select-none max-w-[calc(100vw-360px)]"
    >
      {/* ───── GROUP 1: Scene & status ───── */}
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        <div
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            activeSceneInfo ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400/80'
          }`}
        />
        {activeSceneInfo ? (
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="font-bold text-emerald-300 truncate max-w-[170px]" title={activeSceneInfo.sceneTitle}>
              {activeSceneInfo.sceneTitle}
            </span>
            {activeCampaign && (
              <span className="text-[9px] text-zinc-500 truncate max-w-[170px]">
                {activeCampaign.campaignTitle} {activeChapter ? `› ${activeChapter.chapterTitle}` : ''}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-zinc-400 font-medium">Unlinked Canvas</span>
        )}

        {/* Compact status chips */}
        <div
          className="flex items-center gap-1 text-[10px] text-zinc-300 px-1.5 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800"
          title={`${tokenCount} tokens on the board`}
        >
          <Users className="w-3 h-3 text-blue-400" />
          <span>{tokenCount}</span>
        </div>
        <div
          className={`flex items-center px-1.5 py-0.5 rounded-lg border transition-colors ${
            isOnline
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
              : 'bg-red-950/40 border-red-500/30 text-red-400'
          }`}
          title={isOnline ? 'Cloud Sync Online: Firestore connected & syncing in real-time' : 'Cloud Offline: Firestore offline or reconnecting'}
        >
          {isOnline ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
        </div>

        {/* Session Room Chip */}
        {(() => {
          const currentSession = getActiveSessionId();
          return (
            <button
              type="button"
              onClick={() => {
                const target = prompt('Enter Room / Session Name (or leave blank for "default"):', currentSession === 'default' ? '' : currentSession);
                if (target !== null) {
                  const clean = target.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
                  const newUrl = getDmViewUrl(clean || 'default');
                  window.location.href = newUrl;
                }
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[10px] font-mono transition-all cursor-pointer ${
                currentSession !== 'default'
                  ? 'bg-purple-950/40 border-purple-500/40 text-purple-300 hover:bg-purple-900/50'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title={`Active Session Room: "${currentSession}". Click to switch room or create an isolated session for another DM.`}
            >
              <Radio className={`w-3 h-3 ${currentSession !== 'default' ? 'text-purple-400' : 'text-zinc-500'}`} />
              <span className="font-bold">{currentSession === 'default' ? 'Room: Main' : `Room: ${currentSession}`}</span>
            </button>
          );
        })()}
      </div>

      <Divider />

      {/* ───── GROUP 2: Mode, layers & drawing tools ───── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Campaign Mode Switcher */}
        <div className="flex items-center p-0.5 rounded-xl bg-zinc-900/90 border border-zinc-750 shrink-0 shadow-inner">
          <button
            id="btn-mode-run-campaign"
            onClick={() => onModeChange('run')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              campaignMode === 'run'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title="Run Campaign Mode: Normal wall lines are hidden from view. Doors remain visible and can be clicked to open or close."
          >
            <Play className={`w-3.5 h-3.5 ${campaignMode === 'run' ? 'text-emerald-200' : 'text-zinc-400'}`} />
            <span>Run</span>
          </button>
          <button
            id="btn-mode-creator"
            onClick={() => onModeChange('creator')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              campaignMode === 'creator'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/30 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title="Campaign Creator Mode: Draw wall lines and doors, configure portals, and edit geometry."
          >
            <Pencil className={`w-3.5 h-3.5 ${campaignMode === 'creator' ? 'text-zinc-950' : 'text-zinc-400'}`} />
            <span>Creator</span>
          </button>
        </div>

        {/* Map Layer Slots (DM1, DM2, DM3) */}
        {onMapSwitch && (
          <div className="flex items-center p-0.5 rounded-xl bg-zinc-900/90 border border-zinc-750 shrink-0 shadow-inner gap-0.5">
            {(['DM1', 'DM2', 'DM3'] as const).map((slotId) => {
              const isActive = activeMapId === slotId;
              const isLive = (liveMapId || 'DM1') === slotId;
              return (
                <button
                  key={slotId}
                  id={`btn-mainbar-slot-${slotId}`}
                  onClick={() => onMapSwitch(slotId)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer relative flex items-center gap-1 ${
                    isActive
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm font-black'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                  title={`Map Layer ${slotId}${isActive ? ' (Viewing Now)' : ''}${isLive ? ' — [Live on Player View]' : ' — [Private DM Prep]'}`}
                >
                  <span>{slotId}</span>
                  {isLive && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-zinc-950 ring-1 ring-emerald-300 animate-pulse' : 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)] animate-pulse'}`}
                      title="Live on Player View"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Wall Tool vs Room Polygon Tool */}
        {setTool && (
          <div className="flex items-center p-0.5 rounded-xl bg-zinc-900/90 border border-zinc-750 shrink-0 shadow-inner gap-0.5">
            <button
              id="btn-bar-wall-tool"
              onClick={() => {
                if (campaignMode !== 'creator') onModeChange('creator');
                setTool(tool === 'wall' ? 'select' : 'wall');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                tool === 'wall'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              title="Wall Tool: Draw solid lines, doors, and windows that block vision and light"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Walls</span>
            </button>
            <button
              id="btn-bar-polygon-zone-tool"
              onClick={() => {
                if (campaignMode !== 'creator') onModeChange('creator');
                setTool(tool === 'zone' || tool === 'hotspot' ? 'select' : 'zone');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                tool === 'zone' || tool === 'hotspot'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/40 ring-1 ring-amber-400 font-semibold'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-zinc-800/60'
              }`}
              title="Room Polygon Tool: Draw custom room boundary polygons for DM boxed text, secrets, traps, and PDF citations (Different from Wall Tool)"
            >
              <Pentagon className="w-3.5 h-3.5" />
              <span>Rooms</span>
            </button>
          </div>
        )}
      </div>

      <Divider />

      {/* ───── GROUP 3: Save / Load ───── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {activeSceneInfo ? (
          <button
            id="btn-quick-save-scene"
            onClick={onQuickSave}
            disabled={isQuickSaving}
            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 active:scale-95 disabled:opacity-50"
            title="Save current token positions, stats, and battlemap to this active scene in Firestore"
          >
            {isQuickSaving ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save</span>
          </button>
        ) : (
          <button
            id="btn-save-to-campaign"
            onClick={onOpenSaveModal}
            className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/40 active:scale-95"
            title="Save this map and placed tokens into Campaign Manager"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save to Campaign</span>
          </button>
        )}

        <button
          id="btn-main-load-campaign"
          onClick={onOpenLoadModal}
          className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/80 text-[11px] flex items-center gap-1.5 transition-all"
          title="Browse and load a saved scene from your campaigns onto the canvas"
        >
          <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>Load</span>
        </button>

        {(activeSceneInfo || onRelinkMap) && (
          <BarMenu
            id="btn-bar-more-file"
            title="More scene actions"
            icon={<MoreHorizontal className="w-4 h-4" />}
            buttonClassName="px-1.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-[11px] flex items-center gap-0.5 transition-all cursor-pointer"
          >
            {(close) => (
              <>
                {activeSceneInfo && (
                  <MenuItem
                    id="btn-save-as-new-scene"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    accent="text-amber-400"
                    label="Save As..."
                    hint="Save as a new scene or into another campaign"
                    onClick={() => { close(); onOpenSaveModal(); }}
                  />
                )}
                {onRelinkMap && (
                  <MenuItem
                    id="btn-main-relink-map"
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    accent="text-emerald-400"
                    label="Re-link Map"
                    hint="Replace the battlemap image, keeping walls, tokens & fog"
                    onClick={() => { close(); onRelinkMap(); }}
                  />
                )}
              </>
            )}
          </BarMenu>
        )}
      </div>

      <Divider />

      {/* ───── GROUP 4: Players (sync & share) ───── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onForceSync && (
          <button
            id="btn-main-force-sync-players"
            onClick={onForceSync}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
              needsSync
                ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 ring-2 ring-blue-500/50 shadow-blue-900/50 animate-pulse'
                : 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40'
            }`}
            title={`Force Sync to Players: Broadcast current map slot (${activeMapId || 'DM1'}) to all player screens. Currently, players are seeing ${liveMapId || 'DM1'}.`}
          >
            <Radio className={`w-3.5 h-3.5 text-blue-300 ${needsSync ? 'animate-pulse' : ''}`} />
            <span>{needsSync ? `Sync ${activeMapId} → Players` : 'Sync Players'}</span>
          </button>
        )}

        <button
          id="btn-main-share-player-view"
          onClick={() => {
            const playerUrl = getPlayerViewUrl();
            navigator.clipboard.writeText(playerUrl);
            window.open(playerUrl, '_blank');
            toast.success('Player View link copied to clipboard and opened in new window!', {
              description: playerUrl
            });
          }}
          className="px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          title="Share Player View: Copy URL and open player screen in a new window"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Share</span>
        </button>
      </div>

      <Divider />

      {/* ───── GROUP 5: Session tools (Guide, Handouts, Jukebox) ───── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onOpenChapterGuide && (
          <button
            id="btn-main-open-chapter-guide"
            onClick={onOpenChapterGuide}
            className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open Non-Room Chapter Guide: Story Hooks, Dungeon Rules (Doors/Traps/Light), Roaming Patrols & NPCs"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Guide</span>
          </button>
        )}

        {onOpenHandoutsJournal && (
          <button
            id="btn-main-open-handouts-journal"
            onClick={onOpenHandoutsJournal}
            className="px-2.5 py-1 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 text-amber-200 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer relative"
            title="Open Player Handouts, Visual Props, Letters, Riddles & Shared Party Journal"
          >
            <Scroll className="w-3.5 h-3.5 text-amber-400" />
            <span>Handouts</span>
            {hasUnreadHandouts && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
          </button>
        )}

        {onOpenAudioMixer && (
          <button
            id="btn-main-open-audio-mixer"
            onClick={onOpenAudioMixer}
            className="px-2.5 py-1 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer relative"
            title="Open DM Soundboard, Layered Ambience Mixer & Positional Map Audio"
          >
            <Music className="w-3.5 h-3.5 text-emerald-400" />
            <span>Jukebox</span>
            {activeAudioLoopCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-zinc-950 text-[9px] font-black">
                {activeAudioLoopCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ───── GROUP 6: Library dropdown + Oracle ───── */}
      {(hasLibrary || onOpenDndChatbot) && <Divider />}
      <div className="flex items-center gap-1.5 shrink-0">
        {hasLibrary && (
          <BarMenu
            id="btn-bar-library-menu"
            label="Library"
            title="Compendiums, D&D Beyond, Campaign Manager & Arena"
            icon={<Library className="w-3.5 h-3.5 text-amber-400" />}
            buttonClassName="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700/80 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {(close) => (
              <>
                {onOpenMonsterCompendium && (
                  <MenuItem
                    id="btn-main-open-monster-compendium"
                    icon={<BookOpen className="w-3.5 h-3.5" />}
                    accent="text-red-400"
                    label="Monsters"
                    hint="Monster Compendium & AI Statblock Digester"
                    onClick={() => { close(); onOpenMonsterCompendium(); }}
                  />
                )}
                {onOpenCharacterCompendium && (
                  <MenuItem
                    id="btn-main-open-character-compendium"
                    icon={<Users className="w-3.5 h-3.5" />}
                    accent="text-amber-400"
                    label="Characters"
                    hint="Hero tokens & character sheets"
                    onClick={() => { close(); onOpenCharacterCompendium(); }}
                  />
                )}
                {onOpenAlliesCompendium && (
                  <MenuItem
                    id="btn-main-open-allies-compendium"
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    accent="text-emerald-400"
                    label="Allies & Summons"
                    hint="Familiars, companions & druid summons"
                    onClick={() => { close(); onOpenAlliesCompendium(); }}
                  />
                )}
                {onOpenDdbSync && (
                  <MenuItem
                    id="btn-main-open-ddb-sync"
                    icon={<Radio className="w-3.5 h-3.5" />}
                    accent="text-red-400"
                    label="D&D Beyond"
                    hint="Live character HP sync & monster ingestion"
                    onClick={() => { close(); onOpenDdbSync(); }}
                  />
                )}
                <div className="h-px bg-zinc-800 my-1" />
                <MenuItem
                  id="btn-main-open-campaign-manager"
                  icon={<BookOpen className="w-3.5 h-3.5" />}
                  accent="text-amber-400"
                  label="Campaign Manager"
                  hint="Campaign builder & chapter hierarchy"
                  onClick={() => { close(); onOpenCampaignManager(); }}
                />
                {onOpenArenaManager && (
                  <MenuItem
                    id="btn-main-open-arena-manager"
                    icon={<Swords className="w-3.5 h-3.5" />}
                    accent="text-amber-400"
                    label="Battle Arena"
                    hint="Arena maps, walls, monsters & rules"
                    onClick={() => { close(); onOpenArenaManager(); }}
                  />
                )}
              </>
            )}
          </BarMenu>
        )}

        {onOpenDndChatbot && (
          <button
            id="btn-main-open-dnd-chatbot"
            onClick={onOpenDndChatbot}
            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-600/30 to-red-600/30 hover:from-amber-600/45 hover:to-red-600/45 text-white border border-amber-500/50 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] active:scale-95"
            title="Open D&D AI Oracle (Golden Vault & Vecna Expert)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Oracle</span>
          </button>
        )}
      </div>
    </div>
  );
});
