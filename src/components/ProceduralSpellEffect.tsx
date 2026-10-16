import React, { useRef, useEffect, useMemo } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { Effect } from '../types';

interface ProceduralSpellEffectProps {
  effect: Effect;
  gridSize?: number;
  stageScale?: number;
}

// ---------------------------------------------------------------------------
// 1. SPIRIT GUARDIANS (Angelic / Fey Celestial Ward with Orbiting Seraphs)
// ---------------------------------------------------------------------------
function drawSpiritGuardians(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  spd: number = 1.0
) {
  ctx.save();

  // 1. Divine Celestial Ward Ground Glow (Holy ivory & celestial gold)
  const wardGrad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 0.95);
  wardGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');  // Pale warm gold
  wardGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.25)'); // Amber gold
  wardGrad.addColorStop(0.75, 'rgba(56, 189, 248, 0.18)'); // Ethereal celestial blue
  wardGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = wardGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
  ctx.fill();

  // 2. Outer Celestial Containment Ring with Sacred Glyphs
  const spinOuter = t * 0.18 * spd;
  const outerR = r * 0.88;

  // Double golden containment rings
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR * 0.94, 0, Math.PI * 2);
  ctx.stroke();

  // 24 Celestial Azimuth Dashes
  const dashes = 24;
  for (let d = 0; d < dashes; d++) {
    const dAng = (d / dashes) * Math.PI * 2 + spinOuter;
    const isMajor = d % 3 === 0;
    const innerDist = outerR * (isMajor ? 0.87 : 0.91);
    ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.9)' : 'rgba(254, 240, 138, 0.5)';
    ctx.lineWidth = isMajor ? 1.5 : 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(dAng) * innerDist, cy + Math.sin(dAng) * innerDist);
    ctx.lineTo(cx + Math.cos(dAng) * outerR, cy + Math.sin(dAng) * outerR);
    ctx.stroke();
  }

  // 8 Rotating Sacred Celestial Script Glyphs
  const runeCount = 8;
  for (let rn = 0; rn < runeCount; rn++) {
    const rnAng = (rn / runeCount) * Math.PI * 2 + spinOuter;
    const rx = cx + Math.cos(rnAng) * (outerR * 0.78);
    const ry = cy + Math.sin(rnAng) * (outerR * 0.78);

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(rnAng + Math.PI / 2);

    const runeSize = 4.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    if (rn % 4 === 0) {
      // Solar cross rune
      ctx.moveTo(0, -runeSize);
      ctx.lineTo(0, runeSize);
      ctx.moveTo(-runeSize, 0);
      ctx.lineTo(runeSize, 0);
      ctx.arc(0, 0, runeSize * 0.5, 0, Math.PI * 2);
    } else if (rn % 4 === 1) {
      // Angelic wing crest
      ctx.moveTo(-runeSize, runeSize * 0.5);
      ctx.quadraticCurveTo(0, -runeSize, runeSize, runeSize * 0.5);
      ctx.moveTo(0, -runeSize);
      ctx.lineTo(0, runeSize);
    } else if (rn % 4 === 2) {
      // Divine halo rune
      ctx.arc(0, 0, runeSize * 0.7, 0, Math.PI * 2);
      ctx.moveTo(0, -runeSize);
      ctx.lineTo(0, -runeSize * 0.7);
    } else {
      // Celestial star diamond
      ctx.moveTo(0, -runeSize);
      ctx.lineTo(runeSize * 0.7, 0);
      ctx.lineTo(0, runeSize);
      ctx.lineTo(-runeSize * 0.7, 0);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
  }

  // 3. Four Orbiting Celestial Guardian Spirits (Seraphs / Fey)
  const spinSpirits = -t * 0.55 * spd;
  const spiritOrbitR = r * 0.6;
  const spiritCount = 4;

  for (let s = 0; s < spiritCount; s++) {
    const baseAng = (s / spiritCount) * Math.PI * 2 + spinSpirits;
    const sx = cx + Math.cos(baseAng) * spiritOrbitR;
    const sy = cy + Math.sin(baseAng) * spiritOrbitR;

    // A) Trailing Radiant Comet Tail behind each spirit
    const tailSegments = 12;
    ctx.beginPath();
    for (let ts = 0; ts <= tailSegments; ts++) {
      const trailAngle = baseAng + (ts / tailSegments) * 0.65;
      const trailDist = spiritOrbitR + Math.sin(ts * 0.5 + t * 4) * 2;
      const tx = cx + Math.cos(trailAngle) * trailDist;
      const ty = cy + Math.sin(trailAngle) * trailDist;
      if (ts === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    const tailGrad = ctx.createLinearGradient(
      sx,
      sy,
      cx + Math.cos(baseAng + 0.65) * spiritOrbitR,
      cy + Math.sin(baseAng + 0.65) * spiritOrbitR
    );
    tailGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    tailGrad.addColorStop(0.3, 'rgba(254, 240, 138, 0.65)');
    tailGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.35)');
    tailGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.strokeStyle = tailGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // B) Angelic Seraph Spirit Body
    ctx.save();
    ctx.translate(sx, sy);
    // Face tangential to orbit
    ctx.rotate(baseAng - Math.PI / 2);

    // Flapping wings
    const wingFlap = Math.sin(t * 9 * spd + s * 1.5) * 0.35;
    const wingSpan = 9;

    // Left Wing
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-wingSpan * 0.5, -4 + wingFlap * 4, -wingSpan, -1 + wingFlap * 6, -wingSpan * 1.1, 4);
    ctx.bezierCurveTo(-wingSpan * 0.6, 2, -2, 2, 0, 0);
    ctx.fill();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wingSpan * 0.5, -4 + wingFlap * 4, wingSpan, -1 + wingFlap * 6, wingSpan * 1.1, 4);
    ctx.bezierCurveTo(wingSpan * 0.6, 2, 2, 2, 0, 0);
    ctx.fill();

    // Incandescent Spirit Core Node
    const spiritNodeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
    spiritNodeGrad.addColorStop(0, '#ffffff');
    spiritNodeGrad.addColorStop(0.5, '#fef08a');
    spiritNodeGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = spiritNodeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 4. Central Sacred Sanctum Core & Solar Cross
  const corePulse = 0.9 + Math.sin(t * 2.8 * spd) * 0.1;
  const innerR = r * 0.28 * corePulse;

  // Inner sanctum ring
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.9)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.stroke();

  // Central 8-pointed solar star
  const spinCore = t * 0.4 * spd;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spinCore);

  const starSize = innerR * 0.7;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  for (let st = 0; st < 8; st++) {
    const stAng = (st / 8) * Math.PI * 2;
    const isRay = st % 2 === 0;
    const sLen = isRay ? starSize : starSize * 0.45;
    const px = Math.cos(stAng) * sLen;
    const py = Math.sin(stAng) * sLen;
    if (st === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 5. Divine Repulsion Shockwaves (Holy Sonar Waves)
  const surgePhase = ((t * 0.6 * spd) % 1.0);
  const surgeR = r * surgePhase;
  const surgeAlpha = Math.sin(surgePhase * Math.PI) * 0.65;
  ctx.strokeStyle = `rgba(254, 240, 138, ${surgeAlpha})`;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(cx, cy, surgeR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore(); // screen restore
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. BEACON OF HOPE (Radiant Lighthouse & Pillar of Dawn)
// ---------------------------------------------------------------------------
function drawBeaconOfHope(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  spd: number = 1.0
) {
  ctx.save();

  // 1. Warm Radiant Dawn Glow (Gold -> Dawn Rose -> Celestial Amber)
  const dawnGrad = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r * 0.95);
  dawnGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');  // Blinding white pillar
  dawnGrad.addColorStop(0.2, 'rgba(254, 240, 138, 0.65)'); // Golden dawn
  dawnGrad.addColorStop(0.55, 'rgba(244, 114, 182, 0.3)'); // Dawn rose / vitality
  dawnGrad.addColorStop(0.85, 'rgba(245, 158, 11, 0.15)'); // Warm amber
  dawnGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = dawnGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
  ctx.fill();

  // 2. Eight Sweeping Lighthouse Sunbeams (Piercing the darkness of combat)
  const beamCount = 8;
  const beamSpin = t * 0.22 * spd;

  for (let b = 0; b < beamCount; b++) {
    const baseAng = (b / beamCount) * Math.PI * 2 + beamSpin;
    const beamHalfWidth = 0.08; // in radians

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r * 0.92, baseAng - beamHalfWidth, baseAng + beamHalfWidth);
    ctx.closePath();

    const beamGrad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 0.92);
    beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    beamGrad.addColorStop(0.4, 'rgba(254, 240, 138, 0.35)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fill();
    ctx.restore();
  }

  // 3. Concentric Sacred Rings of Vitality
  const outerR = r * 0.88;
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.stroke();

  // Mid vitality ring with healing rays
  const midR = r * 0.52;
  ctx.strokeStyle = 'rgba(244, 114, 182, 0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, midR, 0, Math.PI * 2);
  ctx.stroke();

  // 12 Connecting vitality spokes
  const spokeCount = 12;
  for (let sp = 0; sp < spokeCount; sp++) {
    const spAng = (sp / spokeCount) * Math.PI * 2 - t * 0.15 * spd;
    const pulseOffset = Math.sin(t * 3 * spd + sp) * 0.3;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + pulseOffset})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(spAng) * (midR * 0.85), cy + Math.sin(spAng) * (midR * 0.85));
    ctx.lineTo(cx + Math.cos(spAng) * outerR, cy + Math.sin(spAng) * outerR);
    ctx.stroke();
  }

  // 4. Central 12-Pointed Star of Hope (Blazing Diamond of Vitality)
  const starPulse = 0.92 + Math.sin(t * 3.5 * spd) * 0.08;
  const starR = r * 0.32 * starPulse;
  const starSpin = t * 0.3 * spd;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(starSpin);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let pt = 0; pt < 24; pt++) {
    const ptAng = (pt / 24) * Math.PI * 2;
    const isMajor = pt % 2 === 0;
    const isCardinal = pt % 6 === 0;
    const len = isCardinal ? starR : isMajor ? starR * 0.7 : starR * 0.35;
    const px = Math.cos(ptAng) * len;
    const py = Math.sin(ptAng) * len;
    if (pt === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Central radiant aura
  const starAura = ctx.createRadialGradient(0, 0, 0, 0, 0, starR * 1.4);
  starAura.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  starAura.addColorStop(0.4, 'rgba(254, 240, 138, 0.6)');
  starAura.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = starAura;
  ctx.beginPath();
  ctx.arc(0, 0, starR * 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 5. Heartbeat of Hope (Vitality double pulse)
  const cycle = (t * 0.9 * spd) % 1.0;
  // First pulse
  const p1R = r * cycle;
  const p1Alpha = Math.sin(cycle * Math.PI) * 0.55;
  ctx.strokeStyle = `rgba(255, 255, 255, ${p1Alpha})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(cx, cy, p1R, 0, Math.PI * 2);
  ctx.stroke();

  // Second heartbeat pulse (offset by 0.25s)
  const cycle2 = (t * 0.9 * spd + 0.22) % 1.0;
  const p2R = r * cycle2;
  const p2Alpha = Math.sin(cycle2 * Math.PI) * 0.45;
  ctx.strokeStyle = `rgba(244, 114, 182, ${p2Alpha})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(cx, cy, p2R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore(); // screen restore
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3. FIREBALL (Violent Roaring Detonation Vortex)
// ---------------------------------------------------------------------------
function drawFireball(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  spd: number = 1.0
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // 1. Detonation blast core
  const blastPulse = 1 + Math.sin(t * 12 * spd) * 0.06;
  const blastR = r * blastPulse;

  const blastGrad = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, blastR);
  blastGrad.addColorStop(0, '#ffffff');
  blastGrad.addColorStop(0.2, '#fed7aa');
  blastGrad.addColorStop(0.5, '#ea580c');
  blastGrad.addColorStop(0.85, '#dc2626');
  blastGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = blastGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, blastR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Churning radial flame vortex tongues
  const tongueCount = 8;
  for (let tg = 0; tg < tongueCount; tg++) {
    const tgAng = (tg / tongueCount) * Math.PI * 2 + t * 1.5 * spd;
    const tgLen = r * (0.6 + Math.sin(t * 14 * spd + tg * 2) * 0.25);
    const endX = cx + Math.cos(tgAng) * tgLen;
    const endY = cy + Math.sin(tgAng) * tgLen;

    const cpAng = tgAng + 0.3;
    const cpX = cx + Math.cos(cpAng) * (tgLen * 0.6);
    const cpY = cy + Math.sin(cpAng) * (tgLen * 0.6);

    ctx.strokeStyle = 'rgba(254, 215, 60, 0.7)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.stroke();
  }

  // 3. Expanding fiery shockwave rings
  const shockPhase = ((t * 1.8 * spd) % 1.0);
  const shockR = r * shockPhase;
  const shockAlpha = (1 - shockPhase) * 0.8;
  ctx.strokeStyle = `rgba(255, 237, 213, ${shockAlpha})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, shockR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. DARKNESS (Writhing Inky Void Sphere)
// ---------------------------------------------------------------------------
function drawDarkness(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  spd: number = 1.0
) {
  ctx.save();

  // 1. Inky black core
  const darkPulse = 1 + Math.sin(t * 2 * spd) * 0.03;
  const darkR = r * darkPulse;

  const darkGrad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, darkR);
  darkGrad.addColorStop(0, 'rgba(8, 6, 15, 0.98)');
  darkGrad.addColorStop(0.75, 'rgba(15, 10, 28, 0.95)');
  darkGrad.addColorStop(0.92, 'rgba(88, 28, 135, 0.6)');
  darkGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = darkGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, darkR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Writhing shadow tendrils
  const tendrilCount = 8;
  for (let td = 0; td < tendrilCount; td++) {
    const baseAng = (td / tendrilCount) * Math.PI * 2 + t * 0.4 * spd;
    const startX = cx + Math.cos(baseAng) * (r * 0.75);
    const startY = cy + Math.sin(baseAng) * (r * 0.75);

    const cpAng = baseAng + 0.4 + Math.sin(t * 2 * spd + td) * 0.25;
    const cpX = cx + Math.cos(cpAng) * (r * 1.08);
    const cpY = cy + Math.sin(cpAng) * (r * 1.08);

    const endAng = baseAng + 0.8;
    const endX = cx + Math.cos(endAng) * (r * 0.85);
    const endY = cy + Math.sin(endAng) * (r * 0.85);

    ctx.strokeStyle = 'rgba(15, 10, 28, 0.9)';
    ctx.lineWidth = 4.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.stroke();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. FOG CLOUD (Volumetric Misty Billows)
// ---------------------------------------------------------------------------
function drawFogCloud(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  spd: number = 1.0
) {
  ctx.save();

  const puffCount = 10;
  for (let p = 0; p < puffCount; p++) {
    const pAng = (p / puffCount) * Math.PI * 2 + p * 0.5;
    const pDist = r * (0.2 + (p % 3) * 0.25);
    const driftX = Math.sin(t * 0.4 * spd + p * 1.5) * (r * 0.12);
    const driftY = Math.cos(t * 0.35 * spd + p * 1.8) * (r * 0.1);

    const px = cx + Math.cos(pAng) * pDist + driftX;
    const py = cy + Math.sin(pAng) * pDist + driftY;
    const pRadius = r * 0.48 * (0.9 + Math.sin(t * 0.5 * spd + p * 2.1) * 0.12);

    const puffGrad = ctx.createRadialGradient(px, py, 0, px, py, pRadius);
    puffGrad.addColorStop(0, 'rgba(240, 246, 255, 0.3)');
    puffGrad.addColorStop(0.5, 'rgba(220, 232, 248, 0.15)');
    puffGrad.addColorStop(1, 'rgba(180, 200, 225, 0)');

    ctx.fillStyle = puffGrad;
    ctx.beginPath();
    ctx.arc(px, py, pRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 6. POISON CLOUD / CLOUDKILL (Noxious Roiling Toxic Gas)
// ---------------------------------------------------------------------------
function drawPoisonCloud(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  spd: number = 1.0
) {
  ctx.save();

  const puffCount = 10;
  for (let p = 0; p < puffCount; p++) {
    const pAng = (p / puffCount) * Math.PI * 2 + p * 0.5;
    const pDist = r * (0.2 + (p % 3) * 0.25);
    const driftX = Math.sin(t * 0.45 * spd + p * 1.5) * (r * 0.12);
    const driftY = Math.cos(t * 0.4 * spd + p * 1.8) * (r * 0.1);

    const px = cx + Math.cos(pAng) * pDist + driftX;
    const py = cy + Math.sin(pAng) * pDist + driftY;
    const pRadius = r * 0.48 * (0.9 + Math.sin(t * 0.6 * spd + p * 2.1) * 0.12);

    const puffGrad = ctx.createRadialGradient(px, py, 0, px, py, pRadius);
    puffGrad.addColorStop(0, 'rgba(217, 249, 157, 0.38)');
    puffGrad.addColorStop(0.45, 'rgba(132, 204, 22, 0.25)');
    puffGrad.addColorStop(0.85, 'rgba(22, 101, 52, 0.12)');
    puffGrad.addColorStop(1, 'rgba(20, 83, 45, 0)');

    ctx.fillStyle = puffGrad;
    ctx.beginPath();
    ctx.arc(px, py, pRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 7. HYPNOTIC PATTERN (Kaleidoscopic Iridescent Mandala)
// ---------------------------------------------------------------------------
function drawHypnoticPattern(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  spd: number = 1.0
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const spiralArms = 6;
  const spin = t * 0.8 * spd;

  for (let a = 0; a < spiralArms; a++) {
    const baseAng = (a / spiralArms) * Math.PI * 2 + spin;
    ctx.beginPath();
    ctx.moveTo(cx, cy);

    for (let st = 1; st <= 20; st++) {
      const dist = (st / 20) * r * 0.9;
      const angle = baseAng + (st / 20) * Math.PI * 1.8;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      ctx.lineTo(x, y);
    }

    const hue = (a * 60 + t * 40 * spd) % 360;
    ctx.strokeStyle = `hsla(${hue}, 85%, 65%, 0.65)`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Concentric pulsing neon rings
  for (let ring = 1; ring <= 3; ring++) {
    const ringR = (r * 0.85) * (ring / 3) * (0.95 + Math.sin(t * 3 * spd + ring) * 0.05);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + ring * 0.15})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 8. GENERIC / AURA SPELL FALLBACK (Sacred Dynamic Chroma Ward)
// ---------------------------------------------------------------------------
function drawGenericSpell(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  t: number,
  spd: number = 1.0
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const pulse = 1 + Math.sin(t * 2.5 * spd) * 0.05;
  const curR = r * pulse;

  const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, curR);
  grad.addColorStop(0, color);
  grad.addColorStop(0.6, color);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, curR, 0, Math.PI * 2);
  ctx.fill();

  // Stroked outer ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, curR * 0.9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 8. ELDRITCH BLAST (Cosmic Void Accretion Disc, Logarithmic Vortex & Chaotic Lightning)
// ---------------------------------------------------------------------------
function drawEldritchBlast(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  spd: number = 1.0
) {
  ctx.save();

  // 1. Cosmic Void Accretion Disc (Deep violet, eldritch indigo, turquoise)
  const voidGrad = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r * 0.98);
  voidGrad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');       // Obsidian void
  voidGrad.addColorStop(0.35, 'rgba(88, 28, 135, 0.65)');    // Deep eldritch purple
  voidGrad.addColorStop(0.7, 'rgba(13, 148, 136, 0.35)');    // Cosmic turquoise
  voidGrad.addColorStop(0.95, 'rgba(147, 51, 234, 0.15)');  // Amethyst fringe
  voidGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = voidGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
  ctx.fill();

  // 2. Swirling Logarithmic Void Arms (3 spiral branches)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const spiralArms = 3;
  const spin = -t * 2.2 * spd;
  for (let a = 0; a < spiralArms; a++) {
    const baseAngle = (a / spiralArms) * Math.PI * 2 + spin;
    ctx.beginPath();
    const steps = 30;
    for (let s = 0; s <= steps; s++) {
      const frac = s / steps;
      const armR = r * 0.1 + frac * (r * 0.85);
      const theta = baseAngle + frac * Math.PI * 1.8;
      const x = cx + Math.cos(theta) * armR;
      const y = cy + Math.sin(theta) * armR;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(45, 212, 191, ${0.4 + Math.sin(t * 3 * spd + a) * 0.15})`;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Inner bright core arm
    ctx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const frac = s / steps;
      const armR = r * 0.08 + frac * (r * 0.7);
      const theta = baseAngle + frac * Math.PI * 1.8;
      const x = cx + Math.cos(theta) * armR;
      const y = cy + Math.sin(theta) * armR;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(216, 180, 254, 0.6)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  // 3. Chaotic Branching Eldritch Lightning Tendrils
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const boltCount = 5;
  for (let b = 0; b < boltCount; b++) {
    const boltAngle = (b / boltCount) * Math.PI * 2 + Math.sin(t * 8 * spd + b * 4) * 0.35 + t * 0.5;
    const maxDist = r * (0.65 + Math.sin(t * 12 * spd + b) * 0.25);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    let curX = cx;
    let curY = cy;
    const segs = 6;
    for (let s = 1; s <= segs; s++) {
      const dist = (s / segs) * maxDist;
      const jitter = (Math.sin(t * 20 * spd + b * 7 + s * 3) * 0.5) * (r * 0.12);
      const perpAngle = boltAngle + Math.PI / 2;
      const nextX = cx + Math.cos(boltAngle) * dist + Math.cos(perpAngle) * jitter;
      const nextY = cy + Math.sin(boltAngle) * dist + Math.sin(perpAngle) * jitter;
      ctx.lineTo(nextX, nextY);
      curX = nextX;
      curY = nextY;
    }
    ctx.strokeStyle = b % 2 === 0 ? 'rgba(94, 234, 212, 0.9)' : 'rgba(192, 132, 252, 0.9)';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#2dd4bf';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Fork branches
    if (b % 2 === 0) {
      ctx.beginPath();
      ctx.moveTo(curX, curY);
      const forkAngle = boltAngle + 0.5;
      ctx.lineTo(curX + Math.cos(forkAngle) * (r * 0.2), curY + Math.sin(forkAngle) * (r * 0.2));
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }
  }
  ctx.restore();

  // 4. Orbiting Eldritch Shards / Runes (Great Old One crystalline fragments)
  const shardCount = 6;
  const shardSpin = t * 1.4 * spd;
  for (let sh = 0; sh < shardCount; sh++) {
    const shAng = (sh / shardCount) * Math.PI * 2 + shardSpin;
    const orbitDist = r * (0.55 + Math.sin(t * 2.5 * spd + sh) * 0.08);
    const sx = cx + Math.cos(shAng) * orbitDist;
    const sy = cy + Math.sin(shAng) * orbitDist;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(shAng + Math.PI / 4 + t * 3);

    // Diamond shard
    const shardSize = 4.5;
    ctx.beginPath();
    ctx.moveTo(0, -shardSize * 1.5);
    ctx.lineTo(shardSize * 0.7, 0);
    ctx.lineTo(0, shardSize * 1.5);
    ctx.lineTo(-shardSize * 0.7, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(45, 212, 191, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 1.0;
    ctx.stroke();
    ctx.restore();
  }

  // 5. Blinding Unstable Void Core & Event Horizon Corona
  const corePulse = 1 + Math.sin(t * 15 * spd) * 0.15;
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.25 * corePulse);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');     // Pure white flare
  coreGrad.addColorStop(0.3, 'rgba(167, 243, 208, 0.9)');   // Pale turquoise
  coreGrad.addColorStop(0.65, 'rgba(168, 85, 247, 0.6)');   // Eldritch violet
  coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.25 * corePulse, 0, Math.PI * 2);
  ctx.fill();

  // Dark Singularity Eye at the center
  ctx.fillStyle = '#090514';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(94, 234, 212, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 9. DIVINE SMITE (Radiant Solar Dawnburst Flare, Consecrated Ground & Holy Cross)
// ---------------------------------------------------------------------------
function drawDivineSmite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  spd: number = 1.0
) {
  ctx.save();

  // 1. Consecrated Radiant Ground Flare (Pure solar gold & ivory dawn)
  const auraGrad = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r * 0.98);
  auraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');    // Incandescent ivory
  auraGrad.addColorStop(0.25, 'rgba(254, 240, 138, 0.7)'); // Solar gold
  auraGrad.addColorStop(0.55, 'rgba(245, 158, 11, 0.35)'); // Radiant amber
  auraGrad.addColorStop(0.85, 'rgba(217, 119, 6, 0.15)');  // Warm bronze
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
  ctx.fill();

  // 2. Cardinal Holy Cross Beams & 8-point Solar Flare Rays
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const rayAngle = t * 0.25 * spd;
  const rayCount = 8;
  for (let i = 0; i < rayCount; i++) {
    const ang = (i / rayCount) * Math.PI * 2 + rayAngle;
    const isCardinal = i % 2 === 0;
    const rayLen = r * (isCardinal ? 1.05 : 0.75) * (1 + Math.sin(t * 6 * spd + i) * 0.08);
    const rayWidth = isCardinal ? 3.5 : 1.8;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);

    const beamGrad = ctx.createLinearGradient(0, 0, rayLen, 0);
    beamGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    beamGrad.addColorStop(0.3, isCardinal ? 'rgba(254, 240, 138, 0.85)' : 'rgba(251, 191, 36, 0.6)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(0, -rayWidth);
    ctx.lineTo(rayLen, 0);
    ctx.lineTo(0, rayWidth);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 3. Expanding Consecrated Ground Shockwaves (Ripples of holy power)
  const ringCount = 3;
  for (let ri = 0; ri < ringCount; ri++) {
    const phase = ((t * 0.7 * spd + ri / ringCount) % 1.0);
    const ringR = r * 0.15 + phase * (r * 0.78);
    const ringAlpha = (1 - phase) * 0.8;

    ctx.strokeStyle = `rgba(254, 240, 138, ${ringAlpha})`;
    ctx.lineWidth = (2.2 * (1 - phase * 0.5));
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Diamond perimeter facets on the outer expanding ring
    if (ri === 0) {
      const facets = 12;
      for (let f = 0; f < facets; f++) {
        const fAng = (f / facets) * Math.PI * 2 + t * 0.4;
        const fx = cx + Math.cos(fAng) * ringR;
        const fy = cy + Math.sin(fAng) * ringR;
        ctx.fillStyle = `rgba(255, 255, 255, ${ringAlpha})`;
        ctx.beginPath();
        ctx.arc(fx, fy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 4. Crackling Celestial Arc Filaments
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const arcCount = 4;
  for (let a = 0; a < arcCount; a++) {
    const aAng = (a / arcCount) * Math.PI * 2 + Math.sin(t * 10 * spd + a * 3) * 0.4 + t * 0.8;
    const aDist = r * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const midX = cx + Math.cos(aAng + 0.2) * (aDist * 0.6) + (Math.sin(t * 15 * spd + a) * 8);
    const midY = cy + Math.sin(aAng + 0.2) * (aDist * 0.6) + (Math.cos(t * 15 * spd + a) * 8);
    const endX = cx + Math.cos(aAng) * aDist;
    const endY = cy + Math.sin(aAng) * aDist;
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();

  // 5. Searing White-Hot Smite Impact Core
  const corePulse = 1 + Math.sin(t * 12 * spd) * 0.12;
  const smiteGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.28 * corePulse);
  smiteGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  smiteGrad.addColorStop(0.35, 'rgba(254, 240, 138, 0.95)');
  smiteGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.7)');
  smiteGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = smiteGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.28 * corePulse, 0, Math.PI * 2);
  ctx.fill();

  // Solar central cross highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 2.5;
  const crossSize = r * 0.22 * corePulse;
  ctx.beginPath();
  ctx.moveTo(cx - crossSize, cy);
  ctx.lineTo(cx + crossSize, cy);
  ctx.moveTo(cx, cy - crossSize);
  ctx.lineTo(cx, cy + crossSize);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 10. ACID POOL (Caustic Vitriol Fluid, Popping Specular Blisters & Corrosive Rim)
// ---------------------------------------------------------------------------
function drawAcidPool(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  spd: number = 1.0
) {
  ctx.save();

  // 1. Corrosive Etched Rock Boundary (Acid burned terrain border)
  const segments = 24;
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const ang = (i / segments) * Math.PI * 2;
    const noise = 1 + Math.sin(ang * 4 + t * 0.6 * spd) * 0.05 + Math.cos(ang * 7 - t * 0.4 * spd) * 0.03;
    const px = cx + Math.cos(ang) * (r * 0.94 * noise);
    const py = cy + Math.sin(ang) * (r * 0.94 * noise);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  // Sizzling acid etched rim
  ctx.strokeStyle = 'rgba(20, 83, 45, 0.85)'; // Dark forest vitriol rim
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(163, 230, 53, 0.45)'; // Chartreuse caustic edge
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Clip to acid pool basin so contents bubble within
  ctx.save();
  ctx.clip();

  // 2. Base Caustic Vitriol Fluid (Deep viridian depths -> glowing chartreuse -> neon toxic highlights)
  const pulse = 1 + Math.sin(t * 1.8 * spd) * 0.03;
  const acidGrad = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r * 0.92 * pulse);
  acidGrad.addColorStop(0, 'rgba(217, 249, 157, 0.95)');   // Pale radiant lime center
  acidGrad.addColorStop(0.3, 'rgba(132, 204, 22, 0.88)');   // Vibrant toxic chartreuse
  acidGrad.addColorStop(0.65, 'rgba(22, 101, 52, 0.85)');   // Deep emerald vitriol
  acidGrad.addColorStop(1, 'rgba(15, 23, 42, 0.92)');      // Corroded dark bed
  ctx.fillStyle = acidGrad;
  ctx.fill();

  // 3. Swirling Toxic Sludge Currents
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const sludgeCount = 6;
  for (let s = 0; s < sludgeCount; s++) {
    const sAng = (s / sludgeCount) * Math.PI * 2 + t * 0.3 * spd;
    const sDist = r * (0.3 + (s % 3) * 0.2);
    const sx = cx + Math.cos(sAng) * sDist;
    const sy = cy + Math.sin(sAng) * sDist;

    ctx.strokeStyle = `rgba(190, 242, 100, ${0.35 + Math.sin(t * 2.5 * spd + s) * 0.15})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.22, sAng, sAng + Math.PI * 1.2);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Dynamic Popping Acid Blisters / Bubbles
  const bubbleCount = 7;
  for (let b = 0; b < bubbleCount; b++) {
    const bAng = (b / bubbleCount) * Math.PI * 2 + b * 2.3;
    const bDist = r * (0.15 + (b % 4) * 0.18);
    const bx = cx + Math.cos(bAng) * bDist;
    const by = cy + Math.sin(bAng) * bDist;

    const bPhase = ((t * 0.8 * spd + b * 0.17) % 1.0);
    const maxBSize = 5 + (b % 3) * 3;

    if (bPhase < 0.7) {
      // Swelling blister with 3D specular highlight
      const swell = Math.sin((bPhase / 0.7) * (Math.PI / 2));
      const bR = Math.max(1, maxBSize * swell);

      const bGrad = ctx.createRadialGradient(bx - bR * 0.35, by - bR * 0.35, 0, bx, by, bR);
      bGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      bGrad.addColorStop(0.3, 'rgba(217, 249, 157, 0.85)');
      bGrad.addColorStop(0.8, 'rgba(101, 163, 13, 0.8)');
      bGrad.addColorStop(1, 'rgba(20, 83, 45, 0.7)');

      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, bR, 0, Math.PI * 2);
      ctx.fill();

      // Specular glare dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(bx - bR * 0.3, by - bR * 0.3, Math.max(0.5, bR * 0.25), 0, Math.PI * 2);
      ctx.fill();
    } else if (bPhase < 0.9) {
      // Bursting droplet ring
      const burstProg = (bPhase - 0.7) / 0.2;
      const ringR = maxBSize + burstProg * 8;
      const alpha = (1 - burstProg) * 0.85;

      ctx.strokeStyle = `rgba(217, 249, 157, ${alpha})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(bx, by, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // Ejected micro splash droplets
      const splashCount = 4;
      for (let sp = 0; sp < splashCount; sp++) {
        const spAng = (sp / splashCount) * Math.PI * 2 + b;
        const spDist = ringR + burstProg * 4;
        ctx.fillStyle = `rgba(190, 242, 100, ${alpha})`;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(spAng) * spDist, by + Math.sin(spAng) * spDist, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 5. Pulsing Subterranean Toxic Veins
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let v = 0; v < 4; v++) {
    const vAng = (v / 4) * Math.PI * 2 + t * 0.1 * spd;
    const vPulse = 0.4 + Math.sin(t * 3.5 * spd + v * 2) * 0.3;
    ctx.strokeStyle = `rgba(234, 179, 8, ${vPulse * 0.6})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const midX = cx + Math.cos(vAng + 0.3) * (r * 0.4);
    const midY = cy + Math.sin(vAng + 0.3) * (r * 0.4);
    const endX = cx + Math.cos(vAng) * (r * 0.8);
    const endY = cy + Math.sin(vAng) * (r * 0.8);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore(); // Exit clip

  // 6. Noxious Vapor Wisps drifting above
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let w = 0; w < 3; w++) {
    const wPhase = ((t * 0.5 * spd + w / 3) % 1.0);
    const wR = r * (0.3 + wPhase * 0.45);
    const wAlpha = Math.sin(wPhase * Math.PI) * 0.25;
    ctx.fillStyle = `rgba(163, 230, 53, ${wAlpha})`;
    ctx.beginPath();
    ctx.arc(cx + Math.sin(t * 2 + w) * 8, cy - wPhase * 15, wR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 11. SHADOW GRASP (Arms of Hadar / Abyssal Void & Writhing Articulated Tentacles)
// ---------------------------------------------------------------------------
function drawShadowGrasp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  spd: number = 1.0
) {
  ctx.save();

  // 1. Abyssal Obsidian Void (Far Realm rift opening)
  const voidGrad = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r * 0.98);
  voidGrad.addColorStop(0, '#020108');                      // Pure abyssal obsidian
  voidGrad.addColorStop(0.4, 'rgba(15, 7, 34, 0.95)');      // Deep umbral void
  voidGrad.addColorStop(0.7, 'rgba(49, 14, 88, 0.65)');     // Eldritch purple shadow
  voidGrad.addColorStop(0.9, 'rgba(30, 27, 75, 0.3)');      // Inky indigo fringe
  voidGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = voidGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
  ctx.fill();

  // 2. Umbral Vortex Arms (Counter-rotating void whorls)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const vortexCount = 4;
  const vortexSpin = -t * 0.9 * spd;
  for (let v = 0; v < vortexCount; v++) {
    const baseAng = (v / vortexCount) * Math.PI * 2 + vortexSpin;
    ctx.beginPath();
    const steps = 24;
    for (let s = 0; s <= steps; s++) {
      const frac = s / steps;
      const vR = r * 0.08 + frac * (r * 0.82);
      const theta = baseAng + frac * Math.PI * 1.4;
      const vx = cx + Math.cos(theta) * vR;
      const vy = cy + Math.sin(theta) * vR;
      if (s === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.strokeStyle = `rgba(139, 92, 246, ${0.35 + Math.sin(t * 2 * spd + v) * 0.15})`;
    ctx.lineWidth = 3.0;
    ctx.stroke();
  }
  ctx.restore();

  // 3. Seven Writhing Articulated Shadow Tentacles (Arms of Hadar)
  const tentacleCount = 7;
  for (let tent = 0; tent < tentacleCount; tent++) {
    const baseAng = (tent / tentacleCount) * Math.PI * 2 + t * 0.15 * spd;
    const reach = r * (0.85 + Math.sin(t * 2.8 * spd + tent * 1.7) * 0.15);

    // Dynamic curling kinematics
    const curlPhase = t * 3.2 * spd + tent * 1.5;
    const midCurvature = Math.sin(curlPhase) * (r * 0.35);
    const tipCurvature = Math.cos(curlPhase * 1.3) * (r * 0.25);

    const rootX = cx + Math.cos(baseAng) * (r * 0.12);
    const rootY = cy + Math.sin(baseAng) * (r * 0.12);

    const normalAng = baseAng + Math.PI / 2;
    const midDist = reach * 0.55;
    const midX = cx + Math.cos(baseAng) * midDist + Math.cos(normalAng) * midCurvature;
    const midY = cy + Math.sin(baseAng) * midDist + Math.sin(normalAng) * midCurvature;

    const tipX = cx + Math.cos(baseAng) * reach + Math.cos(normalAng) * tipCurvature;
    const tipY = cy + Math.sin(baseAng) * reach + Math.sin(normalAng) * tipCurvature;

    // Outer shadow glow of the tentacle
    ctx.save();
    ctx.strokeStyle = 'rgba(109, 40, 217, 0.4)';
    ctx.lineWidth = 7.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();

    // Solid obsidian tentacle body tapering to a needle tip
    ctx.strokeStyle = '#05020c';
    ctx.lineWidth = 4.2;
    ctx.stroke();

    // Violet bioluminescent spine streak along the tentacle back
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Wicked clawed talon barb at the tip
    const barbAng = baseAng + (midCurvature > 0 ? 0.7 : -0.7);
    const barbLen = 6;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + Math.cos(barbAng) * barbLen, tipY + Math.sin(barbAng) * barbLen);
    ctx.strokeStyle = 'rgba(233, 213, 255, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Spiny barbs along the mid-section
    const spineAng = normalAng;
    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(midX + Math.cos(spineAng) * 4.5, midY + Math.sin(spineAng) * 4.5);
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }

  // 4. Inky Singularity Core & Pulling Void Particles
  const singularityPulse = 1 + Math.sin(t * 5 * spd) * 0.1;
  ctx.save();
  ctx.fillStyle = '#010005';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.16 * singularityPulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(139, 92, 246, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Void eye specular gleam
  ctx.fillStyle = 'rgba(192, 132, 252, 0.8)';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 5. Inward-Sucking Necrotic Void Motes
  const moteCount = 6;
  for (let m = 0; m < moteCount; m++) {
    const mAng = (m / moteCount) * Math.PI * 2 + m * 1.5;
    const progress = ((t * 0.65 * spd + m * 0.19) % 1.0);
    const mDist = r * (0.85 - progress * 0.65); // Moving inward!
    const mx = cx + Math.cos(mAng + progress * 2) * mDist;
    const my = cy + Math.sin(mAng + progress * 2) * mDist;
    const mAlpha = (1 - progress) * 0.75;

    ctx.fillStyle = `rgba(168, 85, 247, ${mAlpha})`;
    ctx.beginPath();
    ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// MAIN PROCEDURAL SPELL EFFECT COMPONENT
// ---------------------------------------------------------------------------
export const ProceduralSpellEffect: React.FC<ProceduralSpellEffectProps> = ({
  effect,
  gridSize = 50,
  stageScale = 1
}) => {
  const imageRef = useRef<any>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Dedicated offscreen canvas for high-DPI rendering
  const canvas = useMemo(() => {
    return document.createElement('canvas');
  }, []);

  const size = Math.max(16, effect.size);
  const canvasSize = Math.max(128, Math.min(512, Math.round(size * 2)));

  useEffect(() => {
    canvas.width = canvasSize;
    canvas.height = canvasSize;
  }, [canvas, canvasSize]);

  useEffect(() => {
    let isMounted = true;

    const render = () => {
      if (!isMounted) return;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasSize, canvasSize);

        const cx = canvasSize / 2;
        const cy = canvasSize / 2;
        const r = (canvasSize / 2) * 0.92;
        const t = performance.now() / 1000;
        const spd = 1.0;

        const label = (effect.label || '').toLowerCase();

        if (label.includes('eldritch') || label.includes('blast')) {
          drawEldritchBlast(ctx, cx, cy, r, t, spd);
        } else if (label.includes('divine') || label.includes('smite')) {
          drawDivineSmite(ctx, cx, cy, r, t, spd);
        } else if (label.includes('acid') || label.includes('vitriol')) {
          drawAcidPool(ctx, cx, cy, r, t, spd);
        } else if (label.includes('grasp') || label.includes('hadar') || label.includes('shadow grasp') || label.includes('tentacle')) {
          drawShadowGrasp(ctx, cx, cy, r, t, spd);
        } else if (label.includes('spirit') || label.includes('guardian')) {
          drawSpiritGuardians(ctx, cx, cy, r, t, spd);
        } else if (label.includes('beacon') || label.includes('hope')) {
          drawBeaconOfHope(ctx, cx, cy, r, t, spd);
        } else if (label.includes('fireball') || label.includes('fire bolt')) {
          drawFireball(ctx, cx, cy, r, t, spd);
        } else if (label.includes('darkness') || label.includes('shadow')) {
          drawDarkness(ctx, cx, cy, r, t, spd);
        } else if (label.includes('fog')) {
          drawFogCloud(ctx, cx, cy, r, t, spd);
        } else if (label.includes('poison') || label.includes('cloudkill')) {
          drawPoisonCloud(ctx, cx, cy, r, t, spd);
        } else if (label.includes('hypnotic')) {
          drawHypnoticPattern(ctx, cx, cy, r, t, spd);
        } else {
          drawGenericSpell(ctx, cx, cy, r, effect.color || 'rgba(147, 51, 234, 0.4)', t, spd);
        }

        // Notify Konva of canvas update
        imageRef.current?.getLayer()?.batchDraw();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [canvas, canvasSize, effect]);

  return (
    <KonvaImage
      ref={imageRef}
      name="effect"
      image={canvas}
      x={-size}
      y={-size}
      width={size * 2}
      height={size * 2}
      opacity={effect.opacity !== undefined ? effect.opacity : 0.95}
    />
  );
};
