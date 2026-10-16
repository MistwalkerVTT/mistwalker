import React from 'react';
import { Layer, Shape } from 'react-konva';

interface GridLayerProps {
  mapWidth: number;
  mapHeight: number;
  gridSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  gridOpacity: number;
  stageScale: number;
}

export const GridLayer: React.FC<GridLayerProps> = React.memo(({
  mapWidth,
  mapHeight,
  gridSize,
  gridOffsetX,
  gridOffsetY,
  gridOpacity,
  stageScale
}) => {
  if (gridSize <= 0 || gridOpacity <= 0 || mapWidth <= 0 || mapHeight <= 0) return null;

  return (
    <Layer listening={false}>
      <Shape
        listening={false}
        sceneFunc={(context, shape) => {
          context.beginPath();
          const startX = (gridOffsetX % gridSize) - gridSize;
          const endX = mapWidth + gridSize;
          for (let x = startX; x <= endX; x += gridSize) {
            context.moveTo(x, 0);
            context.lineTo(x, mapHeight);
          }
          const startY = (gridOffsetY % gridSize) - gridSize;
          const endY = mapHeight + gridSize;
          for (let y = startY; y <= endY; y += gridSize) {
            context.moveTo(0, y);
            context.lineTo(mapWidth, y);
          }
          context.strokeShape(shape);
        }}
        stroke="white"
        strokeWidth={1 / stageScale}
        opacity={gridOpacity}
      />
    </Layer>
  );
});
