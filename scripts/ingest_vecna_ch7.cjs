const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

const NOW = Date.now();

function makeZone(id, sceneId, roomNumber, roomName, xPct, yPct, wPct, hPct, color, boxedText, dmNotes, monsters = [], treasure = []) {
  return {
    id,
    campaignId: 'vecna-eve-of-ruin',
    sceneId,
    roomNumber,
    roomName,
    label: `${roomNumber} - ${roomName}`,
    pdfSection: 'Tomb of Wayward Souls',
    color,
    boxedText,
    dmNotes,
    monsters,
    treasure,
    bounds: { x: xPct, y: yPct, width: wPct, height: hPct },
    polygonPoints: [
      xPct, yPct,
      xPct + wPct, yPct,
      xPct + wPct, yPct + hPct,
      xPct, yPct + hPct,
    ],
    updatedAt: NOW,
  };
}

function makeToken(id, name, x, y, size = 1, isPlayer = false, hp = 50, maxHp = 50, ac = 15, monsterName = '', avatarUrl = '') {
  return {
    id,
    name,
    category: isPlayer ? 'character' : 'monster',
    isPlayer,
    isMonster: !isPlayer,
    monsterName: monsterName || name,
    ...(avatarUrl ? { avatarUrl } : {}),
    size,
    x,
    y,
    hp,
    maxHp,
    ac,
    visionEnabled: true,
    visionRadius: isPlayer ? 60 : 60,
  };
}

