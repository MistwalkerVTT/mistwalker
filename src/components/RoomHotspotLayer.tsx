import React, { useState } from 'react';
import { Group, Rect, Line, Text, Circle } from 'react-konva';
import { RoomAnnotation, CampaignMode, normalizeRoomAnnotations } from '../types';

export const LABEL_GLYPHS: Record<string, string> = {
  'stairs-up': '⤊',
  'stairs-down': '⤋',
  'ladder': '🪜',
  'ladder-up': '🪜',
  'ladder-down': '🪜',
  'trapdoor': '🚪',
  'portal': '🌀',
  'secret': '🗝️',
  'arrow-up': '⬆',
  'arrow-down': '⬇',
  'door': '🚪',
  'tag': '🏷️',
  'warning': '⚠️'
};

interface RoomHotspotLayerProps {
  annotations: RoomAnnotation[];
  mapDimensions: { width: number; height: number };
  stageScale: number;
  campaignMode: CampaignMode;
  isPlayerView?: boolean;
  isDrawingPolygon?: boolean;
  selectedAnnotationId: string | null;
  hoveredAnnotationId?: string | null;
  onHoverAnnotation?: (annotationId: string | null) => void;
  onSelectAnnotation: (annotation: RoomAnnotation) => void;
  onOpenBriefing: (annotation: RoomAnnotation) => void;
  onUpdateAnnotation?: (annotation: RoomAnnotation) => void;
}

