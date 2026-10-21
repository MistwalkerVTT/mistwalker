import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Check,
  Shield,
  Heart,
  Sparkles,
  Lock,
  Globe,
  ExternalLink,
  Loader2,
  X,
  ArrowRight,
  User
} from 'lucide-react';
import { Character } from '../types/character';
import { resolveTokenCharacterStats, getCharacterTokenUrl, isDdbMatch } from '../data/defaultCharacters';
import { isMonsterToken } from '../types';

export interface PlayerCharacterChoiceItem {
  id: string;
  name: string;
  race: string;
  classLevel: string;
  avatarUrl: string;
  currentHp: number;
  maxHp: number;
  ac: number;
  speed: string;
  tokenId?: string;
  ddbCharacterId?: string;
  isOnMap: boolean;
  isClaimed: boolean;
}

export interface PlayerCharacterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: any[];
  compendiumCharacters: Character[];
  claimedTokenId: string | null;
  onSelectCharacter: (choice: PlayerCharacterChoiceItem) => void;
  onReleaseCharacter?: () => void;
  onPromptPrivacy: (details: {
    characterId: string;
    characterName: string;
    avatarUrl?: string;
    choice: PlayerCharacterChoiceItem;
  }) => void;
}

export const PlayerCharacterSelectModal: React.FC<PlayerCharacterSelectModalProps> = ({
  isOpen,
  onClose,
  tokens = [],
  compendiumCharacters = [],
  claimedTokenId,
  onSelectCharacter,
  onReleaseCharacter,
  onPromptPrivacy
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingCharId, setCheckingCharId] = useState<string | null>(null);

  // Build the list of selectable player characters, filtering out all monsters
  const characterChoices = useMemo<PlayerCharacterChoiceItem[]>(() => {
    const list: PlayerCharacterChoiceItem[] = [];
    const seenNames = new Set<string>();

    // 1. First gather all valid player/ally tokens on the current battlemap
    tokens.forEach((t) => {
      if (!t || t.isCondition) return;
      const isAlly = t.category === 'ally' || Boolean((t as any).allyId);
      const isMonster = !isAlly && (isMonsterToken(t) || t.isMonster === true || t.category === 'monster' || t.isPlayer === false);
      if (isMonster) return; // Strict: Monsters never appear to players

      const name = (t.name || '').trim();
      if (!name) return;
      const lowerName = name.toLowerCase();
      seenNames.add(lowerName);

      const stats = resolveTokenCharacterStats(t, compendiumCharacters);
      const isClaimed = claimedTokenId === t.id;

      // Extract D&D Beyond character ID if present on token
      let ddbId: string | undefined = undefined;
      if ((t as any).ddbCharacterId) {
        ddbId = String((t as any).ddbCharacterId).replace(/^char_ddb_/, '').trim();
      } else if (String(t.id).startsWith('char_ddb_')) {
        ddbId = String(t.id).replace(/^char_ddb_/, '').trim();
      }

      // If token didn't have DDB ID directly, try finding match in compendium
      if (!ddbId) {
        const compMatch = compendiumCharacters.find(c =>
          isDdbMatch(name, t.characterId || t.id, undefined, (c as any).ddbCharacterId || c.id, c.name)
        );
        if (compMatch) {
          const raw = (compMatch as any).ddbCharacterId || (String(compMatch.id).startsWith('char_ddb_') ? String(compMatch.id).replace(/^char_ddb_/, '') : undefined);
          if (raw) ddbId = String(raw).trim();
        }
      }

      const avatarSrc = t.url || t.avatarUrl || getCharacterTokenUrl(name);

      list.push({
        id: t.id,
        tokenId: t.id,
        name,
        race: (t as any).race || stats.race || 'Humanoid',
        classLevel: (t as any).classLevel || stats.classLevel || 'Hero',
        avatarUrl: avatarSrc,
        currentHp: typeof t.hp === 'number' ? t.hp : (stats.currentHp ?? 20),
        maxHp: typeof t.maxHp === 'number' ? t.maxHp : (stats.maxHp ?? 20),
        ac: typeof t.ac === 'number' ? t.ac : (stats.ac ?? 14),
        speed: (t as any).speed || stats.speed || '30 ft.',
        ddbCharacterId: ddbId,
        isOnMap: true,
        isClaimed
      });
    });

    // 2. Add any compendium characters that aren't on the map yet
    compendiumCharacters.forEach((c) => {
      if (!c || !c.name) return;
      const lowerName = c.name.trim().toLowerCase();
      if (seenNames.has(lowerName)) {
        // If already in list from token, backfill any missing details
        const existing = list.find(item => item.name.toLowerCase() === lowerName);
        if (existing) {
          if (!existing.ddbCharacterId && (c as any).ddbCharacterId) {
            existing.ddbCharacterId = String((c as any).ddbCharacterId).replace(/^char_ddb_/, '').trim();
          }
          if (c.race && existing.race === 'Humanoid') existing.race = c.race;
          if (c.classLevel && existing.classLevel === 'Hero') existing.classLevel = c.classLevel;
        }
        return;
      }
      seenNames.add(lowerName);

      let ddbId: string | undefined = undefined;
      if ((c as any).ddbCharacterId) {
        ddbId = String((c as any).ddbCharacterId).replace(/^char_ddb_/, '').trim();
      } else if (String(c.id).startsWith('char_ddb_')) {
        ddbId = String(c.id).replace(/^char_ddb_/, '').trim();
      }

      const isClaimed = typeof window !== 'undefined'
        ? (localStorage.getItem('mistwalker_player_claimed_name') || '').trim().toLowerCase() === lowerName
        : false;

      list.push({
        id: c.id,
        name: c.name,
        race: c.race || 'Humanoid',
        classLevel: c.classLevel || 'Hero',
        avatarUrl: c.avatarUrl || getCharacterTokenUrl(c.name),
        currentHp: c.hp || c.maxHp || 20,
        maxHp: c.maxHp || 20,
        ac: c.ac || 14,
        speed: c.speed || '30 ft.',
        ddbCharacterId: ddbId,
        isOnMap: false,
        isClaimed
      });
    });

    // Sort: Claimed first, then on-map tokens, then alphabetically
    return list.sort((a, b) => {
      if (a.isClaimed && !b.isClaimed) return -1;
      if (!a.isClaimed && b.isClaimed) return 1;
      if (a.isOnMap && !b.isOnMap) return -1;
      if (!a.isOnMap && b.isOnMap) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [tokens, compendiumCharacters, claimedTokenId]);

  // Filter by search query
  const filteredChoices = useMemo(() => {
    if (!searchQuery.trim()) return characterChoices;
    const q = searchQuery.toLowerCase().trim();
    return characterChoices.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.classLevel.toLowerCase().includes(q) ||
      c.race.toLowerCase().includes(q)
    );
  }, [characterChoices, searchQuery]);

  if (!isOpen) return null;

  // Handle character selection with privacy inspection
  const handleSelect = async (choice: PlayerCharacterChoiceItem) => {
    if (choice.ddbCharacterId) {
      setCheckingCharId(choice.id);
      try {
        const res = await fetch(`/api/ddb/characters/${choice.ddbCharacterId}/privacy`);
        if (res.ok) {
          const privacy = await res.json();
          if (privacy.isPrivate) {
            // Sheet is private! Prompt them with the quicklink modal
            onPromptPrivacy({
              characterId: choice.ddbCharacterId,
              characterName: choice.name,
              avatarUrl: choice.avatarUrl,
              choice
            });
            return;
          }
        }
      } catch (err) {
        console.warn('[PlayerCharacterSelectModal] Privacy check error:', err);
      } finally {
        setCheckingCharId(null);
      }
    }

    // Public or non-DDB character: select immediately
    onSelectCharacter(choice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950/95 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col ring-1 ring-white/10">
        {/* Subtle top gold glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent rounded-t-3xl" />

        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 font-mono tracking-tight">
                Choose Your Adventurer
              </h2>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Select which character you are playing today to unlock your interactive D&D Beyond HUD & vision.
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search heroes by name or class..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/60 rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Character Card Grid */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 min-h-[300px]">
          {filteredChoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 font-mono text-xs text-center">
              <User className="w-10 h-10 mb-2 text-zinc-600 opacity-60" />
              <span>No matching characters found.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredChoices.map((choice) => {
                const isCheckingThis = checkingCharId === choice.id;

                return (
                  <div
                    key={choice.id}
                    onClick={() => !isCheckingThis && handleSelect(choice)}
                    className={`group relative rounded-2xl p-4 border transition-all text-left flex flex-col justify-between cursor-pointer overflow-hidden transform hover:scale-[1.01] active:scale-[0.99] ${
                      choice.isClaimed
                        ? 'bg-emerald-950/40 border-emerald-500/70 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                        : 'bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800 hover:border-amber-500/50 shadow-md'
                    }`}
                  >
                    {/* Top Row: Avatar + Name + Class */}
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <div className={`w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 border flex items-center justify-center ${
                            choice.isClaimed ? 'border-emerald-400' : 'border-zinc-700 group-hover:border-amber-500/50'
                          }`}>
                            {choice.avatarUrl ? (
                              <img src={choice.avatarUrl} alt={choice.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-zinc-500" />
                            )}
                          </div>
                          {choice.isClaimed && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-emerald-500 text-zinc-950 flex items-center justify-center font-bold shadow">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-white font-mono truncate group-hover:text-amber-300">
                              {choice.name}
                            </h3>
                          </div>
                          <div className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
                            {[choice.race, choice.classLevel].filter(Boolean).join(' • ')}
                          </div>
                        </div>
                      </div>

                      {/* Stat Badges: HP & AC & Speed */}
                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-zinc-800/80 text-[11px] font-mono">
                        <div className="flex items-center gap-1 text-emerald-400">
                          <Heart className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{choice.currentHp}/{choice.maxHp} HP</span>
                        </div>
                        <span className="text-zinc-600">•</span>
                        <div className="flex items-center gap-1 text-amber-400">
                          <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>AC {choice.ac}</span>
                        </div>
                        <span className="text-zinc-600">•</span>
                        <div className="text-zinc-400">
                          <span>{choice.speed}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Source & D&D Beyond Tag + Action Button */}
                    <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {choice.ddbCharacterId ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono font-bold">
                            <Sparkles className="w-2.5 h-2.5" />
                            D&D Beyond
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-mono">
                            Local Sheet
                          </span>
                        )}

                        {choice.isOnMap ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                            On Map
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 text-[10px] font-mono">
                            Compendium
                          </span>
                        )}
                      </div>

                      {/* Button / Claim Action */}
                      <div className="shrink-0">
                        {isCheckingThis ? (
                          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying...</span>
                          </div>
                        ) : choice.isClaimed ? (
                          <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                            <span>Claimed</span>
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-xs font-mono font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
                            <span>Play</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer: Explanatory tip & Release button */}
        <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-zinc-500">
          <div>
            Tip: Setting your character sheet to <strong className="text-zinc-300">Public</strong> on D&D Beyond enables real-time HP & spell slot sync.
          </div>

          {claimedTokenId && onReleaseCharacter && (
            <button
              type="button"
              onClick={() => {
                onReleaseCharacter();
                onClose();
              }}
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-500/30 transition-colors cursor-pointer shrink-0"
            >
              Release Character
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