const ROOMS = [
  {
    roomNumber: 'Lagoon',
    roomName: 'Isle of Serpents Lagoon (Kraken Attack!)',
    sceneTitle: 'Isle of Serpents Lagoon',
    boxedText: 'You feel warm sea air as you gaze upon the craggy shore of an island lagoon. Rising from the lagoon\'s depths are tentacles that lash toward the beach at a group of panicked people dressed in hiking gear.',
    dmNotes: 'Characters emerge from the Sigil portal in a ground-level cliff opening overlooking the lagoon. A wounded Kraken (250 HP remaining) attacks 15 archaeologists (Laysa Matulin [Assassin], Talo Yieria & Vogren Starcloak [Priests], Marian Xavere [Mage], + 11 Commoners). If the party joins, the Kraken focuses on them while the archaeologists retreat. If they do not, the Kraken eats 8 commoners and sinks.',
    monsters: ['Kraken (250 HP)', 'Laysa Matulin (Assassin)', 'Talo Yieria (Priest)', 'Vogren Starcloak (Priest)', 'Marian Xavere (Mage)', '11x Archaeologist (Commoner)'],
    treasure: [],
  },
  {
    roomNumber: 'Camp',
    roomName: 'Archaeologist Camp',
    sceneTitle: 'Archaeologist Camp',
    boxedText: 'The tents here sit between the shore and the jungle. Armor and digging equipment lie scattered across the sand. To one side, two men—an elf and an orc—tend to wounded colleagues. They each have a symbol of an arc of seven stars hanging from their necks, and their hands glow with divine magic. On the opposite side of camp, a human woman pores over a spellbook.',
    dmNotes: 'Laysa gives the party her rough map (Map 7.2) and asks them to recover 6 Stolen Treasures (5x 500 gp gems each): T9 Ebony Wand, T13 Ring of Golden Stars, T17 Sacred Scimitar, T19 Copper Tablets, T23 Crystal Orb, T27 Blue Silk Sash. Talo & Vogren offer healing & advise reciprocity/respect for island spirits. Marian Xavere lends her Lantern of Revealing freely and her Gem of Seeing on a DC 18 Persuasion check. POWER OF SECRETS — Marian\'s Secret: she once admired Acererak and considered studying necromancy.',
    monsters: ['Laysa Matulin', 'Talo Yieria', 'Vogren Starcloak', 'Marian Xavere'],
    treasure: ['Lantern of Revealing (loan)', 'Gem of Seeing (DC 18 Persuasion loan)', 'Up to 30x 500 gp gemstones (5 per returned treasure)'],
  },
  {
    roomNumber: 'T1',
    roomName: 'False Entrance (Explosion Trap)',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'This wide corridor ends at two stone doors with metal handles. At the entrance, the archaeologists posted symbols for "danger" and "fire."',
    dmNotes: 'Fake doors; solid wall behind. Explosion Trap: Stepping inside drops a ceiling stone slab sealing the corridor and floods it with fire—DC 20 Dex save, 28 (8d6) fire damage (half on save). Slab resets at dawn or can be lifted with DC 18 Strength (Athletics).',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T2',
    roomName: 'False Entrance (Arrow Trap)',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'Strange pockmarks line the walls of this corridor, at the end of which is a set of dark wooden doors.',
    dmNotes: 'Arrow Trap: Entering or ending turn in trapped area triggers DC 20 Dex save, 27 (6d8) piercing damage (half on save). East 5-ft edge is safe. Fake doors bear clue for T4: "Acererak commends you! Alas, these doors lead nowhere, but your skill shall not go unrewarded. Should you wish to plumb the depths of my tomb, heed these words: the blue one craves your magic."',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T3',
    roomName: 'Tomb Entrance',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'This hallway has been partially excavated. Lifted stone lids reveal a ten-foot-deep pit filled with spikes in the center of the corridor. A thin plank of wood is laid over the pit to allow for safe crossing.',
    dmNotes: 'Plank allows safe crossing. Falling in deals 5 (1d10) piercing damage (difficult terrain). Hidden door at the bottom of the pit on the northeast wall leads to T5 (Cave of Seven Casks).',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T4',
    roomName: 'Face of the Great Blue Devil',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'A relief of a scowling, fiendish face made of azure mosaic tiles spans the hallway\'s back wall. The face\'s mouth is open, revealing a black maw, and its eyes are carved from clouded white crystal. To the right of the mosaic is a closed door.',
    dmNotes: 'Mouth Portal (Conjuration): 10-ft wide; anything entering is teleported to T14 (Juggernaut Arena). Opening the Devil\'s Door (Abjuration): Cast leveled spells within 5 ft of relief; it absorbs spell slots (no effect) until reaching 6+ total spell levels, then opens door to T6 for 10 minutes.',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T5',
    roomName: 'Cave of Seven Casks',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'Crooked wooden planks line the floor of this cave. Seven casks are embedded along one wall. Each cask has a different symbol painted on it, with a spigot beneath it. Cups and tankards line shelves on the opposite wall.',
    dmNotes: 'Celestial poem on shelves clues the 7 casks (L-to-R): 1. Green Star (DC 20 Con or 5d8 necrotic), 2. Blue Square (Potion of Diminution—too small for 1-in cracks? Actually says Tiny size can\'t fit!), 3. Green Crescent Moon (Elixir of Health), 4. RED SQUARE (Potion of Gaseous Form—SOLUTION to pass through 1-inch floorboards to basement tunnel to T8!), 5. Blue Circle (Potion of Growth), 6. Green Circle (mundane toxic: DC 25 Con or poisoned 1 hr), 7. Red Star (DC 20 Con or paralyzed 1 hr).',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T6',
    roomName: 'Hall of Gemstones',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'Rows of colorful jewels line this corridor\'s walls. At the east end stands an emerald-colored statue of a crashing wave, the words "This wave is green" carved into its base. A door is set in the corridor\'s south wall.',
    dmNotes: 'DC 20 Investigation (1 min) spots the one real emerald (1,000 gp) among worthless crystal. Placing it in statue\'s base unlocks door to T16. Touching any fake jewel fires a 30x5 ft cold blast (DC 20 Dex save, 33 [6d10] cold damage, half on save).',
    monsters: [],
    treasure: ['Emerald (1,000 gp)'],
  },
  {
    roomNumber: 'T7',
    roomName: 'Skeleton Closet',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'A moldering skeleton draped in cobwebs sits in one corner of this small room. A gold choker set with a large black stone hangs around the skeleton\'s neck.',
    dmNotes: 'Necklace Trap (Necromancy): First touch triggers 5-ft radius burst—DC 22 Con save, 36 (8d8) necrotic damage (half on save). Afterward becomes a mundane choker worth 1,200 gp. Hidden door leads to T8.',
    monsters: [],
    treasure: ['Gold & black-stone choker (1,200 gp)'],
  },
  {
    roomNumber: 'T8',
    roomName: 'Room of Myriad Archways',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'Each wall of this octagonal room contains a stone archway. A veil of white fog fills the room.',
    dmNotes: 'Magical fog can\'t be dispelled. Archways: N -> one-way portal to T3; NE -> tunnel to T11; E -> one-way portal to T20a (Void Closet); SE -> hidden door to T7; S -> one-way portal to T14 (Juggernaut Arena); SW -> dirt tunnel under T5; W -> one-way portal to T20b (Void Closet); NW -> mossy tunnel to T9.',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T9',
    roomName: 'Forest of Spirits Mirage',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'You arrive at an expansive glade of trees. Bobbing lights flit between the branches, and at the center of the glade stands a towering banyan tree wrapped in sickly looking vines. A path winds through the glade but disappears when you try to focus closely on it.',
    dmNotes: 'Tactile mirage linked to Abalahin (neutral Treant). Remove Curse dissolves strangling vines; grateful Abalahin suppresses mirage revealing exits. 1d8 Bobbing Spirit Lights (Will-o\'-Wisps, Passive Perception 17+ hears hints about T10 crushing trap, Rerak, T19 library, Jade Serpents). DC 15 Persuasion or DC 25 Sleight of Hand to get the Ebony Wand.',
    monsters: ['Abalahin (Treant)', '1d8 Will-o\'-Wisp'],
    treasure: ['+3 Wand of the War Mage (Ebony wand — Laysa Treasure #1)'],
  },
  {
    roomNumber: 'T10',
    roomName: 'Crushing Room Trap',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'A click sounds from above. The room\'s ceiling begins descending rapidly.',
    dmNotes: 'Roll initiative; piston-like 20-ft ceiling drops to 6 inches above floor on Initiative count 20 for 1 minute. DC 20 Dex save or 55 (10d10) bludgeoning + prone (save = rush out for 0 dmg or stay for half). Small+ creature can make DC 20 Str save instead (takes 55 dmg either way; success = 0 dmg to others this round). Immovable Rod stops it.',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T11',
    roomName: 'Strange Altar',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'A dark, triangular altar stands in the center of this chamber. Carved into each side of the altar is a niche containing a chest. One chest is plated with gold, one is plated with silver, and the last is plated with lead.',
    dmNotes: 'Gold Chest (100 gp + 100 gp), Silver Chest (50 gp + 750 gp electrum/amethyst dagger), Lead Chest (Spell Scroll of Knock, valued at 200 gp). Removing a chest/contents without replacing equal+ value within 1 minute triggers: Gold -> 6x Swarms of Poisonous Snakes; Silver -> 15-ft necrotic burst (DC 17 Con, 4d8); Lead -> hostile Death Knight!',
    monsters: ['6x Swarm of Poisonous Snakes (trap)', 'Death Knight (trap)'],
    treasure: ['100 gp Gold Chest + 100 gp', '50 gp Silver Chest + 750 gp Ceremonial Dagger', 'Spell Scroll of Knock'],
  },
  {
    roomNumber: 'T12',
    roomName: 'Room of Respite',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'A marble gazebo with a fountain at its center is surrounded by flowering bushes.',
    dmNotes: 'Safe room! Drinking from the fountain restores 21 (6d6) HP (once per creature per dawn).',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T13',
    roomName: 'Celestial Sky Mirage',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'You\'re transported to a grassy field with a starry night sky above you.',
    dmNotes: 'Concealed by hidden door. Tactile mirage over a bare room with a black box on a dais. Truesight or DC 14 Nature (notices stars are wholly inaccurate) pierces illusion. Box Trap: DC 15 Investigation spots poisoned darts; DC 15 Sleight of Hand disarms; DC 20 Sleight of Hand or Knock unlocks (otherwise DC 20 Dex or 4d4 piercing + poisoned 1 hr).',
    monsters: [],
    treasure: ['Ring of Golden Stars (Laysa Treasure #2)'],
  },
  {
    roomNumber: 'T14',
    roomName: 'Juggernaut Arena',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'Thin, obsidian pillars are spaced throughout this musty room, the ceiling of which is only ten feet high. In the flickering light, you see two massive, rolling constructs roving the space.',
    dmNotes: 'Two Granite Juggernauts patrol between pillars and attack intruders. They stop immediately if the triangular stone in T15 (behind a hidden door) is destroyed.',
    monsters: ['2x Granite Juggernaut'],
    treasure: [],
  },
  {
    roomNumber: 'T15',
    roomName: 'Juggernaut Control Room',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'A five-foot-tall, triangular stone covered in runes stands in this bare room\'s center. At the top of the stone, a plum-sized diamond pulses with red light.',
    dmNotes: 'Hidden door from T14. DC 17 Arcana identifies runes. Stone has AC 20, 100 HP, immunity to poison, psychic, and nonmagical B/P/S. Destroying it deactivates both Granite Juggernauts in T14.',
    monsters: [],
    treasure: ['Plum-sized Diamond (5,000 gp)'],
  },
  {
    roomNumber: 'T16',
    roomName: 'Acid Pit Crossing',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'Filling most of this chamber is a ten-foot-deep pit of green acid, over which stretches a three-foot-wide stone bridge. Nozzles embedded in the north and south walls shoot blasts of air across the bridge.',
    dmNotes: 'Gust Nozzles: Moving onto/starting turn on bridge or flying above pit requires DC 20 Dex save or be pushed 5 ft N/S (random) + prone. Falling in acid deals 21 (6d6) acid damage immediately and at start of turn.',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T17',
    roomName: 'Jade Serpent Guardians\' Chamber',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'A jade statue stands between this room\'s two exits. The statue depicts an armored, feminine figure from the waist up, with six arms and a gleaming curved sword in each hand; from the waist down, the statue\'s body is serpentine. Two statues depicting large cobras with jade scales sit in alcoves to the east.',
    dmNotes: 'Hostile Constructs: Center = Marilith (Construct), 2x Cobras = Spirit Nagas (Constructs). Appeasement: Action + DC 20 Persuasion (advantage if offering 50+ gp food/treasure). Mentioning Laysa thrills them—they willingly surrender the Sword of Sharpness and share intel on T16 & T18!',
    monsters: ['Jade Serpent Champion (Marilith Construct)', '2x Jade Cobra (Spirit Naga Construct)'],
    treasure: ['Sword of Sharpness (Scimitar — Laysa Treasure #3)'],
  },
  {
    roomNumber: 'T18',
    roomName: 'Hall of Discordance',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'Eight niches are built into these walls. Each niche contains a musical instrument: a lute, a lyre, a viol, a flute, a drum, a dulcimer, a shawm, and a horn. At the end of the hallway is a double door emblazoned with two theater masks—one elated and one despairing.',
    dmNotes: 'Coming within 5 ft of any instrument triggers awful din: DC 20 Wis save, 16 (3d10) psychic (half on save), once. Mask Door ("Pay the toll, in blood or in song"): DC 20 Performance (disadvantage if not proficient; fail = 3d10 psychic) OR insert arms into both mouths (same PC = 8d6 piercing; two PCs = 4d6 each) to unlock.',
    monsters: [],
    treasure: ['8 Musical Instruments'],
  },
  {
    roomNumber: 'T19',
    roomName: 'Library',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'Shelves filled with tomes and scrolls line the walls of this expansive chamber. Five stone statues depicting skeletal warriors stand sentinel throughout the room.',
    dmNotes: 'Removing any item animates 1 of the 5 Skeletal Statues (Medium Stone Golem) to attack the thief until item is returned or statue destroyed. 10-minute search yields loot + clue for T25 ("die" in Draconic).',
    monsters: ['5x Skeletal Warrior Statue (Medium Stone Golem)'],
    treasure: ['Spell Scroll of Greater Restoration', 'Manual of Bodily Health (Copper Sheets — Laysa Treasure #4)', 'Journal with T25 combination ("die" in Draconic)'],
  },
  {
    roomNumber: 'T20a',
    roomName: 'Void Closet (West)',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'This room is pitch dark.',
    dmNotes: 'Locked door (DC 15 Sleight of Hand, DC 11 Athletics, or Knock). Undispellable magical darkness conceals an uncontrolled Sphere of Annihilation in the center (only Truesight detects it).',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T20b',
    roomName: 'Void Closet (East)',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'This room is pitch dark.',
    dmNotes: 'Identical to T20a: Locked door (DC 15 Sleight of Hand, DC 11 Athletics, or Knock). Undispellable magical darkness conceals an uncontrolled Sphere of Annihilation in the center.',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T21',
    roomName: 'Phantasmal Mirage',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'Eerie sounds echo in this pitch-dark room.',
    dmNotes: 'Undispellable magical darkness & eerie sounds. Entering requires DC 18 Wis save or frightened (ends on leaving). While frightened, takes 11 (2d10) psychic damage per 5 ft moved (repeat save after damage). Truesight reveals an abandoned study.',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T22',
    roomName: 'Vortex Bridge',
    sceneTitle: 'Vortex Bridge Puzzle (T22)',
    boxedText: 'A dull roar fills this hexagonal chamber. A bridge consisting of engraved, colored limestone tiles stretches between two ledges. A pitch-black vortex of energy churns beneath the bridge.',
    dmNotes: 'Flying speed reduced to 0 ft. See Invisibility reveals: "The vortex eats all magic, save for that from which it was born." Detect Magic + DC 16 Arcana reveals Evocation (RED) and Transmutation (ORANGE) are safe. Stepping on any other tile breaks it: 36 (8d8) force damage & teleports PC to south ledge.',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T23',
    roomName: 'Arcane Laboratory',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'Three tall, glass cylinders line the back wall of this dimly lit chamber. Each cylinder contains a decaying corpse, half-buried in snow topped with red powder. Against the north wall stands a bare wooden desk.',
    dmNotes: 'DC 20 Arcana recognizes simulacrum components. Desk Secret Drawer: DC 20 Investigation; unlocked by Rerak\'s iron key, DC 20 Sleight of Hand, or Knock. Opening without Rerak\'s key triggers DC 15 Dex save, 26 (4d12) lightning to everyone in room (disarm with DC 17 Dispel Magic). Notes reveal Acererak\'s disdain for simulacra (gives Advantage on persuading Rerak!) and T25 password ("die" in Draconic).',
    monsters: [],
    treasure: ['Rose Quartz Crystal Ball (Laysa Treasure #5)', 'Acererak\'s Simulacrum Notes (advantage vs Rerak)'],
  },
  {
    roomNumber: 'T24',
    roomName: 'Underwater Trench Mirage',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'The walls, floor, and ceiling of the chamber vanish, replaced with a dark ocean in which you are submerged. There is no visible surface. Beneath you swims a large, finned shadow.',
    dmNotes: 'Tactile mirage: creatures that can\'t breathe water begin suffocating; a mirage Giant Shark attacks until illusion is pierced (DC 18 Investigation or Truesight), which allows breathing normally while still swimming.',
    monsters: ['Giant Shark (mirage)'],
    treasure: [],
  },
  {
    roomNumber: 'T25',
    roomName: 'Crypt Doors',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'This corridor ends at a massive double door with a carved relief depicting a river of screaming souls flowing through a ravaged landscape. Instead of handles, the doors bear a trio of concentric, rune-carved platinum circles that can be rotated. At the circles\' center is an engraving of a leering skull.',
    dmNotes: 'Align Draconic rings to spell "die" (clues in T19 & T23), or 1 min DC 25 Sleight of Hand / Knock. Opening by any means other than the combination triggers Knockout-Gas Trap (DC 20 Con save or unconscious 2d4+10 minutes; repeat save when taking damage).',
    monsters: [],
    treasure: [],
  },
  {
    roomNumber: 'T26',
    roomName: 'Crypt (Rerak\'s Throne)',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'Six stone pedestals stand near the walls of this expansive room. From left to right, they bear a blue scarf, a golden ring, a glittering scimitar, an ebony wand wrapped with feathers and bone, a set of engraved copper sheets, and a crystal ball made of rose quartz. At the room\'s center looms a black throne, upon which sits a skeleton dressed in luxurious robes and headdress. A platinum door stands behind the throne.',
    dmNotes: 'Rerak (False Lich) attacks if damaged or approached within 15 ft. Appeasing Rerak: Passive/free DC 19 Insight reveals melancholy; Action + DC 23 Charisma (Persuasion) (Advantage if mentioning mirages or T23 notes). 3 successes break Acererak\'s hold—Rerak crushes his eye gems, surrenders keys (platinum skeleton key for T27 + iron key for T23), and reveals RERAK\'S SECRET (Power of Secrets). False Treasures on pedestals: DC 15 Con or 3d6 necrotic + stunned.',
    monsters: ['Rerak (False Lich)'],
    treasure: ['Platinum Skeleton Key (unlocks T27)', 'Plain Iron Key (unlocks T23 drawer)'],
  },
  {
    roomNumber: 'T27',
    roomName: 'Crypt Vault',
    sceneTitle: 'Tomb of Wayward Souls',
    boxedText: 'Coins and precious stones are strewn across this vault\'s floor. A rod piece rests atop a pedestal draped with a blue silk sash embroidered with gold thread.',
    dmNotes: 'Door requires Rerak\'s platinum skeleton key (other means: DC 25 Dex save, 28 [8d6] force damage). Contains the 6th Piece of the Rod of Seven Parts! Characters gain Level 17 upon retrieving it. North exit door (also uses platinum skeleton key) leads to beach 1 mile south of camp.',
    monsters: [],
    treasure: ['6th Piece of the Rod of Seven Parts', 'Robe of Stars (Blue Silk Sash — Laysa Treasure #6)', '479 sp, 342 gp, 179 pp', 'Jade game board w/ platinum pieces (7,500 gp)', 'Ruby earrings (500 gp)', '3x Fire opals (1,000 gp each)'],
  },
];

