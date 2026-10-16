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
  Plus
} from 'lucide-react';

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
    onOpenBugReport
  } = props || {};
  const [targetRect, setTargetRect] = useState(null);
  const [cardPosition, setCardPosition] = useState({ top: 120, left: 100, placement: 'right' });
  const retryTimerRef = useRef(null);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        endTutorial();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, endTutorial]);

  // Track target element position dynamically
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
        if (currentStep.id === 'campaign-manager') el = document.querySelector('#group-btn-maps, #btn-open-campaign-manager-empty-screen');
        else if (currentStep.id === 'create-scene-map') el = document.querySelector('#group-btn-maps, #btn-open-campaign-manager-empty-screen');
        else if (currentStep.id === 'draw-walls') el = document.querySelector('#tool-wall, #group-btn-lighting');
        else if (currentStep.id === 'erase-walls') el = document.querySelector('#btn-sidebar-erase-wall-tool, #group-btn-lighting');
        else if (currentStep.id === 'draw-zones') el = document.querySelector('#btn-sidebar-zone-polygon, #subtab-room-zones, #group-btn-lighting');
        else if (currentStep.id === 'erase-zones') el = document.querySelector('#subtab-room-zones, #group-btn-lighting');
        else if (currentStep.id === 'zone-details-pdf') el = document.querySelector('#subtab-room-zones, [data-tutorial="room-zones"]');
        else if (currentStep.id === 'broadcast-players') el = document.querySelector('[data-tutorial="broadcast-readaloud"], #btn-broadcast-room-text, #subtab-room-zones');
        else if (currentStep.id === 'spawn-creatures') el = document.querySelector('[data-tutorial="room-monsters-section"], #group-btn-tokens');
        else if (currentStep.id === 'report-bug') el = document.querySelector('#btn-report-bug-sidebar, [data-tutorial="report-bug"]');
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

    // Initial check
    const found = findTargetElement();

    // Poll every 80ms for up to 12 attempts to catch any animated or newly mounted menus
    if (!found) {
      let attempts = 0;
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = setInterval(() => {
        attempts++;
        if (findTargetElement() || attempts > 12) {
          clearInterval(retryTimerRef.current);
          if (attempts > 12 && !targetRect) {
            // Graceful fallback coordinate on the left sidebar
            setTargetRect({
              top: 100 + (currentStepIndex % 8) * 48,
              left: 12,
              width: 44,
              height: 44,
              right: 56,
              bottom: 144 + (currentStepIndex % 8) * 48
            });
          }
        }
      }, 80);
    }

    const handleUpdate = () => {
      findTargetElement();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      clearInterval(retryTimerRef.current);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isActive, currentStep, currentStepIndex]);

  // Compute smart floating card position beside spotlight
  useEffect(() => {
    if (!targetRect) return;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const cardW = 380;
    const cardH = 340;
    const padding = 20;

    let placement = 'right';
    let left = targetRect.right + 24;
    let top = Math.max(padding, targetRect.top - 10);

    // If too far right, flip to left or bottom
    if (left + cardW > viewportW - padding) {
      if (targetRect.left - cardW - 24 > padding) {
        placement = 'left';
        left = targetRect.left - cardW - 24;
      } else {
        placement = 'bottom';
        left = Math.max(padding, Math.min(targetRect.left, viewportW - cardW - padding));
        top = targetRect.bottom + 24;
      }
    }

    // Clamp top position inside viewport
    if (top + cardH > viewportH - padding) {
      top = Math.max(padding, viewportH - cardH - padding);
    }

    setCardPosition(prev => {
      if (
        prev &&
        prev.placement === placement &&
        Math.abs(prev.top - top) < 1 &&
        Math.abs(prev.left - left) < 1
      ) {
        return prev;
      }
      return { top, left, placement };
    });
  }, [targetRect]);

  if (!isActive || !currentStep) return null;

  const isTask = currentStep?.type === 'task';
  const isTaskCompleted = isTask && completedTasks[currentStep?.taskId];
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Spotlight dimensions with comfortable click padding
  const spotPadding = 6;
  const spotX = targetRect ? Math.max(0, targetRect.left - spotPadding) : 12;
  const spotY = targetRect ? Math.max(0, targetRect.top - spotPadding) : 100;
  const spotW = targetRect ? targetRect.width + spotPadding * 2 : 52;
  const spotH = targetRect ? targetRect.height + spotPadding * 2 : 52;

  return (
    <div className="fixed inset-0 z-[150] overflow-hidden pointer-events-none select-none">
      {/* Dimming backdrop with cutout */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-300"
          style={{
            top: spotY,
            left: spotX,
            width: spotW,
            height: spotH,
            boxShadow: '0 0 0 9999px rgba(4, 5, 10, 0.78), inset 0 0 20px rgba(245, 158, 11, 0.35)',
          }}
        />
      </div>

      {/* Pulsing Highlight Halo around the targeted element */}
      <div
        className="absolute pointer-events-none transition-all duration-300 rounded-2xl"
        style={{
          top: spotY,
          left: spotX,
          width: spotW,
          height: spotH,
          boxShadow: '0 0 0 2.5px #f59e0b, 0 0 25px 4px rgba(245, 158, 11, 0.5)',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}
      />

      {/* Directional Animated Arrow pointing at Target */}
      {targetRect && cardPosition.placement === 'right' && (
        <div
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            top: targetRect.top + targetRect.height / 2 - 12,
            left: targetRect.right + 6,
            zIndex: 1000
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

      {/* Floating Walkthrough Card */}
      <div
        className="absolute p-5 bg-zinc-950/95 border border-zinc-700/80 hover:border-zinc-600 rounded-2xl shadow-2xl backdrop-blur-2xl text-zinc-100 w-[380px] pointer-events-auto transition-all duration-200 animate-in fade-in zoom-in-95"
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.8), 0 0 25px 0 rgba(245, 158, 11, 0.2)'
        }}
      >
        {/* Top Header: Phase Badge & Step Counter & Close Button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase border ${
                isTask
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {currentStep.phase}
            </span>
          </div>

          <button
            onClick={endTutorial}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Exit Walkthrough (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          {currentStep.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-zinc-300 leading-relaxed mb-4">
          {currentStep.description}
        </p>

        {/* Interactive Task Box / Direct Action Controls */}
        <div className="mb-4 p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold font-mono text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Interactive Action
            </span>
            {isTaskCompleted ? (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> Done!
              </span>
            ) : (
              <span className="text-[10px] font-mono text-amber-400/90 animate-pulse">
                Ready to try...
              </span>
            )}
          </div>

          {currentStep.taskHint && (
            <p className="text-[11px] text-zinc-300 italic">
              {currentStep.taskHint}
            </p>
          )}

          {/* Step 1: Campaign Manager & Demo Scene Loading */}
          {currentStep.id === 'campaign-manager' && (
            <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
              {onLoadDemoCampaign && (
                <button
                  type="button"
                  onClick={onLoadDemoCampaign}
                  className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Load Demo: The Guild from GV</span>
                </button>
              )}
              {onOpenCampaignBuilder && (
                <button
                  type="button"
                  onClick={onOpenCampaignBuilder}
                  className="w-full py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open Campaign Manager</span>
                </button>
              )}
            </div>
          )}

          {/* Step 2: Create Scene & Map */}
          {currentStep.id === 'create-scene-map' && onOpenCampaignBuilder && (
            <div className="pt-1 border-t border-zinc-800">
              <button
                type="button"
                onClick={onOpenCampaignBuilder}
                className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Open Campaign Builder to Add Scene</span>
              </button>
            </div>
          )}

          {/* Step 3: Draw Tactical Walls */}
          {currentStep.id === 'draw-walls' && onActivateWallTool && (
            <div className="pt-1 border-t border-zinc-800">
              <button
                type="button"
                onClick={onActivateWallTool}
                className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Activate Wall Tool (Click canvas to draw)</span>
              </button>
            </div>
          )}

          {/* Step 4: Erase Walls */}
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

          {/* Step 5: Draw Room Polygon Zones */}
          {currentStep.id === 'draw-zones' && onActivateZoneTool && (
            <div className="pt-1 border-t border-zinc-800">
              <button
                type="button"
                onClick={onActivateZoneTool}
                className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Activate Room Polygon Tool</span>
              </button>
            </div>
          )}

          {/* Step 6: Erase Room Zones */}
          {currentStep.id === 'erase-zones' && onOpenRoomZones && (
            <div className="pt-1 border-t border-zinc-800">
              <button
                type="button"
                onClick={onOpenRoomZones}
                className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>View Room Zones List</span>
              </button>
            </div>
          )}

          {/* Step 7: Inspect Zone & DM Secret Notes */}
          {currentStep.id === 'zone-details-pdf' && onOpenRoomBriefing && (
            <div className="pt-1 border-t border-zinc-800">
              <button
                type="button"
                onClick={onOpenRoomBriefing}
                className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open G10 Infiltration Parlor Notes</span>
              </button>
            </div>
          )}

          {/* Step 8: Broadcast Description to Players */}
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

          {/* Step 9: Spawn Creature Token */}
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

          {/* Step 10: Report Bug Feature */}
          {currentStep.id === 'report-bug' && onOpenBugReport && (
            <div className="pt-1 border-t border-zinc-800">
              <button
                type="button"
                onClick={onOpenBugReport}
                className="w-full py-2 px-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-900/30 transition cursor-pointer"
              >
                <Bug className="w-3.5 h-3.5" />
                <span>Open Bug Reporter & DM Notes</span>
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-1">
          <button
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
              onClick={endTutorial}
              className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors cursor-pointer"
            >
              Exit
            </button>

            <button
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
      </div>
    </div>
  );
};
