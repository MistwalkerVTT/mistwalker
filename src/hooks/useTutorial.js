import { useState, useCallback, useRef } from 'react';

export const TUTORIAL_STEPS = [
  // Phase 1: Left Sidebar Tour (Overview)
  {
    id: 'combat-tracker',
    phase: 'Phase 1: Sidebar Tour',
    title: 'Combat Tracker',
    description: 'Manage initiative, turn order, HP damage/healing, and apply status conditions.',
    targetSelector: '[data-tutorial="combat-tracker"]',
    fallbackSelector: '#group-btn-combat',
    type: 'tour'
  },
  {
    id: 'tactical-layers',
    phase: 'Phase 1: Sidebar Tour',
    title: 'Tactical Layers',
    description: 'Control Fog of War, Dynamic Lighting/FOV walls, and Room Polygon Zones.',
    targetSelector: '[data-tutorial="tactical-layers"]',
    fallbackSelector: '#group-btn-lighting',
    type: 'tour'
  },
  {
    id: 'fx-spells',
    phase: 'Phase 1: Sidebar Tour',
    title: 'FX, Spells & Dice',
    description: 'Access environmental weather, spell templates, grid settings, and the built-in Dice Roller.',
    targetSelector: '[data-tutorial="fx-spells"]',
    fallbackSelector: '#group-btn-fx',
    type: 'tour'
  },
  {
    id: 'ai-suite',
    phase: 'Phase 1: Sidebar Tour',
    title: 'AI DM Suite',
    description: 'Access AI tools for map descriptions, voice narration setup, rule oracle queries, and the D&D AI Chatbot.',
    targetSelector: '[data-tutorial="ai-suite"]',
    fallbackSelector: '#group-btn-ai',
    type: 'tour'
  },
  {
    id: 'pan-select',
    phase: 'Phase 1: Sidebar Tour',
    title: 'Direct Tools (Pan & Select)',
    description: 'Use Select to move tokens or Pan (or hold Spacebar) to slide the map.',
    targetSelector: '[data-tutorial="pan-select"]',
    fallbackSelector: '#tool-pan-direct',
    type: 'tour'
  },
  {
    id: 'zoom-controls',
    phase: 'Phase 1: Sidebar Tour',
    title: 'Zoom Controls',
    description: 'Zoom in and out of your tactical canvas.',
    targetSelector: '[data-tutorial="zoom-controls"]',
    fallbackSelector: '#btn-zoom-in',
    type: 'tour'
  },

  // Phase 2: Interactive Tasks (Interactive Gates)
  {
    id: 'campaign-manager',
    phase: 'Phase 2: Interactive Task',
    title: 'Task 1: Load a Scene',
    description: 'Click here to open the Campaign Manager and load a scene.',
    taskHint: 'Click to open Campaign Manager or select any scene',
    targetSelector: '[data-tutorial="campaign-manager"]',
    fallbackSelector: '#group-btn-maps, #btn-open-campaign-manager-empty-screen',
    type: 'task',
    taskId: 'load-scene'
  },
  {
    id: 'token-menu',
    phase: 'Phase 2: Interactive Task',
    title: 'Task 2: Add a Token to the Grid',
    description: 'Drag and drop a token from the Library directly onto the tactical map grid.',
    taskHint: 'Place or drop any creature token onto the map',
    targetSelector: '[data-tutorial="token-menu"]',
    fallbackSelector: '#group-btn-tokens',
    type: 'task',
    taskId: 'add-token'
  },
  {
    id: 'room-zones',
    phase: 'Phase 2: Interactive Task',
    title: 'Task 3: Inspect DM Notes on a Room Zone',
    description: 'Right-click on any highlighted Room Polygon Zone on the map to open its DM Briefing Drawer and secret notes.',
    taskHint: 'Inspect or open any room briefing notes',
    targetSelector: '[data-tutorial="room-zones"]',
    fallbackSelector: '[data-tutorial="tactical-layers"], #group-btn-lighting',
    type: 'task',
    taskId: 'inspect-zone'
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
