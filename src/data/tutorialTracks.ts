import { TutorialTrack, TutorialTrackId } from '../types/tutorial';

export const TUTORIAL_TRACKS: TutorialTrack[] = [
  // =========================================================================
  // TRACK 1: CREATE A CAMPAIGN
  // =========================================================================
  {
    id: 'campaign',
    order: 1,
    title: 'Create a Campaign',
    shortTitle: 'Campaigns',
    subtitle: 'Set up your top-level adventure container synced to the cloud.',
    category: 'setup',
    estimatedMinutes: 1,
    steps: [
      {
        id: 'camp-open-manager',
        title: 'Open Campaign Manager',
        body: 'Everything in MistWalker lives inside a clean hierarchy: Campaigns hold Chapters, and Chapters hold tactical Scenes & Adventure PDFs. Start by opening the Campaign Manager.',
        bulletPoints: [
          'From the Dashboard Command Deck, click the "Campaigns" tile.',
          'From an active battlemap, open the Library menu in the top bar or click "Campaign Manager".'
        ],
        targetSelector: '#btn-home-campaign-builder, #btn-main-open-campaign-manager, #btn-bar-library-menu',
        placement: 'bottom',
        helperAction: {
          label: 'Open Campaign Manager',
          action: 'open_campaign_manager',
          variant: 'primary'
        },
        completionCheck: 'campaign_manager_open',
        waitingLabel: 'Open Campaign Manager to continue',
        completedLabel: 'Campaign Manager is open!'
      },
      {
        id: 'camp-click-new',
        title: 'Click "New Campaign"',
        body: 'In the top-right header of Campaign Manager, click "+ New Campaign". While the tutorial is active, the title automatically pre-fills with "Test Campaign for Tutorial" so you can click Create right away!',
        bulletPoints: [
          'The campaign title is pre-filled as "Test Campaign for Tutorial" (you can edit it if you prefer).',
          'At the end of the tutorial, MistWalker will offer to delete this temporary tutorial campaign for you.'
        ],
        proTip: 'Campaigns are saved automatically to your cloud database and stay synced across your DM sessions.',
        targetSelector: '#btn-create-campaign',
        placement: 'bottom',
        helperAction: {
          label: 'Open Campaign Manager',
          action: 'open_campaign_manager'
        }
      },
      {
        id: 'camp-understand-tree',
        title: 'Explore the Campaign Tree',
        body: 'Your new "Test Campaign for Tutorial" now appears in the left-hand Campaign Tree. Clicking a campaign expands its Chapters and Scenes so you can jump between encounters in seconds.',
        bulletPoints: [
          'Click any Campaign name to expand or collapse its Chapters.',
          'You can maintain multiple campaigns simultaneously and switch anytime.'
        ],
        targetSelector: '#campaign-builder-modal-container',
        placement: 'dock-top-center'
      }
    ]
  },

  // =========================================================================
  // TRACK 2: CREATE A CHAPTER
  // =========================================================================
  {
    id: 'chapter',
    order: 2,
    title: 'Create a Chapter',
    shortTitle: 'Chapters',
    subtitle: 'Organize story arcs, multi-floor dungeons, and attach adventure PDFs.',
    category: 'setup',
    estimatedMinutes: 1,
    steps: [
      {
        id: 'chap-open-manager',
        title: 'Select Your Campaign',
        body: 'Chapters represent individual quests, heists, or dungeon arcs inside your campaign. Make sure Campaign Manager is open and "Test Campaign for Tutorial" is selected in the left tree.',
        targetSelector: '#campaign-builder-modal-container',
        placement: 'dock-top-center',
        helperAction: {
          label: 'Open Campaign Manager',
          action: 'open_campaign_manager',
          variant: 'primary'
        },
        completionCheck: 'campaign_manager_open',
        waitingLabel: 'Open Campaign Manager',
        completedLabel: 'Campaign Manager ready!'
      },
      {
        id: 'chap-add-button',
        title: 'Click "+ Add Chapter"',
        body: 'Click the "+" (Add Chapter) button next to "Test Campaign for Tutorial". The prompt automatically pre-fills with "Test Chapter"—just click Add Chapter!',
        bulletPoints: [
          'Title auto-fills as "Test Chapter" during the tutorial.',
          'Chapters are also where you upload & ingest Adventure PDFs so all scenes inside the chapter share the same room keys and lore!'
        ],
        proTip: 'Keeping each dungeon or adventure module in its own Chapter makes Gemini PDF ingestion dramatically more accurate.',
        targetSelector: '[data-tour="btn-add-chapter"]',
        placement: 'right'
      },
      {
        id: 'chap-inspector-overview',
        title: 'Inspect Your Chapter Workspace',
        body: 'Click "Test Chapter" in the left tree to open the Chapter Inspector on the right. From here you can reorder scenes, upload your Chapter PDF, and manage chapter-wide handouts.',
        targetSelector: '#campaign-builder-modal-container',
        placement: 'dock-top-center'
      }
    ]
  },

  // =========================================================================
  // TRACK 3: CREATE A SCENE
  // =========================================================================
  {
    id: 'scene',
    order: 3,
    title: 'Create a Scene',
    shortTitle: 'Scenes',
    subtitle: 'Build individual tactical battlemap encounters inside a chapter.',
    category: 'setup',
    estimatedMinutes: 1,
    steps: [
      {
        id: 'scene-open-manager',
        title: 'Choose a Chapter for Your Scene',
        body: 'A Scene is a single tactical battlemap. Open Campaign Manager and expand "Test Chapter" where you want to add your tutorial scene.',
        targetSelector: '#campaign-builder-modal-container',
        placement: 'dock-top-center',
        helperAction: {
          label: 'Open Campaign Manager',
          action: 'open_campaign_manager',
          variant: 'primary'
        },
        completionCheck: 'campaign_manager_open',
        waitingLabel: 'Open Campaign Manager',
        completedLabel: 'Campaign Manager ready!'
      },
      {
        id: 'scene-click-add',
        title: 'Click "+ Add Scene"',
        body: 'Click "+" (Add Scene) next to "Test Chapter". The prompt automatically pre-fills with "Test Scene" and assigns the Ironbound Cellblock tutorial map!',
        bulletPoints: [
          'Each Scene independently stores its battlemap image/video, grid scale, dynamic walls, doors, tokens, room zones, and DM notes.',
          'Need to insert a scene in exact story order? Use "+ Add Scene Underneath" inside any Scene Inspector!'
        ],
        targetSelector: '[data-tour="btn-add-scene"], #btn-add-scene-below, #btn-add-next-scene-card',
        placement: 'right'
      },
      {
        id: 'scene-duplicate-tip',
        title: 'Pro Workflow: Duplicate Multi-Phase Scenes',
        body: 'Once a scene has walls, doors, and room zones set up, you can click "Duplicate" in the Scene Inspector to clone it with all wall geometry and PDF links intact—perfect for Day/Night or Flooded/Burning map variants.',
        targetSelector: '#btn-duplicate-scene-inspector',
        placement: 'bottom'
      }
    ]
  },

  // =========================================================================
  // TRACK 4: LOAD MAPS
  // =========================================================================
  {
    id: 'load_map',
    order: 4,
    title: 'Load Battlemaps',
    shortTitle: 'Load Maps',
    subtitle: 'Upload images/videos, pick presets, or import Universal VTT (.dd2vtt) maps.',
    category: 'maps_geometry',
    estimatedMinutes: 2,
    steps: [
      {
        id: 'map-four-ways',
        title: 'Choose How to Load a Map',
        body: 'Select a Scene in Campaign Manager and look at the Map Media section. MistWalker supports 4 fast ways to attach a battlemap:',
        bulletPoints: [
          'Upload Map: Drag & drop or browse JPG, PNG, WebP, or animated MP4 / WebM / M4V battlemaps.',
          'Preset Battlemap Gallery: Pick from built-in high-res tactical maps with pre-configured grids.',
          'Saved Maps Library: Reuse any map you have previously uploaded to your server.',
          'Import UVTT (.dd2vtt / .uvtt): Automatically imports the map image AND pre-built walls, doors, and lighting!'
        ],
        targetSelector: '[data-tour="scene-map-media-section"]',
        placement: 'left',
        helperAction: {
          label: 'Open Campaign Manager',
          action: 'open_campaign_manager'
        },
        secondaryAction: {
          label: 'Load Practice Map Now',
          action: 'load_practice_map'
        }
      },
      {
        id: 'map-preset-gallery',
        title: 'Try the Preset Battlemap Gallery',
        body: 'Don\'t have a map file handy? Click "Choose Preset Battlemap" to preview and assign a ready-to-play dungeon, crypt, or wilderness map in one click.',
        targetSelector: '[data-tour="btn-choose-preset-map"]',
        placement: 'bottom'
      },
      {
        id: 'map-launch-vtt',
        title: 'Launch the Scene onto the VTT Canvas',
        body: 'Once your map is attached, click "Launch Scene to VTT" in the Scene Inspector header (or click "Load Practice Map" below) to load it onto the live tactical table.',
        proTip: 'You can also swap or relink a scene\'s battlemap later from the top Campaign Bar menu ("Relink Map Image/Video") without losing your drawn walls or room zones!',
        targetSelector: '#btn-launch-scene-vtt',
        placement: 'bottom',
        helperAction: {
          label: 'Load Practice Map',
          action: 'load_practice_map',
          variant: 'practice'
        },
        completionCheck: 'has_active_map',
        waitingLabel: 'Launch any scene or load the practice map',
        completedLabel: 'Battlemap loaded on the VTT canvas!'
      }
    ]
  },

  // =========================================================================
  // TRACK 5: DRAW WALLS ON MAPS
  // =========================================================================
  {
    id: 'walls',
    order: 5,
    title: 'Draw Walls on Maps',
    shortTitle: 'Draw Walls',
    subtitle: 'Trace solid line-of-sight barriers, snap to grid, split, and erase walls.',
    category: 'maps_geometry',
    estimatedMinutes: 3,
    steps: [
      {
        id: 'walls-creator-mode',
        title: 'Switch to Creator Mode',
        body: 'First, make sure you have a map open and switch to "Creator" mode in the top campaign bar. Creator Mode reveals all wall lines, corner nodes, doors, and room polygons so you can edit geometry cleanly.',
        targetSelector: '#btn-mode-creator, #btn-creator-toolbar-mode-creator',
        placement: 'bottom',
        helperAction: {
          label: 'Switch to Creator Mode',
          action: 'switch_creator_mode',
          variant: 'primary'
        },
        secondaryAction: {
          label: 'Load Practice Map',
          action: 'load_practice_map'
        },
        completionCheck: 'creator_mode_active',
        waitingLabel: 'Switch to Creator Mode',
        completedLabel: 'Creator Mode active!'
      },
      {
        id: 'walls-activate-tool',
        title: 'Activate the Draw Walls Tool',
        body: 'Click "Walls" in the top bar (or "Draw Walls" in the Creator Toolbar). Ensure Segment Type is set to "Solid".',
        bulletPoints: [
          'Solid walls completely block player Line of Sight and Fog of War.',
          'Toggle "Grid Snapping" ON for crisp 90° dungeon corridors, or OFF for organic caves and curved walls.'
        ],
        targetSelector: '#btn-bar-wall-tool, #btn-creator-pick-wall-tool, [data-tour="wall-type-normal"]',
        placement: 'bottom',
        helperAction: {
          label: 'Activate Wall Tool',
          action: 'select_wall_tool',
          variant: 'primary'
        },
        completionCheck: 'wall_tool_active',
        waitingLabel: 'Select the Draw Walls tool',
        completedLabel: 'Wall Tool is active!'
      },
      {
        id: 'walls-draw-on-canvas',
        title: 'Trace Walls Directly on the Map',
        body: 'Now try drawing a wall chain along one of the Ironbound Cellblock corridors! This card is docked at the top-center (and draggable) so your battlemap is unobstructed.',
        bulletPoints: [
          'Left-click once on the map to place the starting corner.',
          'Move your mouse and Left-click each corner to continue chaining wall segments.',
          'Double-click (or press Esc) to finish the current wall chain.'
        ],
        shortcut: 'Left-Click = Place Corner  •  Double-Click / Esc = Finish Chain',
        canvasInteractive: true,
        placement: 'dock-top-center',
        secondaryAction: {
          label: 'Load Tutorial Map',
          action: 'load_practice_map'
        },
        completionCheck: 'wall_count_increased',
        waitingLabel: 'Draw at least 1 wall segment on the map...',
        completedLabel: 'Awesome! You drew your first wall segment!'
      },
      {
        id: 'walls-split-erase-fov',
        title: 'Split, Erase & Preview Dynamic FOV',
        body: 'Made a mistake or need to carve a doorway into a long wall? Use the Creator Toolbar utilities:',
        bulletPoints: [
          'Split Tool: Click any point along an existing wall to slice it into two segments—super handy for cutting doorways!',
          'Erase Tool: Click a single wall segment or drag-slice across multiple walls to delete them instantly.',
          'FOV Active Toggle: Turn on Dynamic Lighting to preview how tokens cast real-time sightlines against your walls.'
        ],
        targetSelector: '#btn-creator-split-wall-toggle, #btn-creator-erase-wall-toggle, [data-tour="wall-fov-toggle"]',
        placement: 'left',
        canvasInteractive: true
      }
    ]
  },

  // =========================================================================
  // TRACK 6: DRAW & OPERATE DOORS
  // =========================================================================
  {
    id: 'doors',
    order: 6,
    title: 'Draw & Operate Doors',
    shortTitle: 'Doors',
    subtitle: 'Place interactive doors, secret doors, and windows—then open them live.',
    category: 'maps_geometry',
    estimatedMinutes: 2,
    steps: [
      {
        id: 'doors-select-type',
        title: 'Select the "Door" Segment Type',
        body: 'With the Wall Tool active in Creator Mode, switch the Segment Type from "Solid" to "Door" in the Wall Editor Toolbar.',
        bulletPoints: [
          'Door (Amber): Blocks vision & light when closed; clickable during play to swing open.',
          'Secret Door (Purple): Appears indistinguishable from a solid wall to players until you reveal/open it.',
          'Window (Cyan): Lets player vision & light pass through while still marking a physical barrier.'
        ],
        targetSelector: '[data-tour="wall-type-door"]',
        placement: 'left',
        helperAction: {
          label: 'Select Door Tool',
          action: 'select_door_wall_type',
          variant: 'primary'
        },
        secondaryAction: {
          label: 'Load Practice Map',
          action: 'load_practice_map'
        },
        completionCheck: 'door_type_active',
        waitingLabel: 'Switch Wall Segment Type to Door',
        completedLabel: 'Door segment type selected!'
      },
      {
        id: 'doors-draw-segment',
        title: 'Place a Door Across a Doorway',
        body: 'Left-click one jamb of a doorway on the map, then click the opposite jamb (and double-click or press Esc to finish).',
        bulletPoints: [
          'Pro Workflow: Trace outer walls continuously, leave a 1-square gap for each doorway, then switch to Door to drop all doors in one pass.',
          'You can also select any existing wall and change its type or door state (Closed / Open / Locked) in the toolbar.'
        ],
        shortcut: 'Click Jamb 1 → Click Jamb 2 → Double-Click / Esc',
        canvasInteractive: true,
        placement: 'dock-top-center',
        completionCheck: 'door_count_increased',
        waitingLabel: 'Draw at least 1 door segment on the map...',
        completedLabel: 'Door placed on the battlemap!'
      },
      {
        id: 'doors-test-run-mode',
        title: 'Switch to Run Campaign Mode & Open Doors',
        body: 'Switch to "Run Campaign" in the top bar. Solid wall helper lines vanish for a clean tabletop look, while interactive door icons remain clickable!',
        bulletPoints: [
          'Click any door marker on the map to toggle it Open or Closed.',
          'The instant a door opens, Player View Line of Sight & Fog of War flood into the adjoining room in real time!'
        ],
        targetSelector: '#btn-mode-run-campaign, #btn-creator-toolbar-mode-run',
        placement: 'bottom',
        helperAction: {
          label: 'Switch to Run Campaign',
          action: 'switch_run_mode',
          variant: 'primary'
        },
        completionCheck: 'run_mode_active',
        waitingLabel: 'Switch to Run Campaign mode to test doors',
        completedLabel: 'Run Campaign mode active — try clicking your door!'
      }
    ]
  },

  // =========================================================================
  // TRACK 7: UPLOAD ADVENTURE PDFs
  // =========================================================================
  {
    id: 'upload_pdf',
    order: 7,
    title: 'Upload Adventure PDFs',
    shortTitle: 'Upload PDFs',
    subtitle: 'Attach official or homebrew module chapters to power AI room briefings.',
    category: 'pdf_zones',
    estimatedMinutes: 2,
    steps: [
      {
        id: 'pdf-open-manager',
        title: 'Open Campaign Manager & Select "Test Chapter"',
        body: 'Adventure PDFs attach at the Chapter level (not an individual Scene) so every floor or encounter in that adventure shares the same indexed room keys, NPCs, and handouts.',
        bulletPoints: [
          'Open Campaign Manager.',
          'Click directly on "Test Chapter" in the left tree (not "Test Scene") to open the Chapter Inspector.'
        ],
        targetSelector: '#campaign-builder-modal-container',
        placement: 'dock-top-center',
        helperAction: {
          label: 'Open Campaign Manager',
          action: 'open_campaign_manager',
          variant: 'primary'
        },
        completionCheck: 'campaign_manager_open',
        waitingLabel: 'Open Campaign Manager',
        completedLabel: 'Campaign Manager is open!'
      },
      {
        id: 'pdf-locate-panel',
        title: 'Locate the Adventure Chapter PDF Panel',
        body: 'We included a custom matching adventure PDF ("The Ironbound Cellblock") with keyed rooms D1–D14 for this exact dungeon map! Scroll inside the Chapter Inspector to see the PDF panel.',
        proTip: 'Best Practice: Upload an individual adventure chapter (10–30 pages) rather than an entire 250-page anthology book for dramatically faster and more accurate room indexing.',
        targetSelector: '[data-tour="chapter-pdf-section"]',
        placement: 'dock-top-center',
        secondaryAction: {
          label: 'Download Tutorial PDF',
          action: 'download_tutorial_pdf'
        }
      },
      {
        id: 'pdf-click-upload',
        title: 'Upload the Tutorial PDF to Begin Ingestion',
        body: 'Click the blue "Upload PDF" button and choose the downloaded Ironbound Cellblock PDF — OR click "Auto-Upload Tutorial PDF" below to feed it straight into the selected chapter!',
        targetSelector: '[data-tour="btn-upload-chapter-pdf"]',
        placement: 'dock-top-center',
        helperAction: {
          label: 'Auto-Upload Tutorial PDF',
          action: 'auto_upload_tutorial_pdf',
          variant: 'primary'
        },
        secondaryAction: {
          label: 'Download Tutorial PDF',
          action: 'download_tutorial_pdf'
        }
      }
    ]
  },

  // =========================================================================
  // TRACK 8: INGEST & DIGEST PDFs WITH AI
  // =========================================================================
  {
    id: 'ingest_pdf',
    order: 8,
    title: 'Ingest & Digest PDFs',
    shortTitle: 'Ingest PDFs',
    subtitle: 'Understand AI room extraction, Chapter Flow, and applying notes to scenes.',
    category: 'pdf_zones',
    estimatedMinutes: 2,
    steps: [
      {
        id: 'ingest-pipeline',
        title: 'How the AI Ingestion Pipeline Works',
        body: 'As soon as you upload a Chapter PDF, MistWalker runs a 4-stage Gemini AI ingestion pipeline automatically:',
        bulletPoints: [
          '1. Server Upload: Stores the source document on your chapter.',
          '2. Scene & Room Key Indexing: Extracts every numbered room (e.g., G1–G21), read-aloud boxed text, secret DM notes, traps, DCs, and creature lists.',
          '3. Chapter Flow Extraction: Pulls non-room story hooks, faction motivations, dungeon rules, patrol schedules, and key NPCs.',
          '4. Cloud Save: Saves the structured digest directly to your chapter so it is ready on every scene.'
        ],
        targetSelector: '[data-tour="chapter-pdf-section"]',
        placement: 'dock-top-center',
        helperAction: {
          label: 'Open Campaign Manager',
          action: 'open_campaign_manager'
        },
        secondaryAction: {
          label: 'Auto-Upload Tutorial PDF',
          action: 'auto_upload_tutorial_pdf'
        }
      },
      {
        id: 'ingest-review-results',
        title: 'Review Indexed Scenes & Room Keys',
        body: 'Once ingestion finishes, the digest panel displays all discovered Scenes and Room Keys right inside the Chapter Inspector.',
        bulletPoints: [
          'Click "Create Scene from Digest" to spin up a pre-populated scene directly from a parsed adventure section.',
          'Click "Apply to Scene" to copy suggested DM notes & read-aloud text onto an existing scene.'
        ],
        targetSelector: '[data-tour="pdf-digest-results"], [data-tour="chapter-pdf-section"]',
        placement: 'left'
      },
      {
        id: 'ingest-chapter-guide',
        title: 'Use the Live Chapter Guide at the Table',
        body: 'When running a session on the battlemap, click "Chapter Guide" in the top bar anytime to read your ingested Chapter Flow—story hooks, patrols, NPCs, and quest milestones—without flipping through a physical book.',
        targetSelector: '#btn-main-open-chapter-guide',
        placement: 'bottom',
        helperAction: {
          label: 'Open Chapter Guide',
          action: 'open_chapter_guide'
        }
      }
    ]
  },

  // =========================================================================
  // TRACK 9: DRAW ROOM ZONES & LINK PDF BRIEFINGS
  // =========================================================================
  {
    id: 'room_zones',
    order: 9,
    title: 'Draw Room Zones',
    shortTitle: 'Room Zones',
    subtitle: 'Outline interactive room polygons, link PDF lore, broadcast text & spawn monsters.',
    category: 'pdf_zones',
    estimatedMinutes: 3,
    steps: [
      {
        id: 'zones-activate-tool',
        title: 'Activate "Draw Room Zone" in Creator Mode',
        body: 'Room Zones are interactive polygon overlays on your battlemap that connect directly to your ingested PDF room keys. Switch to Creator Mode and click "Draw Room Zone".',
        targetSelector: '#btn-bar-polygon-zone-tool, #btn-creator-pick-zone-tool',
        placement: 'bottom',
        helperAction: {
          label: 'Activate Room Zone Tool',
          action: 'select_zone_tool',
          variant: 'primary'
        },
        secondaryAction: {
          label: 'Load Practice Map',
          action: 'load_practice_map'
        },
        completionCheck: 'zone_tool_active',
        waitingLabel: 'Select the Draw Room Zone tool',
        completedLabel: 'Room Polygon Tool is active!'
      },
      {
        id: 'zones-trace-polygon',
        title: 'Trace a Room Perimeter on the Map',
        body: 'Click around the corners of any cell or hall on the Ironbound Cellblock map (minimum 3 corners)—for example, the Northwest Cell (D1), Central Hall (D13), or Crimson Brazier Altar (D14).',
        bulletPoints: [
          'Left-click each corner of the room.',
          'Double-click, click back on the starting dot, or click "Save & Label Room" in the toolbar to close the polygon.'
        ],
        shortcut: 'Click Corners (≥ 3) → Double-Click or "Save & Label Room"  •  Esc = Cancel',
        canvasInteractive: true,
        placement: 'dock-top-center',
        completionCheck: 'zone_count_increased',
        waitingLabel: 'Draw & save at least 1 Room Zone polygon...',
        completedLabel: 'Room Zone polygon saved!'
      },
      {
        id: 'zones-link-pdf',
        title: 'Link Your Zone to an Ingested PDF Room Key',
        body: 'When the Room Hotspot Editor opens after closing a polygon, type a Room Number from the Ironbound Cellblock PDF (like "D1", "D13", or "D14") or click "[Browse PDF]" to pick from the dropdown.',
        bulletPoints: [
          'MistWalker automatically matches and fills in the boxed read-aloud description, secret DM notes, traps, and creatures.',
          'No PDF uploaded? You can type your own custom room title, read-aloud text, and DM notes anytime!'
        ],
        targetSelector: '[data-tour="room-pdf-link-select"]',
        placement: 'dock-top-center',
        canvasInteractive: true
      },
      {
        id: 'zones-right-click-and-save',
        title: 'Right-Click Zones Live & Quick Save!',
        body: 'Now the magic happens during live play: Right-click directly inside any drawn Room Zone on the map to open the Room Briefing Drawer.',
        bulletPoints: [
          'Broadcast to Players: Send the boxed read-aloud description straight to every connected Player View screen (with optional AI narration).',
          'Spawn Monsters: Click "Spawn" next to any parsed creature in the room to drop its statblocked token directly onto the map.',
          'Don\'t forget to click "Save Scene" in the top bar so all your walls, doors, and room zones persist to the cloud!'
        ],
        targetSelector: '#btn-quick-save-scene, #btn-save-to-campaign',
        placement: 'bottom',
        canvasInteractive: true
      }
    ]
  }
];

export const getTutorialTrackById = (id: TutorialTrackId): TutorialTrack | undefined =>
  TUTORIAL_TRACKS.find((t) => t.id === id);

export const getNextTutorialTrack = (id: TutorialTrackId): TutorialTrack | undefined => {
  const idx = TUTORIAL_TRACKS.findIndex((t) => t.id === id);
  if (idx === -1 || idx + 1 >= TUTORIAL_TRACKS.length) return undefined;
  return TUTORIAL_TRACKS[idx + 1];
};