export const RoomHotspotLayer: React.FC<RoomHotspotLayerProps> = React.memo(({
  annotations,
  mapDimensions,
  stageScale,
  campaignMode,
  isPlayerView = false,
  isDrawingPolygon = false,
  selectedAnnotationId,
  hoveredAnnotationId,
  onHoverAnnotation,
  onSelectAnnotation,
  onOpenBriefing,
  onUpdateAnnotation
}) => {
  const [internalHoveredAnnoId, setInternalHoveredAnnoId] = useState<string | null>(null);
  const activeHoveredId = hoveredAnnotationId !== undefined ? hoveredAnnotationId : internalHoveredAnnoId;

  const setHovered = (id: string | null) => {
    setInternalHoveredAnnoId(id);
    onHoverAnnotation?.(id);
  };

  const { width: mapW, height: mapH } = mapDimensions;
  if (!mapW || !mapH) return null;

  const safeAnnotations = normalizeRoomAnnotations(annotations);

  // CRITICAL SECURITY & VISIBILITY:
  // In Player View, only display annotations explicitly marked as 'label' with visibleToPlayers === true.
  // Room polygons, secret rooms, and DM briefings are NEVER rendered to player clients.
  const visibleAnnotations = isPlayerView
    ? safeAnnotations.filter((a) => (a.type === 'label' || a.type === 'hazard' || a.isHazard) && a.visibleToPlayers === true)
    : safeAnnotations;

  if (visibleAnnotations.length === 0) return null;

  return (
    <Group id="room-hotspots-group" name="room-hotspot" listening={!isDrawingPolygon}>
      {visibleAnnotations.map((anno) => {
        const isHovered = activeHoveredId === anno.id;
        const baseColor = anno.color || '#f59e0b'; // Default amber
        const hasPolygon = anno.polygonPoints && anno.polygonPoints.length >= 6;

        // Convert percentage bounds to actual pixel positions on the map (with safe fallback)
        const boundsX = typeof anno.bounds?.x === 'number' && !isNaN(anno.bounds.x) ? anno.bounds.x : 50;
        const boundsY = typeof anno.bounds?.y === 'number' && !isNaN(anno.bounds.y) ? anno.bounds.y : 50;
        const boundsW = typeof anno.bounds?.width === 'number' && !isNaN(anno.bounds.width) ? anno.bounds.width : 6;
        const boundsH = typeof anno.bounds?.height === 'number' && !isNaN(anno.bounds.height) ? anno.bounds.height : 3;

        const pixelX = (boundsX / 100) * mapW;
        const pixelY = (boundsY / 100) * mapH;
        const pixelW = (boundsW / 100) * mapW;
        const pixelH = (boundsH / 100) * mapH;

        // Convert percentage polygon points to pixel coords
        const pixelPolyPoints: number[] = hasPolygon
          ? anno.polygonPoints!.map((val, idx) => (idx % 2 === 0 ? (val / 100) * mapW : (val / 100) * mapH))
          : [];

        // Center calculation for label badge button
        let centerPixelX = pixelX + (anno.type === 'label' ? 0 : pixelW / 2);
        let centerPixelY = pixelY + (anno.type === 'label' ? 0 : pixelH / 2);
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

        const handlePointerDown = (e: any) => {
          e.cancelBubble = true;
          if (e.evt) {
            e.evt.stopPropagation();
          }
          const stage = e.target?.getStage?.();
          if (stage && typeof stage.stopDrag === 'function') {
            stage.stopDrag();
          }
        };

        const handleRightClick = (e: any) => {
          e.cancelBubble = true;
          if (e.evt) {
            e.evt.preventDefault();
            e.evt.stopPropagation();
          }
          const stage = e.target?.getStage?.();
          if (stage && typeof stage.stopDrag === 'function') {
            stage.stopDrag();
          }
          if (isPlayerView) return;
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
          const stage = e.target?.getStage?.();
          if (stage && typeof stage.stopDrag === 'function') {
            stage.stopDrag();
          }
          if (isPlayerView) return;
          if (campaignMode === 'creator') {
            onSelectAnnotation(anno);
          } else {
            onOpenBriefing(anno);
          }
        };

        // =========================================================================
        // 1. TACTICAL MAP LABEL PILL (e.g. "Stairs up to...", "Ladder down to...")
        // =========================================================================
        if (anno.type === 'label') {
          const glyph = LABEL_GLYPHS[anno.icon || 'stairs-up'] || '🏷️';
          const fullLabel = `${glyph}  ${anno.label}`;
          const fontSize = Math.max(10, Math.min(18, 11.5 / stageScale));
          const paddingX = 10 / stageScale;
          const charW = fontSize * 0.65;
          const pillW = Math.max(70 / stageScale, fullLabel.length * charW + paddingX * 2);
          const pillH = Math.max(22 / stageScale, fontSize * 1.85);
          const pillRadius = 6 / stageScale;

          return (
            <Group
              key={anno.id}
              id={`label-${anno.id}`}
              name="room-hotspot"
              x={centerPixelX}
              y={centerPixelY}
              draggable={!isPlayerView && campaignMode === 'creator'}
              onMouseDown={handlePointerDown}
              onTouchStart={handlePointerDown}
              onDragEnd={(e) => {
                if (isPlayerView || campaignMode !== 'creator') return;
                const newPctX = Math.max(0, Math.min(100, (e.target.x() / mapW) * 100));
                const newPctY = Math.max(0, Math.min(100, (e.target.y() / mapH) * 100));
                onUpdateAnnotation?.({
                  ...anno,
                  bounds: {
                    ...anno.bounds,
                    x: newPctX,
                    y: newPctY
                  }
                });
              }}
              onClick={handleBadgeLeftClick}
              onTap={handleBadgeLeftClick}
              onContextMenu={handleRightClick}
              onMouseEnter={(e) => {
                if (!isPlayerView) {
                  setHovered(anno.id);
                  const container = e.target.getStage()?.container();
                  if (container) {
                    container.style.cursor = campaignMode === 'creator' ? 'grab' : 'pointer';
                  }
                }
              }}
              onMouseLeave={(e) => {
                if (!isPlayerView) {
                  setHovered(null);
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'default';
                }
              }}
            >
              {/* Outer Glow / Dark Shadow */}
              <Rect
                x={-(pillW / 2)}
                y={-(pillH / 2)}
                width={pillW}
                height={pillH}
                fill={isHovered ? 'rgba(24, 24, 27, 0.98)' : 'rgba(15, 23, 42, 0.92)'}
                stroke={isHovered ? '#ffffff' : baseColor}
                strokeWidth={(isHovered ? 2 : 1.2) / stageScale}
                cornerRadius={pillRadius}
                shadowColor={isHovered ? baseColor : 'black'}
                shadowBlur={isHovered ? 12 / stageScale : 6 / stageScale}
                shadowOpacity={0.85}
              />

              {/* Label Text with Icon */}
              <Text
                text={fullLabel}
                fontSize={fontSize}
                fontFamily="system-ui, -apple-system, sans-serif"
                fontStyle="bold"
                fill={isHovered ? '#ffffff' : '#f8fafc'}
                align="center"
                verticalAlign="middle"
                x={-(pillW / 2)}
                y={-(pillH / 2)}
                width={pillW}
                height={pillH}
              />

              {/* Status Indicator Dot for DM View (Green = Visible to players, Gray = DM only) */}
              {!isPlayerView && (
                <Circle
                  x={(pillW / 2) - (6 / stageScale)}
                  y={-(pillH / 2) + (6 / stageScale)}
                  radius={2.5 / stageScale}
                  fill={anno.visibleToPlayers ? '#10b981' : '#71717a'}
                  stroke="#000000"
                  strokeWidth={0.5 / stageScale}
                />
              )}
            </Group>
          );
        }

        // =========================================================================
        // 2. ROOM ZONE POLYGON & NUMBERED BADGE (e.g. "V8", "12")
        // =========================================================================
        const displayLabel = anno.label || (anno.roomNumber ? `${anno.roomNumber}: ${anno.roomName || 'Zone'}` : 'Room');
        const isHazardAnno = anno.type === 'hazard' || anno.isHazard;
        const hazardGlyph = anno.hazardType === 'lava' ? '🔥' : anno.hazardType === 'chasm_fall' ? '🕳️' : anno.hazardType === 'acid_pool' ? '🧪' : '⚠️';
        const badgeText = isHazardAnno
          ? `${hazardGlyph} ${(anno.roomNumber || anno.hazardType || 'HAZARD').toUpperCase()}`
          : (anno.roomNumber || displayLabel.substring(0, 4)).toUpperCase();

        const fontSize = Math.max(10, Math.min(18, 11 / stageScale));
        const badgePadding = 8 / stageScale;
        const badgeW = Math.max(28 / stageScale, badgeText.length * (fontSize * 0.6) + badgePadding * 2);
        const badgeH = fontSize * 1.5;

        return (
          <Group key={anno.id} id={`hotspot-${anno.id}`}>
            {/* Hazard Zone or Room Zone Polygon */}
            {((anno.type === 'hazard' || anno.isHazard) || isHovered) && (
              hasPolygon ? (
                <Group listening={false}>
                  <Line
                    points={pixelPolyPoints}
                    closed={true}
                    fill={anno.isHazard || anno.type === 'hazard'
                      ? (isHovered ? 'rgba(239, 68, 68, 0.38)' : 'rgba(239, 68, 68, 0.16)')
                      : 'rgba(245, 158, 11, 0.28)'}
                    stroke={anno.color || (anno.isHazard || anno.type === 'hazard' ? '#ef4444' : '#fbbf24')}
                    strokeWidth={(isHovered ? 3 : 2) / stageScale}
                    shadowColor={anno.color || '#ef4444'}
                    shadowBlur={(isHovered ? 14 : 6) / stageScale}
                    shadowOpacity={0.9}
                    dash={[8 / stageScale, 4 / stageScale]}
                    listening={false}
                  />
                  <Line
                    points={pixelPolyPoints}
                    closed={true}
                    fill="transparent"
                    stroke="#ffffff"
                    strokeWidth={1.5 / stageScale}
                    opacity={isHovered ? 0.9 : 0.4}
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
                    fill={anno.isHazard || anno.type === 'hazard'
                      ? (isHovered ? 'rgba(239, 68, 68, 0.38)' : 'rgba(239, 68, 68, 0.16)')
                      : 'rgba(245, 158, 11, 0.28)'}
                    stroke={anno.color || (anno.isHazard || anno.type === 'hazard' ? '#ef4444' : '#fbbf24')}
                    strokeWidth={(isHovered ? 3 : 2) / stageScale}
                    shadowColor={anno.color || '#ef4444'}
                    shadowBlur={(isHovered ? 14 : 6) / stageScale}
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
                    opacity={isHovered ? 0.9 : 0.4}
                    cornerRadius={4 / stageScale}
                    listening={false}
                  />
                </Group>
              )
            )}

            {/* Room Number Badge Button (e.g., "V8") - Direct hover target */}
            <Group
              name="room-hotspot"
              x={centerPixelX}
              y={centerPixelY}
              listening={true}
              onMouseDown={handlePointerDown}
              onTouchStart={handlePointerDown}
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
