import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Save,
  Play,
  Upload,
  Search,
  ChevronRight,
  ChevronDown,
  X,
  MapPin,
  Users,
  Shield,
  Heart,
  CloudUpload,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  BookOpen,
  Eye,
  Layers,
  ArrowRight,
  Image as ImageIcon,
  AlertTriangle,
  Video,
  Share2,
  GripVertical
} from 'lucide-react';
import {
  Campaign,
  Chapter,
  Scene,
  SceneToken,
  getCampaignsList,
  saveCampaignDoc,
  deleteCampaignDoc,
  uploadCampaignAsset,
  uploadAndRegisterAsset,
  deleteUploadedAsset,
  publishActiveSession
} from '../lib/firebase';
import { toast } from 'sonner';
import { isVideoAsset, saveLocalAsset } from '../lib/storageCache';
import { SceneTokenPlacementCanvas } from './SceneTokenPlacementCanvas';
import { UploadedAsset, WallSegment, VisionConfig, RoomAnnotation, ChapterPdfDigest } from '../types';
import { PRESET_BATTLEMAPS, PresetBattlemap } from '../data/presetBattlemaps';
import { digestChapterPdf } from '../services/aiService';
import { CampaignPdfImporterModal } from './CampaignPdfImporterModal';
import { DEMO_GV_CAMPAIGN, DEMO_GV_CHAPTER, DEMO_GV_SCENE, DEMO_GV_ROOM_ZONES, DEMO_GV_TOKENS, DEMO_GV_PDF_DIGEST } from '../data/demoCampaignGv';

interface CampaignBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTokens: any[];
  currentMapUrl: string;
  currentGridSize: number;
  currentGridOpacity: number;
  currentIsFogVisible: boolean;
  currentWalls?: WallSegment[];
  currentVisionConfig?: VisionConfig;
  currentRoomAnnotations?: RoomAnnotation[];
  onLoadScene: (scene: Scene, campaignId: string, chapterId: string, targetView?: 'DM1' | 'DM2' | 'DM3') => void;
  activeSceneInfo: { campaignId: string; chapterId: string; sceneId: string } | null;
  savedMaps?: UploadedAsset[];
  onOpenDndChatbot?: () => void;
}

