import React, { useState, useEffect, useRef } from 'react';
import {
  MousePointer,
  Sparkles,
  Eraser,
  PenTool,
  DoorOpen,
  Radio,
  Plus,
  Flame,
  CheckCircle2,
  HelpCircle,
  Play
} from 'lucide-react';

interface VirtualMouseSimulatorProps {
  stepId: string;
  isEnabled: boolean;
  replayTrigger: number;
}

export const VirtualMouseSimulator: React.FC<VirtualMouseSimulatorProps> = ({
  stepId,
  isEnabled,
  replayTrigger
}) => {
  const [pos, setPos] = useState({ x: 100, y: 150 });
  const [isClicking, setIsClicking] = useState(false);
  const [clickType, setClickType] = useState<'left' | 'right' | 'double'>('left');
  const [activeBadge, setActiveBadge] = useState<string | null>(null);
  const [actionTrail, setActionTrail] = useState<any>(null);
  const [cursorType, setCursorType] = useState<'pointer' | 'pen' | 'eraser'>('pointer');

  const animTimerRef = useRef<any>([]);

  const clearTimers = () => {
    animTimerRef.current.forEach((t: any) => clearTimeout(t));
    animTimerRef.current = [];
  };

  useEffect(() => {
    if (!isEnabled) {
      clearTimers();
      return;
    }

    clearTimers();
    const addTimeout = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      animTimerRef.current.push(id);
      return id;
    };

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // STEP 1: Side Bar Exploration
    if (stepId === 'sidebar-overview') {
      setCursorType('pointer');
      setActiveBadge('Touring Sidebar DM Tools...');
      setPos({ x: 25, y: 120 });

      addTimeout(() => {
        setPos({ x: 25, y: 180 });
        setActiveBadge('Creature Tokens & Compendium');
      }, 700);

      addTimeout(() => {
        setPos({ x: 25, y: 240 });
        setActiveBadge('3D Dice Roller');
      }, 1400);

      addTimeout(() => {
        setPos({ x: 25, y: 300 });
        setActiveBadge('Combat Tracker & AoE');
      }, 2100);

      addTimeout(() => {
        setPos({ x: 25, y: 360 });
        setActiveBadge('Tactical Layers: Walls, Doors & Fog');
      }, 2800);

      addTimeout(() => {
        setPos({ x: 25, y: 420 });
        setActiveBadge('Weather & Spell FX');
      }, 3500);

      addTimeout(() => {
        setPos({ x: 25, y: 480 });
        setActiveBadge('AI Dungeon Master Suite');
      }, 4200);

      addTimeout(() => {
        setPos({ x: 25, y: 550 });
        setIsClicking(true);
        setClickType('left');
        setActiveBadge('Help Section, FAQ & AI Chatbot');
        setTimeout(() => setIsClicking(false), 400);
      }, 4900);
    }

    // STEP 2: Campaign Manager & Golden Vault Scene
    else if (stepId === 'campaign-manager') {
      setCursorType('pointer');
      setPos({ x: 200, y: 200 });
      setActiveBadge('Moving to Campaign Manager...');

      addTimeout(() => {
        setPos({ x: 25, y: 120 });
        setIsClicking(true);
        setClickType('left');
        setActiveBadge('Click: Open Campaign Manager');
        setTimeout(() => setIsClicking(false), 400);
      }, 800);

      addTimeout(() => {
        setPos({ x: Math.min(vw * 0.45, 520), y: 180 });
        setActiveBadge('Selecting "The Guild House - Main Level"...');
      }, 2000);

      addTimeout(() => {
        setIsClicking(true);
        setClickType('left');
        setActiveBadge('Loaded Scene: 64 Walls, 5 Tokens & 13 Room Zones!');
        setTimeout(() => setIsClicking(false), 400);
      }, 3200);
    }

    // STEP 3: Running Campaign vs Creator Mode
    else if (stepId === 'run-campaign-mode') {
      setCursorType('pointer');
      
      const getRunBtnPos = () => {
        const el = document.querySelector('#btn-mode-run-campaign');
        if (el) {
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        }
        return { x: 270, y: 28 };
      };

      const getCreatorBtnPos = () => {
        const el = document.querySelector('#btn-mode-creator');
        if (el) {
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        }
        return { x: 380, y: 28 };
      };

      setPos({ x: 180, y: 160 });
      setActiveBadge('Comparing "Run Campaign" vs "Creator Mode"...');

      // 1. Move to Run Campaign button & click
      addTimeout(() => {
        const runPos = getRunBtnPos();
        setPos(runPos);
        setIsClicking(true);
        setClickType('left');
        setActiveBadge('▶ RUN CAMPAIGN: Walls hidden for player immersion, dynamic vision casts through Fog of War!');
        setTimeout(() => setIsClicking(false), 400);
      }, 1000);

      // 2. Move down to player token on the map to show vision line-of-sight
      addTimeout(() => {
        setPos({ x: Math.round(vw * 0.48), y: Math.round(vh * 0.58) });
        setActiveBadge('Tokens project vision rays; unvisited rooms remain shrouded in darkness.');
      }, 2800);

      // 3. Move to Creator Mode button & click
      addTimeout(() => {
        const creatorPos = getCreatorBtnPos();
        setPos(creatorPos);
        setIsClicking(true);
        setClickType('left');
        setActiveBadge('✎ CREATOR MODE: Wall geometry & door hinges revealed for editing!');
        setTimeout(() => setIsClicking(false), 400);
      }, 5000);

      // 4. Move down to wall segment to highlight visible geometry & handles
      addTimeout(() => {
        setPos({ x: Math.round(vw * 0.44), y: Math.round(vh * 0.42) });
        setActiveBadge('Wall lines & room zone outlines are now visible and selectable.');
      }, 7200);

      // 5. Move back to Run Campaign
      addTimeout(() => {
        const runPos = getRunBtnPos();
        setPos(runPos);
        setActiveBadge('Ready to toggle between modes anytime during your game!');
      }, 9200);
    }

    // STEP 4: Drawing Tactical Walls
    else if (stepId === 'draw-walls') {
      setCursorType('pen');
      const startX = Math.round(vw * 0.42);
      const startY = Math.round(vh * 0.38);
      setPos({ x: startX, y: startY });
      setActiveBadge('Wall Tool Equipped: Left-Click node to start');

      addTimeout(() => {
        setIsClicking(true);
        setClickType('left');
        setActionTrail({ type: 'wall_drawing', p1: { x: startX, y: startY }, p2: { x: startX, y: startY } });
        setActiveBadge('Node 1 Placed');
        setTimeout(() => setIsClicking(false), 300);
      }, 1000);

      addTimeout(() => {
        const nextX = startX + 180;
        setPos({ x: nextX, y: startY });
        setActionTrail({ type: 'wall_drawing', p1: { x: startX, y: startY }, p2: { x: nextX, y: startY } });
        setIsClicking(true);
        setClickType('left');
        setActiveBadge('Node 2 Placed');
        setTimeout(() => setIsClicking(false), 300);
      }, 2400);

      addTimeout(() => {
        const nextX = startX + 180;
        const endY = startY + 140;
        setPos({ x: nextX, y: endY });
        setActionTrail({ type: 'wall_drawing', p1: { x: startX, y: startY }, p2: { x: nextX, y: startY }, p3: { x: nextX, y: endY } });
        setIsClicking(true);
        setClickType('double');
        setActiveBadge('Double-Click: Wall Finished! (Physically blocks vision)');
        setTimeout(() => setIsClicking(false), 600);
      }, 4000);
    }

    // STEP 5: Adding & Toggling Doors
    else if (stepId === 'doors-operation') {
      setCursorType('pointer');
      const doorX = Math.round(vw * 0.5);
      const doorY = Math.round(vh * 0.45);
      setPos({ x: doorX - 60, y: doorY - 40 });
      setActiveBadge('Approaching Central Dividing Door...');

      addTimeout(() => {
        setPos({ x: doorX, y: doorY });
        setActionTrail({ type: 'door_closed', x: doorX, y: doorY });
        setActiveBadge('Door is CLOSED: Line of Sight Blocked');
      }, 1000);

      addTimeout(() => {
        setIsClicking(true);
        setClickType('left');
        setActionTrail({ type: 'door_open', x: doorX, y: doorY });
        setActiveBadge('CLICK! Door OPENS: Light & vision flood into room!');
        setTimeout(() => setIsClicking(false), 400);
      }, 2500);

      addTimeout(() => {
        setIsClicking(true);
        setClickType('left');
        setActionTrail({ type: 'door_closed', x: doorX, y: doorY });
        setActiveBadge('CLICK! Door CLOSES: Vision blocked again');
        setTimeout(() => setIsClicking(false), 400);
      }, 4500);
    }

    // STEP 6: Erasing Walls & Doors
    else if (stepId === 'erase-walls') {
      setCursorType('eraser');
      const startX = Math.round(vw * 0.38);
      const targetY = Math.round(vh * 0.42);
      setPos({ x: startX, y: targetY });
      setActiveBadge('Wall Eraser Tool: Click or drag across wall segments');
      setActionTrail({ type: 'sample_wall', x1: startX - 30, y1: targetY, x2: startX + 220, y2: targetY });

      addTimeout(() => {
        setPos({ x: startX + 100, y: targetY });
        setIsClicking(true);
        setClickType('left');
        setActionTrail({ type: 'sample_wall_slice', x1: startX - 30, y1: targetY, x2: startX + 220, y2: targetY, sliceX: startX + 100 });
        setActiveBadge('Dragging Across Wall: Slicing line...');
      }, 1400);

      addTimeout(() => {
        setPos({ x: startX + 220, y: targetY });
        setIsClicking(false);
        setActionTrail({ type: 'sample_wall_deleted' });
        setActiveBadge('Wall Segment Deleted Cleanly!');
      }, 2800);
    }

    // STEP 7: Drawing Room Polygon Zones
    else if (stepId === 'draw-zones') {
      setCursorType('pen');
      const zX = Math.round(vw * 0.42);
      const zY = Math.round(vh * 0.35);
      setPos({ x: zX, y: zY });
      setActiveBadge('Room Polygon Tool: Click room corners');

      addTimeout(() => {
        setIsClicking(true);
        setClickType('left');
        setActionTrail({ type: 'zone_pts', pts: [{ x: zX, y: zY }] });
        setTimeout(() => setIsClicking(false), 300);
      }, 800);

      addTimeout(() => {
        setPos({ x: zX + 160, y: zY });
        setIsClicking(true);
        setClickType('left');
        setActionTrail({ type: 'zone_pts', pts: [{ x: zX, y: zY }, { x: zX + 160, y: zY }] });
        setTimeout(() => setIsClicking(false), 300);
      }, 1800);

      addTimeout(() => {
        setPos({ x: zX + 160, y: zY + 120 });
        setIsClicking(true);
        setClickType('left');
        setActionTrail({ type: 'zone_pts', pts: [{ x: zX, y: zY }, { x: zX + 160, y: zY }, { x: zX + 160, y: zY + 120 }] });
        setTimeout(() => setIsClicking(false), 300);
      }, 2800);

      addTimeout(() => {
        setPos({ x: zX, y: zY + 120 });
        setIsClicking(true);
        setClickType('left');
        setActionTrail({ type: 'zone_polygon_complete', x: zX, y: zY, w: 160, h: 120 });
        setActiveBadge('Room G10 Bounded & Interactive!');
        setTimeout(() => setIsClicking(false), 300);
      }, 3800);
    }

    // STEP 8: Right-Clicking Zones: PDF Lore & DM Secret Notes
    else if (stepId === 'zone-details-pdf') {
      setCursorType('pointer');
      const targetX = Math.round(vw * 0.46);
      const targetY = Math.round(vh * 0.42);
      setPos({ x: targetX - 50, y: targetY - 40 });
      setActiveBadge('Hovering over Room G10 (Entry Parlor)...');

      addTimeout(() => {
        setPos({ x: targetX, y: targetY });
        setActionTrail({ type: 'zone_highlight', x: targetX, y: targetY });
      }, 1000);

      addTimeout(() => {
        // Prominent RIGHT CLICK
        setIsClicking(true);
        setClickType('right');
        setActionTrail({ type: 'right_click_ring', x: targetX, y: targetY });
        setActiveBadge('RIGHT-CLICK ZONE: Opening PDF Read-Aloud & Secrets Drawer!');
        setTimeout(() => setIsClicking(false), 800);
      }, 2400);

      addTimeout(() => {
        setPos({ x: targetX + 100, y: targetY });
        setActiveBadge('Drawer Revealed: Boxed text, Trap DCs, and Monsters!');
      }, 3800);
    }

    // STEP 9: Broadcasting Description to Players
    else if (stepId === 'broadcast-players') {
      setCursorType('pointer');
      setPos({ x: vw * 0.45, y: vh * 0.4 });
      setActiveBadge('Inside Room Briefing Drawer...');

      addTimeout(() => {
        setPos({ x: Math.min(vw * 0.65, vw - 240), y: vh * 0.48 });
      }, 900);

      addTimeout(() => {
        setIsClicking(true);
        setClickType('left');
        setActiveBadge('CLICK "Broadcast to Players": Sent to Player View Screens!');
        setActionTrail({ type: 'broadcast_pulse' });
        setTimeout(() => setIsClicking(false), 500);
      }, 2200);
    }

    // STEP 10: Spawning Creatures from Compendium
    else if (stepId === 'spawn-creatures') {
      setCursorType('pointer');
      const spawnBtnX = Math.min(vw * 0.65, vw - 240);
      const spawnBtnY = vh * 0.55;
      setPos({ x: spawnBtnX - 30, y: spawnBtnY - 20 });
      setActiveBadge('Identified Creatures in G10: Bandit, Spy');

      addTimeout(() => {
        setPos({ x: spawnBtnX, y: spawnBtnY });
        setIsClicking(true);
        setClickType('left');
        setActiveBadge('CLICK "Spawn": Dropping Bandit Token onto Map!');
        setActionTrail({ type: 'token_spawn', x: Math.round(vw * 0.44), y: Math.round(vh * 0.42) });
        setTimeout(() => setIsClicking(false), 500);
      }, 1500);
    }

    // STEP 11: Help Section & Support
    else if (stepId === 'help-section') {
      setCursorType('pointer');
      setPos({ x: 180, y: 300 });
      setActiveBadge('Moving to Help Section on Sidebar...');

      addTimeout(() => {
        setPos({ x: 25, y: 550 });
        setIsClicking(true);
        setClickType('left');
        setActiveBadge('CLICK "Help": Access FAQ, AI Assistant & Tutorials!');
        setTimeout(() => setIsClicking(false), 500);
      }, 1200);
    }

    return () => clearTimers();
  }, [stepId, isEnabled, replayTrigger]);

  if (!isEnabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[85] overflow-hidden">
      {/* Dynamic Action Trail Demonstrations */}
      {actionTrail?.type === 'wall_drawing' && (
        <svg className="absolute inset-0 w-full h-full">
          <line
            x1={actionTrail.p1.x}
            y1={actionTrail.p1.y}
            x2={actionTrail.p2.x}
            y2={actionTrail.p2.y}
            stroke="#38bdf8"
            strokeWidth="4"
            strokeDasharray="4 2"
            className="animate-pulse"
          />
          {actionTrail.p3 && (
            <line
              x1={actionTrail.p2.x}
              y1={actionTrail.p2.y}
              x2={actionTrail.p3.x}
              y2={actionTrail.p3.y}
              stroke="#38bdf8"
              strokeWidth="4"
            />
          )}
          <circle cx={actionTrail.p1.x} cy={actionTrail.p1.y} r="5" fill="#38bdf8" />
          <circle cx={actionTrail.p2.x} cy={actionTrail.p2.y} r="5" fill="#38bdf8" />
          {actionTrail.p3 && <circle cx={actionTrail.p3.x} cy={actionTrail.p3.y} r="5" fill="#38bdf8" />}
        </svg>
      )}

      {actionTrail?.type === 'door_closed' && (
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center p-2 rounded-lg bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-mono text-xs font-bold shadow-lg animate-in fade-in"
          style={{ left: actionTrail.x, top: actionTrail.y }}
        >
          <span>🚪 DOOR CLOSED (Blocks Vision)</span>
        </div>
      )}

      {actionTrail?.type === 'door_open' && (
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center p-2 rounded-lg bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 font-mono text-xs font-bold shadow-[0_0_20px_rgba(52,211,153,0.5)] animate-bounce"
          style={{ left: actionTrail.x, top: actionTrail.y }}
        >
          <span>🚪 DOOR OPEN (Vision Unlocked!)</span>
        </div>
      )}

      {actionTrail?.type === 'sample_wall' && (
        <svg className="absolute inset-0 w-full h-full">
          <line
            x1={actionTrail.x1}
            y1={actionTrail.y1}
            x2={actionTrail.x2}
            y2={actionTrail.y2}
            stroke="#ef4444"
            strokeWidth="4"
          />
        </svg>
      )}

      {actionTrail?.type === 'sample_wall_slice' && (
        <svg className="absolute inset-0 w-full h-full">
          <line
            x1={actionTrail.x1}
            y1={actionTrail.y1}
            x2={actionTrail.sliceX}
            y2={actionTrail.y2}
            stroke="#f87171"
            strokeWidth="4"
            strokeDasharray="2 2"
          />
          <circle cx={actionTrail.sliceX} cy={actionTrail.y2} r="10" fill="none" stroke="#ef4444" strokeWidth="2" className="animate-ping" />
        </svg>
      )}

      {actionTrail?.type === 'zone_pts' && (
        <svg className="absolute inset-0 w-full h-full">
          {actionTrail.pts.map((pt: any, idx: number) => (
            <circle key={idx} cx={pt.x} cy={pt.y} r="6" fill="#f59e0b" />
          ))}
          {actionTrail.pts.length > 1 && (
            <polyline
              points={actionTrail.pts.map((p: any) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeDasharray="4 3"
            />
          )}
        </svg>
      )}

      {actionTrail?.type === 'zone_polygon_complete' && (
        <div
          className="absolute border-2 border-dashed border-amber-400 bg-amber-500/15 rounded-lg flex items-center justify-center text-amber-300 font-mono text-xs font-bold shadow-lg animate-in fade-in"
          style={{
            left: actionTrail.x,
            top: actionTrail.y,
            width: actionTrail.w,
            height: actionTrail.h
          }}
        >
          <span>Area G10: Infiltration Parlor</span>
        </div>
      )}

      {actionTrail?.type === 'right_click_ring' && (
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5"
          style={{ left: actionTrail.x, top: actionTrail.y }}
        >
          <div className="w-16 h-16 rounded-full border-4 border-amber-400 bg-amber-500/20 animate-ping" />
          <div className="px-3 py-1.5 rounded-full bg-black/90 border-2 border-amber-400 text-amber-300 font-mono text-xs font-black shadow-2xl flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>RIGHT-CLICK ZONE DETECTED</span>
          </div>
        </div>
      )}

      {actionTrail?.type === 'broadcast_pulse' && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-blue-600/90 border border-blue-400 text-white font-mono text-xs font-bold shadow-2xl animate-bounce flex items-center gap-2">
          <Radio className="w-4 h-4 text-blue-200 animate-pulse" />
          <span>BROADCASTING READ-ALOUD TO ALL PLAYERS</span>
        </div>
      )}

      {actionTrail?.type === 'token_spawn' && (
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-emerald-400 bg-emerald-950/80 shadow-2xl flex items-center justify-center text-emerald-300 animate-in zoom-in duration-300"
          style={{ left: actionTrail.x, top: actionTrail.y }}
        >
          <span className="text-[10px] font-bold font-mono">BANDIT</span>
        </div>
      )}

      {/* The Animated Virtual Mouse Pointer */}
      <div
        className="absolute transition-all duration-300 ease-out z-50 flex items-start gap-2"
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`
        }}
      >
        {/* Pointer Graphic */}
        <div className="relative">
          {cursorType === 'eraser' ? (
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white border-2 border-white shadow-2xl flex items-center justify-center transform -rotate-12">
              <Eraser className="w-4 h-4" />
            </div>
          ) : cursorType === 'pen' ? (
            <div className="w-7 h-7 rounded-lg bg-sky-600 text-white border-2 border-white shadow-2xl flex items-center justify-center transform -rotate-12">
              <PenTool className="w-4 h-4" />
            </div>
          ) : (
            <svg
              className="w-8 h-8 drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] filter"
              viewBox="0 0 24 24"
              fill="none"
            >
              {/* Main Arrow Body */}
              <path
                d="M4.5 3L19.5 12L11.5 13.5L8 20.5L4.5 3Z"
                fill="#09090b"
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              {/* Highlight for Right-Click demonstration */}
              {clickType === 'right' && isClicking && (
                <path
                  d="M12 7.5L18.5 11.5L11.5 13L12 7.5Z"
                  fill="#f59e0b"
                  stroke="#fbbf24"
                  strokeWidth="1.2"
                />
              )}
            </svg>
          )}

          {/* Click Ripple Effect */}
          {isClicking && (
            <span
              className={`absolute -top-3 -left-3 w-12 h-12 rounded-full border-2 animate-ping pointer-events-none ${
                clickType === 'right'
                  ? 'border-amber-400 bg-amber-400/25'
                  : 'border-sky-400 bg-sky-400/25'
              }`}
            />
          )}
        </div>

        {/* Floating Action Badge Mimicking the User's Behavior */}
        {activeBadge && (
          <div
            className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold shadow-2xl border backdrop-blur-md whitespace-nowrap transition-all animate-in fade-in slide-in-from-left-1 ${
              clickType === 'right' && isClicking
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/80 ring-2 ring-amber-400/50'
                : 'bg-zinc-950/90 text-sky-200 border-sky-500/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {clickType === 'right' ? (
                <span className="px-1 py-0.2 rounded bg-amber-500 text-zinc-950 text-[9px] font-black">
                  RIGHT-CLICK
                </span>
              ) : isClicking ? (
                <span className="px-1 py-0.2 rounded bg-sky-500 text-zinc-950 text-[9px] font-black">
                  CLICK
                </span>
              ) : null}
              <span>{activeBadge}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default VirtualMouseSimulator;
