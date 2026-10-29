export type SubscriptionTier = 'free' | 'pro_dm' | 'studio';

export interface UserAccount {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  isAnonymous: boolean;
  tier: SubscriptionTier;
  createdAt: number;
  lastLoginAt: number;
}

export type CampaignRole = 'dm' | 'co_dm' | 'player' | 'spectator';

export interface CampaignMember {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  role: CampaignRole;
  claimedHeroId?: string;
  claimedHeroName?: string;
  joinedAt: number;
  lastActiveAt?: number;
}

export interface ClaimableHero {
  id: string;
  name: string;
  avatarUrl?: string;
  classLevel?: string;
  hp?: number;
  maxHp?: number;
  isClaimed?: boolean;
  claimedByUid?: string;
  claimedByName?: string;
}
