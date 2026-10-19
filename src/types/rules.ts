export interface ConditionDetail {
  id: string;
  name: string;
  description: string;
  bulletPoints: string[];
  tacticalTip?: string;
  badgeColor?: string;
}

export interface RuleTopic {
  id: string;
  category: 'Combat' | 'Movement & Environment' | 'Spellcasting' | 'Ability Checks' | 'Conditions';
  title: string;
  summary: string;
  content: string;
  quickReference?: string[];
}
