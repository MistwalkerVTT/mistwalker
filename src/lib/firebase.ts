import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  getDocFromServer,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Firestore
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  FirebaseStorage
} from 'firebase/storage';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  saveLocalAsset, 
  getLocalAsset, 
  deleteLocalAsset,
  createThumbnailDataUrl, 
  getImageNaturalDimensions,
  getVideoNaturalDimensions,
  isVideoAsset
} from './storageCache';
import type { AnimatedFeature, WeatherEffectType } from '../types';
import type { CampaignMember } from '../types/auth';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific databaseId provisioned for this project
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Storage
export const storage: FirebaseStorage = getStorage(app);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Complete Domain Silo: Stable v1.0.0 vs Enterprise Beta
export const IS_ENTERPRISE_BETA: boolean =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_ENV === 'beta') ||
  (typeof window !== 'undefined' && (window.location.hostname.includes('mistwalker-beta') || window.location.port === '5174'));

// Auto-authenticate anonymously to ensure request.auth is established for rules
let authInitialized = false;
export async function ensureAuth() {
  if (authInitialized && auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    authInitialized = true;
    return cred.user;
  } catch (err) {
    console.warn('Anonymous auth note (proceeding):', err);
    return null;
  }
}

// Connection state tracking for UI status badges
let _isConnected = false;
const _connectionListeners = new Set<(connected: boolean) => void>();

let _quotaExceeded = false;
const _quotaListeners = new Set<(exceeded: boolean) => void>();

export function getIsFirebaseConnected(): boolean {
  return _isConnected;
}

export function subscribeToConnectionState(listener: (connected: boolean) => void): () => void {
  _connectionListeners.add(listener);
  listener(_isConnected);
  return () => {
    _connectionListeners.delete(listener);
  };
}

export function setFirebaseConnectedState(state: boolean) {
  if (_isConnected !== state) {
    _isConnected = state;
    _connectionListeners.forEach(cb => cb(state));
  }
}

export function getIsQuotaExceeded(): boolean {
  return _quotaExceeded;
}

export function subscribeToQuotaState(listener: (exceeded: boolean) => void): () => void {
  _quotaListeners.add(listener);
  listener(_quotaExceeded);
  return () => {
    _quotaListeners.delete(listener);
  };
}

export function setQuotaExceededState(state: boolean) {
  if (_quotaExceeded !== state) {
    _quotaExceeded = state;
    _quotaListeners.forEach(cb => cb(state));
  }
}

// Ensure auth on load
ensureAuth();

// Test connection to Firestore on boot as required by system guidelines
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    setFirebaseConnectedState(true);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
      setFirebaseConnectedState(false);
      return false;
    }
    // If not offline error, server reached!
    setFirebaseConnectedState(true);
    return true;
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  // Set global quota exceeded state to trigger a helpful, user-friendly overlay
  if (errInfo.error.includes('Quota limit exceeded') || errInfo.error.includes('Quota exceeded')) {
    if (!getIsQuotaExceeded()) {
      setQuotaExceededState(true);
      console.error('Firestore Quota Exceeded. Database operations paused.', JSON.stringify(errInfo));
    }
  } else {
    console.error('Firestore Error:', JSON.stringify(errInfo));
  }

  throw new Error(JSON.stringify(errInfo));
}

import { WallSegment, VisionConfig, RoomAnnotation, ChapterPdfDigest, RevealPoint, TokenMonsterState, normalizeRoomAnnotation, normalizeRoomAnnotations } from '../types';

// Data Interfaces as specified in User Requirements
export interface SceneToken {
  id: string;
  name: string;
  avatarUrl: string;
  x: number;
  y: number;
  hp?: number;
  maxHp?: number;
  currentHp?: number;
  tempHp?: number;
  ac?: number;
  size?: number;
  isCondition?: boolean;
  visionRadius?: number;
  visionAngle?: number;
  isPlayer?: boolean;
  isMonster?: boolean;
  category?: 'character' | 'monster' | 'ally' | 'custom';
  visionEnabled?: boolean;
  characterId?: string;
  ddbCharacterId?: number | string;
  auraRadius?: number;
  auraColor?: string;
  auraOpacity?: number;
  auraName?: string;
  auraPulse?: boolean;
  auras?: any[];
  speed?: number;
  monsterState?: TokenMonsterState;
}

export interface Scene {
  sceneId: string;
  sceneTitle: string;
  mapUrl: string;
  mapThumbnailUrl?: string;
  mapWidth?: number;
  mapHeight?: number;
  mapType?: 'image' | 'video';
  mapRotation?: number;
  dmNotes: string;
  tokens: SceneToken[];
  gridSize?: number;
  gridOpacity?: number;
  gridVisible?: boolean;
  gridOffsetX?: number;
  gridOffsetY?: number;
  isFogVisible?: boolean;
  reveals?: RevealPoint[];
  polygonReveals?: number[][];
  fogResetKey?: number;
  walls?: WallSegment[];
  visionConfig?: VisionConfig;
  roomAnnotations?: RoomAnnotation[];
  boardAnimatedFeatures?: AnimatedFeature[];
  boardAnimatedEnabled?: boolean;
  boardWeatherEffect?: WeatherEffectType;
  pdfUrl?: string;
  pdfFilename?: string;
  pdfSection?: string;
  pdfPage?: number;
  updatedAt?: number;
}

export interface Chapter {
  chapterId: string;
  chapterTitle: string;
  orderIndex: number;
  scenes: Scene[];
  pdfUrl?: string;
  pdfFilename?: string;
  pdfDigest?: ChapterPdfDigest;
}

export interface Campaign {
  campaignId: string;
  campaignTitle: string;
  description: string;
  createdAt: number;
  updatedAt?: number;
  chapters: Chapter[];
  // Multi-tenant & Commercial Multi-DM additions
  ownerUid?: string;
  ownerDisplayName?: string;
  inviteCode?: string; // 6-character code (e.g. "VAULT9")
  members?: Record<string, CampaignMember>; // Keyed by Firebase Auth UID
  coDmUids?: string[];
  bannerUrl?: string;
  ddbCampaignId?: string;
  ddbSyncEnabled?: boolean;
}

export interface ActiveSessionData {
  sessionId: string;
  campaignId: string;
  chapterId: string;
  sceneId: string;
  sceneTitle: string;
  mapUrl: string;
  mapThumbnailUrl?: string;
  mapWidth?: number;
  mapHeight?: number;
  mapType?: 'image' | 'video';
  mapRotation?: number;
  dmNotes: string;
  tokens: SceneToken[];
  gridSize?: number;
  gridOpacity?: number;
  gridVisible?: boolean;
  gridOffsetX?: number;
  gridOffsetY?: number;
  isFogVisible?: boolean;
  reveals?: RevealPoint[];
  polygonReveals?: number[][];
  fogResetKey?: number;
  walls?: WallSegment[];
  visionConfig?: VisionConfig;
  roomAnnotations?: RoomAnnotation[];
  boardAnimatedFeatures?: AnimatedFeature[];
  boardAnimatedEnabled?: boolean;
  boardWeatherEffect?: WeatherEffectType;
  updatedAt: number;
  updatedBy?: string;
}


