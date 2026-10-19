import { useState, useCallback, useRef } from 'react';

export const TUTORIAL_STEPS = [
  // Step 1: Side Bar Exploration & Highlights
  {
    id: 'sidebar-overview',
    phase: 'Step 1 of 11: Sidebar Navigation',
    title: 'Side Bar Exploration & Navigation',
    description: 'MistWalker organizes all DM controls along the left rail: Maps & Campaigns, Creature Tokens, Dice Roller, Combat Tracker, Tactical Layers (Fog, Walls & Zones), Tactical & Weather FX, AI DM Suite, and the Help & Support Center.',
    taskHint: 'Hover or click each button on the left sidebar to explore their tools',
    targetSelector: '#group-btn-maps',
    fallbackSelector: '[data-tutorial="campaign-manager"]',
    type: 'tour',
    actionLabel: 'Tour Sidebar Buttons'
  },

  // Step 2: Campaign Architecture & Loading The Guild House Scene
  {
    id: 'campaign-manager',
    phase: 'Step 2 of 11: Campaign Architecture',
    title: 'Campaign Manager & The Guild House Scene',
    description: 'The Campaign Manager organizes your adventure into campaigns, chapters, and tactical battle scenes. We will load the prebuilt scene: "The Guild House - Main Level" from Keys to the Golden Vault, with 64 walls/doors, 5 tokens, and 13 room zones already drawn.',
    taskHint: 'Click to load "The Guild House - Main Level"',
    targetSelector: '[data-tutorial="campaign-manager"]',
    fallbackSelector: '#group-btn-maps, #btn-open-campaign-manager-empty-screen',
    type: 'task',
    taskId: 'load-demo-campaign',
    actionLabel: 'Load The Guild House - Main Level'
  },

  // Step 3: Running a Campaign vs Creator Mode
  {
    id: 'run-campaign-mode',
    phase: 'Step 3 of 11: Campaign Execution',
    title: 'Run Campaign Mode vs Creator Mode',
    description: 'At the top bar, you can toggle between "Run Campaign" and "Creator Mode":\n\n• RUN CAMPAIGN: For live gameplay sessions. Wall geometries and construction lines are hidden for player immersion. Tokens cast dynamic line-of-sight vision through the Fog of War, while doors remain clickable on the canvas to open or shut them.\n\n• CREATOR MODE: For map preparation. All wall lines, door hinges, and room zones are revealed with color-coded strokes and draggable handles so you can draw, erase, or modify geometry.',
    taskHint: 'Click Run Campaign or Creator Mode in the top bar (or use the toggle buttons below) to see the difference',
    targetSelector: '#btn-mode-run-campaign',
    fallbackSelector: '#btn-mode-creator, #main-campaign-bar',
    type: 'tour',
    actionLabel: 'Compare Run vs Creator Mode'
  },

  // Step 4: Drawing Tactical Walls
  {
    id: 'draw-walls',
    phase: 'Step 4 of 11: Dynamic Walls',
    title: 'Draw Tactical Walls & Line-of-Sight',
    description: 'Under Tactical Layers, choose the Wall Tool. With Fog of War enabled, solid walls dynamically cast shadows and block line-of-sight for all player tokens. Left-click to start a wall line, click to add corner points, and double-click to finish. Solid walls physically block player vision, light sources, and fog of war.',
    taskHint: 'Activate the Wall Tool or practice placing wall nodes on the Guild House map',
    targetSelector: '[data-tutorial="tactical-layers"]',
    fallbackSelector: '#group-btn-lighting, #btn-bar-wall-tool',
    type: 'task',
    taskId: 'draw-walls',
    actionLabel: 'Activate Wall Tool'
  },

  // Step 5: Adding and Toggling Doors
  {
    id: 'doors-operation',
    phase: 'Step 5 of 11: Interactive Doors',
    title: 'Add & Operate Interactive Doors',
    description: 'Doors can be drawn as wall segments with type "door". When closed, doors block line of sight and keep Fog of War shrouded. When you or a player clicks a door, it swings open, instantly allowing light and vision to flood into the adjoining room!',
    taskHint: 'Inspect or click any door in The Guild House to toggle it open or closed',
    targetSelector: '#btn-bar-wall-tool',
    fallbackSelector: '[data-tutorial="tactical-layers"], #group-btn-lighting',
    type: 'tour',
    actionLabel: 'Explore Door Operations'
  },

  // Step 6: Erasing Walls & Doors
  {
    id: 'erase-walls',
    phase: 'Step 6 of 11: Wall Management',
    title: 'Erase & Modify Walls',
    description: 'Need to clear a wall or open a breach? Select the Wall Eraser tool. Click any wall segment to delete it instantly, or click-and-drag across wall lines to slice through multiple walls at once.',
    taskHint: 'Select the Wall Eraser tool or delete any wall segment',
    targetSelector: '#btn-sidebar-erase-wall-tool',
    fallbackSelector: '[data-tutorial="tactical-layers"], #group-btn-lighting',
    type: 'task',
    taskId: 'erase-walls',
    actionLabel: 'Activate Wall Eraser'
  },

  // Step 7: Drawing Room Polygon Zones
  {
    id: 'draw-zones',
    phase: 'Step 7 of 11: Room Zones',
    title: 'Draw Room Polygon Zones',
    description: 'Under Tactical Layers, switch to the "Room Zones" tab and click "Draw Polygon". Click corners around any chamber (like Area G10 Main Hall or G4 Cartwright Workshop) to map an interactive room zone and link PDF descriptions directly to that space.',
    taskHint: 'Click Room Zones tab and select Draw Polygon',
    targetSelector: '#subtab-room-zones',
    fallbackSelector: '#btn-sidebar-zone-polygon, [data-tutorial="tactical-layers"]',
    type: 'task',
    taskId: 'draw-zones',
    actionLabel: 'Open Room Zones'
  },

  // Step 8: Right-Click Zone: PDF Info & DM Secret Notes
  {
    id: 'zone-details-pdf',
    phase: 'Step 8 of 11: PDF Lore & DM Notes',
    title: 'Right-Click Zone: PDF Lore & DM Secret Notes',
    description: 'Right-click directly on any room zone on the canvas (like Area G10 or G2a). This opens the Room Briefing Drawer showing parsed PDF adventure data: room title, boxed read-aloud text, and secret DM notes with trap DCs, secrets, and monster rosters!',
    taskHint: 'Right-click on Room G10 on the canvas or click below to inspect',
    targetSelector: '[data-tutorial="room-zones"]',
    fallbackSelector: '#subtab-room-zones, [data-tutorial="tactical-layers"]',
    type: 'task',
    taskId: 'inspect-zone',
    actionLabel: 'Inspect Demo Zone (G10 Main Hall)'
  },

  // Step 9: Broadcasting Description to Players
  {
    id: 'broadcast-players',
    phase: 'Step 9 of 11: Player Immersion',
    title: 'Broadcast Read-Aloud to Players',
    description: 'In the Room Briefing Drawer, click "Broadcast to Players". The boxed read-aloud description immediately displays across all connected Player View screens with real-time text and optional voice narration!',
    taskHint: 'Click Broadcast to Players in the room briefing',
    targetSelector: '[data-tutorial="broadcast-readaloud"]',
    fallbackSelector: '#subtab-room-zones, [data-tutorial="tactical-layers"]',
    type: 'task',
    taskId: 'broadcast-players',
    actionLabel: 'Broadcast Demo Description'
  },

  // Step 10: Spawning Creatures from Compendium
  {
    id: 'spawn-creatures',
    phase: 'Step 10 of 11: Compendium Spawning',
    title: 'Spawn Creatures from Compendium',
    description: 'The Room Briefing automatically identifies creatures mentioned in the PDF. Click "Spawn" or "Add to Map" next to any monster (Bandit, Spy, Oni, Assassin) to drop their interactive token directly onto the tactical battlemap with full stats!',
    taskHint: 'Click Spawn Monster or drop any creature token onto the map',
    targetSelector: '[data-tutorial="room-monsters-section"]',
    fallbackSelector: '[data-tutorial="token-menu"], #group-btn-tokens',
    type: 'task',
    taskId: 'add-token',
    actionLabel: 'Spawn Demo Creature'
  },

  // Step 11: Help Section & AI Chatbot Support
  {
    id: 'help-section',
    phase: 'Step 11 of 11: Help & AI Assistant',
    title: 'Help Section, FAQ & AI Chatbot',
    description: 'Need assistance or have rule questions? Click the new "Help" button on the left sidebar. It includes a searchable feature FAQ, an embedded AI Assistant chatbot to answer any question, and quick access to restart this tutorial anytime.',
    taskHint: 'Click the Help icon on the sidebar or finish the tutorial',
    targetSelector: '#group-btn-help',
    fallbackSelector: '[data-tutorial="help-section"]',
    type: 'tour',
    actionLabel: 'Open Help & Support'
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
