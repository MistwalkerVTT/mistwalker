import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  limit
} from 'firebase/firestore';
import { db, saveCampaignDoc, getCampaignsList } from './firebase';
import type { Campaign } from './firebase';
import type { CampaignMember, ClaimableHero, UserAccount } from '../types/auth';

// 6-character alphabet omitting easily confused chars (0, O, 1, I, L)
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateInviteCode(length = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * CODE_ALPHABET.length);
    result += CODE_ALPHABET[idx];
  }
  return result;
}

export function formatInviteCode(code: string): string {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length > 3) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
  }
  return clean;
}

export const formatRoomCode = formatInviteCode;

/**
 * Finds a campaign by its 6-character invite code
 */
export async function findCampaignByInviteCode(inviteCode: string): Promise<Campaign | null> {
  const normalized = inviteCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!normalized) return null;

  try {
    const q = query(
      collection(db, 'campaigns'),
      where('inviteCode', '==', normalized),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Campaign;
    }

    // Fallback: Check local campaigns list in case Firestore index isn't created yet
    const allCampaigns = await getCampaignsList();
    const found = allCampaigns.find(c => {
      const cCode = c.inviteCode?.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return cCode === normalized;
    });
    return found || null;
  } catch (err) {
    console.warn('Error querying campaign by invite code:', err);
    // Offline / fallback scan
    try {
      const allCampaigns = await getCampaignsList();
      return allCampaigns.find(c => c.inviteCode?.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalized) || null;
    } catch {
      return null;
    }
  }
}

/**
 * Ensures a campaign has an inviteCode, ownerUid, and members map
 */
export async function ensureCampaignInvite(campaign: Campaign, currentUid?: string, currentName?: string): Promise<Campaign> {
  let modified = false;
  const updated: Campaign = { ...campaign };

  if (!updated.inviteCode) {
    updated.inviteCode = generateInviteCode();
    modified = true;
  }

  if (!updated.ownerUid && currentUid) {
    updated.ownerUid = currentUid;
    updated.ownerDisplayName = currentName || 'Dungeon Master';
    modified = true;
  }

  if (!updated.members) {
    updated.members = {};
    if (updated.ownerUid) {
      updated.members[updated.ownerUid] = {
        uid: updated.ownerUid,
        displayName: updated.ownerDisplayName || 'Dungeon Master',
        role: 'dm',
        joinedAt: Date.now()
      };
    }
    modified = true;
  }

  if (modified) {
    try {
      await saveCampaignDoc(updated);
    } catch (err) {
      console.warn('Failed to persist invite code to campaign:', err);
    }
  }

  return updated;
}

/**
 * Joins a user to a campaign via invite code
 */
export async function joinCampaignWithCode(
  inviteCode: string,
  user: UserAccount
): Promise<{ campaign: Campaign; member: CampaignMember }> {
  const campaign = await findCampaignByInviteCode(inviteCode);
  if (!campaign) {
    throw new Error(`No active campaign found for invite code "${inviteCode}". Please verify with your DM.`);
  }

  const members = { ...(campaign.members || {}) };
  const existingRole = members[user.uid]?.role || (campaign.ownerUid === user.uid ? 'dm' : 'player');

  const member: CampaignMember = {
    uid: user.uid,
    displayName: user.displayName || 'Adventurer',
    avatarUrl: user.photoURL || undefined,
    role: existingRole,
    claimedHeroId: members[user.uid]?.claimedHeroId,
    claimedHeroName: members[user.uid]?.claimedHeroName,
    joinedAt: members[user.uid]?.joinedAt || Date.now(),
    lastActiveAt: Date.now()
  };

  members[user.uid] = member;
  const updatedCampaign: Campaign = {
    ...campaign,
    members,
    updatedAt: Date.now()
  };

  await saveCampaignDoc(updatedCampaign);
  return { campaign: updatedCampaign, member };
}

/**
 * Assigns or claims a hero character for a player
 */
export async function claimCampaignHero(
  campaign: Campaign,
  uid: string,
  heroId: string,
  heroName: string
): Promise<Campaign> {
  const members = { ...(campaign.members || {}) };
  if (!members[uid]) {
    members[uid] = {
      uid,
      displayName: 'Adventurer',
      role: campaign.ownerUid === uid ? 'dm' : 'player',
      joinedAt: Date.now()
    };
  }

  // Release any previous claim on this hero by other players
  Object.keys(members).forEach(memberUid => {
    if (memberUid !== uid && members[memberUid].claimedHeroId === heroId) {
      members[memberUid] = {
        ...members[memberUid],
        claimedHeroId: undefined,
        claimedHeroName: undefined
      };
    }
  });

  members[uid] = {
    ...members[uid],
    claimedHeroId: heroId,
    claimedHeroName: heroName,
    lastActiveAt: Date.now()
  };

  const updated: Campaign = {
    ...campaign,
    members,
    updatedAt: Date.now()
  };

  await saveCampaignDoc(updated);
  return updated;
}

/**
 * Collects list of claimable heroes across all chapters and scenes in the campaign
 */
export function extractClaimableHeroes(campaign: Campaign): ClaimableHero[] {
  const heroMap = new Map<string, ClaimableHero>();
  const members = campaign.members || {};

  // Build reverse lookup of claimed heroes
  const claimedByMap: Record<string, { uid: string; name: string }> = {};
  Object.values(members).forEach(m => {
    if (m.claimedHeroId) {
      claimedByMap[m.claimedHeroId] = { uid: m.uid, name: m.displayName };
    }
  });

  if (campaign.chapters) {
    for (const chapter of campaign.chapters) {
      if (chapter.scenes) {
        for (const scene of chapter.scenes) {
          if (scene.tokens) {
            for (const token of scene.tokens) {
              // Collect tokens identified as player characters or heroes
              if (token.isPlayerToken || (token as any).isHero || (token as any).characterId) {
                const id = (token as any).characterId || token.id;
                if (!heroMap.has(id)) {
                  const claimInfo = claimedByMap[id];
                  heroMap.set(id, {
                    id,
                    name: token.name || 'Hero',
                    avatarUrl: (token as any).imageUrl || (token as any).avatarUrl,
                    hp: (token as any).hp,
                    maxHp: (token as any).maxHp,
                    isClaimed: !!claimInfo,
                    claimedByUid: claimInfo?.uid,
                    claimedByName: claimInfo?.name
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return Array.from(heroMap.values());
}
