import { repairMonsterToken } from '../src/data/srdMonstersCatalog';

export interface ActiveVttState {
  sessionId: string;
  imageFile: string | null;
  mapDimensions: { width: number; height: number };
  tokens: any[];
  walls: any[];
  reveals: any[];
  polygonReveals: any[];
  isFogVisible: boolean;
  gridVisible: boolean;
  gridOpacity: number;
  gridSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  visionConfig: any;
  roomAnnotations: any[];
  mapRotation: number;
  activeSceneInfo: any;
  characters: any[];
  effects: any[];
  combatants?: any[];
  combatRound?: number;
  combatTurnIndex?: number;
  showCombatTracker?: boolean;
  autoApplyMonsterDamage?: boolean;
  updatedAt: number;
}

export interface ConnectedLobbyUser {
  socketId: string;
  uid?: string;
  displayName: string;
  role: 'dm' | 'player' | 'spectator';
  characterName?: string;
  characterAvatar?: string;
  joinedAt: number;
}

const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateRoomCode(length = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return result;
}

export function formatRoomCode(code: string): string {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length > 3) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
  }
  return clean;
}

export function createInitialVttState(sessionId: string = 'default'): ActiveVttState {
  return {
    sessionId,
    imageFile: null,
    mapDimensions: { width: 1920, height: 1080 },
    tokens: [],
    walls: [],
    reveals: [],
    polygonReveals: [],
    isFogVisible: true,
    gridVisible: true,
    gridOpacity: 0.3,
    gridSize: 50,
    gridOffsetX: 0,
    gridOffsetY: 0,
    visionConfig: {
      enabled: true,
      explorationMemory: true,
      darknessOpacity: 1.0,
      dimVisionOpacity: 0.5,
      ambientLight: false,
      dmPreviewMode: false,
      showDoorBadges: false,
    },
    roomAnnotations: [],
    mapRotation: 0,
    activeSceneInfo: null,
    characters: [],
    effects: [],
    combatants: [],
    combatRound: 1,
    combatTurnIndex: 0,
    showCombatTracker: true,
    autoApplyMonsterDamage: true,
    updatedAt: Date.now()
  };
}

