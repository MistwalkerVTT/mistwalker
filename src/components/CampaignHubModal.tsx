import React, { useState, useEffect } from 'react';
import {
  X,
  Compass,
  Plus,
  Play,
  Copy,
  Check,
  Users,
  Search,
  ExternalLink,
  Shield,
  FolderOpen,
  Sparkles,
  Layers,
  Crown
} from 'lucide-react';
import type { Campaign } from '../lib/firebase';
import type { UserAccount } from '../types/auth';
import { getCampaignsList, saveCampaignDoc } from '../lib/firebase';
import { ensureCampaignInvite, generateInviteCode } from '../lib/campaignInvite';
import { getDmViewUrl, getJoinUrl } from '../lib/sessionUrl';

interface CampaignHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onOpenCampaignBuilder?: () => void;
  onOpenJoinModal?: (code?: string) => void;
  onSelectCampaignSession?: (campaignId: string) => void;
}

export const CampaignHubModal: React.FC<CampaignHubModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenCampaignBuilder,
  onOpenJoinModal,
  onSelectCampaignSession
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickCode, setQuickCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDdbId, setNewDdbId] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const list = await getCampaignsList();
      // Ensure all campaigns have invite codes and member structures
      const updatedList = await Promise.all(
        list.map(c => ensureCampaignInvite(c, currentUser?.uid, currentUser?.displayName))
      );
      setCampaigns(updatedList);
    } catch (err) {
      console.warn('Failed to load campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInviteLink = (code: string) => {
    const url = getJoinUrl(code);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    });
  };

  const handleCreateNewCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const code = generateInviteCode();
    const campId = 'camp-' + Date.now().toString(36);
    const newCamp: Campaign = {
      campaignId: campId,
      campaignTitle: newTitle.trim(),
      description: newDesc.trim() || 'Custom tabletop campaign',
      createdAt: Date.now(),
      ownerUid: currentUser?.uid,
      ownerDisplayName: currentUser?.displayName || 'Dungeon Master',
      inviteCode: code,
      ddbCampaignId: newDdbId.trim() || undefined,
      members: currentUser?.uid ? {
        [currentUser.uid]: {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Dungeon Master',
          role: 'dm',
          joinedAt: Date.now()
        }
      } : {},
      chapters: []
    };

    try {
      await saveCampaignDoc(newCamp);
      setCampaigns(prev => [newCamp, ...prev]);
      setShowCreateForm(false);
      setNewTitle('');
      setNewDesc('');
      setNewDdbId('');
    } catch (err) {
      console.error('Failed to create campaign:', err);
    }
  };

  const handleLaunchGame = (campaign: Campaign) => {
    onClose();
    if (onSelectCampaignSession) {
      onSelectCampaignSession(campaign.campaignId);
    } else {
      window.location.href = getDmViewUrl(campaign.campaignId);
    }
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.campaignTitle.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.inviteCode && c.inviteCode.toLowerCase().includes(q))
    );
  });

  // Separate owned (DM) vs joined (Player)
  const dmCampaigns = filteredCampaigns.filter(c => {
    if (!currentUser) return true;
    return !c.ownerUid || c.ownerUid === currentUser.uid || c.coDmUids?.includes(currentUser.uid);
  });

  const playerCampaigns = filteredCampaigns.filter(c => {
    if (!currentUser) return false;
    return c.ownerUid !== currentUser.uid && c.members?.[currentUser.uid]?.role === 'player';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 text-amber-400">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-zinc-100 tracking-wide">MISTWALKER CAMPAIGN HUB</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                  Multi-DM
                </span>
              </div>
              <p className="text-xs text-zinc-400">Manage, launch, and share live tabletop campaigns</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Search Bar */}
        <div className="p-4 bg-zinc-950/40 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Search box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter campaigns or invite codes..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Quick Join by Code */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={quickCode}
              onChange={e => setQuickCode(e.target.value.toUpperCase())}
              placeholder="JOIN CODE"
              maxLength={8}
              className="w-28 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-center text-amber-400 placeholder-zinc-600 focus:outline-none focus:border-amber-500 uppercase"
            />
            <button
              onClick={() => {
                if (quickCode.trim() && onOpenJoinModal) {
                  onClose();
                  onOpenJoinModal(quickCode.trim());
                }
              }}
              disabled={!quickCode.trim()}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold rounded-xl transition"
            >
              Join
            </button>
          </div>

          {/* Create Campaign Button */}
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl transition shadow"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>

        {/* Modal Body / Scrollable Cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Create Campaign Slide-in Form */}
          {showCreateForm && (
            <form onSubmit={handleCreateNewCampaign} className="p-5 rounded-2xl bg-zinc-950 border border-amber-500/40 space-y-4 animate-fade-in shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Create New Adventure Campaign</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Campaign Title *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Keys from the Golden Vault"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">D&D Beyond Campaign ID (Optional)</label>
                  <input
                    type="text"
                    value={newDdbId}
                    onChange={e => setNewDdbId(e.target.value)}
                    placeholder="e.g. 6738033"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Description / Adventure Synopsis</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="A heist-themed module in the city of waterdeep..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl"
                >
                  Create & Generate Invite Code
                </button>
              </div>
            </form>
          )}

          {/* DM Campaigns Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>My DM Campaigns ({dmCampaigns.length})</span>
              </div>
            </div>

            {dmCampaigns.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-zinc-950/40 border border-zinc-800/80 text-zinc-500 text-xs">
                No DM campaigns created yet. Click "+ New Campaign" above to build your first adventure.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dmCampaigns.map(camp => {
                  const memberCount = Object.keys(camp.members || {}).length;
                  const sceneCount = camp.chapters?.reduce((acc, ch) => acc + (ch.scenes?.length || 0), 0) || 0;
                  const isCopied = copiedCode === camp.inviteCode;

                  return (
                    <div
                      key={camp.campaignId}
                      className="group flex flex-col justify-between p-5 rounded-2xl bg-zinc-950 border border-zinc-800/90 hover:border-amber-500/50 transition-all duration-200 shadow-md hover:shadow-amber-500/5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-zinc-100 group-hover:text-amber-400 transition truncate">
                              {camp.campaignTitle}
                            </h3>
                            <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">
                              {camp.description || 'Custom adventure world'}
                            </p>
                          </div>
                          {camp.inviteCode && (
                            <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 font-mono text-xs font-bold text-amber-400">
                              <span>{camp.inviteCode}</span>
                              <button
                                onClick={() => handleCopyInviteLink(camp.inviteCode!)}
                                title="Copy Player Invite Link"
                                className="p-1 hover:text-white transition"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                            <Layers className="w-3 h-3 text-zinc-500" />
                            {sceneCount} {sceneCount === 1 ? 'Scene' : 'Scenes'}
                          </span>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                            <Users className="w-3 h-3 text-zinc-500" />
                            {memberCount} {memberCount === 1 ? 'Adventurer' : 'Adventurers'}
                          </span>
                          {camp.ddbCampaignId && (
                            <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 font-mono text-[10px]">
                              DDB #{camp.ddbCampaignId}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            onClose();
                            onOpenCampaignBuilder?.();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition flex items-center gap-1"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Builder</span>
                        </button>

                        <button
                          onClick={() => handleLaunchGame(camp)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition shadow"
                        >
                          <Play className="w-3.5 h-3.5 fill-black" />
                          <span>Launch Live Table</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Joined Campaigns (Player View) */}
          {playerCampaigns.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Campaigns I'm Playing In ({playerCampaigns.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playerCampaigns.map(camp => {
                  const member = camp.members?.[currentUser?.uid || ''];

                  return (
                    <div
                      key={camp.campaignId}
                      className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-zinc-100">{camp.campaignTitle}</h4>
                        <div className="text-xs text-zinc-400">
                          DM: <span className="text-zinc-200">{camp.ownerDisplayName || 'Dungeon Master'}</span>
                        </div>
                        {member?.claimedHeroName && (
                          <div className="mt-1 text-xs text-amber-400 font-semibold">
                            Hero: {member.claimedHeroName}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          onClose();
                          window.location.href = getDmViewUrl(camp.campaignId);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
                      >
                        Enter Table
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
