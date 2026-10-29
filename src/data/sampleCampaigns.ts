import type { Campaign } from '../lib/firebase';
import rawSample1 from './sampleCampaign1.json';
import rawSample2 from './sampleCampaign2.json';

export const SAMPLE_CAMPAIGN_1: Campaign = rawSample1 as unknown as Campaign;
export const SAMPLE_CAMPAIGN_2: Campaign = rawSample2 as unknown as Campaign;

export const SAMPLE_CAMPAIGNS: Campaign[] = [
  SAMPLE_CAMPAIGN_1,
  SAMPLE_CAMPAIGN_2
];

export function getSampleCampaign(id: string): Campaign | undefined {
  return SAMPLE_CAMPAIGNS.find(c => c.campaignId === id || c.inviteCode === id);
}

export function isSampleCampaign(id: string): boolean {
  return SAMPLE_CAMPAIGNS.some(c => c.campaignId === id || c.inviteCode === id);
}