export interface UploadedAsset {
  assetId: string;
  name: string;
  type: 'map' | 'token' | 'pdf' | 'audio' | 'other';
  url: string;
  thumbnailUrl?: string;
  fileType: string;
  width?: number;
  height?: number;
  size?: number; // for tokens (1, 2, 3, etc.)
  fileSizeBytes?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Save an uploaded asset metadata record into Firestore
 */
export async function saveUploadedAsset(
  assetData: Omit<UploadedAsset, 'assetId' | 'createdAt' | 'updatedAt'> & {
    assetId?: string;
    createdAt?: number;
    updatedAt?: number;
  }
): Promise<UploadedAsset> {
  let baseAssetId = assetData.assetId || `${assetData.type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  if (IS_ENTERPRISE_BETA) {
    if (!baseAssetId.startsWith('beta_')) baseAssetId = `beta_${baseAssetId}`;
  } else {
    baseAssetId = baseAssetId.replace(/^beta_/, '');
  }
  const assetId = baseAssetId;
  const path = `uploadedAssets/${assetId}`;

  let url = assetData.url;
  let thumbnailUrl = assetData.thumbnailUrl;

  // Always pre-cache the original full-fidelity asset in IndexedDB
  if (typeof url === 'string') {
    await saveLocalAsset(assetId, url);
    if (assetData.name) {
      await saveLocalAsset(assetData.name, url);
    }
  }

  // Safeguard: Never save gigantic base64 payloads to Firestore (Firestore limit is 1MB)
  if (typeof url === 'string' && url.startsWith('data:') && url.length > 50000) {
    // Try converting via server base64 upload endpoint
    try {
      const res = await fetch('/api/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: url, filename: assetData.name, type: assetData.type })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.url) {
          url = data.url;
        }
      }
    } catch (e) {
      console.warn('[saveUploadedAsset] Could not convert base64 via server:', e);
    }

    // If still a large data URL, cache in IndexedDB and store a lightweight thumbnail in Firestore
    if (url.startsWith('data:') && url.length > 50000) {
      if (!thumbnailUrl || thumbnailUrl.length > 50000) {
        try {
          thumbnailUrl = await createThumbnailDataUrl(url, assetData.type === 'token' ? 160 : 400, 0.6);
        } catch {
          thumbnailUrl = undefined;
        }
      }
      url = `local:${assetId}`;
    }
  }

  // Ensure thumbnail is compact and safe (< 40KB)
  if (typeof thumbnailUrl === 'string' && thumbnailUrl.startsWith('data:') && thumbnailUrl.length > 40000) {
    try {
      thumbnailUrl = await createThumbnailDataUrl(thumbnailUrl, assetData.type === 'token' ? 140 : 350, 0.55);
    } catch {
      thumbnailUrl = undefined;
    }
  }

  // Ensure thumbnail exists for remote or server URLs
  if (!thumbnailUrl && typeof url === 'string' && (url.startsWith('http') || url.startsWith('/uploads/'))) {
    thumbnailUrl = url;
  }

  const asset: UploadedAsset = {
    assetId,
    name: assetData.name || 'Uploaded Asset',
    type: assetData.type,
    url,
    thumbnailUrl: thumbnailUrl && thumbnailUrl.length < 60000 ? thumbnailUrl : undefined,
    fileType: assetData.fileType || 'image',
    size: assetData.size || 1,
    fileSizeBytes: assetData.fileSizeBytes || 0,
    createdAt: assetData.createdAt || Date.now(),
    updatedAt: Date.now(),
    ...(IS_ENTERPRISE_BETA ? { isBeta: true } : {})
  };


  try {
    const docRef = doc(db, 'uploadedAssets', assetId);
    let payload = cleanForFirestore(asset);

    // Final payload size check (< 150KB to stay safely under Firestore's 1MB limit)
    if (JSON.stringify(payload).length > 150000) {
      console.warn('[saveUploadedAsset] Payload size exceeds safe threshold, trimming for Firestore storage');
      const safePayload: any = { ...payload };
      for (const [k, v] of Object.entries(safePayload)) {
        if (typeof v === 'string' && v.length > 20000) {
          if (k === 'url') safePayload[k] = `local:${assetId}`;
          else if (k === 'thumbnailUrl') safePayload[k] = undefined;
          else safePayload[k] = (v as string).slice(0, 1000);
        }
      }
      payload = safePayload;
    }

    await setDoc(docRef, payload, { merge: true });
    return asset;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Fetch all uploaded assets from Firestore
 */
export async function getUploadedAssetsList(
  typeFilter?: 'map' | 'token' | 'pdf' | 'all'
): Promise<UploadedAsset[]> {
  const path = 'uploadedAssets';
  try {
    const colRef = collection(db, path);
    const snap = await getDocs(colRef);
    let assets: UploadedAsset[] = snap.docs
      .map(docSnap => {
        const data = docSnap.data() as UploadedAsset;
        return {
          ...data,
          assetId: data.assetId || docSnap.id
        };
      })
      .filter(a => {
        const isBetaDoc = Boolean(a.assetId?.startsWith('beta_') || a.id?.startsWith('beta_') || (a as any).isBeta);
        return IS_ENTERPRISE_BETA ? isBetaDoc : !isBetaDoc;
      });

    if (typeFilter && typeFilter !== 'all') {
      assets = assets.filter(a => a.type === typeFilter);
    }

    assets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return assets;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

/**
 * Real-time listener for uploaded assets in Firestore
 */
export function subscribeToUploadedAssets(
  typeFilter: 'map' | 'token' | 'all',
  callback: (assets: UploadedAsset[]) => void,
  onError?: (error: any) => void
): () => void {
  const path = 'uploadedAssets';
  const colRef = collection(db, path);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      let assets: UploadedAsset[] = snapshot.docs
        .map(docSnap => {
          const data = docSnap.data() as UploadedAsset;
          return {
            ...data,
            assetId: data.assetId || docSnap.id
          };
        })
        .filter(a => {
          const isBetaDoc = Boolean(a.assetId?.startsWith('beta_') || a.id?.startsWith('beta_') || (a as any).isBeta);
          return IS_ENTERPRISE_BETA ? isBetaDoc : !isBetaDoc;
        });
      if (typeFilter !== 'all') {
        assets = assets.filter(a => a.type === typeFilter);
      }
      assets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(assets);
    },
    (error) => {
      console.warn('subscribeToUploadedAssets listener warning:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );

  return unsubscribe;
}

/**
 * Delete an uploaded asset from Firestore, IndexedDB, and server storage
 */
export async function deleteUploadedAsset(assetId: string, assetUrl?: string): Promise<void> {
  if (IS_ENTERPRISE_BETA && !assetId.startsWith('beta_')) {
    console.warn('[Security Silo] Enterprise Beta cannot delete Stable asset:', assetId);
    return;
  }
  if (!IS_ENTERPRISE_BETA && assetId.startsWith('beta_')) {
    console.warn('[Security Silo] Stable cannot delete Beta asset:', assetId);
    return;
  }
  const path = `uploadedAssets/${assetId}`;
  try {
    const docRef = doc(db, 'uploadedAssets', assetId);
    await deleteDoc(docRef);

    // Clean up local IndexedDB cache
    try {
      await deleteLocalAsset(assetId);
      if (assetUrl) {
        await deleteLocalAsset(assetUrl);
        const filename = assetUrl.split('/').pop()?.split('?')[0];
        if (filename) await deleteLocalAsset(filename);
      }
    } catch (e) {
      console.warn('[deleteUploadedAsset] IndexedDB cache cleanup notice:', e);
    }

    // Clean up server-hosted file if it is in /uploads/
    if (assetUrl && typeof assetUrl === 'string' && assetUrl.startsWith('/uploads/')) {
      try {
        await fetch(`/api/upload?url=${encodeURIComponent(assetUrl)}`, { method: 'DELETE' });
      } catch (srvErr) {
        console.warn('[deleteUploadedAsset] Server file delete notice:', srvErr);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Universal upload handler that:
 * 1. Uploads the file via API (or falls back to FileReader)
 * 2. Saves the asset metadata to Firestore under 'uploadedAssets'
 * 3. Pre-caches in client IndexedDB for instantaneous local access
 * 4. Returns the saved UploadedAsset object for immediate use and future sessions.
 */
export async function uploadAndRegisterAsset(
  file: File,
  type: 'map' | 'token' | 'pdf' | 'audio' | 'other',
  options?: {
    tokenSize?: number;
    customName?: string;
  }
): Promise<UploadedAsset> {
  const isVideo = isVideoAsset(file);

  let fileType = 'image';
  if (isVideo) fileType = 'video';
  else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) fileType = 'pdf';
  else if (file.type.startsWith('audio/')) fileType = 'audio';

  let finalUrl = '';
  const assetName = options?.customName || file.name.replace(/\.[^/.]+$/, "") || 'Uploaded Asset';
  const baseAssetId = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const assetId = IS_ENTERPRISE_BETA ? `beta_${baseAssetId}` : baseAssetId;

  // Step 1: Pre-cache in client IndexedDB for instantaneous local access
  try {
    await saveLocalAsset(assetId, file);
  } catch (idbErr) {
    console.warn('[uploadAndRegisterAsset] IndexedDB pre-cache notice:', idbErr);
  }

  // Step 2: Attempt standard multipart upload to server
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data && data.url) {
          finalUrl = data.url;
        }
      }
    }
  } catch (uploadErr) {
    console.warn('[uploadAndRegisterAsset] Server API upload attempt notice:', uploadErr);
  }

  // Step 3: If multipart upload didn't succeed, attempt base64 server endpoint
  if (!finalUrl) {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      // Send to /api/upload-base64
      const b64Res = await fetch('/api/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: dataUrl, filename: file.name, type })
      });

      if (b64Res.ok) {
        const b64Data = await b64Res.json();
        if (b64Data && b64Data.url) {
          finalUrl = b64Data.url;
        }
      }

      // If server still unreachable, fallback to dataUrl for both images and video files
      if (!finalUrl && dataUrl) {
        finalUrl = dataUrl;
      }
    } catch (b64Err) {
      console.warn('[uploadAndRegisterAsset] Base64 upload notice:', b64Err);
    }
  }

  // If finalUrl was generated, also cache in IndexedDB under the URL for fast retrieval
  if (finalUrl) {
    try {
      await saveLocalAsset(finalUrl, file);
      const filename = finalUrl.split('/').pop();
      if (filename) await saveLocalAsset(filename, file);
    } catch {
      // ignore
    }
  }

  // Measure natural dimensions and generate high-clarity thumbnail
  let thumbnailUrl: string | undefined;
  let dims = { width: 0, height: 0 };
  try {
    if (fileType === 'image') {
      dims = await getImageNaturalDimensions(file);
    } else if (fileType === 'video') {
      dims = await getVideoNaturalDimensions(file);
    }
    const maxDim = type === 'token' ? 300 : 800;
    const qual = type === 'token' ? 0.8 : 0.75;
    thumbnailUrl = await createThumbnailDataUrl(file, maxDim, qual);
  } catch (thumbErr) {
    console.warn('[uploadAndRegisterAsset] Thumbnail generation notice:', thumbErr);
  }

  // Step 4: Register in Firebase Firestore (protected against 1MB document limit)
  const savedAsset = await saveUploadedAsset({
    assetId,
    name: assetName,
    type,
    url: finalUrl || `local:${assetId}`,
    thumbnailUrl,
    fileType,
    width: dims.width > 0 ? dims.width : undefined,
    height: dims.height > 0 ? dims.height : undefined,
    size: options?.tokenSize || 1,
    fileSizeBytes: file.size,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  return {
    ...savedAsset,
    url: finalUrl || (savedAsset.url && !savedAsset.url.startsWith('local:') ? savedAsset.url : (thumbnailUrl || URL.createObjectURL(file)))
  };
}

/**
 * Upload an image or video map to Firebase under /campaigns/{campaignId}/
 * Gracefully leverages uploadAndRegisterAsset for robust disk storage, IndexedDB caching,
 * natural dimension extraction, thumbnail generation, and Firestore uploadedAssets library registration.
 */
export async function uploadCampaignAsset(
  campaignId: string,
  file: File,
  subFolder: 'maps' | 'tokens' = 'maps'
): Promise<string> {
  const asset = await uploadAndRegisterAsset(file, subFolder === 'tokens' ? 'token' : 'map');
  return asset.url;
}

/**
 * Upload map directly returning the complete UploadedAsset with width, height, and thumbnail
 */
export async function uploadCampaignMapAsset(
  campaignId: string,
  file: File
): Promise<UploadedAsset> {
  return await uploadAndRegisterAsset(file, 'map');
}

/**
 * Recursively remove undefined values from objects and arrays because Firestore setDoc/updateDoc
 * throws: "Unsupported field value: undefined" if any field value is undefined.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Fetch all campaigns from Firestore
 */
export async function getCampaignsList(): Promise<Campaign[]> {
  const path = 'campaigns';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    const list: Campaign[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Campaign;
      const id = docSnap.id;
      const isBetaDoc = Boolean(id.startsWith('beta_') || (data as any).isBeta);
      if (IS_ENTERPRISE_BETA ? isBetaDoc : !isBetaDoc) {
        list.push({ ...data, id, campaignId: id });
      }
    });
    const sampleIds = new Set(SAMPLE_CAMPAIGNS.map(s => s.campaignId));
    const merged = [
      ...SAMPLE_CAMPAIGNS,
      ...list.filter(c => !sampleIds.has(c.campaignId))
    ];
    return merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.warn('Could not fetch remote campaigns, returning sample campaigns:', error);
    return SAMPLE_CAMPAIGNS;
  }
}

/**
 * Save or update a campaign document
 * Sanitizes all scenes to prevent exceeding Firestore's 1MB document limit
 */
export async function saveCampaignDoc(campaign: Campaign): Promise<void> {
  let targetCampaignId = campaign.campaignId;
  if (IS_ENTERPRISE_BETA) {
    if (!targetCampaignId.startsWith('beta_')) targetCampaignId = `beta_${targetCampaignId}`;
  } else {
    targetCampaignId = targetCampaignId.replace(/^beta_/, '');
  }
  const path = `campaigns/${targetCampaignId}`;
  try {
    const docRef = doc(db, 'campaigns', targetCampaignId);
    
    // Sanitize all scenes across chapters to protect against Firestore 1MB document limit
    let sanitizedChapters = campaign.chapters;
    if (campaign.chapters && Array.isArray(campaign.chapters)) {
      sanitizedChapters = await Promise.all(
        campaign.chapters.map(async (ch) => {
          if (!ch.scenes || !Array.isArray(ch.scenes)) return ch;
          const sanitizedScenes = await Promise.all(
            ch.scenes.map((sc) => sanitizeSceneForStorage(sc))
          );
          return {
            ...ch,
            scenes: sanitizedScenes
          };
        })
      );
    }

    const payload = cleanForFirestore({
      ...campaign,
      chapters: sanitizedChapters,
      updatedAt: Date.now()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a campaign document
 */
export async function deleteCampaignDoc(campaignId: string): Promise<void> {
  const path = `campaigns/${campaignId}`;
  try {
    const docRef = doc(db, 'campaigns', campaignId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Publish active session state for real-time player synchronization
 */
export async function publishActiveSession(sessionData: ActiveSessionData): Promise<void> {
  const sessionDocId = IS_ENTERPRISE_BETA ? 'beta_current' : 'current';
  const path = `activeSession/${sessionDocId}`;
  try {
    let safeMapUrl = sessionData.mapUrl;
    if (safeMapUrl && safeMapUrl.startsWith('blob:')) {
      const uploaded = await uploadBlobUrlToServer(safeMapUrl, sessionData.sceneTitle || sessionData.sceneId || 'map');
      safeMapUrl = !uploaded.startsWith('blob:') ? uploaded : (sessionData.mapThumbnailUrl || '');
    }
    const docRef = doc(db, 'activeSession', sessionDocId);
    const payload = cleanForFirestore({
      ...sessionData,
      mapUrl: safeMapUrl,
      updatedAt: Date.now(),
      updatedBy: auth.currentUser?.uid || 'dm'
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribe to active session in real-time
 */
export function subscribeToActiveSession(
  onUpdate: (session: ActiveSessionData | null) => void
): () => void {
  const sessionDocId = IS_ENTERPRISE_BETA ? 'beta_current' : 'current';
  const path = `activeSession/${sessionDocId}`;
  const docRef = doc(db, 'activeSession', sessionDocId);
  
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as ActiveSessionData);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    console.error('Active session subscription error:', error);
    handleFirestoreError(error, OperationType.GET, path);
  });

  return unsubscribe;
}

/**
 * Subscribe to all campaigns in real-time
 */
export function subscribeToCampaigns(
  onUpdate: (campaigns: Campaign[]) => void
): () => void {
  const path = 'campaigns';
  const colRef = collection(db, path);
  const unsubscribe = onSnapshot(colRef, (snapshot) => {
    setFirebaseConnectedState(true);
    const list: Campaign[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Campaign;
      const id = docSnap.id;
      const isBetaDoc = Boolean(id.startsWith('beta_') || (data as any).isBeta);
      if (IS_ENTERPRISE_BETA ? isBetaDoc : !isBetaDoc) {
        list.push({ ...data, id, campaignId: id });
      }
    });
    const sampleIds = new Set(SAMPLE_CAMPAIGNS.map(s => s.campaignId));
    const merged = [
      ...SAMPLE_CAMPAIGNS,
      ...list.filter(c => !sampleIds.has(c.campaignId))
    ];
    onUpdate(merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  }, (error) => {
    console.error('Campaigns subscription error:', error);
    setFirebaseConnectedState(false);
    handleFirestoreError(error, OperationType.GET, path);
  });
  return unsubscribe;
}

/**
 * Helper to ensure scene map image does not exceed Firestore document size limits
 * while guaranteeing high-fidelity preservation in IndexedDB and embedded fallback thumbnail.
 */
async function sanitizeSceneForStorage(scene: Scene): Promise<Scene> {
  const updatedScene: Scene = { ...scene };

  // Preserve room annotations, polygon rooms, and tactical map labels directly attached to the scene (just like walls and tokens)
  if (scene.roomAnnotations && Array.isArray(scene.roomAnnotations)) {
    updatedScene.roomAnnotations = normalizeRoomAnnotations(scene.roomAnnotations, scene.sceneId);
  }

  // Preserve and compact Fog of War brush reveals if present to protect against 1MB Firestore limit
  if (scene.reveals && Array.isArray(scene.reveals)) {
    if (scene.reveals.length > 1000) {
      // Thin points evenly so fog boundaries remain smooth without bloating payload
      const step = Math.ceil(scene.reveals.length / 800);
      updatedScene.reveals = scene.reveals.filter((_, idx) => idx % step === 0);
    } else {
      updatedScene.reveals = scene.reveals;
    }
  }

  if (scene.polygonReveals && Array.isArray(scene.polygonReveals)) {
    updatedScene.polygonReveals = scene.polygonReveals;
  }

  // 1. Measure and preserve map dimensions if missing
  if ((!updatedScene.mapWidth || !updatedScene.mapHeight) && (updatedScene.mapUrl || updatedScene.mapThumbnailUrl)) {
    try {
      const targetSource = updatedScene.mapUrl || updatedScene.mapThumbnailUrl;
      if (targetSource) {
        const isVideo = isVideoAsset(targetSource);
        const dims = isVideo
          ? await getVideoNaturalDimensions(targetSource)
          : await getImageNaturalDimensions(targetSource);
        if (dims.width > 0 && dims.height > 0) {
          updatedScene.mapWidth = dims.width;
          updatedScene.mapHeight = dims.height;
        }
      }
    } catch (dimErr) {
      console.warn('[sanitizeSceneForStorage] Dimension inspection warning:', dimErr);
    }
  }

  // 1b. Check if walls span beyond recorded mapWidth
  if (updatedScene.walls && updatedScene.walls.length > 0) {
    let maxWallX = 0;
    let maxWallY = 0;
    for (const w of updatedScene.walls) {
      if (w.p1.x > maxWallX) maxWallX = w.p1.x;
      if (w.p2.x > maxWallX) maxWallX = w.p2.x;
      if (w.p1.y > maxWallY) maxWallY = w.p1.y;
      if (w.p2.y > maxWallY) maxWallY = w.p2.y;
    }
    if (maxWallX > (updatedScene.mapWidth || 0) * 1.1) {
      const aspect = (updatedScene.mapWidth && updatedScene.mapHeight) 
        ? updatedScene.mapWidth / updatedScene.mapHeight 
        : (maxWallX / Math.max(maxWallY, 1));
      const targetW = Math.round(maxWallX + 328);
      const targetH = Math.round(targetW / aspect);
      updatedScene.mapWidth = targetW;
      updatedScene.mapHeight = targetH;
    }
  }

  // 2. Generate and embed high-clarity thumbnail if missing or recompress if excessively bloated (>80KB)
  const isBloatedThumb = updatedScene.mapThumbnailUrl && updatedScene.mapThumbnailUrl.startsWith('data:') && updatedScene.mapThumbnailUrl.length > 80000;
  if ((!updatedScene.mapThumbnailUrl || isBloatedThumb) && updatedScene.mapUrl && !updatedScene.mapUrl.startsWith('data:')) {
    try {
      const thumb = await createThumbnailDataUrl(updatedScene.mapUrl, 600, 0.7);
      if (thumb && thumb.length < 50000) {
        updatedScene.mapThumbnailUrl = thumb;
      }
    } catch (thumbErr) {
      console.warn('[sanitizeSceneForStorage] Thumbnail generation warning:', thumbErr);
    }
  }

  // 2. Prevent large base64 payload from exceeding Firestore's 1MB limit
  if (updatedScene.mapUrl && updatedScene.mapUrl.startsWith('data:') && updatedScene.mapUrl.length > 200000) {
    // Cache full-fidelity image in IndexedDB
    try {
      await saveLocalAsset(`scene_${updatedScene.sceneId}`, updatedScene.mapUrl);
      if (updatedScene.sceneTitle) {
        await saveLocalAsset(updatedScene.sceneTitle, updatedScene.mapUrl);
      }
    } catch (e) {
      console.warn('[sanitizeSceneForStorage] IndexedDB save warning:', e);
    }

    // Try converting via server base64 upload
    try {
      const res = await fetch('/api/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: updatedScene.mapUrl, filename: `scene_${updatedScene.sceneId}`, type: 'map' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          updatedScene.mapUrl = data.url;
          return updatedScene;
        }
      }
    } catch (e) {
      console.warn('[sanitizeSceneForStorage] Server base64 upload notice:', e);
    }

    // If server upload not possible, fallback to local reference to avoid exceeding 1MB limit
    updatedScene.mapUrl = `local:scene_${updatedScene.sceneId}`;
  }

  // 3. Never allow a browser-local blob: URL to be stored in Firestore
  if (updatedScene.mapUrl && updatedScene.mapUrl.startsWith('blob:')) {
    const uploaded = await uploadBlobUrlToServer(updatedScene.mapUrl, updatedScene.sceneTitle || updatedScene.sceneId || 'map');
    updatedScene.mapUrl = !uploaded.startsWith('blob:') ? uploaded : (updatedScene.mapThumbnailUrl || '');
  }

  return updatedScene;
}

/**
 * Save or append a scene to a specific campaign and chapter
 */
export async function saveSceneToCampaign(
  campaignId: string,
  chapterId: string,
  scene: Scene
): Promise<Campaign> {
  const path = `campaigns/${campaignId}`;
  try {
    const docRef = doc(db, 'campaigns', campaignId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    const camp = snap.data() as Campaign;
    const sanitizedScene = await sanitizeSceneForStorage({
      ...scene,
      updatedAt: Date.now()
    });
    let foundChapter = false;

    const updatedChapters = camp.chapters.map(ch => {
      if (ch.chapterId === chapterId) {
        foundChapter = true;
        const sceneExists = ch.scenes.some(s => s.sceneId === sanitizedScene.sceneId);
        const updatedScenes = sceneExists
          ? ch.scenes.map(s => {
              if (s.sceneId !== sanitizedScene.sceneId) return s;
              // Safe non-destructive deep merge: preserves all existing scene fields and properties
              return {
                ...s,
                ...sanitizedScene,
                // Preserve roomAnnotations & labels when explicitly provided on sanitizedScene
                roomAnnotations: Array.isArray(sanitizedScene.roomAnnotations)
                  ? sanitizedScene.roomAnnotations
                  : normalizeRoomAnnotations(s.roomAnnotations || [], sanitizedScene.sceneId, campaignId),
                // Critical safeguard: Never overwrite non-empty walls with an empty array
                walls: (sanitizedScene.walls && sanitizedScene.walls.length > 0)
                  ? sanitizedScene.walls
                  : (s.walls || []),
                // Critical safeguard: Never overwrite non-empty tokens with an empty array
                tokens: (sanitizedScene.tokens && sanitizedScene.tokens.length > 0)
                  ? sanitizedScene.tokens
                  : (s.tokens || []),
                updatedAt: Date.now()
              };
            })
          : [...ch.scenes, sanitizedScene];
        return {
          ...ch,
          scenes: updatedScenes
        };
      }
      return ch;
    });

    if (!foundChapter) {
      // Create chapter if not found
      updatedChapters.push({
        chapterId,
        chapterTitle: 'Chapter 1',
        orderIndex: updatedChapters.length,
        scenes: [sanitizedScene]
      });
    }

    const updatedCamp: Campaign = {
      ...camp,
      chapters: updatedChapters,
      updatedAt: Date.now()
    };

    const payload = cleanForFirestore(updatedCamp);
    await setDoc(docRef, payload, { merge: true });
    return updatedCamp;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Create a new campaign containing an initial chapter and scene
 */
export async function createCampaignWithScene(
  campaignTitle: string,
  chapterTitle: string,
  scene: Scene
): Promise<Campaign> {
  const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const chapterId = `chap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `campaigns/${campaignId}`;

  const sanitizedScene = await sanitizeSceneForStorage(scene);

  const newCampaign: Campaign = {
    campaignId,
    campaignTitle: campaignTitle.trim() || 'New Campaign',
    description: 'Created from Tactical Canvas',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chapters: [
      {
        chapterId,
        chapterTitle: chapterTitle.trim() || 'Act I: The Journey Begins',
        orderIndex: 0,
        scenes: [sanitizedScene]
      }
    ]
  };

  try {
    const docRef = doc(db, 'campaigns', campaignId);
    const payload = cleanForFirestore(newCampaign);
    await setDoc(docRef, payload);
    return newCampaign;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Test whether an image or video URL can actually be decoded and loaded
 */
export function testMediaAccessible(url: string, timeoutMs = 6000): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    if (url.startsWith('data:')) return resolve(true);
    if (url.startsWith('blob:')) {
      fetch(url, { method: 'HEAD' })
        .then(res => resolve(res.ok || res.status === 200))
        .catch(() => resolve(false));
      return;
    }

    const isVideo = isVideoAsset(url);

    // Fast check for local server-hosted assets (e.g. /uploads/...)
    if (url.startsWith('/')) {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
        resolve(false);
      }, timeoutMs);

      fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      })
        .then(res => {
          clearTimeout(timer);
          resolve(res.ok || res.status === 200 || res.status === 206);
        })
        .catch(() => {
          // If HEAD fails on custom server router, try a 1-byte Range GET
          fetch(url, {
            headers: { Range: 'bytes=0-0' },
            signal: controller.signal
          })
            .then(res => {
              clearTimeout(timer);
              resolve(res.ok || res.status === 200 || res.status === 206);
            })
            .catch(() => {
              clearTimeout(timer);
              resolve(false);
            });
        });
      return;
    }

    if (isVideo) {
      const video = document.createElement('video');
      let timer: any = null;
      let settled = false;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        video.onloadedmetadata = null;
        video.oncanplay = null;
        video.onerror = null;
        video.src = '';
      };

      const handleSuccess = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(true);
      };

      const handleFailure = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(false);
      };

      video.onloadedmetadata = handleSuccess;
      video.oncanplay = handleSuccess;
      video.onerror = handleFailure;

      timer = setTimeout(() => {
        handleFailure();
      }, timeoutMs);

      video.preload = 'metadata';
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.src = url;
      return;
    }

    const img = new Image();
    let timer: any = null;
    let settled = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    };

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    }, timeoutMs);

    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

