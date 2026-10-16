import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createD20TextureAtlas, createD6Materials } from './diceTextures';
import { createD20Bundle, createD6Bundle, DieGeometryBundle } from './diceGeometries';
import { DicePhysicsWorld } from './dicePhysicsWorld';

export interface DieRollRequest {
  type: string; // 'd20', 'd6', etc.
  result: number; // Predetermined numerical result (e.g. 17)
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

  // Bundles and shared assets
  private d20Bundle: DieGeometryBundle;
  private d6Bundle: DieGeometryBundle;
  private d20Material: THREE.MeshStandardMaterial;

  // Lifecycle state
  private allSettledTime: number | null = null;
  private isFadingOut = false;
  private fadeOpacity = 1.0;
  private onRollFinishedCallback?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
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

    // Perspective Camera positioned above the table looking down
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 24, 12);
    this.camera.lookAt(0, 0, 1.5);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    this.scene.add(ambientLight);

    // Key directional light with soft contact shadows
    const keyLight = new THREE.DirectionalLight(0xfff5eb, 2.2);
    keyLight.position.set(10, 30, 14);
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

    // Rim back-light for edge highlights on resin bevels
    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    rimLight.position.set(-14, 18, -12);
    this.scene.add(rimLight);

    // Shadow receiver floor (completely transparent except for soft dice shadows)
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

    // Preload bundles & textures
    this.d20Bundle = createD20Bundle(1.4);
    this.d6Bundle = createD6Bundle(1.8);
    const d20Atlas = createD20TextureAtlas();
    this.d20Material = new THREE.MeshStandardMaterial({
      map: d20Atlas,
      roughness: 0.22,
      metalness: 0.12,
      transparent: true,
      opacity: 1.0
    });

    window.addEventListener('resize', this.handleResize);
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
    // Estimate visible tabletop dimensions at camera depth
    const aspect = width / height;
    const visibleHeight = 16;
    const visibleWidth = visibleHeight * aspect;
    this.physics.updateBounds({
      width: Math.max(20, visibleWidth * 0.92),
      height: Math.max(14, visibleHeight * 0.88)
    });
  }

  /**
   * Throw dice with predetermined results
   */
  public roll(diceRequests: DieRollRequest[], onFinished?: () => void) {
    this.clearDice();
    this.onRollFinishedCallback = onFinished;
    this.allSettledTime = null;
    this.isFadingOut = false;
    this.fadeOpacity = 1.0;

    const count = diceRequests.length;
    diceRequests.forEach((req, idx) => {
      this.spawnDie(req, idx, count);
    });

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.animFrameId = requestAnimationFrame(this.renderLoop);
    }
  }

  private spawnDie(req: DieRollRequest, index: number, totalDice: number) {
    const isD6 = req.type.toLowerCase().includes('d6');
    const bundle = isD6 ? this.d6Bundle : this.d20Bundle;
    const targetValue = req.result;

    // Create Mesh
    let mesh: THREE.Mesh;
    if (isD6) {
      const d6Mats = createD6Materials();
      d6Mats.forEach(m => { m.transparent = true; m.opacity = 1.0; });
      mesh = new THREE.Mesh(bundle.geometry, d6Mats);
    } else {
      const mat = this.d20Material.clone();
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
    const startX = (side * (6 + Math.random() * 4)) + ((index - totalDice / 2) * 1.5);
    const startY = 8 + Math.random() * 3;
    const startZ = -4 + Math.random() * 8;

    body.position.set(startX, startY, startZ);

    // Impulse towards table center
    const targetX = (Math.random() - 0.5) * 4;
    const targetZ = 1 + (Math.random() - 0.5) * 4;
    const dirX = targetX - startX;
    const dirZ = targetZ - startZ;

    const speed = 14 + Math.random() * 6;
    body.velocity.set(dirX * 0.9, -4 - Math.random() * 3, dirZ * 0.9);

    // Initial chaotic angular spin (20 - 35 rad/s)
    const spinX = (Math.random() - 0.5) * 50;
    const spinY = (Math.random() - 0.5) * 50;
    const spinZ = (Math.random() - 0.5) * 50;
    body.angularVelocity.set(spinX, spinY, spinZ);

    // Random initial orientation
    body.quaternion.set(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    );
    body.quaternion.normalize();

    // Precompute exact resting quaternion for the target value
    const targetQuaternion = bundle.getRestingQuaternion(targetValue, 0.25);

    this.scene.add(mesh);
    this.physics.world.addBody(body);

    this.activeDice.push({
      id: `die-${index}-${Date.now()}`,
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

    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    // Step physics
    this.physics.step(dt);

    const now = performance.now();
    let allDiceAreSettled = this.activeDice.length > 0;

    // Update each active die
    for (const die of this.activeDice) {
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
          die.body.angularDamping = 0.85;
          die.body.linearDamping = 0.75;

          const currentQ = new THREE.Quaternion(
            die.body.quaternion.x,
            die.body.quaternion.y,
            die.body.quaternion.z,
            die.body.quaternion.w
          );

          const progress = (elapsed - 1.0) / 0.8;
          currentQ.slerp(die.targetQuaternion, progress * 0.25);
          die.body.quaternion.set(currentQ.x, currentQ.y, currentQ.z, currentQ.w);

          die.mesh.position.copy(die.body.position as any);
          die.mesh.quaternion.copy(currentQ);
        }
        // Phase 3 (1.8s+): Settling on exact predetermined face
        else {
          const speed = die.body.velocity.length();
          const angSpeed = die.body.angularVelocity.length();

          if (speed < 0.25 && angSpeed < 0.35) {
            die.settled = true;
            die.settleTime = now;
            die.body.velocity.set(0, 0, 0);
            die.body.angularVelocity.set(0, 0, 0);

            // Snap final orientation exactly to target face
            die.mesh.quaternion.copy(die.targetQuaternion);
            die.mesh.position.copy(die.body.position as any);
          } else {
            allDiceAreSettled = false;
            die.mesh.position.copy(die.body.position as any);
            die.mesh.quaternion.copy(die.targetQuaternion);
          }
        }
      } else {
        // Die is settled flat on table
        die.mesh.position.copy(die.body.position as any);
        die.mesh.quaternion.copy(die.targetQuaternion);
      }
    }

    // Check if all dice have settled
    if (allDiceAreSettled && this.activeDice.length > 0) {
      if (!this.allSettledTime) {
        this.allSettledTime = now;
      }

      // Hold settled dice for 2.8 seconds so players can inspect faces
      const settledDuration = (now - this.allSettledTime) / 1000;
      if (settledDuration > 2.8) {
        this.isFadingOut = true;
      }
    }

    // Smoothly fade out dice opacity over 0.6 seconds
    if (this.isFadingOut) {
      this.fadeOpacity = Math.max(0, this.fadeOpacity - dt * 2.2);

      for (const die of this.activeDice) {
        if (Array.isArray(die.mesh.material)) {
          die.mesh.material.forEach(m => { m.opacity = this.fadeOpacity; });
        } else {
          die.mesh.material.opacity = this.fadeOpacity;
        }
      }

      if (this.fadeOpacity <= 0) {
        this.clearDice();
        this.isRunning = false;
        this.onRollFinishedCallback?.();
        this.renderer.clear();
        return;
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.animFrameId = requestAnimationFrame(this.renderLoop);
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
