import type { Server, Socket } from 'socket.io';

export type ArenaPvpMode = '1v1' | '2v2';
export type ArenaPvpTeam = 'gold' | 'crimson';
export type ArenaPvpRoomStatus = 'waiting' | 'in_progress' | 'finished';

export interface ServerArenaPvpPlayer {
  clientId: string;
  socketId: string;
  playerName: string;
  characterId: string;
  characterName: string;
  avatarUrl: string;
  raceOrType?: string;
  classLevel?: string;
  maxHp?: number;
  ac?: number;
  characterSnapshot?: any;
  team: ArenaPvpTeam;
  ready: boolean;
  connected: boolean;
  joinedAt: number;
}

export interface ServerArenaPvpMatchSnapshot {
  roomId: string;
  version: number;
  mode: ArenaPvpMode;
  mapId: string;
  combatants: any[];
  turnIndex: number;
  round: number;
  combatLogs: any[];
  winnerTeam: ArenaPvpTeam | null;
  combatStatsMap: Record<
    string,
    { damageDealt: number; damageTaken: number; healingDealt: number; kills: number }
  >;
  doorStates?: Record<string, boolean>;
  updatedByClientId: string;
  updatedAt: number;
}

interface ServerArenaPvpRoom {
  roomId: string;
  title: string;
  mode: ArenaPvpMode;
  status: ArenaPvpRoomStatus;
  hostClientId: string;
  mapId: string;
  mapName?: string;
  players: ServerArenaPvpPlayer[];
  matchState: ServerArenaPvpMatchSnapshot | null;
  createdAt: number;
  updatedAt: number;
}

const rooms = new Map<string, ServerArenaPvpRoom>();
const socketToClient = new Map<string, { clientId: string; roomId: string }>();

function getChannel(roomId: string): string {
  return `arena_pvp_${roomId}`;
}

function getTeamCap(mode: ArenaPvpMode): number {
  return mode === '2v2' ? 2 : 1;
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  const id = `PVP-${code}`;
  return rooms.has(id) ? generateRoomId() : id;
}

function serializeRoom(room: ServerArenaPvpRoom) {
  const host = room.players.find((p) => p.clientId === room.hostClientId) || room.players[0];
  return {
    roomId: room.roomId,
    title: room.title,
    mode: room.mode,
    status: room.status,
    hostClientId: room.hostClientId,
    hostName: host?.playerName || host?.characterName || 'Host',
    mapId: room.mapId,
    mapName: room.mapName,
    players: room.players,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt
  };
}

