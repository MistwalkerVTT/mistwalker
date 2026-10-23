import { StrictMode, lazy, Suspense, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { CrashRecoveryBoundary } from './components/CrashRecoveryBoundary';

const App = lazy(() => import('./App.tsx'));
const PlayerView = lazy(() => import('./components/PlayerView.tsx'));

// Global safeguard for CanvasRenderingContext2D.prototype.drawImage to prevent
// uncaught fatal exceptions when an image/canvas element has width or height of 0.
if (typeof window !== 'undefined' && window.CanvasRenderingContext2D) {
  const origDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (image: any, ...args: any[]) {
    if (!image) return;
    const w = image.width ?? image.naturalWidth ?? image.videoWidth;
    const h = image.height ?? image.naturalHeight ?? image.videoHeight;
    if (typeof w === 'number' && w <= 0) return;
    if (typeof h === 'number' && h <= 0) return;
    try {
      return (origDrawImage as any).apply(this, [image, ...args]);
    } catch (err: any) {
      if (err?.message?.includes('width or height of 0')) {
        return;
      }
      throw err;
    }
  };

  // Global non-fatal error guards to prevent canvas or audio glitches from unmounting UI
  window.addEventListener('error', (event) => {
    if (event?.message?.includes('ResizeObserver') || event?.message?.includes('CanvasRenderingContext2D')) {
      event.preventDefault();
      console.warn('[MistWalker Safeguard] Caught non-fatal canvas/layout exception:', event.message);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event?.reason?.message?.includes('play()') || event?.reason?.name === 'AbortError') {
      event.preventDefault();
      console.warn('[MistWalker Safeguard] Handled non-fatal media rejection:', event.reason);
    }
  });
}

const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const isPlayerView = searchParams ? (searchParams.get('view') === 'player' || searchParams.get('player') === 'true') : false;

const IntroScreen = lazy(() => import('./components/IntroScreen.tsx'));
const INTRO_SEEN_KEY = 'mistwalker_intro_seen_session';

// The cinematic intro shows on a fresh DM-side load. Direct player links (?view=player) and
// reloads within the same session go straight to the app.
const shouldShowIntro = (): boolean => {
  if (typeof window === 'undefined' || isPlayerView) return false;
  if (searchParams?.get('skipIntro') === '1' || searchParams?.get('view') === 'dm') return false;
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) !== '1';
  } catch {
    return true;
  }
};

function Root() {
  const initialIntro = useState<boolean>(shouldShowIntro)[0];
  const [introMounted, setIntroMounted] = useState<boolean>(initialIntro);
  const [appRevealed, setAppRevealed] = useState<boolean>(!initialIntro);
  const [chosePlayer, setChosePlayer] = useState(false);

  // Warm up both app bundles while the intro plays so the reveal is instant
  useEffect(() => {
    if (initialIntro) {
      import('./App.tsx').catch(() => undefined);
      import('./components/PlayerView.tsx').catch(() => undefined);
    }
  }, [initialIntro]);

  return (
    <>
      {appRevealed && (isPlayerView || chosePlayer ? <PlayerView /> : <App />)}
      {introMounted && (
        <IntroScreen
          onSelectDm={() => {
            try { sessionStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* ignore */ }
            setAppRevealed(true);
          }}
          onSelectPlayer={() => {
            // Switch in-place (no page reload) so the spoken greeting keeps playing
            const url = new URL(window.location.href);
            url.searchParams.set('view', 'player');
            window.history.replaceState({}, '', url.toString());
            setChosePlayer(true);
            setAppRevealed(true);
          }}
          onFinished={() => setIntroMounted(false)}
        />
      )}
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrashRecoveryBoundary fallbackTitle={isPlayerView ? "MistWalker Player View Interrupted" : "MistWalker DM View Interrupted"}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-zinc-950 text-amber-400 font-mono text-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading MistWalker...</span>
          </div>
        </div>
      }>
        <Root />
      </Suspense>
    </CrashRecoveryBoundary>
  </StrictMode>,
);



