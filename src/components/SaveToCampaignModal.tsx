import React, { useState, useEffect } from 'react';
import {
  Save,
  X,
  Plus,
  FolderPlus,
  Layers,
  MapPin,
  FileText,
  Users,
  Check,
  AlertCircle,
  Shield,
  Heart,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import {
  Campaign,
  Scene,
  SceneToken,
  saveSceneToCampaign,
  createCampaignWithScene,
  publishActiveSession
} from '../lib/firebase';
import { createThumbnailDataUrl, saveLocalAsset, isVideoAsset } from '../lib/storageCache';
import { WallSegment, VisionConfig, RoomAnnotation, AnimatedFeature, WeatherEffectType, RevealPoint } from '../types';

interface SaveToCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: Campaign[];
  currentMapUrl: string;
  currentMapWidth?: number;
  currentMapHeight?: number;
  currentMapType?: 'image' | 'video';
  currentMapRotation?: number;
  currentTokens: Array<{
    id: string;
    name: string;
    url: string;
    x: number;
    y: number;
    size: number;
    hp?: number;
    ac?: number;
    isCondition?: boolean;
    visionRadius?: number;
    visionAngle?: number;
    isPlayer?: boolean;
  }>;
  currentGridSize: number;
  currentGridOpacity: number;
  currentGridVisible?: boolean;
  currentGridOffsetX?: number;
  currentGridOffsetY?: number;
  currentIsFogVisible: boolean;
  currentReveals?: RevealPoint[];
  currentPolygonReveals?: number[][];
  currentFogResetKey?: number;
  currentWalls?: WallSegment[];
  currentVisionConfig?: VisionConfig;
  currentRoomAnnotations?: RoomAnnotation[];
  currentBoardAnimatedFeatures?: AnimatedFeature[];
  currentBoardAnimatedEnabled?: boolean;
  currentBoardWeatherEffect?: WeatherEffectType;
  activeSceneInfo: {
    campaignId: string;
    chapterId: string;
    sceneId: string;
    sceneTitle: string;
    mapUrl?: string;
    mapThumbnailUrl?: string;
    mapWidth?: number;
    mapHeight?: number;
  } | null;
  activeDmNotes?: string;
  onSceneSaved: (scene: Scene, campaignId: string, chapterId: string) => void;
}