export const CampaignBuilderModal: React.FC<CampaignBuilderModalProps> = ({
  isOpen,
  onClose,
  currentTokens,
  currentMapUrl,
  currentGridSize,
  currentGridOpacity,
  currentIsFogVisible,
  currentWalls = [],
  currentVisionConfig,
  currentRoomAnnotations = [],
  onLoadScene,
  activeSceneInfo,
  savedMaps = [],
  onOpenDndChatbot
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Selection
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Chapter PDF Digest states
  const [isDigestingPdf, setIsDigestingPdf] = useState<boolean>(false);
  const [digestProgressText, setDigestProgressText] = useState<string>('');
  const [roomFilterQuery, setRoomFilterQuery] = useState<string>('');
  const [roomFilterTab, setRoomFilterTab] = useState<'all' | 'unplaced' | 'placed'>('all');
  const [isPdfImporterOpen, setIsPdfImporterOpen] = useState<boolean>(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Expanded folders in tree view
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // Drag and Drop state for moving scenes between chapter folders
  const [draggedSceneInfo, setDraggedSceneInfo] = useState<{
    sceneId: string;
    sceneTitle: string;
    sourceChapterId: string;
    sourceCampaignId: string;
  } | null>(null);
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);
  const [dragDropPosition, setDragDropPosition] = useState<'before' | 'after' | null>(null);
  const hoverExpandTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearHoverExpandTimer = () => {
    if (hoverExpandTimerRef.current) {
      clearTimeout(hoverExpandTimerRef.current);
      hoverExpandTimerRef.current = null;
    }
  };

  // Editing state
  const [isEditingScene, setIsEditingScene] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedMapUrl, setEditedMapUrl] = useState<string>('');
  const [editedDmNotes, setEditedDmNotes] = useState<string>('');
  const [isUploadingMap, setIsUploadingMap] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [showSavedMapsPicker, setShowSavedMapsPicker] = useState<boolean>(false);
  const [internalSavedMaps, setInternalSavedMaps] = useState<UploadedAsset[]>(savedMaps);
  const [isDraggingOverMap, setIsDraggingOverMap] = useState<boolean>(false);

  useEffect(() => {
    if (savedMaps && savedMaps.length > 0) {
      setInternalSavedMaps(prev => {
        const merged = [...savedMaps];
        for (const p of prev) {
          if (!merged.some(m => m.assetId === p.assetId)) {
            merged.push(p);
          }
        }
        return merged;
      });
    }
  }, [savedMaps]);

  // Interactive Scene Tokens state
  const [editedSceneTokens, setEditedSceneTokens] = useState<SceneToken[]>([]);
  const [showPresetMapsModal, setShowPresetMapsModal] = useState<boolean>(false);

  // Modal Dialogs for creation
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState<boolean>(false);
  const [newCampaignTitle, setNewCampaignTitle] = useState<string>('');
  const [newCampaignDesc, setNewCampaignDesc] = useState<string>('');

  const [showAddChapterModal, setShowAddChapterModal] = useState<boolean>(false);
  const [newChapterTitle, setNewChapterTitle] = useState<string>('');

  const [showAddSceneModal, setShowAddSceneModal] = useState<boolean>(false);
  const [newSceneTitle, setNewSceneTitle] = useState<string>('');
  const [insertAfterSceneId, setInsertAfterSceneId] = useState<string | null>(null);

  // Deletion modals state for scenes, chapters, and campaigns
  const [sceneToDelete, setSceneToDelete] = useState<{
    sceneId: string;
    sceneTitle: string;
    campaignId: string;
    chapterId: string;
  } | null>(null);
  const [isDeletingScene, setIsDeletingScene] = useState<boolean>(false);

  const [chapterToDelete, setChapterToDelete] = useState<{
    chapterId: string;
    chapterTitle: string;
    campaignId: string;
  } | null>(null);
  const [isDeletingChapter, setIsDeletingChapter] = useState<boolean>(false);

  const [campaignToDelete, setCampaignToDelete] = useState<{
    campaignId: string;
    campaignTitle: string;
  } | null>(null);
  const [isDeletingCampaign, setIsDeletingCampaign] = useState<boolean>(false);

  const mapUploadInputRef = useRef<HTMLInputElement>(null);
  const tokenAvatarInputRef = useRef<HTMLInputElement>(null);

  // Load campaigns from Firestore
  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const list = await getCampaignsList();
      if (list.length === 0) {
        // Seed default starter campaign "Vecna: Eve of Ruin"
        const starterCampaign: Campaign = {
          campaignId: 'vecna-eve-of-ruin',
          campaignTitle: 'Vecna: Eve of Ruin',
          description: 'A multiverse-spanning adventure against the Whispered One.',
          createdAt: Date.now(),
          chapters: [
            {
              chapterId: 'chap-1-catacombs',
              chapterTitle: 'Chapter 1: Catacombs of the Undying',
              orderIndex: 0,
              scenes: [
                {
                  sceneId: 'scene-t4-boss-room',
                  sceneTitle: 'Area T4 - Boss Room (Sanctum of Bones)',
                  mapUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
                  dmNotes: 'The ancient stone sarcophagus stands in the center. Four cultist statues line the walls. Traps trigger if stepping on the central rune without speaking the passphrase "Morthak".',
                  tokens: [
                    {
                      id: 'tok-vecna-cultist-1',
                      name: 'Cult Fanatic',
                      avatarUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=150&q=80',
                      x: 420,
                      y: 350,
                      hp: 33,
                      ac: 13,
                      size: 1
                    },
                    {
                      id: 'tok-bone-golem',
                      name: 'Bone Golem (Large)',
                      avatarUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=150&q=80',
                      x: 640,
                      y: 320,
                      hp: 133,
                      ac: 16,
                      size: 2
                    }
                  ],
                  gridSize: 50,
                  gridOpacity: 0.25,
                  isFogVisible: true
                },
                {
                  sceneId: 'scene-t1-entrance',
                  sceneTitle: 'Area T1 - Flooded Entrance',
                  mapUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80',
                  dmNotes: 'Knee-deep brackish water makes this area difficult terrain. Skeletons lurk beneath the surface.',
                  tokens: [
                    {
                      id: 'tok-skeleton-1',
                      name: 'Skeleton Archer',
                      avatarUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=150&q=80',
                      x: 300,
                      y: 280,
                      hp: 13,
                      ac: 13,
                      size: 1
                    }
                  ],
                  gridSize: 50,
                  gridOpacity: 0.2,
                  isFogVisible: true
                }
              ]
            }
          ]
        };

        await saveCampaignDoc(starterCampaign);
        setCampaigns([starterCampaign]);
        setSelectedCampaignId(starterCampaign.campaignId);
        setSelectedChapterId(starterCampaign.chapters[0].chapterId);
        setSelectedSceneId(starterCampaign.chapters[0].scenes[0].sceneId);
        setExpandedCampaigns({});
        setExpandedChapters({});
      } else {
        const enriched = list.some(c => c.campaignId === DEMO_GV_CAMPAIGN.campaignId)
          ? list.map(c => {
              if (c.campaignId !== DEMO_GV_CAMPAIGN.campaignId) return c;
              return {
                ...c,
                chapters: c.chapters.map(ch => {
                  if (ch.chapterId !== DEMO_GV_CHAPTER.chapterId) return ch;
                  return {
                    ...ch,
                    pdfDigest: DEMO_GV_PDF_DIGEST,
                    scenes: ch.scenes.map(sc => {
                      if (sc.sceneId !== DEMO_GV_SCENE.sceneId) return sc;
                      return {
                        ...sc,
                        roomAnnotations: DEMO_GV_ROOM_ZONES,
                        tokens: DEMO_GV_TOKENS
                      };
                    })
                  };
                })
              };
            })
          : [DEMO_GV_CAMPAIGN, ...list];
        setCampaigns(enriched);
        if (!selectedCampaignId && enriched.length > 0) {
          setSelectedCampaignId(enriched[0].campaignId);
          setExpandedCampaigns({});
          if (list[0].chapters.length > 0) {
            setSelectedChapterId(list[0].chapters[0].chapterId);
            setExpandedChapters({});
            if (list[0].chapters[0].scenes.length > 0) {
              setSelectedSceneId(list[0].chapters[0].scenes[0].sceneId);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setExpandedCampaigns({});
      setExpandedChapters({});
      loadCampaigns();
    }
  }, [isOpen]);

  // Currently selected entities
  const selectedCampaign = useMemo(() => {
    return campaigns.find(c => c.campaignId === selectedCampaignId) || null;
  }, [campaigns, selectedCampaignId]);

  const selectedChapter = useMemo(() => {
    if (!selectedCampaign) return null;
    return selectedCampaign.chapters.find(ch => ch.chapterId === selectedChapterId) || null;
  }, [selectedCampaign, selectedChapterId]);

  const selectedScene = useMemo(() => {
    if (!selectedChapter) return null;
    return selectedChapter.scenes.find(sc => sc.sceneId === selectedSceneId) || null;
  }, [selectedChapter, selectedSceneId]);

  // Sync form inputs when active scene selection changes
  useEffect(() => {
    if (selectedScene) {
      setEditedTitle(selectedScene.sceneTitle);
      setEditedMapUrl(selectedScene.mapUrl);
      setEditedDmNotes(selectedScene.dmNotes || '');
      setEditedSceneTokens(selectedScene.tokens || []);
    }
  }, [selectedScene]);

  // Toggle tree expansion
  const toggleCampaignExpand = (id: string) => {
    setExpandedCampaigns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleChapterExpand = (id: string) => {
    setExpandedChapters(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered campaigns & scenes based on search query
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const q = searchQuery.toLowerCase();
    return campaigns.filter(c => {
      const matchCamp = c.campaignTitle.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      const matchChap = c.chapters.some(ch =>
        ch.chapterTitle.toLowerCase().includes(q) ||
        ch.scenes.some(sc => sc.sceneTitle.toLowerCase().includes(q) || sc.dmNotes.toLowerCase().includes(q))
      );
      return matchCamp || matchChap;
    });
  }, [campaigns, searchQuery]);

  // 1. Create New Campaign
  const handleCreateCampaign = async () => {
    if (!newCampaignTitle.trim()) return;
    const newCamp: Campaign = {
      campaignId: 'camp-' + Date.now().toString(36),
      campaignTitle: newCampaignTitle.trim(),
      description: newCampaignDesc.trim() || 'Custom adventure campaign',
      createdAt: Date.now(),
      chapters: []
    };

    setIsSaving(true);
    try {
      await saveCampaignDoc(newCamp);
      setCampaigns(prev => [newCamp, ...prev]);
      setSelectedCampaignId(newCamp.campaignId);
      setExpandedCampaigns(prev => ({ ...prev, [newCamp.campaignId]: true }));
      setShowCreateCampaignModal(false);
      setNewCampaignTitle('');
      setNewCampaignDesc('');
    } catch (e) {
      console.error('Error creating campaign:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Add Chapter to Selected Campaign
  const handleAddChapter = async () => {
    if (!selectedCampaign || !newChapterTitle.trim()) return;
    const newChap: Chapter = {
      chapterId: 'chap-' + Date.now().toString(36),
      chapterTitle: newChapterTitle.trim(),
      orderIndex: selectedCampaign.chapters.length,
      scenes: []
    };

    const updatedCamp: Campaign = {
      ...selectedCampaign,
      chapters: [...selectedCampaign.chapters, newChap],
      updatedAt: Date.now()
    };

    setIsSaving(true);
    try {
      await saveCampaignDoc(updatedCamp);
      setCampaigns(prev => prev.map(c => c.campaignId === updatedCamp.campaignId ? updatedCamp : c));
      setSelectedChapterId(newChap.chapterId);
      setExpandedChapters(prev => ({ ...prev, [newChap.chapterId]: true }));
      setShowAddChapterModal(false);
      setNewChapterTitle('');
    } catch (e) {
      console.error('Error adding chapter:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Add Scene to Selected Chapter (with option to insert underneath a specific scene)
  const handleAddScene = async () => {
    if (!selectedCampaign || !selectedChapter || !newSceneTitle.trim()) return;
    const newScene: Scene = {
      sceneId: 'scene-' + Date.now().toString(36),
      sceneTitle: newSceneTitle.trim(),
      mapUrl: (currentMapUrl && !currentMapUrl.startsWith('blob:')) ? currentMapUrl : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
      dmNotes: '',
      tokens: [],
      gridSize: currentGridSize || 50,
      gridOpacity: currentGridOpacity ?? 0.25,
      isFogVisible: currentIsFogVisible ?? true
    };

    const updatedChapters = selectedCampaign.chapters.map(ch => {
      if (ch.chapterId === selectedChapter.chapterId) {
        if (insertAfterSceneId) {
          const targetIndex = ch.scenes.findIndex(sc => sc.sceneId === insertAfterSceneId);
          if (targetIndex !== -1) {
            const newScenes = [...ch.scenes];
            newScenes.splice(targetIndex + 1, 0, newScene);
            return {
              ...ch,
              scenes: newScenes
            };
          }
        }
        return {
          ...ch,
          scenes: [...ch.scenes, newScene]
        };
      }
      return ch;
    });

    const updatedCamp: Campaign = {
      ...selectedCampaign,
      chapters: updatedChapters,
      updatedAt: Date.now()
    };

    setIsSaving(true);
    try {
      await saveCampaignDoc(updatedCamp);
      setCampaigns(prev => prev.map(c => c.campaignId === updatedCamp.campaignId ? updatedCamp : c));
      setSelectedSceneId(newScene.sceneId);
      setExpandedChapters(prev => ({ ...prev, [selectedChapter.chapterId]: true }));
      setShowAddSceneModal(false);
      setNewSceneTitle('');
      setInsertAfterSceneId(null);
    } catch (e) {
      console.error('Error adding scene:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Drag and Drop helpers for moving scenes between chapters
  const parseDragData = (e: React.DragEvent) => {
    try {
      const raw = e.dataTransfer.getData('application/x-mistwalker-scene');
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore parse error
    }
    return null;
  };

  const handleChapterDragOver = (e: React.DragEvent, chapId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverChapterId !== chapId) {
      setDragOverChapterId(chapId);
    }
    // Spring-loaded folder: auto-expand if hovering for 600ms
    if (!expandedChapters[chapId] && !hoverExpandTimerRef.current) {
      hoverExpandTimerRef.current = setTimeout(() => {
        setExpandedChapters(prev => ({ ...prev, [chapId]: true }));
        hoverExpandTimerRef.current = null;
      }, 600);
    }
  };

  const handleChapterDragLeave = (e: React.DragEvent, chapId: string) => {
    e.stopPropagation();
    clearHoverExpandTimer();
    if (dragOverChapterId === chapId) {
      setDragOverChapterId(null);
    }
  };

  const handleMoveSceneToChapter = async (
    dragInfo: { sceneId: string; sourceChapterId: string; sourceCampaignId: string } | null,
    targetChapterId: string,
    targetCampaignId: string,
    targetSceneId?: string,
    insertPosition?: 'before' | 'after'
  ) => {
    clearHoverExpandTimer();
    setDragOverChapterId(null);
    setDragOverSceneId(null);
    setDragDropPosition(null);

    if (!dragInfo) return;
    const { sceneId, sourceChapterId, sourceCampaignId } = dragInfo;

    // If dropped in the exact same spot in the same chapter, do nothing
    if (sourceChapterId === targetChapterId && (!targetSceneId || targetSceneId === sceneId)) {
      return;
    }

    // 1. Locate source campaign
    const sourceCamp = campaigns.find(c => c.campaignId === sourceCampaignId);
    if (!sourceCamp) {
      toast.error('Source campaign not found');
      return;
    }

    // 2. Locate source chapter
    const sourceChap = sourceCamp.chapters.find(ch => ch.chapterId === sourceChapterId);
    if (!sourceChap) {
      toast.error('Source chapter not found');
      return;
    }

    // 3. Locate scene to move
    const sceneToMove = sourceChap.scenes.find(s => s.sceneId === sceneId);
    if (!sceneToMove) {
      toast.error('Scene not found in source chapter');
      return;
    }

    // CRITICAL: Ensure scene's mapUrl is preserved verbatim and never replaced with a blob or canvas map
    if (sceneToMove.mapUrl && sceneToMove.mapUrl.startsWith('blob:')) {
      console.warn('[DragDrop] Moved scene has a blob URL, preserving without blob');
    }

    // Clone the scene object with all its exact battlemap, token, and room data intact
    const preservedScene: Scene = {
      ...sceneToMove,
      mapUrl: sceneToMove.mapUrl || '',
      mapThumbnailUrl: sceneToMove.mapThumbnailUrl,
      mapWidth: sceneToMove.mapWidth,
      mapHeight: sceneToMove.mapHeight,
      tokens: sceneToMove.tokens || [],
      walls: sceneToMove.walls || [],
      roomAnnotations: sceneToMove.roomAnnotations || []
    };

    // 4. Handle same campaign vs cross campaign
    if (sourceCampaignId === targetCampaignId) {
      const updatedChapters = sourceCamp.chapters.map(ch => {
        // If this is the source chapter and not target, remove the scene
        if (ch.chapterId === sourceChapterId && sourceChapterId !== targetChapterId) {
          return {
            ...ch,
            scenes: ch.scenes.filter(s => s.sceneId !== sceneId)
          };
        }
        // If this is the target chapter and not source, add the scene
        if (ch.chapterId === targetChapterId && sourceChapterId !== targetChapterId) {
          const newScenes = [...ch.scenes];
          if (targetSceneId) {
            const idx = newScenes.findIndex(s => s.sceneId === targetSceneId);
            if (idx !== -1) {
              newScenes.splice(insertPosition === 'before' ? idx : idx + 1, 0, preservedScene);
            } else {
              newScenes.push(preservedScene);
            }
          } else {
            newScenes.push(preservedScene);
          }
          return {
            ...ch,
            scenes: newScenes
          };
        }
        // If reordering within the same chapter
        if (ch.chapterId === targetChapterId && sourceChapterId === targetChapterId) {
          const filtered = ch.scenes.filter(s => s.sceneId !== sceneId);
          if (targetSceneId) {
            const idx = filtered.findIndex(s => s.sceneId === targetSceneId);
            if (idx !== -1) {
              filtered.splice(insertPosition === 'before' ? idx : idx + 1, 0, preservedScene);
            } else {
              filtered.push(preservedScene);
            }
          } else {
            filtered.push(preservedScene);
          }
          return {
            ...ch,
            scenes: filtered
          };
        }
        return ch;
      });

      const updatedCamp: Campaign = {
        ...sourceCamp,
        chapters: updatedChapters,
        updatedAt: Date.now()
      };

      // Optimistically update state
      setCampaigns(prev => prev.map(c => c.campaignId === updatedCamp.campaignId ? updatedCamp : c));
      setExpandedChapters(prev => ({ ...prev, [targetChapterId]: true }));
      if (selectedSceneId === sceneId) {
        setSelectedChapterId(targetChapterId);
      }

      setIsSaving(true);
      try {
        await saveCampaignDoc(updatedCamp);
        const targetChapTitle = sourceCamp.chapters.find(ch => ch.chapterId === targetChapterId)?.chapterTitle || 'Chapter';
        toast.success(`Moved "${preservedScene.sceneTitle}" into "${targetChapTitle}"`);

        // If the moved scene is currently active on the VTT canvas, keep activeSession synced with new chapter
        if (activeSceneInfo?.sceneId === preservedScene.sceneId) {
          await publishActiveSession({
            sessionId: 'current',
            campaignId: sourceCamp.campaignId,
            chapterId: targetChapterId,
            sceneId: preservedScene.sceneId,
            sceneTitle: preservedScene.sceneTitle,
            mapUrl: preservedScene.mapUrl,
            dmNotes: preservedScene.dmNotes || '',
            tokens: preservedScene.tokens || [],
            gridSize: preservedScene.gridSize || 50,
            gridOpacity: preservedScene.gridOpacity ?? 0.25,
            isFogVisible: preservedScene.isFogVisible ?? true,
            walls: preservedScene.walls,
            visionConfig: preservedScene.visionConfig,
            roomAnnotations: preservedScene.roomAnnotations,
            updatedAt: Date.now()
          });
        }
      } catch (err) {
        console.error('Error saving campaign after moving scene:', err);
        toast.error('Failed to save scene movement to cloud');
        await loadCampaigns();
      } finally {
        setIsSaving(false);
      }
    } else {
      // Cross-campaign move
      const targetCamp = campaigns.find(c => c.campaignId === targetCampaignId);
      if (!targetCamp) return;

      const updatedSourceChapters = sourceCamp.chapters.map(ch => {
        if (ch.chapterId === sourceChapterId) {
          return { ...ch, scenes: ch.scenes.filter(s => s.sceneId !== sceneId) };
        }
        return ch;
      });

      const updatedTargetChapters = targetCamp.chapters.map(ch => {
        if (ch.chapterId === targetChapterId) {
          const newScenes = [...ch.scenes];
          if (targetSceneId) {
            const idx = newScenes.findIndex(s => s.sceneId === targetSceneId);
            if (idx !== -1) {
              newScenes.splice(insertPosition === 'before' ? idx : idx + 1, 0, preservedScene);
            } else {
              newScenes.push(preservedScene);
            }
          } else {
            newScenes.push(preservedScene);
          }
          return { ...ch, scenes: newScenes };
        }
        return ch;
      });

      const updatedSourceCamp = { ...sourceCamp, chapters: updatedSourceChapters, updatedAt: Date.now() };
      const updatedTargetCamp = { ...targetCamp, chapters: updatedTargetChapters, updatedAt: Date.now() };

      setCampaigns(prev => prev.map(c => {
        if (c.campaignId === updatedSourceCamp.campaignId) return updatedSourceCamp;
        if (c.campaignId === updatedTargetCamp.campaignId) return updatedTargetCamp;
        return c;
      }));

      setExpandedCampaigns(prev => ({ ...prev, [targetCampaignId]: true }));
      setExpandedChapters(prev => ({ ...prev, [targetChapterId]: true }));
      if (selectedSceneId === sceneId) {
        setSelectedCampaignId(targetCampaignId);
        setSelectedChapterId(targetChapterId);
      }

      setIsSaving(true);
      try {
        await Promise.all([
          saveCampaignDoc(updatedSourceCamp),
          saveCampaignDoc(updatedTargetCamp)
        ]);
        const targetChapTitle = targetCamp.chapters.find(ch => ch.chapterId === targetChapterId)?.chapterTitle || 'Chapter';
        toast.success(`Moved "${preservedScene.sceneTitle}" into "${targetChapTitle}"`);

        if (activeSceneInfo?.sceneId === preservedScene.sceneId) {
          await publishActiveSession({
            sessionId: 'current',
            campaignId: targetCampaignId,
            chapterId: targetChapterId,
            sceneId: preservedScene.sceneId,
            sceneTitle: preservedScene.sceneTitle,
            mapUrl: preservedScene.mapUrl,
            dmNotes: preservedScene.dmNotes || '',
            tokens: preservedScene.tokens || [],
            gridSize: preservedScene.gridSize || 50,
            gridOpacity: preservedScene.gridOpacity ?? 0.25,
            isFogVisible: preservedScene.isFogVisible ?? true,
            walls: preservedScene.walls,
            visionConfig: preservedScene.visionConfig,
            roomAnnotations: preservedScene.roomAnnotations,
            updatedAt: Date.now()
          });
        }
      } catch (err) {
        console.error('Error saving cross-campaign scene move:', err);
        toast.error('Failed to save scene movement to cloud');
        await loadCampaigns();
      } finally {
        setIsSaving(false);
      }
    }
  };

  // 4. Save Scene Changes back to Firestore
  const handleSaveSceneChanges = async (useCanvasTokens: boolean = false) => {
    if (!selectedCampaign || !selectedChapter || !selectedScene) return;
    setIsSaving(true);

    const tokensToSave: SceneToken[] = useCanvasTokens
      ? currentTokens.map(t => {
          const tok: SceneToken = {
            id: t.id,
            name: t.name || 'Token',
            avatarUrl: t.url || '',
            x: Math.round(t.x || 0),
            y: Math.round(t.y || 0),
            size: t.size ?? 1
          };
          if (typeof t.hp === 'number' && !isNaN(t.hp)) tok.hp = t.hp;
          if (typeof t.ac === 'number' && !isNaN(t.ac)) tok.ac = t.ac;
          if (typeof t.isCondition === 'boolean') tok.isCondition = t.isCondition;
          return tok;
        })
      : editedSceneTokens;

    const matchedMap = internalSavedMaps.find(m => m.url === editedMapUrl);
    const rawMapUrl = editedMapUrl.trim() || selectedScene.mapUrl;
    // CRITICAL: Never allow a blob: URL to be saved as the mapUrl
    const safeMapUrl = rawMapUrl.startsWith('blob:') ? selectedScene.mapUrl : rawMapUrl;

    const updatedScene: Scene = {
      ...selectedScene,
      sceneTitle: editedTitle.trim() || selectedScene.sceneTitle,
      mapUrl: safeMapUrl,
      mapThumbnailUrl: matchedMap?.thumbnailUrl || selectedScene.mapThumbnailUrl,
      mapWidth: matchedMap?.width || selectedScene.mapWidth,
      mapHeight: matchedMap?.height || selectedScene.mapHeight,
      dmNotes: editedDmNotes,
      tokens: tokensToSave,
      gridSize: selectedScene.gridSize || currentGridSize || 50,
      gridOpacity: selectedScene.gridOpacity ?? currentGridOpacity ?? 0.25,
      isFogVisible: selectedScene.isFogVisible ?? currentIsFogVisible ?? true,
      walls: (useCanvasTokens || activeSceneInfo?.sceneId === selectedScene.sceneId) && currentWalls ? currentWalls : (selectedScene.walls || []),
      visionConfig: (useCanvasTokens || activeSceneInfo?.sceneId === selectedScene.sceneId) && currentVisionConfig ? currentVisionConfig : selectedScene.visionConfig,
      roomAnnotations: (useCanvasTokens || activeSceneInfo?.sceneId === selectedScene.sceneId) && currentRoomAnnotations ? currentRoomAnnotations : (selectedScene.roomAnnotations || [])
    };

    const updatedChapters = selectedCampaign.chapters.map(ch => {
      if (ch.chapterId === selectedChapter.chapterId) {
        return {
          ...ch,
          scenes: ch.scenes.map(sc => sc.sceneId === updatedScene.sceneId ? updatedScene : sc)
        };
      }
      return ch;
    });

    const updatedCamp: Campaign = {
      ...selectedCampaign,
      chapters: updatedChapters,
      updatedAt: Date.now()
    };

    try {
      await saveCampaignDoc(updatedCamp);
      setCampaigns(prev => prev.map(c => c.campaignId === updatedCamp.campaignId ? updatedCamp : c));
      if (useCanvasTokens) {
        setEditedSceneTokens(tokensToSave);
      }
      
      // Also update active session if this is the active scene
      if (activeSceneInfo?.sceneId === updatedScene.sceneId) {
        await publishActiveSession({
          sessionId: 'current',
          campaignId: selectedCampaign.campaignId,
          chapterId: selectedChapter.chapterId,
          sceneId: updatedScene.sceneId,
          sceneTitle: updatedScene.sceneTitle,
          mapUrl: updatedScene.mapUrl,
          dmNotes: updatedScene.dmNotes,
          tokens: updatedScene.tokens,
          gridSize: updatedScene.gridSize,
          gridOpacity: updatedScene.gridOpacity,
          isFogVisible: updatedScene.isFogVisible,
          walls: updatedScene.walls,
          visionConfig: updatedScene.visionConfig,
          roomAnnotations: updatedScene.roomAnnotations,
          updatedAt: Date.now()
        });
      }

      setSaveSuccessMessage(`Saved scene and ${tokensToSave.length} token placements to Firestore!`);
      setTimeout(() => setSaveSuccessMessage(null), 3500);
      setIsEditingScene(false);
    } catch (e) {
      console.error('Error saving scene:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // 4b. Save & Launch Scene onto Canvas
  const handleSaveAndLaunchScene = async () => {
    if (!selectedCampaign || !selectedChapter || !selectedScene) return;
    const sceneToLaunch: Scene = {
      ...selectedScene,
      sceneTitle: editedTitle.trim() || selectedScene.sceneTitle,
      mapUrl: editedMapUrl.trim() || selectedScene.mapUrl,
      dmNotes: editedDmNotes,
      tokens: editedSceneTokens,
      gridSize: selectedScene.gridSize || currentGridSize || 50,
      gridOpacity: selectedScene.gridOpacity ?? currentGridOpacity ?? 0.25,
      isFogVisible: selectedScene.isFogVisible ?? currentIsFogVisible ?? true,
      walls: selectedScene.walls,
      visionConfig: selectedScene.visionConfig,
      roomAnnotations: selectedScene.roomAnnotations
    };
    await handleSaveSceneChanges(false);
    handleLaunchScene(sceneToLaunch);
  };

  // 5. Load Scene onto Active VTT Canvas & Real-time Player Sync
  const handleLaunchScene = async (sceneToLoad: Scene, targetView?: 'DM1' | 'DM2' | 'DM3') => {
    if (!selectedCampaign || !selectedChapter) return;
    
    // 1. Update local canvas
    onLoadScene(sceneToLoad, selectedCampaign.campaignId, selectedChapter.chapterId, targetView);

    // 2. Publish activeSession to Firestore so all connected players dynamically switch
    try {
      await publishActiveSession({
        sessionId: 'current',
        campaignId: selectedCampaign.campaignId,
        chapterId: selectedChapter.chapterId,
        sceneId: sceneToLoad.sceneId,
        sceneTitle: sceneToLoad.sceneTitle,
        mapUrl: sceneToLoad.mapUrl,
        dmNotes: sceneToLoad.dmNotes || '',
        tokens: sceneToLoad.tokens || [],
        gridSize: sceneToLoad.gridSize || 50,
        gridOpacity: sceneToLoad.gridOpacity ?? 0.25,
        isFogVisible: sceneToLoad.isFogVisible ?? true,
        walls: sceneToLoad.walls,
        visionConfig: sceneToLoad.visionConfig,
        roomAnnotations: sceneToLoad.roomAnnotations,
        updatedAt: Date.now()
      });
      setSaveSuccessMessage(`Scene "${sceneToLoad.sceneTitle}" live on VTT & synced to players!`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error syncing active session:', err);
    }
  };

  // 5b. Chapter Adventure PDF Upload & Ingestion
  const handleUploadAndDigestPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCampaign || !selectedChapter) return;

    setIsDigestingPdf(true);
    setDigestProgressText('Uploading adventure PDF to server...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload PDF file');
      }

      const uploadData = await uploadRes.json();
      const pdfUrl = uploadData.url;

      setDigestProgressText('Gemini AI analyzing adventure module, scenes, and room keys...');

      const digest = await digestChapterPdf({
        pdfPath: pdfUrl,
        pdfFilename: file.name,
        chapterTitle: selectedChapter.chapterTitle,
        campaignTitle: selectedCampaign.campaignTitle,
        existingScenes: selectedChapter.scenes.map(s => ({
          sceneId: s.sceneId,
          sceneTitle: s.sceneTitle,
          dmNotes: s.dmNotes
        }))
      });

      setDigestProgressText('Saving chapter digest and room mappings...');

      const updatedChapters = selectedCampaign.chapters.map(ch => {
        if (ch.chapterId === selectedChapter.chapterId) {
          return {
            ...ch,
            pdfUrl,
            pdfFilename: file.name,
            pdfDigest: digest
          };
        }
        return ch;
      });

      const updatedCampaign: Campaign = {
        ...selectedCampaign,
        chapters: updatedChapters
      };

      await saveCampaignDoc(updatedCampaign);
      setCampaigns(prev => prev.map(c => c.campaignId === updatedCampaign.campaignId ? updatedCampaign : c));
      toast.success(`Successfully digested "${file.name}"! Indexed ${digest.scenes?.length || 0} scenes and ${digest.rooms?.length || 0} numbered room keys.`);
    } catch (err: any) {
      console.error('PDF digest error:', err);
      toast.error(`Error digesting chapter PDF: ${err.message || 'Analysis failed'}`);
    } finally {
      setIsDigestingPdf(false);
      setDigestProgressText('');
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleRemoveChapterPdf = async () => {
    if (!selectedCampaign || !selectedChapter) return;
    try {
      const updatedChapters = selectedCampaign.chapters.map(ch => {
        if (ch.chapterId === selectedChapter.chapterId) {
          const clone = { ...ch };
          delete clone.pdfUrl;
          delete clone.pdfFilename;
          delete clone.pdfDigest;
          return clone;
        }
        return ch;
      });
      const updatedCampaign: Campaign = {
        ...selectedCampaign,
        chapters: updatedChapters
      };
      await saveCampaignDoc(updatedCampaign);
      setCampaigns(prev => prev.map(c => c.campaignId === updatedCampaign.campaignId ? updatedCampaign : c));
      toast.success('Chapter PDF and digest removed.');
    } catch (err: any) {
      toast.error('Failed to remove chapter PDF');
    }
  };

  const handleApplyDigestToScene = async (sceneId: string, suggestedDmNotes?: string, boxedText?: string) => {
    if (!selectedCampaign || !selectedChapter) return;
    try {
      const updatedChapters = selectedCampaign.chapters.map(ch => {
        if (ch.chapterId === selectedChapter.chapterId) {
          const updatedScenes = ch.scenes.map(s => {
            if (s.sceneId === sceneId) {
              const notesToAdd = [
                boxedText ? `> **Read-Aloud Boxed Text:**\n> ${boxedText}` : '',
                suggestedDmNotes || ''
              ].filter(Boolean).join('\n\n');

              return {
                ...s,
                dmNotes: s.dmNotes ? `${s.dmNotes}\n\n---\n\n${notesToAdd}` : notesToAdd
              };
            }
            return s;
          });
          return {
            ...ch,
            scenes: updatedScenes
          };
        }
        return ch;
      });

      const updatedCampaign: Campaign = {
        ...selectedCampaign,
        chapters: updatedChapters
      };
      await saveCampaignDoc(updatedCampaign);
      setCampaigns(prev => prev.map(c => c.campaignId === updatedCampaign.campaignId ? updatedCampaign : c));
      toast.success('Applied digested adventure notes & boxed text to scene!');
    } catch (err: any) {
      toast.error('Failed to apply notes to scene');
    }
  };

  const handleCreateSceneFromDigest = async (title: string, summary?: string, suggestedDmNotes?: string, boxedText?: string) => {
    if (!selectedCampaign || !selectedChapter) return;
    const newSceneId = `scene_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const formattedDmNotes = [
      summary ? `### ${title}\n${summary}` : `### ${title}`,
      boxedText ? `> **Read-Aloud Boxed Text:**\n> ${boxedText}` : '',
      suggestedDmNotes || ''
    ].filter(Boolean).join('\n\n');

    const newSc: Scene = {
      sceneId: newSceneId,
      sceneTitle: title,
      mapUrl: '',
      dmNotes: formattedDmNotes,
      tokens: [],
      gridSize: 50,
      gridOpacity: 0.25,
      isFogVisible: true
    };

    try {
      const updatedChapters = selectedCampaign.chapters.map(ch => {
        if (ch.chapterId === selectedChapter.chapterId) {
          return {
            ...ch,
            scenes: [...ch.scenes, newSc]
          };
        }
        return ch;
      });

      const updatedCampaign: Campaign = {
        ...selectedCampaign,
        chapters: updatedChapters
      };
      await saveCampaignDoc(updatedCampaign);
      setCampaigns(prev => prev.map(c => c.campaignId === updatedCampaign.campaignId ? updatedCampaign : c));
      setSelectedSceneId(newSceneId);
      toast.success(`Created scene "${title}" from adventure digest!`);
    } catch (err: any) {
      toast.error('Failed to create scene from digest');
    }
  };

  // 6. Upload Map Image or Video to Firebase with Auto-Save to Scene
  const handleMapFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    const targetCamp = selectedCampaign || campaigns.find(c => c.campaignId === selectedCampaignId) || campaigns[0];
    if (!targetCamp) {
      toast.error('Please create or select a campaign first.');
      return;
    }

    setIsUploadingMap(true);
    setSaveSuccessMessage('Uploading map asset to Firebase...');

    try {
      // 1. Upload via uploadAndRegisterAsset: handles disk storage, IndexedDB, video/image dims, and Firestore uploadedAssets!
      const asset = await uploadAndRegisterAsset(file, 'map');
      const finalUrl = asset.url;

      setEditedMapUrl(finalUrl);

      // Add to internal saved maps library for instant availability
      setInternalSavedMaps(prev => [asset, ...prev.filter(m => m.assetId !== asset.assetId)]);

      // 2. Identify target scene to assign (selectedScene or first scene of chapter)
      const targetChap = selectedChapter || targetCamp.chapters.find(ch => ch.chapterId === selectedChapterId) || targetCamp.chapters[0];
      const targetSc = selectedScene || targetChap?.scenes[0];

      if (targetSc && targetChap) {
        const dims = { width: asset.width || 0, height: asset.height || 0 };
        const updatedScene: Scene = {
          ...targetSc,
          sceneTitle: (selectedScene ? editedTitle.trim() : '') || targetSc.sceneTitle,
          mapUrl: finalUrl,
          mapThumbnailUrl: asset.thumbnailUrl || targetSc.mapThumbnailUrl,
          mapWidth: dims.width > 0 ? dims.width : targetSc.mapWidth,
          mapHeight: dims.height > 0 ? dims.height : targetSc.mapHeight,
          dmNotes: selectedScene ? editedDmNotes : targetSc.dmNotes,
          tokens: selectedScene ? editedSceneTokens : targetSc.tokens
        };

        // Cache video/file to scene in IndexedDB for instantaneous zero-latency local recall
        try {
          await saveLocalAsset(`scene_${updatedScene.sceneId}`, file);
          if (finalUrl) await saveLocalAsset(finalUrl, file);
        } catch (cacheErr) {
          console.warn('IndexedDB scene cache notice:', cacheErr);
        }

        const updatedChapters = targetCamp.chapters.map(ch => {
          if (ch.chapterId === targetChap.chapterId) {
            return {
              ...ch,
              scenes: ch.scenes.map(sc => sc.sceneId === updatedScene.sceneId ? updatedScene : sc)
            };
          }
          return ch;
        });

        const updatedCamp: Campaign = {
          ...targetCamp,
          chapters: updatedChapters,
          updatedAt: Date.now()
        };

        await saveCampaignDoc(updatedCamp);
        setCampaigns(prev => prev.map(c => c.campaignId === updatedCamp.campaignId ? updatedCamp : c));
        if (!selectedSceneId) {
          setSelectedSceneId(updatedScene.sceneId);
        }

        // If this scene is currently active on the VTT canvas, update activeSession as well!
        if (activeSceneInfo?.sceneId === updatedScene.sceneId) {
          await publishActiveSession({
            sessionId: 'current',
            campaignId: targetCamp.campaignId,
            chapterId: targetChap.chapterId,
            sceneId: updatedScene.sceneId,
            sceneTitle: updatedScene.sceneTitle,
            mapUrl: updatedScene.mapUrl,
            mapThumbnailUrl: updatedScene.mapThumbnailUrl,
            mapWidth: updatedScene.mapWidth,
            mapHeight: updatedScene.mapHeight,
            dmNotes: updatedScene.dmNotes,
            tokens: updatedScene.tokens,
            gridSize: updatedScene.gridSize,
            gridOpacity: updatedScene.gridOpacity,
            isFogVisible: updatedScene.isFogVisible,
            walls: updatedScene.walls,
            visionConfig: updatedScene.visionConfig,
            roomAnnotations: updatedScene.roomAnnotations,
            updatedAt: Date.now()
          });
        }

        toast.success(`Video map "${asset.name}" uploaded & saved to scene in Firebase!`);
        setSaveSuccessMessage(`Video map "${asset.name}" saved to scene!`);
      } else {
        toast.success(`Map "${asset.name}" uploaded to Firebase!`);
        setSaveSuccessMessage(`Map "${asset.name}" uploaded to Firebase!`);
      }
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Map upload error:', err);
      toast.error('Failed to upload map: ' + (err?.message || 'Upload error'));
      setSaveSuccessMessage(null);
    } finally {
      setIsUploadingMap(false);
    }
  };

  // Select a map from the user's Firebase library and automatically save to scene
  const handleSelectSavedMap = async (sm: UploadedAsset) => {
    setEditedMapUrl(sm.url);
    setShowSavedMapsPicker(false);

    const targetCamp = selectedCampaign || campaigns.find(c => c.campaignId === selectedCampaignId);
    const targetChap = selectedChapter || targetCamp?.chapters.find(ch => ch.chapterId === selectedChapterId);

    if (selectedScene && targetCamp && targetChap) {
      const updatedScene: Scene = {
        ...selectedScene,
        sceneTitle: editedTitle.trim() || selectedScene.sceneTitle,
        mapUrl: sm.url,
        mapThumbnailUrl: sm.thumbnailUrl || selectedScene.mapThumbnailUrl,
        mapWidth: sm.width || selectedScene.mapWidth,
        mapHeight: sm.height || selectedScene.mapHeight,
        dmNotes: editedDmNotes,
        tokens: editedSceneTokens
      };

      const updatedChapters = targetCamp.chapters.map(ch => {
        if (ch.chapterId === targetChap.chapterId) {
          return {
            ...ch,
            scenes: ch.scenes.map(sc => sc.sceneId === updatedScene.sceneId ? updatedScene : sc)
          };
        }
        return ch;
      });

      const updatedCamp: Campaign = {
        ...targetCamp,
        chapters: updatedChapters,
        updatedAt: Date.now()
      };

      try {
        await saveCampaignDoc(updatedCamp);
        setCampaigns(prev => prev.map(c => c.campaignId === updatedCamp.campaignId ? updatedCamp : c));
        toast.success(`Map "${sm.name}" saved to scene in Firebase!`);
        setSaveSuccessMessage(`Map "${sm.name}" saved to scene!`);
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      } catch (err: any) {
        console.error('Failed to save selected map to scene:', err);
        toast.error('Failed to save map to scene');
      }
    }
  };

  const handleDeleteSavedMap = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const mapToDelete = internalSavedMaps.find(m => m.assetId === assetId);
    setInternalSavedMaps(prev => prev.filter(m => m.assetId !== assetId));
    try {
      await deleteUploadedAsset(assetId, mapToDelete?.url);
      toast.success(`Deleted "${mapToDelete?.name || 'Map'}" from Firebase`);
    } catch (err) {
      console.error('Failed to delete map:', err);
      if (mapToDelete) {
        setInternalSavedMaps(prev => [mapToDelete, ...prev.filter(m => m.assetId !== assetId)]);
      }
      toast.error('Failed to delete map from Firebase');
    }
  };

  const handleMapDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverMap(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const dummyEvent = {
        target: {
          files: files,
          value: ''
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleMapFileChange(dummyEvent);
    }
  };

  // 7. Prompt & Execute Delete Scene
  const promptDeleteScene = (sceneId: string, sceneTitle?: string, campaignId?: string, chapterId?: string) => {
    let cId = campaignId;
    let chId = chapterId;
    let sTitle = sceneTitle;

    // Resolve campaignId, chapterId, or sceneTitle from campaigns state if not directly passed
    if (!cId || !chId || !sTitle) {
      for (const camp of campaigns) {
        for (const chap of camp.chapters) {
          const found = chap.scenes.find(s => s.sceneId === sceneId);
          if (found) {
            cId = camp.campaignId;
            chId = chap.chapterId;
            if (!sTitle) sTitle = found.sceneTitle;
            break;
          }
        }
        if (cId) break;
      }
    }

    if (!cId || !chId) {
      console.warn('[promptDeleteScene] Could not find campaign or chapter for scene:', sceneId);
      return;
    }

    setSceneToDelete({
      sceneId,
      sceneTitle: sTitle || 'Untitled Scene',
      campaignId: cId,
      chapterId: chId
    });
  };

  // Backward-compatible alias for any callers
  const handleDeleteScene = (sceneIdToDelete: string, campaignId?: string, chapterId?: string) => {
    promptDeleteScene(sceneIdToDelete, undefined, campaignId, chapterId);
  };

  const executeDeleteScene = async () => {
    if (!sceneToDelete) return;
    const { sceneId, sceneTitle, campaignId, chapterId } = sceneToDelete;
    setIsDeletingScene(true);

    try {
      const targetCamp = campaigns.find(c => c.campaignId === campaignId);
      if (!targetCamp) throw new Error(`Campaign not found: ${campaignId}`);

      const updatedChapters = targetCamp.chapters.map(ch => {
        if (ch.chapterId === chapterId) {
          return {
            ...ch,
            scenes: ch.scenes.filter(sc => sc.sceneId !== sceneId)
          };
        }
        return ch;
      });

      const updatedCamp: Campaign = {
        ...targetCamp,
        chapters: updatedChapters,
        updatedAt: Date.now()
      };

      await saveCampaignDoc(updatedCamp);
      setCampaigns(prev => prev.map(c => c.campaignId === updatedCamp.campaignId ? updatedCamp : c));

      if (selectedSceneId === sceneId) {
        setSelectedSceneId(null);
      }

      setSaveSuccessMessage(`Scene "${sceneTitle}" deleted successfully.`);
      setTimeout(() => setSaveSuccessMessage(null), 3500);
      setSceneToDelete(null);
    } catch (err) {
      console.error('Error deleting scene:', err);
    } finally {
      setIsDeletingScene(false);
    }
  };

  // 8. Prompt & Execute Delete Chapter
  const promptDeleteChapter = (chapIdToDelete: string, chapterTitle?: string, campaignId?: string) => {
    let cId = campaignId || selectedCampaignId;
    let chTitle = chapterTitle;

    if (!cId) {
      for (const camp of campaigns) {
        const found = camp.chapters.find(ch => ch.chapterId === chapIdToDelete);
        if (found) {
          cId = camp.campaignId;
          if (!chTitle) chTitle = found.chapterTitle;
          break;
        }
      }
    }

    if (!cId) return;

    setChapterToDelete({
      chapterId: chapIdToDelete,
      chapterTitle: chTitle || 'Untitled Chapter',
      campaignId: cId
    });
  };

  const handleDeleteChapter = (chapIdToDelete: string, campaignId?: string) => {
    promptDeleteChapter(chapIdToDelete, undefined, campaignId);
  };

  const executeDeleteChapter = async () => {
    if (!chapterToDelete) return;
    const { chapterId, campaignId } = chapterToDelete;
    setIsDeletingChapter(true);

    try {
      const targetCamp = campaigns.find(c => c.campaignId === campaignId);
      if (!targetCamp) throw new Error(`Campaign not found: ${campaignId}`);

      const updatedCamp: Campaign = {
        ...targetCamp,
        chapters: targetCamp.chapters.filter(ch => ch.chapterId !== chapterId),
        updatedAt: Date.now()
      };

      await saveCampaignDoc(updatedCamp);
      setCampaigns(prev => prev.map(c => c.campaignId === updatedCamp.campaignId ? updatedCamp : c));

      if (selectedChapterId === chapterId) {
        setSelectedChapterId(null);
        setSelectedSceneId(null);
      }

      setChapterToDelete(null);
    } catch (err) {
      console.error('Error deleting chapter:', err);
    } finally {
      setIsDeletingChapter(false);
    }
  };

  // 9. Prompt & Execute Delete Campaign
  const promptDeleteCampaign = (campIdToDelete: string, campaignTitle?: string) => {
    setCampaignToDelete({
      campaignId: campIdToDelete,
      campaignTitle: campaignTitle || 'Untitled Campaign'
    });
  };

  const handleDeleteCampaign = (campIdToDelete: string) => {
    promptDeleteCampaign(campIdToDelete);
  };

  const executeDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    const { campaignId } = campaignToDelete;
    setIsDeletingCampaign(true);

    try {
      await deleteCampaignDoc(campaignId);
      setCampaigns(prev => prev.filter(c => c.campaignId !== campaignId));

      if (selectedCampaignId === campaignId) {
        setSelectedCampaignId(null);
        setSelectedChapterId(null);
        setSelectedSceneId(null);
      }

      setCampaignToDelete(null);
    } catch (err) {
      console.error('Error deleting campaign:', err);
    } finally {
      setIsDeletingCampaign(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        id="campaign-builder-modal-container"
        className="w-full max-w-6xl h-[88vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono tracking-tight text-zinc-100">
                  Campaign Builder & Scene Manager
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  Firebase Firestore Modular v10
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Hierarchical campaign architecture, scenes, DM notes, and real-time player broadcast.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-share-player-view-modal"
              onClick={() => {
                const playerUrl = `${window.location.origin}${window.location.pathname}?view=player`;
                navigator.clipboard.writeText(playerUrl);
                window.open(playerUrl, '_blank');
                toast.success('Player View link copied to clipboard and opened in new window!', {
                  description: playerUrl
                });
              }}
              className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Copy Player View link to clipboard and open in a new window"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Share Player View</span>
            </button>
            <button
              id="btn-create-campaign"
              onClick={() => setShowCreateCampaignModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/40 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Split Body: Left Tree Navigator & Right Scene Inspector */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Tree Navigation & Search */}
          <div className="w-80 border-r border-zinc-800/80 flex flex-col bg-zinc-950/70 shrink-0">
            {/* Search Bar */}
            <div className="p-3 border-b border-zinc-800/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search campaigns, chapters, scenes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            {/* Tree Folder List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 sidebar-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  Loading campaigns from Firestore...
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No campaigns found. Click "New Campaign" to create one.
                </div>
              ) : (
                filteredCampaigns.map((camp) => {
                  const isCampExpanded = !!expandedCampaigns[camp.campaignId];
                  const isCampSelected = selectedCampaignId === camp.campaignId;

                  return (
                    <div key={camp.campaignId} className="space-y-0.5">
                      {/* Campaign Root Node */}
                      <div
                        onClick={() => {
                          setSelectedCampaignId(camp.campaignId);
                          toggleCampaignExpand(camp.campaignId);
                        }}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-xl cursor-pointer transition-all ${
                          isCampSelected
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'hover:bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCampaignExpand(camp.campaignId);
                            }}
                            className="p-0.5 text-zinc-500 hover:text-zinc-200"
                          >
                            {isCampExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-xs font-bold truncate">{camp.campaignTitle}</span>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCampaignId(camp.campaignId);
                              setShowAddChapterModal(true);
                            }}
                            title="Add Chapter"
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-amber-300"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              promptDeleteCampaign(camp.campaignId, camp.campaignTitle);
                            }}
                            title={`Delete Campaign "${camp.campaignTitle}"`}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Chapters Sub-tree */}
                      {isCampExpanded && (
                        <div className="pl-4 space-y-0.5 border-l border-zinc-800/80 ml-3 mt-0.5">
                          {camp.chapters.length === 0 ? (
                            <div className="py-1 px-2 text-[11px] text-zinc-500 italic flex items-center justify-between">
                              <span>No chapters yet</span>
                              <button
                                onClick={() => {
                                  setSelectedCampaignId(camp.campaignId);
                                  setShowAddChapterModal(true);
                                }}
                                className="text-[10px] text-amber-400 hover:underline"
                              >
                                + Add Chapter
                              </button>
                            </div>
                          ) : (
                            camp.chapters.map((chap) => {
                              const isChapExpanded = !!expandedChapters[chap.chapterId];
                              const isChapSelected = selectedChapterId === chap.chapterId;
                              const isDropTargetChapter = dragOverChapterId === chap.chapterId && draggedSceneInfo?.sourceChapterId !== chap.chapterId;

                              return (
                                <div key={chap.chapterId} className="space-y-0.5">
                                  {/* Chapter Node */}
                                  <div
                                    onClick={() => {
                                      setSelectedCampaignId(camp.campaignId);
                                      setSelectedChapterId(chap.chapterId);
                                      setSelectedSceneId(null);
                                      toggleChapterExpand(chap.chapterId);
                                    }}
                                    onDragOver={(e) => handleChapterDragOver(e, chap.chapterId)}
                                    onDragLeave={(e) => handleChapterDragLeave(e, chap.chapterId)}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const data = draggedSceneInfo || parseDragData(e);
                                      handleMoveSceneToChapter(data, chap.chapterId, camp.campaignId);
                                    }}
                                    className={`group flex items-center justify-between px-2 py-1 rounded-xl cursor-pointer transition-all ${
                                      isDropTargetChapter
                                        ? 'bg-blue-600/30 text-blue-200 border-2 border-dashed border-blue-400 font-semibold ring-2 ring-blue-500/20'
                                        : isChapSelected && !selectedSceneId
                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
                                        : isChapSelected
                                        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                        : 'hover:bg-zinc-900/80 text-zinc-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleChapterExpand(chap.chapterId);
                                        }}
                                        className="p-0.5 text-zinc-500 hover:text-zinc-200"
                                      >
                                        {isChapExpanded ? (
                                          <ChevronDown className="w-3 h-3" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3" />
                                        )}
                                      </button>
                                      {isChapExpanded ? (
                                        <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                      ) : (
                                        <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                      )}
                                      <span className="text-[11px] font-medium truncate">{chap.chapterTitle}</span>
                                      {isDropTargetChapter && (
                                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500 text-white font-bold animate-pulse shrink-0">
                                          Drop here
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedCampaignId(camp.campaignId);
                                          setSelectedChapterId(chap.chapterId);
                                          setShowAddSceneModal(true);
                                        }}
                                        title="Add Scene"
                                        className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-blue-300"
                                      >
                                        <Plus className="w-2.5 h-2.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          promptDeleteChapter(chap.chapterId, chap.chapterTitle, camp.campaignId);
                                        }}
                                        title={`Delete Chapter "${chap.chapterTitle}"`}
                                        className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-red-400"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Scenes Node List */}
                                  {isChapExpanded && (
                                    <div
                                      onDragOver={(e) => handleChapterDragOver(e, chap.chapterId)}
                                      onDragLeave={(e) => handleChapterDragLeave(e, chap.chapterId)}
                                      onDrop={(e) => {
                                        if (e.target === e.currentTarget) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const data = draggedSceneInfo || parseDragData(e);
                                          handleMoveSceneToChapter(data, chap.chapterId, camp.campaignId);
                                        }
                                      }}
                                      className={`pl-4 space-y-0.5 border-l border-zinc-800/80 ml-3 transition-colors ${
                                        isDropTargetChapter ? 'border-l-blue-400 bg-blue-500/5 rounded-r-lg' : ''
                                      }`}
                                    >
                                      {chap.scenes.length === 0 ? (
                                        <div
                                          onDragOver={(e) => handleChapterDragOver(e, chap.chapterId)}
                                          onDragLeave={(e) => handleChapterDragLeave(e, chap.chapterId)}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const data = draggedSceneInfo || parseDragData(e);
                                            handleMoveSceneToChapter(data, chap.chapterId, camp.campaignId);
                                          }}
                                          className={`py-2 px-2 text-[10px] rounded-lg transition-all flex items-center justify-between ${
                                            isDropTargetChapter
                                              ? 'bg-blue-500/20 border-2 border-dashed border-blue-400 text-blue-300'
                                              : 'text-zinc-500 italic'
                                          }`}
                                        >
                                          <span>{isDropTargetChapter ? 'Drop scene into this chapter' : 'No scenes'}</span>
                                          <button
                                            onClick={() => {
                                              setSelectedCampaignId(camp.campaignId);
                                              setSelectedChapterId(chap.chapterId);
                                              setInsertAfterSceneId(null);
                                              setNewSceneTitle('');
                                              setShowAddSceneModal(true);
                                            }}
                                            className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                                          >
                                            <Plus className="w-2.5 h-2.5" /> Add Scene
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          {chap.scenes.map((scene) => {
                                            const isSceneSelected = selectedSceneId === scene.sceneId;
                                            const isLiveOnVTT = activeSceneInfo?.sceneId === scene.sceneId;
                                            const isBeingDragged = draggedSceneInfo?.sceneId === scene.sceneId;
                                            const isDragOverThis = dragOverSceneId === scene.sceneId;

                                            return (
                                              <div
                                                key={scene.sceneId}
                                                draggable={true}
                                                onDragStart={(e) => {
                                                  e.stopPropagation();
                                                  const info = {
                                                    sceneId: scene.sceneId,
                                                    sceneTitle: scene.sceneTitle,
                                                    sourceChapterId: chap.chapterId,
                                                    sourceCampaignId: camp.campaignId
                                                  };
                                                  setDraggedSceneInfo(info);
                                                  e.dataTransfer.setData('application/x-mistwalker-scene', JSON.stringify(info));
                                                  e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                onDragEnd={() => {
                                                  clearHoverExpandTimer();
                                                  setDraggedSceneInfo(null);
                                                  setDragOverChapterId(null);
                                                  setDragOverSceneId(null);
                                                  setDragDropPosition(null);
                                                }}
                                                onDragOver={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  e.dataTransfer.dropEffect = 'move';
                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                  const midY = rect.top + rect.height / 2;
                                                  const pos: 'before' | 'after' = e.clientY < midY ? 'before' : 'after';
                                                  setDragOverChapterId(chap.chapterId);
                                                  setDragOverSceneId(scene.sceneId);
                                                  setDragDropPosition(pos);
                                                }}
                                                onDragLeave={(e) => {
                                                  e.stopPropagation();
                                                  if (dragOverSceneId === scene.sceneId) {
                                                    setDragOverSceneId(null);
                                                    setDragDropPosition(null);
                                                  }
                                                }}
                                                onDrop={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  const data = draggedSceneInfo || parseDragData(e);
                                                  const pos = dragDropPosition || 'after';
                                                  handleMoveSceneToChapter(data, chap.chapterId, camp.campaignId, scene.sceneId, pos);
                                                }}
                                                onClick={() => {
                                                  setSelectedCampaignId(camp.campaignId);
                                                  setSelectedChapterId(chap.chapterId);
                                                  setSelectedSceneId(scene.sceneId);
                                                }}
                                                className={`group relative flex items-center justify-between px-2 py-1 rounded-xl cursor-pointer transition-all ${
                                                  isBeingDragged
                                                    ? 'opacity-30 border border-dashed border-zinc-600 bg-zinc-950/60'
                                                    : isSceneSelected
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                                                    : 'hover:bg-zinc-900/60 text-zinc-400'
                                                }`}
                                              >
                                                {/* Reorder Drop Target Highlight Bar */}
                                                {isDragOverThis && !isBeingDragged && (
                                                  <div
                                                    className={`absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] z-10 pointer-events-none ${
                                                      dragDropPosition === 'before' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2'
                                                    }`}
                                                  />
                                                )}

                                                <div className="flex items-center gap-1.5 min-w-0">
                                                  <GripVertical className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 shrink-0 cursor-grab active:cursor-grabbing" title="Drag to move or reorder" />
                                                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                                                  <span className="text-[11px] truncate">{scene.sceneTitle}</span>
                                                  {scene.roomAnnotations && scene.roomAnnotations.length > 0 && (
                                                    <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0" title={`${scene.roomAnnotations.length} polygon rooms saved to scene`}>
                                                      {scene.roomAnnotations.length}R
                                                    </span>
                                                  )}
                                                </div>

                                                <div className="flex items-center gap-1">
                                                  {isLiveOnVTT && (
                                                    <span className="flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500 text-zinc-950 font-bold">
                                                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 animate-pulse" />
                                                      LIVE
                                                    </span>
                                                  )}
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedCampaignId(camp.campaignId);
                                                      setSelectedChapterId(chap.chapterId);
                                                      setInsertAfterSceneId(scene.sceneId);
                                                      setNewSceneTitle('');
                                                      setShowAddSceneModal(true);
                                                    }}
                                                    className={`p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/15 transition-all ${
                                                      isSceneSelected ? 'opacity-100 text-zinc-400' : 'opacity-0 group-hover:opacity-100'
                                                    }`}
                                                    title={`Add scene underneath "${scene.sceneTitle}"`}
                                                  >
                                                    <Plus className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      promptDeleteScene(scene.sceneId, scene.sceneTitle, camp.campaignId, chap.chapterId);
                                                    }}
                                                    className={`p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/15 transition-all ${
                                                      isSceneSelected ? 'opacity-100 text-zinc-400' : 'opacity-40 group-hover:opacity-100'
                                                    }`}
                                                    title={`Delete Scene "${scene.sceneTitle}"`}
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })}

                                          {/* Always visible option to add another scene underneath the scenes */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedCampaignId(camp.campaignId);
                                              setSelectedChapterId(chap.chapterId);
                                              const lastScene = chap.scenes[chap.scenes.length - 1];
                                              setInsertAfterSceneId(lastScene ? lastScene.sceneId : null);
                                              setNewSceneTitle('');
                                              setShowAddSceneModal(true);
                                            }}
                                            onDragOver={(e) => handleChapterDragOver(e, chap.chapterId)}
                                            onDragLeave={(e) => handleChapterDragLeave(e, chap.chapterId)}
                                            onDrop={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const data = draggedSceneInfo || parseDragData(e);
                                              handleMoveSceneToChapter(data, chap.chapterId, camp.campaignId);
                                            }}
                                            className={`w-full flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono rounded-lg transition-colors border border-dashed mt-1 ${
                                              isDropTargetChapter
                                                ? 'bg-blue-500/20 text-blue-300 border-blue-400'
                                                : 'text-zinc-500 hover:text-emerald-400 hover:bg-zinc-900/60 border-zinc-800/80 hover:border-emerald-500/40'
                                            }`}
                                            title="Add another scene underneath, or drop scene here"
                                          >
                                            <Plus className="w-3 h-3 text-emerald-400" />
                                            <span>{isDropTargetChapter ? '+ Drop Scene At End' : '+ Add Scene Underneath'}</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Tree Navigation Footer Actions */}
            <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500 font-mono">
              <span>{campaigns.length} Campaigns</span>
              <button
                onClick={loadCampaigns}
                className="flex items-center gap-1 hover:text-zinc-200 transition-colors"
                title="Refresh from Firestore"
              >
                <RefreshCw className="w-3 h-3" /> Sync
              </button>
            </div>
          </div>

          {/* Right Column: Selected Scene Inspector & Editor */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-zinc-950 p-6 sidebar-scrollbar">
            {saveSuccessMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {saveSuccessMessage}
              </div>
            )}

            {selectedScene ? (
              <div className="space-y-6">
                {/* Scene Header & Primary Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-1">
                      <span>{selectedCampaign?.campaignTitle}</span>
                      <span>/</span>
                      <span>{selectedChapter?.chapterTitle}</span>
                    </div>
                    {isEditingScene ? (
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="text-lg font-bold font-mono bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1 text-white w-full max-w-md focus:outline-none focus:border-amber-500"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold font-mono text-white tracking-tight">
                          {selectedScene.sceneTitle}
                        </h1>
                        <button
                          onClick={() => setIsEditingScene(true)}
                          className="p-1 text-zinc-500 hover:text-zinc-200"
                          title="Edit Title"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400 mt-1">
                      <span className="text-blue-300 font-medium">{editedSceneTokens.length} tokens</span>
                      {selectedScene.walls && selectedScene.walls.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">{selectedScene.walls.length} walls/doors</span>
                        </>
                      )}
                      {selectedScene.roomAnnotations && selectedScene.roomAnnotations.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-400" />
                            {selectedScene.roomAnnotations.length} polygon rooms
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        id="btn-launch-scene-vtt"
                        onClick={() => handleLaunchScene(selectedScene)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-950/50 active:scale-95"
                        title="Load this scene map and tokens onto the live VTT canvas and broadcast to all connected player views"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Load Live
                      </button>
                      {(['DM1', 'DM2', 'DM3'] as const).map(dmSlot => (
                        <button
                          key={dmSlot}
                          type="button"
                          onClick={() => handleLaunchScene(selectedScene, dmSlot)}
                          className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-bold font-mono text-xs transition-all"
                          title={`Load Scene into ${dmSlot} View`}
                        >
                          {dmSlot}
                        </button>
                      ))}
                    </div>

                    <button
                      id="btn-save-scene-tokens"
                      onClick={() => handleSaveSceneChanges(false)}
                      disabled={isSaving}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-amber-950/40 active:scale-95"
                      title="Save battlemap, placed tokens, and DM notes to Firestore"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Scene & Tokens ({editedSceneTokens.length})
                    </button>

                    {currentTokens.length > 0 && (
                      <button
                        id="btn-save-scene-canvas-changes"
                        onClick={() => handleSaveSceneChanges(true)}
                        disabled={isSaving}
                        className="px-3 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 disabled:opacity-50 text-blue-200 text-xs font-medium flex items-center gap-1.5 transition-all"
                        title="Import tokens currently placed on the live VTT canvas into this scene"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Pull from Canvas
                      </button>
                    )}

                    <button
                      id="btn-add-scene-below"
                      type="button"
                      onClick={() => {
                        setInsertAfterSceneId(selectedScene.sceneId);
                        setNewSceneTitle('');
                        setShowAddSceneModal(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
                      title={`Add another scene directly underneath "${selectedScene.sceneTitle}"`}
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      Add Scene Underneath
                    </button>

                    <button
                      id="btn-delete-scene-inspector"
                      type="button"
                      onClick={() => promptDeleteScene(selectedScene.sceneId, selectedScene.sceneTitle, selectedCampaign?.campaignId, selectedChapter?.chapterId)}
                      className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-300 hover:text-red-200 text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                      title="Delete this scene from the chapter"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Scene
                    </button>
                  </div>
                </div>

                {/* Map Asset & Storage Section */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold font-mono text-zinc-200">Scene Battlemap Asset</h3>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={() => setShowPresetMapsModal(true)}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Choose Preset Battlemap
                      </button>
                      {currentMapUrl && (
                        <button
                          type="button"
                          onClick={() => setEditedMapUrl(currentMapUrl)}
                          className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg flex items-center gap-1 transition-all"
                        >
                          Use Active Canvas Map
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    {/* Map Preview Thumbnail with Drag-and-Drop and Click-to-Upload */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingOverMap(true);
                      }}
                      onDragLeave={() => setIsDraggingOverMap(false)}
                      onDrop={handleMapDrop}
                      onClick={() => !isUploadingMap && mapUploadInputRef.current?.click()}
                      className={`relative aspect-video rounded-xl overflow-hidden border cursor-pointer transition-all flex items-center justify-center group ${
                        isDraggingOverMap
                          ? 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400/50'
                          : 'border-zinc-700 bg-zinc-950 hover:border-emerald-500/60'
                      }`}
                      title={editedMapUrl ? 'Click or drop file to replace battlemap' : 'Click or drop file to upload battlemap'}
                    >
                      {editedMapUrl ? (
                        isVideoAsset(editedMapUrl) ? (
                          <div className="relative w-full h-full bg-zinc-950">
                            <video
                              src={editedMapUrl}
                              poster={selectedScene?.mapThumbnailUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              onLoadedMetadata={(e) => {
                                e.currentTarget.muted = true;
                                e.currentTarget.play().catch(() => {});
                              }}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-emerald-400 font-mono text-[8px] font-bold border border-emerald-500/40">
                              VIDEO
                            </span>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-emerald-300 text-[11px] font-mono font-bold gap-1">
                              <CloudUpload className="w-5 h-5 text-emerald-400" />
                              <span>Click / Drop to Replace</span>
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-full h-full">
                            <img
                              src={editedMapUrl}
                              alt={selectedScene.sceneTitle}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-emerald-300 text-[11px] font-mono font-bold gap-1">
                              <CloudUpload className="w-5 h-5 text-emerald-400" />
                              <span>Click / Drop to Replace</span>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center p-3 text-center">
                          <CloudUpload className="w-7 h-7 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-zinc-200">Click or drop map</span>
                          <span className="text-[10px] text-zinc-500 font-mono mt-0.5">Image or MP4 / WebM</span>
                        </div>
                      )}

                      {isUploadingMap && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 z-10">
                          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                          <span className="text-[10px] font-mono text-emerald-300 font-bold">Uploading to Firebase...</span>
                        </div>
                      )}
                    </div>

                    {/* Map URL and Upload Control */}
                    <div className="md:col-span-3 space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-zinc-400">Map Asset URL</label>
                        <input
                          type="text"
                          value={editedMapUrl}
                          onChange={(e) => setEditedMapUrl(e.target.value)}
                          placeholder="Paste image/video URL or upload below"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => mapUploadInputRef.current?.click()}
                          disabled={isUploadingMap}
                          className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-emerald-500/20 border border-zinc-700 hover:border-emerald-500/40 text-zinc-200 hover:text-emerald-300 text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
                        >
                          {isUploadingMap ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                          ) : (
                            <CloudUpload className="w-4 h-4 text-emerald-400" />
                          )}
                          {isUploadingMap ? 'Uploading to Firebase...' : 'Upload File to Firebase'}
                        </button>
                        <input
                          ref={mapUploadInputRef}
                          type="file"
                          accept="image/*,video/*,.mp4,.webm,.m4v"
                          className="hidden"
                          onChange={handleMapFileChange}
                        />

                        {internalSavedMaps && internalSavedMaps.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowSavedMapsPicker(!showSavedMapsPicker)}
                            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                              showSavedMapsPicker
                                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                                : 'bg-zinc-800 hover:bg-emerald-500/10 border-zinc-700 hover:border-emerald-500/30 text-zinc-300'
                            }`}
                          >
                            <FolderOpen className="w-4 h-4 text-emerald-400" />
                            {showSavedMapsPicker ? 'Hide Library' : `Saved Maps (${internalSavedMaps.length})`}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveSceneChanges(false)}
                          disabled={isSaving}
                          className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all"
                        >
                          Save Map to Scene
                        </button>
                      </div>

                      {showSavedMapsPicker && internalSavedMaps && internalSavedMaps.length > 0 && (
                        <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-zinc-400">Select a Saved Map from Firebase</span>
                            <button
                              type="button"
                              onClick={() => mapUploadInputRef.current?.click()}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono font-bold flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Upload New Map
                            </button>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1 sidebar-scrollbar">
                            {internalSavedMaps.map((sm) => (
                              <div
                                key={sm.assetId}
                                className={`relative group p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                  editedMapUrl === sm.url
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                                }`}
                                onClick={() => handleSelectSavedMap(sm)}
                                title={`Click to assign "${sm.name}" to this scene`}
                              >
                                <div className="w-full h-12 rounded-lg overflow-hidden bg-black/60 flex items-center justify-center relative">
                                  {sm.fileType === 'video' || isVideoAsset(sm.url) ? (
                                    sm.thumbnailUrl ? (
                                      <>
                                        <img src={sm.thumbnailUrl} alt={sm.name} className="w-full h-full object-cover" />
                                        <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/85 text-emerald-400 font-mono text-[7px] font-bold rounded border border-emerald-500/30">
                                          VID
                                        </span>
                                      </>
                                    ) : (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <Video className="w-4 h-4 text-emerald-400" />
                                        <span className="text-[8px] text-emerald-400 font-mono">VIDEO</span>
                                      </div>
                                    )
                                  ) : (
                                    <img src={sm.thumbnailUrl || sm.url} alt={sm.name} className="w-full h-full object-cover" />
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteSavedMap(sm.assetId, e)}
                                    className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-600 text-zinc-400 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer shadow"
                                    title="Delete from Firebase"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <span className="text-[10px] truncate max-w-full font-medium">{sm.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>


                {/* DM Notes Section */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-bold font-mono text-zinc-200">Dungeon Master Notes & Encounter Lore</h3>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">Visible only to DM</span>
                  </div>

                  <textarea
                    value={editedDmNotes}
                    onChange={(e) => setEditedDmNotes(e.target.value)}
                    placeholder="Enter scene description, traps, DC checks, secret doors, monster tactics, read-aloud text..."
                    className="w-full min-h-[120px] p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 leading-relaxed focus:outline-none focus:border-amber-500/60 font-sans sidebar-scrollbar"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveSceneChanges(false)}
                      disabled={isSaving}
                      className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl transition-all"
                    >
                      Save Notes
                    </button>
                  </div>
                </div>

                {/* Option to Add Another Scene Underneath */}
                <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 rounded-2xl p-4 border border-zinc-800/50">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-zinc-200 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      Next Scene in Chapter
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Add another scene directly underneath &ldquo;{selectedScene.sceneTitle}&rdquo;
                    </p>
                  </div>
                  <button
                    id="btn-add-next-scene-card"
                    type="button"
                    onClick={() => {
                      setInsertAfterSceneId(selectedScene.sceneId);
                      setNewSceneTitle('');
                      setShowAddSceneModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Scene Underneath
                  </button>
                </div>
              </div>
            ) : selectedChapter ? (
              <div className="space-y-6 animate-in fade-in">
                {/* Chapter Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-1">
                      <span>{selectedCampaign?.campaignTitle}</span>
                      <span>/</span>
                      <span className="text-blue-400 font-semibold">{selectedChapter.chapterTitle}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-xl font-bold font-mono text-white tracking-tight flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-blue-400" />
                        {selectedChapter.chapterTitle}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-medium">
                        {selectedChapter.scenes.length} {selectedChapter.scenes.length === 1 ? 'Scene' : 'Scenes'}
                      </span>
                      {selectedChapter.pdfDigest && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          PDF Digested ({selectedChapter.pdfDigest.rooms?.length || 0} Rooms Mapped)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenDndChatbot && selectedChapter.pdfDigest && (
                      <button
                        type="button"
                        onClick={onOpenDndChatbot}
                        className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        title="Ask D&D AI Oracle about this chapter's rooms, lore & traps"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        Consult D&D Oracle
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setInsertAfterSceneId(null);
                        setNewSceneTitle('');
                        setShowAddSceneModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Scene
                    </button>
                  </div>
                </div>

                {/* Chapter PDF Upload & Document Intelligence Card */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                          Adventure Chapter PDF & Document Digest
                        </h3>
                        <p className="text-[11px] text-zinc-400">
                          Upload official or homebrew PDF adventure modules. Gemini AI digests the narrative, associates scenes, and indexes all numbered room zones with read-aloud boxed text.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={pdfInputRef}
                        accept=".pdf,.txt,.md"
                        onChange={handleUploadAndDigestPdf}
                        className="hidden"
                      />
                      {selectedChapter.pdfDigest ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => pdfInputRef.current?.click()}
                            disabled={isDigestingPdf}
                            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-all"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isDigestingPdf ? 'animate-spin' : ''}`} />
                            Re-Digest PDF
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveChapterPdf}
                            disabled={isDigestingPdf}
                            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-red-950/60 hover:text-red-400 text-zinc-400 text-xs transition-colors"
                            title="Remove Chapter PDF"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsPdfImporterOpen(true)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-md shadow-blue-950/50 active:scale-95 cursor-pointer"
                            title="Automated D&D Chapter Ingestion: Extract battlemaps, room annotations, and baseline walls from official adventure PDF"
                          >
                            <Sparkles className="w-4 h-4 text-blue-200" />
                            Import from Adventure PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => pdfInputRef.current?.click()}
                            disabled={isDigestingPdf}
                            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-xs font-bold font-mono flex items-center gap-2 transition-all"
                          >
                            <CloudUpload className="w-4 h-4 text-zinc-400" />
                            Upload PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Processing Status Banner */}
                  {isDigestingPdf && (
                    <div className="p-4 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-200 flex items-center gap-3 animate-in fade-in">
                      <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      <div>
                        <div className="text-xs font-bold font-mono text-blue-300">Digesting Chapter Adventure Document</div>
                        <div className="text-[11px] text-blue-400/90">{digestProgressText || 'Gemini 3.8 Flash extracting narrative, scenes & room keys...'}</div>
                      </div>
                    </div>
                  )}

                  {/* Digested Adventure Content Display */}
                  {selectedChapter.pdfDigest && (
                    <div className="space-y-5 pt-2">
                      {/* Document Overview Header */}
                      <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/90 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            {selectedChapter.pdfDigest.adventureTitle || 'Adventure Module'}
                          </span>
                          <span className="text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {selectedChapter.pdfDigest.pdfFilename}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {selectedChapter.pdfDigest.digestSummary}
                        </p>
                      </div>

                      {/* Digested Scenes Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-blue-400" />
                            Chapter Scenes & Tactical Associations ({selectedChapter.pdfDigest.scenes?.length || 0})
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(selectedChapter.pdfDigest.scenes || []).map((sc, idx) => {
                            const matchingExistingScene = selectedChapter.scenes.find(
                              s => (sc.sceneId && s.sceneId === sc.sceneId) || 
                                   s.sceneTitle.toLowerCase() === sc.sceneTitle.toLowerCase()
                            );

                            return (
                              <div key={idx} className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex flex-col justify-between space-y-2.5">
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <h5 className="text-xs font-bold font-mono text-zinc-100 truncate">
                                      {sc.sceneTitle}
                                    </h5>
                                    {matchingExistingScene ? (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono shrink-0">
                                        In Chapter
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono shrink-0">
                                        Detected
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                                    {sc.summary}
                                  </p>

                                  {/* Associated Room Numbers */}
                                  {sc.roomNumbers && sc.roomNumbers.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap mt-2">
                                      <span className="text-[9px] font-mono text-zinc-500">Rooms:</span>
                                      {sc.roomNumbers.map((rNum, rIdx) => (
                                        <span key={rIdx} className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold">
                                          {rNum}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="pt-2 border-t border-zinc-900 flex items-center justify-end gap-2">
                                  {matchingExistingScene ? (
                                    <button
                                      type="button"
                                      onClick={() => handleApplyDigestToScene(matchingExistingScene.sceneId, sc.suggestedDmNotes, sc.boxedText)}
                                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-mono font-medium flex items-center gap-1 transition-all"
                                      title="Add extracted boxed text & DM notes to this scene"
                                    >
                                      <Sparkles className="w-3 h-3 text-amber-400" />
                                      Enrich DM Notes
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleCreateSceneFromDigest(sc.sceneTitle, sc.summary, sc.suggestedDmNotes, sc.boxedText)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Create Scene
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Digested Room Zones Section */}
                      <div className="space-y-3 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-amber-400" />
                              Detected Room Zones & Numbered Keys ({selectedChapter.pdfDigest.rooms?.length || 0})
                            </h4>
                            <p className="text-[10px] text-zinc-500">
                              Auto-linked when drawing polygon zones on canvas. Number matches will automatically populate read-aloud boxed text & DM secrets.
                            </p>
                          </div>

                          {/* Room Search Bar */}
                          <div className="relative w-full sm:w-64">
                            <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Filter rooms by number/name..."
                              value={roomFilterQuery}
                              onChange={(e) => setRoomFilterQuery(e.target.value)}
                              className="w-full pl-8 pr-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        {/* Room Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1 sidebar-scrollbar">
                          {(selectedChapter.pdfDigest.rooms || [])
                            .filter(r => {
                              if (!roomFilterQuery.trim()) return true;
                              const q = roomFilterQuery.toLowerCase();
                              return (
                                r.roomNumber.toLowerCase().includes(q) ||
                                r.roomName.toLowerCase().includes(q) ||
                                (r.boxedText && r.boxedText.toLowerCase().includes(q)) ||
                                (r.dmNotes && r.dmNotes.toLowerCase().includes(q))
                              );
                            })
                            .map((room, rIdx) => {
                              const isPlaced = currentRoomAnnotations.some(
                                a => a.roomNumber?.toLowerCase() === room.roomNumber.toLowerCase() ||
                                     a.label.toLowerCase().includes(room.roomNumber.toLowerCase())
                              );

                              return (
                                <div key={rIdx} className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold shrink-0">
                                        {room.roomNumber}
                                      </span>
                                      <span className="text-xs font-bold font-mono text-zinc-100 truncate">
                                        {room.roomName}
                                      </span>
                                    </div>
                                    {isPlaced ? (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold shrink-0 flex items-center gap-1">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> Placed
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[9px] font-mono shrink-0">
                                        Ready to Place
                                      </span>
                                    )}
                                  </div>

                                  {room.boxedText && (
                                    <div className="p-2 rounded-lg bg-zinc-900/70 border-l-2 border-amber-400 text-[11px] text-zinc-300 italic line-clamp-3">
                                      "{room.boxedText}"
                                    </div>
                                  )}

                                  {room.dmNotes && (
                                    <p className="text-[10px] text-zinc-400 font-mono line-clamp-2">
                                      <span className="text-amber-400 font-bold">DM Notes: </span>
                                      {room.dmNotes}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}

                  {!selectedChapter.pdfDigest && !isDigestingPdf && (
                    <div 
                      onClick={() => pdfInputRef.current?.click()}
                      className="border-2 border-dashed border-zinc-800 hover:border-blue-500/60 rounded-xl p-8 text-center cursor-pointer transition-colors group bg-zinc-950/40"
                    >
                      <CloudUpload className="w-10 h-10 text-zinc-600 group-hover:text-blue-400 mx-auto mb-2 transition-colors" />
                      <div className="text-xs font-bold font-mono text-zinc-300 group-hover:text-blue-300">
                        Click or Drop Chapter PDF Adventure Document Here
                      </div>
                      <p className="text-[11px] text-zinc-500 max-w-md mx-auto mt-1">
                        Gemini 3.8 Flash will automatically extract chapter lore, link scene storylines, and detect all numbered rooms & boxed text.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-zinc-500">
                <BookOpen className="w-12 h-12 text-zinc-700 mb-3" />
                <h3 className="text-sm font-bold font-mono text-zinc-300">No Scene or Chapter Selected</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Select a chapter on the left to upload its PDF adventure module and view detected room keys, or select a scene to edit map and tokens.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* DIALOG 1: Create Campaign Modal */}
        {showCreateCampaignModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                Create New Campaign
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Campaign Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Vecna: Eve of Ruin, Curse of Strahd"
                    value={newCampaignTitle}
                    onChange={(e) => setNewCampaignTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Description / Campaign Setting</label>
                  <textarea
                    placeholder="Adventure background, setting, goals..."
                    value={newCampaignDesc}
                    onChange={(e) => setNewCampaignDesc(e.target.value)}
                    className="w-full h-20 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCampaignModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCampaign}
                  disabled={!newCampaignTitle.trim() || isSaving}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-bold transition-all"
                >
                  Create Campaign
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG 2: Add Chapter Modal */}
        {showAddChapterModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-400" />
                Add Chapter to {selectedCampaign?.campaignTitle}
              </h3>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">Chapter Title</label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 1: Catacombs of the Undying"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddChapterModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddChapter}
                  disabled={!newChapterTitle.trim() || isSaving}
                  className="px-4 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-xs font-bold transition-all"
                >
                  Add Chapter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG 3: Add Scene Modal */}
        {showAddSceneModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                {insertAfterSceneId ? (
                  <span>
                    Add Scene Underneath &ldquo;{selectedChapter?.scenes.find(s => s.sceneId === insertAfterSceneId)?.sceneTitle || 'Scene'}&rdquo;
                  </span>
                ) : (
                  <span>Add Scene to {selectedChapter?.chapterTitle}</span>
                )}
              </h3>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">Scene Title</label>
                <input
                  type="text"
                  placeholder="e.g. Area T4 - Boss Room"
                  value={newSceneTitle}
                  onChange={(e) => setNewSceneTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              {selectedChapter && selectedChapter.scenes.length > 0 && (
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Position in Chapter</label>
                  <select
                    value={insertAfterSceneId || '__end__'}
                    onChange={(e) => setInsertAfterSceneId(e.target.value === '__end__' ? null : e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {selectedChapter.scenes.map((sc, idx) => (
                      <option key={sc.sceneId} value={sc.sceneId}>
                        Underneath &quot;{sc.sceneTitle}&quot; (Position {idx + 2})
                      </option>
                    ))}
                    <option value="__end__">At the end of chapter</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSceneModal(false);
                    setInsertAfterSceneId(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddScene}
                  disabled={!newSceneTitle.trim() || isSaving}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-xs font-bold transition-all"
                >
                  Add Scene
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG 4: Preset Battlemaps Gallery Modal */}
        {showPresetMapsModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-4xl max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col space-y-4 text-zinc-200">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-base font-bold font-mono text-white">Preset Battlemap Gallery</h3>
                    <p className="text-xs text-zinc-400">Select a high-resolution battlemap to load directly into this scene</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPresetMapsModal(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-1 sidebar-scrollbar">
                {PRESET_BATTLEMAPS.map((map) => (
                  <div
                    key={map.name}
                    onClick={() => {
                      setEditedMapUrl(map.url);
                      if (!editedTitle || editedTitle.startsWith('Scene ') || editedTitle.trim() === '') {
                        setEditedTitle(map.name);
                      }
                      if (!editedDmNotes || editedDmNotes.trim() === '') {
                        setEditedDmNotes(map.desc);
                      }
                      setShowPresetMapsModal(false);
                    }}
                    className="group relative cursor-pointer bg-zinc-900 border border-zinc-800 hover:border-amber-400/80 rounded-xl overflow-hidden flex flex-col transition-all hover:scale-[1.02] shadow-lg"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-zinc-950">
                      <img
                        src={map.url}
                        alt={map.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {map.type}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                          {map.name}
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                          {map.desc}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="mt-3 w-full py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/40 rounded-lg text-xs font-bold font-mono transition-all text-center"
                      >
                        Select Map
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* DIALOG 4: Delete Scene Confirmation Modal */}
        {sceneToDelete && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-white">Delete Scene?</h3>
                  <p className="text-xs text-zinc-400">This action cannot be undone.</p>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs space-y-2">
                <p className="text-zinc-200 font-medium leading-relaxed">
                  Are you sure you want to delete scene{' '}
                  <span className="text-red-300 font-bold font-mono bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                    "{sceneToDelete.sceneTitle}"
                  </span>
                  ?
                </p>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  The battlemap asset URL, token placements, and DM lore notes for this scene will be permanently removed from this campaign chapter.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSceneToDelete(null)}
                  disabled={isDeletingScene}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-delete-scene"
                  type="button"
                  onClick={executeDeleteScene}
                  disabled={isDeletingScene}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-lg shadow-red-950/50 active:scale-95"
                >
                  {isDeletingScene ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {isDeletingScene ? 'Deleting Scene...' : 'Delete Scene'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG 5: Delete Chapter Confirmation Modal */}
        {chapterToDelete && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-white">Delete Chapter?</h3>
                  <p className="text-xs text-zinc-400">All scenes inside this chapter will be removed.</p>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs space-y-2">
                <p className="text-zinc-200 font-medium leading-relaxed">
                  Are you sure you want to delete chapter{' '}
                  <span className="text-red-300 font-bold font-mono bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                    "{chapterToDelete.chapterTitle}"
                  </span>
                  ?
                </p>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  This will permanently delete this chapter and all associated scenes from this campaign.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChapterToDelete(null)}
                  disabled={isDeletingChapter}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-delete-chapter"
                  type="button"
                  onClick={executeDeleteChapter}
                  disabled={isDeletingChapter}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-lg shadow-red-950/50 active:scale-95"
                >
                  {isDeletingChapter ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {isDeletingChapter ? 'Deleting Chapter...' : 'Delete Chapter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG 6: Delete Campaign Confirmation Modal */}
        {campaignToDelete && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-white">Delete Campaign?</h3>
                  <p className="text-xs text-zinc-400">Entire campaign will be deleted from Firestore.</p>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs space-y-2">
                <p className="text-zinc-200 font-medium leading-relaxed">
                  Are you sure you want to delete campaign{' '}
                  <span className="text-red-300 font-bold font-mono bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                    "{campaignToDelete.campaignTitle}"
                  </span>
                  ?
                </p>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  All chapters, scenes, placed tokens, and campaign notes will be permanently deleted.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCampaignToDelete(null)}
                  disabled={isDeletingCampaign}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-delete-campaign"
                  type="button"
                  onClick={executeDeleteCampaign}
                  disabled={isDeletingCampaign}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-lg shadow-red-950/50 active:scale-95"
                >
                  {isDeletingCampaign ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {isDeletingCampaign ? 'Deleting Campaign...' : 'Delete Campaign'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Adventure PDF Ingestion Modal */}
        <CampaignPdfImporterModal
          isOpen={isPdfImporterOpen}
          onClose={() => {
            setIsPdfImporterOpen(false);
            getCampaignsList().then(setCampaigns).catch(console.warn);
          }}
          campaigns={campaigns}
          activeCampaignId={selectedCampaignId || undefined}
          activeChapterId={selectedChapterId || undefined}
          onSceneImported={(_scene, _campId, _chapId) => {
            getCampaignsList().then(setCampaigns).catch(console.warn);
          }}
        />
      </div>
    </div>
  );
};

