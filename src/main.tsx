import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import PlayerView from './components/PlayerView.tsx';

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
}

const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const isPlayerView = searchParams ? (searchParams.get('view') === 'player' || searchParams.get('player') === 'true') : false;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPlayerView ? <PlayerView /> : <App />}
  </StrictMode>,
);

