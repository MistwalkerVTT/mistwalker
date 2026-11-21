import React, { useState, useRef, useEffect } from 'react';
import {
  HelpCircle,
  X,
  BookOpen,
  Search,
  ChevronDown,
  ChevronUp,
  Send,
  RotateCcw,
  Bug,
  Bot,
  CheckCircle2,
  GraduationCap,
  Play,
  Sparkles,
  Clock
} from 'lucide-react';
import { chatWithDndBot, DndChatMessage } from '../services/aiService';
import { TUTORIAL_TRACKS } from '../data/tutorialTracks';
import { TutorialTrackId } from '../types/tutorial';

interface HelpDrawerProps {
  pinnedGroup: string | null;
  handleDragStart?: (e: React.MouseEvent) => void;
  onClose: () => void;
  onOpenBugReport?: () => void;
  onStartTutorialTrack?: (trackId: TutorialTrackId) => void;
  completedTutorialTracks?: TutorialTrackId[];
  onResetTutorialProgress?: () => void;
}

interface FAQItem {
  id: string;
  category: 'campaign' | 'walls_doors' | 'zones_pdf' | 'vision_fog' | 'tokens' | 'ddb' | 'bugs';
  question: string;
  answer: string;
  actionHint?: string;
  tutorialTrackId?: TutorialTrackId;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'campaign-create-hierarchy',
    category: 'campaign',
    question: 'How do I create a Campaign, Chapter, and Scene?',
    answer: 'Open Campaign Manager from the Dashboard or top bar. Click "+ New Campaign" to create your adventure container, click "+ Add Chapter" next to it to group a story arc or dungeon, and click "+ Add Scene" under that chapter to create an individual battlemap encounter. Each Scene stores its own map, grid, walls, doors, tokens, and room zones.',
    actionHint: 'Campaign Manager › + New Campaign › + Add Chapter › + Add Scene.',
    tutorialTrackId: 'campaign'
  },
  {
    id: 'campaign-load-maps',
    category: 'campaign',
    question: 'How do I load battlemaps (Images, Video, Presets, or UVTT)?',
    answer: 'Inside Campaign Manager, select a Scene and use the Map Media section to upload a JPG/PNG/WebP/MP4/WebM map, choose from the Preset Battlemap Gallery, pick from your Saved Maps Library, or import a Universal VTT (.dd2vtt / .uvtt) file which automatically brings in walls and doors! Click "Launch Scene to VTT" to play.',
    actionHint: 'Scene Inspector › Upload Map / Preset Gallery / Import UVTT › Launch Scene to VTT.',
    tutorialTrackId: 'load_map'
  },
  {
    id: 'campaign-run-vs-creator',
    category: 'campaign',
    question: 'What is the difference between "Run Campaign" and "Creator Mode"?',
    answer: 'In the top bar, you can toggle modes. "Run Campaign" mode is optimized for live play: solid wall geometry lines are hidden from player view while doors remain interactive, tokens cast real-time dynamic light, and fog dynamically parts as tokens move. "Creator Mode" reveals all wall handles, door markers, and room polygon boundaries so you can draw and edit geometry.',
    actionHint: 'Toggle between modes using the buttons on the top campaign bar.'
  },
  {
    id: 'walls-drawing',
    category: 'walls_doors',
    question: 'How do I draw dynamic lighting walls?',
    answer: 'Switch to Creator Mode and select "Walls" on the top bar (or "Draw Walls" in the Creator Toolbar). Left-click on the battlemap to place the first corner, click to chain additional corners, and double-click (or press Esc) to finish. Toggle Grid Snapping ON for straight dungeon corridors or OFF for organic caves.',
    actionHint: 'Creator Mode › Draw Walls › Left-click corners › Double-click / Esc to finish.',
    tutorialTrackId: 'walls'
  },
  {
    id: 'doors-operating',
    category: 'walls_doors',
    question: 'How do I place and operate Doors, Secret Doors & Windows?',
    answer: 'With the Wall Tool active, change Segment Type to "Door" (amber), "Secret" (purple — looks like a solid wall to players until opened), or "Window" (cyan — lets vision through). In Run Campaign mode, clicking any door toggles it open, immediately allowing vision and lighting to flood into the adjoining room!',
    actionHint: 'Creator Mode › Draw Walls › Segment Type: Door / Secret / Window.',
    tutorialTrackId: 'doors'
  },
  {
    id: 'walls-split-erasing',
    category: 'walls_doors',
    question: 'How do I split or erase walls and doors?',
    answer: 'In the Wall Editor Toolbar, select "Split" to click any point along an existing wall and cut it into two segments (ideal for carving out doorways). Select "Erase" to click an individual wall or drag-slice across multiple wall lines to delete them instantly.',
    actionHint: 'Wall Editor Toolbar › Split (cut doorways) or Erase (click/drag to delete).',
    tutorialTrackId: 'walls'
  },
  {
    id: 'pdf-upload-ingest',
    category: 'zones_pdf',
    question: 'How do I upload and ingest an Adventure PDF?',
    answer: 'Open Campaign Manager and click directly on a Chapter (not a Scene). In the "Adventure Chapter PDF & Document Digest" panel, click "Upload PDF" (.pdf, .txt, or .md). Gemini AI automatically indexes all scenes, numbered room keys (boxed read-aloud text, DM notes, traps, monsters), and Chapter Flow (story hooks, patrols, NPCs). For best accuracy, upload individual chapters rather than an entire anthology book.',
    actionHint: 'Campaign Manager › Select Chapter › Upload PDF › Wait for Gemini AI digest.',
    tutorialTrackId: 'upload_pdf'
  },
  {
    id: 'zones-draw-and-link',
    category: 'zones_pdf',
    question: 'How do I draw Room Zones and link them to ingested PDF rooms?',
    answer: 'In Creator Mode, click "Draw Room Zone", left-click at least 3 corners around a room, then double-click or click "Save & Label Room". In the Room Editor modal, type a room number (like "G10") or pick from your Chapter PDF Digest dropdown to auto-fill boxed read-aloud text, secret DM notes, and monsters.',
    actionHint: 'Creator Mode › Draw Room Zone › Outline room › Link to PDF Room Key.',
    tutorialTrackId: 'room_zones'
  },
  {
    id: 'zones-right-click',
    category: 'zones_pdf',
    question: 'How do I right-click room zones to broadcast text & spawn monsters?',
    answer: 'Right-click directly on any drawn room polygon zone on the canvas. This opens the Room Briefing drawer displaying the boxed read-aloud text, trap DCs, secret DM lore, and monster list. Click "Broadcast to Players" to push boxed text to player screens, or click "Spawn" next to any creature to drop its statblocked token onto the map.',
    actionHint: 'Right-click any room zone › Broadcast to Players / Spawn Monsters.',
    tutorialTrackId: 'room_zones'
  },
  {
    id: 'vision-fog-edge',
    category: 'vision_fog',
    question: 'How does Fog of War edge softening and player vision work?',
    answer: 'Player View calculates token Line of Sight against drawn wall segments in real time. Fog edges are softly blurred for an immersive aesthetic, but wall occlusion ensures player vision never bleeds past solid barriers into adjacent unrevealed rooms.',
    actionHint: 'Click "Share Player View" in the top bar to inspect what players see.'
  },
  {
    id: 'ddb-sync',
    category: 'ddb',
    question: 'How do I connect D&D Beyond campaigns and sync character HP in real time?',
    answer: 'Click "D&D Beyond" in the Library menu on the top campaign bar (or from the Dashboard). Enter your D&D Beyond Campaign ID or character sheet URL. MistWalker continuously synchronizes live HP, conditions, and spell slots directly to the corresponding token on the battlemap.',
    actionHint: 'Top bar: Library › D&D Beyond › Connect Campaign › Auto-syncs live HP.'
  },
  {
    id: 'bugs-screenshots',
    category: 'bugs',
    question: 'How do I report a bug or attach a screenshot?',
    answer: 'Click the Bug icon in the left sidebar. Describe the issue, and easily attach a screenshot by dragging and dropping an image or pressing Ctrl+V to paste a snippet from your clipboard. The system automatically records session telemetry and active scene diagnostics.',
    actionHint: 'Sidebar › Bug icon › Paste screenshot (Ctrl+V) › Submit.'
  }
];

