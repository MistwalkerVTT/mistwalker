import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  Check,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  DoorOpen,
  Eye,
  EyeOff,
  Skull,
  AlertCircle,
  RefreshCw,
  BookOpen,
  MapPin,
  FolderOpen,
  Sliders,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import {
  runPdfIngestionPipeline,
  extractBattlemapPage,
  buildSceneFromParsedData,
  ParsedChapter,
  ParsedScene,
  ParsedRoom,
  ExtractedMapResult,
  IngestionPipelineStep
} from '../services/pdfIngestionService';
import { Campaign, Chapter, Scene, saveSceneToCampaign, getCampaignsList, saveCampaignDoc } from '../lib/firebase';
import { UploadedAsset, WallSegment, RoomAnnotation } from '../types';
import { Monster } from '../types/monster';

export interface CampaignPdfImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns?: Campaign[];
  activeCampaignId?: string;
  activeChapterId?: string;
  onSceneImported?: (scene: Scene, campaignId: string, chapterId: string) => void;
}

interface IngestedSceneItem {
  sceneTitle: string;
  scene: Scene;
  mapAsset: UploadedAsset;
  mapPageNumber: number;
  rooms: ParsedRoom[];
}

export const CampaignPdfImporterModal: React.FC<CampaignPdfImporterModalProps> = ({
  isOpen,
  onClose,
  campaigns: initialCampaigns = [],
  activeCampaignId,
  activeChapterId,
  onSceneImported
}) => {
  // Campaign & Chapter selection
  const [campaignsList, setCampaignsList] = useState<Campaign[]>(initialCampaigns);
  const [selectedCampId, setSelectedCampId] = useState<string>(activeCampaignId || '');
  const [selectedChapId, setSelectedChapId] = useState<string>(activeChapterId || '');
  const [newCampaignTitle, setNewCampaignTitle] = useState<string>('');
  const [newChapterTitle, setNewChapterTitle] = useState<string>('');
  const [showNewCampaignInputs, setShowNewCampaignInputs] = useState<boolean>(false);

  // Workflow states
  const [viewMode, setViewMode] = useState<'upload' | 'processing' | 'preview'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [gridSize, setGridSize] = useState<number>(50);

  // Ingestion pipeline progress
  const [currentStep, setCurrentStep] = useState<
    'parsing_text' | 'extracting_maps' | 'locating_rooms' | 'generating_walls' | 'ingesting_monsters' | 'complete'
  >('parsing_text');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extracted data for preview
  const [ingestedChapterTitle, setIngestedChapterTitle] = useState<string>('');
  const [extractedScenes, setExtractedScenes] = useState<IngestedSceneItem[]>([]);
  const [ingestedMonsters, setIngestedMonsters] = useState<Monster[]>([]);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number | null>(null);
  const [selectedMonsterIndex, setSelectedMonsterIndex] = useState<number | null>(null);
  const [rightSidebarTab, setRightSidebarTab] = useState<'rooms' | 'monsters'>('rooms');

  // Preview display toggles & viewport
  const [showWalls, setShowWalls] = useState<boolean>(true);
  const [showDoors, setShowDoors] = useState<boolean>(true);
  const [showRoomHotspots, setShowRoomHotspots] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isReExtractingPage, setIsReExtractingPage] = useState<boolean>(false);
  const [isSavingToCampaign, setIsSavingToCampaign] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Refresh campaigns on open if list is empty
  useEffect(() => {
    if (isOpen) {
      if (initialCampaigns.length > 0) {
        setCampaignsList(initialCampaigns);
        if (!selectedCampId && activeCampaignId) setSelectedCampId(activeCampaignId);
        else if (!selectedCampId && initialCampaigns[0]) {
          setSelectedCampId(initialCampaigns[0].campaignId);
          if (initialCampaigns[0].chapters[0]) setSelectedChapId(initialCampaigns[0].chapters[0].chapterId);
        }
      } else {
        getCampaignsList()
          .then((camps) => {
            setCampaignsList(camps);
            if (camps.length > 0) {
              const defaultCamp = activeCampaignId
                ? camps.find((c) => c.campaignId === activeCampaignId) || camps[0]
                : camps[0];
              setSelectedCampId(defaultCamp.campaignId);
              if (defaultCamp.chapters && defaultCamp.chapters.length > 0) {
                const defaultChap = activeChapterId
                  ? defaultCamp.chapters.find((ch) => ch.chapterId === activeChapterId) || defaultCamp.chapters[0]
                  : defaultCamp.chapters[0];
                setSelectedChapId(defaultChap.chapterId);
              }
            } else {
              setShowNewCampaignInputs(true);
            }
          })
          .catch((err) => console.warn('Could not fetch campaigns for PDF importer:', err));
      }
    }
  }, [isOpen, initialCampaigns, activeCampaignId, activeChapterId]);

  // Sync selected chapter when campaign changes
  const activeSelectedCampaign = useMemo(
    () => campaignsList.find((c) => c.campaignId === selectedCampId),
    [campaignsList, selectedCampId]
  );

  useEffect(() => {
    if (activeSelectedCampaign && activeSelectedCampaign.chapters && activeSelectedCampaign.chapters.length > 0) {
      if (!activeSelectedCampaign.chapters.some((ch) => ch.chapterId === selectedChapId)) {
        setSelectedChapId(activeSelectedCampaign.chapters[0].chapterId);
      }
    } else {
      setSelectedChapId('');
    }
  }, [activeSelectedCampaign]);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
        setErrorMsg(null);
      } else {
        setErrorMsg('Please select a valid PDF document (.pdf).');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
        setErrorMsg(null);
      } else {
        setErrorMsg('Please select a valid PDF document (.pdf).');
      }
    }
  };

  const handleStartIngestion = async () => {
    if (!selectedFile) {
      setErrorMsg('Please upload a D&D adventure PDF first.');
      return;
    }

    setViewMode('processing');
    setErrorMsg(null);
    setCurrentStep('parsing_text');
    setProgressPercent(10);
    setStatusMessage('Initializing Gemini Multimodal AI ingestion pipeline...');

    try {
      const result = await runPdfIngestionPipeline(selectedFile, {
        campaignId: selectedCampId,
        chapterId: selectedChapId,
        gridSize,
        onProgress: (status: IngestionPipelineStep) => {
          setCurrentStep(status.step);
          setStatusMessage(status.message);
          setProgressPercent(status.progressPercent);
        }
      });

      setIngestedChapterTitle(result.chapterTitle || selectedFile.name.replace(/\.[^/.]+$/, ''));
      setExtractedScenes(result.scenes);
      setIngestedMonsters(result.ingestedMonsters || []);
      setActiveSceneIndex(0);
      setSelectedRoomIndex(result.scenes[0]?.rooms.length > 0 ? 0 : null);
      if (result.ingestedMonsters && result.ingestedMonsters.length > 0) {
        setSelectedMonsterIndex(0);
      }
      setViewMode('preview');
      const monsterCount = result.ingestedMonsters?.length || 0;
      toast.success(
        `Successfully ingested ${result.scenes.length} scene(s) and auto-added ${monsterCount} monster(s) to Compendium!`
      );
    } catch (err: any) {
      console.error('PDF ingestion pipeline failed:', err);
      setErrorMsg(err.message || 'Failed to ingest adventure PDF. Please check your Gemini API key.');
      setViewMode('upload');
      toast.error('PDF Ingestion Failed', { description: err.message });
    }
  };

  const currentScene = extractedScenes[activeSceneIndex];

  // Handler for changing the battlemap page on the fly
  const handlePageChange = async (newPageNum: number) => {
    if (!selectedFile || !currentScene || newPageNum < 1 || isReExtractingPage) return;

    setIsReExtractingPage(true);
    try {
      toast.info(`Extracting tactical map from PDF page ${newPageNum}...`);
      const mapRes = await extractBattlemapPage(selectedFile, newPageNum, {
        sceneTitle: currentScene.sceneTitle,
        scale: 2.0
      });

      // Update current scene with new map
      const updatedMapAsset: UploadedAsset = {
        ...currentScene.mapAsset,
        url: mapRes.dataUrl,
        thumbnailUrl: mapRes.dataUrl,
        width: mapRes.width,
        height: mapRes.height
      };

      const updatedScene = buildSceneFromParsedData({
        sceneTitle: currentScene.sceneTitle,
        mapAsset: updatedMapAsset,
        rooms: currentScene.rooms,
        gridSize,
        campaignId: selectedCampId,
        chapterId: selectedChapId
      });

      setExtractedScenes((prev) =>
        prev.map((s, idx) =>
          idx === activeSceneIndex
            ? {
                ...s,
                scene: updatedScene,
                mapAsset: updatedMapAsset,
                mapPageNumber: newPageNum
              }
            : s
        )
      );

      toast.success(`Map page updated to page ${newPageNum}`);
    } catch (err: any) {
      toast.error('Failed to change map page', { description: err.message });
    } finally {
      setIsReExtractingPage(false);
    }
  };

  // Import into Campaign Action
  const handleImportIntoCampaign = async () => {
    if (extractedScenes.length === 0) {
      toast.error('No scenes available to import.');
      return;
    }

    setIsSavingToCampaign(true);

    try {
      let targetCampId = selectedCampId;
      let targetChapId = selectedChapId;

      // Create new campaign/chapter if user requested
      if (showNewCampaignInputs || !targetCampId || !targetChapId) {
        const campTitle = newCampaignTitle.trim() || ingestedChapterTitle || 'Imported Adventure Campaign';
        const chapTitle = newChapterTitle.trim() || 'Chapter 1: The Adventure';

        const newCamp: Campaign = {
          campaignId: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          campaignTitle: campTitle,
          description: `Auto-generated from D&D Adventure PDF: "${selectedFile?.name || 'Adventure'}"`,
          createdAt: Date.now(),
          chapters: [
            {
              chapterId: `chap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              chapterTitle: chapTitle,
              orderIndex: 0,
              scenes: []
            }
          ]
        };

        await saveCampaignDoc(newCamp);
        targetCampId = newCamp.campaignId;
        targetChapId = newCamp.chapters[0].chapterId;
        setCampaignsList((prev) => [newCamp, ...prev]);
        setSelectedCampId(targetCampId);
        setSelectedChapId(targetChapId);
      }

      // Save each scene to the chapter
      for (const item of extractedScenes) {
        await saveSceneToCampaign(targetCampId, targetChapId, item.scene);
        onSceneImported?.(item.scene, targetCampId, targetChapId);
      }

      toast.success(
        `Imported ${extractedScenes.length} scene(s) into campaign "${
          activeSelectedCampaign?.campaignTitle || newCampaignTitle || 'Campaign'
        }"!`,
        {
          description: `${extractedScenes.map((s) => s.sceneTitle).join(', ')}`
        }
      );

      onClose();
    } catch (saveErr: any) {
      console.error('Failed to save scenes to campaign:', saveErr);
      toast.error('Failed to import scenes into campaign', { description: saveErr.message });
    } finally {
      setIsSavingToCampaign(false);
    }
  };

  return (
    <div
      id="campaign-pdf-importer-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden text-zinc-100 font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/90 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-900/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono tracking-tight text-white flex items-center gap-2">
                Automated D&D Adventure PDF Ingestion
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Gemini Multimodal + Dynamic Lighting
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Extract high-resolution battlemaps, room keys, player boxed text, DM notes, and baseline walls
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title="Close Ingestion Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* VIEW 1: UPLOAD STATE */}
          {viewMode === 'upload' && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col items-center justify-center max-w-3xl mx-auto w-full space-y-6">
              {/* Campaign Destination Selector */}
              <div className="w-full bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200">
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                    <span>Target Campaign & Chapter</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewCampaignInputs(!showNewCampaignInputs)}
                    className="text-[11px] font-mono text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    {showNewCampaignInputs ? 'Select Existing Campaign' : '+ Create New Campaign'}
                  </button>
                </div>

                {!showNewCampaignInputs && campaignsList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Campaign:</label>
                      <select
                        value={selectedCampId}
                        onChange={(e) => setSelectedCampId(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                      >
                        {campaignsList.map((c) => (
                          <option key={c.campaignId} value={c.campaignId}>
                            {c.campaignTitle}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Chapter:</label>
                      <select
                        value={selectedChapId}
                        onChange={(e) => setSelectedChapId(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                        disabled={!activeSelectedCampaign || !activeSelectedCampaign.chapters.length}
                      >
                        {activeSelectedCampaign?.chapters.map((ch) => (
                          <option key={ch.chapterId} value={ch.chapterId}>
                            {ch.chapterTitle}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">New Campaign Title:</label>
                      <input
                        type="text"
                        value={newCampaignTitle}
                        onChange={(e) => setNewCampaignTitle(e.target.value)}
                        placeholder="e.g. Keys from the Golden Vault"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">New Chapter Title:</label>
                      <input
                        type="text"
                        value={newChapterTitle}
                        onChange={(e) => setNewChapterTitle(e.target.value)}
                        placeholder="e.g. Chapter 1: The Murkmire Malevolence"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* PDF Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-500/10'
                    : selectedFile
                    ? 'border-emerald-500/60 bg-emerald-500/5'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/70'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform ${
                    selectedFile
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-800/80 text-zinc-400'
                  }`}
                >
                  {selectedFile ? <FileText className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold font-mono text-emerald-300">{selectedFile.name}</p>
                    <p className="text-xs text-zinc-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI Ingestion
                    </p>
                    <p className="text-[11px] text-zinc-500 pt-2">Click or drag a different PDF to replace</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-zinc-200">
                      Drag & Drop Official D&D Adventure PDF
                    </p>
                    <p className="text-xs text-zinc-400">
                      Supports full chapters from WotC modules, DMsGuild PDFs, or homebrew adventures
                    </p>
                    <p className="text-[11px] text-blue-400 pt-2 font-mono">Click to browse your files</p>
                  </div>
                )}
              </div>

              {/* Grid Snap Setting */}
              <div className="w-full flex items-center justify-between px-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-zinc-500" />
                  <span>Dynamic Lighting Grid Snap:</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  {[50, 70, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setGridSize(size)}
                      className={`px-3 py-1 rounded-lg border text-xs cursor-pointer transition-all ${
                        gridSize === size
                          ? 'bg-blue-600 border-blue-500 text-white font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Banner */}
              {errorMsg && (
                <div className="w-full p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 flex items-center gap-3 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleStartIngestion}
                disabled={!selectedFile}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold font-mono text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ingest Adventure & Generate Lighting</span>
              </button>
            </div>
          )}

          {/* VIEW 2: PROCESSING STATE (4-Stage Stepper) */}
          {viewMode === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full space-y-8 animate-in fade-in">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold font-mono text-white">
                  Ingesting D&D Adventure Chapter
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Gemini Multimodal AI is extracting the full battlemap, room annotations, read-aloud boxed text, and dynamic lighting geometry.
                </p>
              </div>

              {/* 5-Stage Progress Stepper */}
              <div className="w-full space-y-3">
                {[
                  {
                    id: 'parsing_text',
                    label: 'Parsing Text',
                    desc: 'Gemini analyzing adventure narrative, scenes, and room keys'
                  },
                  {
                    id: 'extracting_maps',
                    label: 'Extracting Maps',
                    desc: 'pdfjs-dist rendering full-resolution tactical battlemap image'
                  },
                  {
                    id: 'locating_rooms',
                    label: 'Locating Rooms',
                    desc: 'Resolving approximate room bounds and interactive hotspot pins'
                  },
                  {
                    id: 'generating_walls',
                    label: 'Generating Walls',
                    desc: 'Synthesizing grid-snapped baseline walls and closed doors'
                  },
                  {
                    id: 'ingesting_monsters',
                    label: 'Google 5e Monsters',
                    desc: 'Searching official statblocks & token artwork, auto-saving to compendium'
                  }
                ].map((stepItem, idx) => {
                  const stepOrder = ['parsing_text', 'extracting_maps', 'locating_rooms', 'generating_walls', 'ingesting_monsters', 'complete'];
                  const currentIndex = stepOrder.indexOf(currentStep);
                  const thisIndex = stepOrder.indexOf(stepItem.id);

                  const isFinished = currentIndex > thisIndex;
                  const isActive = currentIndex === thisIndex;

                  return (
                    <div
                      key={stepItem.id}
                      className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-blue-950/40 border-blue-500/60 shadow-md shadow-blue-950/50'
                          : isFinished
                          ? 'bg-zinc-900/60 border-emerald-500/30'
                          : 'bg-zinc-900/20 border-zinc-800/60 opacity-60'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                        {isFinished ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        ) : isActive ? (
                          <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center text-blue-400">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 font-mono text-xs">
                            {idx + 1}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold font-mono ${
                              isActive ? 'text-blue-300' : isFinished ? 'text-emerald-300' : 'text-zinc-400'
                            }`}
                          >
                            {stepItem.label}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-mono text-blue-400 animate-pulse font-bold">
                              In Progress...
                            </span>
                          )}
                          {isFinished && (
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate">{stepItem.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar & Status Text */}
              <div className="w-full space-y-2">
                <div className="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span className="truncate max-w-[450px]">{statusMessage || 'Processing...'}</span>
                  <span className="text-blue-400 font-bold">{progressPercent}%</span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: INTERACTIVE PREVIEW SCREEN */}
          {viewMode === 'preview' && currentScene && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Preview Subheader Bar */}
              <div className="flex flex-wrap items-center justify-between px-6 py-2.5 bg-zinc-900/80 border-b border-zinc-800/80 gap-2 shrink-0 text-xs font-mono">
                {/* Scene selector tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold pr-1">Scene:</span>
                  {extractedScenes.map((sc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveSceneIndex(idx);
                        setSelectedRoomIndex(sc.rooms.length > 0 ? 0 : null);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeSceneIndex === idx
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-zinc-800/70 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {sc.sceneTitle}
                    </button>
                  ))}
                </div>

                {/* Battlemap Page Selector */}
                <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 rounded-xl px-2.5 py-1">
                  <span className="text-zinc-400 text-[11px]">Map PDF Page:</span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentScene.mapPageNumber - 1)}
                    disabled={currentScene.mapPageNumber <= 1 || isReExtractingPage}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30 cursor-pointer"
                    title="Previous PDF Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-white px-1">{currentScene.mapPageNumber}</span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentScene.mapPageNumber + 1)}
                    disabled={isReExtractingPage}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30 cursor-pointer"
                    title="Next PDF Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Overlays Visibility Toggles */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWalls(!showWalls)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                      showWalls
                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                        : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>Walls ({currentScene.scene.walls?.filter((w) => w.wallType !== 'door').length || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDoors(!showDoors)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                      showDoors
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500'
                    }`}
                  >
                    <DoorOpen className="w-3 h-3" />
                    <span>Doors ({currentScene.scene.walls?.filter((w) => w.wallType === 'door').length || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRoomHotspots(!showRoomHotspots)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                      showRoomHotspots
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500'
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Rooms ({currentScene.rooms.length})</span>
                  </button>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-zinc-950/80 border border-zinc-800 rounded-xl p-0.5 ml-2">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono px-1 text-zinc-400">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      title="Reset View"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content Area (Two Columns: Map Viewport + Room Briefing Inspector) */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left: Map Viewport with SVG Lighting & Hotspot Overlays */}
                <div
                  ref={mapContainerRef}
                  className="flex-1 bg-zinc-950/90 overflow-auto relative p-4 flex items-center justify-center border-r border-zinc-800/80"
                >
                  <div
                    className="relative transition-transform duration-100 shadow-2xl rounded-lg overflow-hidden border border-zinc-800"
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'top left',
                      width: currentScene.scene.mapWidth || 2048,
                      height: currentScene.scene.mapHeight || 1536
                    }}
                  >
                    {/* Rendered Battlemap Image */}
                    <img
                      src={currentScene.mapAsset.url}
                      alt={currentScene.sceneTitle}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />

                    {/* SVG Dynamic Lighting Walls & Doors & Hotspots Layer */}
                    <svg
                      viewBox={`0 0 ${currentScene.scene.mapWidth || 2048} ${
                        currentScene.scene.mapHeight || 1536
                      }`}
                      className="absolute inset-0 w-full h-full pointer-events-auto"
                    >
                      {/* Normal Walls */}
                      {showWalls &&
                        currentScene.scene.walls
                          ?.filter((w) => w.wallType !== 'door')
                          .map((wall) => (
                            <line
                              key={wall.id}
                              x1={wall.p1.x}
                              y1={wall.p1.y}
                              x2={wall.p2.x}
                              y2={wall.p2.y}
                              stroke="#3b82f6"
                              strokeWidth={4}
                              strokeLinecap="round"
                              className="drop-shadow-[0_0_6px_rgba(59,130,246,0.8)]"
                            />
                          ))}

                      {/* Doors */}
                      {showDoors &&
                        currentScene.scene.walls
                          ?.filter((w) => w.wallType === 'door')
                          .map((door) => {
                            const midX = (door.p1.x + door.p2.x) / 2;
                            const midY = (door.p1.y + door.p2.y) / 2;
                            return (
                              <g key={door.id}>
                                <line
                                  x1={door.p1.x}
                                  y1={door.p1.y}
                                  x2={door.p2.x}
                                  y2={door.p2.y}
                                  stroke="#10b981"
                                  strokeWidth={7}
                                  strokeDasharray="8 6"
                                  strokeLinecap="round"
                                  className="drop-shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                                />
                                <circle cx={midX} cy={midY} r={10} fill="#10b981" stroke="#064e3b" strokeWidth={2} />
                                <text
                                  x={midX}
                                  y={midY + 3}
                                  textAnchor="middle"
                                  fontSize="9"
                                  fill="#ffffff"
                                  fontWeight="bold"
                                  fontFamily="monospace"
                                >
                                  D
                                </text>
                              </g>
                            );
                          })}

                      {/* Room Hotspot Overlays */}
                      {showRoomHotspots &&
                        currentScene.rooms.map((room, rIdx) => {
                          const isSelected = selectedRoomIndex === rIdx;
                          const mapW = currentScene.scene.mapWidth || 2048;
                          const mapH = currentScene.scene.mapHeight || 1536;

                          const pxX = ((room.approximateNormalizedBounds?.x || 10) / 100) * mapW;
                          const pxY = ((room.approximateNormalizedBounds?.y || 10) / 100) * mapH;
                          const pxW = ((room.approximateNormalizedBounds?.width || 20) / 100) * mapW;
                          const pxH = ((room.approximateNormalizedBounds?.height || 20) / 100) * mapH;

                          const centerX = pxX + pxW / 2;
                          const centerY = pxY + pxH / 2;
                          const badgeText = room.roomNumber || `${rIdx + 1}`;

                          return (
                            <g
                              key={rIdx}
                              onClick={() => setSelectedRoomIndex(rIdx)}
                              className="cursor-pointer transition-all"
                            >
                              {/* Semi-transparent bounding zone */}
                              <rect
                                x={pxX}
                                y={pxY}
                                width={pxW}
                                height={pxH}
                                fill={isSelected ? '#f59e0b' : '#3b82f6'}
                                fillOpacity={isSelected ? 0.2 : 0.06}
                                stroke={isSelected ? '#f59e0b' : '#60a5fa'}
                                strokeWidth={isSelected ? 3 : 1.5}
                                strokeDasharray={isSelected ? '6 4' : '4 4'}
                                rx={8}
                              />

                              {/* Center Pin Badge */}
                              <circle
                                cx={centerX}
                                cy={centerY}
                                r={18}
                                fill={isSelected ? '#f59e0b' : '#18181b'}
                                stroke={isSelected ? '#fbbf24' : '#f59e0b'}
                                strokeWidth={2.5}
                                className={isSelected ? 'filter drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]' : ''}
                              />
                              <text
                                x={centerX}
                                y={centerY + 5}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="bold"
                                fontFamily="monospace"
                                fill={isSelected ? '#09090b' : '#fef3c7'}
                              >
                                {badgeText}
                              </text>
                            </g>
                          );
                        })}
                    </svg>
                  </div>
                </div>

                {/* Right: Room Briefing & Monsters Inspector */}
                <div className="w-96 bg-zinc-900/60 flex flex-col overflow-hidden border-l border-zinc-800/80">
                  {/* Tab Selector Header */}
                  <div className="flex border-b border-zinc-800 bg-zinc-950/80 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRightSidebarTab('rooms')}
                      className={`flex-1 py-2.5 px-3 text-xs font-mono font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                        rightSidebarTab === 'rooms'
                          ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                          : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Rooms ({currentScene.rooms.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightSidebarTab('monsters')}
                      className={`flex-1 py-2.5 px-3 text-xs font-mono font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                        rightSidebarTab === 'monsters'
                          ? 'border-red-500 text-red-400 bg-red-500/5'
                          : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                      }`}
                    >
                      <Skull className="w-3.5 h-3.5" />
                      <span>Monsters ({ingestedMonsters.length})</span>
                    </button>
                  </div>

                  {rightSidebarTab === 'rooms' ? (
                    <>

                  {/* Room Quick Pill Selector */}
                  <div className="p-2 border-b border-zinc-800/60 bg-zinc-950/40 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
                    {currentScene.rooms.map((room, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedRoomIndex(idx)}
                        className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                          selectedRoomIndex === idx
                            ? 'bg-amber-500 text-zinc-950 shadow-sm'
                            : 'bg-zinc-800/70 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {room.roomNumber || `${idx + 1}`}
                      </button>
                    ))}
                  </div>

                  {/* Active Room Detail Panel */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {selectedRoomIndex !== null && currentScene.rooms[selectedRoomIndex] ? (
                      (() => {
                        const room = currentScene.rooms[selectedRoomIndex];
                        return (
                          <div className="space-y-4 animate-in fade-in">
                            {/* Room Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  {room.roomNumber ? `Area ${room.roomNumber}` : 'Area'}
                                </span>
                                <h4 className="text-sm font-bold text-white mt-1">{room.roomName || 'Unnamed Area'}</h4>
                              </div>
                            </div>

                            {/* Verbatim Read-Aloud Boxed Text */}
                            {room.boxedText && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5" />
                                  <span>Player Read-Aloud Boxed Text</span>
                                </span>
                                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200/90 text-xs italic font-serif leading-relaxed shadow-inner">
                                  &ldquo;{room.boxedText}&rdquo;
                                </div>
                              </div>
                            )}

                            {/* DM Tactical Notes & Secrets */}
                            {room.dmNotes && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                                  <span>DM Notes, Secrets & Traps</span>
                                </span>
                                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                                  {room.dmNotes}
                                </div>
                              </div>
                            )}

                            {/* Monsters & Foes */}
                            {room.monsters && room.monsters.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-mono font-bold uppercase text-red-400 flex items-center gap-1.5">
                                  <Skull className="w-3.5 h-3.5" />
                                  <span>Encounters / Creatures</span>
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {room.monsters.map((m, mIdx) => (
                                    <span
                                      key={mIdx}
                                      className="px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono font-bold"
                                    >
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Map Geometry Coordinates */}
                            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850 text-[10px] font-mono text-zinc-500 space-y-0.5">
                              <div>Normalized Bounds:</div>
                              <div className="text-zinc-400">
                                X: {Math.round(room.approximateNormalizedBounds?.x || 0)}% • Y:{' '}
                                {Math.round(room.approximateNormalizedBounds?.y || 0)}% (W:{' '}
                                {Math.round(room.approximateNormalizedBounds?.width || 0)}%, H:{' '}
                                {Math.round(room.approximateNormalizedBounds?.height || 0)}%)
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="p-8 text-center text-zinc-500 text-xs">
                        Select a room pin on the map to inspect boxed text and DM notes.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Monsters Quick Pill Selector */}
                  <div className="p-2 border-b border-zinc-800/60 bg-zinc-950/40 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono shrink-0">
                    {ingestedMonsters.map((mon, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedMonsterIndex(idx)}
                        className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer truncate max-w-[140px] ${
                          selectedMonsterIndex === idx
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-zinc-800/70 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {mon.name}
                      </button>
                    ))}
                  </div>

                  {/* Active Monster Detail Panel */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {selectedMonsterIndex !== null && ingestedMonsters[selectedMonsterIndex] ? (
                      (() => {
                        const mon = ingestedMonsters[selectedMonsterIndex];
                        return (
                          <div className="space-y-4 animate-in fade-in">
                            {/* Monster Portrait & Header */}
                            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md">
                              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-red-500/70 shadow-lg shadow-red-950/60 shrink-0 bg-zinc-900">
                                <img
                                  src={mon.avatarUrl || '/uploads/file-1792077381663-439615846.png'}
                                  alt={mon.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/uploads/file-1792077381663-439615846.png';
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                                    CR {mon.challenge || '1'}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    {mon.size} {mon.type}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-white truncate mt-1">{mon.name}</h4>
                                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono mt-0.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Added to Monster Compendium</span>
                                </div>
                              </div>
                            </div>

                            {/* Vital Combat Stats */}
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                              <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                                <span className="text-[10px] text-zinc-500 uppercase block">Armor Class</span>
                                <span className="text-white font-bold text-sm">
                                  {mon.ac} {mon.acNotes ? <span className="text-[10px] text-zinc-400 font-normal">{mon.acNotes}</span> : null}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                                <span className="text-[10px] text-zinc-500 uppercase block">Hit Points</span>
                                <span className="text-red-400 font-bold text-sm">
                                  {mon.hp} {mon.hpFormula ? <span className="text-[10px] text-zinc-400 font-normal">{mon.hpFormula}</span> : null}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                                <span className="text-[10px] text-zinc-500 uppercase block">Speed</span>
                                <span className="text-zinc-200 font-bold text-xs">{mon.speed || '30 ft.'}</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                                <span className="text-[10px] text-zinc-500 uppercase block">Initiative</span>
                                <span className="text-amber-400 font-bold text-xs">
                                  {mon.initiativeBonus >= 0 ? `+${mon.initiativeBonus}` : mon.initiativeBonus}
                                </span>
                              </div>
                            </div>

                            {/* Ability Scores Table */}
                            <div className="grid grid-cols-6 gap-1 p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center font-mono">
                              {[
                                { label: 'STR', val: mon.str },
                                { label: 'DEX', val: mon.dex },
                                { label: 'CON', val: mon.con },
                                { label: 'INT', val: mon.int },
                                { label: 'WIS', val: mon.wis },
                                { label: 'CHA', val: mon.cha }
                              ].map((ab) => (
                                <div key={ab.label} className="p-1">
                                  <div className="text-[9px] text-zinc-500 uppercase">{ab.label}</div>
                                  <div className="text-xs font-bold text-zinc-200">{ab.val || 10}</div>
                                </div>
                              ))}
                            </div>

                            {/* Senses & Languages */}
                            {(mon.senses || mon.languages) && (
                              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] font-mono space-y-1">
                                {mon.senses && <div><span className="text-zinc-500">Senses:</span> <span className="text-zinc-300">{mon.senses}</span></div>}
                                {mon.languages && <div><span className="text-zinc-500">Languages:</span> <span className="text-zinc-300">{mon.languages}</span></div>}
                              </div>
                            )}

                            {/* Traits */}
                            {Array.isArray(mon.traits) && mon.traits.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Special Traits</span>
                                </span>
                                <div className="space-y-1.5">
                                  {mon.traits.map((tr, tIdx) => (
                                    <div key={tIdx} className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                                      <span className="font-bold text-amber-200">{tr.name}. </span>
                                      <span className="text-zinc-300 leading-relaxed">{tr.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            {Array.isArray(mon.actions) && mon.actions.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-mono font-bold uppercase text-red-400 flex items-center gap-1.5">
                                  <Skull className="w-3.5 h-3.5" />
                                  <span>Actions</span>
                                </span>
                                <div className="space-y-1.5">
                                  {mon.actions.map((act, aIdx) => (
                                    <div key={aIdx} className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                                      <span className="font-bold text-red-300">{act.name}. </span>
                                      <span className="text-zinc-300 leading-relaxed">{act.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="p-8 text-center text-zinc-500 text-xs">
                        {ingestedMonsters.length > 0
                          ? 'Select a monster from the list above to view full 5e stats and token artwork.'
                          : 'No specific monsters detected in this PDF chapter.'}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Actions Footer */}
          <div className="px-6 py-3.5 bg-zinc-900/90 border-t border-zinc-800/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
              <span className="text-zinc-200 font-bold">Import Summary:</span>
              <span>
                {extractedScenes.length} Scene(s) •{' '}
                {extractedScenes.reduce((acc, s) => acc + s.rooms.length, 0)} Rooms •{' '}
                {extractedScenes.reduce((acc, s) => acc + (s.scene.walls?.length || 0), 0)} Walls & Doors
                {ingestedMonsters.length > 0 && ` • ${ingestedMonsters.length} Compendium Monster(s)`}
              </span>
            </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('upload')}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-medium transition-colors cursor-pointer"
                  >
                    Re-Analyze / Upload New
                  </button>

                  <button
                    type="button"
                    onClick={handleImportIntoCampaign}
                    disabled={isSavingToCampaign}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold font-mono text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-950/50 active:scale-95 cursor-pointer"
                  >
                    {isSavingToCampaign ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Scenes to Campaign...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>Import into Campaign</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
