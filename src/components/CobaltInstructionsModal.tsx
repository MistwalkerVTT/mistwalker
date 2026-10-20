import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  ShieldAlert,
  Info,
  Cookie
} from 'lucide-react';
import { toast } from 'sonner';

interface CobaltInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CobaltInstructionsModal: React.FC<CobaltInstructionsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'chrome' | 'firefox'>('quick');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!isOpen) return null;

  const consoleSnippet = `copy(document.cookie.match(/CobaltSession=([^;]+)/)?.[1] || '');`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(consoleSnippet);
    setCopiedSnippet(true);
    toast.success('Console script copied to clipboard!');
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                How to Find Your D&D Beyond Cobalt Token
              </h2>
              <p className="text-xs text-zinc-400">
                Step-by-step instructions to extract your secure session cookie
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-zinc-800/80 bg-zinc-950/40">
          <button
            onClick={() => setActiveTab('quick')}
            className={`px-3.5 py-2 text-xs font-mono font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quick'
                ? 'border-amber-400 text-amber-300 bg-zinc-850/80'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            Instant Console Method (Fastest)
          </button>
          <button
            onClick={() => setActiveTab('chrome')}
            className={`px-3.5 py-2 text-xs font-mono font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'chrome'
                ? 'border-sky-400 text-sky-300 bg-zinc-850/80'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Chrome / Edge / Brave
          </button>
          <button
            onClick={() => setActiveTab('firefox')}
            className={`px-3.5 py-2 text-xs font-mono font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'firefox'
                ? 'border-amber-400 text-amber-300 bg-zinc-850/80'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Firefox
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-zinc-300 sidebar-scrollbar">
          {/* TAB 1: QUICK CONSOLE SNIPPET */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                  The easiest and fastest method. You don&apos;t have to hunt through long cookie lists — running this single line directly copies your token to your clipboard.
                </p>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-amber-400 font-mono font-bold text-[11px] shrink-0">
                    1
                  </span>
                  <div>
                    <span className="font-semibold text-white">Log in to D&D Beyond:</span>
                    <p className="text-zinc-400 mt-0.5">
                      Open{' '}
                      <a
                        href="https://www.dndbeyond.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline inline-flex items-center gap-1 font-mono"
                      >
                        dndbeyond.com <ExternalLink className="w-3 h-3 inline" />
                      </a>{' '}
                      in a new browser tab and make sure you are logged in.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-amber-400 font-mono font-bold text-[11px] shrink-0">
                    2
                  </span>
                  <div>
                    <span className="font-semibold text-white">Open Developer Console:</span>
                    <p className="text-zinc-400 mt-0.5">
                      Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 font-mono text-[11px]">F12</kbd> (or <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 font-mono text-[11px]">Ctrl+Shift+J</kbd> / <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 font-mono text-[11px]">Cmd+Option+J</kbd> on Mac), and click the <strong className="text-zinc-200">Console</strong> tab.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-amber-400 font-mono font-bold text-[11px] shrink-0">
                    3
                  </span>
                  <div className="flex-1">
                    <span className="font-semibold text-white">Copy & Paste This Script:</span>
                    <div className="mt-2 relative p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs flex items-center justify-between gap-3">
                      <code className="text-emerald-400 select-all overflow-x-auto">
                        {consoleSnippet}
                      </code>
                      <button
                        onClick={handleCopySnippet}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                      >
                        {copiedSnippet ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-amber-400 font-mono font-bold text-[11px] shrink-0">
                    4
                  </span>
                  <div>
                    <span className="font-semibold text-white">Paste into MistWalker:</span>
                    <p className="text-zinc-400 mt-0.5">
                      Hit <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 font-mono text-[11px]">Enter</kbd> in your console. Your full CobaltSession is now in your clipboard! Come back to MistWalker and paste it into the token field.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHROME / EDGE / BRAVE DEVTOOLS */}
          {activeTab === 'chrome' && (
            <div className="space-y-4 font-sans text-xs">
              <p className="text-zinc-400">
                Follow these manual steps to locate your cookie in Chrome, Edge, Brave, or Opera:
              </p>

              <ol className="space-y-3 list-decimal list-inside text-zinc-300">
                <li className="leading-relaxed">
                  Go to <a href="https://www.dndbeyond.com" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">dndbeyond.com</a> and sign in.
                </li>
                <li className="leading-relaxed">
                  Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 font-mono text-[11px]">F12</kbd> (or right click the page and click <strong>Inspect</strong>).
                </li>
                <li className="leading-relaxed">
                  Look at the top tabs in Developer Tools and click <strong className="text-white">Application</strong>.
                  <span className="block text-zinc-400 mt-0.5 pl-4">
                    (If you don&apos;t see Application, click the double arrow <code>&gt;&gt;</code> icon on the far right of the tab bar).
                  </span>
                </li>
                <li className="leading-relaxed">
                  In the left sidebar menu, look under <strong className="text-white">Storage</strong> and click <strong className="text-white">Cookies</strong> to expand it.
                </li>
                <li className="leading-relaxed">
                  Select <code className="text-sky-400 font-mono">https://www.dndbeyond.com</code>.
                </li>
                <li className="leading-relaxed">
                  In the filter box at the top, type <code className="text-amber-400 font-mono">CobaltSession</code>.
                </li>
                <li className="leading-relaxed">
                  Double-click the long text string under the <strong className="text-white">Value</strong> column, copy it, and paste it into MistWalker.
                </li>
              </ol>
            </div>
          )}

          {/* TAB 3: FIREFOX DEVTOOLS */}
          {activeTab === 'firefox' && (
            <div className="space-y-4 font-sans text-xs">
              <p className="text-zinc-400">
                Follow these manual steps to locate your cookie in Mozilla Firefox:
              </p>

              <ol className="space-y-3 list-decimal list-inside text-zinc-300">
                <li className="leading-relaxed">
                  Go to <a href="https://www.dndbeyond.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">dndbeyond.com</a> and sign in.
                </li>
                <li className="leading-relaxed">
                  Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 font-mono text-[11px]">F12</kbd> (or right-click the page and choose <strong>Inspect</strong>).
                </li>
                <li className="leading-relaxed">
                  Click the <strong className="text-white">Storage</strong> tab in the Developer Tools bar.
                </li>
                <li className="leading-relaxed">
                  In the left tree, expand <strong className="text-white">Cookies</strong> and click <code className="text-amber-400 font-mono">https://www.dndbeyond.com</code>.
                </li>
                <li className="leading-relaxed">
                  Find the cookie named <code className="text-amber-400 font-mono">CobaltSession</code> in the list.
                </li>
                <li className="leading-relaxed">
                  Double-click the <strong className="text-white">Value</strong> column, copy the string, and paste it into MistWalker.
                </li>
              </ol>
            </div>
          )}

          {/* Privacy & Expiration Notice */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 font-sans text-xs">
              <span className="font-bold text-white">Privacy & Token Expiration</span>
              <p className="text-zinc-400 leading-relaxed">
                Your Cobalt token is kept strictly inside your local MistWalker instance to communicate with D&D Beyond on your behalf. D&D Beyond tokens normally remain active for 30–90 days. If character sheet sync stops updating, simply repeat this 10-second process to refresh your token.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-950/90 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">
            MistWalker D&D Beyond Bridge
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
