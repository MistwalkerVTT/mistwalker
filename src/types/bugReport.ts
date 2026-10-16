export type BugCategory = 
  | 'campaign'
  | 'lighting_walls'
  | 'fog_of_war'
  | 'room_zones'
  | 'combat_tokens'
  | 'compendium_monsters'
  | 'ai_suite'
  | 'performance'
  | 'ui_layout'
  | 'other';

export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';

export type BugStatus = 'open' | 'investigating' | 'resolved';

export interface BugEnvironmentInfo {
  activeSceneTitle?: string;
  activeCampaignTitle?: string;
  mapDimensions?: string;
  tokenCount?: number;
  wallCount?: number;
  zoneCount?: number;
  userAgent?: string;
  screenResolution?: string;
  timestamp: number;
}

export interface BugReport {
  id: string;
  title: string;
  category: BugCategory;
  severity: BugSeverity;
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  environment: BugEnvironmentInfo;
  status: BugStatus;
  dmNotes?: string;
  screenshotUrl?: string;
  screenshotName?: string;
  createdAt: number;
  updatedAt?: number;
}
