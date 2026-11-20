import React, { useEffect, useRef, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type { MapShaderFeatureType, MapShaderPreset } from '../data/mapShaderPresets';

export interface WebGLMapShaderKonvaImageProps {
  image: HTMLImageElement;
  preset: MapShaderPreset;
  width: number;
  height: number;
  x?: number;
  y?: number;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  perfectDrawEnabled?: boolean;
}

const TYPE_CODE: Record<MapShaderFeatureType, number> = {
  pulse_glow: 1,
  shimmer: 2,
  water: 3,
  fog: 4,
  glint: 5,
  cloud_sheen: 6,
};

const VS_SOURCE = `#version 300 es
  in vec2 a_pos;
  out vec2 v_uv;
  void main() {
    v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const FS_SOURCE = `#version 300 es
  precision highp float;

  const int MAX_FEATS = 16;

  uniform sampler2D u_mapTex;
  uniform vec2 u_res;
  uniform float u_time;
  uniform int u_spores;
  uniform int u_globalWater;

  uniform int u_featCount;
  uniform int u_featType[MAX_FEATS];
  uniform vec4 u_featGeom[MAX_FEATS];   // x, y, radius, aspect
  uniform vec4 u_featParams[MAX_FEATS]; // speed, intensity, opacity, 0
  uniform vec3 u_featColor[MAX_FEATS];  // rgb

  in vec2 v_uv;
  out vec4 outColor;

  // --- Hash & Value Noise ---
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.02;
      a *= 0.5;
    }
    return v;
  }

  // --- Voronoi Caustics ---
  float voronoi(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float md = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = vec2(hash21(n + g), hash21(n + g + 17.3));
        o = 0.5 + 0.45 * sin(u_time * 1.3 + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        md = min(md, d);
      }
    }
    return sqrt(md);
  }

  float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  void main() {
    vec3 baseCol = texture(u_mapTex, v_uv).rgb;

    float minDim = min(u_res.x, u_res.y);
    vec2 aspectScale = vec2(u_res.x / minDim, u_res.y / minDim);

    vec2 uvSample = v_uv;
    vec3 accumAdd = vec3(0.0);
    vec3 accumMixCol = vec3(0.0);
    float accumMixAmt = 0.0;

    // Global Chroma-Keyed Water Mask (cyan/turquoise/sky-blue water, excluding central rotunda)
    float globalWaterMask = 0.0;
    if (u_globalWater == 1) {
      float cyanScore = min(baseCol.b - baseCol.r, baseCol.g - baseCol.r * 0.72);
      globalWaterMask = smoothstep(0.055, 0.16, cyanScore);
      vec2 rotD = (v_uv - vec2(0.523, 0.482)) * aspectScale;
      float rotMask = smoothstep(0.145, 0.165, length(rotD));
      globalWaterMask *= rotMask;
    }

    if (globalWaterMask > 0.01) {
      vec2 gwUv = v_uv * aspectScale * 38.0;
      float r1 = sin(gwUv.x * 1.1 + fbm(gwUv * 0.6 + u_time * 0.35) * 4.5);
      float r2 = cos(gwUv.y * 1.1 + fbm(gwUv * 0.6 - u_time * 0.30 + 2.4) * 4.5);
      uvSample += vec2(r1, r2) * 0.0012 * globalWaterMask;
    }

    // --- Pass 1: UV Refraction / Ripple Displacement ---
    for (int i = 0; i < MAX_FEATS; i++) {
      if (i >= u_featCount) break;
      int fType = u_featType[i];
      if (fType != 2 && fType != 3) continue;

      vec4 geom = u_featGeom[i];
      vec4 prm = u_featParams[i];
      float spd = prm.x;
      float inten = prm.y;
      float opac = prm.z;

      vec2 d = (v_uv - geom.xy) * aspectScale;
      d.x /= max(0.25, geom.w);
      float dist = length(d);
      if (dist < geom.z) {
        float normDist = dist / geom.z;
        float edgeMask = smoothstep(1.0, 0.68, normDist);

        if (fType == 2) {
          // ORB / MIRROR: Smooth liquid-crystal normal refraction
          vec2 nUv = d * 26.0 + vec2(u_time * 0.45 * spd, -u_time * 0.35 * spd);
          float n1 = fbm(nUv);
          float n2 = fbm(nUv + vec2(4.2, 1.7));
          vec2 disp = (vec2(n1, n2) - 0.5) * 0.0042 * inten * opac * edgeMask;
          uvSample += disp;
        } else if (fType == 3) {
          // WATER: Gentle ripple distortion masked to water tones
          vec2 wUv = d * 42.0 - vec2(0.0, u_time * 0.8 * spd);
          float r1 = sin(wUv.x * 1.4 + fbm(wUv) * 4.0);
          float r2 = cos(wUv.y * 1.4 + fbm(wUv + 3.1) * 4.0);
          float waterMask = smoothstep(0.0, 0.14, baseCol.b - baseCol.r * 0.65);
          uvSample += vec2(r1, r2) * 0.0022 * inten * opac * edgeMask * waterMask;
        }
      }
    }

    vec3 col = texture(u_mapTex, clamp(uvSample, 0.0, 1.0)).rgb;
    // Re-check displaced pixel isn't dry stone so shorelines stay crisp
    if (u_globalWater == 1 && globalWaterMask > 0.01) {
      float dispCyan = min(col.b - col.r, col.g - col.r * 0.72);
      float safeWater = smoothstep(0.04, 0.14, dispCyan) * globalWaterMask;
      col = mix(baseCol, col, safeWater);

      // Voronoi Caustics + Subtle Sunlit Water Glints
      vec2 cUv = v_uv * aspectScale * 26.0;
      float c1 = voronoi(cUv + vec2(u_time * 0.18, u_time * 0.11));
      float c2 = voronoi(cUv * 1.25 - vec2(u_time * 0.14, -u_time * 0.16));
      float caustic = pow(clamp(1.0 - min(c1, c2), 0.0, 1.0), 3.4);
      accumAdd += vec3(0.55, 0.88, 1.0) * caustic * 0.28 * safeWater;
    }
    float lum = luminance(col);

    // --- Pass 2: Lighting, Caustics, Shimmer, Fog & Glints ---
    for (int i = 0; i < MAX_FEATS; i++) {
      if (i >= u_featCount) break;
      int fType = u_featType[i];
      vec4 geom = u_featGeom[i];
      vec4 prm = u_featParams[i];
      vec3 fCol = u_featColor[i];

      float spd = prm.x;
      float inten = prm.y;
      float opac = prm.z;

      vec2 d = (v_uv - geom.xy) * aspectScale;
      d.x /= max(0.25, geom.w);
      float dist = length(d);
      float maxR = geom.z * 1.25;
      if (dist > maxR) continue;

      if (fType == 1) {
        // PULSE_GLOW: Luminance-masked organic illumination
        float radial = smoothstep(geom.z, 0.0, dist);
        float breath = 0.5 + 0.5 * sin(u_time * 1.5 * spd + geom.x * 10.0);
        float flicker = 0.92 + 0.16 * fbm(d * 18.0 + u_time * 1.4 * spd);

        float floorMask = smoothstep(0.10, 0.36, lum);
        float power = radial * radial * (0.28 + 0.72 * breath) * flicker * inten * opac * floorMask;

        vec3 dodged = col / max(vec3(0.08), 1.0 - fCol * power * 0.65);
        accumAdd += (dodged - col) * 0.55 + fCol * power * 0.42;
      } else if (fType == 2) {
        // SHIMMER: Specular sweep + caustic glint + iridescent rim
        float normDist = dist / geom.z;

        float rimBand = exp(-pow((normDist - 0.94) * 7.5, 2.0));
        float rimPulse = 0.65 + 0.35 * sin(u_time * 1.6 * spd);
        accumAdd += fCol * rimBand * rimPulse * 0.45 * inten * opac;

        if (normDist < 0.98) {
          float interiorMask = smoothstep(0.98, 0.72, normDist);

          float sparkleNoise = fbm(d * 34.0 + vec2(u_time * 0.6 * spd, u_time * 0.4 * spd));
          float specHighlight = smoothstep(0.45, 0.85, lum) * smoothstep(0.42, 0.78, sparkleNoise);
          accumAdd += mix(fCol, vec3(1.0), 0.5) * specHighlight * 0.55 * inten * opac * interiorMask;

          float cycle = fract(u_time * 0.18 * spd);
          if (cycle < 0.42) {
            float p = cycle / 0.42;
            float sweepCoord = (d.x + d.y) / geom.z;
            float sweepCenter = (p - 0.5) * 2.6;
            float band = exp(-pow((sweepCoord - sweepCenter) * 4.5, 2.0));
            float fade = sin(p * 3.14159);
            accumAdd += mix(fCol, vec3(1.0), 0.7) * band * fade * 0.42 * inten * opac * interiorMask;
          }
        }
      } else if (fType == 3) {
        // WATER: Cellular Voronoi caustics masked to water tones
        float edge = smoothstep(geom.z, geom.z * 0.35, dist);
        float waterMask = smoothstep(0.0, 0.14, baseCol.b - baseCol.r * 0.6);
        float c1 = voronoi(d * 65.0 + vec2(u_time * 0.35 * spd, u_time * 0.2 * spd));
        float c2 = voronoi(d * 50.0 - vec2(u_time * 0.25 * spd, -u_time * 0.3 * spd));
        float caustic = pow(clamp(1.0 - min(c1, c2), 0.0, 1.0), 3.0);
        accumAdd += mix(fCol, vec3(0.9, 0.98, 1.0), 0.5) * caustic * 0.65 * inten * opac * edge * waterMask;
      } else if (fType == 4) {
        // FOG: Multi-octave FBM curling subterranean mist
        float edge = smoothstep(geom.z, geom.z * 0.15, dist);
        vec2 fogUv = d * 10.0 + vec2(u_time * 0.08 * spd, u_time * 0.14 * spd);
        float f1 = fbm(fogUv);
        float f2 = fbm(fogUv * 1.6 - vec2(u_time * 0.05 * spd, 0.0));
        float wisps = smoothstep(0.32, 0.82, f1 * 0.65 + f2 * 0.35);
        float fogAlpha = wisps * edge * 0.48 * inten * opac;
        accumMixCol += fCol * fogAlpha;
        accumMixAmt += fogAlpha;
      } else if (fType == 5) {
        // GLINT: Anamorphic 4-point star twinkle
        float cycle = fract(u_time * 0.14 * spd + geom.x * 0.31);
        if (cycle < 0.22) {
          float p = cycle / 0.22;
          float env = sin(p * 3.14159);
          float sR = geom.z * 0.85 * env;
          vec2 rd = d;
          float core = exp(-length(rd) / max(0.001, sR * 0.22));
          float rayX = exp(-abs(rd.y) / max(0.0006, sR * 0.04)) * exp(-abs(rd.x) / max(0.001, sR * 0.9));
          float rayY = exp(-abs(rd.x) / max(0.0006, sR * 0.04)) * exp(-abs(rd.y) / max(0.001, sR * 0.9));
          float star = (core * 0.9 + (rayX + rayY) * 0.75) * env * inten * opac;
          accumAdd += mix(fCol, vec3(1.0), 0.7) * star;
        }
      } else if (fType == 6) {
        // CLOUD_SHEEN: Slow open-air skylight / cloud shadow drift
        float edge = smoothstep(geom.z, geom.z * 0.65, dist);
        vec2 cUv = d * 7.5 + vec2(u_time * 0.06 * spd, u_time * 0.03 * spd);
        float cloud = fbm(cUv);
        float sheen = smoothstep(0.42, 0.82, cloud);
        accumAdd += fCol * sheen * 0.18 * inten * opac * edge;
      }
    }

    // Apply additive light & mist
    col += accumAdd;
    if (accumMixAmt > 0.001) {
      float a = clamp(accumMixAmt, 0.0, 0.65);
      col = mix(col, accumMixCol / max(0.001, accumMixAmt), a);
    }

    // --- Pass 3: Subtle Drifting Dust Motes (Procedural Bokeh) ---
    if (u_spores == 1) {
      vec2 gridUv = v_uv * aspectScale * 18.0;
      vec2 cell = floor(gridUv);
      vec2 local = fract(gridUv) - 0.5;
      float rnd = hash21(cell);
      if (rnd > 0.78) {
        vec2 drift = vec2(
          sin(u_time * 0.45 + rnd * 25.0) * 0.28,
          cos(u_time * 0.38 + rnd * 19.0) * 0.28
        );
        float dMote = length(local - drift);
        float pulse = 0.4 + 0.6 * sin(u_time * 1.1 + rnd * 40.0);
        float mote = smoothstep(0.075, 0.015, dMote) * pulse * 0.26;
        col += vec3(0.88, 0.94, 1.0) * mote;
      }
    }

    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

function hexToRgbNorm(hex: string): [number, number, number] {
  const clean = (hex || '#ffffff').replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [1, 1, 1];
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}

export const WebGLMapShaderKonvaImage: React.FC<WebGLMapShaderKonvaImageProps> = ({
  image,
  preset,
  width,
  height,
  x,
  y,
  offsetX,
  offsetY,
  rotation,
  perfectDrawEnabled = false,
}) => {
  const konvaImgRef = useRef<any>(null);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shaderReady, setShaderReady] = useState(false);
  const [fallbackToStatic, setFallbackToStatic] = useState(false);

  const presetRef = useRef(preset);
  presetRef.current = preset;

  useEffect(() => {
    if (!image || !image.naturalWidth || !image.naturalHeight) return;

    setFallbackToStatic(false);
    setShaderReady(false);

    const canvas = document.createElement('canvas');
    glCanvasRef.current = canvas;

    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      console.warn('[WebGLMapShader] WebGL2 unavailable; falling back to static battlemap.');
      setFallbackToStatic(true);
      return;
    }

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('[WebGLMapShader] WebGL2 context lost; falling back to static battlemap.');
      setFallbackToStatic(true);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    const compileShader = (type: number, src: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[WebGLMapShader] Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, VS_SOURCE);
    const fs = compileShader(gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      setFallbackToStatic(true);
      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
      };
    }

    const prog = gl.createProgram();
    if (!prog) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      setFallbackToStatic(true);
      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
      };
    }

    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[WebGLMapShader] Program link error:', gl.getProgramInfoLog(prog));
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      setFallbackToStatic(true);
      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
      };
    }

    gl.useProgram(prog);

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Upload map image as GPU texture, safely clamping to GPU MAX_TEXTURE_SIZE
    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    let texSource: TexImageSource = image;
    if (image.naturalWidth > maxTexSize || image.naturalHeight > maxTexSize) {
      const scale = Math.min(maxTexSize / image.naturalWidth, maxTexSize / image.naturalHeight);
      const tmp = document.createElement('canvas');
      tmp.width = Math.max(1, Math.floor(image.naturalWidth * scale));
      tmp.height = Math.max(1, Math.floor(image.naturalHeight * scale));
      const tmpCtx = tmp.getContext('2d');
      if (tmpCtx) {
        tmpCtx.drawImage(image, 0, 0, tmp.width, tmp.height);
        texSource = tmp;
      }
    }

    const mapTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mapTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texSource);
      gl.generateMipmap(gl.TEXTURE_2D);
    } catch (err) {
      console.warn('[WebGLMapShader] Texture upload failed (likely CORS); falling back to static battlemap.', err);
      gl.deleteTexture(mapTex);
      gl.deleteBuffer(quadBuf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      setFallbackToStatic(true);
      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
      };
    }

    // Size renderbuffer cleanly while preserving exact image aspect ratio
    const maxRenderDim = Math.min(3072, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 3072);
    const natW = image.naturalWidth;
    const natH = image.naturalHeight;
    const renderScale = Math.min(1, maxRenderDim / Math.max(natW, natH));
    canvas.width = Math.max(2, Math.round(natW * renderScale));
    canvas.height = Math.max(2, Math.round(natH * renderScale));
    gl.viewport(0, 0, canvas.width, canvas.height);

    const uLoc = {
      mapTex: gl.getUniformLocation(prog, 'u_mapTex'),
      res: gl.getUniformLocation(prog, 'u_res'),
      time: gl.getUniformLocation(prog, 'u_time'),
      spores: gl.getUniformLocation(prog, 'u_spores'),
      globalWater: gl.getUniformLocation(prog, 'u_globalWater'),
      featCount: gl.getUniformLocation(prog, 'u_featCount'),
      featType: gl.getUniformLocation(prog, 'u_featType'),
      featGeom: gl.getUniformLocation(prog, 'u_featGeom'),
      featParams: gl.getUniformLocation(prog, 'u_featParams'),
      featColor: gl.getUniformLocation(prog, 'u_featColor'),
    };

    const types = new Int32Array(16);
    const geom = new Float32Array(16 * 4);
    const params = new Float32Array(16 * 4);
    const colors = new Float32Array(16 * 3);

    const drawFrame = (simTime: number) => {
      const curPreset = presetRef.current;
      const active = curPreset.features.filter((f) => f.enabled).slice(0, 16);

      types.fill(0);
      geom.fill(0);
      params.fill(0);
      colors.fill(0);

      active.forEach((f, idx) => {
        types[idx] = TYPE_CODE[f.type] || 1;
        geom[idx * 4 + 0] = f.x / 100;
        geom[idx * 4 + 1] = f.y / 100;
        geom[idx * 4 + 2] = f.radius / 100;
        geom[idx * 4 + 3] = f.aspect || 1.0;

        params[idx * 4 + 0] = f.speed || 1.0;
        params[idx * 4 + 1] = f.intensity || 1.0;
        params[idx * 4 + 2] = f.opacity ?? 1.0;

        const rgb = hexToRgbNorm(f.color);
        colors[idx * 3 + 0] = rgb[0];
        colors[idx * 3 + 1] = rgb[1];
        colors[idx * 3 + 2] = rgb[2];
      });

      gl.useProgram(prog);
      gl.uniform1i(uLoc.mapTex, 0);
      gl.uniform2f(uLoc.res, canvas.width, canvas.height);
      gl.uniform1f(uLoc.time, simTime);
      gl.uniform1i(uLoc.spores, curPreset.spores ? 1 : 0);
      gl.uniform1i(uLoc.globalWater, curPreset.globalWater ? 1 : 0);
      gl.uniform1i(uLoc.featCount, active.length);
      gl.uniform1iv(uLoc.featType, types);
      gl.uniform4fv(uLoc.featGeom, geom);
      gl.uniform4fv(uLoc.featParams, params);
      gl.uniform3fv(uLoc.featColor, colors);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    // Synchronously draw frame 0 before exposing canvas to Konva (zero black flash)
    drawFrame(0);
    setShaderReady(true);

    let isMounted = true;
    let rafId = 0;
    let simTime = 0;
    let lastTick = performance.now();

    const loop = (now: number) => {
      if (!isMounted) return;
      if (typeof document !== 'undefined' && document.hidden) {
        lastTick = now;
        rafId = requestAnimationFrame(loop);
        return;
      }

      const elapsedMs = now - lastTick;
      // Cap at ~30 FPS to match AnimatedFeaturesKonvaImage and keep CPU/GPU cool
      if (elapsedMs >= 33) {
        simTime += Math.min(0.1, elapsedMs / 1000);
        lastTick = now;
        drawFrame(simTime);
        konvaImgRef.current?.getLayer()?.batchDraw();
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      cancelAnimationFrame(rafId);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      gl.deleteTexture(mapTex);
      gl.deleteBuffer(quadBuf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [image, preset.id]);

  const activeSource: CanvasImageSource =
    !fallbackToStatic && shaderReady && glCanvasRef.current
      ? glCanvasRef.current
      : image;

  return (
    <KonvaImage
      ref={konvaImgRef}
      image={activeSource}
      width={width}
      height={height}
      x={x}
      y={y}
      offsetX={offsetX}
      offsetY={offsetY}
      rotation={rotation}
      perfectDrawEnabled={perfectDrawEnabled}
    />
  );
};
