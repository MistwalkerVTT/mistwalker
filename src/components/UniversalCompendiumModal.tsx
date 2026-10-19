import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Sparkles,
  BookOpen,
  Shield,
  Heart,
  Zap,
  Flame,
  Snowflake,
  Wind,
  Moon,
  Sun,
  Eye,
  Filter,
  Dices,
  Play,
  Crosshair,
  Package,
  FileText,
  AlertCircle,
  HelpCircle,
  Check,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Spell, SpellSchool, DndClass } from '../types/spell';
import { EquipmentItem, EquipmentCategory, ItemRarity } from '../types/equipment';
import { ConditionDetail, RuleTopic } from '../types/rules';
import { Monster, getSizeMultiplier } from '../types/monster';
import { SRD_SPELLS } from '../data/srdSpellsCatalog';
import { SRD_EQUIPMENT } from '../data/srdEquipmentCatalog';
import { SRD_CONDITIONS, SRD_CORE_RULES } from '../data/srdRulesCatalog';
import { SRD_MONSTERS } from '../data/srdMonstersCatalog';
import { DEFAULT_MONSTERS } from '../data/defaultMonsters';

export interface UniversalCompendiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'spells' | 'monsters' | 'equipment' | 'rules';
  initialSearch?: string;
  initialSearchQuery?: string;
  onSpawnMonster?: (tokenData: {
    name: string;
    avatarUrl: string;
    hp: number;
    ac: number;
    size: number;
  }) => void;
  onCastSpell?: (spell: Spell) => void;
  onRollDice?: (formula: string, label?: string) => void;
}

