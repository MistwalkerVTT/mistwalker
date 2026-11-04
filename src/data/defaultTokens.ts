// src/data/defaultTokens.ts
// Curated catalog of standard default tokens and D&D 5e conditions for MistWalker VTT

export interface AvailableTokenItem {
  name: string;
  url: string;
  category: 'character' | 'monster' | 'ally';
  size?: number;
}

export const AVAILABLE_TOKENS: AvailableTokenItem[] = [
  // Characters & Heroes
  { name: 'Varrak', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Varrak.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Brannoc', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Brannoc.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Aziza', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Aziza.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Noctua', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Noctua.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Aggie', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Aggie.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Burmi', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Burmi.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Rowan', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Rowan.png/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Stavros', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/DwarfStavros.jpg/:/rs=w:1440,h:1440', category: 'character', size: 1 },
  { name: 'Mayo', url: 'https://i.ibb.co/nNm5TBg2/Mayo.gif', category: 'character', size: 1 },

  // Monsters & Foes
  { name: 'Goblin', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 1 },
  { name: 'Skeleton', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 1 },
  { name: 'Orc Warrior', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 1 },
  { name: 'Young Red Dragon', url: 'https://images.unsplash.com/photo-1577493340887-b7bdef030977?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 2 },
  { name: 'Beholder', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 2 },
  { name: 'Mimic', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 1 },
  { name: 'Dire Wolf', url: 'https://images.unsplash.com/photo-1564865878688-9a244444042a?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 2 },
  { name: 'Zombie', url: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=300&q=80', category: 'monster', size: 1 },
  { name: 'Mushu', url: 'https://i.ibb.co/tPQBm3DZ/Mushu.gif', category: 'monster', size: 1 },
  { name: 'Spiritual Weapon', url: 'https://i.ibb.co/b5hZS9HG/Spirit-Weapon.gif', category: 'ally', size: 1 },
];

export const CONDITIONS = [
  { name: 'Poisoned', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/poisoned.png/:/rs=w:1440,h:1440' },
  { name: 'Prone', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/prone.png/:/rs=w:1440,h:1440' },
  { name: 'Unconscious', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/unconcious.png/:/rs=w:1440,h:1440' },
  { name: 'Grappled', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/grappled.png/:/rs=w:1440,h:1440' },
  { name: 'Paralyzed', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Paralyzed.png/:/rs=w:1440,h:1440' },
  { name: 'Frightened', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Frightened.png/:/rs=w:1440,h:1440' },
  { name: 'Petrified', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/petrified.png/:/rs=w:1440,h:1440' },
  { name: 'Deafened', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Deafened.png/:/rs=w:1440,h:1440' },
  { name: 'Charmed', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Charmed.png/:/rs=w:1440,h:1440' },
  { name: 'Bloodied', url: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Bloodied.png/:/rs=w:1440,h:1440' },
];

export const DND_CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Exhaustion',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
  'Bloodied'
];
