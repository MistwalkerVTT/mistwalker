import fs from 'fs';
import path from 'path';

/**
 * Generates a clean, multi-page, text-selectable PDF 1.4 adventure module:
 * "The Ironbound Cellblock — MistWalker Tutorial Adventure"
 * Tailored room-by-room (Areas D1–D14) to public/assets/maps/tutorial_dungeon_prison.jpg
 * so Gemini AI PDF ingestion extracts scenes, room keys, boxed text, traps, monsters, and Chapter Flow.
 */

const ADVENTURE_LINES = [
  { type: 'h1', text: 'THE IRONBOUND CELLBLOCK' },
  { type: 'sub', text: 'A Level 3-5 Tutorial Dungeon Module for MistWalker VTT' },
  { type: 'p', text: 'Adventure Overview: Beneath the ruined watchtower of Blackfen lies the Ironbound Cellblock, a subterranean prison recently seized by the Crimson Ash cult. Their warden, Vaelis the Pale, has imprisoned Lyra Thorne, a scholar carrying the cipher to the Sunken Vault. The party descends the central wooden stairs to rescue Lyra, disrupt the blood-brazier ritual, and escape before the cultist patrol returns.' },
  { type: 'h2', text: 'Chapter Flow, Dungeon Rules & Key NPCs' },
  { type: 'p', text: 'Story Hook: A frantic courier from the Silver Quill Guild offers 300 gp to rescue Lyra Thorne before midnight, when the Crimson Ash plans to ignite the Crimson Brazier (Area D14).' },
  { type: 'p', text: 'Lighting & Vision: The central cellblock (Area D13) and eastern wing (Areas D8, D14) are bathed in dim flickering torchlight. The northern, western, and southern cells are plunged in total darkness unless doors are opened or torches are carried inside.' },
  { type: 'p', text: 'Iron Cell Doors: Most cell doors are barred iron grates or heavy oak slabs. Closed doors are locked (DC 13 Dexterity check with Thieves Tools, or DC 15 Strength check to force open). Warden Vaelis (Area D8) carries the master iron keyring.' },
  { type: 'p', text: 'Patrol Schedule: Every 10 minutes (or whenever loud combat erupts in Area D13), 2 Cultists emerge from Area D8 to inspect the cellblock.' },
  { type: 'p', text: 'Key NPC - Lyra Thorne (Captive Scholar, Neutral Good): Held in Area D4 inside the hanging iron cage. Knows the ritual weakness of the Crimson Brazier (dousing it with holy water or toppling the basin ends the ward).' },
  { type: 'p', text: 'Key NPC - Warden Vaelis (Cult Fanatic, Lawful Evil): Oversees the blood ritual at Area D14 and keeps his ledger and master keys in Area D8.' },

  { type: 'h2', text: 'Keyed Dungeon Locations (Areas D1 - D14)' },

  // D1
  { type: 'h3', text: 'Area D1: Northwest Collapsed Cell' },
  { type: 'box', text: 'READ ALOUD: Cold dampness clings to the flagstones of this cramped northwestern cell. A rotting wooden bench leans against the eastern stone partition, while iron shackles dangle above a scatter of ancient bones in the dark corner.' },
  { type: 'p', text: 'DM Notes: Two restless Skeletons lie among the bones and animate as soon as any creature steps past the threshold or shines bright light inside. A DC 13 Investigation check beneath the wooden bench uncovers a loose flagstone hiding a Potion of Healing and 25 gp.' },
  { type: 'p', text: 'Creatures: 2 Skeletons.' },

  // D2
  { type: 'h3', text: 'Area D2: North-West Iron-Barred Cell' },
  { type: 'box', text: 'READ ALOUD: Through heavy iron bars, a foul stench of rot rolls into the corridor. A grotesque mound of gnawed remains and torn rags lies heaped in the northwest corner beneath a flickering outer wall torch.' },
  { type: 'p', text: 'DM Notes: A ravenous Ghoul hides behind the debris pile (Stealth DC 14). If the cell door is opened, it lunges at the nearest creature. Among the rags is a tarnished silver signet ring worth 40 gp.' },
  { type: 'p', text: 'Creatures: 1 Ghoul.' },

  // D3
  { type: 'h3', text: 'Area D3: North-Center Holding Cell' },
  { type: 'box', text: 'READ ALOUD: A crimson threshold marks the doorway to this stark northern chamber. Heavy chains hang from iron wall rings along the north wall, and scratch marks score the stone floor near the rusted lock.' },
  { type: 'p', text: 'DM Notes: Trap - Poisoned Needle Lock. The cell door lock is rigged with a spring-loaded needle (DC 14 Investigation to spot, DC 13 Thieves Tools to disarm). Triggering it deals 1d4 piercing + 2d6 poison damage (DC 13 Constitution save for half). Inside, a scratched message on the wall reads: "The scholar hangs in D4. Topple the red basin."' },
  { type: 'p', text: 'Creatures: None.' },

  // D4
  { type: 'h3', text: 'Area D4: North-East Hanging Cage Cell' },
  { type: 'box', text: 'READ ALOUD: A suspended iron cage creaks softly in the corner of this dim cell beside a stack of supply crates. Faint whispering echoes from inside the bars as a bruised figure peers anxiously toward the doorway.' },
  { type: 'p', text: 'DM Notes: Lyra Thorne is locked inside the hanging iron cage (DC 12 Thieves Tools or the Warden key from Area D8). A lurking Shadow clings to the ceiling rafters above the crates and attacks the moment someone tries to unlock the cage.' },
  { type: 'p', text: 'Creatures: 1 Shadow.' },

  // D5
  { type: 'h3', text: 'Area D5: Northeast Guard Cell' },
  { type: 'box', text: 'READ ALOUD: Warm amber torchlight spills through the eastern arch of this corner cell, glinting off a slumped skeleton clad in rusted chainmail. Iron manacles rattle faintly in the draft.' },
  { type: 'p', text: 'DM Notes: The skeleton belonged to a former town watch captain. Searching the body (DC 11 Perception) yields a Shortsword +1 and a folded map showing the secret breach in Area D9. Disturbing the armor awakens 2 Skeletons.' },
  { type: 'p', text: 'Creatures: 2 Skeletons.' },

  // D6
  { type: 'h3', text: 'Area D6: West Grated Cell' },
  { type: 'box', text: 'READ ALOUD: An eerie crimson glow rises through a heavy iron grate set into the western wall, casting long barred shadows across a scarred wooden bench and a carved stone relief pillar.' },
  { type: 'p', text: 'DM Notes: The grate vents heat from a subterranean forge channel far below. A DC 14 Perception check spots a small leather pouch wedged behind the stone relief containing 3 Spell Scrolls (Bless, Shield, Cure Wounds).' },
  { type: 'p', text: 'Creatures: 1 Cultist (sleeping on the bench, Passive Perception 9).' },

  // D7
  { type: 'h3', text: 'Area D7: Southwest Rubble Cell' },
  { type: 'box', text: 'READ ALOUD: Splintered timber beams and a mound of collapsed masonry choke this southwest cell. Skulls peek out from the gravel, and a sturdy ironbound chest sits half-buried near the broken floorboards.' },
  { type: 'p', text: 'DM Notes: The ironbound chest is actually a Mimic waiting for greedy dungeon delvers! Behind the rubble mound, a genuine wooden coffer holds 85 gp and two onyx gemstones (50 gp each).' },
  { type: 'p', text: 'Creatures: 1 Mimic.' },

  // D8
  { type: 'h3', text: 'Area D8: East Torch-Lit Warden Alcove' },
  { type: 'box', text: 'READ ALOUD: Bright orange torchlight illuminates this eastern alcove, highlighting a carved stone relief flanked by iron shackles. A heavy iron keyring hangs from a wall peg beside a blood-inked ledger.' },
  { type: 'p', text: 'DM Notes: This is Warden Vaelis\'s command post. Two alert Guards loyal to the Crimson Ash stand watch here. The keyring opens every iron cell door in the prison (Areas D1-D12). The ledger details the midnight ritual at Area D14.' },
  { type: 'p', text: 'Creatures: 2 Guards.' },

  // D9
  { type: 'h3', text: 'Area D9: Southeast Breached Cell' },
  { type: 'box', text: 'READ ALOUD: Damp moss and creeping roots spill through a jagged breach in the southeastern masonry. Cool night air drifts in from a narrow natural fissure hidden behind the fallen stones.' },
  { type: 'p', text: 'DM Notes: Secret Escape Route! A DC 13 Athletics or Acrobatics check allows Medium creatures to squeeze through the fissure and escape directly to the forest outside Blackfen Watchtower. Two Giant Rats nest among the roots.' },
  { type: 'p', text: 'Creatures: 2 Giant Rats.' },

  // D10
  { type: 'h3', text: 'Area D10: South-West Guarded Cell' },
  { type: 'box', text: 'READ ALOUD: Iron bars and piles of damp straw fill this dimly lit southern cell. A lone torch mounted on the corridor pillar outside throws dancing shadows across the mossy flagstones.' },
  { type: 'p', text: 'DM Notes: An abandoned holding cell. A DC 12 Survival check reveals fresh bootprints leading from this cell straight toward the Crimson Brazier (Area D14).' },
  { type: 'p', text: 'Creatures: 1 Bandit.' },

  // D11
  { type: 'h3', text: 'Area D11: South-Center Bloodstained Cell' },
  { type: 'box', text: 'READ ALOUD: Dark crimson streaks drag across the cracked flagstones toward the central hall, tangled with creeping subterranean vines. The air tastes sharply of copper and burnt incense.' },
  { type: 'p', text: 'DM Notes: A Cultist prepares ritual reagents here. If combat breaks out in Area D13 or D14, the cultist rushes out on round 2 to reinforce Warden Vaelis.' },
  { type: 'p', text: 'Creatures: 1 Cultist.' },

  // D12
  { type: 'h3', text: 'Area D12: South-East Execution Cell' },
  { type: 'box', text: 'READ ALOUD: A heavy double-bladed executioner axe leans against the damp partition wall beside scattered bones and rusted shackles. The silence inside this chamber feels unnaturally heavy.' },
  { type: 'p', text: 'DM Notes: A suit of Animated Armor stands dormant in the shadowed corner and springs to life if anyone touches the axe or enters without speaking the cult passphrase ("Ash to Ember").' },
  { type: 'p', text: 'Creatures: 1 Animated Armor.' },

  // D13
  { type: 'h3', text: 'Area D13: The Central Cellblock & Descending Stairs' },
  { type: 'box', text: 'READ ALOUD: Wide wooden steps descend into the heart of the Ironbound Cellblock. Worn stone tiles stretch between rows of dark iron cells to the north and south. Provision crates line the northern wall, wine barrels cluster to the south, and a sinister crimson glow pulses from an altar to the east.' },
  { type: 'p', text: 'DM Notes: The main tactical hub of the dungeon. Crates and barrels provide half cover (+2 AC). Two Cultists patrol this floor, keeping watch over the stairs and cell rows.' },
  { type: 'p', text: 'Creatures: 2 Cultists.' },

  // D14
  { type: 'h3', text: 'Area D14: The Crimson Brazier Altar' },
  { type: 'box', text: 'READ ALOUD: Mounted against the eastern stone pillar, a massive circular stone basin brims with glowing crimson liquid. Twin sconces cast fierce amber light across the flagstones as chanting echoes off the vaulted ceiling.' },
  { type: 'p', text: 'DM Notes: Boss Encounter! Warden Vaelis (Cult Fanatic) channels the midnight ritual here, protected by 2 Cultists. Tipping the brazier (DC 15 Strength check) or splashing holy water into the basin disrupts the ritual, dealing 2d8 radiant damage to all cultists within 15 feet and extinguishing the crimson ward.' },
  { type: 'p', text: 'Creatures: 1 Cult Fanatic, 2 Cultists.' }
];

