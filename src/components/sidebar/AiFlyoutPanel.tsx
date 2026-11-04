// src/components/sidebar/AiFlyoutPanel.tsx
// Dedicated flyout panel for AI Dungeon Master, Gemini API Key, Chatbot, and Voice Engine

import React from 'react';
import {
  Wand2,
  Pin,
  X,
  Key,
  Sparkles,
  Scan,
  Volume2,
  VolumeX
} from 'lucide-react';
import { NARRATION_VOICES } from '../../types';

export interface AiFlyoutPanelProps {
  pinnedGroup: string | null;
  setPinnedGroup: (group: any) => void;
  closeFlyout: () => void;
  handleDragStart: (e: React.MouseEvent) => void;
  hasApiKey: boolean;
  onOpenApiKeyModal?: () => void;
  setShowDndChatbot?: (show: boolean) => void;
  setShowCinematicMapGenerator: (show: boolean) => void;
  tool: string;
  setTool: (tool: any) => void;
  voices?: any[];
  selectedAIVoice: string;
  setSelectedAIVoice: (voice: string) => void;
  aiVoicePrompt: string;
  setAIVoicePrompt: (prompt: string) => void;
  handleGenerateAIScript: () => void;
  isGeneratingScript: boolean;
  handleSpeakAIVoice: () => void;
  isPlayingAudio: boolean;
  aiVoiceScript: string;
}

export const AiFlyoutPanel: React.FC<AiFlyoutPanelProps> = ({
  pinnedGroup,
  setPinnedGroup,
  closeFlyout,
  handleDragStart,
  hasApiKey,
  onOpenApiKeyModal,
  setShowDndChatbot,
  setShowCinematicMapGenerator,
  tool,
  setTool,
  voices,
  selectedAIVoice,
  setSelectedAIVoice,
  aiVoicePrompt,
  setAIVoicePrompt,
  handleGenerateAIScript,
  isGeneratingScript,
  handleSpeakAIVoice,
  isPlayingAudio,
  aiVoiceScript
}) => {
  return (
    <div className="p-3.5 flex flex-col gap-3 min-w-[280px]">
      {/* Header */}
      <div
        onMouseDown={pinnedGroup ? handleDragStart : undefined}
        className={`flex items-center justify-between border-b border-zinc-800 pb-2.5 ${pinnedGroup ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
      >
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-fuchsia-400" />
          <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider">AI Dungeon Master</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPinnedGroup(pinnedGroup === 'ai' ? null : 'ai')}
            className={`p-1 rounded-md transition-colors ${pinnedGroup === 'ai' ? 'text-fuchsia-400 bg-fuchsia-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
            title={pinnedGroup === 'ai' ? 'Unpin Menu' : 'Pin Menu Open (Allows moving)'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={closeFlyout}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Gemini API Key - Load / Configure for Cinematic Map Generator */}
      <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-bold text-zinc-200">
            <Key className={`w-3.5 h-3.5 ${hasApiKey ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>Gemini API Key</span>
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
            hasApiKey 
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-500/15 border border-amber-500/30 text-amber-300 animate-pulse'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {hasApiKey ? 'Active' : 'Key Needed'}
          </span>
        </div>
        
        <p className="text-[10px] text-zinc-400 leading-tight">
          Powers the Cinematic Map Generator & D&D AI tools.
        </p>

        <button
          id="btn-ai-api-flyout"
          onClick={async () => {
            if ((window as any).aistudio?.openSelectKey) {
              await (window as any).aistudio.openSelectKey();
            }
            if (onOpenApiKeyModal) {
              onOpenApiKeyModal();
            }
          }}
          className={`w-full py-2 px-3 mt-0.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
            hasApiKey
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-amber-950/50'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>{hasApiKey ? 'Manage / Change Gemini Key' : 'Load Gemini API Key'}</span>
        </button>
      </div>

      {/* AI DM Tools */}
      <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
        {/* Premier D&D AI Chatbot Button */}
        <button
          id="btn-dnd-chatbot-flyout"
          onClick={() => {
            if (setShowDndChatbot) setShowDndChatbot(true);
            setPinnedGroup(null);
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 via-orange-600/20 to-red-600/30 hover:from-amber-600/40 hover:to-red-600/40 border border-amber-500/50 text-white text-xs font-bold flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight text-white font-bold">D&D AI Chatbot</span>
              <span className="text-[10px] text-amber-300/80 font-normal">Golden Vault & Vecna Expert</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] text-amber-300 font-mono uppercase tracking-wider font-semibold">
            Open
          </span>
        </button>

        <button
          id="btn-cinematic-map-flyout"
          onClick={() => setShowCinematicMapGenerator(true)}
          className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-2.5 transition-all"
        >
          <Wand2 className="w-4 h-4 text-amber-400" />
          AI Battlemap & Auto-Wall Generator
        </button>

        <button
          id="btn-ai-describe-flyout"
          onClick={() => setTool('ai-describe')}
          className={`w-full py-2 px-3 rounded-xl border text-xs font-medium flex items-center gap-2.5 transition-all ${
            tool === 'ai-describe'
              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 font-bold'
              : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
          }`}
        >
          <Scan className="w-4 h-4 text-indigo-400" />
          DM Vision (Drag Area on Map)
        </button>
      </div>

      {/* AI Voice & Narrator */}
      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold font-mono text-zinc-400">AI Voice & Script Narrator</span>
          {onOpenApiKeyModal && (
            <button
              onClick={onOpenApiKeyModal}
              className="text-[9px] font-mono text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1 hover:underline cursor-pointer"
              title="Configure ElevenLabs & Gemini API Keys"
            >
              <span>Voice Engine Setup</span>
              <Key className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-[190px] overflow-y-auto pr-0.5 custom-scrollbar">
          {((voices && voices.length > 0) ? voices : NARRATION_VOICES).map((voice: any) => {
            const voiceId = voice.id || voice.name;
            const isSelected = selectedAIVoice === voiceId || selectedAIVoice === voice.name || selectedAIVoice === voice.geminiVoice;
            return (
              <button
                key={voiceId}
                onClick={() => setSelectedAIVoice(voice.id || voice.name)}
                className={`p-2 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 ring-1 ring-fuchsia-500/40'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                }`}
                title={voice.description || voice.label}
              >
                <div className="text-[11px] font-bold leading-tight truncate">{voice.name}</div>
                <div className="text-[9px] opacity-70 leading-tight truncate mt-0.5">
                  {voice.description || voice.label || voice.geminiVoice}
                </div>
              </button>
            );
          })}
        </div>

        <textarea
          value={aiVoicePrompt}
          onChange={(e) => setAIVoicePrompt(e.target.value)}
          placeholder="Enter narration prompt or type dialogue..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-fuchsia-500/50 min-h-[60px]"
        />

        <div className="flex gap-2">
          <button
            id="btn-gen-script-flyout"
            onClick={handleGenerateAIScript}
            disabled={isGeneratingScript || !aiVoicePrompt.trim()}
            className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
          >
            {isGeneratingScript ? (
              <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Wand2 className="w-3 h-3 text-fuchsia-400" />
            )}
            Generate Script
          </button>

          <button
            id="btn-speak-voice-flyout"
            onClick={handleSpeakAIVoice}
            disabled={!isPlayingAudio && (!aiVoicePrompt.trim() && !aiVoiceScript.trim())}
            className={`flex-1 py-1.5 text-white rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${
              isPlayingAudio
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950 animate-pulse'
                : 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-fuchsia-950 disabled:opacity-40'
            }`}
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                Stop Narration
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                Speak Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiFlyoutPanel;
