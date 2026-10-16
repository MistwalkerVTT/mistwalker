import React, { useState, useEffect } from 'react';
import {
  Key,
  X,
  Check,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  ClipboardPaste,
  Trash2,
  Sparkles,
  ShieldCheck,
  Volume2,
  Headphones
} from 'lucide-react';
import {
  checkApiKeyStatus,
  saveGeminiApiKey,
  getStoredGeminiKey,
  setStoredGeminiKey,
  checkElevenLabsStatus,
  saveElevenLabsKey,
  getStoredElevenLabsKey,
  setStoredElevenLabsKey
} from '../services/aiService';
import { toast } from 'sonner';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (key: string) => void;
  initialTab?: 'gemini' | 'elevenlabs';
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved,
  initialTab = 'gemini'
}) => {
  const [activeTab, setActiveTab] = useState<'gemini' | 'elevenlabs'>(initialTab);

  // Gemini state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ElevenLabs state
  const [elevenKeyInput, setElevenKeyInput] = useState('');
  const [maskedElevenKey, setMaskedElevenKey] = useState<string | null>(null);
  const [hasElevenKey, setHasElevenKey] = useState<boolean>(false);
  const [showElevenKey, setShowElevenKey] = useState<boolean>(false);
  const [isSavingEleven, setIsSavingEleven] = useState<boolean>(false);
  const [elevenError, setElevenError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setElevenError(null);
      if (initialTab) setActiveTab(initialTab);

      // Check Gemini status
      checkApiKeyStatus().then(status => {
        setHasKey(status.hasKey);
        setMaskedKey(status.maskedKey);
      });
      const storedGemini = getStoredGeminiKey();
      if (storedGemini) {
        setApiKeyInput(storedGemini);
      }

      // Check ElevenLabs status
      checkElevenLabsStatus().then(status => {
        setHasElevenKey(status.hasKey);
        setMaskedElevenKey(status.maskedKey);
      });
      const storedEleven = getStoredElevenLabsKey();
      if (storedEleven) {
        setElevenKeyInput(storedEleven);
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Gemini handlers
  const handlePasteGemini = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKeyInput(text.trim());
        setError(null);
      }
    } catch {
      toast.error('Could not access clipboard. Please paste manually.');
    }
  };

  const handleSaveGemini = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      setError('Please enter a valid Gemini API key.');
      return;
    }

    if (cleanKey.length < 15) {
      setError('API key seems too short. A standard Google Gemini API key starts with AIzaSy...');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await saveGeminiApiKey(cleanKey);
      setHasKey(true);
      setMaskedKey(res.maskedKey || (cleanKey.slice(0, 4) + '...' + cleanKey.slice(-4)));
      toast.success('Gemini API key loaded successfully for Cinematic Map Generator!');
      if (onKeySaved) onKeySaved(cleanKey);
    } catch (err: any) {
      console.error('Failed to save Gemini key:', err);
      setError(err.message || 'Failed to validate or save API key.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearGemini = () => {
    setStoredGeminiKey('');
    setApiKeyInput('');
    setHasKey(false);
    setMaskedKey(null);
    toast.success('Gemini API key cleared.');
    if (onKeySaved) onKeySaved('');
  };

  // ElevenLabs handlers
  const handlePasteEleven = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setElevenKeyInput(text.trim());
        setElevenError(null);
      }
    } catch {
      toast.error('Could not access clipboard. Please paste manually.');
    }
  };

  const handleSaveEleven = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = elevenKeyInput.trim();
    if (!cleanKey) {
      setElevenError('Please enter a valid ElevenLabs API key.');
      return;
    }

    if (cleanKey.length < 15) {
      setElevenError('API key seems too short. Expected standard ElevenLabs API key.');
      return;
    }

    setIsSavingEleven(true);
    setElevenError(null);

    try {
      const res = await saveElevenLabsKey(cleanKey);
      setHasElevenKey(true);
      setMaskedElevenKey(res.maskedKey || (cleanKey.slice(0, 4) + '...' + cleanKey.slice(-4)));
      toast.success('ElevenLabs API key connected! Ultra-realistic voice acting enabled.');
    } catch (err: any) {
      console.error('Failed to save ElevenLabs key:', err);
      setElevenError(err.message || 'Failed to validate or save ElevenLabs key.');
    } finally {
      setIsSavingEleven(false);
    }
  };

  const handleClearEleven = () => {
    setStoredElevenLabsKey('');
    setElevenKeyInput('');
    setHasElevenKey(false);
    setMaskedElevenKey(null);
    toast.success('ElevenLabs API key removed. Falling back to Gemini neural voice.');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono tracking-wide flex items-center gap-2">
                AI Service & Voice Setup
              </h3>
              <p className="text-[11px] text-zinc-400">
                Configure Gemini Intelligence & ElevenLabs High-Fidelity Voices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('gemini')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'gemini'
                ? 'bg-zinc-800 text-amber-300 shadow-md border border-zinc-700/80'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Google Gemini</span>
            {hasKey ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Connected" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400/60" title="Key required" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('elevenlabs')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'elevenlabs'
                ? 'bg-zinc-800 text-fuchsia-300 shadow-md border border-zinc-700/80'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>ElevenLabs Voice AI</span>
            {hasElevenKey ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Connected" />
            ) : (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-500">
                Studio
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Gemini Setup */}
        {activeTab === 'gemini' && (
          <div className="p-6 flex flex-col gap-5">
            {/* Status Badge */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              hasKey
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {hasKey ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>
                  {hasKey ? (
                    <span>
                      Gemini API Key Active: <strong className="font-mono text-emerald-300">{maskedKey}</strong>
                    </span>
                  ) : (
                    <span>No Gemini API key loaded yet. Enter your key below.</span>
                  )}
                </span>
              </div>
              {hasKey && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 uppercase font-bold shrink-0">
                  Connected
                </span>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSaveGemini} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Gemini API Key
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteGemini}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    Paste
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => {
                      setApiKeyInput(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="AIzaSy..."
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full bg-zinc-900/90 border border-zinc-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none transition-colors"
                  />
                  <div className="absolute right-2 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                      title={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {error}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSaving || !apiKeyInput.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-950 flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Gemini Key</span>
                    </>
                  )}
                </button>

                {hasKey && (
                  <button
                    type="button"
                    onClick={handleClearGemini}
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-800/60 text-zinc-400 hover:text-rose-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Remove this API key"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </form>

            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-[11px] text-zinc-400 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Powers the <strong>Cinematic Map Generator</strong>, <strong>DM Vision scanner</strong>, and default speech engine.
                </p>
              </div>
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Need a Google Gemini API Key?</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline"
                >
                  <span>Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: ElevenLabs Setup */}
        {activeTab === 'elevenlabs' && (
          <div className="p-6 flex flex-col gap-5">
            {/* Status Badge */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              hasElevenKey
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}>
              <div className="flex items-center gap-2.5">
                {hasElevenKey ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Headphones className="w-4 h-4 text-fuchsia-400 shrink-0" />
                )}
                <span>
                  {hasElevenKey ? (
                    <span>
                      ElevenLabs Active: <strong className="font-mono text-emerald-300">{maskedElevenKey}</strong>
                    </span>
                  ) : (
                    <span>Add your ElevenLabs API key for cinema-grade voice acting & creature dialogue.</span>
                  )}
                </span>
              </div>
              {hasElevenKey && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 uppercase font-bold shrink-0">
                  HD Studio Active
                </span>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEleven} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-fuchsia-400" />
                    ElevenLabs API Key
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteEleven}
                    className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    Paste
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showElevenKey ? 'text' : 'password'}
                    value={elevenKeyInput}
                    onChange={(e) => {
                      setElevenKeyInput(e.target.value);
                      if (elevenError) setElevenError(null);
                    }}
                    placeholder="sk_..."
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full bg-zinc-900/90 border border-zinc-700 focus:border-fuchsia-500 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none transition-colors"
                  />
                  <div className="absolute right-2 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowElevenKey(!showElevenKey)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                      title={showElevenKey ? 'Hide key' : 'Show key'}
                    >
                      {showElevenKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {elevenError && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {elevenError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingEleven || !elevenKeyInput.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white text-xs font-bold transition-all shadow-md shadow-fuchsia-950 flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                >
                  {isSavingEleven ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save ElevenLabs Key</span>
                    </>
                  )}
                </button>

                {hasElevenKey && (
                  <button
                    type="button"
                    onClick={handleClearEleven}
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-800/60 text-zinc-400 hover:text-rose-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Remove ElevenLabs key"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </form>

            {/* Archetype Previews in ElevenLabs */}
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-[11px] text-zinc-400 flex flex-col gap-2.5">
              <span className="font-bold text-zinc-300 font-mono text-[10px] uppercase tracking-wider">
                Integrated ElevenLabs Voice Archetypes
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <div className="font-bold text-amber-300">🧙 Old Wizard</div>
                  <div className="text-zinc-500">George: Ancient storyteller</div>
                </div>
                <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <div className="font-bold text-rose-300">👹 Fiend / Entity</div>
                  <div className="text-zinc-500">Arnold: Subterranean booming bass</div>
                </div>
                <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <div className="font-bold text-emerald-300">🏹 Female NPC</div>
                  <div className="text-zinc-500">Rachel: Expressive adventurer</div>
                </div>
                <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <div className="font-bold text-sky-300">🛡️ Male NPC</div>
                  <div className="text-zinc-500">Adam: Grounded guard / barkeep</div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Get a free ElevenLabs account</span>
                <a
                  href="https://elevenlabs.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-fuchsia-400 hover:text-fuchsia-300 hover:underline"
                >
                  <span>elevenlabs.io</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
