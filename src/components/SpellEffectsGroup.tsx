import React, { useState, useEffect } from 'react';
import { Group, Rect, Circle, Wedge, Image as KonvaImage } from 'react-konva';
import { ProceduralSpellEffect } from './ProceduralSpellEffect';

export interface SpellEffectsGroupProps {
  effects: any[];
  activeEffectId: string | null;
  setActiveEffectId: (id: string | null) => void;
  setEffects: React.Dispatch<React.SetStateAction<any[]>>;
  hoveredEffectId: string | null;
  setHoveredEffectId: (id: string | null) => void;
  setEffectContextMenu: (data: any) => void;
  gridSize: number;
  stageScale: number;
  coneOfColdImg?: any;
  GifImage: any;
  EffectResizeHandle: any;
}

export const SpellEffectsGroup: React.FC<SpellEffectsGroupProps> = React.memo(({
  effects,
  activeEffectId,
  setActiveEffectId,
  setEffects,
  hoveredEffectId,
  setHoveredEffectId,
  setEffectContextMenu,
  gridSize,
  stageScale,
  coneOfColdImg,
  GifImage,
  EffectResizeHandle
}) => {
  const [pulse, setPulse] = useState(1);
  const [effectRotation, setEffectRotation] = useState(0);

  useEffect(() => {
    if (!effects || effects.length === 0) return;

    let animId: number;
    let lastUpdate = 0;
    const update = (currentTime: number) => {
      // Throttle spell pulse/rotation updates to ~25fps (every 40ms)
      // This saves 75%+ CPU while keeping spells visually fluid
      if (currentTime - lastUpdate >= 40) {
        lastUpdate = currentTime;
        const time = currentTime / 1000;
        setPulse(1 + Math.sin(time * 3) * 0.05);
        setEffectRotation((currentTime / 50) % 360);
      }
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [effects?.length > 0]);

  if (!effects || effects.length === 0) return null;

  return (
    <Group>
      {effects.map((effect) => {
        const strokeColor = effect.color ? effect.color.replace('0.4', '0.8') : 'rgba(59, 130, 246, 0.8)';
        const age = effect.createdAt ? (Date.now() - effect.createdAt) : 0;
        const opacity = ((effect.createdAt && !effect.isPersistent && age > 4000) ? Math.max(0, 1 - (age - 4000) / 1000) : 1) * (effect.opacity !== undefined ? effect.opacity : 1.0);
        
        if (effect.type === 'circle') {
          const label = effect.label?.toLowerCase() || '';
          const isFireball = label.includes('fireball');
          const isEldritchSmite = label.includes('eldritch smite');
          const isShockingGrasp = label.includes('shocking grasp');
          const isFuryOfBlows = label.includes('fury of blows');
          const isFireBolt = label.includes('fire bolt');
          const isEldritchBlast = label.includes('eldritch blast');
          const isImageEffect = label.includes('spirit guardians');
          const isPoisonCloud = label.includes('poison cloud');
          const isFogCloud = label.includes('fog') && label.includes('cloud') || label.includes('fogcloud');
          const isDarkness = label.includes('darkness');
          const isBeaconOfHope = label.includes('beacon') && label.includes('hope');
          const isAura = label.includes('aura');
          const isCharm = label.includes('charm');
          const isHypnoticPattern = label.includes('hypnotic pattern');
          
          return (
            <Group 
              key={effect.id} 
              x={effect.x}
              y={effect.y}
              opacity={opacity}
              name="effect"
              draggable={true}
              onMouseDown={(e) => e.cancelBubble = true}
              onDragStart={() => setActiveEffectId(effect.id)}
              onDragEnd={() => setActiveEffectId(null)}
              onDragMove={(e) => {
                const newX = e.target.x();
                const newY = e.target.y();
                setEffects(prev => prev.map(eff => 
                  eff.id === effect.id ? { ...eff, x: newX, y: newY } : eff
                ));
              }}
              onDblClick={() => {
                setEffects(effects.filter(eff => eff.id !== effect.id));
              }}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                setEffectContextMenu({
                  data: { type: 'spell', effect },
                  position: { x: e.evt.clientX, y: e.evt.clientY }
                });
              }}
              onMouseEnter={(e) => {
                setHoveredEffectId(effect.id);
                const container = e.target.getStage().container();
                container.style.cursor = 'move';
              }}
              onMouseLeave={(e) => {
                setHoveredEffectId(null);
                const container = e.target.getStage().container();
                container.style.cursor = 'default';
              }}
            >
              {activeEffectId === effect.id && (
                <Rect
                  x={-effect.size}
                  y={-effect.size}
                  width={effect.size * 2}
                  height={effect.size * 2}
                  stroke="#10b981"
                  strokeWidth={2 / stageScale}
                  dash={[5, 5]}
                />
              )}
              {effect.imageUrl ? (
                <Group>
                  <Circle
                    name="effect"
                    radius={effect.size}
                    fill={effect.color}
                    opacity={0.15}
                  />
                  <GifImage
                    name="effect"
                    src={effect.imageUrl}
                    x={0}
                    y={0}
                    width={effect.size * 2}
                    height={effect.size * 2}
                    offsetX={effect.size}
                    offsetY={effect.size}
                    opacity={0.85}
                    rotation={effectRotation / 2}
                    globalCompositeOperation={effect.blendMode || "screen"}
                  />
                  <EffectResizeHandle 
                    effect={effect} 
                    gridSize={gridSize} 
                    stageScale={stageScale} 
                    isPlayerView={false} 
                    activeEffectId={activeEffectId} 
                    hoveredEffectId={hoveredEffectId} 
                    setActiveEffectId={setActiveEffectId} 
                    setEffects={setEffects} 
                  />
                </Group>
              ) : isShockingGrasp ? (
                <Group>
                  <GifImage
                    name="effect"
                    src="https://i.ibb.co/9kwMMsJz/Shockinggrasp.gif"
                    x={-effect.size * 1.5}
                    y={-effect.size * 1.5}
                    width={effect.size * 3}
                    height={effect.size * 3}
                    opacity={0.9}
                    globalCompositeOperation="lighter"
                  />
                  <EffectResizeHandle 
                    effect={effect} 
                    gridSize={gridSize} 
                    stageScale={stageScale} 
                    isPlayerView={false} 
                    activeEffectId={activeEffectId} 
                    hoveredEffectId={hoveredEffectId} 
                    setActiveEffectId={setActiveEffectId} 
                    setEffects={setEffects} 
                  />
                </Group>
              ) : isFuryOfBlows ? (
                <Group>
                  <GifImage
                    name="effect"
                    src="https://i.ibb.co/wNcsnSWM/fury-of-blows.gif"
                    x={-effect.size * 1.5}
                    y={-effect.size * 1.5}
                    width={effect.size * 3}
                    height={effect.size * 3}
                    opacity={0.9}
                    globalCompositeOperation="lighter"
                  />
                  <EffectResizeHandle 
                    effect={effect} 
                    gridSize={gridSize} 
                    stageScale={stageScale} 
                    isPlayerView={false} 
                    activeEffectId={activeEffectId} 
                    hoveredEffectId={hoveredEffectId} 
                    setActiveEffectId={setActiveEffectId} 
                    setEffects={setEffects} 
                  />
                </Group>
              ) : isFireBolt ? (
                <Group>
                  <GifImage
                    name="effect"
                    src="https://i.ibb.co/R44ks2yJ/firebolt-ezgif-com-optimize.gif"
                    x={-effect.size * 1.5}
                    y={-effect.size * 1.5}
                    width={effect.size * 3}
                    height={effect.size * 3}
                    opacity={0.9}
                  />
                  <EffectResizeHandle 
                    effect={effect} 
                    gridSize={gridSize} 
                    stageScale={stageScale} 
                    isPlayerView={false} 
                    activeEffectId={activeEffectId} 
                    hoveredEffectId={hoveredEffectId} 
                    setActiveEffectId={setActiveEffectId} 
                    setEffects={setEffects} 
                  />
                </Group>
              ) : isCharm ? (
                <Group>
                  <GifImage
                    name="effect"
                    src="https://i.ibb.co/xK8pTzM9/Charm.gif"
                    x={-effect.size}
                    y={-effect.size}
                    width={effect.size * 2}
                    height={effect.size * 2}
                    opacity={0.8}
                    globalCompositeOperation="lighter"
                  />
                  <EffectResizeHandle 
                    effect={effect} 
                    gridSize={gridSize} 
                    stageScale={stageScale} 
                    isPlayerView={false} 
                    activeEffectId={activeEffectId} 
                    hoveredEffectId={hoveredEffectId} 
                    setActiveEffectId={setActiveEffectId} 
                    setEffects={setEffects} 
                  />
                </Group>
              ) : (
                <Group>
                  <ProceduralSpellEffect
                    effect={effect}
                    gridSize={gridSize}
                    stageScale={stageScale}
                  />
                  <EffectResizeHandle 
                    effect={effect} 
                    gridSize={gridSize} 
                    stageScale={stageScale} 
                    isPlayerView={false} 
                    activeEffectId={activeEffectId} 
                    hoveredEffectId={hoveredEffectId} 
                    setActiveEffectId={setActiveEffectId} 
                    setEffects={setEffects} 
                  />
                </Group>
              )}
            </Group>
          );
        }
        if (effect.type === 'cone') {
          const isFireBreath = effect.label?.toLowerCase().includes('breath');
          const isConeOfCold = effect.label?.toLowerCase().includes('cone of cold');
          
          return (
            <Group
              key={effect.id}
              x={effect.x}
              y={effect.y}
              opacity={opacity}
              name="effect"
              draggable={true}
              onMouseDown={(e) => e.cancelBubble = true}
              onDragStart={() => setActiveEffectId(effect.id)}
              onDragEnd={() => setActiveEffectId(null)}
              onDragMove={(e) => {
                const newX = e.target.x();
                const newY = e.target.y();
                setEffects(prev => prev.map(eff => 
                  eff.id === effect.id ? { ...eff, x: newX, y: newY } : eff
                ));
              }}
              onDblClick={() => {
                setEffects(effects.filter(eff => eff.id !== effect.id));
              }}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                setEffectContextMenu({
                  data: { type: 'spell', effect },
                  position: { x: e.evt.clientX, y: e.evt.clientY }
                });
              }}
              onMouseEnter={(e) => {
                setHoveredEffectId(effect.id);
                const container = e.target.getStage().container();
                container.style.cursor = 'move';
              }}
              onMouseLeave={(e) => {
                setHoveredEffectId(null);
                const container = e.target.getStage().container();
                container.style.cursor = 'default';
              }}
            >
              {activeEffectId === effect.id && (
                <Rect
                  x={0}
                  y={-effect.size}
                  width={effect.size}
                  height={effect.size * 2}
                  stroke="#10b981"
                  strokeWidth={2 / stageScale}
                  dash={[5, 5]}
                  rotation={effect.rotation}
                />
              )}
              {effect.imageUrl ? (
                <GifImage
                  name="effect"
                  src={effect.imageUrl}
                  x={0}
                  y={0}
                  width={effect.size * 2}
                  height={effect.size * 2}
                  offsetX={0}
                  offsetY={effect.size}
                  rotation={effect.rotation}
                  opacity={0.85}
                  globalCompositeOperation={effect.blendMode || "lighter"}
                  onClick={() => {
                    if (!activeEffectId) {
                      const newEffects = effects.map(eff => 
                        eff.id === effect.id ? { ...eff, rotation: (eff.rotation + 45) % 360 } : eff
                      );
                      setEffects(newEffects);
                    }
                  }}
                />
              ) : isFireBreath ? (
                <GifImage
                  name="effect"
                  src="https://i.ibb.co/93mjzJtd/flamebreath.gif"
                  x={0}
                  y={0}
                  width={effect.size * 2}
                  height={effect.size * 2}
                  offsetX={0}
                  offsetY={effect.size}
                  rotation={effect.rotation}
                  opacity={0.9}
                  globalCompositeOperation="lighter"
                  onClick={() => {
                    if (!activeEffectId) {
                      const newEffects = effects.map(eff => 
                        eff.id === effect.id ? { ...eff, rotation: (eff.rotation + 45) % 360 } : eff
                      );
                      setEffects(newEffects);
                    }
                  }}
                />
              ) : isConeOfCold && coneOfColdImg ? (
                <KonvaImage
                  name="effect"
                  image={coneOfColdImg}
                  x={0}
                  y={0}
                  width={effect.size * 2}
                  height={effect.size * 2}
                  offsetX={0}
                  offsetY={effect.size}
                  rotation={effect.rotation}
                  opacity={0.8}
                  onClick={() => {
                    if (!activeEffectId) {
                      const newEffects = effects.map(eff => 
                        eff.id === effect.id ? { ...eff, rotation: (eff.rotation + 45) % 360 } : eff
                      );
                      setEffects(newEffects);
                    }
                  }}
                />
              ) : (
                <>
                  <Wedge
                    name="effect"
                    x={0}
                    y={0}
                    radius={effect.size * (pulse + 0.05)}
                    angle={60}
                    rotation={effect.rotation}
                    fill={effect.color}
                    opacity={0.2}
                  />
                  <Wedge
                    name="effect"
                    x={0}
                    y={0}
                    radius={effect.size * pulse}
                    angle={60}
                    rotation={effect.rotation}
                    fill={effect.color}
                    stroke={strokeColor}
                    strokeWidth={2 / stageScale}
                    onClick={() => {
                      if (!activeEffectId) {
                        const newEffects = effects.map(eff => 
                          eff.id === effect.id ? { ...eff, rotation: (eff.rotation + 45) % 360 } : eff
                        );
                        setEffects(newEffects);
                      }
                    }}
                  />
                </>
              )}
              <EffectResizeHandle 
                effect={effect} 
                gridSize={gridSize} 
                stageScale={stageScale} 
                isPlayerView={false} 
                activeEffectId={activeEffectId} 
                hoveredEffectId={hoveredEffectId} 
                setActiveEffectId={setActiveEffectId} 
                setEffects={setEffects} 
              />
            </Group>
          );
        }
        if (effect.type === 'line') {
          return (
            <Group
              key={effect.id}
              x={effect.x}
              y={effect.y}
              opacity={opacity}
              name="effect"
              draggable={true}
              onMouseDown={(e) => e.cancelBubble = true}
              onDragStart={() => setActiveEffectId(effect.id)}
              onDragEnd={() => setActiveEffectId(null)}
              onDragMove={(e) => {
                const newX = e.target.x();
                const newY = e.target.y();
                setEffects(prev => prev.map(eff => 
                  eff.id === effect.id ? { ...eff, x: newX, y: newY } : eff
                ));
              }}
              onDblClick={() => {
                setEffects(effects.filter(eff => eff.id !== effect.id));
              }}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                setEffectContextMenu({
                  data: { type: 'spell', effect },
                  position: { x: e.evt.clientX, y: e.evt.clientY }
                });
              }}
              onMouseEnter={(e) => {
                setHoveredEffectId(effect.id);
                const container = e.target.getStage().container();
                container.style.cursor = 'move';
              }}
              onMouseLeave={(e) => {
                setHoveredEffectId(null);
                const container = e.target.getStage().container();
                container.style.cursor = 'default';
              }}
            >
              {activeEffectId === effect.id && (
                <Rect
                  x={0}
                  y={-gridSize / 2}
                  width={effect.size}
                  height={gridSize}
                  stroke="#10b981"
                  strokeWidth={2 / stageScale}
                  dash={[5, 5]}
                  rotation={effect.rotation}
                />
              )}
              {effect.imageUrl ? (
                <GifImage
                  name="effect"
                  src={effect.imageUrl}
                  x={0}
                  y={0}
                  width={effect.size}
                  height={gridSize * 2}
                  offsetY={gridSize}
                  rotation={effect.rotation}
                  opacity={0.85}
                  globalCompositeOperation={effect.blendMode || "lighter"}
                  onClick={() => {
                    if (!activeEffectId) {
                      const newEffects = effects.map(eff => 
                        eff.id === effect.id ? { ...eff, rotation: (eff.rotation + 45) % 360 } : eff
                      );
                      setEffects(newEffects);
                    }
                  }}
                />
              ) : effect.label !== 'Sunbeam' ? (
                <>
                  <Rect
                    name="effect"
                    x={0}
                    y={0}
                    width={effect.size * (pulse + 0.02)}
                    height={gridSize * pulse}
                    offsetY={(gridSize * pulse) / 2}
                    rotation={effect.rotation}
                    fill={effect.color}
                    opacity={0.2}
                  />
                  <Rect
                    name="effect"
                    x={0}
                    y={0}
                    width={effect.size * pulse}
                    height={gridSize}
                    offsetY={gridSize / 2}
                    rotation={effect.rotation}
                    fill={effect.color}
                    stroke={strokeColor}
                    strokeWidth={2 / stageScale}
                    onClick={() => {
                      if (!activeEffectId) {
                        const newEffects = effects.map(eff => 
                          eff.id === effect.id ? { ...eff, rotation: (eff.rotation + 45) % 360 } : eff
                        );
                        setEffects(newEffects);
                      }
                    }}
                  />
                </>
              ) : (
                <GifImage
                  name="effect"
                  src="https://cdn.jumpshare.com/preview/Cf710ydwml3Ajp7tarb8CBL8utV__DLzcz-KV8DdykUSRUBTKHWS-UoYhjtzfpNX5K5Lry7y4h3SEAa3uWn-rDr85FpDpy_BglELkjA_IZE"
                  x={0}
                  y={0}
                  width={effect.size}
                  height={gridSize * 2}
                  offsetY={gridSize}
                  rotation={effect.rotation}
                  opacity={0.8}
                  globalCompositeOperation="lighter"
                  onClick={() => {
                    if (!activeEffectId) {
                      const newEffects = effects.map(eff => 
                        eff.id === effect.id ? { ...eff, rotation: (eff.rotation + 45) % 360 } : eff
                      );
                      setEffects(newEffects);
                    }
                  }}
                />
              )}
              <EffectResizeHandle 
                effect={effect} 
                gridSize={gridSize} 
                stageScale={stageScale} 
                isPlayerView={false} 
                activeEffectId={activeEffectId} 
                hoveredEffectId={hoveredEffectId} 
                setActiveEffectId={setActiveEffectId} 
                setEffects={setEffects} 
              />
            </Group>
          );
        }

        return null;
      })}
    </Group>
  );
});
