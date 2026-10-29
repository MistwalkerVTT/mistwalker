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

  private constructor() {
    // Initialize default fallback session
    this.sessions.set('default', createInitialVttState('default'));
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

  public getSession(sessionId: string = 'default'): ActiveVttState {
    const id = this.normalizeSessionId(sessionId);
    let session = this.sessions.get(id);
    if (!session) {
      session = createInitialVttState(id);
      this.sessions.set(id, session);
      console.log(`[SessionManager] Created new isolated VTT session: "${id}"`);
    }
    return session;
  }

  public hasSession(sessionId: string): boolean {
    const id = this.normalizeSessionId(sessionId);
    return this.sessions.has(id);
  }

  public updateSession(sessionId: string, updates: Partial<ActiveVttState>): ActiveVttState {
    const id = this.normalizeSessionId(sessionId);
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
    return this.sessions.delete(id);
  }

  public listSessions(): Array<{
    sessionId: string;
    sceneTitle?: string;
    campaignId?: string;
    imageFile: string | null;
    tokenCount: number;
    updatedAt: number;
  }> {
    const list: any[] = [];
    for (const [id, s] of this.sessions.entries()) {
      list.push({
        sessionId: id,
        sceneTitle: s.activeSceneInfo?.sceneTitle,
        campaignId: s.activeSceneInfo?.campaignId,
        imageFile: s.imageFile,
        tokenCount: s.tokens.length,
        updatedAt: s.updatedAt
      });
    }
    return list;
  }
}

export const sessionManager = SessionManager.getInstance();