export const HelpDrawer: React.FC<HelpDrawerProps> = ({
  pinnedGroup,
  handleDragStart,
  onClose,
  onOpenBugReport,
  onStartTutorialTrack,
  completedTutorialTracks = [],
  onResetTutorialProgress
}) => {
  const [activeTab, setActiveTab] = useState<'tutorials' | 'faq' | 'chat'>('tutorials');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('campaign-create-hierarchy');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // AI Chatbot State
  const [chatMessages, setChatMessages] = useState<DndChatMessage[]>([
    {
      role: 'model',
      text: 'Greetings Dungeon Master! I am your MistWalker VTT assistant. Ask me anything about creating campaigns, chapters & scenes, loading maps, drawing walls & doors, uploading/ingesting adventure PDFs, room zones, or D&D 5e rules.',
      timestamp: Date.now()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const nextUnfinishedTrack =
    TUTORIAL_TRACKS.find((t) => !completedTutorialTracks.includes(t.id)) || TUTORIAL_TRACKS[0];
  const completionPct = Math.round((completedTutorialTracks.length / TUTORIAL_TRACKS.length) * 100);

  const handleLaunchTrack = (trackId: TutorialTrackId) => {
    if (onStartTutorialTrack) {
      onStartTutorialTrack(trackId);
      onClose();
    }
  };

  const handleSendQuery = async (queryText?: string) => {
    const text = (queryText || chatInput).trim();
    if (!text || isSending) return;

    const userMsg: DndChatMessage = {
      role: 'user',
      text,
      timestamp: Date.now()
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    setIsSending(true);

    try {
      const extraContext = `User is using MistWalker VTT:
- Campaign Hierarchy: Campaign Manager > + New Campaign > + Add Chapter > + Add Scene.
- Map Loading: Upload JPG/PNG/WebP/MP4/WebM, Choose Preset Battlemap Gallery, Saved Maps Library, or Import Universal VTT (.dd2vtt/.uvtt) with auto walls/doors. Click "Launch Scene to VTT" to play.
- Walls & Doors: Switch to Creator Mode > Draw Walls. Left-click corners, double-click or Esc to finish. Grid Snapping toggle. Segment Types: Solid, Door (clickable in Run Campaign mode), Secret Door (hidden from players), Window (vision passes). Includes Split Wall (cut doorways) and Erase Wall tools.
- Adventure PDF Upload & AI Ingestion: In Campaign Manager, select a Chapter > Adventure Chapter PDF panel > Upload PDF (.pdf, .txt, .md — individual chapters work best). Gemini AI digests scenes, numbered room keys (boxed text, DM notes, traps, monsters), and Chapter Flow (hooks, patrols, NPCs).
- Room Zones: Creator Mode > Draw Room Zone > click >= 3 corners > Save & Label Room > link to ingested PDF Room Key. Right-click any drawn room zone on the map to open Room Briefing Drawer, Broadcast boxed text to players, or Spawn monsters.
- Saving: Click "Save Scene" in the top bar to persist walls, doors, tokens, and zones to the cloud.`;

      const response = await chatWithDndBot(
        newHistory,
        text,
        'dm_copilot',
        'gemini-2.5-flash',
        extraContext
      );

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: response.text,
          timestamp: Date.now()
        }
      ]);
    } catch {
      let fallbackText = `Here is guidance for **"${text}"**:\n\n`;
      const lower = text.toLowerCase();
      if (lower.includes('campaign') || lower.includes('chapter') || lower.includes('scene')) {
        fallbackText += `• **Campaigns, Chapters & Scenes**: Open Campaign Manager from the Dashboard or top bar, click "+ New Campaign", then "+ Add Chapter", then "+ Add Scene". Attach a battlemap and click "Launch Scene to VTT".`;
      } else if (lower.includes('pdf') || lower.includes('ingest') || lower.includes('digest')) {
        fallbackText += `• **PDF Upload & Ingestion**: In Campaign Manager, click a **Chapter** (not a scene), scroll to the **Adventure Chapter PDF** panel, and click **Upload PDF**. Gemini AI automatically indexes rooms, boxed text, monsters, and Chapter Flow.`;
      } else if (lower.includes('wall') || lower.includes('draw')) {
        fallbackText += `• **Drawing Walls**: Switch to Creator Mode, select **Draw Walls**, left-click corners on the map, and double-click (or press Esc) to finish. Use **Split** to cut doorways and **Erase** to delete segments.`;
      } else if (lower.includes('door')) {
        fallbackText += `• **Doors**: With the Wall Tool active, switch Segment Type to **Door** (or **Secret** / **Window**). In Run Campaign mode, click any door on the map to swing it open and flood light/vision into the room.`;
      } else if (lower.includes('zone') || lower.includes('room')) {
        fallbackText += `• **Room Zones**: In Creator Mode, click **Draw Room Zone**, click ≥ 3 corners around a room, then click **Save & Label Room** to link it to an ingested PDF room key. Right-click any zone live to broadcast boxed text or spawn monsters.`;
      } else {
        fallbackText += `Try launching one of the 9 step-by-step interactive walkthroughs in the **Tutorials** tab above!`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: fallbackText,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const filteredFaqs = FAQ_DATA.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-3.5 flex flex-col gap-3 w-full">
      {/* Header */}
      <div
        onMouseDown={pinnedGroup ? handleDragStart : undefined}
        className={`flex items-center justify-between border-b border-zinc-800 pb-2.5 ${
          pinnedGroup ? 'cursor-grab active:cursor-grabbing select-none' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white font-mono tracking-wide flex items-center gap-1.5">
              Help & DM Academy
            </h3>
            <p className="text-[10px] text-zinc-400">Interactive tutorials, FAQ & AI assistant</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          title="Close Help"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Navigation Tabs: Tutorials | FAQ | AI Assistant */}
      <div className="grid grid-cols-3 p-0.5 rounded-xl bg-zinc-950 border border-zinc-800 gap-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('tutorials')}
          className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'tutorials'
              ? 'bg-zinc-800 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Tutorials</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('faq')}
          className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'faq'
              ? 'bg-zinc-800 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>FAQ</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-zinc-800 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>AI Guide</span>
        </button>
      </div>

      {/* TAB 1: INTERACTIVE TUTORIALS */}
      {activeTab === 'tutorials' && (
        <div className="space-y-2.5">
          {/* Mastery Progress Banner */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-950/40 via-zinc-950 to-zinc-950 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>DM Mastery Progress</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-300 font-bold">
                {completedTutorialTracks.length}/{TUTORIAL_TRACKS.length} ({completionPct}%)
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>

            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => handleLaunchTrack(nextUnfinishedTrack.id)}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-950/40"
              >
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                <span className="truncate">
                  {completedTutorialTracks.length === 0
                    ? 'Start Full DM Walkthrough'
                    : completedTutorialTracks.length >= TUTORIAL_TRACKS.length
                    ? 'Replay Full Walkthrough'
                    : `Continue: ${nextUnfinishedTrack.shortTitle}`}
                </span>
              </button>

              {completedTutorialTracks.length > 0 && onResetTutorialProgress && (
                <button
                  type="button"
                  onClick={onResetTutorialProgress}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  title="Reset tutorial progress"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 9 Interactive Track Cards */}
          <div className="space-y-1.5 max-h-[330px] overflow-y-auto sidebar-scrollbar pr-1">
            {TUTORIAL_TRACKS.map((track) => {
              const isCompleted = completedTutorialTracks.includes(track.id);
              return (
                <div
                  key={track.id}
                  className={`p-2.5 rounded-xl border transition flex items-start justify-between gap-2 ${
                    isCompleted
                      ? 'bg-emerald-950/15 border-emerald-500/30 hover:border-emerald-500/50'
                      : 'bg-zinc-950/70 border-zinc-800/90 hover:border-amber-500/40'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-4 h-4 rounded-md text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        {isCompleted ? '✓' : track.order}
                      </span>
                      <span className="text-xs font-bold text-zinc-100 truncate">
                        {track.title}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-zinc-400 leading-snug mt-1">
                      {track.subtitle}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[9.5px] font-mono text-zinc-500">
                      <span>{track.steps.length} steps</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        ~{track.estimatedMinutes}m
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLaunchTrack(track.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold shrink-0 transition cursor-pointer mt-0.5 ${
                      isCompleted
                        ? 'bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/40'
                    }`}
                  >
                    {isCompleted ? 'Replay' : 'Start'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: FAQ & Knowledge Base */}
      {activeTab === 'faq' && (
        <div className="space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search (e.g. PDF, walls, doors, zones, UVTT)..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500/60 transition"
            />
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-1 text-[10px] font-mono">
            {[
              { id: 'all', label: 'All' },
              { id: 'campaign', label: 'Campaign' },
              { id: 'walls_doors', label: 'Walls & Doors' },
              { id: 'zones_pdf', label: 'Zones & PDF' },
              { id: 'vision_fog', label: 'Fog & Vision' },
              { id: 'ddb', label: 'D&D Beyond' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2 py-0.5 rounded-md border transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                    : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQ Accordion List */}
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto sidebar-scrollbar pr-1">
            {filteredFaqs.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                No matching guide topics found. Try typing a query in the AI Guide tab!
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="border border-zinc-800/80 rounded-xl bg-zinc-950/60 overflow-hidden transition"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      className="w-full p-2.5 text-left flex items-start justify-between gap-2 hover:bg-zinc-900/60 transition cursor-pointer"
                    >
                      <span className="text-xs font-semibold text-zinc-200 leading-snug">
                        {faq.question}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-2.5 pt-0 text-xs text-zinc-300 leading-relaxed border-t border-zinc-850/60 bg-zinc-900/30 space-y-2">
                        <p>{faq.answer}</p>
                        {faq.actionHint && (
                          <div className="p-1.5 rounded-lg bg-sky-950/30 border border-sky-500/20 text-[11px] font-mono text-sky-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                            <span>{faq.actionHint}</span>
                          </div>
                        )}
                        {faq.tutorialTrackId && onStartTutorialTrack && (
                          <button
                            type="button"
                            onClick={() => handleLaunchTrack(faq.tutorialTrackId!)}
                            className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Launch Interactive Walkthrough</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AI DM Assistant */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[400px]">
          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-1 pb-2 border-b border-zinc-800">
            {[
              'How do I upload & ingest a PDF?',
              'How do I draw walls & doors?',
              'How do I link room zones to a PDF?'
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSendQuery(prompt)}
                className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 text-[10px] font-mono text-zinc-300 hover:text-amber-200 transition cursor-pointer truncate max-w-[280px]"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 sidebar-scrollbar">
            {chatMessages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl p-2.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-amber-600 text-white font-medium'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-200 whitespace-pre-wrap'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            {isSending && (
              <div className="flex gap-2 items-center text-xs text-zinc-400 pl-8 font-mono animate-pulse">
                <span>MistWalker Assistant is thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="pt-2 border-t border-zinc-800 flex items-center gap-1.5"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about PDFs, walls, doors, zones, or 5e..."
              className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 transition"
            />
            <button
              type="submit"
              disabled={isSending || !chatInput.trim()}
              className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-50 transition cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Footer Bug Report Shortcut */}
      {onOpenBugReport && (
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Notice an issue or glitch?</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenBugReport();
            }}
            className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Report Bug & Log Notes</span>
          </button>
        </div>
      )}
    </div>
  );
};
export default HelpDrawer;
