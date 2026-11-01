import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db, IS_ENTERPRISE_BETA } from '../lib/firebase';
import { ScenePlayInstance } from '../types';

const getCacheKey = (sceneId: string) => `mistwalker_play_instances_${sceneId}`;

/**
 * Read cached play instances from localStorage for zero-latency initial UI render
 */
export function getLocalCachedSceneInstances(sceneId: string): ScenePlayInstance[] {
  if (!sceneId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getCacheKey(sceneId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (err) {
    console.warn('[sceneInstanceService] Failed to read local cached instances:', err);
    return [];
  }
}

/**
 * Save updated instances list to localStorage cache
 */
function setLocalCachedSceneInstances(sceneId: string, instances: ScenePlayInstance[]): void {
  if (!sceneId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(getCacheKey(sceneId), JSON.stringify(instances));
  } catch (err) {
    console.warn('[sceneInstanceService] Failed to cache instances locally:', err);
  }
}

/**
 * List all saved runtime play instances for a specific scene, sorted by updatedAt descending.
 * Falls back seamlessly to localStorage cache if network is offline or Firestore is unreachable.
 */
export async function listSceneInstances(sceneId: string): Promise<ScenePlayInstance[]> {
  if (!sceneId) return [];

  const localFallback = getLocalCachedSceneInstances(sceneId);

  try {
    const colRef = collection(db, 'scenePlayInstances');
    const q = query(colRef, where('sceneId', '==', sceneId));
    const snap = await getDocs(q);

    let items: ScenePlayInstance[] = snap.docs.map(d => {
      const data = d.data() as ScenePlayInstance;
      return {
        ...data,
        instanceId: data.instanceId || d.id
      };
    });

    // Dual-domain beta isolation filter
    items = items.filter(inst => {
      const isBetaDoc = Boolean(inst.instanceId?.startsWith('beta_') || (inst as any).isBeta);
      return IS_ENTERPRISE_BETA ? isBetaDoc : !isBetaDoc;
    });

    // Sort descending by most recent update
    items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    // Update local offline cache with authoritative cloud data
    setLocalCachedSceneInstances(sceneId, items);

    return items;
  } catch (error) {
    console.warn(`[sceneInstanceService] Firestore listSceneInstances failed for ${sceneId}, using local cache:`, error);
    return localFallback;
  }
}

/**
 * Save or overwrite a ScenePlayInstance document in Firestore.
 * Always syncs to localStorage fallback cache.
 */
export async function saveSceneInstance(
  payload: Omit<ScenePlayInstance, 'instanceId' | 'createdAt' | 'updatedAt'>,
  existingInstanceId?: string
): Promise<ScenePlayInstance> {
  const now = Date.now();
  let instanceId = existingInstanceId;

  if (!instanceId) {
    const rand = Math.random().toString(36).substring(2, 9);
    instanceId = `playinst_${now}_${rand}`;
  }

  if (IS_ENTERPRISE_BETA) {
    if (!instanceId.startsWith('beta_')) instanceId = `beta_${instanceId}`;
  } else {
    instanceId = instanceId.replace(/^beta_/, '');
  }

  // Find existing instance in local cache to preserve original createdAt if overwriting
  const existingLocal = getLocalCachedSceneInstances(payload.sceneId).find(i => i.instanceId === instanceId);
  const createdAt = existingLocal?.createdAt || now;

  const instanceRecord: ScenePlayInstance = {
    ...payload,
    instanceId,
    createdAt,
    updatedAt: now
  };

  // 1. Update localStorage cache immediately for zero-lag UI responsiveness
  const currentList = getLocalCachedSceneInstances(payload.sceneId);
  const updatedList = [
    instanceRecord,
    ...currentList.filter(i => i.instanceId !== instanceId)
  ].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  setLocalCachedSceneInstances(payload.sceneId, updatedList);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, 'scenePlayInstances', instanceId);
    await setDoc(docRef, instanceRecord, { merge: true });
  } catch (error) {
    console.warn(`[sceneInstanceService] Cloud save failed for ${instanceId}, kept in local cache:`, error);
  }

  return instanceRecord;
}

/**
 * Delete a ScenePlayInstance from Firestore and local cache.
 */
export async function deleteSceneInstance(instanceId: string, sceneId: string): Promise<void> {
  if (!instanceId) return;

  // 1. Remove from local cache immediately
  if (sceneId) {
    const currentList = getLocalCachedSceneInstances(sceneId);
    const updatedList = currentList.filter(i => i.instanceId !== instanceId);
    setLocalCachedSceneInstances(sceneId, updatedList);
  }

  // 2. Delete from Firestore
  try {
    const docRef = doc(db, 'scenePlayInstances', instanceId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`[sceneInstanceService] Cloud delete failed for ${instanceId}:`, error);
  }
}
