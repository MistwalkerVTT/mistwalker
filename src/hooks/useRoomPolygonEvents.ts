import { useState, useCallback } from 'react';
import { KonvaEventObject } from 'konva/lib/Node';
import { RoomAnnotation } from '../types';

export interface UseRoomPolygonEventsProps {
  onSelectRoom: (annotation: RoomAnnotation) => void;
  stageScale: number;
}

export function useRoomPolygonEvents({ onSelectRoom, stageScale }: UseRoomPolygonEventsProps) {
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

  const handleMouseEnter = useCallback(
    (e: KonvaEventObject<MouseEvent>, annotation: RoomAnnotation) => {
      setHoveredRoomId(annotation.id);
      const stage = e.target.getStage();
      if (stage) {
        stage.container().style.cursor = 'pointer';
      }
    },
    []
  );

  const handleMouseLeave = useCallback((e: KonvaEventObject<MouseEvent>) => {
    setHoveredRoomId(null);
    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }
  }, []);

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>, annotation: RoomAnnotation) => {
      e.cancelBubble = true;
      onSelectRoom(annotation);
    },
    [onSelectRoom]
  );

  /**
   * Transforms normalized percentage polygon points ([x1, y1, x2, y2, ...]) (0-100)
   * into map pixel coordinates.
   */
  const convertPercentPointsToPixels = useCallback(
    (points: number[], mapWidth: number, mapHeight: number): number[] => {
      if (!points || points.length < 2) return [];
      return points.map((val, idx) => (idx % 2 === 0 ? (val / 100) * mapWidth : (val / 100) * mapHeight));
    },
    []
  );

  /**
   * Computes the geometric centroid of a polygon from its pixel coordinates.
   */
  const calculateCentroid = useCallback((pixelPoints: number[]): { x: number; y: number } => {
    if (!pixelPoints || pixelPoints.length < 4) return { x: 0, y: 0 };
    let sumX = 0;
    let sumY = 0;
    const vertexCount = pixelPoints.length / 2;
    for (let i = 0; i < pixelPoints.length; i += 2) {
      sumX += pixelPoints[i];
      sumY += pixelPoints[i + 1];
    }
    return {
      x: sumX / vertexCount,
      y: sumY / vertexCount
    };
  }, []);

  return {
    hoveredRoomId,
    handleMouseEnter,
    handleMouseLeave,
    handleClick,
    convertPercentPointsToPixels,
    calculateCentroid
  };
}
