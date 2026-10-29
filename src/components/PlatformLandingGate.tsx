import React, { useState } from 'react';
import {
  Shield,
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  LogIn,
  UserPlus,
  Compass,
  Radio,
  Swords,
  Layers,
  BookOpen,
  Dice5,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInAsGuest
} from '../lib/authService';
import { formatRoomCode } from '../lib/campaignInvite';

interface PlatformLandingGateProps {
  onJoinWithCode: (code: string) => void;
  onAuthenticated: () => void;
}

export const PlatformLandingGate: React.FC<PlatformLandingGateProps> = ({
  onJoinWithCode,
  onAuthenticated
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      setSuccessMsg('Signed in with Google!');
      setTimeout(onAuthenticated, 400);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Google sign-in was interrupted. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (authMode === 'login') {
        await signInWithEmail(email, password);
        setSuccessMsg('Welcome back to MistWalker!');
      } else {
        await signUpWithEmail(email, password, displayName || 'Dungeon Master');
        setSuccessMsg('Account created successfully!');
      }
      setTimeout(onAuthenticated, 400);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return;

    if (guestName.trim()) {
      signInAsGuest(guestName.trim()).catch(console.warn);
    }
    onJoinWithCode(clean);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950 text-zinc-100 overflow-y-auto selection:bg-purple-500/30">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(88,28,135,0.15),transparent_50%)]" />

      <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 rounded-3xl border border-zinc-800 bg-zinc-900/90 shadow-2xl backdrop-blur-xl overflow-hidden my-auto">
        
        {/* Left Hero Brand Panel */}
        <div className="md:col-span-5 p-8 md:p-10 bg-gradient-to-br from-purple-950/60 via-zinc-900 to-zinc-950 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  MistWalker
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Enterprise
                  </span>
                </h1>
                <p className="text-xs text-zinc-400">Commercial Multi-Tenant Virtual Tabletop</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed mb-6">
              Next-generation 5e tabletop with dynamic raytraced fog of war, animated JB2A spell effects, 3D physics dice, and seamless multi-DM campaign isolation.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                <div className="w-5 h-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Strict Room & Campaign Isolation</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                <div className="w-5 h-5 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Zero-Cookie Public DDB Character Sync</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                <div className="w-5 h-5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Full Open5e SRD & Spell Bestiary</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-800/80 mt-8 text-[11px] text-zinc-500 flex items-center justify-between">
            <span>Enterprise Beta v3.0</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Multi-DM Cloud
            </span>
          </div>
        </div>

        {/* Right Authentication & Join Form */}
        <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-between">
          <div>
            {/* Header / Tabs */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {authMode === 'login' ? 'Dungeon Master Sign In' : 'Create DM Account'}
                </h2>
                <p className="text-xs text-zinc-400">Sign in to manage your campaigns, maps, and tables</p>
              </div>
              <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setErrorMsg(null); }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    authMode === 'login' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setErrorMsg(null); }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    authMode === 'signup' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {/* Error & Success Feedback */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1-Click Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-semibold transition cursor-pointer shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-mono">
                <span className="bg-zinc-900 px-2 text-zinc-500">or with email</span>
              </div>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      placeholder="DM Alexander"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="dm@campaign.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-lg shadow-purple-600/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authMode === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>{authMode === 'login' ? 'Sign In to DM Dashboard' : 'Create DM Account'}</span>
              </button>
            </form>
          </div>

          {/* Player Quick Join Divider & Box */}
          <div className="pt-6 border-t border-zinc-800/80 mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-purple-400" />
                Player 1-Click Game Pass
              </span>
              <span className="text-[10px] font-mono text-zinc-500">No registration needed</span>
            </div>
            <form onSubmit={handleJoinByCode} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                placeholder="Your Name (e.g. Sarah)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="sm:col-span-5 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                maxLength={8}
                placeholder="ROOM CODE"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                className="sm:col-span-4 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-center font-mono font-bold tracking-wider text-purple-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={!roomCodeInput.trim()}
                className="sm:col-span-3 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Join</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
