import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, cleanForFirestore, handleFirestoreError, OperationType, Campaign, IS_ENTERPRISE_BETA } from './firebase';
import { RoomAnnotation } from '../types';

export interface UpdateRoomAnnotationParams {
  campaignId?: string;
  chapterId?: string;
  sceneId?: string;
  zone: RoomAnnotation;
  activeSessionId?: string;
}

/**
 * Updates a Room Annotation / Map Zone across Firestore persistence tiers:
 * 1. Under campaigns/{campaignId} (modifying chapters[].scenes[].roomAnnotations[])
 * 2. Under direct mapZones/{zoneId} and campaigns/{campaignId}/zones/{zoneId}
 * 3. Under activeSession/{sessionId} if an active session is live
 */
export async function updateRoomAnnotation({
  campaignId,
  chapterId,
  sceneId,
  zone,
  activeSessionId
}: UpdateRoomAnnotationParams): Promise<RoomAnnotation> {
  const zoneId = zone.id;
  if (!zoneId) {
    throw new Error('RoomAnnotation must have a valid id to update');
  }

  const now = Date.now();
  const roomNumber = zone.roomNumber || (zone.label ? zone.label.split(/[\s\-:]/)[0] : '1');
  const roomName = zone.roomName || (zone.label ? zone.label.replace(/^.*?[\-:]\s*/, '') : 'Zone');
  const label = `${roomNumber ? `${roomNumber} - ` : ''}${roomName}`.trim();

  const updatedZone: RoomAnnotation = {
    ...zone,
    roomNumber,
    roomName,
    label: zone.label || label,
    campaignId: campaignId || zone.campaignId || 'default',
    sceneId: sceneId || zone.sceneId || 'default',
    updatedAt: now
  };

  const cleanedZone = cleanForFirestore(updatedZone);

  let targetCampaignId = campaignId;
  let targetSessionId = activeSessionId;
  if (IS_ENTERPRISE_BETA) {
    if (targetCampaignId && targetCampaignId !== 'default' && !targetCampaignId.startsWith('beta_')) {
      targetCampaignId = `beta_${targetCampaignId}`;
    }
    if (targetSessionId === 'current') {
      targetSessionId = 'beta_current';
    }
  } else {
    if (targetCampaignId && targetCampaignId.startsWith('beta_')) {
      console.warn('[Security Silo] Stable cannot modify Beta campaign:', targetCampaignId);
      return updatedZone;
    }
  }

  // 1. Update direct mapZones collection
  try {
    await setDoc(doc(db, 'mapZones', zoneId), cleanedZone, { merge: true });
  } catch (err) {
    console.warn('[updateRoomAnnotation] mapZones write warning:', err);
  }

  // 2. Update campaigns subcollection if targetCampaignId provided
  if (targetCampaignId && targetCampaignId !== 'default') {
    try {
      await setDoc(doc(db, 'campaigns', targetCampaignId, 'zones', zoneId), cleanedZone, { merge: true });
    } catch (err) {
      console.warn('[updateRoomAnnotation] campaigns subcollection write warning:', err);
    }

    // 3. Update the main Campaign document scene if chapterId and sceneId match
    try {
      const campRef = doc(db, 'campaigns', targetCampaignId);
      const campSnap = await getDoc(campRef);
      if (campSnap.exists()) {
        const campData = campSnap.data() as Campaign;
        let modified = false;

        const updatedChapters = (campData.chapters || []).map((ch) => {
          if (!chapterId || ch.chapterId === chapterId) {
            const updatedScenes = (ch.scenes || []).map((sc) => {
              if (!sceneId || sc.sceneId === sceneId) {
                const existingAnnos = sc.roomAnnotations || [];
                const exists = existingAnnos.some((a) => a.id === zoneId);
                const newAnnos = exists
                  ? existingAnnos.map((a) => (a.id === zoneId ? updatedZone : a))
                  : [...existingAnnos, updatedZone];

                modified = true;
                return {
                  ...sc,
                  roomAnnotations: newAnnos
                };
              }
              return sc;
            });

            return {
              ...ch,
              scenes: updatedScenes
            };
          }
          return ch;
        });

        if (modified) {
          await updateDoc(campRef, {
            chapters: cleanForFirestore(updatedChapters),
            updatedAt: now
          });
        }
      }
    } catch (campErr) {
      console.warn('[updateRoomAnnotation] Campaign document update warning:', campErr);
    }
  }

  // 4. Update activeSession document if targetSessionId provided
  if (targetSessionId) {
    try {
      const sessionRef = doc(db, 'activeSession', targetSessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const sessionData = sessionSnap.data();
        const existingAnnos: RoomAnnotation[] = sessionData.roomAnnotations || [];
        const exists = existingAnnos.some((a) => a.id === zoneId);
        const newAnnos = exists
          ? existingAnnos.map((a) => (a.id === zoneId ? updatedZone : a))
          : [...existingAnnos, updatedZone];

        await updateDoc(sessionRef, {
          roomAnnotations: cleanForFirestore(newAnnos),
          updatedAt: now
        });
      }
    } catch (sessionErr) {
      console.warn('[updateRoomAnnotation] Active session sync warning:', sessionErr);
    }
  }

  return updatedZone;
}
