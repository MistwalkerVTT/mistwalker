// src/effects/engine/VideoPool.ts
// Managed offscreen HTML5 video element pool (prevents decoder limits & DOM buffering stalls)

import { videoCacheManager } from './VideoCacheManager';

const MAX_POOL_SIZE = 16;
const CONTAINER_ID = 'mistwalker-video-pool';

export interface PooledVideo {
  video: HTMLVideoElement;
  inUse: boolean;
  currentUrl: string;
}

export class VideoPool {
  private static instance: VideoPool;
  private pool: PooledVideo[] = [];
  private container: HTMLDivElement | null = null;

  public static getInstance(): VideoPool {
    if (!VideoPool.instance) {
      VideoPool.instance = new VideoPool();
    }
    return VideoPool.instance;
  }

  private ensureContainer(): HTMLDivElement {
    if (typeof document === 'undefined') {
      throw new Error('VideoPool requires DOM environment');
    }

    if (!this.container) {
      let existing = document.getElementById(CONTAINER_ID) as HTMLDivElement;
      if (!existing) {
        existing = document.createElement('div');
        existing.id = CONTAINER_ID;
        existing.setAttribute('aria-hidden', 'true');
        existing.style.cssText =
          'position:fixed;top:0;left:0;width:2px;height:2px;overflow:hidden;opacity:0.001;pointer-events:none;z-index:-9999;';
        document.body.appendChild(existing);
      }
      this.container = existing;
    }
    return this.container;
  }

  /**
   * Acquire a pre-mounted, hardware-accelerated video element.
   */
  public async acquire(rawUrl: string, loop: boolean = false): Promise<HTMLVideoElement> {
    const container = this.ensureContainer();
    const playableUrl = await videoCacheManager.resolvePlayableUrl(rawUrl);

    // 1. Look for an idle element in the pool
    let entry = this.pool.find(p => !p.inUse);

    if (!entry) {
      if (this.pool.length < MAX_POOL_SIZE) {
        const vid = document.createElement('video');
        vid.crossOrigin = 'anonymous';
        vid.muted = true;
        vid.defaultMuted = true;
        vid.preload = 'auto';
        vid.playsInline = true;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('webkit-playsinline', '');
        vid.setAttribute('muted', '');
        vid.style.cssText = 'width:2px;height:2px;position:absolute;top:0;left:0;';
        container.appendChild(vid);

        entry = { video: vid, inUse: true, currentUrl: '' };
        this.pool.push(entry);
      } else {
        // Pool saturated: preempt oldest entry
        entry = this.pool[0];
        entry.video.pause();
      }
    }

    entry.inUse = true;
    const vid = entry.video;
    vid.loop = loop;

    if (entry.currentUrl !== playableUrl) {
      entry.currentUrl = playableUrl;
      vid.src = playableUrl;
      vid.load();
    }

    try {
      await vid.play();
    } catch (err) {
      // Autoplay with muted is guaranteed by browser specs, but catch edge stalls
      vid.play().catch(() => {});
    }

    return vid;
  }

  /**
   * Release a video element back into the idle pool.
   */
  public release(video: HTMLVideoElement): void {
    const entry = this.pool.find(p => p.video === video);
    if (entry) {
      entry.inUse = false;
      try {
        video.pause();
      } catch (e) {}
    }
  }

  /**
   * Clear all allocated video decoders.
   */
  public destroy(): void {
    this.pool.forEach(p => {
      try {
        p.video.pause();
        p.video.removeAttribute('src');
        p.video.load();
        p.video.remove();
      } catch (e) {}
    });
    this.pool = [];
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}

export const videoPool = VideoPool.getInstance();
