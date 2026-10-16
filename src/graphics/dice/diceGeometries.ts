import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export interface DieGeometryBundle {
  geometry: THREE.BufferGeometry;
  cannonShape: CANNON.Shape;
  getRestingQuaternion: (targetValue: number, jitterAngle?: number) => THREE.Quaternion;
  radius: number;
}

/**
 * Generates d20 Three.js geometry with custom UV mapping into the 5x4 atlas
 * plus Cannon-es ConvexPolyhedron collision shape.
 */
export function createD20Bundle(radius = 1.35): DieGeometryBundle {
  const geometry = new THREE.IcosahedronGeometry(radius, 0);
  const pos = geometry.attributes.position;
  const uvs = geometry.attributes.uv;

  // Custom UV mapping: 5 columns x 4 rows
  const cols = 5;
  const rows = 4;
  for (let f = 0; f < 20; f++) {
    const col = f % cols;
    const row = Math.floor(f / cols);

    const uLeft = col / cols;
    const uRight = (col + 1) / cols;
    const uMid = (uLeft + uRight) / 2;

    const vBottom = 1 - (row + 1) / rows;
    const vTop = 1 - row / rows;

    const padU = 0.014;
    const padV = 0.018;

    uvs.setXY(f * 3, uLeft + padU, vBottom + padV);
    uvs.setXY(f * 3 + 1, uRight - padU, vBottom + padV);
    uvs.setXY(f * 3 + 2, uMid, vTop - padV);
  }
  uvs.needsUpdate = true;
  geometry.computeVertexNormals();

  // Precompute face normals and local up vectors for all 20 faces
  const faceData: { normal: THREE.Vector3; up: THREE.Vector3 }[] = [];
  for (let f = 0; f < 20; f++) {
    const v0 = new THREE.Vector3().fromBufferAttribute(pos, f * 3);
    const v1 = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 1);
    const v2 = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 2);

    const normal = new THREE.Vector3()
      .crossVectors(new THREE.Vector3().subVectors(v1, v0), new THREE.Vector3().subVectors(v2, v0))
      .normalize();

    const baseMid = new THREE.Vector3().addVectors(v0, v1).multiplyScalar(0.5);
    const up = new THREE.Vector3().subVectors(v2, baseMid).normalize();

    faceData.push({ normal, up });
  }

  // Cannon-es ConvexPolyhedron
  const cannonVertices: CANNON.Vec3[] = [];
  const cannonFaces: number[][] = [];
  for (let i = 0; i < pos.count; i++) {
    cannonVertices.push(new CANNON.Vec3(pos.getX(i), pos.getY(i), pos.getZ(i)));
  }
  for (let f = 0; f < pos.count / 3; f++) {
    cannonFaces.push([f * 3, f * 3 + 1, f * 3 + 2]);
  }
  const cannonShape = new CANNON.ConvexPolyhedron({
    vertices: cannonVertices,
    faces: cannonFaces
  });

  const getRestingQuaternion = (targetValue: number, jitterAngle = 0.2): THREE.Quaternion => {
    const safeVal = Math.max(1, Math.min(20, Math.round(targetValue || 20)));
    const faceIndex = safeVal - 1;
    const { normal, up } = faceData[faceIndex];

    // Step 1: Align face normal to world up (0, 1, 0)
    const qAlign = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));

    // Step 2: Spin face so apex/up points towards top of screen (0, 0, -1)
    const rotatedUp = up.clone().applyQuaternion(qAlign);
    const qSpin = new THREE.Quaternion().setFromUnitVectors(rotatedUp, new THREE.Vector3(0, 0, -1));
    const qBase = qSpin.clone().multiply(qAlign);

    // Step 3: Natural jitter angle around Y-axis so it feels physical
    const angle = (Math.random() - 0.5) * jitterAngle;
    const qJitter = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    return qJitter.multiply(qBase);
  };

  return {
    geometry,
    cannonShape,
    getRestingQuaternion,
    radius
  };
}

/**
 * Generates standard d6 Box geometry and Cannon shape with resting orientations.
 */
export function createD6Bundle(size = 1.8): DieGeometryBundle {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const half = size / 2;
  const cannonShape = new CANNON.Box(new CANNON.Vec3(half, half, half));

  // d6 face normals for values 1 to 6
  // Face order in BoxGeometry: 1 (+X), 6 (-X), 2 (+Y), 5 (-Y), 3 (+Z), 4 (-Z)
  const d6Normals: Record<number, { normal: THREE.Vector3; up: THREE.Vector3 }> = {
    1: { normal: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    6: { normal: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    2: { normal: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) },
    5: { normal: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
    3: { normal: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) },
    4: { normal: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) }
  };

  const getRestingQuaternion = (targetValue: number, jitterAngle = 0.2): THREE.Quaternion => {
    const safeVal = Math.max(1, Math.min(6, Math.round(targetValue || 6)));
    const { normal, up } = d6Normals[safeVal];

    const qAlign = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));
    const rotatedUp = up.clone().applyQuaternion(qAlign);
    const qSpin = new THREE.Quaternion().setFromUnitVectors(rotatedUp, new THREE.Vector3(0, 0, -1));
    const qBase = qSpin.clone().multiply(qAlign);

    const angle = (Math.random() - 0.5) * jitterAngle;
    const qJitter = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    return qJitter.multiply(qBase);
  };

  return {
    geometry,
    cannonShape,
    getRestingQuaternion,
    radius: size * 0.7
  };
}
