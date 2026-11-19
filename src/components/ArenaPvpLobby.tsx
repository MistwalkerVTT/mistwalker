import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Copy,
  Crown,
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

interface ArenaPvpLobbyProps {
  myClientId: string;
  isConnected: boolean;
  playerDisplayName: string;
  onChangePlayerDisplayName: (name: string) => void;
  mySelectedHeroId: string;
  onOpenHeroPicker: () => void;
  heroPool: Character[];
  availableMaps: PresetBattlemap[];
  selectedMap: PresetBattlemap;
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
  onOpenHeroPicker,
  heroPool,
  availableMaps,
  selectedMap,
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
  const myHero = useMemo(
    () => heroPool.find((h) => h.id === mySelectedHeroId) || heroPool[0],
    [heroPool, mySelectedHeroId]
  );

  const handleCopyInviteLink = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'player');
    url.searchParams.set('arena', '1');
    const inviteUrl = url.toString();
    navigator.clipboard
      ?.writeText(inviteUrl)
      .then(() => {
        toast.success('PvP invite link copied! Share it so opponents can join on the same page.');
      })
      .catch(() => {
        toast.info(`Share this link: ${inviteUrl}`);
      });
  };

  // =========================================================================
  // VIEW A: ACTIVE WAITING ROOM (1v1 or 2v2 — Single-Screen VS Layout)
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
          className={`rounded-3xl p-4 border space-y-3 ${
            isGold
              ? 'bg-zinc-900/80 border-amber-500/35'
              : 'bg-zinc-900/80 border-rose-500/35'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              {isGold ? (
                <Shield className="w-4 h-4 text-amber-400" />
              ) : (
                <Swords className="w-4 h-4 text-rose-400" />
              )}
              <h3
                className={`text-xs sm:text-sm font-mono font-bold ${
                  isGold ? 'text-amber-300' : 'text-rose-300'
                }`}
              >
                {isGold ? 'Team Gold' : 'Team Crimson'} ({teamPlayers.length}/{cap})
              </h3>
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
                Switch Side
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
                        Join
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
                        {player.playerName}
                        {player.classLevel ? ` • ${player.classLevel}` : ''}
                      </div>
                      {(player.maxHp || player.ac) && (
                        <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                          HP {player.maxHp || 45} • AC {player.ac || 15}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isMe && (
                      <button
                        type="button"
                        onClick={onOpenHeroPicker}
                        className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-mono font-bold cursor-pointer"
                      >
                        Change
                      </button>
                    )}
                    {player.ready ? (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        READY
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-mono font-bold">
                        NOT READY
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
        {/* Waiting Room Header */}
        <div className="bg-zinc-900/90 border border-amber-500/35 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-mono font-black text-white truncate">
                  {activeRoom.title}
                </h3>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-zinc-950 text-[10px] font-mono font-black uppercase">
                  {activeRoom.mode}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {connectedCount}/{totalNeeded} Joined
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {allReady
                  ? 'All fighters ready — ready to launch!'
                  : !bothTeamsFull
                  ? `Waiting for ${totalNeeded - connectedCount} more player${totalNeeded - connectedCount === 1 ? '' : 's'}...`
                  : `Waiting for ${notReadyPlayers.map((p) => p.playerName || p.characterName).join(', ')} to Ready Up`}
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
              <span>Invite</span>
            </button>

            <button
              type="button"
              onClick={onLeaveRoom}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 border border-zinc-700 text-zinc-300 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* Team Gold vs Team Crimson Slots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderTeamSlots('gold', goldPlayers)}
          {renderTeamSlots('crimson', crimsonPlayers)}
        </div>

        {/* Ready & Start Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5">
          <button
            type="button"
            onClick={onOpenHeroPicker}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-sky-400" />
            <span>Change Hero</span>
          </button>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onToggleReady}
              className={`px-5 py-2.5 rounded-xl font-mono font-black text-xs border flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                mySlot?.ready
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 hover:bg-emerald-500/30'
                  : 'bg-sky-500 hover:bg-sky-400 border-sky-400 text-zinc-950 shadow-lg'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{mySlot?.ready ? 'Ready ✓' : 'Ready Up'}</span>
            </button>

            {isHost && (
              <button
                type="button"
                disabled={!allReady}
                onClick={onHostStartMatch}
                className={`px-6 py-2.5 rounded-xl font-mono font-black text-xs flex items-center gap-2 transition-all ${
                  allReady
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-[0_0_24px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                }`}
              >
                <Swords className="w-4 h-4" />
                <span>Start {activeRoom.mode.toUpperCase()} Battle</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: STREAMLINED ONLINE PVP LOBBY BROWSER (CREATE OR JOIN 1v1 / 2v2)
  // =========================================================================
  const waitingRooms = rooms.filter((r) => r.status === 'waiting');
  const activeMatches = rooms.filter((r) => r.status === 'in_progress');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: Your Fighter + Quick Host */}
      <div className="lg:col-span-5 bg-zinc-900/80 border border-amber-500/30 rounded-3xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-mono font-bold text-amber-300 flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-amber-400" />
            <span>Your Challenger</span>
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1 border ${
              isConnected
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
            }`}
          >
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isConnected ? 'Online' : 'Offline'}</span>
          </span>
        </div>

        {/* Compact Selected Hero Card */}
        {myHero && (
          <div className="p-3 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={myHero.avatarUrl || getCharacterTokenUrl(myHero.name)}
                alt={myHero.name}
                className="w-12 h-12 rounded-xl object-cover border border-amber-500/50 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-mono font-bold text-white truncate">{myHero.name}</div>
                <div className="text-[11px] text-zinc-400 truncate">
                  {myHero.classLevel} • HP {myHero.maxHp || myHero.hp} • AC {myHero.ac}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenHeroPicker}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-300 text-xs font-mono font-bold shrink-0 cursor-pointer"
            >
              Change
            </button>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={playerDisplayName}
            onChange={(e) => onChangePlayerDisplayName(e.target.value)}
            placeholder="Your player name..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/60 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            disabled={!isConnected}
            onClick={() => onCreateRoom('1v1')}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-zinc-950 font-mono font-black text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-lg active:scale-95 transition-all"
          >
            <div className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Host 1v1</span>
            </div>
            <span className="text-[10px] font-semibold opacity-80">2 Players</span>
          </button>

          <button
            type="button"
            disabled={!isConnected}
            onClick={() => onCreateRoom('2v2')}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 disabled:opacity-50 text-zinc-950 font-mono font-black text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-lg active:scale-95 transition-all"
          >
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>Host 2v2</span>
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
          <span>Copy Invite Link</span>
        </button>
      </div>

      {/* Right: Open Waiting Lobbies */}
      <div className="lg:col-span-7 bg-zinc-900/80 border border-sky-500/30 rounded-3xl p-4 sm:p-5 space-y-3 flex flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs sm:text-sm font-mono font-bold text-sky-300">
              Open Waiting Lobbies ({waitingRooms.length})
            </h3>
          </div>
          {activeMatches.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10px] font-mono">
              {activeMatches.length} Live
            </span>
          )}
        </div>

        {waitingRooms.length === 0 ? (
          <div className="flex-1 min-h-[200px] rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 flex flex-col items-center justify-center p-6 text-center gap-2">
            <Users className="w-7 h-7 text-zinc-600" />
            <div className="text-xs font-mono font-bold text-zinc-300">
              No Open Lobbies Yet
            </div>
            <p className="text-[11px] text-zinc-500 max-w-xs">
              Click <strong className="text-amber-300">Host 1v1</strong> or{' '}
              <strong className="text-rose-300">Host 2v2</strong> — anyone else on this page will see your lobby here right away.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {waitingRooms.map((room) => {
              const cap = getPvpModeTeamCap(room.mode);
              const maxPlayers = cap * 2;
              const isFull = room.players.length >= maxPlayers;
              const mapLabel =
                availableMaps.find((m) => m.id === room.mapId)?.name || room.mapName || selectedMap.name;

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
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        {room.players.length}/{maxPlayers} Players
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">{mapLabel}</span>
                      <div className="flex items-center -space-x-1.5">
                        {room.players.map((p) => (
                          <img
                            key={p.clientId}
                            src={p.avatarUrl || getCharacterTokenUrl(p.characterName)}
                            alt={p.characterName}
                            title={`${p.playerName} (${p.characterName})`}
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
                    <span>{isFull ? 'Full' : 'Join'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
