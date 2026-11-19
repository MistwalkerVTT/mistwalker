// src/effects/bubbles/applySpellBadge.ts
// Helper for finding target tokens and applying spell status badges cleanly across DM and Player views.

import { toast } from 'sonner';
import { DebuffSpellConfig, createDebuffBubbleFromConfig } from './bubbleCatalog';
import { TokenStatusBubble } from '../types/bubble';

export interface BadgeTargetToken {
  id: string;
  name?: string;
  x?: number;
  y?: number;
  size?: number;
  isPlayer?: boolean;
  isMonster?: boolean;
  category?: string;
  isCondition?: boolean;
  bubbles?: TokenStatusBubble[];
}

function isFriendlyToken(t: BadgeTargetToken): boolean {
  return Boolean(t.isPlayer || t.category === 'character' || t.category === 'ally');
}

/**
 * Resolves which tokens should receive a spell's status badge based on its targetType and AoE radius.
 */
export function resolveSpellBadgeTargets<T extends BadgeTargetToken>(params: {
  config: DebuffSpellConfig;
  allTokens: T[];
  gridSize: number;
  castPoint?: { x: number; y: number };
  aoeRadiusFt?: number;
  directTargetToken?: T | null;
  casterToken?: T | null;
}): T[] {
  const { config, allTokens, gridSize, castPoint, aoeRadiusFt, directTargetToken, casterToken } = params;
  const targetType = config.targetType || 'target';

  if (targetType === 'self') {
    return casterToken ? [casterToken] : (directTargetToken ? [directTargetToken] : []);
  }

  if ((targetType === 'aoe_enemies' || targetType === 'aoe_allies' || targetType === 'aoe_all') && castPoint && (aoeRadiusFt || 0) >= 10) {
    const radiusPx = ((aoeRadiusFt || 15) / 5) * gridSize;
    const inArea = allTokens.filter(t => {
      if (t.isCondition) return false;
      const tRad = ((t.size || 1) * gridSize) / 2;
      const cx = (t.x ?? 0) + tRad;
      const cy = (t.y ?? 0) + tRad;
      const dist = Math.hypot(cx - castPoint.x, cy - castPoint.y);
      if (dist > radiusPx + tRad) return false;
      if (targetType === 'aoe_allies') return isFriendlyToken(t);
      if (targetType === 'aoe_enemies') return !isFriendlyToken(t);
      return true;
    });
    if (inArea.length > 0) return inArea;
  }

  return directTargetToken ? [directTargetToken] : [];
}

/**
 * Schedules or immediately applies a spell badge to one or more target tokens,
 * optionally removing the cast blast effect after 2.8s for 'replace_after_cast' spells.
 */
export function scheduleSpellBadgeApplication<T extends BadgeTargetToken>(params: {
  config: DebuffSpellConfig;
  casterName: string;
  targetTokens: T[];
  effectIdToRemove?: string;
  onRemoveEffect?: (effectId: string) => void;
  updateTokens: (updater: (prev: T[]) => T[]) => void;
}) {
  const { config, casterName, targetTokens, effectIdToRemove, onRemoveEffect, updateTokens } = params;
  if (targetTokens.length === 0) return;

  const isReplace = (config.behavior ?? 'replace_after_cast') === 'replace_after_cast';
  const delayMs = isReplace ? 2800 : 650;
  const targetIds = new Set(targetTokens.map(t => t.id));
  const targetNames = targetTokens.map(t => t.name || 'Target');

  setTimeout(() => {
    if (isReplace && effectIdToRemove && onRemoveEffect) {
      onRemoveEffect(effectIdToRemove);
    }

    const bubble = createDebuffBubbleFromConfig(config, casterName);
    updateTokens(prev =>
      prev.map(t => {
        if (!targetIds.has(t.id)) return t;
        const existing = t.bubbles || [];
        const filtered = existing.filter(
          b => b.sourceSpellId !== config.spellKey && b.label !== config.name
        );
        return { ...t, bubbles: [...filtered, { ...bubble, id: `${bubble.id}_${t.id.slice(-4)}` }] };
      })
    );

    const targetLabel = targetNames.length === 1
      ? targetNames[0]
      : `${targetNames.length} tokens`;
    toast.success(`✨ ${config.name} badge added above ${targetLabel}!`, {
      description: config.description
    });
  }, delayMs);
}
