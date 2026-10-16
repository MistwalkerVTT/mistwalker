import React, { useState, useRef, useEffect } from 'react';
import {
  HelpCircle,
  X,
  Sparkles,
  BookOpen,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Play,
  RotateCcw,
  Bug,
  Shield,
  Layers,
  DoorOpen,
  Radio,
  Users,
  Eye,
  Bot,
  User,
  ExternalLink,
  GraduationCap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { chatWithDndBot, DndChatMessage } from '../services/aiService';

interface HelpDrawerProps {
  pinnedGroup: string | null;
  handleDragStart?: (e: React.MouseEvent) => void;
  onClose: () => void;
  onStartTutorial?: () => void;
  onOpenBugReport?: () => void;
}

interface FAQItem {
  id: string;
  category: 'campaign' | 'walls_doors' | 'zones_pdf' | 'vision_fog' | 'tokens' | 'ddb' | 'bugs';
  question: string;
  answer: string;
  actionHint?: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'campaign-run-vs-creator',
    category: 'campaign',
    question: 'What is the difference between "Run Campaign" and "Creator Mode"?',
    answer: 'In the top bar, you can toggle modes. "Run Campaign" mode is optimized for live play: solid wall geometry lines are hidden from player view while doors remain interactive, tokens cast real-time dynamic light, and fog dynamically parts as tokens move. "Creator Mode" reveals all wall handles, door markers, and room polygon boundaries so you can draw and edit geometry.',
    actionHint: 'Toggle between modes using the buttons on the top campaign bar.'
  },
  {
    id: 'campaign-scenes-saving',
    category: 'campaign',
    question: 'How do I organize chapters and save tactical scenes?',
    answer: 'Click the "Manager" button in the top bar (or Maps on the sidebar) to open Campaign Manager. Create campaigns, add chapters, and create scenes with custom or preset battlemaps. When editing on the canvas, click "Save Scene" in the top bar to immediately update token positions, lighting, and walls in the cloud.',
    actionHint: 'Top bar: Manager › Add Chapter › Add Scene › Save Scene.'
  },
  {
    id: 'walls-drawing',
    category: 'walls_doors',
    question: 'How do I draw dynamic lighting walls?',
    answer: 'Select Tactical Layers from the sidebar, then click the Wall Tool (or click "Walls" on the top bar). Left-click on the battlemap to place the first node, click to place additional corners, and double-click to finish the wall line. Solid walls physically obstruct Line of Sight and prevent players from seeing through barriers.',
    actionHint: 'Sidebar › Tactical Layers › Wall Tool › Left-click nodes › Double-click to finish.'
  },
  {
    id: 'doors-operating',
    category: 'walls_doors',
    question: 'How do I place and operate doors?',
    answer: 'Under Tactical Layers, switch the wall segment type to "Door". When a door is closed, it blocks player vision and fog just like a solid wall. In Run Campaign mode, clicking on a door toggles it open, immediately allowing vision and lighting to flood into the adjoining chamber!',
    actionHint: 'Tactical Layers › Wall Tool › Type: Door › Click door icon on map to open/close.'
  },
  {
    id: 'walls-erasing',
    category: 'walls_doors',
    question: 'How do I delete or erase walls and doors?',
    answer: 'Select the Wall Eraser tool under Tactical Layers. Click any individual wall segment to delete it instantly, or click-and-drag across wall lines to slice through multiple walls at once.',
    actionHint: 'Tactical Layers › Wall Eraser tool › Drag across wall lines to delete.'
  },
  {
    id: 'zones-right-click',
    category: 'zones_pdf',
    question: 'How do I right-click room zones to view PDF lore and secret notes?',
    answer: 'Right-click directly on any drawn room polygon zone on the canvas (such as Area G10 or G21 in the Golden Vault demo). This immediately opens the Room Briefing drawer, displaying the parsed PDF boxed read-aloud description, trap DCs, secret DM lore, and monster lists.',
    actionHint: 'Right-click on any drawn room polygon zone on the map.'
  },
  {
    id: 'zones-broadcast',
    category: 'zones_pdf',
    question: 'How do I broadcast boxed room descriptions to player screens?',
    answer: 'Open the Room Briefing drawer (by right-clicking a room zone) and click "Broadcast to Players". The boxed description immediately displays across all connected Player View screens with real-time text and optional AI narration.',
    actionHint: 'Room Briefing drawer › Click "Broadcast to Players".'
  },
  {
    id: 'zones-spawn-monsters',
    category: 'tokens',
    question: 'How do I spawn monsters mentioned in the room PDF description?',
    answer: 'In the Room Briefing drawer, the "Identified Creatures" section lists all monsters parsed from the adventure text. Click "Spawn" next to any creature (e.g. Bandit, Spy, Oni) to drop their interactive token with full HP, AC, and stats directly onto the tactical map.',
    actionHint: 'Room Briefing drawer › Identified Creatures › Click "Spawn".'
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
    answer: 'Click "D&D Beyond" on the top campaign bar. Enter your D&D Beyond Campaign ID or character sheet URL. MistWalker continuously synchronizes live HP, conditions, and spell slots directly to the corresponding token on the battlemap.',
    actionHint: 'Top bar: D&D Beyond › Connect Campaign › Auto-syncs live HP.'
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
  onStartTutorial,
  onOpenBugReport
}) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'chat'>('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('campaign-run-vs-creator');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // AI Chatbot State
  const [chatMessages, setChatMessages] = useState<DndChatMessage[]>([
    {
      role: 'model',
      text: 'Greetings Dungeon Master! I am your MistWalker VTT assistant. Ask me anything about drawing walls, interactive doors, room polygon zones, player vision, or D&D 5e rules.',
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
- Web-based VTT with dynamic lighting walls, interactive doors (block/allow vision when open), room polygon zones with PDF briefings, player view fog of war, and D&D Beyond sync.
- Prebuilt demo: Masterpiece Imbroglio (Main Floor) from Keys from the Golden Vault with Area G10, G21, G26, G27.`;

      const response = await chatWithDndBot(
        newHistory,
        text,
        'dm_copilot',
        'gemini-2.5-flash',
        extraContext
      );

      setChatMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: response.text,
          timestamp: Date.now()
        }
      ]);
    } catch (err) {
      // Local fallback answering common MistWalker features directly
      let fallbackText = `Here is guidance for **"${text}"**:\n\n`;
      const lower = text.toLowerCase();
      if (lower.includes('wall') || lower.includes('draw')) {
        fallbackText += `• **Drawing Walls**: Under Tactical Layers, select the Wall Tool. Left-click to place wall nodes, click corners, and double-click to finish. Solid walls physically block player line-of-sight and fog of war.`;
      } else if (lower.includes('door')) {
        fallbackText += `• **Doors**: In Tactical Layers, set the wall segment type to "Door". When closed, it blocks vision. In Run Campaign mode, clicking the door toggles it open, allowing vision and light to flood into the adjacent room.`;
      } else if (lower.includes('zone') || lower.includes('brief') || lower.includes('pdf')) {
        fallbackText += `• **Room Polygon Zones**: Right-click directly on any drawn room zone (such as Area G10) on the map to open the Room Briefing drawer with parsed PDF read-aloud text, secret DM notes, and monster spawn buttons.`;
      } else if (lower.includes('fog') || lower.includes('player') || lower.includes('vision')) {
        fallbackText += `• **Player Vision**: Click "Share Player View" in the top bar. Players only see what their tokens illuminate, and vision strictly respects walls and closed doors.`;
      } else {
        fallbackText += `You can explore these features anytime via the **Interactive Tutorial** button above, or browse the searchable FAQ tab!`;
      }

      setChatMessages(prev => [
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

  const filteredFaqs = FAQ_DATA.filter(item => {
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
        className={`flex items-center justify-between border-b border-zinc-800 pb-2.5 ${pinnedGroup ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white font-mono tracking-wide flex items-center gap-1.5">
              Help & DM Guide
            </h3>
            <p className="text-[10px] text-zinc-400">Knowledge base, interactive tutorial & AI assistant</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          title="Close Help"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tutorial Launcher Hero Card */}
      {onStartTutorial && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-indigo-950/60 border border-indigo-500/40 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5 font-mono">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              Interactive DM Tutorial
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              11 Steps
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Step-by-step walkthrough covering sidebar tools, loading Golden Vault scenes, drawing walls, operating doors, and right-clicking room zones with animated mouse cursor demonstrations.
          </p>
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartTutorial();
              }}
              className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Interactive Tutorial</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode Navigation Tabs: FAQ vs AI Assistant */}
      <div className="flex items-center p-0.5 rounded-xl bg-zinc-950 border border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab('faq')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'faq'
              ? 'bg-zinc-800 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span>Feature FAQ</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-zinc-800 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-amber-400" />
          <span>AI DM Assistant</span>
        </button>
      </div>

      {/* TAB 1: FAQ & Knowledge Base */}
      {activeTab === 'faq' && (
        <div className="space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features (e.g. walls, doors, fog, zones)..."
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
              { id: 'tokens', label: 'Tokens' }
            ].map(cat => (
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
                No matching guide topics found. Try typing a query in the AI Assistant tab!
              </div>
            ) : (
              filteredFaqs.map(faq => {
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
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI DM Assistant */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[400px]">
          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-1 pb-2 border-b border-zinc-800">
            {[
              'How do I draw walls & doors?',
              'How to right-click room zones?',
              'How does player vision work?'
            ].map(prompt => (
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
              placeholder="Ask about walls, fog, doors, or 5e rules..."
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
