import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import type { SceneToken } from '../types';
import type { Character } from '../types/character';
import type { WildShapeBeastForm, ActiveWildShapeState } from '../types/wildShape';

const STORAGE_PREFIX = 'mistwalker_active_wildshape_';

export interface UseWildShapeLifecycleProps {
  token: SceneToken | null | undefined;
  character: Character | null | undefined;
  druidLevelOverride?: number;
  onUpdateToken: (tokenId: string, updates: Partial<SceneToken> & { isFlying?: boolean; elevation?: number }) => void;
  onTriggerTransformFx?: (x: number, y: number, isReverting: boolean) => void;
}

export interface UseWildShapeLifecycleReturn {
  isWildShaped: boolean;
  activeState: ActiveWildShapeState | null;
  druidLevel: number;
  wisMod: number;
  maxCrAllowed: number;
  canFly: boolean;
  transformIntoBeast: (beast: WildShapeBeastForm) => void;
  revertToNormalForm: (reason?: 'manual' | 'zero_hp' | 'expired') => void;
  filterAvailableBeasts: (allBeasts: WildShapeBeastForm[]) => WildShapeBeastForm[];
}

function parseDruidLevel(classLevelStr?: string, fallback = 2): number {
  if (!classLevelStr) return fallback;
  const druidMatch = classLevelStr.match(/druid\s*(\d+)/i);
  if (druidMatch && druidMatch[1]) {
    return Math.min(20, Math.max(1, parseInt(druidMatch[1], 10)));
  }
  const anyNumberMatch = classLevelStr.match(/(\d+)/);
  if (anyNumberMatch && anyNumberMatch[1]) {
    return Math.min(20, Math.max(1, parseInt(anyNumberMatch[1], 10)));
  }
  return fallback;
}

function parseVisionRadiusFt(sensesStr?: string, defaultRadius = 60): number {
  if (!sensesStr) return defaultRadius;
  const matches = [...sensesStr.matchAll(/(?:darkvision|blindsight)\s+(\d+)\s*ft/gi)];
  if (matches.length === 0) return defaultRadius;
  return Math.max(...matches.map((m) => parseInt(m[1], 10)));
}

function getMoonDruidMaxCr(level: number): number {
  if (level >= 18) return 6;
  if (level >= 15) return 5;
  if (level >= 12) return 4;
  if (level >= 9) return 3;
  if (level >= 6) return 2;
  if (level >= 2) return 1;
  return 0;
}

