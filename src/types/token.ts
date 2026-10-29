import { TokenMonsterState } from '../types';

export interface Token {
  id: string;
  name: string;
  url: string;
  x: number;
  y: number;
  size: number;
  hp?: number;
  maxHp?: number;
  currentHp?: number;
  tempHp?: number;
  ac?: number;
  ddbCharacterId?: number | string;
  characterId?: string;
  allyId?: string;
  isCondition?: boolean;
  voice?: string;
  isPlayer?: boolean;
  isMonster?: boolean;
  isPlayerToken?: boolean;
  controlledBy?: string[];
  category?: 'character' | 'monster' | 'ally' | 'custom';
  visionRadius?: number; // in feet (e.g. 30, 60, 120)
  visionAngle?: number; // cone angle in degrees (e.g. 360, 90, 60)
  visionDirection?: number; // facing angle in degrees
  visionEnabled?: boolean;
  visionColor?: string;
  hidden?: boolean;
  conditions?: string[];
  auraRadius?: number;
  auraColor?: string;
  auraOpacity?: number;
  auraName?: string;
  auraPulse?: boolean;
  auras?: any[];
  speed?: number;
  elevation?: number; // Height in feet (e.g. 0, 15, 30, 60, -10)
  isFlying?: boolean;
  haloActive?: boolean;
  monsterState?: TokenMonsterState;
}