export const SaveToCampaignModal: React.FC<SaveToCampaignModalProps> = ({
  isOpen,
  onClose,
  campaigns,
  currentMapUrl,
  currentMapWidth,
  currentMapHeight,
  currentMapType = 'image',
  currentMapRotation = 0,
  currentTokens,
  currentGridSize,
  currentGridOpacity,
  currentGridVisible = true,
  currentGridOffsetX = 0,
  currentGridOffsetY = 0,
  currentIsFogVisible,
  currentReveals = [],
  currentPolygonReveals = [],
  currentFogResetKey,
  currentWalls = [],
  currentVisionConfig,
  currentRoomAnnotations = [],
  currentBoardAnimatedFeatures = [],
  currentBoardAnimatedEnabled = true,
  currentBoardWeatherEffect = 'none',
  activeSceneInfo,
  activeDmNotes = '',
  onSceneSaved
}) => {
  // Mode: 'update_current' | 'save_existing' | 'create_new'
  const [saveMode, setSaveMode] = useState<'update_current' | 'save_existing' | 'create_new'>(
    activeSceneInfo ? 'update_current' : campaigns.length > 0 ? 'save_existing' : 'create_new'
  );

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    activeSceneInfo?.campaignId || (campaigns[0]?.campaignId ?? '')
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    activeSceneInfo?.chapterId || ''
  );

  const [sceneTitle, setSceneTitle] = useState<string>(
    activeSceneInfo?.sceneTitle || 'Battle Encounter'
  );
  const [dmNotes, setDmNotes] = useState<string>(activeDmNotes);

  // New campaign fields
  const [newCampaignTitle, setNewCampaignTitle] = useState<string>('');
  const [newChapterTitle, setNewChapterTitle] = useState<string>('Act I: The Journey Begins');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected Campaign Object
  const selectedCampaign = campaigns.find(c => c.campaignId === selectedCampaignId);

  // Synchronize modal state when opened or activeSceneInfo changes
  useEffect(() => {
    if (isOpen) {
      setSaveMode(activeSceneInfo ? 'update_current' : campaigns.length > 0 ? 'save_existing' : 'create_new');
      setSelectedCampaignId(activeSceneInfo?.campaignId || (campaigns[0]?.campaignId ?? ''));
      setSelectedChapterId(activeSceneInfo?.chapterId || '');
      setSceneTitle(activeSceneInfo?.sceneTitle || 'Battle Encounter');
      setDmNotes(activeDmNotes || '');
      setErrorMessage(null);
    }
  }, [isOpen, activeSceneInfo, campaigns, activeDmNotes]);

  // Auto-select first chapter if not set
  useEffect(() => {
    if (selectedCampaign && selectedCampaign.chapters.length > 0) {
      if (!selectedChapterId || !selectedCampaign.chapters.some(ch => ch.chapterId === selectedChapterId)) {
        setSelectedChapterId(selectedCampaign.chapters[0].chapterId);
      }
    }
  }, [selectedCampaign, selectedChapterId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!sceneTitle.trim()) {
      setErrorMessage('Please provide a scene title.');
      return;
    }

    if (!currentMapUrl) {
      setErrorMessage('Warning: No battlemap is currently loaded on the canvas. Please load a map first or continue anyway.');
    }

    setIsSaving(true);

    try {
      const sceneTokensToSave: SceneToken[] = currentTokens.map(t => {
        const tokenObj: SceneToken = {
          id: t.id,
          name: t.name || 'Token',
          avatarUrl: t.url || '',
          x: Math.round(t.x || 0),
          y: Math.round(t.y || 0),
          size: t.size ?? 1
        };
        if (typeof t.hp === 'number' && !isNaN(t.hp)) tokenObj.hp = t.hp;
        if (typeof t.ac === 'number' && !isNaN(t.ac)) tokenObj.ac = t.ac;
        if (typeof t.isCondition === 'boolean') tokenObj.isCondition = t.isCondition;
        if (typeof t.visionRadius === 'number') tokenObj.visionRadius = t.visionRadius;
        if (typeof t.visionAngle === 'number') tokenObj.visionAngle = t.visionAngle;
        if (typeof t.isPlayer === 'boolean') tokenObj.isPlayer = t.isPlayer;
        if (typeof (t as any).isMonster === 'boolean') (tokenObj as any).isMonster = (t as any).isMonster;
        if ((t as any).category) (tokenObj as any).category = (t as any).category;
        if (typeof (t as any).visionEnabled === 'boolean') (tokenObj as any).visionEnabled = (t as any).visionEnabled;
        return tokenObj;
      });

      const targetSceneId = saveMode === 'update_current' && activeSceneInfo
        ? activeSceneInfo.sceneId
        : `scene_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      let embeddedThumbnail: string | undefined = undefined;
      if (currentMapUrl) {
        try {
          embeddedThumbnail = await createThumbnailDataUrl(currentMapUrl, 400, 0.7);
          if (currentMapUrl.startsWith('data:') || currentMapUrl.startsWith('blob:')) {
            await saveLocalAsset(`scene_${targetSceneId}`, currentMapUrl);
          }
        } catch (thumbErr) {
          console.warn('[SaveToCampaign] Thumbnail caching notice:', thumbErr);
        }
      }

      const targetMapUrl = (currentMapUrl && !currentMapUrl.startsWith('blob:'))
        ? currentMapUrl
        : (activeSceneInfo?.mapUrl || currentMapUrl || '');

      // Look up existing scene if updating
      const existingScene = saveMode === 'update_current' && activeSceneInfo
        ? campaigns.find(c => c.campaignId === activeSceneInfo.campaignId)?.chapters.find(ch => ch.chapterId === activeSceneInfo.chapterId)?.scenes.find(s => s.sceneId === activeSceneInfo.sceneId)
        : undefined;

      const sceneToSave: Scene = {
        ...(existingScene || {}),
        sceneId: targetSceneId,
        sceneTitle: sceneTitle.trim(),
        mapUrl: targetMapUrl,
        mapThumbnailUrl: embeddedThumbnail || activeSceneInfo?.mapThumbnailUrl || existingScene?.mapThumbnailUrl,
        mapWidth: currentMapWidth || activeSceneInfo?.mapWidth || existingScene?.mapWidth,
        mapHeight: currentMapHeight || activeSceneInfo?.mapHeight || existingScene?.mapHeight,
        mapType: currentMapType || existingScene?.mapType || 'image',
        mapRotation: currentMapRotation || existingScene?.mapRotation || 0,
        dmNotes: dmNotes.trim(),
        tokens: sceneTokensToSave,
        gridSize: currentGridSize ?? existingScene?.gridSize ?? 50,
        gridOpacity: currentGridOpacity ?? existingScene?.gridOpacity ?? 0.25,
        gridVisible: currentGridVisible !== undefined ? currentGridVisible : (existingScene?.gridVisible ?? true),
        gridOffsetX: currentGridOffsetX ?? existingScene?.gridOffsetX ?? 0,
        gridOffsetY: currentGridOffsetY ?? existingScene?.gridOffsetY ?? 0,
        isFogVisible: currentIsFogVisible ?? existingScene?.isFogVisible ?? true,
        reveals: (currentReveals && currentReveals.length > 0) ? currentReveals : (existingScene?.reveals || []),
        polygonReveals: (currentPolygonReveals && currentPolygonReveals.length > 0) ? currentPolygonReveals : (existingScene?.polygonReveals || []),
        fogResetKey: currentFogResetKey || existingScene?.fogResetKey,
        walls: (currentWalls && currentWalls.length > 0) ? currentWalls : (existingScene?.walls || []),
        visionConfig: currentVisionConfig || existingScene?.visionConfig,
        roomAnnotations: (currentRoomAnnotations && currentRoomAnnotations.length > 0) ? currentRoomAnnotations : (existingScene?.roomAnnotations || []),
        boardAnimatedFeatures: currentBoardAnimatedFeatures || existingScene?.boardAnimatedFeatures || [],
        boardAnimatedEnabled: currentBoardAnimatedEnabled !== undefined ? currentBoardAnimatedEnabled : (existingScene?.boardAnimatedEnabled ?? true),
        boardWeatherEffect: currentBoardWeatherEffect || existingScene?.boardWeatherEffect || 'none',
        pdfUrl: existingScene?.pdfUrl,
        pdfFilename: existingScene?.pdfFilename,
        pdfSection: existingScene?.pdfSection,
        pdfPage: existingScene?.pdfPage,
        updatedAt: Date.now()
      };

      let finalCampaignId = selectedCampaignId;
      let finalChapterId = selectedChapterId;

      if (saveMode === 'create_new') {
        if (!newCampaignTitle.trim()) {
          setErrorMessage('Please provide a campaign title.');
          setIsSaving(false);
          return;
        }

        const createdCamp = await createCampaignWithScene(
          newCampaignTitle.trim(),
          newChapterTitle.trim() || 'Chapter 1',
          sceneToSave
        );
        finalCampaignId = createdCamp.campaignId;
        finalChapterId = createdCamp.chapters[0].chapterId;
      } else {
        if (!finalCampaignId) {
          setErrorMessage('Please select a campaign.');
          setIsSaving(false);
          return;
        }

        // If no chapter exists, create an ID
        if (!finalChapterId) {
          finalChapterId = `chap_${Date.now()}`;
        }

        await saveSceneToCampaign(finalCampaignId, finalChapterId, sceneToSave);
      }

      // Sync active session for live players
      await publishActiveSession({
        sessionId: 'current',
        campaignId: finalCampaignId,
        chapterId: finalChapterId,
        sceneId: sceneToSave.sceneId,
        sceneTitle: sceneToSave.sceneTitle,
        mapUrl: sceneToSave.mapUrl,
        mapThumbnailUrl: sceneToSave.mapThumbnailUrl,
        mapWidth: sceneToSave.mapWidth,
        mapHeight: sceneToSave.mapHeight,
        mapType: sceneToSave.mapType,
        mapRotation: sceneToSave.mapRotation,
        dmNotes: sceneToSave.dmNotes,
        tokens: sceneToSave.tokens,
        gridSize: sceneToSave.gridSize,
        gridOpacity: sceneToSave.gridOpacity,
        gridVisible: sceneToSave.gridVisible,
        gridOffsetX: sceneToSave.gridOffsetX,
        gridOffsetY: sceneToSave.gridOffsetY,
        isFogVisible: sceneToSave.isFogVisible,
        reveals: sceneToSave.reveals,
        polygonReveals: sceneToSave.polygonReveals,
        fogResetKey: sceneToSave.fogResetKey,
        walls: sceneToSave.walls,
        visionConfig: sceneToSave.visionConfig,
        roomAnnotations: sceneToSave.roomAnnotations,
        boardAnimatedFeatures: sceneToSave.boardAnimatedFeatures,
        boardAnimatedEnabled: sceneToSave.boardAnimatedEnabled,
        boardWeatherEffect: sceneToSave.boardWeatherEffect,
        updatedAt: Date.now()
      });

      onSceneSaved(sceneToSave, finalCampaignId, finalChapterId);
      onClose();
    } catch (err: any) {
      console.error('Failed to save scene:', err);
      setErrorMessage(err.message || 'Failed to save scene to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                Save Canvas to Campaign
              </h2>
              <p className="text-xs text-zinc-400">
                Store current map, token coordinates ($X, Y$), and stats into Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1 sidebar-scrollbar">
          {errorMessage && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800/80 text-xs">
            {activeSceneInfo && (
              <button
                type="button"
                onClick={() => setSaveMode('update_current')}
                className={`py-2 px-3 rounded-lg font-mono font-medium transition-all text-center ${
                  saveMode === 'update_current'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Update Active Scene
              </button>
            )}
            <button
              type="button"
              onClick={() => setSaveMode('save_existing')}
              className={`py-2 px-3 rounded-lg font-mono font-medium transition-all text-center ${
                saveMode === 'save_existing'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Existing Campaign
            </button>
            <button
              type="button"
              onClick={() => setSaveMode('create_new')}
              className={`py-2 px-3 rounded-lg font-mono font-medium transition-all text-center ${
                saveMode === 'create_new'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              + New Campaign
            </button>
          </div>

          {/* Canvas Snapshot Summary Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center">
            <div className="w-full sm:w-32 aspect-video rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 relative flex items-center justify-center">
              {currentMapUrl ? (
                isVideoAsset(currentMapUrl) ? (
                  <div className="relative w-full h-full">
                    <video
                      src={currentMapUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-emerald-400 font-mono text-[8px] font-bold border border-emerald-500/40">
                      VIDEO
                    </span>
                  </div>
                ) : (
                  <img
                    src={currentMapUrl}
                    alt="Current Canvas Map"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )
              ) : (
                <span className="text-[10px] text-zinc-600 font-mono">No Map Asset</span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-200 font-mono">Tactical Canvas State</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                  Ready to Sync
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono text-zinc-400 pt-1">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <strong className="text-white">{currentTokens.length}</strong> Tokens
                </span>
                {currentWalls && currentWalls.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <strong className="text-white">{currentWalls.length}</strong> Walls & Doors
                    </span>
                  </>
                )}
                <span>•</span>
                <span>Grid: {currentGridSize}px</span>
                <span>•</span>
                <span>Fog: {currentIsFogVisible ? 'Enabled' : 'Disabled'}</span>
              </div>
              {currentTokens.length > 0 && (
                <p className="text-[11px] text-zinc-500 truncate">
                  Includes: {currentTokens.slice(0, 4).map(t => t.name).join(', ')}
                  {currentTokens.length > 4 ? ` +${currentTokens.length - 4} more` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Form Fields according to mode */}
          {saveMode === 'create_new' ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-400">New Campaign Title *</label>
                <input
                  type="text"
                  required
                  value={newCampaignTitle}
                  onChange={(e) => setNewCampaignTitle(e.target.value)}
                  placeholder="e.g. Descent into Shadowmire"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-400">First Chapter Name</label>
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="e.g. Act I: The Whispering Catacombs"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-400">Target Campaign</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {campaigns.map((c) => (
                    <option key={c.campaignId} value={c.campaignId}>
                      {c.campaignTitle} ({c.chapters.length} chapters)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-400">Target Chapter</label>
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {selectedCampaign?.chapters.map((ch) => (
                    <option key={ch.chapterId} value={ch.chapterId}>
                      {ch.chapterTitle} ({ch.scenes.length} scenes)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Scene Title */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-zinc-400">Scene Title *</label>
            <input
              type="text"
              required
              value={sceneTitle}
              onChange={(e) => setSceneTitle(e.target.value)}
              placeholder="e.g. Crypt of the Bone King"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* DM Notes */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-zinc-400">DM Notes & Tactics</label>
            <textarea
              rows={3}
              value={dmNotes}
              onChange={(e) => setDmNotes(e.target.value)}
              placeholder="Encounter tactics, trap triggers, perception DCs, read-aloud descriptions..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-950/40 disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  Saving to Firestore...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {saveMode === 'update_current' ? 'Update Active Scene' : 'Save Scene into Campaign'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
