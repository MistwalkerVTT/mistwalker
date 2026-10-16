import React, { useEffect, useState, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  BookOpen,
  Users,
  Layers,
  HelpCircle,
  Shield,
  Eraser,
  Radio,
  Bug,
  Play,
  Flame,
  Plus,
  GripHorizontal,
  Minus,
  Maximize2,
  RotateCcw,
  DoorOpen
} from 'lucide-react';
import { VirtualMouseSimulator } from './VirtualMouseSimulator';

export const TutorialOverlay = (props) => {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    completedTasks = {},
    nextStep,
    prevStep,
    endTutorial,
    onOpenCampaignBuilder,
    onOpenLoadCampaign,
    onLoadDemoCampaign,
    onOpenTokens,
    onOpenRoomBriefing,
    onActivateWallTool,
    onActivateWallEraser,
    onActivateZoneTool,
    onOpenRoomZones,
    onBroadcastDemo,
    onSpawnDemoMonster,
    onOpenBugReport,
    campaignMode,
    onToggleCampaignMode,
    onToggleDemoDoor,
    onOpenHelp
  } = props || {};

  const [targetRect, setTargetRect] = useState(null);
  const [cardPosition, setCardPosition] = useState({ top: 100, left: 90, placement: 'right' });
  const [customPos, setCustomPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [mouseSimulatorEnabled, setMouseSimulatorEnabled] = useState(true);
  const [replayTrigger, setReplayTrigger] = useState(0);

  const cardRef = useRef(null);
  const retryTimerRef = useRef(null);

  // Keyboard navigation (Esc to exit, Arrow keys to navigate)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input or textarea
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.key === 'Escape') {
        endTutorial();
      } else if (e.key === 'ArrowRight') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, endTutorial]);

  // Track target element position dynamically without ever blocking it
  useEffect(() => {
    if (!isActive || !currentStep) {
      setTargetRect(null);
      return;
    }

    const findTargetElement = () => {
      let el = null;
      if (currentStep.targetSelector) {
        el = document.querySelector(currentStep.targetSelector);
      }
      if (!el && currentStep.fallbackSelector) {
        el = document.querySelector(currentStep.fallbackSelector);
      }
      // General fallbacks based on step id
      if (!el) {
        if (currentStep.id === 'sidebar-overview') el = document.querySelector('#group-btn-maps, [data-tutorial="campaign-manager"]');
        else if (currentStep.id === 'campaign-manager') el = document.querySelector('#group-btn-maps, #btn-open-campaign-manager-empty-screen');
        else if (currentStep.id === 'run-campaign-mode') el = document.querySelector('#btn-mode-run-campaign, #btn-mode-creator');
        else if (currentStep.id === 'draw-walls') el = document.querySelector('#tool-wall, #btn-bar-wall-tool, #group-btn-lighting');
        else if (currentStep.id === 'doors-operation') el = document.querySelector('#btn-bar-wall-tool, [data-tutorial="tactical-layers"]');
        else if (currentStep.id === 'erase-walls') el = document.querySelector('#btn-sidebar-erase-wall-tool, #group-btn-lighting');
        else if (currentStep.id === 'draw-zones') el = document.querySelector('#btn-sidebar-zone-polygon, #subtab-room-zones, #group-btn-lighting');
        else if (currentStep.id === 'zone-details-pdf') el = document.querySelector('#subtab-room-zones, [data-tutorial="room-zones"]');
        else if (currentStep.id === 'broadcast-players') el = document.querySelector('[data-tutorial="broadcast-readaloud"], #btn-broadcast-room-text, #subtab-room-zones');
        else if (currentStep.id === 'spawn-creatures') el = document.querySelector('[data-tutorial="room-monsters-section"], #group-btn-tokens');
        else if (currentStep.id === 'help-section') el = document.querySelector('#group-btn-help, [data-tutorial="help-section"]');
      }

      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(prev => {
            if (
              prev &&
              Math.abs(prev.top - rect.top) < 0.5 &&
              Math.abs(prev.left - rect.left) < 0.5 &&
              Math.abs(prev.width - rect.width) < 0.5 &&
              Math.abs(prev.height - rect.height) < 0.5
            ) {
              return prev;
            }
            return {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              right: rect.right,
              bottom: rect.bottom
            };
          });
          return true;
        }
      }
      return false;
    };

    findTargetElement();

    // Poll a few times for animated mounts
    let attempts = 0;
    clearInterval(retryTimerRef.current);
    retryTimerRef.current = setInterval(() => {
      attempts++;
      if (findTargetElement() || attempts > 10) {
        clearInterval(retryTimerRef.current);
      }
    }, 100);

    const handleUpdate = () => findTargetElement();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      clearInterval(retryTimerRef.current);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isActive, currentStep, currentStepIndex]);

  // Compute default non-obtrusive floating card position beside target (unless user dragged it)
  useEffect(() => {
    if (!targetRect || customPos) return;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const cardW = 390;
    const cardH = 360;
    const padding = 20;

    let placement = 'right';
    let left = targetRect.right + 20;
    let top = Math.max(padding, targetRect.top - 10);

    // If target is in the left sidebar, don't overlap the flyout menu (flyout extends ~360px)
    if (targetRect.left < 80) {
      left = Math.min(viewportW - cardW - padding, 420);
    }

    // If too far right, flip to left or bottom
    if (left + cardW > viewportW - padding) {
      if (targetRect.left - cardW - 20 > padding) {
        placement = 'left';
        left = targetRect.left - cardW - 20;
      } else {
        placement = 'bottom';
        left = Math.max(padding, Math.min(targetRect.left, viewportW - cardW - padding));
        top = targetRect.bottom + 20;
      }
    }

    if (top + cardH > viewportH - padding) {
      top = Math.max(padding, viewportH - cardH - padding);
    }

    setCardPosition({ top, left, placement });
  }, [targetRect, customPos]);

  // Reset custom position when step changes if desired, or keep it convenient
  useEffect(() => {
    // If the step changed and card was way off, allow smart reposition
    if (!customPos && targetRect) {
      // Re-trigger layout
    }
  }, [currentStepIndex]);

  // Card dragging handlers
  const handleDragStart = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
      return;
    }
    const cardEl = cardRef.current;
    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newLeft = Math.max(10, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x));
      const newTop = Math.max(10, Math.min(window.innerHeight - 60, e.clientY - dragOffset.y));
      setCustomPos({ top: newTop, left: newLeft });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isActive || !currentStep) return null;

  const isTask = currentStep?.type === 'task';
  const isTaskCompleted = isTask && completedTasks[currentStep?.taskId];
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Active coordinates
  const activeTop = customPos ? customPos.top : cardPosition.top;
  const activeLeft = customPos ? customPos.left : cardPosition.left;

  const spotPadding = 4;
  const spotX = targetRect ? Math.max(0, targetRect.left - spotPadding) : null;
  const spotY = targetRect ? Math.max(0, targetRect.top - spotPadding) : null;
  const spotW = targetRect ? targetRect.width + spotPadding * 2 : null;
  const spotH = targetRect ? targetRect.height + spotPadding * 2 : null;

  return (
    <div 
      id="tutorial-overlay-container" 
      className="fixed inset-0 z-[85] pointer-events-none"
    >
      {/* 
        NO BLOCKING DIMMER OR BLACKOUT VEIL:
        All background elements (map, canvas, tokens, walls, toolbars, drawers)
        remain 100% visible, fully interactive, and clickable at all times.
      */}

      {/* Target Element Glowing Spotlight Beacon (POINTER EVENTS: NONE so clicks reach target underneath) */}
      {targetRect && spotX !== null && spotY !== null && spotW !== null && spotH !== null && (
        <>
          {/* Pulsing Highlight Halo around the targeted element */}
          <div
            className="absolute pointer-events-none transition-all duration-300 rounded-xl"
            style={{
              top: spotY,
              left: spotX,
              width: spotW,
              height: spotH,
              boxShadow: '0 0 0 3px #f59e0b, 0 0 25px 6px rgba(245, 158, 11, 0.45)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          >
            {/* Animated floating step pointer pill */}
            <div className="absolute -top-7 left-0 px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-mono font-bold uppercase tracking-wider shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-bounce">
              <Sparkles className="w-3 h-3 fill-current" />
              <span>Step {currentStepIndex + 1} Target</span>
            </div>
          </div>

          {/* Directional Indicator Arrow pointing directly at Target */}
          {!customPos && cardPosition.placement === 'right' && (
            <div
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                top: targetRect.top + targetRect.height / 2 - 12,
                left: targetRect.right + 6,
                zIndex: 90
              }}
              className="flex items-center text-amber-400 animate-pulse"
            >
              <svg className="w-5 h-6 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 12H5M5 12L12 19M5 12L12 5"
                  stroke="#fbbf24"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </>
      )}

      {/* Virtual animated cursor demonstrating DM actions on screen */}
      <VirtualMouseSimulator
        stepId={currentStep?.id}
        isEnabled={mouseSimulatorEnabled && isActive}
        replayTrigger={replayTrigger}
      />

      {/* 
        Floating, Draggable, Minimizable Tutorial Walkthrough Card:
        - pointer-events-auto ONLY on the card itself so user can interact with the card.
        - The user can click & drag the top header bar to move it anywhere on screen.
        - The user can minimize it into a compact pill while drawing walls or room zones.
      */}
      <div
        ref={cardRef}
        className={`absolute bg-zinc-950/98 border border-zinc-700 hover:border-zinc-500 rounded-2xl shadow-2xl backdrop-blur-2xl text-zinc-100 pointer-events-auto transition-all duration-150 ${
          isMinimized ? 'w-[320px] p-3' : 'w-[390px] p-5'
        }`}
        style={{
          top: activeTop,
          left: activeLeft,
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px 0 rgba(245, 158, 11, 0.25)',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Card Header (Draggable Handle) */}
        <div
          onMouseDown={handleDragStart}
          className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-800/80 cursor-grab active:cursor-grabbing select-none"
          title="Click and drag anywhere on this header to move the tutorial card"
        >
          <div className="flex items-center gap-2 min-w-0">
            <GripHorizontal className="w-4 h-4 text-zinc-500 hover:text-amber-400 shrink-0" />
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase border truncate ${
                isTask
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {currentStep.phase}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Replay Mouse Action Demonstration */}
            <button
              type="button"
              onClick={() => {
                setMouseSimulatorEnabled(true);
                setReplayTrigger(prev => prev + 1);
              }}
              className="p-1 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-zinc-800 transition cursor-pointer"
              title="Replay animated mouse demonstration on screen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Minimize / Expand Toggle */}
            <button
              type="button"
              onClick={() => setIsMinimized(prev => !prev)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              title={isMinimized ? "Expand Tutorial Card" : "Minimize to floating pill"}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            </button>

            {/* Exit Tutorial */}
            <button
              type="button"
              onClick={endTutorial}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              title="Exit Walkthrough (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimized View */}
        {isMinimized ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {isTaskCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              )}
              <span className="text-xs font-bold text-zinc-200 truncate">
                {currentStep.title}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={nextStep}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Full Expanded View */
          <>
            {/* Step Title */}
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              {currentStep.title}
            </h3>

            {/* Step Description */}
            <p className="text-xs text-zinc-300 leading-relaxed mb-3">
              {currentStep.description}
            </p>

            {/* Animated Mouse Mimic Status Indicator & Toggle */}
            <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 mb-3 text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${mouseSimulatorEnabled ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-300">
                  Mouse Mimic: {mouseSimulatorEnabled ? 'Demonstrating' : 'Paused'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMouseSimulatorEnabled(true);
                    setReplayTrigger(prev => prev + 1);
                  }}
                  className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer underline"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Replay Demo
                </button>
                <button
                  type="button"
                  onClick={() => setMouseSimulatorEnabled(prev => !prev)}
                  className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  {mouseSimulatorEnabled ? 'Hide Cursor' : 'Show Cursor'}
                </button>
              </div>
            </div>

            {/* Interactive Action Box */}
            <div className="mb-4 p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold font-mono text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Try It on the Screen
                </span>
                {isTaskCompleted ? (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Task Done!
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-400/90 animate-pulse">
                    Waiting for action...
                  </span>
                )}
              </div>

              {currentStep.taskHint && (
                <p className="text-[11px] text-zinc-300 italic">
                  {currentStep.taskHint}
                </p>
              )}

              {/* Direct Action Helpers */}
              {currentStep.id === 'sidebar-overview' && (
                <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
                  <div className="text-[11px] text-zinc-300">
                    The left navigation rail houses all MistWalker VTT tools. The virtual cursor will cycle through each icon, or you can proceed to load the Golden Vault adventure scene.
                  </div>
                </div>
              )}

              {currentStep.id === 'campaign-manager' && (
                <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
                  {onLoadDemoCampaign && (
                    <button
                      type="button"
                      onClick={onLoadDemoCampaign}
                      className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Load The Guild House - Main Level</span>
                    </button>
                  )}
                  {onOpenCampaignBuilder && (
                    <button
                      type="button"
                      onClick={onOpenCampaignBuilder}
                      className="w-full py-1.5 px-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>Open Campaign Manager</span>
                    </button>
                  )}
                </div>
              )}

              {currentStep.id === 'run-campaign-mode' && onToggleCampaignMode && (
                <div className="pt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={onToggleCampaignMode}
                    className="w-full py-2 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>Switch to {campaignMode === 'run' ? 'Creator Mode (Edit Walls & Zones)' : 'Run Campaign Mode (Doors & Fog)'}</span>
                  </button>
                </div>
              )}

              {currentStep.id === 'draw-walls' && onActivateWallTool && (
                <div className="pt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={onActivateWallTool}
                    className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Activate Wall Tool (Click map to draw)</span>
                  </button>
                </div>
              )}

              {currentStep.id === 'doors-operation' && (
                <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
                  {onToggleDemoDoor && (
                    <button
                      type="button"
                      onClick={onToggleDemoDoor}
                      className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <DoorOpen className="w-3.5 h-3.5" />
                      <span>Toggle Center Dividing Door Open / Closed</span>
                    </button>
                  )}
                  {onActivateWallTool && (
                    <button
                      type="button"
                      onClick={onActivateWallTool}
                      className="w-full py-1.5 px-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>Activate Wall Tool to Draw New Doors</span>
                    </button>
                  )}
                </div>
              )}

              {currentStep.id === 'erase-walls' && onActivateWallEraser && (
                <div className="pt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={onActivateWallEraser}
                    className="w-full py-2 px-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Eraser className="w-3.5 h-3.5 text-red-400" />
                    <span>Activate Wall Eraser Tool</span>
                  </button>
                </div>
              )}

              {currentStep.id === 'draw-zones' && (
                <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
                  {onActivateZoneTool && (
                    <button
                      type="button"
                      onClick={onActivateZoneTool}
                      className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Activate Room Polygon Tool</span>
                    </button>
                  )}
                  {onOpenRoomZones && (
                    <button
                      type="button"
                      onClick={onOpenRoomZones}
                      className="w-full py-1.5 px-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>View Room Zones List</span>
                    </button>
                  )}
                </div>
              )}

              {currentStep.id === 'zone-details-pdf' && onOpenRoomBriefing && (
                <div className="pt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={onOpenRoomBriefing}
                    className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open G10 Infiltration Parlor Notes & Lore</span>
                  </button>
                </div>
              )}

              {currentStep.id === 'broadcast-players' && onBroadcastDemo && (
                <div className="pt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={onBroadcastDemo}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Broadcast Demo Read-Aloud Now</span>
                  </button>
                </div>
              )}

              {currentStep.id === 'spawn-creatures' && onSpawnDemoMonster && (
                <div className="pt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={onSpawnDemoMonster}
                    className="w-full py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Spawn Agile Hand Lookout Token</span>
                  </button>
                </div>
              )}

              {currentStep.id === 'help-section' && (
                <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
                  {onOpenHelp && (
                    <button
                      type="button"
                      onClick={onOpenHelp}
                      className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Open Help Drawer & AI Chatbot</span>
                    </button>
                  )}
                  {onOpenBugReport && (
                    <button
                      type="button"
                      onClick={onOpenBugReport}
                      className="w-full py-1.5 px-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Bug className="w-3.5 h-3.5 text-red-400" />
                      <span>Open Bug Reporter & DM Notes</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Step Progress Bar */}
            <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                  currentStepIndex === 0
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-850 cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={endTutorial}
                  className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors cursor-pointer"
                >
                  Exit
                </button>

                <button
                  type="button"
                  onClick={nextStep}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-zinc-950 flex items-center gap-1.5 transition-all transform active:scale-95 shadow-md cursor-pointer ${
                    isTask && !isTaskCompleted
                      ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-500/20'
                      : 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20'
                  }`}
                >
                  {isLastStep ? (
                    <>
                      <span>Finish Tour</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  ) : isTask && !isTaskCompleted ? (
                    <>
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Next Step</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