export function useWildShapeLifecycle({
  token,
  character,
  druidLevelOverride,
  onUpdateToken,
  onTriggerTransformFx,
}: UseWildShapeLifecycleProps): UseWildShapeLifecycleReturn {
  const tokenId = token?.id;

  const [activeState, setActiveState] = useState<ActiveWildShapeState | null>(() => {
    if (!tokenId || typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${tokenId}`);
      return raw ? (JSON.parse(raw) as ActiveWildShapeState) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!tokenId || typeof window === 'undefined') {
      setActiveState(null);
      return;
    }
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${tokenId}`);
      setActiveState(raw ? (JSON.parse(raw) as ActiveWildShapeState) : null);
    } catch {
      setActiveState(null);
    }
  }, [tokenId]);

  const saveActiveState = useCallback(
    (newState: ActiveWildShapeState | null) => {
      setActiveState(newState);
      if (!tokenId || typeof window === 'undefined') return;
      try {
        if (newState) {
          localStorage.setItem(`${STORAGE_PREFIX}${tokenId}`, JSON.stringify(newState));
        } else {
          localStorage.removeItem(`${STORAGE_PREFIX}${tokenId}`);
        }
      } catch (err) {
        console.warn('[useWildShapeLifecycle] Failed to persist state:', err);
      }
    },
    [tokenId]
  );

  const druidLevel = useMemo(
    () => druidLevelOverride ?? parseDruidLevel(character?.classLevel, 2),
    [druidLevelOverride, character?.classLevel]
  );

  const wisMod = useMemo(() => {
    const charWithWis = character as (Character & { wis?: number }) | null | undefined;
    const wisScore = charWithWis?.wis ?? character?.stats?.wis ?? 16;
    return Math.floor((wisScore - 10) / 2);
  }, [character]);

  const maxCrAllowed = useMemo(() => getMoonDruidMaxCr(druidLevel), [druidLevel]);
  const canFly = druidLevel >= 8;

  const tokenRef = useRef<SceneToken | null | undefined>(token);
  tokenRef.current = token;

  const transformIntoBeast = useCallback(
    (beast: WildShapeBeastForm) => {
      const currentToken = tokenRef.current;
      if (!currentToken) {
        toast.error('No active token selected on the battlemap for Wild Shape.');
        return;
      }

      if (beast.crNum > maxCrAllowed) {
        toast.error(`${beast.name} (CR ${beast.cr}) exceeds your Max CR of ${maxCrAllowed}.`);
        return;
      }

      if (beast.requiresFly && !canFly) {
        toast.error(`${beast.name} requires Druid Level 8+ to assume flying forms.`);
        return;
      }

      const baseSnapshot: ActiveWildShapeState = activeState
        ? {
            ...activeState,
            beastFormId: beast.id,
            beastName: beast.name,
            tempHpGranted: druidLevel * 3,
            startedAt: Date.now(),
            durationHours: Math.max(1, Math.floor(druidLevel / 2)),
            canRadiantStrikes: druidLevel >= 14,
          }
        : {
            originalName: currentToken.name,
            originalAvatarUrl: currentToken.avatarUrl,
            originalSize: currentToken.size ?? 1,
            originalAc: currentToken.ac ?? character?.ac ?? 14,
            originalSpeed: `${currentToken.speed ?? 30} ft.`,
            originalWalkSpeedFt: currentToken.speed ?? 30,
            beastFormId: beast.id,
            beastName: beast.name,
            tempHpGranted: druidLevel * 3,
            startedAt: Date.now(),
            durationHours: Math.max(1, Math.floor(druidLevel / 2)),
            canRadiantStrikes: druidLevel >= 14,
          };

      const moonAc = Math.max(beast.baseAc, 13 + wisMod);
      const moonTempHp = druidLevel * 3;
      const primarySpeed =
        beast.flySpeedFt && beast.walkSpeedFt < 15 ? beast.flySpeedFt : beast.walkSpeedFt;
      const parsedVisionRadius = parseVisionRadiusFt(
        beast.senses,
        currentToken.visionRadius ?? 60
      );

      const isCurrentFlying = Boolean((currentToken as { isFlying?: boolean }).isFlying);

      saveActiveState(baseSnapshot);

      onUpdateToken(currentToken.id, {
        name: `${baseSnapshot.originalName} (${beast.name})`,
        avatarUrl: beast.avatarUrl,
        size: beast.sizeMultiplier,
        ac: moonAc,
        tempHp: moonTempHp,
        speed: primarySpeed,
        visionRadius: parsedVisionRadius,
        isFlying: Boolean(beast.flySpeedFt && isCurrentFlying),
      });

      if (onTriggerTransformFx) {
        onTriggerTransformFx(currentToken.x, currentToken.y, false);
      }

      toast.success(
        `Wild Shaped into ${beast.name}! Granted ${moonTempHp} Temp HP & AC ${moonAc}.`
      );
    },
    [
      activeState,
      canFly,
      character?.ac,
      druidLevel,
      maxCrAllowed,
      onTriggerTransformFx,
      onUpdateToken,
      saveActiveState,
      wisMod,
    ]
  );

  const revertToNormalForm = useCallback(
    (reason: 'manual' | 'zero_hp' | 'expired' = 'manual') => {
      const currentToken = tokenRef.current;
      if (!currentToken || !activeState) return;

      const {
        originalName,
        originalAvatarUrl,
        originalSize,
        originalAc,
        originalWalkSpeedFt,
      } = activeState;

      saveActiveState(null);

      onUpdateToken(currentToken.id, {
        name: originalName,
        avatarUrl: originalAvatarUrl,
        size: originalSize,
        ac: originalAc,
        speed: originalWalkSpeedFt,
        tempHp: 0,
        isFlying: false,
        elevation: 0,
      });

      if (onTriggerTransformFx) {
        onTriggerTransformFx(currentToken.x, currentToken.y, true);
      }

      if (reason === 'zero_hp') {
        toast.warning(`${originalName} dropped to 0 HP and reverted from Wild Shape!`);
      } else if (reason === 'expired') {
        toast.info(`${originalName}'s Wild Shape duration expired.`);
      } else {
        toast.info(`${originalName} reverted to normal form.`);
      }
    },
    [activeState, onTriggerTransformFx, onUpdateToken, saveActiveState]
  );

  const currentHpValue = token?.currentHp ?? token?.hp;
  useEffect(() => {
    if (!activeState || !token) return;
    if (typeof currentHpValue === 'number' && currentHpValue <= 0) {
      revertToNormalForm('zero_hp');
    }
  }, [activeState, currentHpValue, revertToNormalForm, token]);

  const filterAvailableBeasts = useCallback(
    (allBeasts: WildShapeBeastForm[]): WildShapeBeastForm[] => {
      return allBeasts.filter(
        (b) => b.minLevel <= druidLevel && b.crNum <= maxCrAllowed && (!b.requiresFly || canFly)
      );
    },
    [canFly, druidLevel, maxCrAllowed]
  );

  return {
    isWildShaped: Boolean(activeState),
    activeState,
    druidLevel,
    wisMod,
    maxCrAllowed,
    canFly,
    transformIntoBeast,
    revertToNormalForm,
    filterAvailableBeasts,
  };
}
