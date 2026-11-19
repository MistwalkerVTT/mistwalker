import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Folder,
  Loader2,
  LogOut,
  Plus,
  Radio,
  Shield,
  Swords,
  UserCheck,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Character } from '../types/character';
import { PresetBattlemap } from '../data/presetBattlemaps';
import {
  ArenaPvpMode,
  ArenaPvpPlayer,
  ArenaPvpRoomSummary,
  ArenaPvpTeam,
  getPvpModeTeamCap
} from '../types/arenaPvp';
import { getCharacterTokenUrl } from '../data/defaultCharacters';

interface CampaignGroup {
  campaignId: string;
  campaignTitle: string;
  characters: Character[];
}

interface ArenaPvpLobbyProps {
  myClientId: string;
  isConnected: boolean;
  playerDisplayName: string;
  onChangePlayerDisplayName: (name: string) => void;
  mySelectedHeroId: string;
  onSelectMyHero: (hero: Character) => void;
  heroPool: Character[];
  campaignGroups: CampaignGroup[];
  campaignFilter: string;
  onChangeCampaignFilter: (val: string) => void;
  availableMaps: PresetBattlemap[];
  selectedMap: PresetBattlemap;
  onSelectMap: (map: PresetBattlemap) => void;
  rooms: ArenaPvpRoomSummary[];
  activeRoom: ArenaPvpRoomSummary | null;
  onCreateRoom: (mode: ArenaPvpMode) => void;
  onJoinRoom: (roomId: string, preferredTeam?: ArenaPvpTeam) => void;
  onLeaveRoom: () => void;
  onSwitchTeam: (team: ArenaPvpTeam) => void;
  onToggleReady: () => void;
  onHostChangeMode: (mode: ArenaPvpMode) => void;
  onHostStartMatch: () => void;
}

