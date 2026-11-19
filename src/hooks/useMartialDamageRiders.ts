// src/hooks/useMartialDamageRiders.ts
// D&D 2024 Martial Damage Riders & Weapon Mastery state manager.
// Supports: Hunter's Mark (+1d6 Force), Sneak Attack (+Xd6, 1/turn),
// Dreadful Strike (Gloom Stalker +2d6 Psychic, charges), +1 Ammo (+1 Hit / +1 Dmg),
// and Weapon Masteries (Vex Advantage, Nick free attack, Sap disadvantage).

import { useState, useCallback, useMemo } from 'react';
import type { HudActionItem, HudCharacterData } from '../types/hud';

export interface UseMartialDamageRidersProps {
  characterData?: HudCharacterData | null;
  claimedToken?: any | null;
  characterName?: string;
  classLevel?: string;
  totalLevel?: number;
  rogueLevel?: number;
  rangerLevel?: number;
  wisdomModifier?: number;
}

export interface WeaponHitOutcomeResult {
  primedVex: boolean;
  appliedSap: boolean;
  usedSneakAttack: boolean;
  usedDreadfulStrike: boolean;
}

export function useMartialDamageRiders(props: UseMartialDamageRidersProps = {}) {
  const { characterData, claimedToken } = props;

  // Resolve character name and classes dynamically
  const charName = (props.characterName || characterData?.name || claimedToken?.name || '').toLowerCase();
  const classStr = (characterData?.classLevel || claimedToken?.classOrCr || '').toLowerCase();
  const totalLvl = characterData?.totalLevel || 5;

  // Derive Rogue level (check "Rogue X" in classLevel or fallback to character context)
  const rogueLevel = useMemo(() => {
    if (typeof props.rogueLevel === 'number') return props.rogueLevel;
    const rogueMatch = classStr.match(/rogue\s*(\d+)/i);
    if (rogueMatch) return parseInt(rogueMatch[1], 10) || 1;
    if (charName.includes('noctua')) return 2; // Noctua standard Rogue 2 / Ranger 5
    if (classStr.includes('rogue')) return Math.max(1, totalLvl);
    return 0;
  }, [props.rogueLevel, classStr, charName, totalLvl]);

  // Derive Ranger / Gloom Stalker level & Wisdom modifier
  const { isGloomStalker, maxDreadfulCharges } = useMemo(() => {
    const isRanger = classStr.includes('ranger') || charName.includes('noctua');
    const isGloom =
      isRanger ||
      classStr.includes('gloom') ||
      characterData?.special?.some((s) => (s.name || '').toLowerCase().includes('dreadful strike'));
    const wisMod = typeof props.wisdomModifier === 'number' ? props.wisdomModifier : 3;
    const maxCharges = Math.max(1, wisMod);
    return { isGloomStalker: isGloom, maxDreadfulCharges: maxCharges };
  }, [classStr, charName, characterData?.special, props.wisdomModifier]);

  // Martial Rider States
  // 1. Hunter's Mark: +1d6 Force damage on weapon hits
  const [huntersMarkActive, setHuntersMarkActive] = useState<boolean>(false);
  // 2. Sneak Attack: +Xd6 weapon damage once per turn (scales ceil(rogueLevel / 2)d6)
  const [sneakAttackReady, setSneakAttackReady] = useState<boolean>(true);
  // 3. Dreadful Strike: +2d6 Psychic damage on hit (Wis mod uses per Long Rest)
  const [dreadfulStrikeActive, setDreadfulStrikeActive] = useState<boolean>(false);
  const [dreadfulStrikeChargesLeft, setDreadfulStrikeChargesLeft] = useState<number>(maxDreadfulCharges);
  // 4. +1 Ammunition inventory toggle (+1 to hit, +1 damage on ranged ammo)
  const [plusOneAmmoActive, setPlusOneAmmoActive] = useState<boolean>(false);
  // 5. Vex Mastery Advantage tracker: Hitting with a Vex weapon grants Advantage on next attack
  const [vexAdvantagePrimed, setVexAdvantagePrimed] = useState<boolean>(false);

  // Scaled Sneak Attack dice (e.g. Rogue 1-2 -> 1d6, 3-4 -> 2d6, 5-6 -> 3d6)
  const sneakAttackDice = useMemo(() => {
    const diceCount = Math.max(1, Math.ceil((rogueLevel || 1) / 2));
    return `${diceCount}d6`;
  }, [rogueLevel]);

  // Toggles
  const toggleHuntersMark = useCallback(() => setHuntersMarkActive((p) => !p), []);
  const toggleSneakAttack = useCallback(() => setSneakAttackReady((p) => !p), []);
  const toggleDreadfulStrike = useCallback(() => setDreadfulStrikeActive((p) => !p), []);
  const togglePlusOneAmmo = useCallback(() => setPlusOneAmmoActive((p) => !p), []);
  const toggleVexAdvantage = useCallback(() => setVexAdvantagePrimed((p) => !p), []);

  /**
   * Called when an attack roll is initiated:
   * Consumes Vex Advantage if it was primed for this attack.
   */
  const consumeVexAdvantageOnRoll = useCallback(() => {
    if (vexAdvantagePrimed) {
      setVexAdvantagePrimed(false);
    }
  }, [vexAdvantagePrimed]);

  /**
   * Called after an attack outcome is resolved (in PlayerView or PlayerArenaMode):
   * - Automatically primes Vex Advantage if a Vex weapon hit and dealt damage
   * - Consumes 1/turn Sneak Attack and Dreadful Strike charges upon a hit
   */
  const recordWeaponHitOutcome = useCallback(
    (weaponName: string, didHit: boolean): WeaponHitOutcomeResult => {
      const lower = (weaponName || '').toLowerCase();
      const isVexWeapon =
        lower.includes('crossbow') ||
        lower.includes('shortsword') ||
        lower.includes('rapier') ||
        lower.includes('[vex]');
      const isSapWeapon =
        lower.includes('revolver') ||
        lower.includes('mace') ||
        lower.includes('flail') ||
        lower.includes('war pick') ||
        lower.includes('[sap]');

      let usedSneakAttack = false;
      let usedDreadfulStrike = false;

      if (didHit) {
        if (dreadfulStrikeActive && dreadfulStrikeChargesLeft > 0) {
          setDreadfulStrikeChargesLeft((c) => Math.max(0, c - 1));
          setDreadfulStrikeActive(false);
          usedDreadfulStrike = true;
        }
        if (sneakAttackReady) {
          setSneakAttackReady(false);
          usedSneakAttack = true;
        }
        // Vex Weapon Mastery: Hitting a creature grants Advantage on next attack roll
        if (isVexWeapon) {
          setVexAdvantagePrimed(true);
        }
      } else {
        // Attack missed: any primed Vex advantage on this roll is consumed
        if (vexAdvantagePrimed) {
          setVexAdvantagePrimed(false);
        }
      }

      return {
        primedVex: didHit && isVexWeapon,
        appliedSap: didHit && isSapWeapon,
        usedSneakAttack,
        usedDreadfulStrike,
      };
    },
    [dreadfulStrikeActive, dreadfulStrikeChargesLeft, sneakAttackReady, vexAdvantagePrimed]
  );

  /**
   * Refreshes once-per-turn abilities when a new turn begins
   */
  const startNewTurnRefresh = useCallback(() => {
    setSneakAttackReady(true);
  }, []);

  /**
   * Restores long rest charges
   */
  const resetLongRestCharges = useCallback(() => {
    setDreadfulStrikeChargesLeft(maxDreadfulCharges);
    setSneakAttackReady(true);
  }, [maxDreadfulCharges]);

  /**
   * Enriches a weapon HudActionItem with active extra damage dice, Vex/Nick/Sap mastery badges, and Advantage flag
   */
  const applyRidersToWeaponAction = useCallback(
    (action: HudActionItem): HudActionItem => {
      const lowerName = (action.name || '').toLowerCase();
      const notes = (action.notes || action.description || '').toLowerCase();
      const isWeaponAttack =
        action.category === 'attacks' &&
        action.subCategory !== 'spell' &&
        !lowerName.includes('unarmed') &&
        Boolean(action.damageFormula);

      if (!isWeaponAttack || !action.damageFormula) return action;

      const isCrossbow = lowerName.includes('crossbow');
      const isBow = lowerName.includes('bow');
      const isRangedWeapon = isCrossbow || isBow || (action.rangeFt !== undefined && action.rangeFt >= 20);
      const isFinesse = notes.includes('finesse') || lowerName.includes('shortsword') || lowerName.includes('rapier') || lowerName.includes('dagger') || lowerName.includes('scimitar');
      const isShortsword = lowerName.includes('shortsword');
      const isScimitarOrDagger = lowerName.includes('scimitar') || lowerName.includes('dagger');
      const isRevolver = lowerName.includes('revolver') || lowerName.includes('pistol') || lowerName.includes('mace');

      // Mastery classification
      let masteryBadge = '';
      let masteryType: 'vex' | 'nick' | 'sap' | undefined = undefined;
      if (isCrossbow || isShortsword || notes.includes('vex')) {
        masteryBadge = ' [VEX]';
        masteryType = 'vex';
      } else if (isScimitarOrDagger || notes.includes('nick')) {
        masteryBadge = ' [NICK]';
        masteryType = 'nick';
      } else if (isRevolver || notes.includes('sap')) {
        masteryBadge = ' [SAP]';
        masteryType = 'sap';
      }

      // Base formula extraction (cleanly without mutating repeatedly)
      const baseFormula = action.baseDamageFormula || action.damageFormula.split(' + ')[0] || action.damageFormula;
      const extraDiceParts: string[] = [];
      const riderLabels: string[] = [];
      let extraDamageType = action.damageType || 'piercing';

      // 1. +1 Ammunition (+1 to Hit and +1 Damage on Crossbows/Bows)
      let hitBonus = action.hitBonus;
      let ammoBonusDamage = 0;
      if ((isCrossbow || isBow) && plusOneAmmoActive) {
        if (hitBonus !== undefined) {
          const numericHit = typeof hitBonus === 'number'
            ? hitBonus
            : (parseInt(String(hitBonus).replace('+', ''), 10) || 0);
          hitBonus = `+${numericHit + 1}`;
        }
        ammoBonusDamage = 1;
        riderLabels.push('+1 Bolt');
      }

      // 2. Hunter's Mark (+1d6 Force on every weapon hit)
      if (huntersMarkActive) {
        extraDiceParts.push('1d6');
        riderLabels.push("Hunter's Mark (+1d6 Force)");
        extraDamageType = 'force';
      }

      // 3. Sneak Attack (+Xd6 on Finesse or Ranged weapon, 1/turn)
      const canSneakAttack = (isFinesse || isRangedWeapon) && rogueLevel > 0;
      if (sneakAttackReady && canSneakAttack) {
        extraDiceParts.push(sneakAttackDice);
        riderLabels.push(`Sneak Attack (+${sneakAttackDice})`);
      }

      // 4. Dreadful Strike (+2d6 Psychic, 1/turn, Gloom Stalker)
      if (dreadfulStrikeActive && dreadfulStrikeChargesLeft > 0 && isGloomStalker) {
        extraDiceParts.push('2d6');
        riderLabels.push(`Dreadful Strike (+2d6 Psychic [${dreadfulStrikeChargesLeft} left])`);
        extraDamageType = 'psychic';
      }

      // Compose combined extra formula and combined total formula
      let extraFormulaStr = extraDiceParts.join(' + ');
      if (ammoBonusDamage > 0) {
        extraFormulaStr = extraFormulaStr ? `${extraFormulaStr} + ${ammoBonusDamage}` : `+${ammoBonusDamage}`;
      }
      if (extraFormulaStr && !extraFormulaStr.startsWith('+')) {
        extraFormulaStr = `+${extraFormulaStr}`;
      }

      let combinedFormula = baseFormula;
      if (ammoBonusDamage > 0 && !baseFormula.includes(`+ ${ammoBonusDamage}`)) {
        combinedFormula = `${combinedFormula} + ${ammoBonusDamage}`;
      }
      if (extraDiceParts.length > 0) {
        combinedFormula = `${combinedFormula} + ${extraDiceParts.join(' + ')}`;
      }

      // Existing extra damage (like Cleric Divine Strike) preserved if present
      if (action.extraDamageFormula && !extraFormulaStr) {
        extraFormulaStr = action.extraDamageFormula;
      }

      const advSuffix = vexAdvantagePrimed ? ' ★ ADV' : '';
      const cleanName = action.name.replace(/\s*\[(VEX|NICK|SAP)\]/gi, '').replace(/\s*★\s*ADV/gi, '').trim();

      return {
        ...action,
        name: `${cleanName}${masteryBadge}${advSuffix}`,
        hitBonus,
        baseDamageFormula: baseFormula,
        damageFormula: combinedFormula,
        extraDamageFormula: extraFormulaStr || action.extraDamageFormula,
        extraDamageType: extraDamageType || action.extraDamageType,
        extraDamageLabel: riderLabels.length > 0 ? riderLabels.join(', ') : action.extraDamageLabel,
        hasAdvantage: vexAdvantagePrimed || action.hasAdvantage,
        weaponMastery: masteryType || action.weaponMastery,
        activeRiderLabels: riderLabels,
      };
    },
    [
      dreadfulStrikeActive,
      dreadfulStrikeChargesLeft,
      huntersMarkActive,
      isGloomStalker,
      plusOneAmmoActive,
      rogueLevel,
      sneakAttackDice,
      sneakAttackReady,
      vexAdvantagePrimed,
    ]
  );

  return {
    rogueLevel,
    sneakAttackDice,
    isGloomStalker,
    huntersMarkActive,
    sneakAttackReady,
    dreadfulStrikeActive,
    dreadfulStrikeChargesLeft,
    maxDreadfulCharges,
    plusOneAmmoActive,
    vexAdvantagePrimed,
    toggleHuntersMark,
    toggleSneakAttack,
    toggleDreadfulStrike,
    togglePlusOneAmmo,
    toggleVexAdvantage,
    consumeVexAdvantageOnRoll,
    recordWeaponHitOutcome,
    startNewTurnRefresh,
    resetLongRestCharges,
    applyRidersToWeaponAction,
  };
}
