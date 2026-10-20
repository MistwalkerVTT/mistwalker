import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  X,
  Shield,
  ShieldAlert,
  Key,
  Cookie,
  Trash2,
  Eye,
  EyeOff,
  ClipboardPaste,
  Check,
  Loader2,
  HelpCircle,
  Info,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  Volume2,
  RefreshCw,
  Plus,
  CheckCircle2,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { CobaltInstructionsModal } from './CobaltInstructionsModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'cobalt' | 'ai' | 'danger';
}

interface DmTokenItem {
  id: string;
  label: string;
  preview: string;
  hasToken: boolean;
}

interface GeminiFallbackItem {
  id: string;
  label: string;
  preview: string;
}

interface SettingsStatus {
  cobalt: {
    dmTokens: DmTokenItem[];
    hasDmToken: boolean;
    dmTokenPreview: string | null;
    hasToken: boolean;
    tokenPreview: string | null;
    campaignId: string | null;
  };
  gemini: {
    hasKey: boolean;
    maskedKey: string | null;
    fallbackKeys: GeminiFallbackItem[];
    poolCount: number;
  };
  elevenlabs: {
    hasKey: boolean;
    maskedKey: string | null;
  };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'cobalt'
}) => {
  const [activeTab, setActiveTab] = useState<'cobalt' | 'ai' | 'danger'>(initialTab);
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // New DM Key form state
  const [showAddDmForm, setShowAddDmForm] = useState(false);
  const [newDmLabel, setNewDmLabel] = useState('');
  const [newDmToken, setNewDmToken] = useState('');
  const [showNewDmToken, setShowNewDmToken] = useState(false);
  const [isAddingDmToken, setIsAddingDmToken] = useState(false);
  const [testingTokenId, setTestingTokenId] = useState<string | null>(null);

  // Compendium Token state
  const [playerTokenInput, setPlayerTokenInput] = useState('');
  const [showPlayerToken, setShowPlayerToken] = useState(false);
  const [isSavingPlayerToken, setIsSavingPlayerToken] = useState(false);
  const [isTestingPlayerToken, setIsTestingPlayerToken] = useState(false);

  // Campaign ID state
  const [campaignIdInput, setCampaignIdInput] = useState('');
  const [isSavingCampaignId, setIsSavingCampaignId] = useState(false);

  // Instructions popup state
  const [showHowToModal, setShowHowToModal] = useState(false);

  // Gemini state
  const [geminiInput, setGeminiInput] = useState('');
  const [showGemini, setShowGemini] = useState(false);
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);

  // Fallback Gemini state
  const [newFallbackGeminiKey, setNewFallbackGeminiKey] = useState('');
  const [showFallbackGeminiInput, setShowFallbackGeminiInput] = useState(false);
  const [isAddingFallbackGemini, setIsAddingFallbackGemini] = useState(false);

  // ElevenLabs state
  const [elevenInput, setElevenInput] = useState('');
  const [showEleven, setShowEleven] = useState(false);
  const [isSavingEleven, setIsSavingEleven] = useState(false);
  const [isTestingEleven, setIsTestingEleven] = useState(false);

  // Danger Zone confirmation
  const [showConfirmWipeAll, setShowConfirmWipeAll] = useState(false);
  const [isWipingAll, setIsWipingAll] = useState(false);

  // Fetch credential statuses
  const fetchStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/settings/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.cobalt?.campaignId) {
          setCampaignIdInput(data.cobalt.campaignId);
        }
      }
    } catch (err) {
      console.warn('[SettingsModal] Failed to fetch credential status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      fetchStatus();
      setShowConfirmWipeAll(false);
    }
  }, [isOpen, initialTab, fetchStatus]);

  if (!isOpen) return null;

  // Clipboard Paste Helper
  const handlePaste = async (setter: (val: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setter(text.trim());
        toast.success('Pasted from clipboard!');
      }
    } catch {
      toast.error('Unable to access clipboard. Please paste manually.');
    }
  };

  // Add / Save DM Key
  const handleSaveDmToken = async () => {
    if (!newDmToken.trim()) {
      toast.error('Please enter a valid CobaltSession token (min 15 characters).');
      return;
    }
    setIsAddingDmToken(true);
    try {
      const res = await fetch('/api/settings/save-dm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newDmLabel.trim() || undefined,
          token: newDmToken.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'DM Key added successfully!');
        setNewDmLabel('');
        setNewDmToken('');
        setShowAddDmForm(false);
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to add DM Key');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error adding DM Key');
    } finally {
      setIsAddingDmToken(false);
    }
  };

  // Delete a specific DM Key
  const handleDeleteDmToken = async (id: string, label: string) => {
    try {
      const res = await fetch('/api/settings/delete-dm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Removed ${label} from DM key pool.`);
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to remove DM key');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    }
  };

  // Test an existing DM Key by ID
  const handleTestDmTokenById = async (id: string, label: string) => {
    setTestingTokenId(id);
    try {
      const res = await fetch('/api/settings/test-cobalt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isDmToken: true })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${label}: Verified with D&D Beyond! Token is active.`);
      } else {
        toast.error(`${label}: ${data.error || 'D&D Beyond rejected this token.'}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error testing Cobalt token');
    } finally {
      setTestingTokenId(null);
    }
  };

  // Test current input before saving
  const handleTestNewDmToken = async () => {
    if (!newDmToken.trim()) {
      toast.error('Paste a token first to test it.');
      return;
    }
    setTestingTokenId('new');
    try {
      const res = await fetch('/api/settings/test-cobalt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: newDmToken.trim(), isDmToken: true })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Token is valid and active with D&D Beyond!');
      } else {
        toast.error(data.error || 'D&D Beyond rejected this token.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error testing token');
    } finally {
      setTestingTokenId(null);
    }
  };

  // Save Player/Compendium Token
  const handleSavePlayerToken = async () => {
    if (!playerTokenInput.trim()) {
      toast.error('Please enter a valid Cobalt token');
      return;
    }
    setIsSavingPlayerToken(true);
    try {
      const res = await fetch('/api/ddb/set-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: playerTokenInput.trim(), isDmToken: false })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Compendium Cobalt token updated successfully!');
        setPlayerTokenInput('');
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to update token');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setIsSavingPlayerToken(false);
    }
  };

  // Test Player/Compendium Token
  const handleTestPlayerToken = async () => {
    setIsTestingPlayerToken(true);
    try {
      const res = await fetch('/api/settings/test-cobalt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: playerTokenInput.trim() || undefined, isDmToken: false })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Compendium Cobalt token is valid!');
      } else {
        toast.error(data.error || 'Failed to verify token with D&D Beyond.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error testing token');
    } finally {
      setIsTestingPlayerToken(false);
    }
  };

  // Save Campaign ID
  const handleSaveCampaignId = async () => {
    setIsSavingCampaignId(true);
    try {
      const res = await fetch('/api/settings/set-campaign-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaignIdInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Campaign ID saved!');
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to save campaign ID');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setIsSavingCampaignId(false);
    }
  };

  // Save Primary Gemini Key
  const handleSaveGemini = async () => {
    if (!geminiInput.trim()) {
      toast.error('Please enter a valid Gemini API key.');
      return;
    }
    setIsSavingGemini(true);
    try {
      const res = await fetch('/api/ai/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Gemini API key saved successfully!');
        setGeminiInput('');
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to save Gemini key');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setIsSavingGemini(false);
    }
  };

  // Test Primary Gemini Key
  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    try {
      const res = await fetch('/api/settings/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiInput.trim() || undefined })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Gemini API key is active and working!');
      } else {
        toast.error(data.error || 'Gemini key validation failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setIsTestingGemini(false);
    }
  };

  // Add Fallback Gemini Key
  const handleAddFallbackGemini = async () => {
    if (!newFallbackGeminiKey.trim()) {
      toast.error('Please enter a valid fallback Gemini API key.');
      return;
    }
    setIsAddingFallbackGemini(true);
    try {
      const res = await fetch('/api/settings/save-gemini-fallback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newFallbackGeminiKey.trim() })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Fallback Gemini key added to rotation pool!');
        setNewFallbackGeminiKey('');
        setShowFallbackGeminiInput(false);
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to add fallback Gemini key');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setIsAddingFallbackGemini(false);
    }
  };

  // Delete Fallback Gemini Key
  const handleDeleteFallbackGemini = async (index: number) => {
    try {
      const res = await fetch('/api/settings/delete-gemini-fallback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Fallback key removed from rotation pool.');
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to remove fallback key');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    }
  };

  // Save ElevenLabs Key
  const handleSaveEleven = async () => {
    if (!elevenInput.trim()) {
      toast.error('Please enter a valid ElevenLabs API key.');
      return;
    }
    setIsSavingEleven(true);
    try {
      const res = await fetch('/api/ai/set-elevenlabs-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: elevenInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('ElevenLabs API key saved successfully!');
        setElevenInput('');
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to save ElevenLabs key');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setIsSavingEleven(false);
    }
  };

  // Test ElevenLabs Key
  const handleTestEleven = async () => {
    setIsTestingEleven(true);
    try {
      const res = await fetch('/api/settings/test-elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: elevenInput.trim() || undefined })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'ElevenLabs API key is active and working!');
      } else {
        toast.error(data.error || 'ElevenLabs key validation failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setIsTestingEleven(false);
    }
  };

  // Wipe Single Credential Category
  const handleWipeSingle = async (target: string, name: string) => {
    try {
      const res = await fetch('/api/settings/wipe-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Wiped ${name} successfully.`);
        fetchStatus();
      } else {
        toast.error(data.error || `Failed to wipe ${name}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    }
  };

  // Nuclear Wipe All
  const handleWipeAll = async () => {
    setIsWipingAll(true);
    try {
      const res = await fetch('/api/settings/wipe-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('mistwalker_gemini_api_key');
          localStorage.removeItem('mistwalker_elevenlabs_api_key');
          localStorage.removeItem('mistwalker_ddb_campaign_id');
        }
        toast.success('All stored secrets, DM keys, and Cobalt sessions wiped successfully!');
        setNewDmLabel('');
        setNewDmToken('');
        setPlayerTokenInput('');
        setCampaignIdInput('');
        setGeminiInput('');
        setNewFallbackGeminiKey('');
        setElevenInput('');
        setShowConfirmWipeAll(false);
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to wipe credentials');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setIsWipingAll(false);
    }
  };

  const dmTokensList = status?.cobalt.dmTokens || [];
  const geminiFallbacksList = status?.gemini.fallbackKeys || [];

  return (
    <>
      <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
        <div 
          className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-800 bg-zinc-950/70">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  MistWalker Settings &amp; Secrets Vault
                </h2>
                <p className="text-xs text-zinc-400">
                  Manage D&amp;D Beyond Cobalt sync (with multiple DM keys), AI intelligence keys, and security credentials
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchStatus}
                title="Refresh Status"
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin text-amber-400' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 px-6 pt-3 border-b border-zinc-800/80 bg-zinc-950/40">
            <button
              onClick={() => setActiveTab('cobalt')}
              className={`px-4 py-2.5 text-xs font-mono font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'cobalt'
                  ? 'border-amber-400 text-amber-300 bg-zinc-850/80'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Cookie className="w-4 h-4 text-amber-400" />
              D&amp;D Beyond (Cobalt)
              {dmTokensList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold">
                  {dmTokensList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-2.5 text-xs font-mono font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'ai'
                  ? 'border-sky-400 text-sky-300 bg-zinc-850/80'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Key className="w-4 h-4 text-sky-400" />
              AI &amp; Speech API Keys
              {status?.gemini.hasKey && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('danger')}
              className={`px-4 py-2.5 text-xs font-mono font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'danger'
                  ? 'border-rose-500 text-rose-300 bg-zinc-850/80'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Danger Zone (Wipe)
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sidebar-scrollbar">
            {/* ========================================================= */}
            {/* TAB 1: D&D BEYOND (COBALT & MULTIPLE DM KEYS)             */}
            {/* ========================================================= */}
            {activeTab === 'cobalt' && (
              <div className="space-y-6">
                {/* Hero Info Banner with "How-To" Button */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                        D&amp;D Beyond Synchronization &amp; Multiple DM Keys
                      </h3>
                      <p className="text-zinc-400 leading-relaxed font-sans mt-0.5">
                        MistWalker communicates directly with D&amp;D Beyond via secure <code>CobaltSession</code> cookies. You can store multiple DM keys for co-DMs, West Marches campaigns, or secondary accounts.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowHowToModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>How to find this?</span>
                  </button>
                </div>

                {/* ========================================================= */}
                {/* SECTION 1: MULTIPLE DM KEYS POOL                          */}
                {/* ========================================================= */}
                <div className="p-5 rounded-2xl bg-zinc-950/70 border border-amber-500/40 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                      <h4 className="text-xs font-bold font-mono text-amber-300 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" />
                        Dungeon Master Cobalt Keys ({dmTokensList.length})
                      </h4>
                    </div>

                    <button
                      onClick={() => setShowAddDmForm(!showAddDmForm)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddDmForm ? 'Cancel' : 'Add Another DM Key'}</span>
                    </button>
                  </div>

                  <p className="text-zinc-400 font-sans leading-relaxed">
                    <strong>Automatic Sheet Mutator:</strong> When spells, damage, or healing affect tokens, MistWalker cycles through your authorized DM keys to update players&apos; official D&amp;D Beyond character sheets in real time.
                  </p>

                  {/* List of Configured DM Keys */}
                  {dmTokensList.length > 0 ? (
                    <div className="space-y-2.5">
                      {dmTokensList.map((entry, index) => (
                        <div
                          key={entry.id || index}
                          className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-between gap-3 transition-colors hover:border-amber-500/50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white font-mono text-xs">
                                  {entry.label}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Active ({entry.preview})
                                </span>
                              </div>
                              <span className="text-[11px] text-zinc-500 font-mono">
                                ID: {entry.id}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTestDmTokenById(entry.id, entry.label)}
                              disabled={testingTokenId === entry.id}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1"
                              title="Test connection with D&D Beyond"
                            >
                              {testingTokenId === entry.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                'Test'
                              )}
                            </button>

                            <button
                              onClick={() => handleDeleteDmToken(entry.id, entry.label)}
                              title="Delete this DM key"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-dashed border-zinc-800 text-center space-y-1">
                      <p className="text-zinc-400 font-sans">No DM Cobalt Keys configured yet.</p>
                      <p className="text-[11px] text-zinc-500 font-mono">Add your first DM key below to enable live two-way character sheet updates.</p>
                    </div>
                  )}

                  {/* Add New DM Key Inline Form */}
                  {showAddDmForm && (
                    <div className="p-4 rounded-xl bg-zinc-900 border border-amber-500/60 space-y-3 animate-in fade-in duration-150">
                      <span className="text-xs font-bold font-mono text-amber-300 block">
                        Add New Dungeon Master Key
                      </span>

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="DM Key Label / Nickname (e.g. DM Scott, Co-DM Sarah, Campaign 2)"
                          value={newDmLabel}
                          onChange={(e) => setNewDmLabel(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                        />

                        <div className="relative">
                          <input
                            type={showNewDmToken ? 'text' : 'password'}
                            placeholder="Paste CobaltSession cookie value here..."
                            value={newDmToken}
                            onChange={(e) => setNewDmToken(e.target.value)}
                            className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowNewDmToken(!showNewDmToken)}
                              className="p-1 rounded-md text-zinc-400 hover:text-white"
                              title={showNewDmToken ? 'Hide token' : 'Show token'}
                            >
                              {showNewDmToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePaste(setNewDmToken)}
                              className="p-1 rounded-md text-zinc-400 hover:text-amber-400"
                              title="Paste from clipboard"
                            >
                              <ClipboardPaste className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleTestNewDmToken}
                          disabled={testingTokenId === 'new' || !newDmToken.trim()}
                          className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-mono border border-zinc-700 cursor-pointer"
                        >
                          {testingTokenId === 'new' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Test Token'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveDmToken}
                          disabled={isAddingDmToken || !newDmToken.trim()}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold text-xs rounded-xl font-mono cursor-pointer"
                        >
                          {isAddingDmToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save DM Key'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* SECTION 2: COMPENDIUM COBALT TOKEN                        */}
                {/* ========================================================= */}
                <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 shadow-md space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">
                      Compendium &amp; Content Cobalt Session (Optional Secondary)
                    </h4>

                    <div className="flex items-center gap-2">
                      {status?.cobalt.hasToken ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Active ({status.cobalt.tokenPreview})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono text-zinc-400 bg-zinc-850 border border-zinc-700">
                          Not Set (Uses Primary DM Key)
                        </span>
                      )}

                      {status?.cobalt.hasToken && (
                        <button
                          onClick={() => handleWipeSingle('player_cobalt', 'Compendium Token')}
                          title="Wipe Compendium Token"
                          className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-zinc-400 font-sans leading-relaxed">
                    Used to scrape official monster statblocks, high-res circular tokens, and compendium books from your owned D&amp;D Beyond library if your DM token belongs to a different account.
                  </p>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPlayerToken ? 'text' : 'password'}
                        placeholder={status?.cobalt.hasToken ? 'Enter new CobaltSession to replace...' : 'Paste Compendium CobaltSession cookie value here...'}
                        value={playerTokenInput}
                        onChange={(e) => setPlayerTokenInput(e.target.value)}
                        className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-400 font-mono"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowPlayerToken(!showPlayerToken)}
                          className="p-1 rounded-md text-zinc-400 hover:text-white"
                          title={showPlayerToken ? 'Hide token' : 'Show token'}
                        >
                          {showPlayerToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePaste(setPlayerTokenInput)}
                          className="p-1 rounded-md text-zinc-400 hover:text-sky-400"
                          title="Paste from clipboard"
                        >
                          <ClipboardPaste className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSavePlayerToken}
                      disabled={isSavingPlayerToken || !playerTokenInput.trim()}
                      className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl font-mono border border-zinc-700 transition-all cursor-pointer shrink-0"
                    >
                      {isSavingPlayerToken ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Token'}
                    </button>

                    <button
                      onClick={handleTestPlayerToken}
                      disabled={isTestingPlayerToken || (!status?.cobalt.hasToken && !playerTokenInput.trim())}
                      className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-mono text-xs rounded-xl border border-zinc-700 transition-colors cursor-pointer shrink-0"
                    >
                      {isTestingPlayerToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Test Connection'}
                    </button>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* SECTION 3: CAMPAIGN URL / ID                              */}
                {/* ========================================================= */}
                <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 shadow-md space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">
                      D&amp;D Beyond Campaign URL or ID
                    </h4>
                    {status?.cobalt.campaignId && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Campaign #{status.cobalt.campaignId}
                      </span>
                    )}
                  </div>

                  <p className="text-zinc-400 font-sans leading-relaxed">
                    Paste your campaign URL (e.g. <code>https://www.dndbeyond.com/campaigns/1234567</code>) or raw campaign ID to automatically sync the party roster and connect to live dice rolls.
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Paste campaign URL or ID (e.g. https://www.dndbeyond.com/campaigns/1234567)"
                      value={campaignIdInput}
                      onChange={(e) => setCampaignIdInput(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <button
                      onClick={handleSaveCampaignId}
                      disabled={isSavingCampaignId}
                      className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl font-mono border border-zinc-700 transition-all cursor-pointer shrink-0"
                    >
                      {isSavingCampaignId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Campaign ID'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: AI & SPEECH API KEYS (MULTIPLE GEMINI KEYS)        */}
            {/* ========================================================= */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                {/* 1. Google Gemini API Key Pool */}
                <div className="p-5 rounded-2xl bg-zinc-950/70 border border-sky-500/30 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      <h4 className="text-xs font-bold font-mono text-sky-300 uppercase tracking-wider">
                        Google Gemini API Keys ({status?.gemini.poolCount || 0} in Pool)
                      </h4>
                      {/* Hover Info Tooltip */}
                      <div className="relative group">
                        <Info className="w-3.5 h-3.5 text-zinc-400 hover:text-sky-400 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-300 shadow-2xl z-50 pointer-events-none font-sans leading-relaxed">
                          <strong className="text-white block font-mono mb-1">What this powers:</strong>
                          Powers the AI Dungeon Master, DM Assistant chatbot, procedural room briefing descriptions, NPC dialog, dynamic lighting suggestions, and automated battlemap generation. If multiple keys are configured, MistWalker rotates automatically on quota limits.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status?.gemini.hasKey ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Primary ({status.gemini.maskedKey})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30">
                          Not Configured
                        </span>
                      )}

                      {status?.gemini.hasKey && (
                        <button
                          onClick={() => handleWipeSingle('gemini', 'All Gemini Keys')}
                          title="Wipe All Gemini Keys"
                          className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-zinc-400 font-sans">
                    <p>Required for all AI narrative tools, NPC chatting, and automated map generation.</p>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline inline-flex items-center gap-1 font-mono shrink-0 ml-2"
                    >
                      Get Free Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Primary Key Input */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showGemini ? 'text' : 'password'}
                        placeholder={status?.gemini.hasKey ? 'Enter new primary Gemini key to replace...' : 'AIzaSy... Paste your Google Gemini API key'}
                        value={geminiInput}
                        onChange={(e) => setGeminiInput(e.target.value)}
                        className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-400 font-mono"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowGemini(!showGemini)}
                          className="p-1 rounded-md text-zinc-400 hover:text-white"
                          title={showGemini ? 'Hide key' : 'Show key'}
                        >
                          {showGemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePaste(setGeminiInput)}
                          className="p-1 rounded-md text-zinc-400 hover:text-sky-400"
                          title="Paste from clipboard"
                        >
                          <ClipboardPaste className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveGemini}
                      disabled={isSavingGemini || !geminiInput.trim()}
                      className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl font-mono transition-all cursor-pointer shrink-0"
                    >
                      {isSavingGemini ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Primary'}
                    </button>

                    <button
                      onClick={handleTestGemini}
                      disabled={isTestingGemini || (!status?.gemini.hasKey && !geminiInput.trim())}
                      className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-mono text-xs rounded-xl border border-zinc-700 transition-colors cursor-pointer shrink-0"
                    >
                      {isTestingGemini ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Test Key'}
                    </button>
                  </div>

                  {/* Fallback Gemini Keys Pool */}
                  <div className="pt-2 border-t border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold font-mono text-zinc-400 uppercase tracking-wider">
                        Fallback Keys Pool ({geminiFallbacksList.length})
                      </span>
                      <button
                        onClick={() => setShowFallbackGeminiInput(!showFallbackGeminiInput)}
                        className="text-[11px] text-sky-400 hover:text-sky-300 font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        {showFallbackGeminiInput ? 'Cancel' : 'Add Fallback Key'}
                      </button>
                    </div>

                    {geminiFallbacksList.length > 0 && (
                      <div className="space-y-1.5">
                        {geminiFallbacksList.map((fb, idx) => (
                          <div
                            key={fb.id || idx}
                            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs"
                          >
                            <span className="font-mono text-zinc-300">
                              {fb.label}: {fb.preview}
                            </span>
                            <button
                              onClick={() => handleDeleteFallbackGemini(idx)}
                              className="p-1 text-zinc-400 hover:text-rose-400 cursor-pointer"
                              title="Delete fallback key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {showFallbackGeminiInput && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="password"
                          placeholder="Paste additional fallback Gemini API key..."
                          value={newFallbackGeminiKey}
                          onChange={(e) => setNewFallbackGeminiKey(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 font-mono"
                        />
                        <button
                          onClick={handleAddFallbackGemini}
                          disabled={isAddingFallbackGemini || !newFallbackGeminiKey.trim()}
                          className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl font-mono cursor-pointer"
                        >
                          {isAddingFallbackGemini ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. ElevenLabs API Key */}
                <div className="p-5 rounded-2xl bg-zinc-950/70 border border-purple-500/30 shadow-md space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-purple-400" />
                      <h4 className="text-xs font-bold font-mono text-purple-300 uppercase tracking-wider">
                        ElevenLabs API Key (Cinematic Audio Narration)
                      </h4>
                      {/* Hover Info Tooltip */}
                      <div className="relative group">
                        <Info className="w-3.5 h-3.5 text-zinc-400 hover:text-purple-400 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-300 shadow-2xl z-50 pointer-events-none font-sans leading-relaxed">
                          <strong className="text-white block font-mono mb-1">What this powers:</strong>
                          Generates studio-grade realistic voice acting and ambient narration for room briefing cards, boxed descriptions, and NPC dialogue. Optional.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status?.elevenlabs.hasKey ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Active ({status.elevenlabs.maskedKey})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono text-zinc-500 bg-zinc-850 border border-zinc-700">
                          Optional
                        </span>
                      )}

                      {status?.elevenlabs.hasKey && (
                        <button
                          onClick={() => handleWipeSingle('elevenlabs', 'ElevenLabs Key')}
                          title="Wipe ElevenLabs Key"
                          className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-zinc-400 font-sans">
                    <p>Powers ultra-realistic vocal performances for room descriptions and NPC dialogue.</p>
                    <a
                      href="https://elevenlabs.io"
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:underline inline-flex items-center gap-1 font-mono shrink-0 ml-2"
                    >
                      ElevenLabs Portal <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showEleven ? 'text' : 'password'}
                        placeholder={status?.elevenlabs.hasKey ? 'Enter new ElevenLabs key to replace...' : 'Paste your ElevenLabs API key'}
                        value={elevenInput}
                        onChange={(e) => setElevenInput(e.target.value)}
                        className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 font-mono"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowEleven(!showEleven)}
                          className="p-1 rounded-md text-zinc-400 hover:text-white"
                          title={showEleven ? 'Hide key' : 'Show key'}
                        >
                          {showEleven ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePaste(setElevenInput)}
                          className="p-1 rounded-md text-zinc-400 hover:text-purple-400"
                          title="Paste from clipboard"
                        >
                          <ClipboardPaste className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveEleven}
                      disabled={isSavingEleven || !elevenInput.trim()}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl font-mono transition-all cursor-pointer shrink-0"
                    >
                      {isSavingEleven ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Key'}
                    </button>

                    <button
                      onClick={handleTestEleven}
                      disabled={isTestingEleven || (!status?.elevenlabs.hasKey && !elevenInput.trim())}
                      className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-mono text-xs rounded-xl border border-zinc-700 transition-colors cursor-pointer shrink-0"
                    >
                      {isTestingEleven ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Test Key'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: DANGER ZONE (WIPE)                                 */}
            {/* ========================================================= */}
            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-rose-300 font-mono">
                      Data Wiping &amp; Credentials Privacy
                    </h3>
                    <p className="text-zinc-300 font-sans mt-0.5 leading-relaxed">
                      Use these controls to safely clear sensitive authentication tokens, API keys, and private credentials from server memory, local <code>.env</code> storage, and your browser cache.
                    </p>
                  </div>
                </div>

                {/* Granular Section Wipers */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider">
                    Individual Credential Wipers
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block">All DM Cobalt Keys</span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {dmTokensList.length > 0 ? `${dmTokensList.length} configured` : 'None configured'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleWipeSingle('dm_cobalt', 'All DM Cobalt Keys')}
                        disabled={dmTokensList.length === 0}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-300 disabled:opacity-30 border border-zinc-700 text-xs font-mono font-bold transition-colors cursor-pointer"
                      >
                        Wipe All DM Keys
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block">Compendium Cobalt</span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {status?.cobalt.hasToken ? 'Currently configured' : 'Not set'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleWipeSingle('player_cobalt', 'Compendium Token')}
                        disabled={!status?.cobalt.hasToken}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-300 disabled:opacity-30 border border-zinc-700 text-xs font-mono font-bold transition-colors cursor-pointer"
                      >
                        Wipe
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block">Google Gemini Keys</span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {status?.gemini.hasKey ? `${status.gemini.poolCount} in pool` : 'Not set'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleWipeSingle('gemini', 'Gemini Keys')}
                        disabled={!status?.gemini.hasKey}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-300 disabled:opacity-30 border border-zinc-700 text-xs font-mono font-bold transition-colors cursor-pointer"
                      >
                        Wipe
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block">ElevenLabs Key</span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {status?.elevenlabs.hasKey ? 'Currently active' : 'Not set'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleWipeSingle('elevenlabs', 'ElevenLabs Key')}
                        disabled={!status?.elevenlabs.hasKey}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-300 disabled:opacity-30 border border-zinc-700 text-xs font-mono font-bold transition-colors cursor-pointer"
                      >
                        Wipe
                      </button>
                    </div>
                  </div>
                </div>

                {/* Nuclear Wipe Card */}
                <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/50 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    <h4 className="text-sm font-bold font-mono text-rose-300">
                      Nuclear Option: Wipe All Secrets &amp; Credentials
                    </h4>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    This will permanently remove all CobaltSession tokens, DM keys, Gemini API keys, ElevenLabs keys, and campaign identifiers from your server&apos;s environment file and browser storage.
                  </p>

                  {!showConfirmWipeAll ? (
                    <button
                      onClick={() => setShowConfirmWipeAll(true)}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Wipe All Secrets
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-zinc-950 border border-rose-500/80 space-y-3">
                      <p className="text-xs font-bold text-rose-400 font-mono">
                        ⚠️ Are you absolutely sure? This cannot be undone.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleWipeAll}
                          disabled={isWipingAll}
                          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs transition-colors cursor-pointer flex items-center gap-2"
                        >
                          {isWipingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Wipe Everything'}
                        </button>
                        <button
                          onClick={() => setShowConfirmWipeAll(false)}
                          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-zinc-950/90 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 font-mono">
              MistWalker VTT • Multiple DM Keys &amp; Secrets
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* How to find Cobalt token instructions popup */}
      <CobaltInstructionsModal
        isOpen={showHowToModal}
        onClose={() => setShowHowToModal(false)}
      />
    </>
  );
};
