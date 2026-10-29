import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Copy,
  Check,
  Radio,
  Lock,
  Unlock,
  Play,
  Sparkles,
  ArrowRight,
  User,
  Heart,
  Eye,
  LogOut,
  AlertCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import type { Campaign } from '../lib/firebase';
import type { UserAccount, ClaimableHero } from '../types/auth';
import {
  findCampaignByInviteCode,
  joinCampaignWithCode,
  claimCampaignHero,
  extractClaimableHeroes,
  formatInviteCode
} from '../lib/campaignInvite';
import { getPlayerViewUrl, getJoinUrl } from '../lib/sessionUrl';
import { signInAsGuest } from '../lib/authService';

interface ConnectedLobbyUser {
  socketId: string;
  uid?: string;
  displayName: string;
  role: 'dm' | 'player' | 'spectator';
  characterName?: string;
  characterAvatar?: string;
  joinedAt: number;
}

interface JoinLobbyScreenProps {
  roomCode: string;
  currentUser: UserAccount | null;
  onExitLobby: () => void;
  onOpenAuthModal?: () => void;
}

export const JoinLobbyScreen: React.FC<JoinLobbyScreenProps> = ({
  roomCode,
  currentUser,
  onExitLobby,
  onOpenAuthModal
}) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [availableHeroes, setAvailableHeroes] = useState<ClaimableHero[]>([]);
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [joinRole, setJoinRole] = useState<'player' | 'spectator'>('player');
  const [guestName, setGuestName] = useState(currentUser?.displayName || '');
  const [connectedUsers, setConnectedUsers] = useState<ConnectedLobbyUser[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanCode = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const displayCode = formatInviteCode(cleanCode);

  useEffect(() => {
    loadRoomData();
    const interval = setInterval(fetchLiveLobbyUsers, 4000);
    return () => clearInterval(interval);
  }, [cleanCode]);

  const loadRoomData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch campaign details via Firestore/local index
      const found = await findCampaignByInviteCode(cleanCode);
      if (found) {
        setCampaign(found);
        const heroes = extractClaimableHeroes(found);
        setAvailableHeroes(heroes);

        // Pre-select player's previously claimed hero if any
        if (currentUser?.uid && found.members?.[currentUser.uid]?.claimedHeroId) {
          setSelectedHeroId(found.members[currentUser.uid].claimedHeroId!);
        }
      }

      // 2. Fetch live connected users from Node.js server API
      await fetchLiveLobbyUsers();
    } catch (err: any) {
      console.warn('Error loading room:', err);
      setErrorMsg(err.message || 'Could not connect to campaign room');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLiveLobbyUsers = async () => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(cleanCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.users) {
          setConnectedUsers(data.users);
        }
        if (data.isLocked !== undefined) {
          setIsLocked(data.isLocked);
        }
      }
    } catch {
      // Ignore background poll errors
    }
  };

  const handleCopyInviteLink = () => {
    const url = getJoinUrl(cleanCode);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      toast.success(`Invite link copied: ${url}`);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleLaunchTable = async () => {
    if (isLocked && currentUser?.uid !== campaign?.ownerUid) {
      toast.error('This room is currently locked by the Dungeon Master.');
      return;
    }

    setIsLaunching(true);
    setErrorMsg(null);

    try {
      let activeUser = currentUser;
      if (!activeUser) {
        activeUser = await signInAsGuest(guestName || 'Adventurer');
      }

      let targetSessionId = cleanCode;

      if (campaign) {
        // Register user in campaign members
        const { campaign: updatedCamp } = await joinCampaignWithCode(campaign.inviteCode || cleanCode, activeUser);
        targetSessionId = updatedCamp.campaignId;

        // If hero claimed, link it
        if (selectedHeroId && joinRole === 'player') {
          const hero = availableHeroes.find(h => h.id === selectedHeroId);
          if (hero) {
            await claimCampaignHero(updatedCamp, activeUser.uid, hero.id, hero.name);
          }
        }
      }

      toast.success('Entering tabletop...');
      const targetUrl = getPlayerViewUrl(targetSessionId);
      window.location.href = targetUrl;
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to launch table');
      setIsLaunching(false);
    }
  };

  const selectedHero = availableHeroes.find(h => h.id === selectedHeroId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100 overflow-y-auto selection:bg-amber-500 selection:text-black">
      {/* Ambient background styling */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/30 via-zinc-900/10 to-transparent" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#amber-500_1px,transparent_1px)] [background-size:32px_32px] opacity-5" />

      {/* Top Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 text-amber-400 shadow-md shadow-amber-950/40">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-wider text-zinc-100">MISTWALKER VTT</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-widest">
                Lobby
              </span>
            </div>
            <p className="text-xs text-zinc-400">Multi-Campaign Live Gathering Table</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser && !currentUser.isAnonymous ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-300">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  currentUser.displayName.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-xs font-semibold text-zinc-200">{currentUser.displayName}</span>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition"
            >
              Sign In
            </button>
          )}

          <button
            onClick={onExitLobby}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition border border-zinc-800"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Main Lobby Container */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
        {/* Error notification */}
        {errorMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Room Header Card */}
        <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800/90 shadow-2xl backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                Campaign Room
              </span>
              {isLocked ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-red-400 bg-red-950/40 border border-red-800/60">
                  <Lock className="w-3.5 h-3.5" /> Room Locked
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60">
                  <Unlock className="w-3.5 h-3.5" /> Open Table
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-zinc-100 tracking-wide">
              {campaign?.campaignTitle || `Session Table (${displayCode})`}
            </h1>

            <p className="text-sm text-zinc-400 max-w-2xl">
              {campaign?.description || 'Connect your hero, verify your seat, and launch into the live tabletop battlemap.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-400">
              <div>
                Dungeon Master: <span className="font-bold text-amber-400">{campaign?.ownerDisplayName || 'Host DM'}</span>
              </div>
              {campaign?.ddbCampaignId && (
                <span className="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/70 text-emerald-400 font-mono text-[11px]">
                  D&D Beyond #{campaign.ddbCampaignId}
                </span>
              )}
            </div>
          </div>

          {/* 6-Character Code Pill */}
          <div className="shrink-0 flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 p-2 px-4 rounded-2xl bg-zinc-950 border border-amber-500/40 shadow-inner">
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Room Code</div>
                <div className="text-2xl font-mono font-black tracking-widest text-zinc-100">{displayCode}</div>
              </div>
              <button
                onClick={handleCopyInviteLink}
                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition shadow font-bold"
                title="Copy full invite link"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-[11px] text-zinc-500">Share this code with your players</div>
          </div>
        </div>

        {/* Two-Column Layout: Left = Hero Claim & Role, Right = Table Roster & Live Players */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Hero Selection Drawer */}
          <div className="lg:col-span-2 space-y-5">
            {/* Role Switcher */}
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-zinc-200">How would you like to enter?</div>
                <div className="text-xs text-zinc-400">Choose between taking control of a hero or observing as spectator</div>
              </div>
              <div className="flex items-center p-1 rounded-xl bg-zinc-950 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setJoinRole('player')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    joinRole === 'player'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Player
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setJoinRole('spectator');
                    setSelectedHeroId(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    joinRole === 'spectator'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Spectator
                </button>
              </div>
            </div>

            {/* Guest Name input if not signed in */}
            {!currentUser && (
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                <label className="block text-xs font-bold text-zinc-300">Your Adventurer Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="e.g. Sarah"
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Character Selection Grid */}
            {joinRole === 'player' && (
              <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                      Choose Your Hero ({availableHeroes.length})
                    </h3>
                  </div>
                  {selectedHero && (
                    <span className="text-xs text-amber-400 font-bold">
                      Selected: {selectedHero.name}
                    </span>
                  )}
                </div>

                {availableHeroes.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-zinc-500 text-xs">
                    No character tokens placed in this campaign yet. You can still join as an adventurer; your DM will deploy your token upon arrival.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
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
                          className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10 scale-[1.01]'
                              : isClaimedByOther
                              ? 'bg-zinc-950/40 border-zinc-800/60 opacity-50 cursor-not-allowed'
                              : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700 group-hover:border-amber-400/50 shrink-0 flex items-center justify-center shadow">
                              {hero.avatarUrl ? (
                                <img src={hero.avatarUrl} alt={hero.name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-6 h-6 text-zinc-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-sm text-zinc-100 group-hover:text-amber-300 transition truncate">
                                {hero.name}
                              </h4>
                              {hero.classLevel && (
                                <div className="text-xs text-zinc-400 truncate">{hero.classLevel}</div>
                              )}
                              {hero.hp !== undefined && (
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
                                  <Heart className="w-3 h-3 text-red-500" />
                                  <span>{hero.hp}/{hero.maxHp} HP</span>
                                </div>
                              )}
                            </div>

                            <div className="shrink-0">
                              {isClaimedByOther ? (
                                <span className="px-2 py-1 rounded text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-500 font-semibold">
                                  Claimed
                                </span>
                              ) : isSelected ? (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 text-black shadow">
                                  <Check className="w-3.5 h-3.5" /> Ready
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded text-[11px] text-zinc-400 group-hover:text-amber-400 transition">
                                  Select
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Launch CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLaunchTable}
                disabled={isLaunching || isLocked || (!currentUser && !guestName.trim())}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-black font-black text-base uppercase tracking-wider transition-all shadow-xl shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>
                  {isLaunching
                    ? 'Connecting to Session...'
                    : joinRole === 'spectator'
                    ? 'Enter Tabletop as Spectator'
                    : selectedHero
                    ? `Enter Tabletop as ${selectedHero.name}`
                    : 'Enter Tabletop'}
                </span>
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Table Roster & Live Players */}
          <div className="space-y-5">
            <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                    Seated at Table ({connectedUsers.length})
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live</span>
                </div>
              </div>

              {connectedUsers.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-zinc-950/60 border border-zinc-800 text-zinc-500 text-xs">
                  Waiting for adventurers to pull up a chair...
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {connectedUsers.map((u, i) => (
                    <div
                      key={u.socketId || i}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-xs font-bold text-amber-400">
                          {u.characterAvatar ? (
                            <img src={u.characterAvatar} alt="" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            u.displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-zinc-200 truncate">
                            {u.displayName}
                          </div>
                          {u.characterName && (
                            <div className="text-[10px] text-amber-400 truncate">
                              Playing: {u.characterName}
                            </div>
                          )}
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'dm'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : u.role === 'spectator'
                          ? 'bg-zinc-800 text-zinc-400'
                          : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Campaign Chapter / Scene Quick Info */}
            {campaign && (
              <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 space-y-2">
                <div className="font-bold text-zinc-300">Campaign Details:</div>
                <div className="flex justify-between">
                  <span>Chapters:</span>
                  <span className="font-semibold text-zinc-200">{campaign.chapters?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Roster Members:</span>
                  <span className="font-semibold text-zinc-200">{Object.keys(campaign.members || {}).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Room ID:</span>
                  <span className="font-mono text-zinc-400">{cleanCode}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
