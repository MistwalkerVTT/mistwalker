export type TutorialTrackId =
  | 'campaign'
  | 'chapter'
  | 'scene'
  | 'load_map'
  | 'walls'
  | 'doors'
  | 'upload_pdf'
  | 'ingest_pdf'
  | 'room_zones';

export type TutorialActionKey =
  | 'open_campaign_manager'
  | 'close_campaign_manager'
  | 'switch_creator_mode'
  | 'switch_run_mode'
  | 'select_wall_tool'
  | 'select_door_wall_type'
  | 'select_solid_wall_type'
  | 'select_zone_tool'
  | 'load_practice_map'
  | 'open_chapter_guide';

export type TutorialCompletionCheck =
  | 'campaign_manager_open'
  | 'has_active_map'
  | 'creator_mode_active'
  | 'run_mode_active'
  | 'wall_tool_active'
  | 'door_type_active'
  | 'wall_count_increased'
  | 'door_count_increased'
  | 'zone_tool_active'
  | 'zone_count_increased';

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  bulletPoints?: string[];
  proTip?: string;
  shortcut?: string;
  /** CSS selector (#id or [data-tour="..."]) to spotlight */
  targetSelector?: string;
  /** Preferred card placement relative to spotlight */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'dock-bottom-right';
  /** When true, removes dimming backdrop so the user can freely click/draw on the Konva canvas */
  canvasInteractive?: boolean;
  /** Optional one-click helper button when a panel/mode isn't active yet */
  helperAction?: {
    label: string;
    action: TutorialActionKey;
    variant?: 'primary' | 'practice';
  };
  /** Optional secondary helper button (e.g. "Load Practice Map") */
  secondaryAction?: {
    label: string;
    action: TutorialActionKey;
  };
  /** Live app-state condition that marks this step completed */
  completionCheck?: TutorialCompletionCheck;
  /** Human-readable status text shown while waiting for a live milestone */
  waitingLabel?: string;
  /** Human-readable status text shown once milestone is detected */
  completedLabel?: string;
}

export interface TutorialTrack {
  id: TutorialTrackId;
  order: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  category: 'setup' | 'maps_geometry' | 'pdf_zones';
  estimatedMinutes: number;
  steps: TutorialStep[];
}

export interface TutorialLiveState {
  isCampaignManagerOpen: boolean;
  hasActiveMap: boolean;
  campaignMode: 'run' | 'creator';
  tool: string;
  activeWallType: string;
  wallCount: number;
  doorCount: number;
  zoneCount: number;
}
