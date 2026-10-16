// Client-side IndexedDB cache and image compression helper for large VTT assets

const DB_NAME = 'dnd_vtt_asset_cache';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const knownVideoUrls = new Set<string>();

export function registerVideoUrl(url: string | null | undefined) {
  if (url && typeof url === 'string') {
    knownVideoUrls.add(url);
  }
}

/**
 * Save large asset (dataUrl or Blob) to IndexedDB
 */
export async function saveLocalAsset(id: string, data: string | Blob): Promise<void> {
  try {
    if ((data instanceof Blob && data.type && data.type.startsWith('video/')) || (typeof data === 'string' && data.startsWith('data:video/'))) {
      registerVideoUrl(id);
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[storageCache] Unable to save to IndexedDB:', err);
  }
}

/**
 * Retrieve local asset from IndexedDB
 */
export async function getLocalAsset(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const res = req.result;
        if (!res) return resolve(null);
        if (typeof res === 'string') {
          if (res.startsWith('data:video/')) registerVideoUrl(res);
          resolve(res);
        } else if (res instanceof Blob) {
          const blobUrl = URL.createObjectURL(res);
          if (res.type && res.type.startsWith('video/')) {
            registerVideoUrl(blobUrl);
            registerVideoUrl(id);
          }
          resolve(blobUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[storageCache] Unable to get from IndexedDB:', err);
    return null;
  }
}

/**
 * Remove local asset from IndexedDB
 */
export async function deleteLocalAsset(id: string): Promise<void> {
  try {
    knownVideoUrls.delete(id);
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[storageCache] Unable to delete from IndexedDB:', err);
  }
}

/**
 * Helper to identify video files and URLs
 */
export function isVideoAsset(fileOrUrl: File | string | null | undefined): boolean {
  if (!fileOrUrl) return false;
  if (typeof fileOrUrl !== 'string') {
    if (fileOrUrl.type && fileOrUrl.type.startsWith('video/')) return true;
    const name = fileOrUrl.name?.toLowerCase() || '';
    return name.endsWith('.mp4') || name.endsWith('.m4v') || name.endsWith('.webm') || name.endsWith('.mov') || name.endsWith('.ogv');
  }
  if (knownVideoUrls.has(fileOrUrl)) return true;
  const clean = fileOrUrl.split('?')[0].split('#')[0].toLowerCase();
  return clean.startsWith('data:video/') ||
    clean.endsWith('.mp4') ||
    clean.endsWith('.m4v') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.ogv') ||
    clean.includes('/video/') ||
    clean.includes('.mp4') ||
    clean.includes('.webm') ||
    clean.includes('.m4v') ||
    clean.includes('.mov') ||
    fileOrUrl.toLowerCase().includes('.mp4') ||
    fileOrUrl.toLowerCase().includes('.webm') ||
    fileOrUrl.toLowerCase().includes('.m4v');
}

/**
 * Generate a compressed, high-clarity thumbnail (max 2048px, JPEG quality 0.88)
 * Guarantees crisp, high-resolution rendering while keeping payload safe for Firestore.
 * Supports both standard static images and video files/URLs (extracting an accurate frame).
 */
export async function createThumbnailDataUrl(
  fileOrUrl: File | string,
  maxDimension = 800,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    // If not in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve('');
    }

    if (isVideoAsset(fileOrUrl)) {
      const video = document.createElement('video');
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', 'true');
      video.preload = 'auto';

      let objectUrlToRevoke: string | null = null;
      if (typeof fileOrUrl !== 'string') {
        objectUrlToRevoke = URL.createObjectURL(fileOrUrl);
        video.src = objectUrlToRevoke;
      } else {
        // Only set crossOrigin if external http URL, never on blob:, data:, or relative / URLs
        if (fileOrUrl.startsWith('http') && !fileOrUrl.startsWith(window.location.origin)) {
          video.crossOrigin = 'anonymous';
        }
        video.src = fileOrUrl;
      }

      let timeout = setTimeout(() => {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve('');
      }, 6000);

      let frameCaptured = false;
      const captureFrame = () => {
        if (frameCaptured) return;
        frameCaptured = true;
        clearTimeout(timeout);
        try {
          let width = video.videoWidth || 1280;
          let height = video.videoHeight || 720;
          if (width <= 0 || height <= 0) {
            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
            return resolve('');
          }
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
            return resolve('');
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbUrl = canvas.toDataURL('image/jpeg', quality);
          if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
          resolve(thumbUrl);
        } catch (err) {
          console.warn('[storageCache] Video thumbnail creation error:', err);
          if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
          resolve('');
        }
      };

      const handleReady = () => {
        try {
          if (video.duration && !isNaN(video.duration) && video.duration > 0.1) {
            video.currentTime = Math.min(0.2, video.duration / 2);
          } else {
            captureFrame();
          }
        } catch {
          captureFrame();
        }
      };

      video.onloadeddata = handleReady;
      video.oncanplay = handleReady;
      video.onseeked = captureFrame;
      video.onerror = () => {
        clearTimeout(timeout);
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve('');
      };
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrlToRevoke: string | null = null;
    if (typeof fileOrUrl !== 'string') {
      objectUrlToRevoke = URL.createObjectURL(fileOrUrl);
      img.src = objectUrlToRevoke;
    } else {
      img.src = fileOrUrl;
    }

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
          return resolve('');
        }

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
          return resolve('');
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const thumbUrl = canvas.toDataURL('image/jpeg', quality);

        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve(thumbUrl);
      } catch (err) {
        console.warn('[storageCache] Thumbnail creation error:', err);
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve('');
      }
    };

    img.onerror = () => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      resolve('');
    };
  });
}

/**
 * Get natural pixel dimensions of a video file or URL
 */
export async function getVideoNaturalDimensions(
  fileOrUrl: File | string
): Promise<{ width: number; height: number; duration?: number }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve({ width: 0, height: 0 });
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');

    let objectUrlToRevoke: string | null = null;
    if (typeof fileOrUrl !== 'string') {
      objectUrlToRevoke = URL.createObjectURL(fileOrUrl);
      video.src = objectUrlToRevoke;
    } else {
      if (fileOrUrl.startsWith('http') && !fileOrUrl.startsWith(window.location.origin)) {
        video.crossOrigin = 'anonymous';
      }
      video.src = fileOrUrl;
    }

    let settled = false;
    let timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      resolve({ width: 0, height: 0 });
    }, 6000);

    const onMeta = () => {
      if (settled) return;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      if (width > 0 && height > 0) {
        settled = true;
        clearTimeout(timer);
        const duration = video.duration || 0;
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve({ width, height, duration });
      }
    };

    video.onloadedmetadata = onMeta;
    video.oncanplay = onMeta;

    video.onerror = () => {
      clearTimeout(timer);
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      resolve({ width: 0, height: 0 });
    };
  });
}

/**
 * Get natural pixel dimensions of an image file or URL
 */
export async function getImageNaturalDimensions(
  fileOrUrl: File | string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve({ width: 0, height: 0 });
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrlToRevoke: string | null = null;
    if (typeof fileOrUrl !== 'string') {
      objectUrlToRevoke = URL.createObjectURL(fileOrUrl);
      img.src = objectUrlToRevoke;
    } else {
      img.src = fileOrUrl;
    }

    img.onload = () => {
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      resolve({ width, height });
    };

    img.onerror = () => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      resolve({ width: 0, height: 0 });
    };
  });
}
