// src/effects/engine/Sequencer.ts
// Fluent declarative timeline sequencer for MistWalker 4.0 Effects Engine

import { VttEffectInstance, Jb2aAssetDefinition, EffectParadigm } from '../types/effect';
import { soundCatalog, SoundEffectType } from '../db/soundCatalog';
import { JB2A_REGISTRY, findJb2aAsset } from '../db/jb2aRegistry';

export type SpawnEffectCallback = (effect: VttEffectInstance) => void;

interface SequenceStep {
  type: 'sound' | 'effect' | 'wait';
  execute: () => Promise<void>;
}

export class Sequence {
  private name: string;
  private steps: SequenceStep[] = [];
  private onSpawn?: SpawnEffectCallback;

  constructor(name: string, onSpawn?: SpawnEffectCallback) {
    this.name = name;
    this.onSpawn = onSpawn;
  }

  public sound(soundKey: SoundEffectType | string, customUrl?: string): this {
    this.steps.push({
      type: 'sound',
      execute: async () => {
        soundCatalog.play(soundKey, customUrl);
      }
    });
    return this;
  }

  public wait(ms: number): this {
    this.steps.push({
      type: 'wait',
      execute: async () => {
        await new Promise(r => setTimeout(r, ms));
      }
    });
    return this;
  }

  public effect(config: {
    assetOrId: Jb2aAssetDefinition | string;
    x: number;
    y: number;
    targetX?: number;
    targetY?: number;
    sizeFt?: number;
    rotation?: number;
    isPersistent?: boolean;
    durationMs?: number;
    attachedTokenId?: string;
  }): this {
    this.steps.push({
      type: 'effect',
      execute: async () => {
        const asset = typeof config.assetOrId === 'string'
          ? findJb2aAsset(config.assetOrId) || JB2A_REGISTRY[0]
          : config.assetOrId;

        const instance: VttEffectInstance = {
          id: `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: asset.name,
          label: asset.label,
          assetKey: asset.id,
          videoUrl: asset.webm,
          loopVideoUrl: asset.loopWebm,
          thumbUrl: asset.thumb,
          paradigm: asset.paradigm,
          x: config.x,
          y: config.y,
          targetX: config.targetX,
          targetY: config.targetY,
          attachedTokenId: config.attachedTokenId,
          sizeFt: config.sizeFt || asset.defaultSizeFt,
          rotation: config.rotation || 0,
          opacity: 1.0,
          blendMode: asset.blendMode,
          isPersistent: config.isPersistent !== undefined ? config.isPersistent : asset.isPersistent,
          loop: config.isPersistent || asset.isPersistent,
          castTime: Date.now(),
          durationMs: config.durationMs || 5000,
          soundKey: asset.soundKey,
          color: asset.color
        };

        if (this.onSpawn) {
          this.onSpawn(instance);
        }
      }
    });
    return this;
  }

  public async play(): Promise<void> {
    for (const step of this.steps) {
      await step.execute();
    }
  }
}
