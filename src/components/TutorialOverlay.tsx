import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  GraduationCap,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Lightbulb,
  Keyboard,
  Minimize2,
  Maximize2,
  Play,
  ArrowRight,
  ChevronDown,
  Map as MapIcon,
  GripHorizontal,
  Trash2,
  Download,
  CloudUpload
} from 'lucide-react';
import {
  TutorialTrack,
  TutorialTrackId,
  TutorialActionKey,
  TutorialLiveState,
  TutorialCompletionCheck
} from '../types/tutorial';
import { TUTORIAL_TRACKS, getNextTutorialTrack } from '../data/tutorialTracks';

interface TutorialOverlayProps {
  activeTrack: TutorialTrack;
  stepIndex: number;
  isMinimized: boolean;
  completedTracks: TutorialTrackId[];
  liveState: TutorialLiveState;
  hasTutorialCampaign?: boolean;
  onStepChange: (newIndex: number) => void;
  onSelectTrack: (trackId: TutorialTrackId) => void;
  onCompleteTrack: (trackId: TutorialTrackId) => void;
  onToggleMinimize: () => void;
  onClose: () => void;
  onExecuteAction: (action: TutorialActionKey) => void;
  onDeleteTutorialCampaign?: () => Promise<void> | void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function findFirstVisibleElement(selector?: string): HTMLElement | null {
  if (!selector) return null;
  const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
  for (const sel of parts) {
    try {
      const nodes = document.querySelectorAll(sel);
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i] as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const style = window.getComputedStyle(el);
          if (style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0) {
            return el;
          }
        }
      }
    } catch {
      // Ignore invalid selector fragments
    }
  }
  return null;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  activeTrack,
  stepIndex,
  isMinimized,
  completedTracks,
  liveState,
  hasTutorialCampaign = false,
  onStepChange,
  onSelectTrack,
  onCompleteTrack,
  onToggleMinimize,
  onClose,
  onExecuteAction,
  onDeleteTutorialCampaign
}) => {
  const step = activeTrack.steps[stepIndex] || activeTrack.steps[0];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex >= activeTrack.steps.length - 1;
  const nextTrack = useMemo(() => getNextTutorialTrack(activeTrack.id), [activeTrack.id]);

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const [showCleanupPrompt, setShowCleanupPrompt] = useState(false);
  const [isDeletingCampaign, setIsDeletingCampaign] = useState(false);

  // User-dragged custom position (null = automatic top-center / smart spotlight placement)
  const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Baseline counts captured when entering each step for delta milestones
  const baselineRef = useRef<{
    stepId: string;
    wallCount: number;
    doorCount: number;
    zoneCount: number;
  }>({
    stepId: step.id,
    wallCount: liveState.wallCount,
    doorCount: liveState.doorCount,
    zoneCount: liveState.zoneCount
  });

  useEffect(() => {
    if (baselineRef.current.stepId !== step.id) {
      baselineRef.current = {
        stepId: step.id,
        wallCount: liveState.wallCount,
        doorCount: liveState.doorCount,
        zoneCount: liveState.zoneCount
      };
    }
  }, [step.id, liveState.wallCount, liveState.doorCount, liveState.zoneCount]);

  // Evaluate live step completion milestone
  const isStepMilestoneMet = useMemo(() => {
    const check: TutorialCompletionCheck | undefined = step.completionCheck;
    if (!check) return false;
    switch (check) {
      case 'campaign_manager_open':
        return liveState.isCampaignManagerOpen;
      case 'has_active_map':
        return liveState.hasActiveMap;
      case 'creator_mode_active':
        return liveState.campaignMode === 'creator';
      case 'run_mode_active':
        return liveState.campaignMode === 'run';
      case 'wall_tool_active':
        return liveState.tool === 'wall';
      case 'door_type_active':
        return liveState.tool === 'wall' && (liveState.activeWallType === 'door' || liveState.activeWallType === 'secret_door');
      case 'wall_count_increased':
        return liveState.wallCount > baselineRef.current.wallCount;
      case 'door_count_increased':
        return liveState.doorCount > baselineRef.current.doorCount;
      case 'zone_tool_active':
        return liveState.tool === 'zone' || liveState.tool === 'polygon_zone' || liveState.tool === 'hotspot';
      case 'zone_count_increased':
        return liveState.zoneCount > baselineRef.current.zoneCount;
      default:
        return false;
    }
  }, [step.completionCheck, liveState]);

  // Continuously track target element bounding box for spotlight ring
  useEffect(() => {
    if (isMinimized || showCleanupPrompt || !step.targetSelector) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = findFirstVisibleElement(step.targetSelector);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height
      });
    };

    updateRect();
    const interval = window.setInterval(updateRect, 350);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [step.targetSelector, isMinimized, showCleanupPrompt]);

  // Pointer drag handlers for the header
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragOffsetRef.current) return;
      const cardWidth = cardRef.current?.offsetWidth || 380;
      const cardHeight = cardRef.current?.offsetHeight || 340;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const nextLeft = Math.max(12, Math.min(vw - cardWidth - 12, e.clientX - dragOffsetRef.current.dx));
      const nextTop = Math.max(12, Math.min(vh - Math.min(cardHeight, 120) - 12, e.clientY - dragOffsetRef.current.dy));
      setDragPos({ left: nextLeft, top: nextTop });
    };
    const handleMouseUp = () => {
      dragOffsetRef.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    // Don't start drag when clicking buttons inside header
    if ((e.target as HTMLElement).closest('button')) return;
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top
    };
  };

  // Escape key closes track menu
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTrackMenu) {
        setShowTrackMenu(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showTrackMenu]);

  // Compute smart card position — NEVER lands in the bottom-right toast zone!
  const cardStyle = useMemo<React.CSSProperties>(() => {
    const cardWidth = 385;
    const cardEstimatedHeight = 360;
    const margin = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // If user manually dragged the tutorial card, honor their placement
    if (dragPos) {
      return {
        position: 'fixed',
        top: dragPos.top,
        left: dragPos.left,
        width: cardWidth,
        maxWidth: 'calc(100vw - 32px)'
      };
    }

    // Center modal for cleanup prompt
    if (showCleanupPrompt) {
      return {
        position: 'fixed',
        top: Math.max(72, Math.round((vh - 260) / 2)),
        left: Math.max(margin, Math.round((vw - cardWidth) / 2)),
        width: cardWidth,
        maxWidth: 'calc(100vw - 32px)'
      };
    }

    // Default docked placement: Top-Center (safely below MainCampaignBar, away from bottom-right toasts)
    const topCenterLeft = Math.max(margin, Math.round((vw - cardWidth) / 2));
    if (
      step.canvasInteractive ||
      step.placement === 'dock-top-center' ||
      step.placement === 'dock-bottom-right' ||
      !targetRect
    ) {
      return {
        position: 'fixed',
        top: 72,
        left: topCenterLeft,
        width: cardWidth,
        maxWidth: 'calc(100vw - 32px)'
      };
    }

    let top = targetRect.top + targetRect.height + margin;
    let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;

    if (step.placement === 'top') {
      top = targetRect.top - cardEstimatedHeight - margin;
    } else if (step.placement === 'right') {
      top = targetRect.top;
      left = targetRect.left + targetRect.width + margin;
    } else if (step.placement === 'left') {
      top = targetRect.top;
      left = targetRect.left - cardWidth - margin;
    } else if (step.placement === 'center') {
      top = Math.max(72, (vh - cardEstimatedHeight) / 2);
      left = topCenterLeft;
    }

    // Clamp horizontally
    if (left + cardWidth > vw - margin) left = vw - cardWidth - margin;
    if (left < margin) left = margin;

    // Clamp vertically AND keep clear of bottom-right toast popup zone (bottom 140px on right side)
    const inRightToastZone = left + cardWidth > vw - 440;
    const maxBottomY = inRightToastZone ? vh - 145 : vh - margin;

    if (top + cardEstimatedHeight > maxBottomY) {
      const aboveTop = targetRect.top - cardEstimatedHeight - margin;
      top = aboveTop >= 68 ? aboveTop : 72;
    }
    if (top < 64) top = 68;

    return {
      position: 'fixed',
      top,
      left,
      width: cardWidth,
      maxWidth: 'calc(100vw - 32px)'
    };
  }, [dragPos, showCleanupPrompt, targetRect, step.canvasInteractive, step.placement]);

  const requestExitOrCleanup = () => {
    if (hasTutorialCampaign && onDeleteTutorialCampaign) {
      setShowCleanupPrompt(true);
    } else {
      onClose();
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      onCompleteTrack(activeTrack.id);
      if (nextTrack) {
        onSelectTrack(nextTrack.id);
      } else {
        requestExitOrCleanup();
      }
    } else {
      onStepChange(stepIndex + 1);
    }
  };

  const handleFinishOnly = () => {
    onCompleteTrack(activeTrack.id);
    requestExitOrCleanup();
  };

  const handleConfirmDeleteTutorialCampaign = async () => {
    if (!onDeleteTutorialCampaign) {
      onClose();
      return;
    }
    setIsDeletingCampaign(true);
    try {
      await onDeleteTutorialCampaign();
    } finally {
      setIsDeletingCampaign(false);
      setShowCleanupPrompt(false);
      onClose();
    }
  };

  const renderActionIcon = (action: TutorialActionKey, variant?: 'primary' | 'practice') => {
    if (action === 'download_tutorial_pdf') return <Download className="w-3.5 h-3.5" />;
    if (action === 'auto_upload_tutorial_pdf') return <CloudUpload className="w-3.5 h-3.5" />;
    if (action === 'load_practice_map' || variant === 'practice') return <MapIcon className="w-3.5 h-3.5" />;
    return <Play className="w-3 h-3 fill-current" />;
  };

  // Minimized floating pill — positioned at UPPER-RIGHT so bottom-right toasts never interfere!
  if (isMinimized) {
    return (
      <div className="fixed top-16 right-5 z-[10050] animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-amber-500/50 shadow-2xl shadow-amber-950/40 text-xs font-mono">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
              Track {activeTrack.order}/9 • Step {stepIndex + 1}/{activeTrack.steps.length}
            </span>
            <span className="text-zinc-100 font-semibold truncate max-w-[190px]">
              {step.title}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleMinimize}
            className="ml-1 p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition cursor-pointer"
            title="Expand Tutorial"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={requestExitOrCleanup}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title="Exit Tutorial"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Non-blocking Spotlight Highlight Ring (pointer-events-none so user can click the real UI!) */}
      {targetRect && !showCleanupPrompt && (
        <div
          className="fixed z-[10040] pointer-events-none rounded-xl transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - 5,
            left: targetRect.left - 5,
            width: targetRect.width + 10,
            height: targetRect.height + 10,
            boxShadow:
              '0 0 0 2px rgba(245, 158, 11, 0.95), 0 0 0 6px rgba(245, 158, 11, 0.25), 0 0 28px rgba(245, 158, 11, 0.45)'
          }}
        >
          <div className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg animate-bounce">
            <Sparkles className="w-3 h-3" />
          </div>
        </div>
      )}

      {/* Floating Draggable Tutorial Card */}
      <div
        ref={cardRef}
        style={cardStyle}
        className="z-[10050] bg-zinc-950/95 backdrop-blur-xl border border-amber-500/45 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.75)] text-zinc-100 flex flex-col overflow-visible animate-in fade-in duration-150"
      >
        {/* Top Accent Strip */}
        <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400" />

        {/* Cleanup Confirmation View when Exiting/Completing with Tutorial Campaign */}
        {showCleanupPrompt ? (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono">
                  Clean Up Tutorial Campaign?
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed mt-1">
                  You created <strong className="text-amber-300">&ldquo;Test Campaign for Tutorial&rdquo;</strong> during this walkthrough. Would you like to remove it now to keep your campaign list tidy, or keep it for practice?
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowCleanupPrompt(false);
                  onClose();
                }}
                disabled={isDeletingCampaign}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 transition cursor-pointer"
              >
                Keep for Practice
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTutorialCampaign}
                disabled={isDeletingCampaign}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-rose-950/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingCampaign ? 'Removing...' : 'Remove Tutorial Campaign'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Draggable Header: Track Switcher + Controls */}
            <div
              onMouseDown={handleHeaderMouseDown}
              className="px-4 pt-3 pb-2.5 border-b border-zinc-800/90 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none"
              title="Drag header to move tutorial window anywhere"
            >
              <div className="relative min-w-0 flex items-center gap-1.5">
                <GripHorizontal className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <button
                  type="button"
                  onClick={() => setShowTrackMenu((prev) => !prev)}
                  className="flex items-center gap-2 text-left group cursor-pointer max-w-full"
                  title="Switch tutorial track"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                      <span>Track {activeTrack.order} of {TUTORIAL_TRACKS.length}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showTrackMenu ? 'rotate-180' : ''}`} />
                    </div>
                    <div className="text-xs font-bold text-white truncate group-hover:text-amber-200 transition">
                      {activeTrack.title}
                    </div>
                  </div>
                </button>

                {/* Quick Track Dropdown */}
                {showTrackMenu && (
                  <div className="absolute left-0 top-full mt-2 w-72 max-h-80 overflow-y-auto sidebar-scrollbar rounded-xl bg-zinc-950 border border-zinc-700 shadow-2xl p-1.5 z-[10060] space-y-0.5">
                    {TUTORIAL_TRACKS.map((t) => {
                      const isDone = completedTracks.includes(t.id);
                      const isCurrent = t.id === activeTrack.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onSelectTrack(t.id);
                            setShowTrackMenu(false);
                          }}
                          className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold'
                              : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                          }`}
                        >
                          <span className="truncate">
                            <span className="font-mono text-[10px] text-zinc-500 mr-1.5">{t.order}.</span>
                            {t.title}
                          </span>
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onToggleMinimize}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                  title="Minimize to upper-right pill"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={requestExitOrCleanup}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                  title="Exit Tutorial"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Step Progress Dots */}
            <div className="px-4 pt-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 flex-1">
                {activeTrack.steps.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onStepChange(idx)}
                    className={`h-1.5 flex-1 rounded-full transition-all cursor-pointer ${
                      idx < stepIndex
                        ? 'bg-emerald-500'
                        : idx === stepIndex
                        ? 'bg-amber-400'
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                    title={`Step ${idx + 1}: ${s.title}`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                Step {stepIndex + 1}/{activeTrack.steps.length}
              </span>
            </div>

            {/* Step Content */}
            <div className="px-4 py-3 space-y-2.5 max-h-[340px] overflow-y-auto sidebar-scrollbar">
              <h4 className="text-sm font-bold text-white leading-snug flex items-center gap-2">
                {step.canvasInteractive && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-mono text-emerald-300 uppercase shrink-0">
                    Live Canvas
                  </span>
                )}
                <span>{step.title}</span>
              </h4>

              <p className="text-xs text-zinc-300 leading-relaxed">{step.body}</p>

              {step.bulletPoints && step.bulletPoints.length > 0 && (
                <ul className="space-y-1.5 pt-0.5">
                  {step.bulletPoints.map((pt, i) => (
                    <li key={i} className="text-[11.5px] text-zinc-300 leading-snug flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              )}

              {step.shortcut && (
                <div className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10.5px] font-mono text-sky-300 flex items-center gap-2">
                  <Keyboard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{step.shortcut}</span>
                </div>
              )}

              {step.proTip && (
                <div className="px-2.5 py-2 rounded-xl bg-amber-950/30 border border-amber-500/25 text-[11px] text-amber-200/90 leading-snug flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{step.proTip}</span>
                </div>
              )}

              {/* Live Milestone Status Indicator */}
              {step.completionCheck && (
                <div
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono flex items-center gap-2 transition-all ${
                    isStepMilestoneMet
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
                  }`}
                >
                  {isStepMilestoneMet ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold">{step.completedLabel || 'Step Complete!'}</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      <span>{step.waitingLabel || 'Try this step, or click Next anytime'}</span>
                    </>
                  )}
                </div>
              )}

              {/* One-Click Helper / Practice Map / Tutorial PDF Actions */}
              {(step.helperAction || step.secondaryAction) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {step.helperAction && !isStepMilestoneMet && (
                    <button
                      type="button"
                      onClick={() => onExecuteAction(step.helperAction!.action)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                        step.helperAction.variant === 'practice'
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                      }`}
                    >
                      {renderActionIcon(step.helperAction.action, step.helperAction.variant)}
                      <span>{step.helperAction.label}</span>
                    </button>
                  )}

                  {step.secondaryAction && (
                    <button
                      type="button"
                      onClick={() => onExecuteAction(step.secondaryAction!.action)}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-emerald-500/50 text-emerald-300 text-[11px] font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {renderActionIcon(step.secondaryAction.action, 'practice')}
                      <span>{step.secondaryAction.label}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="px-4 py-2.5 border-t border-zinc-800/90 bg-zinc-900/50 rounded-b-2xl flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onStepChange(Math.max(0, stepIndex - 1))}
                disabled={isFirstStep}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-35 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center gap-1 transition cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-1.5">
                {isLastStep && nextTrack && (
                  <button
                    type="button"
                    onClick={handleFinishOnly}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  >
                    Finish
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                    isLastStep
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                      : isStepMilestoneMet
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/40'
                      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-950/40'
                  }`}
                >
                  {isLastStep ? (
                    nextTrack ? (
                      <>
                        <span>Next: {nextTrack.shortTitle}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete Tutorial</span>
                      </>
                    )
                  ) : (
                    <>
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default TutorialOverlay;
