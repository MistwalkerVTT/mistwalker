import React, { useState } from 'react';
import { Group, Rect, Line, Text } from 'react-konva';
import { RoomAnnotation, CampaignMode } from '../types';

interface RoomHotspotLayerProps {
  annotations: RoomAnnotation[];
  mapDimensions: { width: number; height: number };
  stageScale: number;
  campaignMode: CampaignMode;
  isPlayerView?: boolean;
  selectedAnnotationId: string | null;
  hoveredAnnotationId?: string | null;
  onHoverAnnotation?: (annotationId: string | null) => void;
  onSelectAnnotation: (annotation: RoomAnnotation) => void;
  onOpenBriefing: (annotation: RoomAnnotation) => void;
}

export const RoomHotspotLayer: React.FC<RoomHotspotLayerProps> = React.memo(({
  annotations,
  mapDimensions,
  stageScale,
  campaignMode,
  isPlayerView = false,
  selectedAnnotationId,
  hoveredAnnotationId,
  onHoverAnnotation,
  onSelectAnnotation,
  onOpenBriefing
}) => {
  const [internalHoveredAnnoId, setInternalHoveredAnnoId] = useState<string | null>(null);
  const activeHoveredId = hoveredAnnotationId !== undefined ? hoveredAnnotationId : internalHoveredAnnoId;

  const setHovered = (id: string | null) => {
    setInternalHoveredAnnoId(id);
    onHoverAnnotation?.(id);
  };

  // CRITICAL SECURITY: Non-DM player clients cannot see room overlays or trigger popups under any circumstances.
  if (isPlayerView) {
    return null;
  }

  const { width: mapW, height: mapH } = mapDimensions;
  if (!mapW || !mapH) return null;

  return (
    <Group id="room-hotspots-group">
      {annotations.map((anno) => {
        // Room Zone Polygons ONLY show up when hovering directly over the button associated with the zone (e.g. "V8")
        const isHovered = activeHoveredId === anno.id;
        const baseColor = anno.color || '#f59e0b'; // Default amber
        const hasPolygon = anno.polygonPoints && anno.polygonPoints.length >= 6;

        // Convert percentage bounds to actual pixel positions on the map
        const pixelX = (anno.bounds.x / 100) * mapW;
        const pixelY = (anno.bounds.y / 100) * mapH;
        const pixelW = (anno.bounds.width / 100) * mapW;
        const pixelH = (anno.bounds.height / 100) * mapH;

        // Convert percentage polygon points to pixel coords
        const pixelPolyPoints: number[] = hasPolygon
          ? anno.polygonPoints!.map((val, idx) => (idx % 2 === 0 ? (val / 100) * mapW : (val / 100) * mapH))
          : [];

        // Center calculation for label badge button
        let centerPixelX = pixelX + pixelW / 2;
        let centerPixelY = pixelY + pixelH / 2;
        if (hasPolygon && pixelPolyPoints.length >= 6) {
          let sumX = 0;
          let sumY = 0;
          const count = pixelPolyPoints.length / 2;
          for (let i = 0; i < pixelPolyPoints.length; i += 2) {
            sumX += pixelPolyPoints[i];
            sumY += pixelPolyPoints[i + 1];
          }
          centerPixelX = sumX / count;
          centerPixelY = sumY / count;
        }

        const displayLabel = anno.label || (anno.roomNumber ? `${anno.roomNumber}: ${anno.roomName || 'Zone'}` : 'Room');
        const badgeText = (anno.roomNumber || displayLabel.substring(0, 4)).toUpperCase();

        const fontSize = Math.max(10, Math.min(18, 11 / stageScale));
        const badgePadding = 8 / stageScale;
        const badgeW = Math.max(28 / stageScale, badgeText.length * (fontSize * 0.6) + badgePadding * 2);
        const badgeH = fontSize * 1.5;

        const handleRightClick = (e: any) => {
          e.cancelBubble = true;
          if (e.evt) {
            e.evt.preventDefault();
            e.evt.stopPropagation();
          }
          if (campaignMode === 'creator') {
            onSelectAnnotation(anno);
          } else {
            onOpenBriefing(anno);
          }
        };

        const handleBadgeLeftClick = (e: any) => {
          e.cancelBubble = true;
          if (e.evt) {
            e.evt.preventDefault();
            e.evt.stopPropagation();
          }
          if (campaignMode === 'creator') {
            onSelectAnnotation(anno);
          } else {
            onOpenBriefing(anno);
          }
        };

        return (
          <Group key={anno.id} id={`hotspot-${anno.id}`}>
            {/* Room Zone Polygon: ONLY shows up when directly hovering over the button associated with the zone */}
            {isHovered && (
              hasPolygon ? (
                <Group listening={false}>
                  {/* Glowing shaded room polygon fill & primary dashed border */}
                  <Line
                    points={pixelPolyPoints}
                    closed={true}
                    fill="rgba(245, 158, 11, 0.28)"
                    stroke="#fbbf24"
                    strokeWidth={3 / stageScale}
                    shadowColor="#f59e0b"
                    shadowBlur={14 / stageScale}
                    shadowOpacity={0.9}
                    dash={[8 / stageScale, 4 / stageScale]}
                    listening={false}
                  />
                  {/* Crisp white accent border */}
                  <Line
                    points={pixelPolyPoints}
                    closed={true}
                    fill="transparent"
                    stroke="#ffffff"
                    strokeWidth={1.5 / stageScale}
                    opacity={0.85}
                    listening={false}
                  />
                </Group>
              ) : (
                <Group listening={false}>
                  <Rect
                    x={pixelX}
                    y={pixelY}
                    width={pixelW}
                    height={pixelH}
                    fill="rgba(245, 158, 11, 0.28)"
                    stroke="#fbbf24"
                    strokeWidth={3 / stageScale}
                    shadowColor="#f59e0b"
                    shadowBlur={14 / stageScale}
                    shadowOpacity={0.9}
                    dash={[8 / stageScale, 4 / stageScale]}
                    cornerRadius={4 / stageScale}
                    listening={false}
                  />
                  <Rect
                    x={pixelX}
                    y={pixelY}
                    width={pixelW}
                    height={pixelH}
                    fill="transparent"
                    stroke="#ffffff"
                    strokeWidth={1.5 / stageScale}
                    opacity={0.85}
                    cornerRadius={4 / stageScale}
                    listening={false}
                  />
                </Group>
              )
            )}

            {/* Room Number Badge Button (e.g., "V8") - Direct hover target */}
            <Group
              x={centerPixelX}
              y={centerPixelY}
              listening={true}
              onClick={handleBadgeLeftClick}
              onTap={handleBadgeLeftClick}
              onContextMenu={handleRightClick}
              onMouseEnter={(e) => {
                setHovered(anno.id);
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'pointer';
              }}
              onMouseLeave={(e) => {
                setHovered(null);
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
              }}
            >
              <Rect
                x={-(badgeW / 2)}
                y={-(badgeH / 2)}
                width={badgeW}
                height={badgeH}
                fill={isHovered ? '#f59e0b' : 'rgba(24, 24, 27, 0.95)'}
                stroke={isHovered ? '#ffffff' : baseColor}
                strokeWidth={(isHovered ? 2 : 1.2) / stageScale}
                cornerRadius={4 / stageScale}
                shadowColor={isHovered ? '#f59e0b' : 'black'}
                shadowBlur={isHovered ? 12 / stageScale : 4 / stageScale}
                shadowOpacity={isHovered ? 0.95 : 0.8}
              />
              <Text
                text={badgeText}
                fontSize={fontSize}
                fontFamily="monospace"
                fontStyle="bold"
                fill={isHovered ? '#000000' : '#fde68a'}
                align="center"
                verticalAlign="middle"
                x={-(badgeW / 2)}
                y={-(badgeH / 2)}
                width={badgeW}
                height={badgeH}
              />
            </Group>
          </Group>
        );
      })}
    </Group>
  );
});

export default RoomHotspotLayer;
