import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  LogOut,
  Sparkles,
  Shield,
  Check,
  AlertCircle
} from 'lucide-react';
import type { UserAccount } from '../types/auth';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInAsGuest,
  logOut,
  updateDisplayName
} from '../lib/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [tab, setTab] = useState<'login' | 'signup' | 'guest'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [editNameMode, setEditNameMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      setSuccessMsg('Signed in with Google!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (tab === 'login') {
        await signInWithEmail(email, password);
        setSuccessMsg('Welcome back!');
      } else {
        await signUpWithEmail(email, password, displayName);
        setSuccessMsg('Account created successfully!');
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInAsGuest(guestName);
      setSuccessMsg('Playing as Guest!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Could not join as guest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await logOut();
      setSuccessMsg('Logged out.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    setIsLoading(true);
    try {
      await updateDisplayName(newName.trim());
      setEditNameMode(false);
      setSuccessMsg('Name updated!');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                {currentUser && !currentUser.isAnonymous ? 'User Account' : 'MistWalker Account'}
              </h2>
              <p className="text-xs text-zinc-400">Multi-Campaign VTT Cloud Access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {currentUser && !currentUser.isAnonymous ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-amber-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editNameMode ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-amber-500"
                        placeholder="Enter name"
                      />
                      <button
                        onClick={handleUpdateName}
                        className="px-2 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-zinc-100 truncate">{currentUser.displayName}</div>
                      <button
                        onClick={() => {
                          setNewName(currentUser.displayName);
                          setEditNameMode(true);
                        }}
                        className="text-[10px] text-zinc-500 hover:text-amber-400 underline"
                      >
                        edit
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-zinc-400 truncate">{currentUser.email || 'No email associated'}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                      {currentUser.tier === 'pro_dm' ? 'Pro DM Tier' : 'Adventurer Tier'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition"
              >
                <LogOut className="w-4 h-4 text-zinc-400" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            /* Sign in / Sign up form */
            <div className="space-y-4">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-sm font-semibold transition shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-zinc-800 w-full" />
                <span className="bg-zinc-900 px-3 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                  or
                </span>
                <div className="border-t border-zinc-800 w-full" />
              </div>

              {/* Navigation Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className={`py-1.5 rounded-md font-semibold transition ${
                    tab === 'login' ? 'bg-zinc-800 text-amber-400 shadow' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setTab('signup')}
                  className={`py-1.5 rounded-md font-semibold transition ${
                    tab === 'signup' ? 'bg-zinc-800 text-amber-400 shadow' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => setTab('guest')}
                  className={`py-1.5 rounded-md font-semibold transition ${
                    tab === 'guest' ? 'bg-zinc-800 text-amber-400 shadow' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Guest
                </button>
              </div>

              {tab === 'guest' ? (
                <form onSubmit={handleGuestSignIn} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">Your Adventurer Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        placeholder="e.g. Thorin Oakenshield"
                        className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-semibold transition"
                  >
                    <span>Play as Guest</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {tab === 'signup' && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Display Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          placeholder="e.g. Scott the DM"
                          className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="dm@mistwalker.com"
                        className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold transition shadow"
                  >
                    {tab === 'login' ? (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign In</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Account</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
