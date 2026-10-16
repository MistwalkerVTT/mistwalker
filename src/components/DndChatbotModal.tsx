import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Key, 
  Skull, 
  BookOpen, 
  Dices, 
  Bot, 
  User, 
  X, 
  Minimize2, 
  Maximize2, 
  Zap, 
  ShieldAlert, 
  Info,
  ChevronDown
} from 'lucide-react';
import { chatWithDndBot, DndChatMessage, generateTTS } from '../services/aiService';
import { audioNarration } from '../services/audioNarrationService';
import { ChapterPdfDigest } from '../types';

export type DndMode = 'golden_vault' | 'vecna' | 'rules' | 'dm_copilot';
export type DndModelChoice = 'gemini-2.5-flash' | 'gemini-3.8-flash' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite';

interface DndChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMapName?: string;
  combatantsCount?: number;
  activeRound?: number;
  chapterDigest?: ChapterPdfDigest | null;
}

const MODE_CONFIGS: Record<DndMode, {
  label: string;
  subtitle: string;
  icon: typeof Key;
  color: string;
  badgeBg: string;
  badgeText: string;
  quickPrompts: string[];
}> = {
  golden_vault: {
    label: 'Keys from the Golden Vault',
    subtitle: 'Chapter: Masterpiece Imbroglio (5th Level Heist)',
    icon: Key,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 border-amber-500/30',
    badgeText: 'text-amber-300',
    quickPrompts: [
      "Where is Constantori's Portrait and what are its magic stats & spells?",
      "Describe the G27 Tower Peak poison gas trap and how to disarm it.",
      "How does Gwish the disguised oni in G21 behave if alarmed?",
      "What does Grinky Brithwort know about the Agile Hand master keys?",
      "Boxed read-aloud text for sneaking into the Agile Hand Guildhouse (G10)."
    ]
  },
  vecna: {
    label: 'Vecna: Eve of Ruin',
    subtitle: 'The Undying King & Multiverse Artifacts',
    icon: Skull,
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
    badgeText: 'text-emerald-300',
    quickPrompts: [
      "What are Vecna's full CR 26 stats, Rotten Fate, and Dread Counterspell?",
      "How does Dread Counterspell work against 5th-level and higher spells?",
      "Explain the Eye and Hand of Vecna powers and curse mechanics.",
      "What is Kas the Betrayer's secret plot disguised as Mordenkainen?",
      "Tactical advice for running a high-stakes combat against Vecna."
    ]
  },
  rules: {
    label: 'Omniscient 5e Sage',
    subtitle: 'RAW & RAI Rules, Spells, Conditions, Combat',
    icon: BookOpen,
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 border-blue-500/30',
    badgeText: 'text-blue-300',
    quickPrompts: [
      "Can a caster cast a bonus action spell and a leveled action spell in the same turn?",
      "How does stealth vs passive perception work in dim light?",
      "What are the exact mechanical penalties of the Poisoned condition?",
      "Explain half cover, three-quarters cover, and total cover rules.",
      "How do grappling and shoving interact with the Extra Attack feature?"
    ]
  },
  dm_copilot: {
    label: 'Tactical DM Co-Pilot',
    subtitle: 'Real-time Improvisation, Sensory Descriptions, DCs',
    icon: Dices,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 border-purple-500/30',
    badgeText: 'text-purple-300',
    quickPrompts: [
      "Give me a vivid, atmospheric sensory description for entering a creepy dungeon room.",
      "Generate 3 quirky thieves' guild NPC names with distinctive traits.",
      "Improvise a fair DC and consequences for jumping across a burning wooden balcony.",
      "How do I rebalance an encounter if 2 player characters drop unconscious?"
    ]
  }
};

const STORAGE_KEY = 'dnd_ai_chatbot_history_v1';

