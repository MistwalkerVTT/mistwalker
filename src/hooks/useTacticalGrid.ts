// src/hooks/useTacticalGrid.ts
// Encapsulates tactical grid dimensions, visibility, offsets, real-time ref sync,
// and the interactive box-tracing calibration tool.

import { useState, useRef, useEffect, useCallback } from 'react';

export interface GridCalibrateRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface CalibrationResult {
  measuredSize: number;
  newOffsetX: number;
  newOffsetY: number;
}

export function useTacticalGrid(initialSize: number = 50) {
  const [gridSize, setGridSize] = useState<number>(initialSize);
  const [gridOffsetX, setGridOffsetX] = useState<number>(0);
  const [gridOffsetY, setGridOffsetY] = useState<number>(0);
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const [gridOpacity, setGridOpacity] = useState<number>(0.3);

  // Real-time mutable ref to prevent closure staleness during drag & wheel
  const gridOffsetRef = useRef<{ x: number; y: number }>({ x: gridOffsetX, y: gridOffsetY });
  gridOffsetRef.current = { x: gridOffsetX, y: gridOffsetY };

  // Interactive Grid Box Calibration State
  const [gridCalibrateRect, setGridCalibrateRect] = useState<GridCalibrateRect | null>(null);
  const [isCalibratingGrid, setIsCalibratingGrid] = useState<boolean>(false);

  const startGridCalibration = useCallback((point: { x: number; y: number }) => {
    setIsCalibratingGrid(true);
    setGridCalibrateRect({
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
    });
  }, []);

  const updateGridCalibration = useCallback((point: { x: number; y: number }) => {
    setGridCalibrateRect(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentX: point.x,
        currentY: point.y,
      };
    });
  }, []);

  const finishGridCalibration = useCallback((): CalibrationResult | null => {
    setIsCalibratingGrid(false);
    if (!gridCalibrateRect) return null;

    const minX = Math.min(gridCalibrateRect.startX, gridCalibrateRect.currentX);
    const maxX = Math.max(gridCalibrateRect.startX, gridCalibrateRect.currentX);
    const minY = Math.min(gridCalibrateRect.startY, gridCalibrateRect.currentY);
    const maxY = Math.max(gridCalibrateRect.startY, gridCalibrateRect.currentY);
    const boxW = Math.round(maxX - minX);
    const boxH = Math.round(maxY - minY);

    setGridCalibrateRect(null);

    // Require at least a 10px box to calibrate
    if (boxW >= 10 && boxH >= 10) {
      const measuredSize = Math.max(10, Math.min(500, Math.round(((boxW + boxH) / 2) * 10) / 10));
      // Calculate offset so the grid line snaps exactly to the box's top-left corner
      const newOffsetX = Math.round(((minX % measuredSize) + measuredSize) % measuredSize);
      const newOffsetY = Math.round(((minY % measuredSize) + measuredSize) % measuredSize);

      setGridSize(measuredSize);
      setGridOffsetX(newOffsetX);
      setGridOffsetY(newOffsetY);
      setGridVisible(true);

      return { measuredSize, newOffsetX, newOffsetY };
    }

    return null;
  }, [gridCalibrateRect]);

  const cancelGridCalibration = useCallback(() => {
    setIsCalibratingGrid(false);
    setGridCalibrateRect(null);
  }, []);

  const resetGrid = useCallback(() => {
    setGridSize(50);
    setGridOffsetX(0);
    setGridOffsetY(0);
    setGridVisible(true);
    setGridOpacity(0.3);
  }, []);

  return {
    gridSize,
    setGridSize,
    gridOffsetX,
    setGridOffsetX,
    gridOffsetY,
    setGridOffsetY,
    gridOffsetRef,
    gridVisible,
    setGridVisible,
    gridOpacity,
    setGridOpacity,
    gridCalibrateRect,
    setGridCalibrateRect,
    isCalibratingGrid,
    setIsCalibratingGrid,
    startGridCalibration,
    updateGridCalibration,
    finishGridCalibration,
    cancelGridCalibration,
    resetGrid,
  };
}

export default useTacticalGrid;