/**
 * Backward-compatible alias for testMediaAccessible
 */
export const testImageAccessible = testMediaAccessible;

/**
 * Resolves the best available high-resolution map source for a scene, checking:
 * 1. Client-side IndexedDB full-fidelity cache (under sceneId, mapUrl, assetId, or title)
 * 2. Matching asset in uploadedAssets library (and its full-res IndexedDB cache)
 * 3. Server or remote URL (testing for accessibility)
 * 4. local: storage identifier
 * 5. Scene mapThumbnailUrl as fallback for images
 */
async function uploadBlobUrlToServer(blobUrl: string, nameHint = 'map'): Promise<string> {
  if (!blobUrl || !blobUrl.startsWith('blob:')) return blobUrl;
  try {
    const resp = await fetch(blobUrl);
    if (!resp.ok) return blobUrl;
    const blob = await resp.blob();
    const ext = blob.type.includes('png') ? '.png' : blob.type.includes('webp') ? '.webp' : blob.type.includes('mp4') ? '.mp4' : '.jpg';
    const cleanName = (nameHint || 'map').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const formData = new FormData();
    formData.append('file', blob, `${cleanName}${ext}`);
    const upRes = await fetch('/api/upload', { method: 'POST', body: formData });
    if (upRes.ok) {
      const data = await upRes.json();
      if (data?.url && !data.url.startsWith('blob:')) {
        console.log(`[resolveMapSource] Auto-uploaded local blob to server: ${data.url}`);
        return data.url;
      }
    }
  } catch (err) {
    console.warn('[resolveMapSource] Could not upload blob to server:', err);
  }
  return blobUrl;
}

