import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Folder,
  Users,
  RefreshCw,
  CheckCircle2,
  Shield,
  Heart,
  Swords,
  Monitor,
  Tv,
  ArrowRight,
  Loader2,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Character } from '../types/character';
import { DEFAULT_CHARACTERS, resolveTokenCharacterStats } from '../data/defaultCharacters';
import {
  KNOWN_DDB_CAMPAIGNS,
  resolveCharacterCampaign,
  groupCharactersByCampaign
} from '../data/ddbCampaignRegistry';

export interface CampaignSummaryOption {
  id: string;
  title: string;
  isPrimary?: boolean;
  characterCount: number;
  previewHeroNames?: string[];
  description?: string;
}

export interface PlayerCampaignSelectModalProps {
  isOpen: boolean;
  targetMode: 'remote_player' | 'tv_table' | 'arena';
  onClose: () => void;
  onBackToModes?: () => void;
  currentCampaignId?: string;
  compendiumCharacters?: Character[];
  onConfirmCampaign: (selected: {
    campaignId: string;
    campaignTitle: string;
    characters: Character[];
    selectedCharacter?: Character;
  }) => void;
}

export const PlayerCampaignSelectModal: React.FC<PlayerCampaignSelectModalProps> = ({
  isOpen,
  targetMode,
  onClose,
  onBackToModes,
  currentCampaignId = '6738033',
  compendiumCharacters = [],
  onConfirmCampaign
}) => {
  const [selectedCampId, setSelectedCampId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('mistwalker_player_campaign_id');
      if (saved) return saved;
    }
    return currentCampaignId || '6738033';
  });

  const [campaignList, setCampaignList] = useState<CampaignSummaryOption[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [confirmedCharacters, setConfirmedCharacters] = useState<Character[]>([]);
  const [lastSyncedTime, setLastSyncedTime] = useState<number | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Pool of all characters (compendium + defaults)
  const allKnownCharacters = useMemo<Character[]>(() => {
    const list: Character[] = [];
    const seen = new Set<string>();

    for (const c of [...(compendiumCharacters || []), ...DEFAULT_CHARACTERS]) {
      if (!c || !c.name) continue;
      const key = (c.name || '').toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(c);
      }
    }
    return list;
  }, [compendiumCharacters]);

  // Build the campaign list options from known registry + API
  const buildInitialCampaigns = useCallback((): CampaignSummaryOption[] => {
    const groups = groupCharactersByCampaign(allKnownCharacters);
    const options: CampaignSummaryOption[] = [];

    // 1. Primary: Keys from the Golden Vault
    const gvGroup = groups.find((g) => g.campaignId === '6738033');
    options.push({
      id: '6738033',
      title: 'Keys from the Golden Vault',
      isPrimary: true,
      characterCount: gvGroup ? gvGroup.characters.length : 8,
      previewHeroNames: ['Noctua', 'Varrak', 'Aggie', 'Rowan', 'Sylas', "G'aiah"],
      description: 'Active heist campaign featuring Noctua, Varrak, Rowan, Aggie, and the Golden Vault party.'
    });

    // 2. Primary: An Unspeakable Power
    const aupGroup = groups.find((g) => g.campaignId === '3290944');
    options.push({
      id: '3290944',
      title: 'An Unspeakable Power (but this time with a vengeance)',
      isPrimary: true,
      characterCount: aupGroup ? aupGroup.characters.length : 6,
      previewHeroNames: ['Aziza', 'Burmi', 'Stavros', 'Etho', 'Arameng', 'Zal-tan'],
      description: 'Epic campaign party featuring Aziza, Burmi, Stavros, Etho, Arameng, and Zal-tan.'
    });

    // 3. Other known campaigns with registered heroes
    for (const group of groups) {
      if (group.campaignId === '6738033' || group.campaignId === '3290944' || group.campaignId === 'custom') {
        continue;
      }
      options.push({
        id: group.campaignId,
        title: group.campaignTitle,
        characterCount: group.characters.length,
        previewHeroNames: group.characters.slice(0, 4).map((c) => c.name.split(/[\s"'(]/)[0]),
        description: `Connected D&D Beyond Campaign with ${group.characters.length} registered adventurers.`
      });
    }

    // 4. Custom & Pre-Gen Heroes option
    options.push({
      id: 'ALL',
      title: 'All Campaigns & Custom Heroes',
      characterCount: allKnownCharacters.length,
      previewHeroNames: ['All Available Adventurers'],
      description: 'Show every registered hero across all campaigns and pre-gen character sheets.'
    });

    return options;
  }, [allKnownCharacters]);

  // Load campaign list and fetch remote DDB campaigns
  useEffect(() => {
    setCampaignList(buildInitialCampaigns());

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ddb/campaigns');
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data.campaigns)) {
            setCampaignList((prev) => {
              const next = [...prev];
              for (const c of data.campaigns) {
                if (!c.id) continue;
                const existingIdx = next.findIndex((item) => item.id === String(c.id));
                if (existingIdx === -1) {
                  next.splice(next.length - 1, 0, {
                    id: String(c.id),
                    title: c.name || `Campaign ${c.id}`,
                    characterCount: c.characterCount || 0,
                    description: 'Imported from your active D&D Beyond account.'
                  });
                }
              }
              return next;
            });
          }
        }
      } catch {
        // Fallback to offline built-in campaigns
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [buildInitialCampaigns]);

  // Pull & refresh characters for a given campaign
  const pullCampaignCharacters = useCallback(
    async (campaignId: string) => {
      setIsRefreshing(true);
      setSyncNotice('Refreshing & pulling campaign players from D&D Beyond...');

      try {
        // Step 1: Tell server to select and poll this campaign
        if (campaignId !== 'ALL' && !campaignId.startsWith('custom')) {
          try {
            await fetch('/api/ddb/campaigns/select', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ campaignId })
            });
          } catch {
            // Server offline or local dev, proceed with local registry
          }
        }

        // Step 2: Fetch characters for this campaign
        let fetchedList: any[] = [];
        if (campaignId !== 'ALL' && !campaignId.startsWith('custom')) {
          try {
            const res = await fetch(`/api/ddb/campaigns/${campaignId}/characters`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.characters)) {
                fetchedList = data.characters;
              }
            }
          } catch {
            // Ignore API fetch error, will use offline pool
          }
        }

        // Step 3: Match / merge with known local characters
        const resolved: Character[] = [];
        const seenNames = new Set<string>();

        // If remote characters were returned, convert and prioritize them
        if (fetchedList.length > 0) {
          for (const d of fetchedList) {
            const dName = (d.name || '').trim();
            if (!dName || seenNames.has(dName.toLowerCase())) continue;
            seenNames.add(dName.toLowerCase());

            const localMatch = allKnownCharacters.find(
              (c) =>
                c.name.toLowerCase() === dName.toLowerCase() ||
                String((c as any).ddbCharacterId) === String(d.id)
            );

            resolved.push({
              ...(localMatch || {}),
              id: localMatch?.id || `char_ddb_${d.id}`,
              ddbCharacterId: d.id,
              name: dName,
              race: d.race || localMatch?.race || 'Humanoid',
              classLevel: d.classLevel || localMatch?.classLevel || 'Hero',
              alignment: localMatch?.alignment || 'Neutral',
              avatarUrl: d.avatarUrl || localMatch?.avatarUrl || '',
              ac: d.ac ?? localMatch?.ac ?? 14,
              hp: d.currentHp ?? d.hp ?? localMatch?.hp ?? 25,
              maxHp: d.maxHp ?? localMatch?.maxHp ?? 25,
              speed: d.speed || localMatch?.speed || '30 ft.',
              ddbCampaignId: campaignId,
              ddbCampaignTitle: d.campaignTitle || localMatch?.ddbCampaignTitle,
              playerName: d.playerName || localMatch?.playerName || 'Player',
              stats: localMatch?.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
              actions: localMatch?.actions || [],
              spells: localMatch?.spells || [],
              createdAt: localMatch?.createdAt || Date.now(),
              updatedAt: Date.now()
            });
          }
        }

        // Merge any known offline heroes belonging to this campaign that weren't in API payload
        for (const localChar of allKnownCharacters) {
          const info = resolveCharacterCampaign(localChar);
          const isBelonging =
            campaignId === 'ALL' ||
            info.campaignId === campaignId ||
            localChar.ddbCampaignId === campaignId;

          if (isBelonging && !seenNames.has(localChar.name.toLowerCase().trim())) {
            seenNames.add(localChar.name.toLowerCase().trim());
            resolved.push({
              ...localChar,
              ddbCampaignId: campaignId === 'ALL' ? info.campaignId : campaignId,
              ddbCampaignTitle: info.campaignTitle,
              playerName: localChar.playerName || info.playerName || 'Player'
            });
          }
        }

        setConfirmedCharacters(resolved);
        setLastSyncedTime(Date.now());
        setSyncNotice(`✓ Successfully confirmed ${resolved.length} heroes for this campaign.`);
      } catch (err: any) {
        console.warn('[PlayerCampaignSelectModal] Error refreshing campaign:', err);
        // Fallback to offline pool
        const fallback = allKnownCharacters.filter((c) => {
          if (campaignId === 'ALL') return true;
          const info = resolveCharacterCampaign(c);
          return info.campaignId === campaignId || c.ddbCampaignId === campaignId;
        });
        setConfirmedCharacters(fallback);
        setLastSyncedTime(Date.now());
        setSyncNotice(`✓ Confirmed ${fallback.length} heroes from offline compendium.`);
      } finally {
        setIsRefreshing(false);
      }
    },
    [allKnownCharacters]
  );

  // Automatically refresh when selected campaign changes or on initial open
  useEffect(() => {
    if (isOpen && selectedCampId) {
      pullCampaignCharacters(selectedCampId);
    }
  }, [isOpen, selectedCampId, pullCampaignCharacters]);

  // Handle final campaign confirmation
  const handleConfirm = (chosenChar?: Character) => {
    const selectedOption = campaignList.find((c) => c.id === selectedCampId);
    const campaignTitle = selectedOption?.title || KNOWN_DDB_CAMPAIGNS[selectedCampId] || 'Keys from the Golden Vault';

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mistwalker_player_campaign_id', selectedCampId);
      sessionStorage.setItem('mistwalker_player_campaign_title', campaignTitle);
    }

    onConfirmCampaign({
      campaignId: selectedCampId,
      campaignTitle,
      characters: confirmedCharacters,
      selectedCharacter: chosenChar
    });
    onClose();
  };

  if (!isOpen) return null;

  const modeBadge = {
    remote_player: {
      label: 'Remote Player View (DDB Tactical HUD)',
      icon: Monitor,
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    },
    tv_table: {
      label: 'Digital TV Table (In-Person Display)',
      icon: Tv,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    },
    arena: {
      label: 'Battle Arena & Skirmish Lobby',
      icon: Swords,
      color: 'text-rose-400 bg-rose-500/15 border-rose-500/30'
    }
  }[targetMode];

  const ModeIcon = modeBadge.icon;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92dvh] bg-zinc-950/95 border border-zinc-800 rounded-3xl p-4 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col ring-1 ring-white/10 overflow-hidden">
        {/* Top gold accent line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="pb-4 border-b border-zinc-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 font-mono tracking-tight">
                    Select Your Campaign
                  </h2>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${modeBadge.color}`}>
                    <ModeIcon className="w-3 h-3" />
                    <span>{modeBadge.label}</span>
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">
                  Choose your active campaign. MistWalker will quickly refresh and pull all party players to confirm your roster.
                </p>
              </div>
            </div>

            {/* Quick Refresh Button */}
            <button
              type="button"
              onClick={() => pullCampaignCharacters(selectedCampId)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-amber-300 font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
              title="Quickly re-pull and refresh characters from D&D Beyond"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Quick Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Main Content Area: Split into Campaign Picker & Live Player Confirmation */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-5">
          {/* Section 1: Campaign Selector Cards */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5" />
                <span>Available Campaigns</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Click a campaign to load its adventurers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {campaignList.map((camp) => {
                const isSelected = selectedCampId === camp.id;
                return (
                  <button
                    key={camp.id}
                    type="button"
                    onClick={() => {
                      setSelectedCampId(camp.id);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-950/30'
                        : 'bg-zinc-900/75 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <h4 className={`text-xs font-mono font-extrabold truncate ${isSelected ? 'text-amber-200' : 'text-zinc-200'}`}>
                          {camp.title}
                        </h4>
                        {camp.isPrimary && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold shrink-0">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      {camp.description && (
                        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed font-sans mb-2">
                          {camp.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Users className="w-3 h-3 text-amber-400" />
                        <span>{camp.characterCount} {camp.characterCount === 1 ? 'Hero' : 'Heroes'}</span>
                      </span>
                      {isSelected ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-zinc-500 group-hover:text-zinc-300 flex items-center gap-0.5">
                          <span>Select</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Confirmed Campaign Players Grid */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono font-extrabold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <span>Confirmed Campaign Players ({confirmedCharacters.length})</span>
                  {isRefreshing && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Pulling from D&D Beyond...</span>
                    </span>
                  )}
                </h3>
              </div>

              {lastSyncedTime && !isRefreshing && (
                <span className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Verified & ready for {modeBadge.label}</span>
                </span>
              )}
            </div>

            {isRefreshing && confirmedCharacters.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-400 font-mono text-xs gap-2">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <span>Pulling campaign adventurers and stats...</span>
              </div>
            ) : confirmedCharacters.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 font-mono text-xs">
                No characters found for this campaign. Click &quot;Quick Refresh&quot; or choose another campaign.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {confirmedCharacters.map((char) => {
                  return (
                    <div
                      key={char.id}
                      onClick={() => {
                        if (targetMode === 'remote_player') {
                          handleConfirm(char);
                        }
                      }}
                      className={`p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:border-amber-500/50 hover:bg-zinc-900 transition-all flex items-center gap-2.5 ${
                        targetMode === 'remote_player' ? 'cursor-pointer group' : ''
                      }`}
                      title={targetMode === 'remote_player' ? `Click to play directly as ${char.name}` : char.name}
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 shrink-0 flex items-center justify-center">
                        {char.avatarUrl ? (
                          <img
                            src={char.avatarUrl}
                            alt={char.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Users className="w-4 h-4 text-zinc-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-mono font-bold text-white truncate group-hover:text-amber-300">
                            {char.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {char.race || 'Hero'} • {char.classLevel || 'Level 1'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[9px] font-mono">
                          <span className="text-rose-400 flex items-center gap-0.5">
                            <Heart className="w-2.5 h-2.5 fill-rose-500/20 text-rose-500" />
                            <span>{char.hp ?? 25} HP</span>
                          </span>
                          <span className="text-amber-400 flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5 text-amber-500" />
                            <span>AC {char.ac ?? 14}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {onBackToModes ? (
            <button
              type="button"
              onClick={onBackToModes}
              className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
            >
              ← Back to Mode Select
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleConfirm()}
              disabled={confirmedCharacters.length === 0}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-mono text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>
                {targetMode === 'remote_player'
                  ? 'Continue to Character Select'
                  : targetMode === 'arena'
                  ? 'Launch Battle Arena'
                  : 'Enter Digital TV Table'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
