import React, { useState, useEffect } from 'react';
import {
  X,
  Compass,
  User,
  Shield,
  Check,
  ChevronRight,
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import type { Campaign } from '../lib/firebase';
import type { UserAccount, ClaimableHero } from '../types/auth';
import {
  findCampaignByInviteCode,
  joinCampaignWithCode,
  claimCampaignHero,
  extractClaimableHeroes
} from '../lib/campaignInvite';
import { getPlayerViewUrl } from '../lib/sessionUrl';
import { signInAsGuest } from '../lib/authService';

interface PlayerJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInviteCode?: string | null;
  currentUser: UserAccount | null;
  onJoinedCampaign?: (campaign: Campaign) => void;
}

export const PlayerJoinModal: React.FC<PlayerJoinModalProps> = ({
  isOpen,
  onClose,
  initialInviteCode,
  currentUser,
  onJoinedCampaign
}) => {
  const [inviteCode, setInviteCode] = useState(initialInviteCode || '');
  const [guestName, setGuestName] = useState('');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [availableHeroes, setAvailableHeroes] = useState<ClaimableHero[]>([]);
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialInviteCode) {
      setInviteCode(initialInviteCode);
      handleLookup(initialInviteCode);
    }
  }, [initialInviteCode]);

  if (!isOpen) return null;

  const handleLookup = async (codeToSearch?: string) => {
    const code = (codeToSearch || inviteCode).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) return;

    setIsSearching(true);
    setErrorMessage(null);
    try {
      const found = await findCampaignByInviteCode(code);
      if (!found) {
        setErrorMessage(`No campaign found with invite code "${code}". Please check with your DM.`);
        setCampaign(null);
        setAvailableHeroes([]);
      } else {
        setCampaign(found);
        const heroes = extractClaimableHeroes(found);
        setAvailableHeroes(heroes);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to search for campaign');
    } finally {
      setIsSearching(false);
    }
  };

  const handleEnterCampaign = async () => {
    if (!campaign) return;
    setIsJoining(true);
    setErrorMessage(null);

    try {
      // 1. Ensure user is authenticated (or guest sign in)
      let activeUser = currentUser;
      if (!activeUser) {
        activeUser = await signInAsGuest(guestName || 'Adventurer');
      }

      // 2. Register membership in campaign
      const { campaign: updatedCampaign } = await joinCampaignWithCode(campaign.inviteCode || inviteCode, activeUser);

      // 3. If player selected a hero, assign/claim that hero
      if (selectedHeroId) {
        const hero = availableHeroes.find(h => h.id === selectedHeroId);
        if (hero) {
          await claimCampaignHero(updatedCampaign, activeUser.uid, hero.id, hero.name);
        }
      }

      onJoinedCampaign?.(updatedCampaign);

      // 4. Redirect into isolated Player View for this campaign's session
      const targetSessionId = updatedCampaign.campaignId;
      const targetUrl = getPlayerViewUrl(targetSessionId);
      window.location.href = targetUrl;
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to join campaign table');
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Join Campaign Table</h2>
              <p className="text-xs text-zinc-400">Enter your DM's 6-character room code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!campaign ? (
            /* Step 1: Code Input */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">Campaign Invite Code</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. VAULT9"
                    maxLength={10}
                    className="flex-1 px-4 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-center font-mono text-xl tracking-widest text-amber-400 font-bold focus:outline-none focus:border-amber-500 uppercase placeholder-zinc-700"
                  />
                  <button
                    onClick={() => handleLookup()}
                    disabled={isSearching || !inviteCode.trim()}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold text-sm rounded-xl transition flex items-center gap-1.5 shadow"
                  >
                    <span>Find</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 text-xs text-zinc-400 space-y-1">
                <div className="font-semibold text-zinc-300">How do I get an invite code?</div>
                <div>Your Dungeon Master generates a 6-character code directly from their campaign top bar or Campaign Builder.</div>
              </div>
            </div>
          ) : (
            /* Step 2: Found Campaign & Hero Claiming */
            <div className="space-y-4">
              {/* Campaign summary card */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Campaign Found</span>
                    <h3 className="text-base font-bold text-zinc-100">{campaign.campaignTitle}</h3>
                    <div className="text-xs text-zinc-400">
                      DM: <span className="text-zinc-200">{campaign.ownerDisplayName || 'Dungeon Master'}</span>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded">
                    {campaign.inviteCode}
                  </span>
                </div>
                {campaign.description && (
                  <p className="text-xs text-zinc-400 line-clamp-2">{campaign.description}</p>
                )}
              </div>

              {/* Player identity info */}
              {!currentUser && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Your Adventurer Name</label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    placeholder="e.g. Sarah"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Hero claim selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">
                  Claim your Hero Character (Optional):
                </label>
                {availableHeroes.length === 0 ? (
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-500 italic text-center">
                    No characters on the active board yet. Your DM will deploy heroes upon arrival.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {availableHeroes.map(hero => {
                      const isSelected = selectedHeroId === hero.id;
                      const isClaimedByOther = hero.isClaimed && hero.claimedByUid !== currentUser?.uid;

                      return (
                        <div
                          key={hero.id}
                          onClick={() => {
                            if (!isClaimedByOther) {
                              setSelectedHeroId(isSelected ? null : hero.id);
                            }
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                              : isClaimedByOther
                              ? 'bg-zinc-950/40 border-zinc-800/50 text-zinc-500 opacity-60 cursor-not-allowed'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0 flex items-center justify-center">
                              {hero.avatarUrl ? (
                                <img src={hero.avatarUrl} alt={hero.name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-3.5 h-3.5 text-zinc-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{hero.name}</div>
                              {hero.hp !== undefined && (
                                <div className="text-[10px] text-zinc-500">HP: {hero.hp}/{hero.maxHp}</div>
                              )}
                            </div>
                          </div>
                          <div>
                            {isClaimedByOther ? (
                              <span className="text-[10px] text-zinc-500">Claimed by {hero.claimedByName}</span>
                            ) : isSelected ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                                <Check className="w-3.5 h-3.5" /> Selected
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500 hover:text-zinc-300">Click to claim</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCampaign(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  Change Code
                </button>
                <button
                  type="button"
                  onClick={handleEnterCampaign}
                  disabled={isJoining || (!currentUser && !guestName.trim())}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold text-sm transition shadow"
                >
                  <span>Launch Player Table</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