export const ArenaPvpLobby: React.FC<ArenaPvpLobbyProps> = ({
  myClientId,
  isConnected,
  playerDisplayName,
  onChangePlayerDisplayName,
  mySelectedHeroId,
  onSelectMyHero,
  heroPool,
  campaignGroups,
  campaignFilter,
  onChangeCampaignFilter,
  availableMaps,
  selectedMap,
  onSelectMap,
  rooms,
  activeRoom,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onSwitchTeam,
  onToggleReady,
  onHostChangeMode,
  onHostStartMatch
}) => {
  const [heroSearch, setHeroSearch] = useState('');

  const myHero = useMemo(
    () => heroPool.find((h) => h.id === mySelectedHeroId) || heroPool[0],
    [heroPool, mySelectedHeroId]
  );

  const filteredHeroes = useMemo(() => {
    const q = heroSearch.trim().toLowerCase();
    return heroPool.filter((h) => {
      const matchesCamp =
        campaignFilter === 'ALL' ||
        h.ddbCampaignId === campaignFilter ||
        h.id === mySelectedHeroId;
      if (!matchesCamp) return false;
      if (!q) return true;
      return (
        h.name.toLowerCase().includes(q) ||
        (h.classLevel || '').toLowerCase().includes(q) ||
        (h.race || '').toLowerCase().includes(q)
      );
    });
  }, [heroPool, campaignFilter, heroSearch, mySelectedHeroId]);

  const handleCopyInviteLink = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'player');
    url.searchParams.set('arena', '1');
    const inviteUrl = url.toString();
    navigator.clipboard
      ?.writeText(inviteUrl)
      .then(() => {
        toast.success('Arena PvP invite link copied! Share it so opponents can join on the same page.');
      })
      .catch(() => {
        toast.info(`Share this link: ${inviteUrl}`);
      });
  };

  // =========================================================================
  // VIEW A: ACTIVE WAITING ROOM (1v1 or 2v2)
  // =========================================================================
  if (activeRoom) {
    const cap = getPvpModeTeamCap(activeRoom.mode);
    const isHost = activeRoom.hostClientId === myClientId;
    const mySlot = activeRoom.players.find((p) => p.clientId === myClientId);
    const goldPlayers = activeRoom.players.filter((p) => p.team === 'gold');
    const crimsonPlayers = activeRoom.players.filter((p) => p.team === 'crimson');

    const totalNeeded = cap * 2;
    const connectedCount = activeRoom.players.filter((p) => p.connected).length;
    const bothTeamsFull = goldPlayers.length === cap && crimsonPlayers.length === cap;
    const notReadyPlayers = activeRoom.players.filter((p) => !p.ready);
    const allReady = bothTeamsFull && notReadyPlayers.length === 0;

    const renderTeamSlots = (team: ArenaPvpTeam, teamPlayers: ArenaPvpPlayer[]) => {
      const isGold = team === 'gold';
      const slots = Array.from({ length: cap }, (_, i) => teamPlayers[i] || null);

      return (
        <div
          className={`rounded-3xl p-4 sm:p-5 border space-y-3 ${
            isGold
              ? 'bg-zinc-900/80 border-amber-500/40'
              : 'bg-zinc-900/80 border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              {isGold ? (
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              ) : (
                <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
              )}
              <div>
                <h3
                  className={`text-xs sm:text-sm font-mono font-bold ${
                    isGold ? 'text-amber-300' : 'text-rose-300'
                  }`}
                >
                  {isGold ? 'Team Gold' : 'Team Crimson'} ({teamPlayers.length}/{cap})
                </h3>
                <p className="text-[10px] text-zinc-400">
                  {isGold ? 'Left Spawn Formation' : 'Right Spawn Formation'}
                </p>
              </div>
            </div>

            {mySlot && mySlot.team !== team && teamPlayers.length < cap && (
              <button
                type="button"
                onClick={() => onSwitchTeam(team)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border cursor-pointer transition-all ${
                  isGold
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300'
                    : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-300'
                }`}
              >
                Switch to {isGold ? 'Gold' : 'Crimson'}
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {slots.map((player, idx) => {
              if (!player) {
                return (
                  <div
                    key={`${team}_empty_${idx}`}
                    className={`p-3.5 rounded-2xl border border-dashed flex items-center justify-between gap-3 ${
                      isGold
                        ? 'border-amber-500/25 bg-zinc-950/50'
                        : 'border-rose-500/25 bg-zinc-950/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-zinc-400">
                          {team === mySlot?.team ? 'Waiting for Teammate...' : 'Waiting for Opponent...'}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Open {activeRoom.mode.toUpperCase()} Slot #{idx + 1}
                        </div>
                      </div>
                    </div>
                    {mySlot && mySlot.team !== team && (
                      <button
                        type="button"
                        onClick={() => onSwitchTeam(team)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-200 cursor-pointer"
                      >
                        Claim Slot
                      </button>
                    )}
                  </div>
                );
              }

              const isMe = player.clientId === myClientId;
              const isSlotHost = player.clientId === activeRoom.hostClientId;
              const avatar = player.avatarUrl || getCharacterTokenUrl(player.characterName);

              return (
                <div
                  key={player.clientId}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    isMe
                      ? isGold
                        ? 'bg-amber-500/15 border-amber-400 shadow-md'
                        : 'bg-rose-500/15 border-rose-400 shadow-md'
                      : 'bg-zinc-950/85 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={avatar}
                      alt={player.characterName}
                      className={`w-12 h-12 rounded-xl object-cover border shrink-0 bg-zinc-900 ${
                        isGold ? 'border-amber-500/60' : 'border-rose-500/60'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-mono font-bold text-white truncate">
                          {player.characterName}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[9px] font-mono font-bold">
                            YOU
                          </span>
                        )}
                        {isSlotHost && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-mono font-bold flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" />
                            HOST
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        Player: <span className="text-zinc-200 font-semibold">{player.playerName}</span>
                        {player.classLevel ? ` • ${player.classLevel}` : ''}
                      </div>
                      {(player.maxHp || player.ac) && (
                        <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                          HP {player.maxHp || 45} • AC {player.ac || 15}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {player.ready ? (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        READY
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-mono font-bold">
                        PICKING...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {/* Waiting Room Header Banner */}
        <div className="bg-zinc-900/90 border border-amber-500/40 rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-mono font-black text-white truncate">
                  {activeRoom.title}
                </h3>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-zinc-950 text-[10px] font-mono font-black uppercase">
                  {activeRoom.mode} WAITING LOBBY
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 text-[10px] font-mono">
                  {activeRoom.roomId}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {connectedCount}/{totalNeeded} Players Joined • Map:{' '}
                <span className="text-amber-300 font-semibold">
                  {availableMaps.find((m) => m.id === activeRoom.mapId)?.name || activeRoom.mapName || selectedMap.name}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isHost && (
              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                {(['1v1', '2v2'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onHostChangeMode(m)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold cursor-pointer transition-all ${
                      activeRoom.mode === m
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Invite Link</span>
            </button>

            <button
              type="button"
              onClick={onLeaveRoom}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 border border-zinc-700 text-zinc-300 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Lobby</span>
            </button>
          </div>
        </div>

        {/* Team Gold vs Team Crimson Slots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderTeamSlots('gold', goldPlayers)}
          {renderTeamSlots('crimson', crimsonPlayers)}
        </div>

        {/* My Character Picker */}
        <div className="bg-zinc-900/75 border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
            <div>
              <h4 className="text-xs sm:text-sm font-mono font-bold text-white flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-sky-400" />
                <span>Choose Your Fighter</span>
              </h4>
              <p className="text-[10px] text-zinc-400">
                Only changes your slot — other players pick their own heroes remotely.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder="Search heroes..."
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1 text-[11px] font-mono text-zinc-200 focus:outline-none focus:border-amber-500/50 w-36 sm:w-44"
              />
              {campaignGroups.length > 1 && (
                <div className="relative flex items-center">
                  <Folder className="w-3 h-3 text-amber-400/80 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={campaignFilter}
                    onChange={(e) => onChangeCampaignFilter(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-2.5 py-1 text-[11px] font-mono text-zinc-200 focus:outline-none cursor-pointer max-w-[170px]"
                  >
                    <option value="ALL">All Campaigns ({heroPool.length})</option>
                    {campaignGroups.map((g) => (
                      <option key={g.campaignId} value={g.campaignId}>
                        {g.campaignTitle} ({g.characters.length})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
            {filteredHeroes.map((hero) => {
              const isSelected = mySlot?.characterId === hero.id || mySelectedHeroId === hero.id;
              const avatar = hero.avatarUrl || getCharacterTokenUrl(hero.name);
              return (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => onSelectMyHero(hero)}
                  className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-400 text-white shadow-md'
                      : 'bg-zinc-950/80 hover:bg-zinc-950 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <img
                    src={avatar}
                    alt={hero.name}
                    className="w-9 h-9 rounded-xl object-cover border border-zinc-700 shrink-0 bg-zinc-900"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-mono font-bold truncate">{hero.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {hero.race} • {hero.classLevel}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400">
                      HP {hero.maxHp || hero.hp} • AC {hero.ac}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ready Up & Launch Match Bar */}
        <div className="bg-zinc-900/90 border border-amber-500/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <div className="text-xs sm:text-sm font-mono font-bold text-white">
              {allReady
                ? '⚔️ All Fighters Ready!'
                : !bothTeamsFull
                ? `Waiting for players (${goldPlayers.length}/${cap} Gold vs ${crimsonPlayers.length}/${cap} Crimson)`
                : `Waiting for ${notReadyPlayers.map((p) => p.playerName || p.characterName).join(', ')} to Ready Up...`}
            </div>
            <p className="text-[11px] text-zinc-400">
              {isHost
                ? 'As Host, you can select the Arena Battlemap below and launch once everyone is Ready.'
                : `Host (${activeRoom.hostName}) will start the match once everyone is Ready.`}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              type="button"
              onClick={onToggleReady}
              className={`px-5 py-3 rounded-2xl font-mono font-black text-xs sm:text-sm border flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                mySlot?.ready
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 hover:bg-emerald-500/30'
                  : 'bg-sky-500 hover:bg-sky-400 border-sky-400 text-zinc-950 shadow-lg'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{mySlot?.ready ? 'READY (Click to Unready)' : 'READY UP'}</span>
            </button>

            {isHost && (
              <button
                type="button"
                disabled={!allReady}
                onClick={onHostStartMatch}
                className={`px-6 py-3 rounded-2xl font-mono font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
                  allReady
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-[0_0_25px_rgba(245,158,11,0.45)] cursor-pointer active:scale-95'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                }`}
              >
                <Swords className="w-4 h-4" />
                <span>START {activeRoom.mode.toUpperCase()} PVP MATCH</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: ONLINE PVP LOBBY BROWSER (CREATE OR JOIN 1v1 / 2v2)
  // =========================================================================
  const waitingRooms = rooms.filter((r) => r.status === 'waiting');
  const activeMatches = rooms.filter((r) => r.status === 'in_progress');

  return (
    <div className="space-y-4">
      {/* Top Identity + Quick Host Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Player Identity & Quick Host */}
        <div className="lg:col-span-5 bg-zinc-900/80 border border-amber-500/35 rounded-3xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-xs sm:text-sm font-mono font-bold text-amber-300">
                  Host a PvP Waiting Lobby
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Remote players on this page can join immediately
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1 border ${
                isConnected
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
              }`}
            >
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isConnected ? 'Live' : 'Offline'}</span>
            </span>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Your Player Name
              </label>
              <input
                type="text"
                value={playerDisplayName}
                onChange={(e) => onChangePlayerDisplayName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            {myHero && (
              <div className="p-2.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex items-center gap-2.5">
                <img
                  src={myHero.avatarUrl || getCharacterTokenUrl(myHero.name)}
                  alt={myHero.name}
                  className="w-10 h-10 rounded-xl object-cover border border-amber-500/50 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Entering As</div>
                  <div className="text-xs font-mono font-bold text-white truncate">{myHero.name}</div>
                  <div className="text-[10px] text-zinc-400 truncate">
                    {myHero.classLevel} • HP {myHero.maxHp || myHero.hp} • AC {myHero.ac}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={!isConnected}
              onClick={() => onCreateRoom('1v1')}
              className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-zinc-950 font-mono font-black text-xs flex flex-col items-center justify-center gap-1 cursor-pointer shadow-lg active:scale-95 transition-all"
            >
              <div className="flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Host 1v1 Duel</span>
              </div>
              <span className="text-[10px] font-semibold opacity-80">2 Players</span>
            </button>

            <button
              type="button"
              disabled={!isConnected}
              onClick={() => onCreateRoom('2v2')}
              className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 disabled:opacity-50 text-zinc-950 font-mono font-black text-xs flex flex-col items-center justify-center gap-1 cursor-pointer shadow-lg active:scale-95 transition-all"
            >
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>Host 2v2 Clash</span>
              </div>
              <span className="text-[10px] font-semibold opacity-80">4 Players</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyInviteLink}
            className="w-full py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-sky-300 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Direct Arena Invite Link</span>
          </button>
        </div>

        {/* Right: Open Waiting Lobbies */}
        <div className="lg:col-span-7 bg-zinc-900/80 border border-sky-500/35 rounded-3xl p-4 sm:p-5 space-y-3.5 flex flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="text-xs sm:text-sm font-mono font-bold text-sky-300">
                  Open Waiting Lobbies ({waitingRooms.length})
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Sign in on the same page and click Join to square off
                </p>
              </div>
            </div>
            {activeMatches.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10px] font-mono">
                {activeMatches.length} Live Match{activeMatches.length === 1 ? '' : 'es'}
              </span>
            )}
          </div>

          {waitingRooms.length === 0 ? (
            <div className="flex-1 min-h-[160px] rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 flex flex-col items-center justify-center p-6 text-center gap-2">
              <Users className="w-8 h-8 text-zinc-600" />
              <div className="text-xs font-mono font-bold text-zinc-300">
                No Open PvP Lobbies Right Now
              </div>
              <p className="text-[11px] text-zinc-500 max-w-sm">
                Click <strong className="text-amber-300">Host 1v1 Duel</strong> or{' '}
                <strong className="text-rose-300">Host 2v2 Clash</strong> on the left. Any other player who signs into this page will see your lobby here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {waitingRooms.map((room) => {
                const cap = getPvpModeTeamCap(room.mode);
                const maxPlayers = cap * 2;
                const isFull = room.players.length >= maxPlayers;
                const mapLabel =
                  availableMaps.find((m) => m.id === room.mapId)?.name || room.mapName || 'Colosseum';

                return (
                  <div
                    key={room.roomId}
                    className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 hover:border-sky-500/50 flex flex-wrap items-center justify-between gap-3 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black uppercase ${
                            room.mode === '2v2'
                              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                              : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                          }`}
                        >
                          {room.mode}
                        </span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-white truncate">
                          {room.title}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">{room.roomId}</span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">
                          {room.players.length}/{maxPlayers} Players
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">Map: {mapLabel}</span>
                        <div className="flex items-center -space-x-1.5">
                          {room.players.map((p) => (
                            <img
                              key={p.clientId}
                              src={p.avatarUrl || getCharacterTokenUrl(p.characterName)}
                              alt={p.characterName}
                              title={`${p.playerName} (${p.characterName}) — Team ${p.team}`}
                              className={`w-6 h-6 rounded-full object-cover border-2 bg-zinc-900 ${
                                p.team === 'gold' ? 'border-amber-400' : 'border-rose-400'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isFull || !isConnected}
                      onClick={() => onJoinRoom(room.roomId)}
                      className={`px-4 py-2 rounded-xl font-mono font-black text-xs flex items-center gap-1.5 transition-all shrink-0 ${
                        isFull
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : 'bg-sky-500 hover:bg-sky-400 text-zinc-950 cursor-pointer shadow-md active:scale-95'
                      }`}
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>{isFull ? 'Full' : 'Join Match'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pre-select Your Hero before creating/joining */}
      <div className="bg-zinc-900/75 border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs sm:text-sm font-mono font-bold text-white">
              Select Your Hero ({myHero?.name || 'None'})
            </h4>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
              placeholder="Search heroes..."
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1 text-[11px] font-mono text-zinc-200 focus:outline-none focus:border-amber-500/50 w-36 sm:w-44"
            />
            {campaignGroups.length > 1 && (
              <div className="relative flex items-center">
                <Folder className="w-3 h-3 text-amber-400/80 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={campaignFilter}
                  onChange={(e) => onChangeCampaignFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-2.5 py-1 text-[11px] font-mono text-zinc-200 focus:outline-none cursor-pointer max-w-[170px]"
                >
                  <option value="ALL">All Campaigns ({heroPool.length})</option>
                  {campaignGroups.map((g) => (
                    <option key={g.campaignId} value={g.campaignId}>
                      {g.campaignTitle} ({g.characters.length})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
          {filteredHeroes.map((hero) => {
            const isSelected = hero.id === mySelectedHeroId;
            const avatar = hero.avatarUrl || getCharacterTokenUrl(hero.name);
            return (
              <button
                key={hero.id}
                type="button"
                onClick={() => onSelectMyHero(hero)}
                className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                    : 'bg-zinc-950/80 hover:bg-zinc-950 border-zinc-800 text-zinc-300'
                }`}
              >
                <img
                  src={avatar}
                  alt={hero.name}
                  className="w-9 h-9 rounded-xl object-cover border border-amber-500/50 shrink-0 bg-zinc-900"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-mono font-bold truncate">{hero.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">
                    {hero.race} • {hero.classLevel}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400">
                    HP {hero.maxHp || hero.hp} • AC {hero.ac}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
