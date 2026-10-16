import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  X,
  Play,
  Search,
  Users,
  ChevronRight,
  ChevronDown,
  Layers,
  MapPin,
  ExternalLink,
  Shield,
  Heart,
  Sliders,
  Sparkles,
  Trash2,
  RefreshCw,
  Video
} from 'lucide-react';
import { Campaign, Scene } from '../lib/firebase';
import { isVideoAsset } from '../lib/storageCache';
import { DEMO_GV_CAMPAIGN, DEMO_GV_CHAPTER, DEMO_GV_SCENE, DEMO_GV_ROOM_ZONES, DEMO_GV_TOKENS, DEMO_GV_PDF_DIGEST } from '../data/demoCampaignGv';

interface LoadCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: Campaign[];
  onLoadScene: (scene: Scene, campaignId: string, chapterId: string, targetView?: 'DM1' | 'DM2' | 'DM3') => void;
  onOpenCampaignManager: () => void;
  activeSceneInfo?: {
    campaignId: string;
    chapterId: string;
    sceneId: string;
    sceneTitle: string;
  } | null;
  onDeleteScene?: (sceneId: string, campaignId: string, chapterId: string) => Promise<void> | void;
}

export const LoadCampaignModal: React.FC<LoadCampaignModalProps> = ({
  isOpen,
  onClose,
  campaigns,
  onLoadScene,
  onOpenCampaignManager,
  activeSceneInfo,
  onDeleteScene
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingSceneTarget, setDeletingSceneTarget] = useState<{
    sceneId: string;
    sceneTitle: string;
    campaignId: string;
    chapterId: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDeleteScene = async () => {
    if (!deletingSceneTarget || !onDeleteScene) return;
    setIsDeleting(true);
    try {
      await onDeleteScene(
        deletingSceneTarget.sceneId,
        deletingSceneTarget.campaignId,
        deletingSceneTarget.chapterId
      );
      setDeletingSceneTarget(null);
    } catch (err) {
      console.error('Failed to delete scene:', err);
    } finally {
      setIsDeleting(false);
    }
  };
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});

  // Reset to collapsed when modal opens
  useEffect(() => {
    if (isOpen) {
      setExpandedCampaigns({});
    }
  }, [isOpen]);

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Prepend Demo Campaign if not already present in database, and always ensure latest rooms & tokens
  const allCampaigns = useMemo(() => {
    if (campaigns.some(c => c.campaignId === DEMO_GV_CAMPAIGN.campaignId)) {
      return campaigns.map(c => {
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
      });
    }
    return [DEMO_GV_CAMPAIGN, ...campaigns];
  }, [campaigns]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return allCampaigns;
    const q = searchQuery.toLowerCase();
    return allCampaigns.filter(camp => {
      if (camp.campaignTitle.toLowerCase().includes(q)) return true;
      if (camp.description?.toLowerCase().includes(q)) return true;
      return camp.chapters.some(ch =>
        ch.chapterTitle.toLowerCase().includes(q) ||
        ch.scenes.some(sc =>
          sc.sceneTitle.toLowerCase().includes(q) ||
          sc.dmNotes?.toLowerCase().includes(q)
        )
      );
    });
  }, [allCampaigns, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                Load Scene from Campaign
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Firebase Connected
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Instantly load battlemaps, saved tokens, and DM notes onto the tactical canvas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenCampaignManager();
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-all"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Full Campaign Manager
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns, chapters, scenes, or notes..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 sidebar-scrollbar">
          {filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-sm text-zinc-400 font-mono">No matching campaigns or scenes found.</p>
              <button
                onClick={() => {
                  onClose();
                  onOpenCampaignManager();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-xs transition-all shadow-md"
              >
                Create New Campaign in Manager
              </button>
            </div>
          ) : (
            filteredCampaigns.map((camp) => {
              const isExpanded = expandedCampaigns[camp.campaignId] ?? true;
              const totalScenes = camp.chapters.reduce((acc, ch) => acc + ch.scenes.length, 0);

              return (
                <div
                  key={camp.campaignId}
                  className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden transition-all"
                >
                  {/* Campaign Header */}
                  <div
                    onClick={() => toggleCampaign(camp.campaignId)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-900/80 transition-colors border-b border-zinc-800/60 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-zinc-500 hover:text-zinc-300">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100 font-mono flex items-center gap-2">
                          {camp.campaignTitle}
                          {camp.campaignId === 'keys-from-golden-vault-agile-hand' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                              ★ Prebuilt Demo
                            </span>
                          )}
                        </h3>
                        {camp.description && (
                          <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5 font-sans">
                            {camp.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {camp.chapters.length} Chapters • {totalScenes} Scenes
                      </span>
                    </div>
                  </div>

                  {/* Chapters and Scenes */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-zinc-950/40">
                      {camp.chapters.map((chapter) => (
                        <div key={chapter.chapterId} className="space-y-2">
                          <div className="flex items-center gap-2 px-1">
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            <h4 className="text-xs font-bold font-mono text-zinc-300">
                              {chapter.chapterTitle}
                            </h4>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              ({chapter.scenes.length} scenes)
                            </span>
                          </div>

                          {chapter.scenes.length === 0 ? (
                            <div className="p-3 text-center text-xs text-zinc-600 font-mono border border-dashed border-zinc-800/80 rounded-xl">
                              No scenes in this chapter yet.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {chapter.scenes.map((scene) => {
                                const isActive = activeSceneInfo?.sceneId === scene.sceneId;

                                return (
                                  <div
                                    key={scene.sceneId}
                                    className={`group relative bg-zinc-900 border rounded-xl overflow-hidden p-3 flex flex-col justify-between transition-all hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-950/20 ${
                                      isActive
                                        ? 'border-emerald-500 bg-emerald-950/10 ring-1 ring-emerald-500/40'
                                        : 'border-zinc-800/80'
                                    }`}
                                  >
                                    <div className="flex gap-3 items-start">
                                      {/* Map Thumbnail */}
                                      <div className="w-24 h-16 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 relative flex items-center justify-center">
                                        {scene.mapThumbnailUrl ? (
                                          <>
                                            <img
                                              src={scene.mapThumbnailUrl}
                                              alt={scene.sceneTitle}
                                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                              referrerPolicy="no-referrer"
                                            />
                                            {isVideoAsset(scene.mapUrl) && (
                                              <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-emerald-400 font-mono text-[7px] font-bold border border-emerald-500/30">
                                                VID
                                              </span>
                                            )}
                                          </>
                                        ) : scene.mapUrl ? (
                                          isVideoAsset(scene.mapUrl) ? (
                                            <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
                                              <video
                                                src={scene.mapUrl}
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                className="w-full h-full object-cover"
                                              />
                                              <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-emerald-400 font-mono text-[7px] font-bold border border-emerald-500/30">
                                                VID
                                              </span>
                                            </div>
                                          ) : (
                                            <img
                                              src={scene.mapUrl}
                                              alt={scene.sceneTitle}
                                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                              referrerPolicy="no-referrer"
                                            />
                                          )
                                        ) : (
                                          <MapPin className="w-5 h-5 text-zinc-700" />
                                        )}
                                      </div>

                                      {/* Info */}
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex items-center justify-between gap-1">
                                          <h5 className="text-xs font-bold font-mono text-zinc-100 truncate group-hover:text-emerald-300 transition-colors">
                                            {scene.sceneTitle}
                                          </h5>
                                          {isActive && (
                                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono shrink-0 border border-emerald-500/40">
                                              ACTIVE
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-zinc-400">
                                          <span className="flex items-center gap-1 text-blue-300">
                                            <Users className="w-3 h-3 text-blue-400" />
                                            {scene.tokens?.length || 0} tokens
                                          </span>
                                          {scene.walls && scene.walls.length > 0 && (
                                            <>
                                              <span>•</span>
                                              <span className="flex items-center gap-1 text-emerald-400">
                                                <Shield className="w-3 h-3 text-emerald-400" />
                                                {scene.walls.length} walls/doors
                                              </span>
                                            </>
                                          )}
                                          {scene.roomAnnotations && scene.roomAnnotations.length > 0 && (
                                            <>
                                              <span>•</span>
                                              <span className="flex items-center gap-1 text-amber-400">
                                                <MapPin className="w-3 h-3 text-amber-400" />
                                                {scene.roomAnnotations.length} rooms
                                              </span>
                                            </>
                                          )}
                                          <span>•</span>
                                          <span>Grid: {scene.gridSize || 50}px</span>
                                        </div>

                                        {scene.dmNotes && (
                                          <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                                            {scene.dmNotes}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Action row */}
                                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                                      {scene.tokens && scene.tokens.length > 0 ? (
                                        <div className="flex items-center -space-x-1.5 overflow-hidden max-w-[140px]">
                                          {scene.tokens.slice(0, 4).map((tok) => (
                                            <img
                                              key={tok.id}
                                              src={tok.avatarUrl || 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Varrak.png/:/rs=w:1440,h:1440'}
                                              alt={tok.name}
                                              title={tok.name}
                                              className="w-5 h-5 rounded-full border border-zinc-900 object-cover"
                                              referrerPolicy="no-referrer"
                                            />
                                          ))}
                                          {scene.tokens.length > 4 && (
                                            <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 text-[8px] font-mono text-zinc-300 flex items-center justify-center">
                                              +{scene.tokens.length - 4}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-zinc-600 font-mono">No tokens saved</span>
                                      )}

                                      <div className="flex items-center gap-1.5 ml-auto">
                                        {onDeleteScene && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeletingSceneTarget({
                                                sceneId: scene.sceneId,
                                                sceneTitle: scene.sceneTitle,
                                                campaignId: camp.campaignId,
                                                chapterId: chapter.chapterId
                                              });
                                            }}
                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            title={`Delete Scene "${scene.sceneTitle}"`}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}

                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              onLoadScene(scene, camp.campaignId, chapter.chapterId);
                                              onClose();
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 active:scale-95"
                                            title="Load Scene to Active View"
                                          >
                                            <Play className="w-3.5 h-3.5 fill-white" />
                                            Load Live
                                          </button>
                                          {(['DM1', 'DM2', 'DM3'] as const).map(dmSlot => (
                                            <button
                                              key={dmSlot}
                                              type="button"
                                              onClick={() => {
                                                onLoadScene(scene, camp.campaignId, chapter.chapterId, dmSlot);
                                                onClose();
                                              }}
                                              className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-bold font-mono text-[10px] transition-all"
                                              title={`Load Scene into ${dmSlot} View`}
                                            >
                                              {dmSlot}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Scene Confirmation Modal */}
      {deletingSceneTarget && (
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
                  "{deletingSceneTarget.sceneTitle}"
                </span>
                ?
              </p>
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                The battlemap, token placements, and notes will be permanently removed from this chapter.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSceneTarget(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-all"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-scene-load-modal"
                type="button"
                onClick={handleConfirmDeleteScene}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-lg shadow-red-950/50 active:scale-95"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {isDeleting ? 'Deleting Scene...' : 'Delete Scene'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
