export type HandoutCategory = 'letter' | 'riddle' | 'prop' | 'map' | 'lore';

export type HandoutThemeStyle = 'parchment' | 'stone_tablet' | 'royal_decree' | 'arcane_tome' | 'dark_obsidian';

export interface HandoutItem {
  id: string;
  title: string;
  subtitle?: string;
  category: HandoutCategory;
  themeStyle: HandoutThemeStyle;
  content: string;
  imageUrl?: string;
  signature?: string;
  sealText?: string;
  // Riddle-specific fields
  riddleHints?: string[];
  revealedHintCount?: number;
  riddleAnswer?: string;
  isAnswerRevealed?: boolean;
  // Visibility & targeting
  isSharedWithParty: boolean;
  visibleToCharacterNames?: string[]; // Empty or undefined = all players when shared/presented
  // Secret DM notes (never sent/rendered to players)
  dmSecretNotes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SharedQuestItem {
  id: string;
  title: string;
  giverOrLocation?: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
  isMainQuest?: boolean;
  updatedAt: number;
}

export interface SharedJournalEntry {
  id: string;
  title: string;
  category: 'clue' | 'npc' | 'location' | 'session_log';
  authorName: string;
  content: string;
  updatedAt: number;
}

export interface ActiveHandoutPresentation {
  handout: HandoutItem;
  targetCharacterNames?: string[]; // Empty = all players
  presentedAt: number;
}

export interface HandoutsJournalState {
  handouts: HandoutItem[];
  quests: SharedQuestItem[];
  journalEntries: SharedJournalEntry[];
  activePresentation: ActiveHandoutPresentation | null;
}

export const DEFAULT_STARTER_HANDOUTS: HandoutItem[] = [
  {
    id: 'handout_golden_vault_directive',
    title: 'Sealed Directive from the Golden Vault',
    subtitle: 'Confidential Mission Briefing',
    category: 'letter',
    themeStyle: 'parchment',
    content: `Operatives,\n\nShould you choose to accept this assignment, your objective lies within the heavily guarded vault beneath the estate. Recover the celestial artifact before midnight when the planar alignment peaks.\n\nLeave no trace of the organization's involvement. Burn this missive once read.`,
    signature: '— The Curator',
    sealText: 'GV',
    isSharedWithParty: true,
    dmSecretNotes: 'Give the party 250 gp advance expenses if they ask the contact at the tavern.',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000
  },
  {
    id: 'handout_crypt_riddle_tablet',
    title: 'Inscription on the Obsidian Vault Door',
    subtitle: 'Carved in Deep Primordial Runes',
    category: 'riddle',
    themeStyle: 'stone_tablet',
    content: `"I speak without a mouth and hear without ears.\nI have no body, training, or spear,\nYet I come alive with the wind's first breath.\nSpeak my true name to pass beyond death."`,
    riddleHints: [
      'Listen closely in a canyon or empty cathedral.',
      'It repeats only what is spoken to it.'
    ],
    revealedHintCount: 0,
    riddleAnswer: 'An Echo',
    isAnswerRevealed: false,
    isSharedWithParty: false,
    dmSecretNotes: 'Speaking "Echo" aloud in Common or Primordial opens the secret door without triggering the poison needle trap.',
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now() - 1800000
  }
];

export const DEFAULT_STARTER_QUESTS: SharedQuestItem[] = [
  {
    id: 'quest_main_1',
    title: 'Investigate the Whispering Sanctum',
    giverOrLocation: 'Golden Vault Contact',
    description: 'Infiltrate the sanctum, bypass the arcane wards, and recover the stolen relic before the ritual is completed.',
    status: 'active',
    isMainQuest: true,
    updatedAt: Date.now()
  }
];

export const DEFAULT_STARTER_JOURNAL: SharedJournalEntry[] = [
  {
    id: 'journal_clue_1',
    title: 'Patrol Schedule & Vault Passphrase',
    category: 'clue',
    authorName: 'Party Chronicle',
    content: 'Guards change shifts every two hours on the bell. The captain carries the brass signet ring required to bypass the inner ward.',
    updatedAt: Date.now()
  }
];