export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, ActiveVttState> = new Map();
  private roomCodes: Map<string, string> = new Map(); // clean roomCode -> sessionId
  private sessionCodes: Map<string, string> = new Map(); // sessionId -> clean roomCode
  private roomUsers: Map<string, Map<string, ConnectedLobbyUser>> = new Map(); // sessionId -> Map(socketId, user)
  private roomLocks: Map<string, boolean> = new Map(); // sessionId -> isLocked

  private constructor() {
    // Initialize default fallback session
    this.sessions.set('default', createInitialVttState('default'));
    this.bindRoomCode('MAIN99', 'default');
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public normalizeSessionId(rawId?: string | null): string {
    if (!rawId || typeof rawId !== 'string') return 'default';
    const clean = rawId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return clean || 'default';
  }

  public normalizeRoomCode(rawCode?: string | null): string {
    if (!rawCode || typeof rawCode !== 'string') return '';
    return rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  public bindRoomCode(rawCode: string, sessionId: string) {
    const code = this.normalizeRoomCode(rawCode);
    const sId = this.normalizeSessionId(sessionId);
    if (!code || !sId) return;

    this.roomCodes.set(code, sId);
    this.sessionCodes.set(sId, code);
  }

  public resolveRoomCode(rawCodeOrSession: string): string {
    const code = this.normalizeRoomCode(rawCodeOrSession);
    if (this.roomCodes.has(code)) {
      return this.roomCodes.get(code)!;
    }
    // Check if it's already a valid sessionId
    const sId = this.normalizeSessionId(rawCodeOrSession);
    return sId;
  }

  public getOrCreateRoomCode(sessionId: string, preferredCode?: string): string {
    const sId = this.normalizeSessionId(sessionId);
    if (this.sessionCodes.has(sId)) {
      return this.sessionCodes.get(sId)!;
    }

    let code = preferredCode ? this.normalizeRoomCode(preferredCode) : '';
    if (!code || this.roomCodes.has(code)) {
      code = generateRoomCode();
      while (this.roomCodes.has(code)) {
        code = generateRoomCode();
      }
    }

    this.bindRoomCode(code, sId);
    return code;
  }

  public getSession(sessionId: string = 'default'): ActiveVttState {
    const resolvedId = this.resolveRoomCode(sessionId);
    const id = this.normalizeSessionId(resolvedId);
    let session = this.sessions.get(id);
    if (!session) {
      session = createInitialVttState(id);
      this.sessions.set(id, session);
      this.getOrCreateRoomCode(id);
      console.log(`[SessionManager] Created new isolated VTT session: "${id}"`);
    }
    return session;
  }

  public hasSession(sessionId: string): boolean {
    const resolvedId = this.resolveRoomCode(sessionId);
    const id = this.normalizeSessionId(resolvedId);
    return this.sessions.has(id);
  }

  public updateSession(sessionId: string, updates: Partial<ActiveVttState>): ActiveVttState {
    const resolvedId = this.resolveRoomCode(sessionId);
    const id = this.normalizeSessionId(resolvedId);
    const existing = this.getSession(id);
    
    const repairedTokens = Array.isArray(updates.tokens)
      ? updates.tokens.map((t: any) => repairMonsterToken(t))
      : existing.tokens;

    const nextState: ActiveVttState = {
      ...existing,
      ...updates,
      tokens: repairedTokens,
      sessionId: id,
      updatedAt: Date.now()
    };

    if (updates.activeSceneInfo && updates.imageFile) {
      nextState.activeSceneInfo.mapUrl = updates.imageFile;
    }

    this.sessions.set(id, nextState);
    return nextState;
  }

  public deleteSession(sessionId: string): boolean {
    const id = this.normalizeSessionId(sessionId);
    if (id === 'default') {
      // Reset default rather than deleting
      this.sessions.set('default', createInitialVttState('default'));
      return true;
    }
    const code = this.sessionCodes.get(id);
    if (code) {
      this.roomCodes.delete(code);
      this.sessionCodes.delete(id);
    }
    this.roomUsers.delete(id);
    this.roomLocks.delete(id);
    return this.sessions.delete(id);
  }

  // --- Connected Users & Lobby Management ---

  public addUserToRoom(sessionId: string, user: ConnectedLobbyUser) {
    const id = this.normalizeSessionId(sessionId);
    let users = this.roomUsers.get(id);
    if (!users) {
      users = new Map();
      this.roomUsers.set(id, users);
    }
    users.set(user.socketId, user);
  }

  public removeUserFromRoom(sessionId: string, socketId: string): ConnectedLobbyUser | null {
    const id = this.normalizeSessionId(sessionId);
    const users = this.roomUsers.get(id);
    if (!users) return null;
    const removed = users.get(socketId) || null;
    users.delete(socketId);
    return removed;
  }

  public getUser(sessionId: string, socketId: string): ConnectedLobbyUser | null {
    const id = this.normalizeSessionId(sessionId);
    const users = this.roomUsers.get(id);
    return users?.get(socketId) || null;
  }

  public getRoomUsers(sessionId: string): ConnectedLobbyUser[] {
    const id = this.normalizeSessionId(sessionId);
    const users = this.roomUsers.get(id);
    return users ? Array.from(users.values()) : [];
  }

  public isRoomLocked(sessionId: string): boolean {
    const id = this.normalizeSessionId(sessionId);
    return !!this.roomLocks.get(id);
  }

  public setRoomLock(sessionId: string, locked: boolean): boolean {
    const id = this.normalizeSessionId(sessionId);
    this.roomLocks.set(id, locked);
    return locked;
  }

  public listSessions(): Array<{
    sessionId: string;
    roomCode: string;
    sceneTitle?: string;
    campaignId?: string;
    imageFile: string | null;
    tokenCount: number;
    userCount: number;
    isLocked: boolean;
    updatedAt: number;
  }> {
    const list: any[] = [];
    for (const [id, s] of this.sessions.entries()) {
      const code = this.getOrCreateRoomCode(id);
      const userCount = this.getRoomUsers(id).length;
      const isLocked = this.isRoomLocked(id);
      list.push({
        sessionId: id,
        roomCode: code,
        sceneTitle: s.activeSceneInfo?.sceneTitle,
        campaignId: s.activeSceneInfo?.campaignId,
        imageFile: s.imageFile,
        tokenCount: s.tokens.length,
        userCount,
        isLocked,
        updatedAt: s.updatedAt
      });
    }
    return list;
  }
}

export const sessionManager = SessionManager.getInstance();
