import React from 'react';
import {
  BookOpen,
  Save,
  FolderOpen,
  Users,
  Sliders,
  Check,
  AlertCircle,
  X,
  Plus,
  Sparkles,
  Play,
  Pencil,
  DoorOpen,
  Pentagon,
  Layers,
  Radio,
  Share2,
  Scroll,
  Music
} from 'lucide-react';
import { toast } from 'sonner';
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
  onOpenMonsterCompendium?: () => void;
  onOpenCharacterCompendium?: () => void;
  onOpenAlliesCompendium?: () => void;
  onOpenDdbSync?: () => void;
  onOpenDndChatbot?: () => void;
  onOpenHandoutsJournal?: () => void;
  hasUnreadHandouts?: boolean;
  onOpenAudioMixer?: () => void;
  activeAudioLoopCount?: number;
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

export const MainCampaignBar: React.FC<MainCampaignBarProps> = React.memo(({
  activeSceneInfo,
  campaigns,
  tokenCount,
  onQuickSave,
  isQuickSaving,
  onOpenSaveModal,
  onOpenLoadModal,
  onOpenCampaignManager,
  onOpenMonsterCompendium,
  onOpenCharacterCompendium,
  onOpenAlliesCompendium,
  onOpenDdbSync,
  onOpenDndChatbot,
  onOpenHandoutsJournal,
  hasUnreadHandouts,
  onOpenAudioMixer,
  activeAudioLoopCount = 0,
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

  return (
    <div
      id="main-campaign-bar"
      className="absolute top-3 left-4 z-40 flex flex-wrap items-center gap-2 bg-zinc-950/90 backdrop-blur-md border border-zinc-800/90 rounded-2xl px-3 py-1.5 shadow-2xl text-xs font-mono select-none max-w-[calc(100vw-360px)]"
    >
      {/* Scene Status Indicator */}
      {activeSceneInfo ? (
        <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Scene:</span>
              <span className="font-bold text-emerald-300 truncate max-w-[200px]" title={activeSceneInfo.sceneTitle}>
                {activeSceneInfo.sceneTitle}
              </span>
            </div>
            {activeCampaign && (
              <span className="text-[9px] text-zinc-500 truncate max-w-[180px]">
                {activeCampaign.campaignTitle} {activeChapter ? `› ${activeChapter.chapterTitle}` : ''}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-amber-400/80" />
          <span className="text-[11px] text-zinc-400 font-medium">Unlinked Canvas</span>
        </div>
      )}

      {/* Campaign Mode Switcher (Run Campaign vs Creator Mode) */}
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
          <span>Run Campaign</span>
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
          <span>Creator Mode</span>
        </button>
      </div>

      {/* Map Layer Slots (DM1, DM2, DM3) */}
      {onMapSwitch && (
        <div className="flex items-center p-0.5 rounded-xl bg-zinc-900/90 border border-zinc-750 shrink-0 shadow-inner gap-0.5">
          <span className="text-[9px] uppercase font-bold font-mono text-zinc-500 px-1.5 select-none">Layer:</span>
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

      {/* Distinct Tools: Wall Tool vs Room Polygon Tool */}
      {setTool && (
        <div className="flex items-center p-0.5 rounded-xl bg-zinc-900/90 border border-zinc-750 shrink-0 shadow-inner gap-1">
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
            <span>Room Polygon Tool</span>
          </button>
        </div>
      )}

      {/* Token Count Pill */}
      <div className="flex items-center gap-1 text-[11px] text-zinc-300 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
        <Users className="w-3.5 h-3.5 text-blue-400" />
        <span>{tokenCount} tokens</span>
      </div>

      {/* Firebase Cloud Connection Status Pill */}
      <div
        className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-lg border shrink-0 transition-colors ${
          isFirebaseConnected !== false
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
            : 'bg-red-950/40 border-red-500/30 text-red-400'
        }`}
        title={
          isFirebaseConnected !== false
            ? 'Firebase Firestore: Connected & Syncing in Real-Time'
            : 'Firebase Firestore: Offline or Reconnecting'
        }
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isFirebaseConnected !== false ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
          }`}
        />
        <span>{isFirebaseConnected !== false ? 'Cloud Sync Online' : 'Cloud Offline'}</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Quick Save Scene */}
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
            <span>Save Scene</span>
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

        {/* Save As / New Scene */}
        {activeSceneInfo && (
          <button
            id="btn-save-as-new-scene"
            onClick={onOpenSaveModal}
            className="px-2 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-[11px] flex items-center gap-1 transition-all"
            title="Save as a new scene or into another campaign"
          >
            <Plus className="w-3 h-3 text-amber-400" />
            <span>Save As...</span>
          </button>
        )}

        {/* Load Campaign Scene */}
        <button
          id="btn-main-load-campaign"
          onClick={onOpenLoadModal}
          className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/80 text-[11px] flex items-center gap-1.5 transition-all"
          title="Browse and load a saved scene from your campaigns onto the canvas"
        >
          <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>Load Scene</span>
        </button>

        {/* Replace / Re-link Battlemap */}
        {onRelinkMap && (
          <button
            id="btn-main-relink-map"
            onClick={onRelinkMap}
            className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-emerald-300 border border-zinc-700/80 hover:border-emerald-500/50 text-[11px] flex items-center gap-1.5 transition-all"
            title="Replace or re-link the battlemap image file while strictly preserving all walls, doors, tokens, vision, and fog"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Re-link Map</span>
          </button>
        )}

        {/* Force Sync to Players */}
        {onForceSync && (
          <button
            id="btn-main-force-sync-players"
            onClick={onForceSync}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
              activeMapId && liveMapId && activeMapId !== liveMapId
                ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 ring-2 ring-blue-500/50 shadow-blue-900/50 animate-pulse'
                : 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40'
            }`}
            title={`Force Sync to Players: Broadcast current map slot (${activeMapId || 'DM1'}) to all player screens. Currently, players are seeing ${liveMapId || 'DM1'}.`}
          >
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>
              {activeMapId && liveMapId && activeMapId !== liveMapId
                ? `Force Sync (${activeMapId} → Players)`
                : 'Force Sync to Players'}
            </span>
          </button>
        )}

        {/* Share Player View Link */}
        <button
          id="btn-main-share-player-view"
          onClick={() => {
            const playerUrl = `${window.location.origin}${window.location.pathname}?view=player`;
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
          <span>Share Player View</span>
        </button>

        {/* Monster Compendium Link */}
        {onOpenMonsterCompendium && (
          <button
            id="btn-main-open-monster-compendium"
            onClick={onOpenMonsterCompendium}
            className="px-2 py-1 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/40 text-[11px] font-bold flex items-center gap-1 transition-all"
            title="Open Monster Compendium, AI Statblock Digester, and Creature Library"
          >
            <BookOpen className="w-3.5 h-3.5 text-red-400" />
            <span>Monsters</span>
          </button>
        )}

        {/* Character Compendium Link */}
        {onOpenCharacterCompendium && (
          <button
            id="btn-main-open-character-compendium"
            onClick={onOpenCharacterCompendium}
            className="px-2 py-1 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 transition-all"
            title="Open Character Compendium, Hero Tokens, and PDF Character Sheets"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Characters</span>
          </button>
        )}

        {/* Allies & Summons Compendium Link */}
        {onOpenAlliesCompendium && (
          <button
            id="btn-main-open-allies-compendium"
            onClick={onOpenAlliesCompendium}
            className="px-2 py-1 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 transition-all"
            title="Open Allies & Summons Compendium, Druid Summons, Familiars, and Companions"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Allies</span>
          </button>
        )}

        {/* D&D Beyond Live Sync & Compendium Link */}
        {onOpenDdbSync && (
          <button
            id="btn-main-open-ddb-sync"
            onClick={onOpenDdbSync}
            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-red-950/70 via-slate-900 to-red-950/70 hover:from-red-900/80 hover:to-slate-800 text-amber-200 border border-red-700/60 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            title="D&D Beyond: Real-time Character HP Sync & Monster Compendium Ingestion"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>D&D Beyond</span>
          </button>
        )}

        {/* Handouts, Visual Props & Shared Party Journal */}
        {onOpenHandoutsJournal && (
          <button
            id="btn-main-open-handouts-journal"
            onClick={onOpenHandoutsJournal}
            className="px-2.5 py-1 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 text-amber-200 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer relative"
            title="Open Player Handouts, Visual Props, Letters, Riddles & Shared Party Journal"
          >
            <Scroll className="w-3.5 h-3.5 text-amber-400" />
            <span>Handouts & Journal</span>
            {hasUnreadHandouts && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        )}

        {/* Soundboard & Ambient Audio Mixer (Jukebox) */}
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

        {/* Campaign Manager Drawer Link */}
        <button
          id="btn-main-open-campaign-manager"
          onClick={onOpenCampaignManager}
          className="px-2 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
          title="Open Full Campaign Builder and Chapter Hierarchy"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Manager</span>
        </button>

        {/* D&D AI Oracle / Chatbot Launcher */}
        {onOpenDndChatbot && (
          <button
            id="btn-main-open-dnd-chatbot"
            onClick={onOpenDndChatbot}
            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-600/30 to-red-600/30 hover:from-amber-600/45 hover:to-red-600/45 text-white border border-amber-500/50 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] active:scale-95"
            title="Open D&D AI Oracle (Golden Vault & Vecna Expert)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>D&D Oracle</span>
          </button>
        )}
      </div>
    </div>
  );
});

