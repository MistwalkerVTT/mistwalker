import { useState, useCallback, useRef } from 'react';

export const TUTORIAL_STEPS = [
  // Step 1: Campaign Manager & Prebuilt Demo Campaign
  {
    id: 'campaign-manager',
    phase: 'Step 1 of 10: Campaign Architecture',
    title: 'Campaign Manager & Prebuilt Demo',
    description: 'The Campaign Manager organizes your entire adventure into campaigns, chapters, and tactical scenes. We will explore using our prebuilt demo: "The Guild from GV" (Keys from the Golden Vault: Masterpiece Imbroglio).',
    taskHint: 'Click to open Campaign Manager or Load "The Guild from GV" Demo',
    targetSelector: '[data-tutorial="campaign-manager"]',
    fallbackSelector: '#group-btn-maps, #btn-open-campaign-manager-empty-screen',
    type: 'task',
    taskId: 'load-demo-campaign',
    actionLabel: 'Load "The Guild from GV" Demo'
  },

  // Step 2: Creating Scenes & Loading Battlemaps
  {
    id: 'create-scene-map',
    phase: 'Step 2 of 10: Scenes & Maps',
    title: 'Create a Scene & Load a Map',
    description: 'Each scene represents a tactical battle encounter with its own battlemap image, tokens, and lighting walls. You can upload custom maps, select preset battlemaps, or import full chapters with AI room digests.',
    taskHint: 'Click "+ Add Scene" in Campaign Manager or select any scene',
    targetSelector: '[data-tutorial="campaign-manager"]',
    fallbackSelector: '#group-btn-maps, #btn-open-campaign-manager-empty-screen',
    type: 'tour',
    actionLabel: 'Open Campaign Builder'
  },

  // Step 3: Drawing Tactical Walls & Doors
  {
    id: 'draw-walls',
    phase: 'Step 3 of 10: Dynamic Walls',
    title: 'Draw Tactical Walls & Doors',
    description: 'Open Tactical Layers and choose the Wall Tool. Left-click to place wall nodes that physically block Line of Sight and Fog of War for player vision. Double-click to complete. You can also place doors and toggle them open or closed!',
    taskHint: 'Click the Tactical Layers button and select the Wall Tool',
    targetSelector: '[data-tutorial="tactical-layers"]',
    fallbackSelector: '#group-btn-lighting',
    type: 'task',
    taskId: 'draw-walls',
    actionLabel: 'Activate Wall Tool'
  },

  // Step 4: Erasing Walls
  {
    id: 'erase-walls',
    phase: 'Step 4 of 10: Wall Management',
    title: 'Erase & Modify Walls',
    description: 'Need to clear a wall or open a breach? Select the Wall Eraser tool. Click any wall segment to delete it instantly, or click-and-drag across wall lines to slice through multiple walls at once.',
    taskHint: 'Select the Wall Eraser tool or delete any wall segment',
    targetSelector: '#btn-sidebar-erase-wall-tool',
    fallbackSelector: '[data-tutorial="tactical-layers"], #group-btn-lighting',
    type: 'task',
    taskId: 'erase-walls',
    actionLabel: 'Activate Wall Eraser'
  },

  // Step 5: Drawing Room Polygon Zones
  {
    id: 'draw-zones',
    phase: 'Step 5 of 10: Room Zones',
    title: 'Draw Room Polygon Zones',
    description: 'Under Tactical Layers, switch to the "Room Zones" tab and click "Draw Polygon". Click corners around any chamber (like Room G10 Parlor or G21 Raven Roost) to map an interactive room zone and link PDF descriptions.',
    taskHint: 'Click Room Zones tab and select Draw Polygon',
    targetSelector: '#subtab-room-zones',
    fallbackSelector: '#btn-sidebar-zone-polygon, [data-tutorial="tactical-layers"]',
    type: 'task',
    taskId: 'draw-zones',
    actionLabel: 'Open Room Zones'
  },

  // Step 6: Erasing Room Zones
  {
    id: 'erase-zones',
    phase: 'Step 6 of 10: Zone Management',
    title: 'Erase & Manage Room Zones',
    description: 'To remove a room boundary, open the Room Zones list or drawer and click the trash icon. The zone boundary is cleared while your underlying map and tokens remain completely untouched.',
    taskHint: 'Inspect the room zones list or click delete on any zone',
    targetSelector: '#subtab-room-zones',
    fallbackSelector: '[data-tutorial="tactical-layers"], #group-btn-lighting',
    type: 'task',
    taskId: 'erase-zones',
    actionLabel: 'View Room Zones'
  },

  // Step 7: Right-Click Zone: PDF Info & DM Secret Notes
  {
    id: 'zone-details-pdf',
    phase: 'Step 7 of 10: PDF Briefings & Notes',
    title: 'Right-Click Zone: PDF Lore & DM Secret Notes',
    description: 'Right-click directly on any room zone on the map (or click its room badge). This opens the Room Briefing Drawer, showing parsed PDF adventure data: room title, boxed read-aloud text, and secret DM notes with trap DCs, secrets, and monster rosters!',
    taskHint: 'Right-click on any room zone on the canvas or click a room badge',
    targetSelector: '[data-tutorial="room-zones"]',
    fallbackSelector: '#subtab-room-zones, [data-tutorial="tactical-layers"]',
    type: 'task',
    taskId: 'inspect-zone',
    actionLabel: 'Inspect Demo Zone (G10 Parlor)'
  },

  // Step 8: Broadcasting Description to Players
  {
    id: 'broadcast-players',
    phase: 'Step 8 of 10: Player Immersion',
    title: 'Broadcast Read-Aloud to Players',
    description: 'In the Room Briefing Drawer, click "Broadcast to Players" (or the radio icon). The boxed read-aloud description immediately displays across all connected Player View screens, with optional voice narration!',
    taskHint: 'Click Broadcast to Players in the room briefing',
    targetSelector: '[data-tutorial="broadcast-readaloud"]',
    fallbackSelector: '#subtab-room-zones, [data-tutorial="tactical-layers"]',
    type: 'task',
    taskId: 'broadcast-players',
    actionLabel: 'Broadcast Demo Description'
  },

  // Step 9: Spawning Creatures from Compendium
  {
    id: 'spawn-creatures',
    phase: 'Step 9 of 10: Compendium Spawning',
    title: 'Spawn Creatures from Compendium',
    description: 'The Room Briefing automatically identifies creatures mentioned in the PDF. Click "Spawn" or "Add to Map" next to any monster (like Bandit, Spy, or Oni) to drop their interactive token directly onto the tactical battlemap with full stats!',
    taskHint: 'Click Spawn Monster or drop any creature token onto the map',
    targetSelector: '[data-tutorial="room-monsters-section"]',
    fallbackSelector: '[data-tutorial="token-menu"], #group-btn-tokens',
    type: 'task',
    taskId: 'add-token',
    actionLabel: 'Spawn Demo Creature'
  },

  // Step 10: Report Bug Feature
  {
    id: 'report-bug',
    phase: 'Step 10 of 10: Support & Developer Notes',
    title: 'Report Bugs & Developer Notes',
    description: 'Encounter a visual glitch or want to log private notes? Click "Report Bug" anytime to submit notes with auto-captured session diagnostics. Access and manage your logged notes via "Bug Log" in the sidebar.',
    taskHint: 'Click Report Bug or finish the tutorial',
    targetSelector: '[data-tutorial="report-bug"]',
    fallbackSelector: '#btn-report-bug-sidebar, [data-tutorial="combat-tracker"]',
    type: 'tour',
    actionLabel: 'Open Bug Reporter'
  }
];

