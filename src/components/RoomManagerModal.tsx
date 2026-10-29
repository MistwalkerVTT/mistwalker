import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Copy,
  Check,
  Lock,
  Unlock,
  Users,
  ArrowRight,
  Shield,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { getActiveSessionId, getDmViewUrl, getJoinUrl } from '../lib/sessionUrl';
import { formatRoomCode } from '../lib/campaignInvite';

interface RoomManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  socketRef?: React.MutableRefObject<any>;
}

export const RoomManagerModal: React.FC<RoomManagerModalProps> = ({
  isOpen,
  onClose,
  socketRef
}) => {
  const currentSession = getActiveSessionId();
  const [roomCode, setRoomCode] = useState<string>(currentSession);
  const [isLocked, setIsLocked] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [targetRoomInput, setTargetRoomInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRoomDetails();
    }
  }, [isOpen, currentSession]);

  if (!isOpen) return null;

  const fetchRoomDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(currentSession)}`);
      if (res.ok) {
        const data = await res.json();
        setRoomCode(data.roomCode || currentSession);
        setIsLocked(!!data.isLocked);
        if (data.users) setConnectedUsers(data.users);
      }
    } catch (err) {
      console.warn('Failed to fetch room details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    const code = roomCode || currentSession;
    const url = getJoinUrl(code);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      toast.success('Player invite link copied to clipboard!', { description: url });
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleToggleLock = () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    if (socketRef?.current?.connected) {
      socketRef.current.emit('TOGGLE_ROOM_LOCK', { locked: nextLocked });
    }
    fetch(`/api/rooms/${encodeURIComponent(currentSession)}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked: nextLocked })
    }).catch(console.warn);

    toast.info(nextLocked ? 'Room table locked. New players cannot join.' : 'Room table unlocked.');
  };

  const handleSwitchRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = targetRoomInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!clean && targetRoomInput.trim() !== '') return;
    const target = clean || 'default';
    window.location.href = getDmViewUrl(target);
  };

  const displayCode = roomCode ? formatRoomCode(roomCode) : currentSession.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Live Session Room</h2>
              <p className="text-xs text-zinc-400">Multi-DM Isolated Table Controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Room Code Card */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                6-Character Room Code
              </span>
              <button
                onClick={fetchRoomDetails}
                disabled={isLoading}
                className="text-zinc-500 hover:text-zinc-300 transition"
                title="Refresh room status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="font-mono text-2xl font-black tracking-widest text-zinc-100">
                {displayCode}
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Invite Link'}</span>
              </button>
            </div>
            <div className="text-[11px] text-zinc-500">
              Session Identifier: <span className="font-mono text-zinc-400">{currentSession}</span>
            </div>
          </div>

          {/* Table Lock Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              {isLocked ? <Lock className="w-4 h-4 text-red-400" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
              <div>
                <div className="text-xs font-bold text-zinc-200">Table Admission Lock</div>
                <div className="text-[10px] text-zinc-500">
                  {isLocked ? 'Room is locked to new players' : 'Anyone with the room code can join'}
                </div>
              </div>
            </div>
            <button
              onClick={handleToggleLock}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                isLocked
                  ? 'bg-red-950/50 text-red-300 border border-red-800/80 hover:bg-red-900/60'
                  : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900/60'
              }`}
            >
              {isLocked ? 'Locked' : 'Open'}
            </button>
          </div>

          {/* Connected Roster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Connected Members ({connectedUsers.length})</span>
              </span>
            </div>

            {connectedUsers.length === 0 ? (
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-500 text-center italic">
                Only you are currently in this room.
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {connectedUsers.map((u, i) => (
                  <div
                    key={u.socketId || i}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs"
                  >
                    <span className="font-semibold text-zinc-200 truncate">{u.displayName}</span>
                    <span className="text-[10px] text-zinc-500 uppercase font-mono">{u.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Switch Room Form */}
          <form onSubmit={handleSwitchRoom} className="space-y-2 pt-2 border-t border-zinc-800">
            <label className="block text-xs font-semibold text-zinc-400">
              Switch or Create Another Room:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={targetRoomInput}
                onChange={e => setTargetRoomInput(e.target.value)}
                placeholder="e.g. golden_vault or main"
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition flex items-center gap-1"
              >
                <span>Switch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
