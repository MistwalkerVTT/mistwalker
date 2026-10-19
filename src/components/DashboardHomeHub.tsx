import React, { useState, useMemo } from 'react';
import {
  Upload,
  BookOpen,
  Sparkles,
  Sliders,
  RotateCcw,
  Trash2,
  HelpCircle,
  FolderOpen,
  Shield,
  Users,
  Dices,
  Radio,
  ExternalLink,
  ChevronRight,
  Play,
  FileCode2,
  Bug,
  Clock
} from 'lucide-react';
import { Campaign, Scene, ActiveSessionData } from '../lib/firebase';
import { DEMO_GV_CAMPAIGN, DEMO_GV_SCENE, DEMO_GV_CHAPTER } from '../data/demoCampaignGv';

interface DashboardHomeHubProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUniversalVttUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenLoadModal: () => void;
  onOpenCampaignManager: () => void;
  onOpenMonsterCompendium: () => void;
  onOpenCharacterCompendium: () => void;
  onOpenAlliesCompendium: () => void;
  onOpenDdbSync: () => void;
  onStartTutorial: () => void;
  onOpenBugReport?: () => void;
  onLoadSceneFromCampaign: (scene: Scene, campaignId: string, chapterId: string) => void;
  campaignsList: Campaign[];
  lastActiveSession?: ActiveSessionData | null;
  unsavedSceneBackup: any;
  unsavedSceneBackupWasCrash: boolean;
  onRestoreUnsavedScene: () => void;
  onDiscardUnsavedScene: () => void;
  isFirebaseConnected?: boolean;
}

