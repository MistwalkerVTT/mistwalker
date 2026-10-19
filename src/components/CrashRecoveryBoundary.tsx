import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Trash2, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isAutoRecovering: boolean;
  recoveryCount: number;
}

const CRASH_LOG_KEY = 'mistwalker_crash_recovery_log';
const MAX_AUTO_RECOVERIES = 2;
const AUTO_RECOVERY_WINDOW_MS = 15000;

export class CrashRecoveryBoundary extends Component<Props, State> {
  private autoRecoveryTimeout: any = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isAutoRecovering: false,
      recoveryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MistWalker CrashRecovery] Uncaught error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });

    // Track crash frequency in sessionStorage
    const now = Date.now();
    let crashTimestamps: number[] = [];
    try {
      const stored = sessionStorage.getItem(CRASH_LOG_KEY);
      if (stored) {
        crashTimestamps = JSON.parse(stored);
      }
    } catch {
      crashTimestamps = [];
    }

    // Filter to crashes in the recent window
    crashTimestamps = crashTimestamps.filter(t => now - t < AUTO_RECOVERY_WINDOW_MS);
    crashTimestamps.push(now);

    try {
      sessionStorage.setItem(CRASH_LOG_KEY, JSON.stringify(crashTimestamps));
      localStorage.setItem('mistwalker_crash_detected', 'true');
    } catch {
      // ignore
    }

    const recentCrashCount = crashTimestamps.length;
    this.setState({ recoveryCount: recentCrashCount });

    // If this is an isolated crash (not an infinite loop), attempt automatic self-healing remount
    if (recentCrashCount <= MAX_AUTO_RECOVERIES) {
      console.log(`[MistWalker CrashRecovery] Attempting automatic self-healing remount (${recentCrashCount}/${MAX_AUTO_RECOVERIES})...`);
      this.setState({ isAutoRecovering: true });

      this.autoRecoveryTimeout = setTimeout(() => {
        this.handleAttemptRecovery();
      }, 750);
    }
  }

  componentWillUnmount() {
    if (this.autoRecoveryTimeout) {
      clearTimeout(this.autoRecoveryTimeout);
    }
  }

  handleAttemptRecovery = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isAutoRecovering: false
    });
  };

  handleReloadWithState = () => {
    try {
      localStorage.setItem('mistwalker_crash_detected', 'true');
    } catch {}
    window.location.reload();
  };

  handleResetAndRestart = () => {
    try {
      localStorage.removeItem('mistwalker_dm_state_backup_v1');
      localStorage.removeItem('mistwalker_player_state_backup_v1');
      localStorage.removeItem('mistwalker_explored_polygons_backup_v1');
      localStorage.removeItem('mistwalker_crash_detected');
      sessionStorage.removeItem(CRASH_LOG_KEY);
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isAutoRecovering) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-6 select-none font-mono">
            <div className="flex flex-col items-center gap-4 max-w-md text-center p-8 bg-zinc-900/90 border border-amber-500/30 rounded-2xl shadow-2xl backdrop-blur-md">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <RotateCcw className="w-5 h-5 text-amber-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-amber-300">Recovering Session State...</h2>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                MistWalker encountered an unexpected interruption. Restoring your battlemap, tokens, and active session from backup...
              </p>
            </div>
          </div>
        );
      }

      const errorMessage = this.state.error?.message || 'An unexpected runtime error occurred.';
      const componentStack = this.state.errorInfo?.componentStack;

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-6 select-none font-sans">
          <div className="w-full max-w-xl bg-zinc-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl shadow-rose-950/20 backdrop-blur-md space-y-5">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-mono tracking-tight">
                  {this.props.fallbackTitle || 'MistWalker Crash Recovery'}
                </h2>
                <p className="text-xs text-zinc-400">
                  Your battlemap, tokens, and combat state are securely preserved in local backup.
                </p>
              </div>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Interruption Details:</span>
              </div>
              <div className="text-xs text-zinc-300 font-mono bg-black/40 p-2.5 rounded-lg overflow-x-auto max-h-28 whitespace-pre-wrap break-all">
                {errorMessage}
              </div>
              {componentStack && (
                <details className="text-[11px] text-zinc-400 font-mono">
                  <summary className="cursor-pointer hover:text-zinc-300 transition-colors py-1">
                    View Component Stack
                  </summary>
                  <pre className="p-2 bg-black/60 rounded text-[10px] text-zinc-400 overflow-x-auto max-h-36 whitespace-pre">
                    {componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={this.handleAttemptRecovery}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold font-mono transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Recovering Now</span>
                </button>
                <button
                  type="button"
                  onClick={this.handleReloadWithState}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold font-mono border border-zinc-700 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>Return to Home Screen</span>
                </button>
              </div>

              <button
                type="button"
                onClick={this.handleResetAndRestart}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border border-rose-900/30 text-xs font-mono transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Corrupted Cache & Start Fresh</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
