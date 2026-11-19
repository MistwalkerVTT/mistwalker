import { Character } from './character';
import { VttEffectInstance } from '../effects/types';

export type ArenaPvpMode = '1v1' | '2v2';
export type ArenaPvpTeam = 'gold' | 'crimson';
export type ArenaPvpRoomStatus = 'waiting' | 'in_progress' | 'finished';

export interface ArenaPvpPlayer {
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
  characterSnapshot?: Character;
  team: ArenaPvpTeam;
  ready: boolean;
  connected: boolean;
  joinedAt: number;
}

export interface ArenaPvpRoomSummary {
  roomId: string;
  title: string;
  mode: ArenaPvpMode;
  status: ArenaPvpRoomStatus;
  hostClientId: string;
  hostName: string;
  mapId: string;
  mapName?: string;
  players: ArenaPvpPlayer[];
  createdAt: number;
  updatedAt: number;
}

export interface ArenaPvpMatchSnapshot {
  roomId: string;
  version: number;
  mode: ArenaPvpMode;
  mapId: string;
  combatants: any[]; // ArenaCombatant[]
  turnIndex: number;
  round: number;
  combatLogs: any[]; // ArenaLogEntry[]
  winnerTeam: ArenaPvpTeam | null;
  combatStatsMap: Record<
    string,
    { damageDealt: number; damageTaken: number; healingDealt: number; kills: number }
  >;
  doorStates?: Record<string, boolean>;
  updatedByClientId: string;
  updatedAt: number;
}

export type ArenaPvpFxEvent =
  | {
      type: 'effect';
      effect: VttEffectInstance;
      durationMs?: number;
    }
  | {
      type: 'floatingText';
      combatantId: string;
      worldX: number;
      worldY: number;
      text: string;
      style: 'damage' | 'crit' | 'heal' | 'miss' | 'condition';
    }
  | {
      type: 'screenShake';
      intensity: 'light' | 'medium' | 'heavy';
      durationMs?: number;
    }
  | {
      type: 'vignette';
      style: 'crit' | 'danger';
    }
  | {
      type: 'sound';
      soundId: string;
      volume?: number;
    }
  | {
      type: 'diceRoll';
      rollEvent: any;
    }
  | {
      type: 'toast';
      level: 'info' | 'success' | 'warning' | 'error';
      message: string;
    };

export function getPvpModeTeamCap(mode: ArenaPvpMode): number {
  return mode === '2v2' ? 2 : 1;
}
