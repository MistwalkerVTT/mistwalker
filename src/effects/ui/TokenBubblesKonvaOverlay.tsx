// src/effects/ui/TokenBubblesKonvaOverlay.tsx
// Renders status/debuff badges (e.g. Hunter's Mark, Hex, custom DM indicators)
// positioned cleanly above the token's head inside the React-Konva token Group,
// rendering the exact same crisp icons shown in the Badges menu.

import React from 'react';
import { Group, Circle, Text } from 'react-konva';
import { TokenStatusBubble, TokenStatusBadge } from '../types/bubble';

interface TokenBubblesKonvaOverlayProps {
  bubbles: TokenStatusBubble[] | undefined;
  tokenWidth: number;
}

export const TokenBubblesKonvaOverlay: React.FC<TokenBubblesKonvaOverlayProps> = React.memo(({
  bubbles,
  tokenWidth
}) => {
  if (!bubbles || bubbles.length === 0) return null;

  const count = bubbles.length;
  const badgeSpacing = 26;
  const totalWidth = (count - 1) * badgeSpacing;
  const tokenCenterX = tokenWidth / 2;
  const startX = tokenCenterX - (totalWidth / 2);
  const badgeY = -9; // Floats right above the token head rim

  return (
    <Group listening={false}>
      {bubbles.map((b, idx) => {
        const bx = startX + idx * badgeSpacing;
        const color = b.color || '#38bdf8';
        const hasSub = Boolean(b.subLabel);

        return (
          <Group key={b.id || `badge-${idx}`} x={bx} y={badgeY}>
            {/* Outer subtle glow ring */}
            <Circle
              radius={13}
              stroke={color}
              strokeWidth={0.8}
              opacity={0.35}
              perfectDrawEnabled={false}
            />

            {/* Badge Base Disc */}
            <Circle
              radius={11}
              fill={b.bgColor || '#090d16'}
              stroke={color}
              strokeWidth={1.5}
              shadowColor={color}
              shadowBlur={b.pulse ? 5 : 2}
              shadowOpacity={0.8}
              perfectDrawEnabled={false}
            />

            {/* Badge Layout: Small Top Sublabel (if present) + Centered Icon Matching Menu */}
            {hasSub ? (
              <>
                <Text
                  x={-11}
                  y={-9}
                  width={22}
                  align="center"
                  text={b.subLabel}
                  fontSize={6}
                  fontStyle="bold"
                  fontFamily="monospace"
                  fill={color}
                  perfectDrawEnabled={false}
                />
                <Text
                  x={-11}
                  y={-2}
                  width={22}
                  align="center"
                  text={b.icon || '•'}
                  fontSize={9}
                  fill="#ffffff"
                  perfectDrawEnabled={false}
                />
              </>
            ) : (
              /* Center Icon / Emoji matching Badges menu */
              <Text
                x={-11}
                y={-6.5}
                width={22}
                align="center"
                text={b.icon || '★'}
                fontSize={11}
                fill="#ffffff"
                perfectDrawEnabled={false}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
});

export const TokenBadgesKonvaOverlay = TokenBubblesKonvaOverlay;
