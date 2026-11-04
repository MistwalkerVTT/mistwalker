// src/lib/canvasTransforms.ts
// Mathematical utilities for Konva canvas orientation and transforms

export interface ImageTransform {
  x: number;
  y: number;
  rotation: number;
}

export const getImageTransform = (width: number, height: number, rotation: number): ImageTransform => {
  switch (rotation % 360) {
    case 90: return { x: height, y: 0, rotation: 90 };
    case 180: return { x: width, y: height, rotation: 180 };
    case 270: return { x: 0, y: width, rotation: 270 };
    default: return { x: 0, y: 0, rotation: 0 };
  }
};