export const UniversalCompendiumModal: React.FC<UniversalCompendiumModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'spells',
  initialSearch = '',
  initialSearchQuery,
  onSpawnMonster,
  onCastSpell,
  onRollDice
}) => {
  const effectiveInitialSearch = initialSearchQuery !== undefined ? initialSearchQuery : initialSearch;
  const [activeTab, setActiveTab] = useState<'spells' | 'monsters' | 'equipment' | 'rules'>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>(effectiveInitialSearch);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery(effectiveInitialSearch);
    }
  }, [isOpen, initialTab, effectiveInitialSearch]);

  // Spell filters
  const [spellLevelFilter, setSpellLevelFilter] = useState<string>('all');
  const [spellSchoolFilter, setSpellSchoolFilter] = useState<string>('all');
  const [spellClassFilter, setSpellClassFilter] = useState<string>('all');
  const [spellConcentrationOnly, setSpellConcentrationOnly] = useState<boolean>(false);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(() => SRD_SPELLS[0] || null);

  // Monster filters
  const [monsterTypeFilter, setMonsterTypeFilter] = useState<string>('all');
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(() => SRD_MONSTERS[0] || null);

  // Equipment filters
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState<string>('all');
  const [equipmentRarityFilter, setEquipmentRarityFilter] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(() => SRD_EQUIPMENT[0] || null);

  // Rules & Conditions
  const [rulesSubTab, setRulesSubTab] = useState<'conditions' | 'combat'>('conditions');
  const [selectedCondition, setSelectedCondition] = useState<ConditionDetail | null>(() => SRD_CONDITIONS[0] || null);
  const [selectedRule, setSelectedRule] = useState<RuleTopic | null>(() => SRD_CORE_RULES[0] || null);

  // Combined monsters list (SRD + default)
  const allMonsters = useMemo(() => {
    const map = new Map<string, Monster>();
    for (const m of SRD_MONSTERS) map.set(m.name.toLowerCase(), m);
    for (const m of DEFAULT_MONSTERS) {
      if (!map.has(m.name.toLowerCase())) map.set(m.name.toLowerCase(), m);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Filtered Spells
  const filteredSpells = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return SRD_SPELLS.filter(sp => {
      if (q) {
        const matchName = sp.name.toLowerCase().includes(q);
        const matchSchool = sp.school.toLowerCase().includes(q);
        const matchClass = sp.classes.some(c => c.toLowerCase().includes(q));
        const matchDesc = sp.description.toLowerCase().includes(q);
        if (!matchName && !matchSchool && !matchClass && !matchDesc) return false;
      }
      if (spellLevelFilter !== 'all') {
        const lvl = parseInt(spellLevelFilter, 10);
        if (sp.level !== lvl) return false;
      }
      if (spellSchoolFilter !== 'all' && sp.school.toLowerCase() !== spellSchoolFilter.toLowerCase()) {
        return false;
      }
      if (spellClassFilter !== 'all' && !sp.classes.some(c => c.toLowerCase() === spellClassFilter.toLowerCase())) {
        return false;
      }
      if (spellConcentrationOnly && !sp.concentration) {
        return false;
      }
      return true;
    });
  }, [searchQuery, spellLevelFilter, spellSchoolFilter, spellClassFilter, spellConcentrationOnly]);

  // Filtered Monsters
  const filteredMonsters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allMonsters.filter(m => {
      if (q) {
        const matchName = m.name.toLowerCase().includes(q);
        const matchType = m.type.toLowerCase().includes(q);
        const matchCR = (m.challenge || '').toLowerCase().includes(q);
        if (!matchName && !matchType && !matchCR) return false;
      }
      if (monsterTypeFilter !== 'all' && !m.type.toLowerCase().includes(monsterTypeFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [allMonsters, searchQuery, monsterTypeFilter]);

  // Filtered Equipment
  const filteredEquipment = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return SRD_EQUIPMENT.filter(item => {
      if (q) {
        const matchName = item.name.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchDesc) return false;
      }
      if (equipmentCategoryFilter !== 'all' && item.category.toLowerCase() !== equipmentCategoryFilter.toLowerCase()) {
        return false;
      }
      if (equipmentRarityFilter !== 'all' && (item.rarity || 'mundane').toLowerCase() !== equipmentRarityFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [searchQuery, equipmentCategoryFilter, equipmentRarityFilter]);

  // Filtered Conditions
  const filteredConditions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return SRD_CONDITIONS;
    return SRD_CONDITIONS.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.bulletPoints.some(b => b.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Filtered Core Rules
  const filteredRules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return SRD_CORE_RULES;
    return SRD_CORE_RULES.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.content.toLowerCase().includes(q) ||
      (r.quickReference && r.quickReference.some(qr => qr.toLowerCase().includes(q)))
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-zinc-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-6xl h-[90vh] bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-zinc-950 shadow-md">
              <BookOpen className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono tracking-tight text-zinc-100">
                  Universal 5e SRD & Compendium
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SRD 5.1
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Official rules, spells, creatures, magic items & conditions database
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close Compendium (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-2.5 bg-zinc-900/90 border-b border-zinc-800 shrink-0">
          {/* Main Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800 shrink-0 overflow-x-auto">
            <button
              onClick={() => { setActiveTab('spells'); setSearchQuery(''); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'spells'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>Spells ({filteredSpells.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('monsters'); setSearchQuery(''); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'monsters'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 text-rose-300" />
              <span>Monsters ({filteredMonsters.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('equipment'); setSearchQuery(''); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'equipment'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-amber-300" />
              <span>Equipment ({filteredEquipment.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('rules'); setSearchQuery(''); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-300" />
              <span>Rules & Conditions</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-8 py-1.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Tab-Specific Filters Bar */}
        {activeTab === 'spells' && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-2 bg-zinc-950/60 border-b border-zinc-800/80 text-[11px] shrink-0 font-mono">
            <span className="text-zinc-500 flex items-center gap-1">
              <Filter className="w-3 h-3 text-purple-400" /> FILTERS:
            </span>

            {/* Level Select */}
            <select
              value={spellLevelFilter}
              onChange={(e) => setSpellLevelFilter(e.target.value)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Levels</option>
              <option value="0">Cantrips</option>
              <option value="1">1st Level</option>
              <option value="2">2nd Level</option>
              <option value="3">3rd Level</option>
              <option value="4">4th Level</option>
              <option value="5">5th Level</option>
              <option value="6">6th Level</option>
              <option value="7">7th Level</option>
              <option value="8">8th Level</option>
              <option value="9">9th Level</option>
            </select>

            {/* School Select */}
            <select
              value={spellSchoolFilter}
              onChange={(e) => setSpellSchoolFilter(e.target.value)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Schools</option>
              <option value="Abjuration">Abjuration</option>
              <option value="Conjuration">Conjuration</option>
              <option value="Divination">Divination</option>
              <option value="Enchantment">Enchantment</option>
              <option value="Evocation">Evocation</option>
              <option value="Illusion">Illusion</option>
              <option value="Necromancy">Necromancy</option>
              <option value="Transmutation">Transmutation</option>
            </select>

            {/* Class Select */}
            <select
              value={spellClassFilter}
              onChange={(e) => setSpellClassFilter(e.target.value)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Classes</option>
              <option value="Bard">Bard</option>
              <option value="Cleric">Cleric</option>
              <option value="Druid">Druid</option>
              <option value="Paladin">Paladin</option>
              <option value="Ranger">Ranger</option>
              <option value="Sorcerer">Sorcerer</option>
              <option value="Warlock">Warlock</option>
              <option value="Wizard">Wizard</option>
            </select>

            {/* Concentration Checkbox */}
            <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={spellConcentrationOnly}
                onChange={(e) => setSpellConcentrationOnly(e.target.checked)}
                className="rounded accent-purple-500"
              />
              <span>Concentration Only</span>
            </label>
          </div>
        )}

        {activeTab === 'monsters' && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-2 bg-zinc-950/60 border-b border-zinc-800/80 text-[11px] shrink-0 font-mono">
            <span className="text-zinc-500 flex items-center gap-1">
              <Filter className="w-3 h-3 text-rose-400" /> TYPE:
            </span>
            <select
              value={monsterTypeFilter}
              onChange={(e) => setMonsterTypeFilter(e.target.value)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Creature Types</option>
              <option value="Undead">Undead</option>
              <option value="Dragon">Dragon</option>
              <option value="Fiend">Fiend</option>
              <option value="Humanoid">Humanoid</option>
              <option value="Monstrosity">Monstrosity</option>
              <option value="Beast">Beast</option>
              <option value="Aberration">Aberration</option>
              <option value="Construct">Construct</option>
              <option value="Fey">Fey</option>
              <option value="Giant">Giant</option>
            </select>
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-2 bg-zinc-950/60 border-b border-zinc-800/80 text-[11px] shrink-0 font-mono">
            <span className="text-zinc-500 flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-400" /> CATEGORY:
            </span>
            <select
              value={equipmentCategoryFilter}
              onChange={(e) => setEquipmentCategoryFilter(e.target.value)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Categories</option>
              <option value="Weapon">Weapons</option>
              <option value="Armor">Armor</option>
              <option value="Shield">Shields</option>
              <option value="Potion">Potions</option>
              <option value="Ring">Rings</option>
              <option value="Wand">Wands & Staffs</option>
              <option value="Wondrous Item">Wondrous Items</option>
            </select>

            <select
              value={equipmentRarityFilter}
              onChange={(e) => setEquipmentRarityFilter(e.target.value)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Rarities</option>
              <option value="Mundane">Mundane</option>
              <option value="Common">Common</option>
              <option value="Uncommon">Uncommon</option>
              <option value="Rare">Rare</option>
              <option value="Very Rare">Very Rare</option>
              <option value="Legendary">Legendary</option>
            </select>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="flex items-center gap-2 px-5 py-2 bg-zinc-950/60 border-b border-zinc-800/80 text-[11px] shrink-0 font-mono">
            <button
              onClick={() => setRulesSubTab('conditions')}
              className={`px-3 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                rulesSubTab === 'conditions'
                  ? 'bg-blue-600/30 border-blue-400 text-blue-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Conditions (15)
            </button>
            <button
              onClick={() => setRulesSubTab('combat')}
              className={`px-3 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                rulesSubTab === 'combat'
                  ? 'bg-blue-600/30 border-blue-400 text-blue-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Core Combat & Tactical Rules
            </button>
          </div>
        )}

        {/* Main Content Area (Two Columns: List + Details Panel) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* === SPELLS VIEW === */}
          {activeTab === 'spells' && (
            <>
              {/* Left Column: Spells List */}
              <div className="w-full sm:w-80 md:w-96 border-r border-zinc-800 overflow-y-auto flex flex-col divide-y divide-zinc-800/60 bg-zinc-950/40">
                {filteredSpells.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    No spells match your search.
                  </div>
                ) : (
                  filteredSpells.map((sp) => {
                    const isSelected = selectedSpell?.id === sp.id;
                    return (
                      <button
                        key={sp.id}
                        onClick={() => setSelectedSpell(sp)}
                        className={`p-3 text-left transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-purple-950/40 border-l-4 border-l-purple-500'
                            : 'hover:bg-zinc-850'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-zinc-100 truncate">
                              {sp.name}
                            </span>
                            {sp.concentration && (
                              <span className="text-[9px] px-1 py-0.2 bg-purple-900/60 text-purple-300 rounded font-mono font-bold" title="Requires Concentration">
                                C
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            {sp.level === 0 ? 'Cantrip' : `Level ${sp.level}`} • {sp.school}
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {sp.classes.join(', ')}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {sp.castingTime.split(',')[0]}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right Column: Spell Detail Card */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-zinc-900/60">
                {selectedSpell ? (
                  <div className="max-w-2xl mx-auto flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                      <div>
                        <h3 className="text-xl font-bold font-mono text-purple-300">
                          {selectedSpell.name}
                        </h3>
                        <div className="text-xs font-mono text-zinc-400 mt-0.5">
                          {selectedSpell.level === 0 ? 'Cantrip' : `${selectedSpell.level}th-level`} {selectedSpell.school}
                          {selectedSpell.ritual && ' (Ritual)'}
                        </div>
                      </div>

                      {/* Action Buttons: Cast Spell & Roll Damage */}
                      <div className="flex items-center gap-2">
                        {onCastSpell && (
                          <button
                            onClick={() => onCastSpell(selectedSpell)}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                            title="Cast spell on tactical battlemap"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Cast on Board
                          </button>
                        )}
                        {onRollDice && selectedSpell.damageDice && (
                          <button
                            onClick={() => onRollDice(selectedSpell.damageDice!, `${selectedSpell.name} Damage`)}
                            className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-amber-600 text-amber-300 hover:text-white border border-zinc-700 hover:border-amber-500 font-mono text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                            title="Roll spell damage with 3D physics dice"
                          >
                            <Dices className="w-3.5 h-3.5 text-amber-400 hover:text-white" />
                            Roll {selectedSpell.damageDice}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase">Casting Time</span>
                        <span className="text-zinc-200 font-bold">{selectedSpell.castingTime}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase">Range / Area</span>
                        <span className="text-zinc-200 font-bold">{selectedSpell.range}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase">Components</span>
                        <span className="text-zinc-200 font-bold">
                          {[
                            selectedSpell.components.verbal && 'V',
                            selectedSpell.components.somatic && 'S',
                            selectedSpell.components.material && 'M'
                          ].filter(Boolean).join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase">Duration</span>
                        <span className="text-zinc-200 font-bold">{selectedSpell.duration}</span>
                      </div>
                    </div>

                    {/* Materials Description */}
                    {selectedSpell.components.materialsDescription && (
                      <div className="text-xs text-zinc-400 italic bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/80">
                        * Material: {selectedSpell.components.materialsDescription}
                      </div>
                    )}

                    {/* Spell Description */}
                    <div className="text-xs text-zinc-300 leading-relaxed space-y-2 font-sans bg-zinc-950/30 p-4 rounded-xl border border-zinc-800/60">
                      {selectedSpell.description}
                    </div>

                    {/* At Higher Levels */}
                    {selectedSpell.higherLevels && (
                      <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl text-xs text-zinc-300">
                        <strong className="text-purple-300 font-mono block mb-1">At Higher Levels:</strong>
                        <p>{selectedSpell.higherLevels}</p>
                      </div>
                    )}

                    {/* Class List */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Available to:</span>
                      {selectedSpell.classes.map(c => (
                        <span key={c} className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                    Select a spell to view full description
                  </div>
                )}
              </div>
            </>
          )}

          {/* === MONSTERS VIEW === */}
          {activeTab === 'monsters' && (
            <>
              {/* Left Column: Monsters List */}
              <div className="w-full sm:w-80 md:w-96 border-r border-zinc-800 overflow-y-auto flex flex-col divide-y divide-zinc-800/60 bg-zinc-950/40">
                {filteredMonsters.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    No monsters match your query.
                  </div>
                ) : (
                  filteredMonsters.map((m) => {
                    const isSelected = selectedMonster?.monsterId === m.monsterId;
                    return (
                      <button
                        key={m.monsterId}
                        onClick={() => setSelectedMonster(m)}
                        className={`p-3 text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-rose-950/40 border-l-4 border-l-rose-500'
                            : 'hover:bg-zinc-850'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {m.avatarUrl ? (
                            <img src={m.avatarUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-300 text-xs font-bold shrink-0">
                              {m.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-zinc-100 truncate block">
                              {m.name}
                            </span>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {m.size} {m.type}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-mono font-bold text-amber-400">
                            CR {m.challenge.split(' ')[0]}
                          </span>
                          <div className="text-[9px] text-zinc-500 font-mono">
                            {m.hp} HP
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right Column: Monster Statblock */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-zinc-900/60">
                {selectedMonster ? (
                  <div className="max-w-2xl mx-auto flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                      <div className="flex items-center gap-3">
                        {selectedMonster.avatarUrl && (
                          <img src={selectedMonster.avatarUrl} alt={selectedMonster.name} className="w-12 h-12 rounded-full object-cover border-2 border-rose-500/60 shadow" />
                        )}
                        <div>
                          <h3 className="text-xl font-bold font-mono text-rose-300">
                            {selectedMonster.name}
                          </h3>
                          <div className="text-xs font-mono text-zinc-400 mt-0.5">
                            {selectedMonster.size} {selectedMonster.type}, {selectedMonster.alignment}
                          </div>
                        </div>
                      </div>

                      {/* Spawn Button */}
                      {onSpawnMonster && (
                        <button
                          onClick={() => {
                            const sizeMul = getSizeMultiplier(selectedMonster.size);
                            onSpawnMonster({
                              name: selectedMonster.name,
                              avatarUrl: selectedMonster.avatarUrl || '',
                              hp: selectedMonster.hp,
                              ac: selectedMonster.ac,
                              size: sizeMul
                            });
                          }}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          <Crosshair className="w-4 h-4" />
                          Spawn on Map
                        </button>
                      )}
                    </div>

                    {/* Vitals */}
                    <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">ARMOR CLASS</span>
                        <span className="text-amber-400 font-bold text-sm">{selectedMonster.ac}</span> {selectedMonster.acNotes}
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">HIT POINTS</span>
                        <span className="text-emerald-400 font-bold text-sm">{selectedMonster.hp}</span> {selectedMonster.hpFormula}
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">SPEED</span>
                        <span className="text-zinc-200 font-bold">{selectedMonster.speed}</span>
                      </div>
                    </div>

                    {/* Ability Scores */}
                    <div className="grid grid-cols-6 gap-2 text-center font-mono">
                      {[
                        { label: 'STR', val: selectedMonster.str },
                        { label: 'DEX', val: selectedMonster.dex },
                        { label: 'CON', val: selectedMonster.con },
                        { label: 'INT', val: selectedMonster.int },
                        { label: 'WIS', val: selectedMonster.wis },
                        { label: 'CHA', val: selectedMonster.cha }
                      ].map(stat => {
                        const mod = Math.floor((stat.val - 10) / 2);
                        const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                        return (
                          <div key={stat.label} className="p-2 bg-zinc-950/80 rounded-xl border border-zinc-800">
                            <span className="text-[9px] text-zinc-500 block">{stat.label}</span>
                            <span className="font-bold text-sm text-zinc-100">{stat.val}</span>
                            <span className="text-[10px] text-zinc-400 block">({modStr})</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Defenses, Senses, Languages, Challenge */}
                    <div className="text-xs font-mono space-y-1 text-zinc-400 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/80">
                      {selectedMonster.savingThrows && <div><strong className="text-zinc-300">Saving Throws:</strong> {selectedMonster.savingThrows}</div>}
                      {selectedMonster.skills && <div><strong className="text-zinc-300">Skills:</strong> {selectedMonster.skills}</div>}
                      {selectedMonster.damageResistances && <div><strong className="text-zinc-300">Damage Resistances:</strong> {selectedMonster.damageResistances}</div>}
                      {selectedMonster.damageImmunities && <div><strong className="text-zinc-300">Damage Immunities:</strong> {selectedMonster.damageImmunities}</div>}
                      {selectedMonster.conditionImmunities && <div><strong className="text-zinc-300">Condition Immunities:</strong> {selectedMonster.conditionImmunities}</div>}
                      {selectedMonster.senses && <div><strong className="text-zinc-300">Senses:</strong> {selectedMonster.senses}</div>}
                      {selectedMonster.languages && <div><strong className="text-zinc-300">Languages:</strong> {selectedMonster.languages}</div>}
                      <div><strong className="text-zinc-300">Challenge:</strong> <span className="text-amber-400 font-bold">{selectedMonster.challenge}</span></div>
                    </div>

                    {/* Traits */}
                    {selectedMonster.traits && selectedMonster.traits.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Traits</h4>
                        {selectedMonster.traits.map(t => (
                          <div key={t.name} className="text-xs text-zinc-300 bg-zinc-950/30 p-2.5 rounded-lg border border-zinc-800/60">
                            <strong className="text-zinc-100 font-bold">{t.name}.</strong> {t.description}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {selectedMonster.actions && selectedMonster.actions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">Actions</h4>
                        {selectedMonster.actions.map(act => (
                          <div key={act.name} className="text-xs text-zinc-300 bg-zinc-950/40 p-2.5 rounded-lg border border-rose-950/30">
                            <div className="flex items-center justify-between mb-1">
                              <strong className="text-rose-200 font-bold">{act.name}</strong>
                              {act.damage && onRollDice && (
                                <button
                                  onClick={() => onRollDice(act.damage!.split(' ')[0], `${selectedMonster.name} - ${act.name}`)}
                                  className="text-[10px] text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 cursor-pointer hover:underline"
                                >
                                  <Dices className="w-3 h-3" /> Roll {act.damage.split(' ')[0]}
                                </button>
                              )}
                            </div>
                            <p className="text-zinc-300">{act.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                    Select a monster to view statblock
                  </div>
                )}
              </div>
            </>
          )}

          {/* === EQUIPMENT & MAGIC ITEMS VIEW === */}
          {activeTab === 'equipment' && (
            <>
              {/* Left Column: Equipment List */}
              <div className="w-full sm:w-80 md:w-96 border-r border-zinc-800 overflow-y-auto flex flex-col divide-y divide-zinc-800/60 bg-zinc-950/40">
                {filteredEquipment.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    No items match your filter.
                  </div>
                ) : (
                  filteredEquipment.map((item) => {
                    const isSelected = selectedEquipment?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedEquipment(item)}
                        className={`p-3 text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/40 border-l-4 border-l-amber-500'
                            : 'hover:bg-zinc-850'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-zinc-100 truncate block">
                            {item.name}
                          </span>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            {item.category} • {item.rarity || 'Mundane'}
                          </div>
                        </div>
                        {item.damage && (
                          <span className="text-[10px] font-mono text-amber-400 font-bold shrink-0">
                            {item.damage.split(' ')[0]}
                          </span>
                        )}
                        {item.ac && (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0">
                            {item.acType || `AC ${item.ac}`}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right Column: Item Detail Card */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-zinc-900/60">
                {selectedEquipment ? (
                  <div className="max-w-2xl mx-auto flex flex-col gap-4">
                    <div className="border-b border-zinc-800 pb-3">
                      <h3 className="text-xl font-bold font-mono text-amber-300">
                        {selectedEquipment.name}
                      </h3>
                      <div className="text-xs font-mono text-zinc-400 mt-0.5">
                        {selectedEquipment.category}
                        {selectedEquipment.rarity && `, ${selectedEquipment.rarity}`}
                        {selectedEquipment.requiresAttunement && ' (Requires Attunement)'}
                      </div>
                    </div>

                    {/* Vitals Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs font-mono">
                      {selectedEquipment.damage && (
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase">Damage</span>
                          <span className="text-amber-400 font-bold">{selectedEquipment.damage}</span>
                        </div>
                      )}
                      {selectedEquipment.ac && (
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase">Armor Class</span>
                          <span className="text-emerald-400 font-bold">{selectedEquipment.acType || selectedEquipment.ac}</span>
                        </div>
                      )}
                      {selectedEquipment.cost && (
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase">Cost</span>
                          <span className="text-zinc-200 font-bold">{selectedEquipment.cost}</span>
                        </div>
                      )}
                      {selectedEquipment.weight && (
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase">Weight</span>
                          <span className="text-zinc-200 font-bold">{selectedEquipment.weight}</span>
                        </div>
                      )}
                    </div>

                    {/* Weapon Properties */}
                    {selectedEquipment.properties && selectedEquipment.properties.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Properties:</span>
                        {selectedEquipment.properties.map(p => (
                          <span key={p} className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Description */}
                    <div className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/80">
                      {selectedEquipment.description}
                    </div>

                    {/* Roll Weapon Damage Button */}
                    {selectedEquipment.damage && onRollDice && (
                      <div className="pt-2">
                        <button
                          onClick={() => onRollDice(selectedEquipment.damage!.split(' ')[0], `${selectedEquipment.name} Damage`)}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-zinc-950 font-mono text-xs font-extrabold flex items-center gap-2 shadow transition-all active:scale-95 cursor-pointer"
                        >
                          <Dices className="w-4 h-4 text-zinc-950" />
                          Roll {selectedEquipment.damage.split(' ')[0]} Damage
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                    Select an item to view details
                  </div>
                )}
              </div>
            </>
          )}

          {/* === RULES & CONDITIONS VIEW === */}
          {activeTab === 'rules' && rulesSubTab === 'conditions' && (
            <>
              {/* Conditions List */}
              <div className="w-full sm:w-80 md:w-96 border-r border-zinc-800 overflow-y-auto flex flex-col divide-y divide-zinc-800/60 bg-zinc-950/40">
                {filteredConditions.map((cond) => {
                  const isSelected = selectedCondition?.id === cond.id;
                  return (
                    <button
                      key={cond.id}
                      onClick={() => setSelectedCondition(cond)}
                      className={`p-3 text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950/40 border-l-4 border-l-blue-500'
                          : 'hover:bg-zinc-850'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${cond.badgeColor || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                          {cond.name}
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                    </button>
                  );
                })}
              </div>

              {/* Condition Detail */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-zinc-900/60">
                {selectedCondition ? (
                  <div className="max-w-2xl mx-auto flex flex-col gap-4">
                    <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-xl font-bold font-mono text-blue-300">
                          {selectedCondition.name}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${selectedCondition.badgeColor || 'bg-zinc-800 text-zinc-300'}`}>
                          Condition
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 font-sans italic bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/60">
                      {selectedCondition.description}
                    </p>

                    <div className="space-y-2">
                      <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Mechanical Effects</h4>
                      <ul className="space-y-2">
                        {selectedCondition.bulletPoints.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-200 bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {selectedCondition.tacticalTip && (
                      <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs text-zinc-300">
                        <strong className="text-amber-300 font-mono block mb-1">Tactical Tip for DMs & Players:</strong>
                        <p>{selectedCondition.tacticalTip}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                    Select a condition to view mechanical rules
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'rules' && rulesSubTab === 'combat' && (
            <>
              {/* Rules List */}
              <div className="w-full sm:w-80 md:w-96 border-r border-zinc-800 overflow-y-auto flex flex-col divide-y divide-zinc-800/60 bg-zinc-950/40">
                {filteredRules.map((rule) => {
                  const isSelected = selectedRule?.id === rule.id;
                  return (
                    <button
                      key={rule.id}
                      onClick={() => setSelectedRule(rule)}
                      className={`p-3 text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950/40 border-l-4 border-l-blue-500'
                          : 'hover:bg-zinc-850'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs text-zinc-100 block">
                          {rule.title}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {rule.category}
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                    </button>
                  );
                })}
              </div>

              {/* Rule Detail */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-zinc-900/60">
                {selectedRule ? (
                  <div className="max-w-2xl mx-auto flex flex-col gap-4">
                    <div className="border-b border-zinc-800 pb-3">
                      <h3 className="text-xl font-bold font-mono text-blue-300">
                        {selectedRule.title}
                      </h3>
                      <div className="text-xs font-mono text-zinc-400 mt-0.5">
                        {selectedRule.category}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/60">
                      {selectedRule.content}
                    </p>

                    {selectedRule.quickReference && selectedRule.quickReference.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">Quick Reference Rules</h4>
                        <ul className="space-y-2">
                          {selectedRule.quickReference.map((ref, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-200 bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                              <span>{ref}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                    Select a rule to view details
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-zinc-800 bg-zinc-950/90 text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono text-[10px]">MistWalker 5e SRD Compendium Database</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
