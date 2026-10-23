import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  createD20TextureAtlas,
  createD12TextureAtlas,
  createD10TextureAtlas,
  createD8TextureAtlas,
  createD6Materials,
  createD4TextureAtlas,
  DiceThemeOptions,
  DEFAULT_THEME,
  clearDiceTextureCache
} from './diceTextures';
import {
  createD20Bundle,
  createD12Bundle,
  createD10Bundle,
  createD8Bundle,
  createD6Bundle,
  createD4Bundle,
  DieGeometryBundle
} from './diceGeometries';
import { DicePhysicsWorld } from './dicePhysicsWorld';

export interface DieRollRequest {
  type: string; // 'd20', 'd12', 'd10', 'd8', 'd6', 'd4', 'd100'
  result: number; // Predetermined numerical result
  isCritical?: boolean;
  isFumble?: boolean;
}

interface ActiveDie {
  id: string;
  mesh: THREE.Mesh;
  body: CANNON.Body;
  bundle: DieGeometryBundle;
  targetValue: number;
  targetQuaternion: THREE.Quaternion;
  spawnTime: number;
  settled: boolean;
  settleTime: number;
}

export class ThreeDiceEngine {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private physics: DicePhysicsWorld;
  private activeDice: ActiveDie[] = [];

  private isRunning = false;
  private animFrameId: number | null = null;
  private lastTime = 0;

  // Bundles for all polyhedral dice
  private bundles: {
    d20: DieGeometryBundle;
    d12: DieGeometryBundle;
    d10: DieGeometryBundle;
    d100: DieGeometryBundle;
    d8: DieGeometryBundle;
    d6: DieGeometryBundle;
    d4: DieGeometryBundle;
  };

  // Materials
  private materials: {
    d20: THREE.MeshStandardMaterial;
    d12: THREE.MeshStandardMaterial;
    d10: THREE.MeshStandardMaterial;
    d100: THREE.MeshStandardMaterial;
    d8: THREE.MeshStandardMaterial;
    d4: THREE.MeshStandardMaterial;
  };

  // Lifecycle state
  private allSettledTime: number | null = null;
  private isFadingOut = false;
  private fadeOpacity = 1.0;
  private onRollFinishedCallback?: () => void;
  private currentTheme: DiceThemeOptions;

  constructor(container: HTMLElement, initialTheme?: DiceThemeOptions) {
    this.container = container;
    this.currentTheme = initialTheme || DEFAULT_THEME;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Canvas & WebGL Renderer
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.container.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Three.js Scene
    this.scene = new THREE.Scene();

    // Top-down Perspective Camera (looking directly down on the tabletop, upright facing North)
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 26, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    // Key directional light casting soft contact shadows
    const keyLight = new THREE.DirectionalLight(0xfff5eb, 2.4);
    keyLight.position.set(10, 32, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 16;
    keyLight.shadow.camera.bottom = -16;
    keyLight.shadow.bias = -0.0015;
    this.scene.add(keyLight);

    // Rim specular light
    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.85);
    rimLight.position.set(-12, 28, -12);
    this.scene.add(rimLight);

    // Shadow receiver floor
    const floorGeo = new THREE.PlaneGeometry(60, 40);
    const floorMat = new THREE.ShadowMaterial({
      opacity: 0.36
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Physics World
    this.physics = new DicePhysicsWorld();
    this.updateViewportPhysicsBounds(width, height);

    // Preload bundles
    this.bundles = {
      d20: createD20Bundle(1.4),
      d12: createD12Bundle(1.4),
      d10: createD10Bundle(1.35, false),
      d100: createD10Bundle(1.35, true),
      d8: createD8Bundle(1.4),
      d6: createD6Bundle(1.8),
      d4: createD4Bundle(1.5)
    };

    // Preload materials for active theme
    this.buildMaterials(this.currentTheme);

    window.addEventListener('resize', this.handleResize);
  }

  public setTheme(theme: DiceThemeOptions) {
    this.currentTheme = theme;
    clearDiceTextureCache();
    this.buildMaterials(theme);

    // If dice are currently rolling or resting on table, update their materials immediately
    for (const die of this.activeDice) {
      const parts = die.id.split('-');
      const key = this.resolveDieKey(parts[1] || 'd20');
      if (key === 'd6') {
        const d6Mats = createD6Materials(this.currentTheme);
        d6Mats.forEach(m => { m.transparent = true; m.opacity = this.fadeOpacity; });
        die.mesh.material = d6Mats;
      } else if (this.materials[key]) {
        const mat = this.materials[key].clone();
        mat.opacity = this.fadeOpacity;
        die.mesh.material = mat;
      }
    }
  }

  public getTheme(): DiceThemeOptions {
    return this.currentTheme;
  }

  private buildMaterials(theme: DiceThemeOptions) {
    // Only dispose old unused materials if no active dice are using them
    if (this.materials && this.activeDice.length === 0) {
      Object.values(this.materials).forEach(mat => {
        if (mat.map) {
          mat.map.dispose();
        }
        mat.dispose();
      });
    }

    const makeStdMat = (tex: THREE.CanvasTexture) =>
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.22,
        metalness: 0.12,
        transparent: true,
        opacity: 1.0
      });

    this.materials = {
      d20: makeStdMat(createD20TextureAtlas(theme)),
      d12: makeStdMat(createD12TextureAtlas(theme)),
      d10: makeStdMat(createD10TextureAtlas(false, theme)),
      d100: makeStdMat(createD10TextureAtlas(true, theme)),
      d8: makeStdMat(createD8TextureAtlas(theme)),
      d4: makeStdMat(createD4TextureAtlas(theme))
    };
  }