export const DndChatbotModal: React.FC<DndChatbotModalProps> = ({
  isOpen,
  onClose,
  currentMapName,
  combatantsCount = 0,
  activeRound = 1,
  chapterDigest
}) => {
  const [mode, setMode] = useState<DndMode>('golden_vault');
  const [model, setModel] = useState<DndModelChoice>('gemini-2.5-flash');
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [playingAudioIndex, setPlayingAudioIndex] = useState<number | null>(null);
  const [includeContext, setIncludeContext] = useState(true);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  // Load chat history from localStorage
  const [messages, setMessages] = useState<DndChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load dnd chat history:', e);
    }
    // Default initial greeting
    return [
      {
        role: 'model',
        text: `### Welcome, Dungeon Master 🎲
I am your **D&D AI Companion & Rules Oracle**, fully attuned to **Keys from the Golden Vault** (specifically *Masterpiece Imbroglio*), **Vecna: Eve of Ruin**, official 5e rules, and real-time tactical adjudication.

Select your active focus above or choose one of the quick prompts below to begin. How may I assist your table today?`,
        mode: 'golden_vault',
        timestamp: Date.now()
      }
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Save history on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save dnd chat history:', e);
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    if (!isMinimized && isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  if (!isOpen) return null;

  const currentConfig = MODE_CONFIGS[mode];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isSending) return;

    const userMsg: DndChatMessage = {
      role: 'user',
      text: query,
      mode,
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setIsSending(true);

    let contextString = '';
    if (includeContext) {
      contextString = `Current VTT Session State:
- Active Map: ${currentMapName || 'Tactical Canvas'}
- Combat Status: ${combatantsCount > 0 ? `Active combat (${combatantsCount} combatants, Round ${activeRound})` : 'Exploration / Roleplay mode'}
`;
    }

    try {
      const response = await chatWithDndBot(
        newHistory,
        query,
        mode,
        model,
        contextString,
        chapterDigest
      );

      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: response.text,
          mode,
          timestamp: Date.now()
        }
      ]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: `⚠️ **Arcane Disruption**: Could not contact the Oracle (${err.message || 'Unknown error'}). Please verify your Gemini API connection in Settings and try again.`,
          mode,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePlayTTS = async (text: string, index: number) => {
    if (playingAudioIndex === index) {
      audioNarration.stop();
      setPlayingAudioIndex(null);
      return;
    }

    try {
      setPlayingAudioIndex(index);
      await audioNarration.play({
        text,
        voiceId: 'male_npc',
        onEnded: () => setPlayingAudioIndex(null),
        onError: () => setPlayingAudioIndex(null),
      });
    } catch (err) {
      console.error('TTS error:', err);
      setPlayingAudioIndex(null);
    }
  };

  const handleClearHistory = () => {
    if (!confirmClearHistory) {
      setConfirmClearHistory(true);
      setTimeout(() => setConfirmClearHistory(false), 3500);
      return;
    }
    setConfirmClearHistory(false);
    const resetMsg: DndChatMessage = {
      role: 'model',
      text: `### Conversation Reset 🧹
The archives have been cleared. Active Mode: **${currentConfig.label}**. What would you like to explore?`,
      mode,
      timestamp: Date.now()
    };
    setMessages([resetMsg]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div 
      className={`fixed z-50 transition-all duration-300 shadow-2xl border border-zinc-700/80 bg-zinc-950/95 backdrop-blur-xl flex flex-col ${
        isMinimized 
          ? 'bottom-4 right-4 w-80 h-14 rounded-2xl overflow-hidden' 
          : 'bottom-4 right-4 sm:right-6 w-[95vw] sm:w-[580px] md:w-[680px] h-[85vh] sm:h-[720px] max-h-[90vh] rounded-2xl overflow-hidden'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-600 to-red-600 text-white shadow-md">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">D&D AI Companion</h2>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${currentConfig.badgeBg} ${currentConfig.badgeText}`}>
                {currentConfig.label.split(':')[0]}
              </span>
            </div>
            {!isMinimized && (
              <p className="text-[11px] text-zinc-400 truncate max-w-[260px] sm:max-w-[340px]">
                {currentConfig.subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isMinimized && (
            <>
              {/* Model Speed Switcher */}
              <div className="relative group">
                <select 
                  value={model} 
                  onChange={e => setModel(e.target.value as DndModelChoice)}
                  className="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs px-2.5 py-1 rounded-lg border border-zinc-700 outline-none cursor-pointer pr-6 appearance-none font-medium"
                  title="Select Gemini Model Tier"
                >
                  <option value="gemini-2.5-flash">🛡️ Stable (Flash 2.5)</option>
                  <option value="gemini-3.5-flash">⚖️ General (Flash 3.5)</option>
                  <option value="gemini-3.8-flash">⚡ Deep (Flash 3.8)</option>
                  <option value="gemini-3.1-flash-lite">🚀 Fast (Lite 3.1)</option>
                </select>
                <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-1.5 top-2 pointer-events-none" />
              </div>

              {/* Clear History */}
              <button
                onClick={handleClearHistory}
                title="Clear conversation"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800/80 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Minimize / Maximize */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand" : "Minimize"}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            title="Close chatbot"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Active Chapter Knowledge Banner */}
          {chapterDigest && (
            <div className="px-3.5 py-1.5 bg-blue-950/70 border-b border-blue-500/30 flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-blue-300 font-bold truncate">
                  📜 Chapter Module: {chapterDigest.chapterTitle || chapterDigest.pdfFilename}
                </span>
                <span className="text-blue-400/80 shrink-0">
                  ({chapterDigest.rooms?.length || 0} rooms indexed)
                </span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0 font-bold">
                Oracle Attuned
              </span>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="grid grid-cols-4 gap-1 p-2 bg-zinc-900/60 border-b border-zinc-800/80 text-xs">
            {(Object.keys(MODE_CONFIGS) as DndMode[]).map(key => {
              const cfg = MODE_CONFIGS[key];
              const Icon = cfg.icon;
              const isActive = mode === key;
              return (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
                    isActive 
                      ? 'bg-zinc-800 text-white shadow border border-zinc-700/80' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? cfg.color : 'text-zinc-400'}`} />
                  <span className="truncate max-w-[85px] sm:max-w-none text-[11px]">
                    {key === 'golden_vault' ? 'Golden Vault' : 
                     key === 'vecna' ? 'Vecna' : 
                     key === 'rules' ? '5e Rules' : 'DM Co-Pilot'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Prompts Carousel */}
          <div className="px-3 py-2 bg-zinc-900/30 border-b border-zinc-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold whitespace-nowrap pl-1">
              Suggested:
            </span>
            {currentConfig.quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                disabled={isSending}
                className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/50 transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Thread */}
          <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden flex flex-col gap-4 custom-scrollbar-red">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={index} 
                  className={`flex flex-col max-w-[90%] sm:max-w-[85%] ${
                    isUser ? 'self-end' : 'self-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {isUser ? (
                      <>
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">You (DM)</span>
                        <User className="w-3 h-3 text-orange-400" />
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                          {msg.mode ? MODE_CONFIGS[msg.mode]?.label.split(':')[0] : 'AI Oracle'}
                        </span>
                      </>
                    )}
                  </div>

                  <div 
                    className={`relative p-3.5 rounded-2xl text-sm leading-relaxed ${
                      isUser 
                        ? 'bg-gradient-to-br from-orange-600/90 to-amber-700/90 text-white rounded-tr-sm shadow-md font-sans' 
                        : 'bg-zinc-900/90 text-zinc-200 border border-zinc-800 rounded-tl-sm shadow-lg font-serif'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div className="markdown-body prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:text-amber-300 prose-headings:my-2 prose-strong:text-amber-200 prose-blockquote:border-l-amber-500 prose-blockquote:bg-amber-950/20 prose-blockquote:px-3 prose-blockquote:py-1 prose-blockquote:rounded-r-lg prose-table:text-xs">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}

                    {/* Action Bar for AI response */}
                    {!isUser && (
                      <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-sans">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyText(msg.text, index)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
                            title="Copy response"
                          >
                            {copiedIndex === index ? (
                              <>
                                <Check className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handlePlayTTS(msg.text, index)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
                            title="Narrate aloud with AI Voice"
                          >
                            {playingAudioIndex === index ? (
                              <>
                                <VolumeX className="w-3 h-3 text-amber-400 animate-pulse" />
                                <span className="text-amber-400">Stop Audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                <span>Read Aloud</span>
                              </>
                            )}
                          </button>
                        </div>

                        {msg.timestamp && (
                          <span className="text-[10px] text-zinc-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-2 self-start bg-zinc-900/90 border border-zinc-800 rounded-2xl px-4 py-3 text-zinc-300 text-xs">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Consulting the Golden Vault & Multiverse archives...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          <div className="p-3 bg-zinc-900/95 border-t border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-200">
                <input 
                  type="checkbox" 
                  checked={includeContext} 
                  onChange={e => setIncludeContext(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>Include VTT Map State in prompt</span>
              </label>
              <span className="text-zinc-500">Shift+Enter for newline</span>
            </div>

            <div className="flex items-end gap-2 bg-zinc-950 border border-zinc-800 focus-within:border-amber-500/60 rounded-xl p-2 transition-colors">
              <textarea
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Ask anything about ${currentConfig.label}...`}
                rows={2}
                disabled={isSending}
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none max-h-32 min-h-[44px]"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isSending}
                className="p-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default DndChatbotModal;