export async function resolveMapSource(
  scene: Scene,
  uploadedAssetsList: UploadedAsset[] = []
): Promise<string> {
  if (!scene) return '';

  const isVideo = isVideoAsset(scene.mapUrl) || 
    (scene.mapUrl && (scene.mapUrl.endsWith('.mp4') || scene.mapUrl.endsWith('.webm') || scene.mapUrl.endsWith('.m4v'))) ||
    (uploadedAssetsList.some(a => (a.url === scene.mapUrl || a.assetId === scene.sceneId) && a.fileType === 'video'));

  // 0. Auto-recovery for known Guildhouse maps when URL is missing or stale
  if (scene.sceneId === 'scene-muimqdr3' || (scene.sceneTitle && scene.sceneTitle.toLowerCase().includes('2nd floor') && scene.sceneTitle.toLowerCase().includes('guild'))) {
    const isStale = !scene.mapUrl || scene.mapUrl.startsWith('blob:') || scene.mapUrl === scene.mapThumbnailUrl;
    if (isStale) {
      console.log(`[resolveMapSource] Auto-resolving Guildhouse 2nd Floor map for scene "${scene.sceneTitle}"`);
      return '/uploads/file-1792161971576-460009101.jpg';
    }
  }
  if (scene.sceneId === 'scene_1788902673803_yz0d' || (scene.sceneTitle && scene.sceneTitle.toLowerCase().includes('main level'))) {
    const isStale = !scene.mapUrl || scene.mapUrl.startsWith('blob:') || scene.mapUrl === scene.mapThumbnailUrl;
    if (isStale) {
      return '/uploads/file-1792161909096-684999544.jpg';
    }
  }

  // 1. FIRST: Check if scene.mapUrl is already an accessible server or HTTP URL (works across all computers!)
  if (scene.mapUrl && (scene.mapUrl.startsWith('/') || scene.mapUrl.startsWith('http')) && !scene.mapUrl.startsWith('blob:') && scene.mapUrl !== scene.mapThumbnailUrl) {
    const isAccessible = await testMediaAccessible(scene.mapUrl);
    if (isAccessible) {
      return scene.mapUrl;
    }
  }

  // 2. SECOND: Check matched asset in uploadedAssets library for an accessible server or HTTP URL
  if (uploadedAssetsList && uploadedAssetsList.length > 0) {
    const matched = uploadedAssetsList.find(a =>
      (a.thumbnailUrl && scene.mapThumbnailUrl && a.thumbnailUrl === scene.mapThumbnailUrl && a.url && !a.url.startsWith('blob:')) ||
      (a.assetId && (a.assetId === scene.sceneId || (scene.mapUrl && scene.mapUrl.includes(a.assetId)))) ||
      (a.url && scene.mapUrl && a.url === scene.mapUrl && !a.url.startsWith('blob:')) ||
      (a.name && (
        (scene.sceneTitle && a.name.toLowerCase().trim() === scene.sceneTitle.toLowerCase().trim()) ||
        (scene.mapUrl && !scene.mapUrl.startsWith('blob:') && a.name.toLowerCase().includes(scene.mapUrl.toLowerCase())) ||
        (scene.sceneTitle && (a.name.toLowerCase().includes(scene.sceneTitle.toLowerCase()) || scene.sceneTitle.toLowerCase().includes(a.name.toLowerCase())))
      ))
    );
    if (matched && matched.url && (matched.url.startsWith('/') || matched.url.startsWith('http')) && !matched.url.startsWith('blob:')) {
      const isAccessible = await testMediaAccessible(matched.url);
      if (isAccessible) {
        return matched.url;
      }
    }
  }

  // 3. THIRD: Check client IndexedDB for full-resolution cached version (and auto-upload any blob: to server!)
  try {
    const cachedScene = await getLocalAsset(`scene_${scene.sceneId}`);
    if (cachedScene) {
      console.log(`[resolveMapSource] Restored full-res map from IndexedDB for scene "${scene.sceneTitle}"`);
      return await uploadBlobUrlToServer(cachedScene, scene.sceneTitle || scene.sceneId);
    }
  } catch (e) {
    // ignore
  }

  if (scene.mapUrl) {
    try {
      const assetKey = scene.mapUrl.startsWith('local:') ? scene.mapUrl.replace('local:', '') : scene.mapUrl;
      const cachedByUrl = await getLocalAsset(assetKey);
      if (cachedByUrl) {
        return await uploadBlobUrlToServer(cachedByUrl, scene.sceneTitle || scene.sceneId);
      }
      const filename = scene.mapUrl.split('/').pop()?.split('?')[0];
      if (filename) {
        const cachedByFilename = await getLocalAsset(filename);
        if (cachedByFilename) {
          return await uploadBlobUrlToServer(cachedByFilename, filename);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (scene.sceneTitle) {
    try {
      const cachedByTitle = await getLocalAsset(scene.sceneTitle);
      if (cachedByTitle) {
        return await uploadBlobUrlToServer(cachedByTitle, scene.sceneTitle);
      }
    } catch (e) {
      // ignore
    }
  }

  // 4. Check matched asset's IndexedDB cache if server URL wasn't accessible yet
  if (uploadedAssetsList && uploadedAssetsList.length > 0) {
    const matched = uploadedAssetsList.find(a =>
      (a.thumbnailUrl && scene.mapThumbnailUrl && a.thumbnailUrl === scene.mapThumbnailUrl) ||
      (a.assetId && (a.assetId === scene.sceneId || (scene.mapUrl && scene.mapUrl.includes(a.assetId)))) ||
      (a.url && scene.mapUrl && a.url === scene.mapUrl) ||
      (a.name && scene.sceneTitle && (a.name.toLowerCase().includes(scene.sceneTitle.toLowerCase()) || scene.sceneTitle.toLowerCase().includes(a.name.toLowerCase())))
    );
    if (matched) {
      try {
        const cachedAsset = await getLocalAsset(matched.assetId) ||
                            (matched.url ? await getLocalAsset(matched.url) : null) ||
                            (matched.name ? await getLocalAsset(matched.name) : null);
        if (cachedAsset) {
          return await uploadBlobUrlToServer(cachedAsset, matched.name || matched.assetId);
        }
      } catch (e) {
        // ignore
      }
      if (matched.url && !matched.url.startsWith('blob:') && !matched.url.startsWith('local:')) {
        return matched.url;
      }
    }
  }

  // 5. If HTTP/server URL or data URL
  if (scene.mapUrl && (scene.mapUrl.startsWith('/') || scene.mapUrl.startsWith('http') || scene.mapUrl.startsWith('data:')) && !scene.mapUrl.startsWith('blob:') && scene.mapUrl !== scene.mapThumbnailUrl) {
    return scene.mapUrl;
  }

  // 6. If blob URL is active in the current window, auto-upload it to server so remote Player Views can load it
  if (scene.mapUrl && scene.mapUrl.startsWith('blob:') && scene.mapUrl !== scene.mapThumbnailUrl) {
    const isBlobActive = await testMediaAccessible(scene.mapUrl);
    if (isBlobActive) {
      return await uploadBlobUrlToServer(scene.mapUrl, scene.sceneTitle || scene.sceneId);
    }
    console.warn(`[resolveMapSource] Stale blob URL detected for scene "${scene.sceneTitle}": ${scene.mapUrl}. Seeking fallback.`);
  }

  // 7. Fallback to scene mapThumbnailUrl (base64 data URL) so remote displays never get a broken blob URL
  if (scene.mapThumbnailUrl) {
    return scene.mapThumbnailUrl;
  }

  if (scene.mapUrl && !scene.mapUrl.startsWith('blob:')) {
    return scene.mapUrl;
  }
  return '';
}

/**
 * Save an interactive map zone (Room Annotation with polygon geometry, room number, room name, notes, PDF link) to Firestore
 */
export async function saveMapZone(
  campaignId: string,
  sceneId: string,
  zone: RoomAnnotation
): Promise<RoomAnnotation> {
  const normalized = normalizeRoomAnnotation(zone, 0, sceneId || 'default', campaignId || 'default');
  const zoneId = normalized.id || `zone_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  const isLabel = normalized.type === 'label';
  const roomNumber = isLabel
    ? undefined
    : (normalized.roomNumber || (normalized.label ? normalized.label.split(/[\s\-:]/)[0] : '1'));
  const roomName = normalized.roomName || (normalized.label ? normalized.label.replace(/^.*?[\-:]\s*/, '') : (isLabel ? 'Map Label' : 'Zone'));
  const label = normalized.label || (isLabel ? roomName : `${roomNumber} - ${roomName}`);

  const zoneData: RoomAnnotation = {
    ...normalized,
    id: zoneId,
    type: isLabel ? 'label' : 'room',
    roomNumber,
    roomName,
    label,
    campaignId: campaignId || 'default',
    sceneId: sceneId || 'default',
    createdAt: normalized.createdAt || now,
    updatedAt: now
  };

  const path = `mapZones/${zoneId}`;
  try {
    const payload = cleanForFirestore(zoneData);
    // 1. Save to global/direct mapZones collection
    await setDoc(doc(db, 'mapZones', zoneId), payload, { merge: true });

    // 2. Also save to campaign subcollection if campaignId specified
    if (campaignId && campaignId !== 'default') {
      try {
        await setDoc(doc(db, 'campaigns', campaignId, 'zones', zoneId), payload, { merge: true });
      } catch (subErr) {
        console.warn('[saveMapZone] Note on campaign subcollection write:', subErr);
      }
    }

    return zoneData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function cleanupZonesExceptScene(campaignId: string, targetSceneId: string) {
    const q = query(collection(db, 'mapZones'), where('campaignId', '==', campaignId));
    const snap = await getDocs(q);
    const deletePromises: Promise<void>[] = [];
    snap.forEach(d => {
        const data = d.data();
        if (data.sceneId !== targetSceneId) {
            deletePromises.push(deleteDoc(doc(db, 'mapZones', d.id)));
        }
    });
    await Promise.all(deletePromises);
}
export async function fetchMapZones(
  campaignId: string,
  sceneId?: string
): Promise<RoomAnnotation[]> {
  const path = 'mapZones';
  try {
    const results: RoomAnnotation[] = [];
    const seenIds = new Set<string>();

    // 1. Query by campaignId if provided
    try {
      const q = campaignId 
        ? query(collection(db, 'mapZones'), where('campaignId', '==', campaignId))
        : query(collection(db, 'mapZones'));
      const snap = await getDocs(q);
      snap.forEach(d => {
        const item = d.data() as RoomAnnotation;
        if (!seenIds.has(item.id) && (!sceneId || item.sceneId === sceneId)) {
          seenIds.add(item.id);
          results.push(item);
        }
      });
    } catch (e) {
      console.warn('[fetchMapZones] Error querying mapZones by campaign:', e);
    }

    // 2. Also check campaign subcollection if campaignId provided
    if (campaignId && campaignId !== 'default') {
      try {
        const subSnap = await getDocs(collection(db, 'campaigns', campaignId, 'zones'));
        subSnap.forEach(d => {
          const item = d.data() as RoomAnnotation;
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            results.push(item);
          }
        });
      } catch (e) {
        // subcollection may be empty
      }
    }

    // Filter strictly by sceneId if provided (directly tied to the scene, just like walls and doors)
    const filtered = (sceneId && sceneId !== 'default')
      ? results.filter(z => z.sceneId === sceneId)
      : results;

    return normalizeRoomAnnotations(filtered, sceneId, campaignId);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Fetch details for a specific zone from Firestore
 */
export async function fetchZoneDetails(
  zoneId: string,
  campaignId?: string
): Promise<RoomAnnotation | null> {
  const path = `mapZones/${zoneId}`;
  try {
    // 1. Check direct mapZones document
    const snap = await getDoc(doc(db, 'mapZones', zoneId));
    if (snap.exists()) {
      return snap.data() as RoomAnnotation;
    }

    // 2. Check campaign subcollection if campaignId specified
    if (campaignId && campaignId !== 'default') {
      const subSnap = await getDoc(doc(db, 'campaigns', campaignId, 'zones', zoneId));
      if (subSnap.exists()) {
        return subSnap.data() as RoomAnnotation;
      }
    }

    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Delete a map zone from Firestore
 */
export async function deleteMapZone(
  zoneId: string,
  campaignId?: string
): Promise<void> {
  if (IS_ENTERPRISE_BETA && !zoneId.startsWith('beta_') && (!campaignId || !campaignId.startsWith('beta_'))) {
    console.warn('[Security Silo] Enterprise Beta cannot delete Stable mapZone:', zoneId);
    return;
  }
  if (!IS_ENTERPRISE_BETA && (zoneId.startsWith('beta_') || (campaignId && campaignId.startsWith('beta_')))) {
    console.warn('[Security Silo] Stable cannot delete Beta mapZone:', zoneId);
    return;
  }
  const path = `mapZones/${zoneId}`;
  try {
    await deleteDoc(doc(db, 'mapZones', zoneId));
    if (campaignId && campaignId !== 'default') {
      try {
        await deleteDoc(doc(db, 'campaigns', campaignId, 'zones', zoneId));
      } catch (e) {
        // ignore
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ----------------------------------------------------
// Monster Compendium Operations
// ----------------------------------------------------
import { Monster } from '../types/monster';
export type { Monster, MonsterTrait, MonsterAction, MonsterSpellcasting } from '../types/monster';

export async function saveMonster(monster: Monster): Promise<Monster> {
  let targetMonsterId = monster.monsterId || `monster_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  if (IS_ENTERPRISE_BETA) {
    if (!targetMonsterId.startsWith('beta_')) targetMonsterId = `beta_${targetMonsterId}`;
  } else {
    targetMonsterId = targetMonsterId.replace(/^beta_/, '');
  }
  const monsterId = targetMonsterId;
  const path = `monsters/${monsterId}`;
  const now = Date.now();

  let avatarUrl = monster.avatarUrl;
  let statblockImageUrl = monster.statblockImageUrl;

  // Cache large images in IndexedDB and convert via /api/upload-base64 if needed
  if (typeof statblockImageUrl === 'string' && statblockImageUrl.startsWith('data:')) {
    try {
      await saveLocalAsset(`statblock_${monsterId}`, statblockImageUrl);
      const res = await fetch('/api/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: statblockImageUrl, filename: `statblock_${monsterId}`, type: 'pdf' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) statblockImageUrl = data.url;
      } else {
        statblockImageUrl = `local:statblock_${monsterId}`;
      }
    } catch {
      statblockImageUrl = `local:statblock_${monsterId}`;
    }
  }

  if (typeof avatarUrl === 'string' && avatarUrl.startsWith('data:') && avatarUrl.length > 50000) {
    try {
      await saveLocalAsset(`avatar_${monsterId}`, avatarUrl);
      const res = await fetch('/api/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: avatarUrl, filename: `avatar_${monsterId}`, type: 'token' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) avatarUrl = data.url;
      } else {
        const thumb = await createThumbnailDataUrl(avatarUrl, 160, 0.6);
        avatarUrl = thumb || `local:avatar_${monsterId}`;
      }
    } catch {
      avatarUrl = `local:avatar_${monsterId}`;
    }
  }

  const cleanMonster: Monster = {
    ...monster,
    monsterId,
    avatarUrl,
    statblockImageUrl,
    createdAt: monster.createdAt || now,
    updatedAt: now,
    ...(IS_ENTERPRISE_BETA ? { isBeta: true } : {})
  };

  try {
    const docRef = doc(db, 'monsters', monsterId);
    let payload = cleanForFirestore(cleanMonster);

    // Safeguard against oversized documents
    if (JSON.stringify(payload).length > 200000) {
      payload = {
        ...payload,
        statblockImageUrl: payload.statblockImageUrl?.startsWith('data:') ? `local:statblock_${monsterId}` : payload.statblockImageUrl,
        avatarUrl: payload.avatarUrl?.startsWith('data:') ? `local:avatar_${monsterId}` : payload.avatarUrl
      };
    }

    await setDoc(docRef, payload, { merge: true });
    return cleanMonster;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function getMonstersList(): Promise<Monster[]> {
  const path = 'monsters';
  try {
    const colRef = collection(db, path);
    const snap = await getDocs(colRef);
    const list: Monster[] = snap.docs
      .map(d => ({
        ...(d.data() as Monster),
        monsterId: d.data().monsterId || d.id
      }))
      .filter(m => {
        const isBetaDoc = Boolean(m.monsterId.startsWith('beta_') || (m as any).isBeta);
        return IS_ENTERPRISE_BETA ? isBetaDoc : !isBetaDoc;
      });
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export function subscribeToMonsters(
  callback: (monsters: Monster[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = 'monsters';
  const colRef = collection(db, path);
  return onSnapshot(
    colRef,
    (snap) => {
      const list: Monster[] = snap.docs
        .map(d => ({
          ...(d.data() as Monster),
          monsterId: d.data().monsterId || d.id
        }))
        .filter(m => {
          const isBetaDoc = Boolean(m.monsterId.startsWith('beta_') || (m as any).isBeta);
          return IS_ENTERPRISE_BETA ? isBetaDoc : !isBetaDoc;
        });
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      callback(list);
    },
    (err) => {
      console.warn('subscribeToMonsters error:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export async function deleteMonster(monsterId: string): Promise<void> {
  if (IS_ENTERPRISE_BETA && !monsterId.startsWith('beta_')) {
    console.warn('[Security Silo] Enterprise Beta cannot delete Stable monster:', monsterId);
    return;
  }
  if (!IS_ENTERPRISE_BETA && monsterId.startsWith('beta_')) {
    console.warn('[Security Silo] Stable cannot delete Beta monster:', monsterId);
    return;
  }
  const path = `monsters/${monsterId}`;
  try {
    const docRef = doc(db, 'monsters', monsterId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ----------------------------------------------------
// Allies & Summons Compendium Operations
// ----------------------------------------------------
import { Ally } from '../types/ally';
export type { Ally, AllyTrait, AllyAction } from '../types/ally';

export async function saveAlly(ally: Ally): Promise<Ally> {
  let targetAllyId = ally.allyId || `ally_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  if (IS_ENTERPRISE_BETA) {
    if (!targetAllyId.startsWith('beta_')) targetAllyId = `beta_${targetAllyId}`;
  } else {
    targetAllyId = targetAllyId.replace(/^beta_/, '');
  }
  const allyId = targetAllyId;
  const path = `allies/${allyId}`;
  const now = Date.now();

  let avatarUrl = ally.avatarUrl;
  let statblockImageUrl = ally.statblockImageUrl;

  // Cache large images in IndexedDB and convert via /api/upload-base64 if needed
  if (typeof statblockImageUrl === 'string' && statblockImageUrl.startsWith('data:')) {
    try {
      await saveLocalAsset(`statblock_${allyId}`, statblockImageUrl);
      const res = await fetch('/api/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: statblockImageUrl, filename: `statblock_${allyId}`, type: 'pdf' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) statblockImageUrl = data.url;
      } else {
        statblockImageUrl = `local:statblock_${allyId}`;
      }
    } catch {
      statblockImageUrl = `local:statblock_${allyId}`;
    }
  }

  if (typeof avatarUrl === 'string' && avatarUrl.startsWith('data:') && avatarUrl.length > 50000) {
    try {
      await saveLocalAsset(`avatar_${allyId}`, avatarUrl);
      const res = await fetch('/api/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: avatarUrl, filename: `avatar_${allyId}`, type: 'token' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) avatarUrl = data.url;
      } else {
        const thumb = await createThumbnailDataUrl(avatarUrl, 160, 0.6);
        avatarUrl = thumb || `local:avatar_${allyId}`;
      }
    } catch {
      avatarUrl = `local:avatar_${allyId}`;
    }
  }

  const cleanAlly: Ally = {
    ...ally,
    allyId,
    avatarUrl,
    statblockImageUrl,
    category: 'ally',
    createdAt: ally.createdAt || now,
    updatedAt: now,
    ...(IS_ENTERPRISE_BETA ? { isBeta: true } : {})
  };

  try {
    const docRef = doc(db, 'allies', allyId);
    let payload = cleanForFirestore(cleanAlly);

    // Safeguard against oversized documents
    if (JSON.stringify(payload).length > 200000) {
      payload = {
        ...payload,
        statblockImageUrl: payload.statblockImageUrl?.startsWith('data:') ? `local:statblock_${allyId}` : payload.statblockImageUrl,
        avatarUrl: payload.avatarUrl?.startsWith('data:') ? `local:avatar_${allyId}` : payload.avatarUrl
      };
    }

    await setDoc(docRef, payload, { merge: true });
    return cleanAlly;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function getAlliesList(): Promise<Ally[]> {
  const path = 'allies';
  try {
    const colRef = collection(db, path);
    const snap = await getDocs(colRef);
    const list: Ally[] = snap.docs
      .map(d => ({
        ...(d.data() as Ally),
        allyId: d.data().allyId || d.id
      }))
      .filter(a => {
        const isBetaDoc = Boolean(a.allyId.startsWith('beta_') || (a as any).isBeta);
        return IS_ENTERPRISE_BETA ? isBetaDoc : !isBetaDoc;
      });
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export function subscribeToAllies(
  callback: (allies: Ally[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = 'allies';
  const colRef = collection(db, path);
  return onSnapshot(
    colRef,
    (snap) => {
      const list: Ally[] = snap.docs
        .map(d => ({
          ...(d.data() as Ally),
          allyId: d.data().allyId || d.id
        }))
        .filter(a => {
          const isBetaDoc = Boolean(a.allyId.startsWith('beta_') || (a as any).isBeta);
          return IS_ENTERPRISE_BETA ? isBetaDoc : !isBetaDoc;
        });
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      callback(list);
    },
    (err) => {
      console.warn('subscribeToAllies error:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export async function deleteAlly(allyId: string): Promise<void> {
  if (IS_ENTERPRISE_BETA && !allyId.startsWith('beta_')) {
    console.warn('[Security Silo] Enterprise Beta cannot delete Stable ally:', allyId);
    return;
  }
  if (!IS_ENTERPRISE_BETA && allyId.startsWith('beta_')) {
    console.warn('[Security Silo] Stable cannot delete Beta ally:', allyId);
    return;
  }
  const path = `allies/${allyId}`;
  try {
    const docRef = doc(db, 'allies', allyId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ----------------------------------------------------
// Character Compendium Operations
// ----------------------------------------------------
import { Character } from '../types/character';
export type { Character } from '../types/character';

export async function saveCharacter(character: Character): Promise<Character> {
  let targetCharacterId = character.id || `char_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  if (IS_ENTERPRISE_BETA) {
    if (!targetCharacterId.startsWith('beta_')) targetCharacterId = `beta_${targetCharacterId}`;
  } else {
    targetCharacterId = targetCharacterId.replace(/^beta_/, '');
  }
  const characterId = targetCharacterId;
  const path = `characters/${characterId}`;
  const now = Date.now();

  let avatarUrl = character.avatarUrl;
  let pdfUrl = character.pdfUrl;

  if (typeof avatarUrl === 'string' && avatarUrl.startsWith('data:') && avatarUrl.length > 50000) {
    try {
      await saveLocalAsset(`avatar_${characterId}`, avatarUrl);
      const res = await fetch('/api/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: avatarUrl, filename: `avatar_${characterId}`, type: 'token' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) avatarUrl = data.url;
      }
    } catch {
      avatarUrl = `local:avatar_${characterId}`;
    }
  }

  const cleanCharacter: Character = {
    ...character,
    id: characterId,
    avatarUrl,
    pdfUrl,
    createdAt: character.createdAt || now,
    updatedAt: now,
    ...(IS_ENTERPRISE_BETA ? { isBeta: true } : {})
  };

  try {
    const docRef = doc(db, 'characters', characterId);
    await setDoc(docRef, cleanForFirestore(cleanCharacter), { merge: true });
    return cleanCharacter;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export function subscribeToCharacters(
  callback: (characters: Character[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = 'characters';
  const colRef = collection(db, path);
  return onSnapshot(
    colRef,
    (snap) => {
      const list: Character[] = snap.docs
        .map(d => ({
          ...(d.data() as Character),
          id: d.data().id || d.id
        }))
        .filter(c => {
          const isBetaDoc = Boolean(c.id.startsWith('beta_') || (c as any).isBeta);
          return IS_ENTERPRISE_BETA ? isBetaDoc : !isBetaDoc;
        });
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      callback(list);
    },
    (err) => {
      console.warn('subscribeToCharacters error:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export async function deleteCharacter(characterId: string): Promise<void> {
  if (IS_ENTERPRISE_BETA && !characterId.startsWith('beta_')) {
    console.warn('[Security Silo] Enterprise Beta cannot delete Stable character:', characterId);
    return;
  }
  if (!IS_ENTERPRISE_BETA && characterId.startsWith('beta_')) {
    console.warn('[Security Silo] Stable cannot delete Beta character:', characterId);
    return;
  }
  const path = `characters/${characterId}`;
  try {
    const docRef = doc(db, 'characters', characterId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

