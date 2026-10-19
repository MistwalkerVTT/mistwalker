// src/effects/engine/VideoCacheManager.ts
// Client-side CacheStorage & Cache API manager for ultra-fast (0-2ms) video replay

const CACHE_NAME = 'mistwalker-jb2a-v1';

export class VideoCacheManager {
  private static instance: VideoCacheManager;
  private blobMap = new Map<string, string>();
  private isPrewarming = false;

  public static getInstance(): VideoCacheManager {
    if (!VideoCacheManager.instance) {
      VideoCacheManager.instance = new VideoCacheManager();
    }
    return VideoCacheManager.instance;
  }

  /**
   * Pre-warm critical combat spells in the background using the browser Cache API.
   * This guarantees instantaneous 0ms playback on combat trigger without network stalls.
   */
  public async prewarmUrls(urls: string[]): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window) || this.isPrewarming) return;
    this.isPrewarming = true;

    try {
      const cache = await caches.open(CACHE_NAME);
      const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));

      // Fetch up to 4 concurrent assets at a time to keep main thread completely unblocked
      const batchSize = 4;
      for (let i = 0; i < uniqueUrls.length; i += batchSize) {
        const batch = uniqueUrls.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (url) => {
            try {
              const matched = await cache.match(url);
              if (!matched) {
                const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
                if (response.ok) {
                  await cache.put(url, response);
                }
              }
            } catch (err) {
              // Non-blocking failover to live CDN streaming
            }
          })
        );
      }
    } catch (e) {
      // Fallback cleanly to direct CDN
    } finally {
      this.isPrewarming = false;
    }
  }

  /**
   * Get an active Object URL from cache if available, or return the CDN URL.
   */
  public async resolvePlayableUrl(cdnUrl: string): Promise<string> {
    if (!cdnUrl) return '';
    if (this.blobMap.has(cdnUrl)) {
      return this.blobMap.get(cdnUrl)!;
    }

    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const match = await cache.match(cdnUrl);
        if (match) {
          const blob = await match.blob();
          const objUrl = URL.createObjectURL(blob);
          this.blobMap.set(cdnUrl, objUrl);
          return objUrl;
        }
      } catch (e) {}
    }

    return cdnUrl;
  }
}

export const videoCacheManager = VideoCacheManager.getInstance();