function getRoomList() {
  const now = Date.now();
  // Prune abandoned rooms with zero connected players older than 10 minutes
  for (const [id, room] of rooms.entries()) {
    const anyConnected = room.players.some((p) => p.connected);
    if (!anyConnected && now - room.updatedAt > 10 * 60 * 1000) {
      rooms.delete(id);
    }
  }
  return Array.from(rooms.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(serializeRoom);
}

function broadcastRoomList(io: Server) {
  io.emit('ARENA_PVP_LIST_UPDATE', { rooms: getRoomList() });
}

function emitRoomState(io: Server, room: ServerArenaPvpRoom) {
  io.to(getChannel(room.roomId)).emit('ARENA_PVP_ROOM_STATE', {
    room: serializeRoom(room)
  });
}

function removeClientFromCurrentRoom(io: Server, socket: Socket, clientId?: string) {
  const mapping = socketToClient.get(socket.id);
  const targetClientId = clientId || mapping?.clientId;
  const targetRoomId = mapping?.roomId;

  let room: ServerArenaPvpRoom | undefined;
  if (targetRoomId) {
    room = rooms.get(targetRoomId);
  }
  if (!room && targetClientId) {
    for (const candidate of rooms.values()) {
      if (candidate.players.some((p) => p.clientId === targetClientId)) {
        room = candidate;
        break;
      }
    }
  }

  socketToClient.delete(socket.id);
  if (!room || !targetClientId) return;

  socket.leave(getChannel(room.roomId));
  const leavingPlayer = room.players.find((p) => p.clientId === targetClientId);
  room.players = room.players.filter((p) => p.clientId !== targetClientId);
  room.updatedAt = Date.now();

  if (room.players.length === 0) {
    rooms.delete(room.roomId);
    console.log(`[ArenaPvP] Room ${room.roomId} deleted (empty).`);
  } else {
    if (room.hostClientId === targetClientId) {
      const nextHost = room.players.find((p) => p.connected) || room.players[0];
      room.hostClientId = nextHost.clientId;
    }
    if (room.status === 'in_progress' && leavingPlayer) {
      io.to(getChannel(room.roomId)).emit('ARENA_PVP_PLAYER_DISCONNECTED', {
        roomId: room.roomId,
        clientId: targetClientId,
        playerName: leavingPlayer.playerName || leavingPlayer.characterName,
        leftVoluntarily: true
      });
    }
    emitRoomState(io, room);
  }

  broadcastRoomList(io);
}

export function registerArenaPvpSocketHandlers(io: Server, socket: Socket) {
  // 1. List open/active lobbies & auto-rejoin if clientId is already in a room
  socket.on('ARENA_PVP_LIST_REQUEST', (payload?: { clientId?: string }) => {
    socket.emit('ARENA_PVP_LIST_UPDATE', { rooms: getRoomList() });

    const clientId = payload?.clientId;
    if (!clientId) return;

    for (const room of rooms.values()) {
      const existing = room.players.find((p) => p.clientId === clientId);
      if (existing) {
        existing.socketId = socket.id;
        existing.connected = true;
        room.updatedAt = Date.now();
        socketToClient.set(socket.id, { clientId, roomId: room.roomId });
        socket.join(getChannel(room.roomId));
        emitRoomState(io, room);
        if (room.status === 'in_progress' && room.matchState) {
          socket.emit('ARENA_PVP_MATCH_STARTED', {
            room: serializeRoom(room),
            snapshot: room.matchState,
            isReconnect: true
          });
        }
        broadcastRoomList(io);
        break;
      }
    }
  });

  // 2. Create a 1v1 or 2v2 Waiting Lobby
  socket.on(
    'ARENA_PVP_CREATE_ROOM',
    (payload: {
      clientId: string;
      mode: ArenaPvpMode;
      mapId: string;
      mapName?: string;
      title?: string;
      player: Omit<ServerArenaPvpPlayer, 'socketId' | 'team' | 'ready' | 'connected' | 'joinedAt'>;
    }) => {
      if (!payload?.clientId || !payload?.player) return;
      removeClientFromCurrentRoom(io, socket, payload.clientId);

      const mode: ArenaPvpMode = payload.mode === '2v2' ? '2v2' : '1v1';
      const roomId = generateRoomId();
      const now = Date.now();
      const hostName = payload.player.playerName || payload.player.characterName || 'Challenger';

      const newRoom: ServerArenaPvpRoom = {
        roomId,
        title: payload.title?.trim() || `${hostName}'s ${mode.toUpperCase()} Arena`,
        mode,
        status: 'waiting',
        hostClientId: payload.clientId,
        mapId: payload.mapId || 'lavapit',
        mapName: payload.mapName,
        players: [
          {
            ...payload.player,
            clientId: payload.clientId,
            socketId: socket.id,
            team: 'gold',
            ready: false,
            connected: true,
            joinedAt: now
          }
        ],
        matchState: null,
        createdAt: now,
        updatedAt: now
      };

      rooms.set(roomId, newRoom);
      socketToClient.set(socket.id, { clientId: payload.clientId, roomId });
      socket.join(getChannel(roomId));

      console.log(`[ArenaPvP] Created ${mode} room ${roomId} by ${hostName}`);
      emitRoomState(io, newRoom);
      broadcastRoomList(io);
    }
  );

  // 3. Join an existing Waiting Lobby
  socket.on(
    'ARENA_PVP_JOIN_ROOM',
    (payload: {
      roomId: string;
      clientId: string;
      preferredTeam?: ArenaPvpTeam;
      player: Omit<ServerArenaPvpPlayer, 'socketId' | 'team' | 'ready' | 'connected' | 'joinedAt'>;
    }) => {
      if (!payload?.roomId || !payload?.clientId || !payload?.player) return;
      const room = rooms.get(payload.roomId);
      if (!room) {
        socket.emit('ARENA_PVP_ERROR', { message: 'That PvP lobby no longer exists.' });
        socket.emit('ARENA_PVP_LIST_UPDATE', { rooms: getRoomList() });
        return;
      }

      // Rejoin if already in this room
      const already = room.players.find((p) => p.clientId === payload.clientId);
      if (already) {
        already.socketId = socket.id;
        already.connected = true;
        room.updatedAt = Date.now();
        socketToClient.set(socket.id, { clientId: payload.clientId, roomId: room.roomId });
        socket.join(getChannel(room.roomId));
        emitRoomState(io, room);
        if (room.status === 'in_progress' && room.matchState) {
          socket.emit('ARENA_PVP_MATCH_STARTED', {
            room: serializeRoom(room),
            snapshot: room.matchState,
            isReconnect: true
          });
        }
        broadcastRoomList(io);
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('ARENA_PVP_ERROR', { message: 'That PvP match is already in progress.' });
        return;
      }

      const cap = getTeamCap(room.mode);
      const goldCount = room.players.filter((p) => p.team === 'gold').length;
      const crimsonCount = room.players.filter((p) => p.team === 'crimson').length;

      if (goldCount >= cap && crimsonCount >= cap) {
        socket.emit('ARENA_PVP_ERROR', { message: `This ${room.mode.toUpperCase()} lobby is full.` });
        return;
      }

      // Leave any other room first
      removeClientFromCurrentRoom(io, socket, payload.clientId);

      // Assign team: respect preferredTeam if open, otherwise place on Crimson first (or whichever has fewer)
      let assignedTeam: ArenaPvpTeam = 'crimson';
      if (payload.preferredTeam === 'gold' && goldCount < cap) {
        assignedTeam = 'gold';
      } else if (payload.preferredTeam === 'crimson' && crimsonCount < cap) {
        assignedTeam = 'crimson';
      } else if (crimsonCount < goldCount && crimsonCount < cap) {
        assignedTeam = 'crimson';
      } else if (goldCount < cap) {
        assignedTeam = 'gold';
      } else {
        assignedTeam = 'crimson';
      }

      room.players.push({
        ...payload.player,
        clientId: payload.clientId,
        socketId: socket.id,
        team: assignedTeam,
        ready: false,
        connected: true,
        joinedAt: Date.now()
      });
      room.updatedAt = Date.now();

      socketToClient.set(socket.id, { clientId: payload.clientId, roomId: room.roomId });
      socket.join(getChannel(room.roomId));

      console.log(
        `[ArenaPvP] ${payload.player.playerName || payload.player.characterName} joined ${room.roomId} on Team ${assignedTeam}`
      );
      emitRoomState(io, room);
      broadcastRoomList(io);
    }
  );

  // 4. Leave Waiting Lobby / Match
  socket.on('ARENA_PVP_LEAVE_ROOM', (payload?: { clientId?: string }) => {
    removeClientFromCurrentRoom(io, socket, payload?.clientId);
    socket.emit('ARENA_PVP_LEFT_ROOM', { ok: true });
  });

  // 5. Update own player slot (character pick, team swap, ready toggle)
  socket.on(
    'ARENA_PVP_UPDATE_SLOT',
    (payload: {
      roomId: string;
      clientId: string;
      updates: {
        playerName?: string;
        characterId?: string;
        characterName?: string;
        avatarUrl?: string;
        raceOrType?: string;
        classLevel?: string;
        maxHp?: number;
        ac?: number;
        characterSnapshot?: any;
        team?: ArenaPvpTeam;
        ready?: boolean;
      };
    }) => {
      if (!payload?.roomId || !payload?.clientId || !payload?.updates) return;
      const room = rooms.get(payload.roomId);
      if (!room || room.status !== 'waiting') return;

      const player = room.players.find((p) => p.clientId === payload.clientId);
      if (!player) return;

      const cap = getTeamCap(room.mode);
      if (payload.updates.team && payload.updates.team !== player.team) {
        const targetCount = room.players.filter((p) => p.team === payload.updates.team).length;
        if (targetCount >= cap) {
          socket.emit('ARENA_PVP_ERROR', {
            message: `Team ${payload.updates.team === 'gold' ? 'Gold' : 'Crimson'} is already full (${cap}/${cap}).`
          });
          return;
        }
        player.team = payload.updates.team;
        player.ready = false;
      }

      if (payload.updates.characterId && payload.updates.characterId !== player.characterId) {
        player.characterId = payload.updates.characterId;
        player.ready = false;
      }
      if (payload.updates.characterName !== undefined) player.characterName = payload.updates.characterName;
      if (payload.updates.playerName !== undefined) player.playerName = payload.updates.playerName;
      if (payload.updates.avatarUrl !== undefined) player.avatarUrl = payload.updates.avatarUrl;
      if (payload.updates.raceOrType !== undefined) player.raceOrType = payload.updates.raceOrType;
      if (payload.updates.classLevel !== undefined) player.classLevel = payload.updates.classLevel;
      if (payload.updates.maxHp !== undefined) player.maxHp = payload.updates.maxHp;
      if (payload.updates.ac !== undefined) player.ac = payload.updates.ac;
      if (payload.updates.characterSnapshot !== undefined) {
        player.characterSnapshot = payload.updates.characterSnapshot;
      }
      if (typeof payload.updates.ready === 'boolean') {
        player.ready = payload.updates.ready;
      }

      room.updatedAt = Date.now();
      emitRoomState(io, room);
      broadcastRoomList(io);
    }
  );

  // 6. Host updates room settings (1v1 <-> 2v2, map selection)
  socket.on(
    'ARENA_PVP_UPDATE_SETTINGS',
    (payload: {
      roomId: string;
      clientId: string;
      mode?: ArenaPvpMode;
      mapId?: string;
      mapName?: string;
      title?: string;
    }) => {
      if (!payload?.roomId || !payload?.clientId) return;
      const room = rooms.get(payload.roomId);
      if (!room || room.status !== 'waiting') return;
      if (room.hostClientId !== payload.clientId) return;

      if (payload.mode && payload.mode !== room.mode) {
        const nextCap = getTeamCap(payload.mode);
        const goldCount = room.players.filter((p) => p.team === 'gold').length;
        const crimsonCount = room.players.filter((p) => p.team === 'crimson').length;
        if (goldCount > nextCap || crimsonCount > nextCap) {
          socket.emit('ARENA_PVP_ERROR', {
            message: `Cannot switch to ${payload.mode.toUpperCase()} while more than ${nextCap} player(s) are on a team.`
          });
          return;
        }
        room.mode = payload.mode;
        // Reset ready states when match format changes
        room.players.forEach((p) => {
          p.ready = false;
        });
      }

      if (payload.mapId) room.mapId = payload.mapId;
      if (payload.mapName !== undefined) room.mapName = payload.mapName;
      if (payload.title !== undefined && payload.title.trim()) room.title = payload.title.trim();

      room.updatedAt = Date.now();
      emitRoomState(io, room);
      broadcastRoomList(io);
    }
  );

  // 7. Host launches the PvP Match once all slots are filled and Ready
  socket.on(
    'ARENA_PVP_START_MATCH',
    (payload: {
      roomId: string;
      clientId: string;
      snapshot: ServerArenaPvpMatchSnapshot;
    }) => {
      if (!payload?.roomId || !payload?.clientId || !payload?.snapshot) return;
      const room = rooms.get(payload.roomId);
      if (!room) {
        socket.emit('ARENA_PVP_ERROR', { message: 'PvP room not found.' });
        return;
      }
      if (room.hostClientId !== payload.clientId) {
        socket.emit('ARENA_PVP_ERROR', { message: 'Only the lobby host can launch the match.' });
        return;
      }

      const cap = getTeamCap(room.mode);
      const goldPlayers = room.players.filter((p) => p.team === 'gold' && p.connected);
      const crimsonPlayers = room.players.filter((p) => p.team === 'crimson' && p.connected);

      if (goldPlayers.length < cap || crimsonPlayers.length < cap) {
        socket.emit('ARENA_PVP_ERROR', {
          message: `Waiting for full ${room.mode.toUpperCase()} teams (${goldPlayers.length}/${cap} Gold vs ${crimsonPlayers.length}/${cap} Crimson).`
        });
        return;
      }

      const notReady = room.players.filter((p) => !p.ready);
      if (notReady.length > 0 && room.status === 'waiting') {
        socket.emit('ARENA_PVP_ERROR', {
          message: `Waiting for ${notReady.map((p) => p.playerName || p.characterName).join(', ')} to Ready Up.`
        });
        return;
      }

      room.status = 'in_progress';
      room.updatedAt = Date.now();
      room.matchState = {
        ...payload.snapshot,
        roomId: room.roomId,
        version: 1,
        updatedByClientId: payload.clientId,
        updatedAt: Date.now()
      };

      console.log(
        `[ArenaPvP] Match STARTED in ${room.roomId} (${room.mode}) with ${room.players.length} players.`
      );
      io.to(getChannel(room.roomId)).emit('ARENA_PVP_MATCH_STARTED', {
        room: serializeRoom(room),
        snapshot: room.matchState,
        isReconnect: false
      });
      broadcastRoomList(io);
    }
  );

  // 8. Live Authoritative Match State Sync (moves, attacks, spells, HP, turn advancement)
  socket.on(
    'ARENA_PVP_STATE_SYNC',
    (payload: {
      roomId: string;
      clientId: string;
      snapshot: ServerArenaPvpMatchSnapshot;
    }) => {
      if (!payload?.roomId || !payload?.clientId || !payload?.snapshot) return;
      const room = rooms.get(payload.roomId);
      if (!room || (room.status !== 'in_progress' && room.status !== 'finished')) return;

      const sender = room.players.find((p) => p.clientId === payload.clientId);
      if (!sender) return;

      const nextVersion = (room.matchState?.version || 0) + 1;
      const nextSnapshot: ServerArenaPvpMatchSnapshot = {
        ...payload.snapshot,
        roomId: room.roomId,
        version: nextVersion,
        updatedByClientId: payload.clientId,
        updatedAt: Date.now()
      };

      room.matchState = nextSnapshot;
      if (nextSnapshot.winnerTeam) {
        room.status = 'finished';
      }
      room.updatedAt = Date.now();

      // Broadcast to all other participants in the room
      socket.to(getChannel(room.roomId)).emit('ARENA_PVP_STATE_SYNC', {
        roomId: room.roomId,
        snapshot: nextSnapshot
      });
    }
  );

  // 9. Transient FX Broadcast (JB2A spells, floating damage numbers, screen shake, sound cues, 3D dice)
  socket.on(
    'ARENA_PVP_FX_EVENT',
    (payload: { roomId: string; clientId: string; event: any }) => {
      if (!payload?.roomId || !payload?.clientId || !payload?.event) return;
      const room = rooms.get(payload.roomId);
      if (!room) return;
      const sender = room.players.find((p) => p.clientId === payload.clientId);
      if (!sender) return;

      socket.to(getChannel(room.roomId)).emit('ARENA_PVP_FX_EVENT', {
        roomId: room.roomId,
        clientId: payload.clientId,
        event: payload.event
      });
    }
  );

  // 10. Return Room to Waiting Lobby (after match or rematch prep)
  socket.on('ARENA_PVP_RETURN_LOBBY', (payload: { roomId: string; clientId: string }) => {
    if (!payload?.roomId || !payload?.clientId) return;
    const room = rooms.get(payload.roomId);
    if (!room) return;
    const sender = room.players.find((p) => p.clientId === payload.clientId);
    if (!sender) return;

    room.status = 'waiting';
    room.matchState = null;
    room.players = room.players.filter((p) => p.connected);
    room.players.forEach((p) => {
      p.ready = false;
    });
    if (room.players.length === 0) {
      rooms.delete(room.roomId);
      broadcastRoomList(io);
      return;
    }
    if (!room.players.some((p) => p.clientId === room.hostClientId)) {
      room.hostClientId = room.players[0].clientId;
    }
    room.updatedAt = Date.now();

    io.to(getChannel(room.roomId)).emit('ARENA_PVP_RETURN_LOBBY', {
      room: serializeRoom(room),
      triggeredBy: sender.playerName || sender.characterName
    });
    broadcastRoomList(io);
  });

  // 11. Disconnect Cleanup
  socket.on('disconnect', () => {
    const mapping = socketToClient.get(socket.id);
    if (!mapping) return;
    socketToClient.delete(socket.id);

    const room = rooms.get(mapping.roomId);
    if (!room) return;

    const player = room.players.find((p) => p.clientId === mapping.clientId);
    if (!player) return;

    if (room.status === 'waiting') {
      // Remove immediately from waiting lobbies so there are never ghost slots
      room.players = room.players.filter((p) => p.clientId !== mapping.clientId);
      room.updatedAt = Date.now();
      if (room.players.length === 0) {
        rooms.delete(room.roomId);
        console.log(`[ArenaPvP] Deleted empty waiting room ${room.roomId} on disconnect.`);
      } else {
        if (room.hostClientId === mapping.clientId) {
          room.hostClientId = room.players[0].clientId;
        }
        emitRoomState(io, room);
      }
      broadcastRoomList(io);
    } else {
      // Active match: keep slot marked disconnected so player can refresh & rejoin
      player.connected = false;
      room.updatedAt = Date.now();
      io.to(getChannel(room.roomId)).emit('ARENA_PVP_PLAYER_DISCONNECTED', {
        roomId: room.roomId,
        clientId: player.clientId,
        playerName: player.playerName || player.characterName,
        leftVoluntarily: false
      });
      emitRoomState(io, room);
      broadcastRoomList(io);
    }
  });
}
