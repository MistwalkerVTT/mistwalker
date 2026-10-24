import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioNarration } from '../services/audioNarrationService';

const LOGO_URL = 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/blob-c3567a0.png/:/rs=w:1440,h:1440';

interface IntroScreenProps {
  onSelectDm: () => void;
  onSelectPlayer: () => void;
  /** Called after the overlay has fully faded out following the selection (safe to unmount). */
  onFinished?: () => void;
}

/** Procedural ambient audio (no asset files): low drone + shimmer, and a swell on selection. */
function createAmbience() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    const ctx: AudioContext = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const mk = (freq: number, type: OscillatorType, gain: number, detune = 0) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      g.gain.value = gain;
      o.connect(g).connect(master);
      o.start();
      return o;
    };
    mk(55, 'sawtooth', 0.05);
    mk(55.4, 'sawtooth', 0.04, 6);
    mk(82.4, 'triangle', 0.05);
    mk(110, 'sine', 0.04);
    const shimmer = mk(659.25, 'sine', 0.006);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 14;
    lfo.connect(lfoGain).connect(shimmer.frequency);
    lfo.start();

    master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 3);

    return {
      swell() {
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(1.0, t + 0.5);
        master.gain.linearRampToValueAtTime(0, t + 1.6);
      },
      setMuted(m: boolean) {
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(m ? 0 : 0.55, t + 0.4);
      },
      close() {
        try { ctx.close(); } catch { /* ignore */ }
      }
    };
  } catch {
    return null;
  }
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onSelectDm, onSelectPlayer, onFinished }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<ReturnType<typeof createAmbience>>(null);
  const [stage, setStage] = useState(0); // 0 black, 1 logo, 2 title, 3 tagline, 4 choices
  const [leaving, setLeaving] = useState<null | 'dm' | 'player'>(null);
  const [fadingOut, setFadingOut] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioOn, setAudioOn] = useState(false);

  // Cinematic sequence timing
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 400),
      setTimeout(() => setStage(2), 1500),
      setTimeout(() => setStage(3), 2900),
      setTimeout(() => setStage(4), 3900)
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Skip to choices on any key / click before they appear
  const skipToChoices = useCallback(() => {
    setStage((s) => (s < 4 ? 4 : s));
  }, []);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = createAmbience();
      if (audioRef.current) setAudioOn(true);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      ensureAudio();
      if (stage < 4) skipToChoices();
      else if (!leaving) {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'd') choose('dm');
        if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'p') choose('player');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, leaving]);

  useEffect(() => () => audioRef.current?.close(), []);

  const choose = (mode: 'dm' | 'player') => {
    if (leaving) return;
    ensureAudio();
    // Fade out the drone; the custom transition sound takes over
    audioRef.current?.setMuted(true);
    setLeaving(mode);

    // 1) Transition sound (user's ElevenLabs favorite) starts immediately
    const sfx = new Audio('/audio/transition.mp3');
    sfx.volume = 1;
    sfx.play().catch(() => undefined);

    // 2) Greeting voice starts ~2s into the transition sound
    //    DM = Big Bad Boss voice, Player = Wizard voice
    const greeting = mode === 'dm'
      ? { text: 'Welcome Dungeon Master', voiceId: 'big_bad_boss' }
      : { text: 'Welcome Adventurer', voiceId: 'wizard' };
    const gate = new Promise<void>((resolve) => setTimeout(resolve, 2000));

    // 3) The instant the voice starts, load the next screen underneath and fade this overlay away,
    //    so the next menu is already showing by the time the greeting finishes.
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      // Duck the transition sound under the voice
      try { sfx.volume = 0.4; } catch { /* ignore */ }
      if (mode === 'dm') onSelectDm();
      else onSelectPlayer();
      setFadingOut(true);
      // Fade sfx tail out while the overlay dissolves
      const fade = setInterval(() => {
        try {
          sfx.volume = Math.max(0, sfx.volume - 0.04);
          if (sfx.volume <= 0) {
            sfx.pause();
            clearInterval(fade);
          }
        } catch {
          clearInterval(fade);
        }
      }, 100);
      setTimeout(() => onFinished?.(), 2200);
    };

    audioNarration
      .play({ ...greeting, waitUntil: gate, onStart: reveal, onError: reveal })
      .catch(reveal);
    setTimeout(reveal, 6500); // safety net if the voice never starts
  };



  // Living background: drifting mist + rising embers + faint rune sparks + ominous vortex on transition
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const mist = Array.from({ length: 18 }, () => ({
      x: Math.random() * 1.4 - 0.2,
      y: 0.35 + Math.random() * 0.65,
      r: 220 + Math.random() * 360,
      vx: (Math.random() - 0.5) * 0.00012 + 0.00005,
      a: 0.04 + Math.random() * 0.07,
      hue: Math.random() < 0.5 ? 205 : 38,
      angle: Math.random() * Math.PI * 2
    }));
    const embers = Array.from({ length: 110 }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: 0.6 + Math.random() * 2,
      vy: 0.00012 + Math.random() * 0.0004,
      sway: Math.random() * Math.PI * 2,
      a: 0.3 + Math.random() * 0.7,
      angle: Math.random() * Math.PI * 2,
      radius: 0.1 + Math.random() * 0.7
    }));

    let vortexSpin = 0;
    let t0 = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - t0, 50);
      t0 = now;
      ctx.clearRect(0, 0, w, h);

      const isLeaving = leavingRef.current;
      const isFading = fadingOutRef.current;
      if (isLeaving) {
        vortexSpin += dt * (isFading ? 0.0038 : 0.0022);
      }

      const cx = w * 0.5;
      const cy = h * 0.5;

      for (const m of mist) {
        if (isLeaving) {
          m.angle += dt * 0.0014;
          const dx = m.x * w - cx;
          const dy = m.y * h - cy;
          const dist = Math.hypot(dx, dy);
          const pull = isFading ? 1.008 : 0.992;
          const ang = Math.atan2(dy, dx) + dt * 0.0018;
          m.x = (cx + Math.cos(ang) * dist * pull) / w;
          m.y = (cy + Math.sin(ang) * dist * pull) / h;
        } else {
          m.x += m.vx * dt;
          if (m.x > 1.3) m.x = -0.3;
        }
        const g = ctx.createRadialGradient(m.x * w, m.y * h, 0, m.x * w, m.y * h, m.r);
        const hue = isLeaving
          ? (isLeaving === 'dm' ? 275 : 225)
          : m.hue;
        const alpha = isLeaving ? Math.min(0.22, m.a * 2.2) : m.a;
        g.addColorStop(0, `hsla(${hue}, 48%, ${isLeaving ? 16 : 70}%, ${alpha})`);
        g.addColorStop(1, 'hsla(240, 40%, 6%, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(m.x * w - m.r, m.y * h - m.r, m.r * 2, m.r * 2);
      }

      ctx.globalCompositeOperation = 'lighter';
      for (const e of embers) {
        let px: number;
        let py: number;
        if (isLeaving) {
          e.angle += dt * (0.0025 + (1 - e.radius) * 0.004);
          e.radius = isFading
            ? Math.min(1.2, e.radius + dt * 0.00045)
            : Math.max(0.02, e.radius * (1 - dt * 0.0009));
          const maxDim = Math.max(w, h) * 0.65;
          px = cx + Math.cos(e.angle + vortexSpin) * (e.radius * maxDim);
          py = cy + Math.sin(e.angle + vortexSpin) * (e.radius * maxDim);
        } else {
          e.y -= e.vy * dt;
          e.sway += 0.0015 * dt;
          if (e.y < -0.05) {
            e.y = 1.05;
            e.x = Math.random();
          }
          px = (e.x + Math.sin(e.sway) * 0.012) * w;
          py = e.y * h;
          e.angle = Math.atan2(py - cy, px - cx);
          e.radius = Math.hypot(px - cx, py - cy) / (Math.max(w, h) * 0.65);
        }

        const flick = 0.6 + Math.sin(now * 0.004 + e.sway * 5) * 0.4;
        const rad = e.s * (isLeaving ? 5.2 : 4);
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        if (isLeaving === 'player') {
          g.addColorStop(0, `rgba(125, 211, 252, ${e.a * flick})`);
          g.addColorStop(1, 'rgba(79, 70, 229, 0)');
        } else if (isLeaving === 'dm') {
          g.addColorStop(0, `rgba(217, 119, 6, ${e.a * flick})`);
          g.addColorStop(1, 'rgba(147, 51, 234, 0)');
        } else {
          g.addColorStop(0, `rgba(255, 190, 80, ${e.a * flick})`);
          g.addColorStop(1, 'rgba(255, 120, 20, 0)');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const title = 'MISTWALKER';
  const leavingRef = useRef<null | 'dm' | 'player'>(null);
  const fadingOutRef = useRef<boolean>(false);
  leavingRef.current = leaving;
  fadingOutRef.current = fadingOut;

  return (
    <div
      id="mistwalker-intro-screen"
      onClick={() => {
        ensureAudio();
        skipToChoices();
      }}
      className="fixed inset-0 z-[9999] overflow-hidden bg-black text-zinc-100 select-none"
      style={{
        fontFamily: "'Cinzel', 'Trajan Pro', 'Georgia', serif",
        opacity: fadingOut ? 0 : 1,
        transform: fadingOut ? 'scale(1.28) rotate(8deg)' : 'scale(1) rotate(0deg)',
        filter: fadingOut ? 'blur(18px)' : 'blur(0px)',
        transition: 'opacity 1.9s cubic-bezier(0.22, 1, 0.36, 1), transform 2.1s cubic-bezier(0.4, 0, 0.2, 1), filter 1.9s ease-in-out',
        pointerEvents: fadingOut ? 'none' : 'auto'
      }}
    >
      <style>{`
        @keyframes mw-slowzoom { from { transform: scale(1.06); } to { transform: scale(1.22); } }
        @keyframes mw-rune-spin { to { transform: rotate(360deg); } }
        @keyframes mw-rune-spin-rev { to { transform: rotate(-360deg); } }
        @keyframes mw-letter { 0% { opacity: 0; transform: translate3d(0, 28px, 0) scale(1.15); filter: blur(12px); } 60% { opacity: 1; } 100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); } }
        @keyframes mw-fade-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        @keyframes mw-sweep { 0% { transform: translateX(-120%) skewX(-20deg); } 100% { transform: translateX(260%) skewX(-20deg); } }
        @keyframes mw-glow { 0%,100% { filter: drop-shadow(0 0 18px rgba(245,158,11,0.55)); } 50% { filter: drop-shadow(0 0 46px rgba(251,191,36,0.95)); } }
        @keyframes mw-bars { from { transform: scaleY(1); } to { transform: scaleY(0); } }
        @keyframes mw-vortex-in {
          0% { opacity: 0; transform: scale(1.55) rotate(0deg); }
          35% { opacity: 1; }
          100% { opacity: 1; transform: scale(0.92) rotate(220deg); }
        }
        @keyframes mw-vortex-counter {
          0% { opacity: 0; transform: scale(1.3) rotate(0deg); }
          40% { opacity: 0.95; }
          100% { opacity: 1; transform: scale(0.78) rotate(-260deg); }
        }
        @keyframes mw-abyss-implode {
          0% { opacity: 0; transform: scale(0.2); }
          45% { opacity: 0.95; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1.65); }
        }
        @keyframes mw-ui-sink {
          0% { opacity: 1; transform: scale(1) rotate(0deg); filter: blur(0px); }
          100% { opacity: 0; transform: scale(0.55) rotate(-14deg); filter: blur(16px); }
        }
        .mw-card { transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s, border-color .35s; }
        .mw-card:hover { transform: translateY(-8px) scale(1.035); }
        .mw-card:hover .mw-sweep { animation: mw-sweep 1.1s ease-in-out; }
      `}</style>

      {/* Backdrop art: slow-push dungeon-sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          animation: 'mw-slowzoom 24s ease-out forwards',
          background:
            'radial-gradient(ellipse at 50% 38%, rgba(120,70,20,0.55) 0%, rgba(40,25,15,0.65) 28%, rgba(8,10,18,0.96) 70%), ' +
            'radial-gradient(ellipse at 15% 100%, rgba(30,58,138,0.35), transparent 55%), ' +
            'radial-gradient(ellipse at 90% 90%, rgba(120,53,15,0.35), transparent 50%), #05060a'
        }}
      />

      {/* Distant torch glow behind title */}
      <div
        className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          width: 'min(90vw, 900px)',
          height: 'min(70vw, 620px)',
          background: 'radial-gradient(ellipse, rgba(251,191,36,0.22) 0%, rgba(245,158,11,0.08) 40%, transparent 70%)',
          opacity: stage >= 1 ? 1 : 0,
          transition: 'opacity 2.5s ease'
        }}
      />

      {/* Rotating arcane rings */}
      <div
        className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ opacity: stage >= 1 ? 0.55 : 0, transition: 'opacity 3s ease' }}
      >
        <svg width="760" height="760" viewBox="0 0 760 760" style={{ maxWidth: '110vw', maxHeight: '75vh', animation: 'mw-rune-spin 90s linear infinite' }}>
          <circle cx="380" cy="380" r="360" fill="none" stroke="rgba(251,191,36,0.35)" strokeWidth="1.2" strokeDasharray="3 9" />
          <circle cx="380" cy="380" r="330" fill="none" stroke="rgba(251,191,36,0.18)" strokeWidth="1" />
          {Array.from({ length: 36 }).map((_, i) => (
            <line
              key={i}
              x1="380" y1="20" x2="380" y2={i % 3 === 0 ? 44 : 32}
              stroke="rgba(251,191,36,0.5)" strokeWidth={i % 3 === 0 ? 2 : 1}
              transform={`rotate(${i * 10} 380 380)`}
            />
          ))}
        </svg>
        <svg
          width="560" height="560" viewBox="0 0 560 560"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ maxWidth: '85vw', maxHeight: '58vh', animation: 'mw-rune-spin-rev 60s linear infinite' }}
        >
          <circle cx="280" cy="280" r="260" fill="none" stroke="rgba(147,197,253,0.28)" strokeWidth="1.2" />
          <polygon points="280,30 497,405 63,405" fill="none" stroke="rgba(251,191,36,0.22)" strokeWidth="1" />
          <polygon points="280,530 63,155 497,155" fill="none" stroke="rgba(251,191,36,0.22)" strokeWidth="1" />
        </svg>
      </div>

      {/* Particles: mist + embers */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Cinematic vignette & film grain */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.88) 100%)' }} />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")"
        }}
      />

      {/* Letterbox bars that open at start */}
      <div className="absolute top-0 inset-x-0 h-[14vh] bg-black origin-top pointer-events-none" style={{ animation: 'mw-bars 2.2s 0.6s ease-in-out forwards', transform: 'scaleY(1)' }} />
      <div className="absolute bottom-0 inset-x-0 h-[14vh] bg-black origin-bottom pointer-events-none" style={{ animation: 'mw-bars 2.2s 0.6s ease-in-out forwards', transform: 'scaleY(1)' }} />

      {/* Title block */}
      <div
        className="relative z-10 h-full w-full flex flex-col items-center justify-start pt-[9vh] px-4"
        style={{
          animation: leaving ? 'mw-ui-sink 1.85s cubic-bezier(0.55, 0.05, 0.67, 0.19) forwards' : undefined
        }}
      >
        <img
          src={LOGO_URL}
          alt="MistWalker"
          referrerPolicy="no-referrer"
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
          style={{
            opacity: stage >= 1 ? 1 : 0,
            transform: stage >= 1 ? 'scale(1)' : 'scale(0.6)',
            transition: 'opacity 1.4s ease, transform 1.8s cubic-bezier(.2,.8,.2,1)',
            animation: stage >= 1 ? 'mw-glow 4s ease-in-out infinite' : undefined
          }}
        />

        <h1
          className="mt-5 flex font-black text-center"
          style={{
            fontSize: 'clamp(2.4rem, 9vw, 7.5rem)',
            lineHeight: 1,
            letterSpacing: '0.18em',
            // Compensate trailing letter-spacing so the word stays optically centered
            paddingLeft: '0.18em'
          }}
        >
          {title.split('').map((ch, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                opacity: 0,
                willChange: 'transform, opacity, filter',
                backfaceVisibility: 'hidden',
                background: 'linear-gradient(180deg, #fff7d6 0%, #fbbf24 45%, #b45309 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                animation: stage >= 2 ? `mw-letter 1.2s ${i * 0.1}s cubic-bezier(.22,.8,.24,1) both` : undefined
              }}
            >
              {ch}
            </span>
          ))}
        </h1>

        <div
          className="mt-3 flex items-center gap-4"
          style={{ opacity: stage >= 3 ? 1 : 0, transition: 'opacity 1.6s ease' }}
        >
          <span className="h-px w-12 sm:w-28 bg-gradient-to-r from-transparent to-amber-400/70" />
          <p className="text-[10px] sm:text-sm tracking-[0.5em] uppercase text-amber-200/80">
            Step Beyond the Veil
          </p>
          <span className="h-px w-12 sm:w-28 bg-gradient-to-l from-transparent to-amber-400/70" />
        </div>

        {/* Mode selection */}
        <div
          className="mt-[7vh] w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8"
          style={{ pointerEvents: stage >= 4 && !leaving ? 'auto' : 'none' }}
        >
          {([
            {
              id: 'dm' as const,
              name: 'Dungeon Master',
              sub: 'DM MODE',
              blurb: 'Command the battlemap, the fog, the monsters and the story.',
              key: 'D',
              accent: '245,158,11',
              icon: (
                <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M32 6l20 8v16c0 14-9 24-20 28C21 54 12 44 12 30V14z" />
                  <circle cx="32" cy="30" r="8" />
                  <circle cx="32" cy="30" r="2.5" fill="currentColor" />
                </svg>
              )
            },
            {
              id: 'player' as const,
              name: 'Adventurer',
              sub: 'PLAYER MODE',
              blurb: 'Enter the realm as your hero. Roll, cast spells and explore.',
              key: 'P',
              accent: '56,189,248',
              icon: (
                <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 8l24 24-6 6-24-24z" />
                  <path d="M38 38l8 8" />
                  <path d="M44 44l6-6 6 6-6 6z" />
                  <path d="M10 54l12-12" />
                </svg>
              )
            }
          ]).map((m, idx) => (
            <button
              key={m.id}
              id={`intro-${m.id}-mode`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                choose(m.id);
              }}
              className="mw-card group relative text-left rounded-2xl overflow-hidden cursor-pointer"
              style={{
                opacity: stage >= 4 ? (leaving && leaving !== m.id ? 0.0 : 1) : 0,
                animation: stage >= 4 ? `mw-fade-up 0.9s ${idx * 0.18}s cubic-bezier(.2,.8,.2,1) backwards` : undefined,
                transition: 'opacity 0.7s ease',
                background: 'linear-gradient(160deg, rgba(24,24,32,0.82), rgba(8,8,14,0.9))',
                border: `1px solid rgba(${m.accent},0.45)`,
                boxShadow: `0 0 0 1px rgba(0,0,0,0.6), 0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(${m.accent},${leaving === m.id ? 0.7 : 0.18})`,
                backdropFilter: 'blur(10px)'
              }}
            >
              <div className="mw-sweep absolute inset-y-0 w-1/3 pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, rgba(${m.accent},0.22), transparent)`, transform: 'translateX(-120%) skewX(-20deg)' }} />
              <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, rgba(${m.accent},0.95), transparent)` }} />
              <div className="p-6 sm:p-8 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span style={{ color: `rgb(${m.accent})` }} className="drop-shadow-[0_0_14px_currentColor]">{m.icon}</span>
                  <span className="text-[10px] tracking-[0.35em] font-mono text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">
                    [{m.key}]
                  </span>
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.4em] font-mono" style={{ color: `rgb(${m.accent})` }}>{m.sub}</div>
                  <div className="text-2xl sm:text-3xl font-bold tracking-wide mt-1 text-zinc-50">{m.name}</div>
                </div>
                <p className="text-sm text-zinc-400 font-sans leading-relaxed" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>{m.blurb}</p>
                <div className="mt-2 text-xs tracking-[0.3em] uppercase font-mono flex items-center gap-2 transition-all group-hover:gap-4" style={{ color: `rgb(${m.accent})` }}>
                  Enter <span>&rarr;</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p
          className="mt-8 text-[10px] tracking-[0.4em] uppercase text-zinc-500 font-mono"
          style={{ opacity: stage >= 4 ? 1 : stage >= 2 ? 0.6 : 0, transition: 'opacity 1s ease' }}
        >
          {stage >= 4 ? 'Choose your path' : 'Click or press any key to skip'}
        </p>
      </div>

      {/* Sound toggle */}
      {audioOn && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const next = !muted;
            setMuted(next);
            audioRef.current?.setMuted(next);
          }}
          className="absolute bottom-4 right-4 z-20 text-[10px] tracking-[0.3em] uppercase font-mono text-zinc-400 hover:text-amber-300 border border-zinc-700/70 hover:border-amber-500/60 rounded-full px-3 py-1.5 bg-black/50 cursor-pointer"
        >
          Sound: {muted ? 'Off' : 'On'}
        </button>
      )}

      {/* Ominous dark swirling abyssal vortex transition */}
      {leaving && (
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden flex items-center justify-center">
          {/* Deep creeping shadow veil */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(3, 3, 7, 0.96) 0%, rgba(6, 5, 14, 0.94) 38%, rgba(2, 2, 5, 0.99) 100%)',
              animation: 'mw-abyss-implode 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards'
            }}
          />

          {/* Outer clockwise swirling dark mist tendrils */}
          <div
            className="absolute w-[180vmax] h-[180vmax] rounded-full"
            style={{
              background:
                leaving === 'dm'
                  ? 'conic-gradient(from 0deg at 50% 50%, rgba(4,4,8,0.98) 0deg, rgba(88,28,135,0.42) 55deg, rgba(5,5,10,0.98) 115deg, rgba(180,83,9,0.34) 175deg, rgba(3,3,7,0.99) 240deg, rgba(127,29,29,0.38) 305deg, rgba(4,4,8,0.98) 360deg)'
                  : 'conic-gradient(from 0deg at 50% 50%, rgba(4,4,8,0.98) 0deg, rgba(30,58,138,0.45) 55deg, rgba(5,5,10,0.98) 115deg, rgba(88,28,135,0.38) 175deg, rgba(3,3,7,0.99) 240deg, rgba(14,116,144,0.36) 305deg, rgba(4,4,8,0.98) 360deg)',
              filter: 'blur(36px)',
              animation: 'mw-vortex-in 2.4s cubic-bezier(0.32, 0, 0.2, 1) forwards'
            }}
          />

          {/* Inner counter-rotating shadowy maelstrom */}
          <div
            className="absolute w-[135vmax] h-[135vmax] rounded-full"
            style={{
              background:
                leaving === 'dm'
                  ? 'conic-gradient(from 180deg at 50% 50%, transparent 0deg, rgba(5,4,10,0.96) 60deg, rgba(147,51,234,0.28) 110deg, rgba(2,2,5,0.98) 180deg, rgba(217,119,6,0.24) 245deg, rgba(4,4,9,0.97) 310deg, transparent 360deg)'
                  : 'conic-gradient(from 180deg at 50% 50%, transparent 0deg, rgba(5,4,10,0.96) 60deg, rgba(56,189,248,0.25) 110deg, rgba(2,2,5,0.98) 180deg, rgba(99,102,241,0.28) 245deg, rgba(4,4,9,0.97) 310deg, transparent 360deg)',
              filter: 'blur(24px)',
              animation: 'mw-vortex-counter 2.2s cubic-bezier(0.32, 0, 0.2, 1) forwards'
            }}
          />

          {/* Spinning arcane abyssal geometry */}
          <svg
            viewBox="0 0 800 800"
            className="relative w-[92vmin] h-[92vmin] opacity-80"
            style={{ animation: 'mw-vortex-in 2.3s cubic-bezier(0.25, 0.1, 0.25, 1) forwards' }}
          >
            <defs>
              <radialGradient id="mw-void-eye" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#000000" stopOpacity="1" />
                <stop offset="48%" stopColor="#05040a" stopOpacity="0.96" />
                <stop
                  offset="72%"
                  stopColor={leaving === 'dm' ? '#581c87' : '#1e3a8a'}
                  stopOpacity="0.45"
                />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="400" cy="400" r="360" fill="url(#mw-void-eye)" />
            <circle
              cx="400"
              cy="400"
              r="290"
              fill="none"
              stroke={leaving === 'dm' ? 'rgba(168,85,247,0.42)' : 'rgba(56,189,248,0.38)'}
              strokeWidth="2"
              strokeDasharray="10 18 4 12"
            />
            <circle
              cx="400"
              cy="400"
              r="210"
              fill="none"
              stroke={leaving === 'dm' ? 'rgba(217,119,6,0.38)' : 'rgba(99,102,241,0.4)'}
              strokeWidth="1.5"
              strokeDasharray="6 14"
            />
            {Array.from({ length: 12 }).map((_, i) => {
              const rot = i * 30;
              return (
                <path
                  key={i}
                  d="M400,400 Q460,260 360,110"
                  fill="none"
                  stroke={leaving === 'dm' ? 'rgba(88,28,135,0.45)' : 'rgba(30,64,175,0.45)'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  transform={`rotate(${rot} 400 400)`}
                />
              );
            })}
            <circle cx="400" cy="400" r="95" fill="#020205" />
          </svg>

          {/* Crushing pitch-black outer vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, transparent 12%, rgba(3, 3, 8, 0.85) 54%, #020205 90%)'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default IntroScreen;
