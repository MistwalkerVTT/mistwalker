// src/effects/ui/TokenBubblesKonvaOverlay.tsx
// Renders status/debuff bubbles (e.g. Hunter's Mark, Hex, AC-like indicator badges)
// positioned above the token's head inside the React-Konva token Group.

import React from 'react';
import { Group, Circle, Text, Line } from 'react-konva';
import { TokenStatusBubble } from '../types/bubble';

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
  const bubbleSpacing = 26;
  const totalWidth = (count - 1) * bubbleSpacing;
  const tokenCenterX = tokenWidth / 2;
  const startX = tokenCenterX - (totalWidth / 2);
  const bubbleY = -8; // Floats right above the token head rim

  return (
    <Group listening={false}>
      {bubbles.map((b, idx) => {
        const bx = startX + idx * bubbleSpacing;
        const color = b.color || '#38bdf8';
        const hasSub = Boolean(b.subLabel);

        return (
          <Group key={b.id || `bubble-${idx}`} x={bx} y={bubbleY}>
            {/* Outer subtle halo ring */}
            <Circle
              radius={13}
              stroke={color}
              strokeWidth={0.8}
              opacity={0.3}
              perfectDrawEnabled={false}
            />

            {/* Bubble Base Disc */}
            <Circle
              radius={11}
              fill={b.bgColor || '#090d16'}
              stroke={color}
              strokeWidth={1.5}
              shadowColor={color}
              shadowBlur={b.pulse ? 6 : 2}
              shadowOpacity={0.8}
              perfectDrawEnabled={false}
            />

            {/* AC Badge Styled Layout: Small Top Label + Bottom Icon/Value */}
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
              /* Center Icon / Emoji */
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