function escapePdfText(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' ');
}

function wrapText(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= maxChars) {
      current += ' ' + w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildPdf(items) {
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 52;
  const topY = 740;
  const bottomY = 56;

  const pages = [];
  let currentOps = [];
  let y = topY;

  const pushPage = () => {
    if (currentOps.length > 0) {
      pages.push(currentOps.join('\n'));
      currentOps = [];
    }
    y = topY;
  };

  const ensureSpace = (needed) => {
    if (y - needed < bottomY) {
      pushPage();
    }
  };

  for (const item of items) {
    if (item.type === 'h1') {
      ensureSpace(40);
      currentOps.push('BT /F2 18 Tf 0.12 0.12 0.15 rg ' + marginX + ' ' + y + ' Td (' + escapePdfText(item.text) + ') Tj ET');
      y -= 24;
    } else if (item.type === 'sub') {
      ensureSpace(22);
      currentOps.push('BT /F3 10.5 Tf 0.35 0.35 0.40 rg ' + marginX + ' ' + y + ' Td (' + escapePdfText(item.text) + ') Tj ET');
      y -= 18;
      currentOps.push('0.75 0.55 0.15 RG 1.2 w ' + marginX + ' ' + (y + 6) + ' m ' + (pageWidth - marginX) + ' ' + (y + 6) + ' l S');
      y -= 10;
    } else if (item.type === 'h2') {
      ensureSpace(34);
      y -= 8;
      currentOps.push('BT /F2 13 Tf 0.55 0.18 0.10 rg ' + marginX + ' ' + y + ' Td (' + escapePdfText(item.text) + ') Tj ET');
      y -= 18;
    } else if (item.type === 'h3') {
      ensureSpace(38);
      y -= 6;
      currentOps.push('BT /F2 11 Tf 0.10 0.25 0.45 rg ' + marginX + ' ' + y + ' Td (' + escapePdfText(item.text) + ') Tj ET');
      y -= 15;
    } else if (item.type === 'box') {
      const wrapped = wrapText(item.text, 80);
      const blockHeight = wrapped.length * 13 + 12;
      ensureSpace(blockHeight + 6);
      // Light shaded box with left border
      currentOps.push('0.96 0.94 0.89 rg ' + marginX + ' ' + (y - blockHeight + 10) + ' ' + (pageWidth - marginX * 2) + ' ' + blockHeight + ' re f');
      currentOps.push('0.72 0.48 0.12 RG 2 w ' + marginX + ' ' + (y - blockHeight + 10) + ' m ' + marginX + ' ' + (y + 10) + ' l S');
      let lineY = y - 2;
      for (const line of wrapped) {
        currentOps.push('BT /F3 9.5 Tf 0.15 0.15 0.15 rg ' + (marginX + 10) + ' ' + lineY + ' Td (' + escapePdfText(line) + ') Tj ET');
        lineY -= 13;
      }
      y -= blockHeight + 6;
    } else {
      const wrapped = wrapText(item.text, 88);
      const blockHeight = wrapped.length * 13 + 4;
      ensureSpace(blockHeight);
      for (const line of wrapped) {
        currentOps.push('BT /F1 9.5 Tf 0.15 0.15 0.18 rg ' + marginX + ' ' + y + ' Td (' + escapePdfText(line) + ') Tj ET');
        y -= 13;
      }
      y -= 4;
    }
  }
  pushPage();

  // Assemble PDF objects
  // 1: Catalog, 2: Pages, 3: F1 Helvetica, 4: F2 Helvetica-Bold, 5: F3 Helvetica-Oblique
  const objects = [];
  const addObj = (body) => {
    objects.push(body);
    return objects.length;
  };

  addObj('<< /Type /Catalog /Pages 2 0 R >>');
  addObj(''); // placeholder for Pages object 2
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>');

  const pageIds = [];
  for (let i = 0; i < pages.length; i++) {
    const stream = pages[i] + `\nBT /F1 8 Tf 0.5 0.5 0.5 rg ${pageWidth - 95} 28 Td (Page ${i + 1} of ${pages.length}) Tj ET`;
    const contentId = addObj(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    const pageId = addObj(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return pdf;
}

const outPath = path.resolve('public/assets/tutorial/ironbound_cellblock_adventure.pdf');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const pdfContent = buildPdf(ADVENTURE_LINES);
fs.writeFileSync(outPath, pdfContent, 'utf8');
console.log(`Generated ${outPath} (${Buffer.byteLength(pdfContent, 'utf8')} bytes)`);