// Approximate percentage coordinates on ToddBloom's 44x54 Tomb map (4400x5400)
const TOMB_SCENE_ID = 'scene-ch7-tomb';
const TOMB_ZONES = [
  makeZone('zone_t1', TOMB_SCENE_ID, 'T1', 'False Entrance (Explosion Trap)', 12, 72, 8, 12, '#ef4444', ROOMS[2].boxedText, ROOMS[2].dmNotes),
  makeZone('zone_t2', TOMB_SCENE_ID, 'T2', 'False Entrance (Arrow Trap)', 24, 84, 14, 10, '#f97316', ROOMS[3].boxedText, ROOMS[3].dmNotes),
  makeZone('zone_t3', TOMB_SCENE_ID, 'T3', 'Tomb Entrance (Spiked Pit)', 18, 74, 12, 10, '#eab308', ROOMS[4].boxedText, ROOMS[4].dmNotes),
  makeZone('zone_t4', TOMB_SCENE_ID, 'T4', 'Face of the Great Blue Devil', 30, 76, 10, 8, '#3b82f6', ROOMS[5].boxedText, ROOMS[5].dmNotes),
  makeZone('zone_t5', TOMB_SCENE_ID, 'T5', 'Cave of Seven Casks', 10, 60, 12, 11, '#10b981', ROOMS[6].boxedText, ROOMS[6].dmNotes),
  makeZone('zone_t6', TOMB_SCENE_ID, 'T6', 'Hall of Gemstones', 42, 76, 12, 8, '#06b6d4', ROOMS[7].boxedText, ROOMS[7].dmNotes, [], ['Emerald (1,000 gp)']),
  makeZone('zone_t7', TOMB_SCENE_ID, 'T7', 'Skeleton Closet', 32, 68, 10, 7, '#a855f7', ROOMS[8].boxedText, ROOMS[8].dmNotes, [], ['Gold Choker (1,200 gp)']),
  makeZone('zone_t8', TOMB_SCENE_ID, 'T8', 'Room of Myriad Archways', 20, 61, 14, 12, '#6366f1', ROOMS[9].boxedText, ROOMS[9].dmNotes),
  makeZone('zone_t9', TOMB_SCENE_ID, 'T9', 'Forest of Spirits Mirage', 12, 46, 12, 12, '#22c55e', ROOMS[10].boxedText, ROOMS[10].dmNotes, ['Abalahin (Treant)', "Will-o'-Wisp"], ['+3 Wand of the War Mage']),
  makeZone('zone_t10', TOMB_SCENE_ID, 'T10', 'Crushing Room Trap', 14, 30, 12, 11, '#ef4444', ROOMS[11].boxedText, ROOMS[11].dmNotes),
  makeZone('zone_t11', TOMB_SCENE_ID, 'T11', 'Strange Altar', 30, 40, 10, 11, '#f59e0b', ROOMS[12].boxedText, ROOMS[12].dmNotes, ['Death Knight', '6x Swarm of Poisonous Snakes'], ['Gold/Silver Chests', 'Spell Scroll of Knock']),
  makeZone('zone_t12', TOMB_SCENE_ID, 'T12', 'Room of Respite', 32, 26, 10, 11, '#14b8a6', ROOMS[13].boxedText, ROOMS[13].dmNotes),
  makeZone('zone_t13', TOMB_SCENE_ID, 'T13', 'Celestial Sky Mirage', 32, 10, 10, 12, '#3b82f6', ROOMS[14].boxedText, ROOMS[14].dmNotes, [], ['Ring of Golden Stars']),
  makeZone('zone_t14', TOMB_SCENE_ID, 'T14', 'Juggernaut Arena', 12, 12, 18, 14, '#dc2626', ROOMS[15].boxedText, ROOMS[15].dmNotes, ['2x Granite Juggernaut']),
  makeZone('zone_t15', TOMB_SCENE_ID, 'T15', 'Juggernaut Control Room', 18, 4, 10, 7, '#ec4899', ROOMS[16].boxedText, ROOMS[16].dmNotes, [], ['Diamond (5,000 gp)']),
  makeZone('zone_t16', TOMB_SCENE_ID, 'T16', 'Acid Pit Crossing', 44, 83, 14, 9, '#84cc16', ROOMS[17].boxedText, ROOMS[17].dmNotes),
  makeZone('zone_t17', TOMB_SCENE_ID, 'T17', 'Jade Serpent Guardians\' Chamber', 68, 76, 20, 16, '#10b981', ROOMS[18].boxedText, ROOMS[18].dmNotes, ['Marilith (Construct)', '2x Spirit Naga (Construct)'], ['Sword of Sharpness (Scimitar)']),
  makeZone('zone_t18', TOMB_SCENE_ID, 'T18', 'Hall of Discordance', 62, 60, 8, 13, '#8b5cf6', ROOMS[19].boxedText, ROOMS[19].dmNotes),
  makeZone('zone_t19', TOMB_SCENE_ID, 'T19', 'Library', 54, 48, 22, 10, '#f59e0b', ROOMS[20].boxedText, ROOMS[20].dmNotes, ['5x Stone Golem (Medium)'], ['Manual of Bodily Health', 'Scroll of Greater Restoration']),
  makeZone('zone_t20a', TOMB_SCENE_ID, 'T20a', 'Void Closet (West)', 45, 36, 7, 6, '#1e293b', ROOMS[21].boxedText, ROOMS[21].dmNotes),
  makeZone('zone_t20b', TOMB_SCENE_ID, 'T20b', 'Void Closet (East)', 54, 36, 7, 6, '#1e293b', ROOMS[22].boxedText, ROOMS[22].dmNotes),
  makeZone('zone_t21', TOMB_SCENE_ID, 'T21', 'Phantasmal Mirage', 56, 26, 12, 10, '#6b21a8', ROOMS[23].boxedText, ROOMS[23].dmNotes),
  makeZone('zone_t22', TOMB_SCENE_ID, 'T22', 'Vortex Bridge', 78, 34, 12, 16, '#a855f7', ROOMS[24].boxedText, ROOMS[24].dmNotes),
  makeZone('zone_t23', TOMB_SCENE_ID, 'T23', 'Arcane Laboratory', 62, 34, 12, 10, '#06b6d4', ROOMS[25].boxedText, ROOMS[25].dmNotes, [], ['Crystal Ball (Rose Quartz)']),
  makeZone('zone_t24', TOMB_SCENE_ID, 'T24', 'Underwater Trench Mirage', 74, 20, 12, 12, '#0284c7', ROOMS[26].boxedText, ROOMS[26].dmNotes, ['Giant Shark (mirage)']),
  makeZone('zone_t25', TOMB_SCENE_ID, 'T25', 'Crypt Doors', 54, 21, 8, 8, '#eab308', ROOMS[27].boxedText, ROOMS[27].dmNotes),
  makeZone('zone_t26', TOMB_SCENE_ID, 'T26', 'Crypt (Rerak\'s Throne)', 46, 10, 24, 11, '#7c3aed', ROOMS[28].boxedText, ROOMS[28].dmNotes, ['False Lich (Rerak)'], ['Platinum Skeleton Key', 'Iron Key']),
  makeZone('zone_t27', TOMB_SCENE_ID, 'T27', 'Crypt Vault', 52, 2, 12, 8, '#fbbf24', ROOMS[29].boxedText, ROOMS[29].dmNotes, [], ['6th Rod Piece', 'Robe of Stars', '10,000+ gp treasure']),
];

