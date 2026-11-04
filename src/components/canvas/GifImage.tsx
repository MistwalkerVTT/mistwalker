// src/components/canvas/GifImage.tsx
// Animated GIF and static image renderer for react-konva canvas

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Image as KonvaImage } from 'react-konva';

export interface GifImageProps {
  src: string;
  width?: number;
  height?: number;
  [key: string]: any;
}

export const GifImage: React.FC<GifImageProps> = ({ src, ...props }) => {
  const imageRef = useRef<any>(null);
  const [image, setImage] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(props.width || 64));
    c.height = Math.max(1, Math.round(props.height || 64));
    return c;
  }, []);
  const animatorRef = useRef<any>(null);
  
  useEffect(() => {
    if (!src) return;
    
    const giflerFn = (window as any).gifler;
    let objectUrl: string | null = null;
    let isMounted = true;
    
    const fallbackToStatic = () => {
      if (!isMounted) return;
      const img = new Image();
      // Remove crossOrigin to allow loading even if CORS is not supported (will be tainted but Konva can still render it)
      img.onload = () => {
        if (isMounted && img.naturalWidth > 0 && img.naturalHeight > 0) {
          setImage(img);
        }
      };
      img.onerror = () => {
        if (isMounted) console.warn(`Failed to load image: ${src}`);
      };
      img.src = src;
    };

    if (giflerFn) {
      fetch(src, { mode: 'cors' })
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.arrayBuffer();
        })
        .then(buffer => {
          if (!isMounted) return;
          const header = new Uint8Array(buffer.slice(0, 6));
          const headerStr = String.fromCharCode(...header);
          
          if (headerStr === 'GIF87a' || headerStr === 'GIF89a') {
            const blob = new Blob([buffer], { type: 'image/gif' });
            objectUrl = URL.createObjectURL(blob);
            giflerFn(objectUrl).get((animator: any) => {
              if (!isMounted) return;
              animatorRef.current = animator;

              // Ensure canvas dimensions are strictly non-zero before starting
              const targetW = Math.max(1, animator.width || props.width || 64);
              const targetH = Math.max(1, animator.height || props.height || 64);
              canvas.width = targetW;
              canvas.height = targetH;

              // Guard frame rendering against 0-dimension buffers
              animator.onDrawFrame = (ctx: CanvasRenderingContext2D, frame: any) => {
                if (
                  frame &&
                  frame.buffer &&
                  frame.buffer.width > 0 &&
                  frame.buffer.height > 0 &&
                  ctx.canvas &&
                  ctx.canvas.width > 0 &&
                  ctx.canvas.height > 0
                ) {
                  try {
                    ctx.drawImage(frame.buffer, frame.x || 0, frame.y || 0);
                  } catch (e) {
                    // Ignore 0-dimension frame draw attempt
                  }
                }
              };

              animator.animateInCanvas(canvas, false);
              animator.onDraw = () => {
                if (imageRef.current && isMounted) {
                  const layer = imageRef.current.getLayer();
                  if (layer) layer.batchDraw();
                }
              };

              if (canvas.width > 0 && canvas.height > 0) {
                setImage(canvas);
              }
            });
          } else {
            fallbackToStatic();
          }
        })
        .catch(() => {
          fallbackToStatic();
        });
    } else {
      fallbackToStatic();
    }

    return () => {
      isMounted = false;
      if (animatorRef.current) {
        try {
          animatorRef.current.stop();
        } catch (e) {
          // ignore
        }
        animatorRef.current = null;
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, canvas, props.width, props.height]);

  if (!image) return null;
  const imgW = (image as any).width || (image as any).naturalWidth;
  const imgH = (image as any).height || (image as any).naturalHeight;
  if (!imgW || !imgH || imgW <= 0 || imgH <= 0) return null;
  if (props.width !== undefined && props.width <= 0) return null;
  if (props.height !== undefined && props.height <= 0) return null;

  return <KonvaImage ref={imageRef} image={image} {...props} />;
};
export default GifImage;