  private handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.updateViewportPhysicsBounds(width, height);
  };

  private updateViewportPhysicsBounds(width: number, height: number) {
    const aspect = width / height;
    const visibleHeight = 16;
    const visibleWidth = visibleHeight * aspect;
    this.physics.updateBounds({
      width: Math.max(20, visibleWidth * 0.92),
      height: Math.max(14, visibleHeight * 0.88)
    });
  }

  public roll(diceRequests: DieRollRequest[], onFinished?: () => void) {
    this.clearDice();
    this.canvas.style.opacity = '1';
    this.onRollFinishedCallback = onFinished;
    this.allSettledTime = null;
    this.isFadingOut = false;
    this.fadeOpacity = 1.0;

    // Expand any single percentile (d100) die into a tens (d100) + ones (d10) die pair so 1..100 rolls display accurately
    const expandedRequests: DieRollRequest[] = [];
    for (const req of diceRequests) {
      const key = this.resolveDieKey(req.type);
      if (key === 'd100' && diceRequests.length === 1) {
        const val = Math.max(1, Math.min(100, req.result || 100));
        if (val === 100) {
          expandedRequests.push({ ...req, type: 'd100', result: 0 });
          expandedRequests.push({ ...req, type: 'd10', result: 10 });
        } else {
          const tens = Math.floor(val / 10) * 10;
          const ones = val % 10 === 0 ? 10 : val % 10;
          expandedRequests.push({ ...req, type: 'd100', result: tens });
          expandedRequests.push({ ...req, type: 'd10', result: ones });
        }
      } else {
        expandedRequests.push(req);
      }
    }

    const count = expandedRequests.length;
    expandedRequests.forEach((req, idx) => {
      this.spawnDie(req, idx, count);
    });

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.animFrameId = requestAnimationFrame(this.renderLoop);
    }
  }

  private resolveDieKey(type: string): 'd20' | 'd12' | 'd10' | 'd100' | 'd8' | 'd6' | 'd4' {
    const lower = (type || '').toLowerCase();
    if (lower.includes('100') || lower.includes('%')) return 'd100';
    if (lower.includes('20')) return 'd20';
    if (lower.includes('12')) return 'd12';
    if (lower.includes('10')) return 'd10';
    if (lower.includes('8')) return 'd8';
    if (lower.includes('6')) return 'd6';
    if (lower.includes('4')) return 'd4';
    return 'd20';
  }

  private spawnDie(req: DieRollRequest, index: number, totalDice: number) {
    const key = this.resolveDieKey(req.type);
    const bundle = this.bundles[key];
    const targetValue = req.result;

    // Create Mesh
    let mesh: THREE.Mesh;
    if (key === 'd6') {
      const d6Mats = createD6Materials(this.currentTheme);
      d6Mats.forEach(m => { m.transparent = true; m.opacity = 1.0; });
      mesh = new THREE.Mesh(bundle.geometry, d6Mats);
    } else {
      const mat = this.materials[key].clone();
      mesh = new THREE.Mesh(bundle.geometry, mat);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = false;

    // Physics Body
    const body = new CANNON.Body({
      mass: 1.5,
      shape: bundle.cannonShape,
      material: this.physics.getDiceMaterial(),
      linearDamping: 0.15,
      angularDamping: 0.15
    });

    // Spawn location: scattered along top or edges thrown inward towards center
    const side = index % 2 === 0 ? -1 : 1;
    const startX = (side * (6 + Math.random() * 4)) + ((index - totalDice / 2) * 1.6);
    const startY = 8 + Math.random() * 3;
    const startZ = -4 + (Math.random() - 0.5) * 8;

    body.position.set(startX, startY, startZ);

    // Impulse towards table center
    const targetX = (Math.random() - 0.5) * 4;
    const targetZ = (Math.random() - 0.5) * 4;
    const dirX = targetX - startX;
    const dirZ = targetZ - startZ;

    body.velocity.set(dirX * 0.95, -5 - Math.random() * 3, dirZ * 0.95);

    // Initial chaotic angular spin (25 - 45 rad/s)
    const spinX = (Math.random() - 0.5) * 60;
    const spinY = (Math.random() - 0.5) * 60;
    const spinZ = (Math.random() - 0.5) * 60;
    body.angularVelocity.set(spinX, spinY, spinZ);

    // Random initial orientation
    body.quaternion.set(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    );
    body.quaternion.normalize();

    // Precompute exact resting quaternion for target value (upward towards top-down camera)
    const targetQuaternion = bundle.getRestingQuaternion(targetValue, 0.12);

    this.scene.add(mesh);
    this.physics.world.addBody(body);

    this.activeDice.push({
      id: `die-${key}-${index}-${Date.now()}`,
      mesh,
      body,
      bundle,
      targetValue,
      targetQuaternion,
      spawnTime: performance.now(),
      settled: false,
      settleTime: 0
    });
  }

  private renderLoop = (time: number) => {
    if (!this.isRunning) return;

    try {
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;

      // Step physics
      this.physics.step(dt);

      const now = performance.now();
      let allDiceAreSettled = this.activeDice.length > 0;
      let earliestSpawn = Infinity;

      // Update each active die
      for (const die of this.activeDice) {
        if (die.spawnTime < earliestSpawn) earliestSpawn = die.spawnTime;
        const elapsed = (now - die.spawnTime) / 1000;

        if (!die.settled) {
          // Phase 1 (0 to 1.0s): High-speed chaotic physical tumbling
          if (elapsed < 1.0) {
            die.mesh.position.copy(die.body.position as any);
            die.mesh.quaternion.copy(die.body.quaternion as any);
            allDiceAreSettled = false;
          }
          // Phase 2 (1.0s to 1.8s): Slerp guiding towards predetermined resting face
          else if (elapsed < 1.8) {
            allDiceAreSettled = false;

            // Increase physics damping to simulate tabletop friction
            die.body.angularDamping = 0.88;
            die.body.linearDamping = 0.78;

            const currentQ = new THREE.Quaternion(
              die.body.quaternion.x,
              die.body.quaternion.y,
              die.body.quaternion.z,
              die.body.quaternion.w
            );

            const progress = (elapsed - 1.0) / 0.8;
            currentQ.slerp(die.targetQuaternion, progress * 0.28);
            die.body.quaternion.set(currentQ.x, currentQ.y, currentQ.z, currentQ.w);

            die.mesh.position.copy(die.body.position as any);
            die.mesh.quaternion.copy(currentQ);
          }
          // Phase 3 (1.8s+): Settling on exact predetermined face
          else {
            const speed = die.body.velocity.length();
            const angSpeed = die.body.angularVelocity.length();

            if ((speed < 0.25 && angSpeed < 0.35) || elapsed > 2.2) {
              die.settled = true;
              die.settleTime = now;
              // Make physics body static so gravity and collisions cannot cause jitter or bounce
              die.body.type = CANNON.Body.STATIC;
              die.body.velocity.set(0, 0, 0);
              die.body.angularVelocity.set(0, 0, 0);

              // Settle flat on the table at exact inRadius height
              die.body.position.y = die.bundle.inRadius;
              die.body.quaternion.set(
                die.targetQuaternion.x,
                die.targetQuaternion.y,
                die.targetQuaternion.z,
                die.targetQuaternion.w
              );

              // Snap final mesh orientation exactly to target face
              die.mesh.position.set(die.body.position.x, die.bundle.inRadius, die.body.position.z);
              die.mesh.quaternion.copy(die.targetQuaternion);
            } else {
              allDiceAreSettled = false;
              die.mesh.position.copy(die.body.position as any);
              die.mesh.quaternion.copy(die.targetQuaternion);
            }
          }
        } else {
          // Die is settled flat on table - maintain steady resting position & orientation
          die.mesh.position.set(die.body.position.x, die.bundle.inRadius, die.body.position.z);
          die.mesh.quaternion.copy(die.targetQuaternion);
        }
      }

      // Safety watchdog: force settle any die still tumbling after 5 seconds
      if (now - earliestSpawn > 5000) {
        for (const die of this.activeDice) {
          if (!die.settled) {
            die.settled = true;
            die.body.type = CANNON.Body.STATIC;
            die.mesh.position.set(die.body.position.x, die.bundle.inRadius, die.body.position.z);
            die.mesh.quaternion.copy(die.targetQuaternion);
          }
        }
        allDiceAreSettled = true;
      }

      // Check if all dice have settled
      if (allDiceAreSettled && this.activeDice.length > 0) {
        if (!this.allSettledTime) {
          this.allSettledTime = now;
        }

        // Hold settled dice for 2.6 seconds so players can clearly inspect faces
        const settledDuration = (now - this.allSettledTime) / 1000;
        if (settledDuration > 2.6) {
          this.isFadingOut = true;
        }
      }

      // Safety watchdog: force fadeout if overall roll exceeded 7.5 seconds
      if (now - earliestSpawn > 7500) {
        this.isFadingOut = true;
      }

      // Smoothly fade out dice opacity over ~0.6 seconds
      if (this.isFadingOut) {
        this.fadeOpacity = Math.max(0, this.fadeOpacity - dt * 2.2);

        // Sync canvas style opacity with material opacity
        this.canvas.style.opacity = String(this.fadeOpacity);

        for (const die of this.activeDice) {
          if (Array.isArray(die.mesh.material)) {
            die.mesh.material.forEach(m => { m.opacity = this.fadeOpacity; });
          } else {
            die.mesh.material.opacity = this.fadeOpacity;
          }
        }

        // Fadeout complete: clean up and clear canvas
        if (this.fadeOpacity <= 0 || (now - earliestSpawn > 9000)) {
          this.clearDice();
          this.canvas.style.opacity = '0';
          this.renderer.render(this.scene, this.camera);
          this.renderer.clear();
          this.isRunning = false;
          this.onRollFinishedCallback?.();
          return;
        }
      }

      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(this.renderLoop);
    } catch (err) {
      console.warn('[ThreeDiceEngine] renderLoop recovered from error:', err);
      // Clean up safely on error so dice never get stuck permanently
      this.clearDice();
      this.canvas.style.opacity = '0';
      this.renderer.render(this.scene, this.camera);
      this.renderer.clear();
      this.isRunning = false;
      this.onRollFinishedCallback?.();
    }
  };

  public clearDice() {
    for (const die of this.activeDice) {
      this.scene.remove(die.mesh);
      this.physics.world.removeBody(die.body);
      if (Array.isArray(die.mesh.material)) {
        die.mesh.material.forEach(m => m.dispose());
      } else {
        die.mesh.material.dispose();
      }
    }
    this.activeDice = [];
    this.allSettledTime = null;
    this.isFadingOut = false;
    this.fadeOpacity = 1.0;
  }

  public destroy() {
    window.removeEventListener('resize', this.handleResize);
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.clearDice();
    this.renderer.dispose();
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