const CHAPTER_7 = {
  chapterId: 'chap-vecna-ch7',
  chapterTitle: 'Chapter 7: Tomb of Wayward Souls',
  orderIndex: 2,
  pdfFilename: 'Vecna Chapter 7-11.pdf',
  pdfDigest: {
    adventureTitle: 'Vecna: Eve of Ruin',
    chapterTitle: 'Chapter 7: Tomb of Wayward Souls',
    pdfFilename: 'Vecna Chapter 7-11.pdf',
    digestSummary: 'Level 16 -> 17. The party travels through Sigil to Oerth\'s Isle of Serpents, rescues Laysa Matulin\'s archaeological crew from a wounded Kraken (250 HP), and delves into Acererak\'s Tomb of Wayward Souls (T1-T27) to claim the 6th piece of the Rod of Seven Parts from the false lich Rerak.',
    digestedAt: NOW,
    scenes: [
      { sceneTitle: 'Cinematic Opener: Isle of Serpents', summary: 'Arrival through the Sigil portal onto the craggy tropical Isle of Serpents on Oerth.' },
      { sceneTitle: 'Isle of Serpents Lagoon', summary: 'Kraken (250 HP) ambushes 15 archaeologists on the beach.' },
      { sceneTitle: 'Archaeologist Camp', summary: 'Meet Laysa Matulin, Talo & Vogren, and Marian Xavere; receive rough map, 6 Stolen Treasures quest, and Marian\'s Secret.' },
      { sceneTitle: 'Tomb of Wayward Souls', summary: '27-room lethal complex built by Acererak, guarded by Rerak (False Lich).' },
      { sceneTitle: 'Vortex Bridge Puzzle (T22)', summary: 'Cross the colored magic-school tile bridge (Red/Evocation & Orange/Transmutation only) over the gravity vortex.' },
    ],
    rooms: ROOMS,
  },
  scenes: [
    {
      sceneId: 'scene-ch7-opener',
      sceneTitle: 'Cinematic Opener: Isle of Serpents',
      mapUrl: '/assets/maps/vecna/ch7_opener_temple.jpg',
      mapThumbnailUrl: '/assets/maps/vecna/ch7_opener_temple.jpg',
      mapWidth: 1376,
      mapHeight: 768,
      gridSize: 50,
      gridOpacity: 0.1,
      isFogVisible: false,
      dmNotes: 'Chapter 7 Briefing (Level 16 -> 17): Holding the 5th Rod Piece reveals the 6th lies on Oerth\'s Isle of Serpents in the Asperdi-Duxchan Chain—home to venomous fauna and one of Acererak\'s infamous tombs.',
      walls: [],
      roomAnnotations: [],
      tokens: [],
      updatedAt: NOW,
    },
    {
      sceneId: 'scene-ch7-lagoon',
      sceneTitle: 'Isle of Serpents Lagoon',
      mapUrl: '/assets/maps/vecna/ch7_lagoon.jpg',
      mapThumbnailUrl: '/assets/maps/vecna/ch7_lagoon.jpg',
      mapWidth: 7800,
      mapHeight: 5400,
      gridSize: 300,
      gridOpacity: 0.25,
      isFogVisible: false,
      boardWeatherEffect: 'rain',
      dmNotes: ROOMS[0].boxedText + '\n\n' + ROOMS[0].dmNotes,
      walls: [],
      roomAnnotations: [
        makeZone('zone_lagoon', 'scene-ch7-lagoon', '7.1', 'Isle of Serpents Lagoon', 10, 10, 80, 80, '#0ea5e9', ROOMS[0].boxedText, ROOMS[0].dmNotes, ROOMS[0].monsters),
      ],
      tokens: [
        makeToken('tok_ch7_kraken', 'Kraken (Wounded)', 4800, 3900, 4, false, 250, 472, 18, 'Kraken', '/assets/tokens/vecna/kraken.jpg'),
        makeToken('tok_ch7_laysa', 'Laysa Matulin', 3600, 1800, 1, false, 78, 78, 15, 'Assassin', '/assets/tokens/vecna/laysa_matulin.jpg'),
        makeToken('tok_ch7_talo', 'Talo Yieria', 3300, 1500, 1, false, 27, 27, 13, 'Priest', '/assets/tokens/vecna/talo_yieria.jpg'),
        makeToken('tok_ch7_vogren', 'Vogren Starcloak', 3000, 1500, 1, false, 27, 27, 13, 'Priest', '/assets/tokens/vecna/vogren_starcloak.jpg'),
        makeToken('tok_ch7_marian', 'Marian Xavere', 3900, 1500, 1, false, 40, 40, 12, 'Mage', '/assets/tokens/vecna/marian_xavere.jpg'),
        makeToken('tok_ch7_arch1', 'Archaeologist 1', 2700, 2400, 1, false, 4, 4, 10, 'Commoner', '/assets/tokens/vecna/archaeologist.jpg'),
        makeToken('tok_ch7_arch2', 'Archaeologist 2', 3300, 2700, 1, false, 4, 4, 10, 'Commoner', '/assets/tokens/vecna/archaeologist.jpg'),
        makeToken('tok_ch7_arch3', 'Archaeologist 3', 4200, 2400, 1, false, 4, 4, 10, 'Commoner', '/assets/tokens/vecna/archaeologist.jpg'),
      ],
      updatedAt: NOW,
    },
    {
      sceneId: 'scene-ch7-camp',
      sceneTitle: 'Archaeologist Camp',
      mapUrl: '/assets/maps/vecna/ch7_camp.jpg',
      mapThumbnailUrl: '/assets/maps/vecna/ch7_camp.jpg',
      mapWidth: 7800,
      mapHeight: 5400,
      gridSize: 300,
      gridOpacity: 0.2,
      isFogVisible: false,
      dmNotes: ROOMS[1].boxedText + '\n\n' + ROOMS[1].dmNotes,
      walls: [],
      roomAnnotations: [
        makeZone('zone_camp', 'scene-ch7-camp', '7.2', 'Archaeologist Camp', 15, 15, 70, 70, '#f59e0b', ROOMS[1].boxedText, ROOMS[1].dmNotes, ROOMS[1].monsters, ROOMS[1].treasure),
      ],
      tokens: [
        makeToken('tok_camp_laysa', 'Laysa Matulin', 3600, 2400, 1, false, 78, 78, 15, 'Assassin', '/assets/tokens/vecna/laysa_matulin.jpg'),
        makeToken('tok_camp_talo', 'Talo Yieria', 2400, 2400, 1, false, 27, 27, 13, 'Priest', '/assets/tokens/vecna/talo_yieria.jpg'),
        makeToken('tok_camp_vogren', 'Vogren Starcloak', 2100, 2400, 1, false, 27, 27, 13, 'Priest', '/assets/tokens/vecna/vogren_starcloak.jpg'),
        makeToken('tok_camp_marian', 'Marian Xavere', 4800, 2100, 1, false, 40, 40, 12, 'Mage', '/assets/tokens/vecna/marian_xavere.jpg'),
      ],
      updatedAt: NOW,
    },
    {
      sceneId: TOMB_SCENE_ID,
      sceneTitle: 'Tomb of Wayward Souls',
      mapUrl: '/assets/maps/vecna/ch7_tomb_wayward_souls.webp',
      mapThumbnailUrl: '/assets/maps/vecna/ch7_tomb_wayward_souls.webp',
      mapWidth: 4400,
      mapHeight: 5400,
      gridSize: 100,
      gridOpacity: 0.25,
      isFogVisible: true,
      visionConfig: {
        enabled: true,
        ambientLight: false,
        darknessOpacity: 1,
        dimVisionOpacity: 0.5,
        explorationMemory: true,
        dmPreviewMode: false,
      },
      dmNotes: 'TOMB FEATURES: Limestone (20ft chambers, 10ft halls; immune to Passwall/Stone Shape). Hidden Doors: illusion-concealed, detectable by touch/truesight/Dispel Magic. Bright green crystal sconces (inextinguishable). PLANAR TRAMMELS: Astral Projection, Banishment, Etherealness, Plane Shift waste resources and do nothing.',
      walls: [],
      roomAnnotations: TOMB_ZONES,
      tokens: [
        makeToken('tok_t9_abalahin', 'Abalahin (Treant)', 750, 2800, 3, false, 138, 138, 16, 'Treant', '/assets/tokens/vecna/abalahin_treant.jpg'),
        makeToken('tok_t9_wisp1', 'Spirit Light 1', 650, 2600, 1, false, 22, 22, 19, "Will-o'-Wisp", '/assets/tokens/vecna/will_o_wisp.jpg'),
        makeToken('tok_t9_wisp2', 'Spirit Light 2', 900, 2600, 1, false, 22, 22, 19, "Will-o'-Wisp", '/assets/tokens/vecna/will_o_wisp.jpg'),
        makeToken('tok_t14_jug1', 'Granite Juggernaut 1', 750, 1000, 2, false, 157, 157, 14, 'Granite Juggernaut', '/assets/tokens/vecna/granite_juggernaut.jpg'),
        makeToken('tok_t14_jug2', 'Granite Juggernaut 2', 1100, 1000, 2, false, 157, 157, 14, 'Granite Juggernaut', '/assets/tokens/vecna/granite_juggernaut.jpg'),
        makeToken('tok_t17_marilith', 'Jade Serpent Champion', 3400, 4450, 2, false, 189, 189, 18, 'Marilith', '/assets/tokens/vecna/jade_marilith.jpg'),
        makeToken('tok_t17_naga1', 'Jade Cobra 1', 3700, 4250, 2, false, 75, 75, 15, 'Spirit Naga', '/assets/tokens/vecna/jade_cobra.jpg'),
        makeToken('tok_t17_naga2', 'Jade Cobra 2', 3700, 4650, 2, false, 75, 75, 15, 'Spirit Naga', '/assets/tokens/vecna/jade_cobra.jpg'),
        makeToken('tok_t19_golem1', 'Skeletal Statue 1', 2600, 2850, 1, false, 178, 178, 17, 'Stone Golem', '/assets/tokens/vecna/skeletal_statue.jpg'),
        makeToken('tok_t19_golem2', 'Skeletal Statue 2', 2900, 2850, 1, false, 178, 178, 17, 'Stone Golem', '/assets/tokens/vecna/skeletal_statue.jpg'),
        makeToken('tok_t24_shark', 'Giant Shark (Mirage)', 3500, 1400, 3, false, 126, 126, 13, 'Giant Shark', '/assets/tokens/vecna/giant_shark.jpg'),
        makeToken('tok_t26_rerak', 'Rerak (False Lich)', 2550, 750, 1, false, 199, 199, 18, 'False Lich', '/assets/tokens/vecna/rerak_false_lich.jpg'),
      ],
      updatedAt: NOW,
    },
    {
      sceneId: 'scene-ch7-vortex',
      sceneTitle: 'Vortex Bridge Puzzle (T22)',
      mapUrl: '/assets/maps/vecna/ch7_vortex_bridge.jpg',
      mapThumbnailUrl: '/assets/maps/vecna/ch7_vortex_bridge.jpg',
      mapWidth: 896,
      mapHeight: 1200,
      gridSize: 64,
      gridOpacity: 0.25,
      isFogVisible: false,
      dmNotes: ROOMS[24].boxedText + '\n\n' + ROOMS[24].dmNotes,
      walls: [],
      roomAnnotations: [
        makeZone('zone_vortex', 'scene-ch7-vortex', 'T22', 'Vortex Bridge Puzzle', 25, 10, 50, 80, '#a855f7', ROOMS[24].boxedText, ROOMS[24].dmNotes),
      ],
      tokens: [],
      updatedAt: NOW,
    },
  ],
  updatedAt: NOW,
};

async function run() {
  const cfgPath = path.resolve(__dirname, '../firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);
  try { await signInAnonymously(auth); } catch {}

  const ref = doc(db, 'campaigns', 'vecna-eve-of-ruin');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Campaign vecna-eve-of-ruin not found in Firestore!');
  }

  const data = snap.data();
  const chapters = Array.isArray(data.chapters) ? [...data.chapters] : [];
  const idx = chapters.findIndex(c => c.chapterId === CHAPTER_7.chapterId || /chapter\s*7/i.test(c.chapterTitle || ''));
  if (idx >= 0) {
    console.log('Replacing existing Chapter 7 at index', idx);
    chapters[idx] = CHAPTER_7;
  } else {
    console.log('Appending Chapter 7 at index', chapters.length);
    chapters.push(CHAPTER_7);
  }

  await setDoc(ref, { ...data, chapters, updatedAt: NOW });
  console.log('✅ Successfully ingested Chapter 7: Tomb of Wayward Souls into vecna-eve-of-ruin!');
  console.log('   Chapters now:', chapters.map(c => `${c.orderIndex}: ${c.chapterTitle} (${c.scenes?.length || 0} scenes)`));
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Ingestion failed:', err);
  process.exit(1);
});