export const useTutorial = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedTasks, setCompletedTasks] = useState({});

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const currentStepIndexRef = useRef(currentStepIndex);
  currentStepIndexRef.current = currentStepIndex;

  const startTutorial = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const endTutorial = useCallback(() => {
    setIsActive(false);
    try {
      localStorage.setItem('tutorialCompleted', 'true');
    } catch (e) {
      // LocalStorage could fail in private mode
    }
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev < TUTORIAL_STEPS.length - 1) {
        return prev + 1;
      }
      setIsActive(false);
      try {
        localStorage.setItem('tutorialCompleted', 'true');
      } catch (e) {}
      return prev;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const triggerTaskCompletion = useCallback((taskId) => {
    // Only mark completed and advance if this task wasn't already completed
    let newlyCompleted = false;
    setCompletedTasks((prev) => {
      if (prev[taskId]) return prev;
      newlyCompleted = true;
      return { ...prev, [taskId]: true };
    });

    // If tutorial is currently active and on this specific task, automatically advance to next step
    if (isActiveRef.current) {
      const currentStep = TUTORIAL_STEPS[currentStepIndexRef.current];
      if (currentStep?.type === 'task' && currentStep?.taskId === taskId) {
        setTimeout(() => {
          nextStep();
        }, 600);
      }
    }
  }, [nextStep]);

  return {
    isActive,
    currentStep: TUTORIAL_STEPS[currentStepIndex],
    currentStepIndex,
    totalSteps: TUTORIAL_STEPS.length,
    completedTasks,
    startTutorial,
    nextStep,
    prevStep,
    endTutorial,
    triggerTaskCompletion
  };
};