export const DashboardHomeHub: React.FC<DashboardHomeHubProps> = ({
  onFileUpload,
  onUniversalVttUpload,
  onOpenLoadModal,
  onOpenCampaignManager,
  onOpenMonsterCompendium,
  onOpenCharacterCompendium,
  onOpenAlliesCompendium,
  onOpenDdbSync,
  onStartTutorial,
  onOpenBugReport,
  onLoadSceneFromCampaign,
  campaignsList,
  lastActiveSession,
  unsavedSceneBackup,
  unsavedSceneBackupWasCrash,
  onRestoreUnsavedScene,
  onDiscardUnsavedScene,
  isFirebaseConnected = true
}) => {
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);

  // Retrieve last active scene info from localStorage as fast fallback
  const cachedLastActive = useMemo(() => {
    try {
      const raw = localStorage.getItem('mistwalker_last_active_scene');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }, []);

  // Determine the most recently saved scene with high precision
  const resolvedResumeData = useMemo(() => {
    // 1. Try matching with Firestore lastActiveSession
    if (lastActiveSession?.campaignId && lastActiveSession?.sceneId) {
      const matchedCamp = campaignsList.find(c => c.campaignId === lastActiveSession.campaignId);
      if (matchedCamp) {
        for (const chap of matchedCamp.chapters) {
          const matchedScene = chap.scenes.find(s => s.sceneId === lastActiveSession.sceneId);
          if (matchedScene) {
            return {
              scene: matchedScene,
              campaignId: matchedCamp.campaignId,
              chapterId: chap.chapterId,
              campaignTitle: matchedCamp.campaignTitle,
              chapterTitle: chap.chapterTitle,
              sceneTitle: matchedScene.sceneTitle,
              tokenCount: matchedScene.tokens?.length || 0,
              wallCount: matchedScene.walls?.length || 0,
              isRealSave: true,
              sourceLabel: 'Last Active Scene'
            };
          }
        }
      }
    }

    // 2. Try matching with cached localStorage last saved scene
    if (cachedLastActive?.campaignId && cachedLastActive?.sceneId) {
      const matchedCamp = campaignsList.find(c => c.campaignId === cachedLastActive.campaignId);
      if (matchedCamp) {
        for (const chap of matchedCamp.chapters) {
          const matchedScene = chap.scenes.find(s => s.sceneId === cachedLastActive.sceneId);
          if (matchedScene) {
            return {
              scene: matchedScene,
              campaignId: matchedCamp.campaignId,
              chapterId: chap.chapterId,
              campaignTitle: matchedCamp.campaignTitle,
              chapterTitle: chap.chapterTitle,
              sceneTitle: matchedScene.sceneTitle,
              tokenCount: matchedScene.tokens?.length || 0,
              wallCount: matchedScene.walls?.length || 0,
              isRealSave: true,
              sourceLabel: 'Last Saved Scene'
            };
          }
        }
      }
    }

    // 3. Scan all campaigns and chapters to locate the scene with the latest updatedAt timestamp
    let latestScene: Scene | null = null;
    let latestCampId = '';
    let latestChapId = '';
    let latestCampTitle = '';
    let latestChapTitle = '';
    let maxTimestamp = 0;

    for (const camp of campaignsList) {
      const campTime = camp.updatedAt || camp.createdAt || 0;
      for (const chap of camp.chapters) {
        for (const sc of chap.scenes) {
          const scTime = sc.updatedAt || campTime;
          if (scTime > maxTimestamp) {
            maxTimestamp = scTime;
            latestScene = sc;
            latestCampId = camp.campaignId;
            latestChapId = chap.chapterId;
            latestCampTitle = camp.campaignTitle;
            latestChapTitle = chap.chapterTitle;
          }
        }
      }
    }

    if (latestScene) {
      return {
        scene: latestScene,
        campaignId: latestCampId,
        chapterId: latestChapId,
        campaignTitle: latestCampTitle,
        chapterTitle: latestChapTitle,
        sceneTitle: latestScene.sceneTitle,
        tokenCount: latestScene.tokens?.length || 0,
        wallCount: latestScene.walls?.length || 0,
        isRealSave: true,
        sourceLabel: 'Latest Saved Scene'
      };
    }

    // 4. Fallback to demo Guild House scene if no user campaigns exist
    return {
      scene: DEMO_GV_SCENE,
      campaignId: DEMO_GV_CAMPAIGN.campaignId,
      chapterId: DEMO_GV_CHAPTER.chapterId,
      campaignTitle: DEMO_GV_CAMPAIGN.campaignTitle,
      chapterTitle: DEMO_GV_CHAPTER.chapterTitle,
      sceneTitle: DEMO_GV_SCENE.sceneTitle,
      tokenCount: DEMO_GV_SCENE.tokens?.length || 10,
      wallCount: DEMO_GV_SCENE.walls?.length || 64,
      isRealSave: false,
      sourceLabel: 'Demo Scene'
    };
  }, [campaignsList, lastActiveSession, cachedLastActive]);

  const displayScene = resolvedResumeData.scene;
  const displayCampaignTitle = resolvedResumeData.campaignTitle;
  const displayChapterTitle = resolvedResumeData.chapterTitle;
  const displaySceneTitle = resolvedResumeData.sceneTitle;
  const displayCampaignId = resolvedResumeData.campaignId;
  const displayChapterId = resolvedResumeData.chapterId;
  const tokenCount = resolvedResumeData.tokenCount;
  const wallCount = resolvedResumeData.wallCount;

  const handleResumePrimaryScene = () => {
    onLoadSceneFromCampaign(displayScene, displayCampaignId, displayChapterId);
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 pointer-events-auto overflow-y-auto">
      {/* Subtle background ambient overlay */}
      <div className="w-full max-w-6xl flex flex-col items-center my-auto animate-in fade-in zoom-in-95 duration-300">
        
        {/* TOP BRAND HEADER */}
        <div className="flex flex-col items-center text-center mb-6 relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900/90 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <img
                src="https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/blob-c3567a0.png/:/rs=w:1440,h:1440"
                alt="MistWalker"
                className="w-8 h-8 object-contain filter drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 font-mono tracking-tight leading-none">
                  MistWalker VTT
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-amber-500/30">
                  v4.0
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Tactical Battlemap Command Deck • Fog of War • Dynamic FOV & Lighting
              </p>
            </div>
          </div>

          {/* D&D Beyond Sync Status Pill */}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={onOpenDdbSync}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-amber-500/40 text-zinc-300 hover:text-amber-300 text-[11px] font-mono transition-all cursor-pointer shadow-sm"
              title="Click to configure D&D Beyond Live Campaign Sync & Game Log"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              <span>D&D Beyond: <strong className="text-emerald-400 font-medium">Ready</strong></span>
              <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
            </button>
            {isFirebaseConnected && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Cloud Sync</span>
              </span>
            )}
          </div>
        </div>

        {/* UNSAVED SCENE RECOVERY ALERT BANNER (If present) */}
        {unsavedSceneBackup && (
          <div className="w-full mb-6 p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 shadow-2xl shadow-amber-950/40 text-left animate-in slide-in-from-top-3 duration-300 backdrop-blur-xl ring-1 ring-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                <RotateCcw className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                    {unsavedSceneBackupWasCrash ? 'Interrupted Session Detected' : 'Unsaved Battlemap Progress'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/25 text-amber-300 border border-amber-500/40">
                    {unsavedSceneBackup.activeSceneInfo?.sceneTitle || 'Active Battlemap'}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-sans">
                  A previous session has unsaved changes ({unsavedSceneBackup.tokens?.length || 0} tokens, {unsavedSceneBackup.walls?.length || 0} walls).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={onDiscardUnsavedScene}
                className="px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Discard
              </button>
              <button
                type="button"
                onClick={onRestoreUnsavedScene}
                className="px-4 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/25 transition-all flex items-center gap-1.5 cursor-pointer transform hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Resume Session
              </button>
            </div>
          </div>
        )}

        {/* 3-COLUMN TACTICAL DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full items-stretch">
          
          {/* COLUMN 1: RESUME ADVENTURE */}
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/90 hover:border-amber-500/40 rounded-3xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden group transition-all">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/40 via-emerald-400 to-transparent" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5" />
                  Resume Adventure
                </span>
                <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {resolvedResumeData.sourceLabel}
                </span>
              </div>

              {/* Scene Miniature Card */}
              <div className="w-full h-36 rounded-2xl overflow-hidden border border-zinc-850 relative mb-3 bg-zinc-900 group-hover:border-zinc-700 transition-colors shadow-inner">
                {displayScene.mapThumbnailUrl || displayScene.mapUrl ? (
                  <img
                    src={displayScene.mapThumbnailUrl || displayScene.mapUrl}
                    alt={displaySceneTitle}
                    className="w-full h-full object-cover object-center filter brightness-[0.85] group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-950 text-zinc-600">
                    <BookOpen className="w-8 h-8 mb-1 opacity-40" />
                    <span className="text-xs font-mono">Battlemap Scene</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 text-left">
                  <h3 className="text-sm font-bold text-amber-200 truncate font-mono drop-shadow">
                    {displaySceneTitle}
                  </h3>
                  <p className="text-[11px] text-zinc-400 truncate font-sans">
                    {displayCampaignTitle} • {displayChapterTitle}
                  </p>
                </div>
              </div>

              {/* Scene Stats Pills */}
              <div className="flex items-center gap-2 mb-4 text-[11px] font-mono text-zinc-400">
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-300">
                  Tokens: <strong className="text-emerald-400">{tokenCount}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-300">
                  Walls: <strong className="text-amber-400">{wallCount}</strong>
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-850/80">
              <button
                type="button"
                id="btn-resume-adventure-primary"
                onClick={handleResumePrimaryScene}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-950/60 font-mono text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white text-white" />
                <span>Continue Session</span>
              </button>

              <button
                type="button"
                id="btn-load-another-campaign"
                onClick={onOpenLoadModal}
                className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-medium rounded-xl transition-all font-mono text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span>Select Another Scene...</span>
              </button>
            </div>
          </div>

          {/* COLUMN 2: DEPLOY BATTLEMAP */}
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/90 hover:border-amber-500/40 rounded-3xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden group transition-all">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/40 via-amber-400 to-transparent" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Deploy Battlemap
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  Image, Video or UVTT
                </span>
              </div>

              {/* Tactical Drag & Drop Target */}
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOverDropzone(true);
                }}
                onDragLeave={() => setIsDragOverDropzone(false)}
                className={`w-full h-44 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 cursor-pointer relative overflow-hidden ${
                  isDragOverDropzone
                    ? 'border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/20'
                    : 'border-zinc-800 hover:border-amber-500/50 bg-zinc-900/60 hover:bg-zinc-900/90'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-850 border border-zinc-750 flex items-center justify-center text-amber-400 mb-2.5 shadow-md group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold text-zinc-200 text-center mb-0.5">
                  Drag & Drop Map File Here
                </span>
                <span className="text-[10px] font-sans text-zinc-400 text-center max-w-[200px]">
                  Supports JPG, PNG, WebM, MP4 and Universal VTT (.dd2vtt)
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,.m4v,.dd2vtt,.uvtt,application/json"
                  onChange={onFileUpload}
                />
              </label>
            </div>

            {/* Quick Upload Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-zinc-850/80">
              <label className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-all font-mono text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 text-center">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Map</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,.m4v"
                  onChange={onFileUpload}
                />
              </label>

              <label className="py-2.5 px-3 bg-purple-600/90 hover:bg-purple-500 text-white font-bold rounded-xl transition-all font-mono text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-950/50 active:scale-95 text-center">
                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                <span>Import UVTT</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".dd2vtt,.uvtt,application/json"
                  onChange={onUniversalVttUpload}
                />
              </label>
            </div>
          </div>

          {/* COLUMN 3: COMPENDIUM & VAULT */}
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/90 hover:border-amber-500/40 rounded-3xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden group transition-all">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500/40 via-blue-400 to-transparent" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Compendium & Vault
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  D&D 5e Database
                </span>
              </div>

              {/* 4 Interactive Quick Launch Tiles */}
              <div className="grid grid-cols-2 gap-2.5 mb-2">
                {/* Monster Compendium */}
                <button
                  type="button"
                  id="btn-home-monster-compendium"
                  onClick={onOpenMonsterCompendium}
                  className="p-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-rose-500/50 transition-all text-left group/btn flex flex-col justify-between h-24 cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 w-fit border border-rose-500/30">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-mono font-bold text-zinc-200 group-hover/btn:text-rose-300">
                      Bestiary
                    </span>
                    <span className="block text-[10px] text-zinc-500 font-sans">
                      Monsters & Statblocks
                    </span>
                  </div>
                </button>

                {/* Character Compendium */}
                <button
                  type="button"
                  id="btn-home-hero-compendium"
                  onClick={onOpenCharacterCompendium}
                  className="p-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-blue-500/50 transition-all text-left group/btn flex flex-col justify-between h-24 cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 w-fit border border-blue-500/30">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-mono font-bold text-zinc-200 group-hover/btn:text-blue-300">
                      Heroes & Allies
                    </span>
                    <span className="block text-[10px] text-zinc-500 font-sans">
                      Party & NPC Sheets
                    </span>
                  </div>
                </button>

                {/* Campaign Builder / Manager */}
                <button
                  type="button"
                  id="btn-home-campaign-builder"
                  onClick={onOpenCampaignManager}
                  className="p-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/50 transition-all text-left group/btn flex flex-col justify-between h-24 cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 w-fit border border-amber-500/30">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-mono font-bold text-zinc-200 group-hover/btn:text-amber-300">
                      Campaigns
                    </span>
                    <span className="block text-[10px] text-zinc-500 font-sans">
                      Story & Scenes
                    </span>
                  </div>
                </button>

                {/* D&D Beyond Live Sync */}
                <button
                  type="button"
                  id="btn-home-ddb-sync"
                  onClick={onOpenDdbSync}
                  className="p-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/50 transition-all text-left group/btn flex flex-col justify-between h-24 cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 w-fit border border-emerald-500/30">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-mono font-bold text-zinc-200 group-hover/btn:text-emerald-300">
                      D&D Beyond
                    </span>
                    <span className="block text-[10px] text-zinc-500 font-sans">
                      Live Sync & Dice
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Tutorial Walkthrough Link */}
            <div className="pt-2 border-t border-zinc-850/80">
              <button
                type="button"
                id="btn-start-tutorial-guide-home"
                onClick={onStartTutorial}
                className="w-full py-2.5 px-3 bg-zinc-900/90 hover:bg-zinc-850 border border-amber-500/30 hover:border-amber-400 text-amber-300 hover:text-amber-200 font-bold rounded-xl transition-all font-mono text-[11px] flex items-center justify-between cursor-pointer group/tut"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400 group-hover/tut:rotate-12 transition-transform" />
                  <span>Interactive DM Tutorial</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 border border-amber-500/40 rounded-md text-amber-300 font-sans">
                  11 Steps
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM UTILITY FOOTER */}
        <div className="flex items-center justify-between w-full mt-5 px-2 text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-4">
            <span>MistWalker Command Deck</span>
            <span>•</span>
            <button
              onClick={() => onOpenAlliesCompendium()}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Allies Library
            </button>
            <span>•</span>
            <button
              onClick={onOpenCampaignManager}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Scenes & Chapters
            </button>
          </div>

          {onOpenBugReport && (
            <button
              onClick={onOpenBugReport}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
