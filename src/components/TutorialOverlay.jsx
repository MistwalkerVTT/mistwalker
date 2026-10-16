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
  HelpCircle
} from 'lucide-react';

export const TutorialOverlay = ({
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
  onOpenTokens,
  onOpenRoomBriefing
}) => {
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
        if (currentStep.id === 'combat-tracker') el = document.querySelector('#group-btn-combat');
        else if (currentStep.id === 'tactical-layers') el = document.querySelector('#group-btn-lighting');
        else if (currentStep.id === 'fx-spells') el = document.querySelector('#group-btn-fx');
        else if (currentStep.id === 'ai-suite') el = document.querySelector('#group-btn-ai');
        else if (currentStep.id === 'pan-select') el = document.querySelector('#tool-pan-direct, #tool-select-direct');
        else if (currentStep.id === 'zoom-controls') el = document.querySelector('#btn-zoom-in');
        else if (currentStep.id === 'campaign-manager') el = document.querySelector('#group-btn-maps, #btn-open-campaign-manager-empty-screen');
        else if (currentStep.id === 'token-menu') el = document.querySelector('#group-btn-tokens');
        else if (currentStep.id === 'room-zones') el = document.querySelector('#subtab-room-zones, #group-btn-lighting');
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
              top: 100 + currentStepIndex * 48,
              left: 12,
              width: 44,
              height: 44,
              right: 56,
              bottom: 144 + currentStepIndex * 48
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
    const cardW = 360;
    const cardH = 280;
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

  if (!isActive) return null;

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
      {/* 
        Spotlight Backdrop:
        - When in Task (Phase 2): Uses pointer-events: none dimming so user can freely click Campaign menus,
          open flyouts, drag tokens onto the map canvas, and right-click room zones!
        - When in Overview (Phase 1): Uses 4 blocker panels leaving the cutout box completely free of DOM elements,
          so clicks on the spotlighted button always pass directly through to the target!
      */}
      {isTask ? (
        <div className="absolute inset-0 pointer-events-none">
          {/* Subtle dimming backdrop with spotlight cutout via box-shadow */}
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
      ) : (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Panel */}
          <div
            className="absolute top-0 left-0 right-0 bg-black/75 pointer-events-auto"
            style={{ height: spotY }}
          />
          {/* Bottom Panel */}
          <div
            className="absolute left-0 right-0 bottom-0 bg-black/75 pointer-events-auto"
            style={{ top: spotY + spotH }}
          />
          {/* Left Panel */}
          <div
            className="absolute left-0 bg-black/75 pointer-events-auto"
            style={{ top: spotY, height: spotH, width: spotX }}
          />
          {/* Right Panel */}
          <div
            className="absolute right-0 bg-black/75 pointer-events-auto"
            style={{ top: spotY, height: spotH, left: spotX + spotW }}
          />
        </div>
      )}

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
        className="absolute p-5 bg-zinc-950/95 border border-zinc-700/80 hover:border-zinc-600 rounded-2xl shadow-2xl backdrop-blur-2xl text-zinc-100 w-[360px] pointer-events-auto transition-all duration-200 animate-in fade-in zoom-in-95"
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
            <span className="text-[11px] font-mono text-zinc-400 font-semibold">
              Step {currentStepIndex + 1} of {totalSteps}
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

        {/* Interactive Task Direct Action Shortcuts (Phase 2) */}
        {isTask && (
          <div className="mb-4 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold font-mono text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Action Required
              </span>
              {isTaskCompleted ? (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Done!
                </span>
              ) : (
                <span className="text-[10px] font-mono text-amber-400/90 animate-pulse">
                  Awaiting Action...
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-300 italic">
              {currentStep.taskHint}
            </p>

            {/* Quick Action Buttons for Convenience */}
            {currentStep.taskId === 'load-scene' && (
              <div className="flex gap-2 pt-1 border-t border-zinc-800">
                {onOpenCampaignBuilder && (
                  <button
                    type="button"
                    onClick={onOpenCampaignBuilder}
                    className="flex-1 py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Campaign Manager</span>
                  </button>
                )}
                {onOpenLoadCampaign && (
                  <button
                    type="button"
                    onClick={onOpenLoadCampaign}
                    className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Load Scene Selector"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {currentStep.taskId === 'add-token' && onOpenTokens && (
              <div className="pt-1 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onOpenTokens}
                  className="w-full py-1.5 px-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Open Tokens Library</span>
                </button>
              </div>
            )}

            {currentStep.taskId === 'inspect-zone' && onOpenRoomBriefing && (
              <div className="pt-1 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onOpenRoomBriefing}
                  className="w-full py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Open Room Zone Details</span>
                </button>
              </div>
            )}
          </div>
        )}

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
                  <span>Skip Task</span>
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
