import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export interface DieGeometryBundle {
  geometry: THREE.BufferGeometry;
  cannonShape: CANNON.Shape;
  getRestingQuaternion: (targetValue: number, jitterAngle?: number) => THREE.Quaternion;
  radius: number;
  inRadius: number;
}

function makeCannonConvex(geometry: THREE.BufferGeometry, precision = 1e-4): CANNON.ConvexPolyhedron {
  const pos = geometry.attributes.position;
  const uniqueVertices: CANNON.Vec3[] = [];
  const vertexMap = new Map<string, number>();
  const faces: number[][] = [];

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = Math.round(x / precision) + '_' + Math.round(y / precision) + '_' + Math.round(z / precision);
    let index = vertexMap.get(key);
    if (index === undefined) {
      index = uniqueVertices.length;
      vertexMap.set(key, index);
      uniqueVertices.push(new CANNON.Vec3(x, y, z));
    }
    const faceIndex = Math.floor(i / 3);
    const vertexInFace = i % 3;
    if (!faces[faceIndex]) faces[faceIndex] = [];
    faces[faceIndex][vertexInFace] = index;
  }

  // Ensure all face normals point outward from shape center (CCW winding around outward normal)
  const validFaces: number[][] = [];
  for (const f of faces) {
    if (f.length === 3 && f[0] !== f[1] && f[1] !== f[2] && f[0] !== f[2]) {
      const v0 = uniqueVertices[f[0]];
      const v1 = uniqueVertices[f[1]];
      const v2 = uniqueVertices[f[2]];
      const e01 = new CANNON.Vec3();
      const e02 = new CANNON.Vec3();
      v1.vsub(v0, e01);
      v2.vsub(v0, e02);
      const n = new CANNON.Vec3();
      e01.cross(e02, n);
      const center = new CANNON.Vec3(
        (v0.x + v1.x + v2.x) / 3,
        (v0.y + v1.y + v2.y) / 3,
        (v0.z + v1.z + v2.z) / 3
      );
      if (n.dot(center) < 0) {
        // Reverse winding to ensure outward CCW normal
        validFaces.push([f[0], f[2], f[1]]);
      } else {
        validFaces.push(f);
      }
    }
  }

  return new CANNON.ConvexPolyhedron({ vertices: uniqueVertices, faces: validFaces });
}

/**
 * Build resting quaternion for a face given its normal and up vectors
 */
function buildRestingQ(normal: THREE.Vector3, up: THREE.Vector3, jitterAngle = 0.15): THREE.Quaternion {
  // Step 1: Align face normal exactly to world up (0, 1, 0)
  const qAlign = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));

  // Step 2: Spin face so apex/up points towards top of screen (0, 0, -1)
  const rotatedUp = up.clone().applyQuaternion(qAlign);
  rotatedUp.y = 0;
  if (rotatedUp.lengthSq() > 0.001) {
    rotatedUp.normalize();
  } else {
    rotatedUp.set(0, 0, -1);
  }
  const qSpin = new THREE.Quaternion().setFromUnitVectors(rotatedUp, new THREE.Vector3(0, 0, -1));
  const qBase = qSpin.clone().multiply(qAlign);

  if (jitterAngle <= 0) return qBase;

  const angle = (Math.random() - 0.5) * jitterAngle;
  const qJitter = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
  return qJitter.multiply(qBase);
}

/**
 * d20 (Icosahedron, numbers 1 - 20)
 */
export function createD20Bundle(radius = 1.35): DieGeometryBundle {
  const geometry = new THREE.IcosahedronGeometry(radius, 0);
  const pos = geometry.attributes.position;
  const uvs = geometry.attributes.uv;

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

  const cannonShape = makeCannonConvex(geometry);

  const getRestingQuaternion = (targetValue: number, jitterAngle = 0.15): THREE.Quaternion => {
    const safeVal = Math.max(1, Math.min(20, Math.round(targetValue || 20)));
    const faceIndex = safeVal - 1;
    const { normal, up } = faceData[faceIndex];
    return buildRestingQ(normal, up, jitterAngle);
  };

  return {
    geometry,
    cannonShape,
    getRestingQuaternion,
    radius,
    inRadius: radius * 0.7558
  };
}

/**
 * d8 (Octahedron, numbers 1 - 8)
 */
export function createD8Bundle(radius = 1.35): DieGeometryBundle {
  const geometry = new THREE.OctahedronGeometry(radius, 0);
  const pos = geometry.attributes.position;
  const uvs = geometry.attributes.uv;

  const cols = 4;
  const rows = 2;
  for (let f = 0; f < 8; f++) {
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

  const faceData: { normal: THREE.Vector3; up: THREE.Vector3 }[] = [];
  for (let f = 0; f < 8; f++) {
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

  const cannonShape = makeCannonConvex(geometry);

  const getRestingQuaternion = (targetValue: number, jitterAngle = 0.15): THREE.Quaternion => {
    const safeVal = Math.max(1, Math.min(8, Math.round(targetValue || 8)));
    const faceIndex = safeVal - 1;
    const { normal, up } = faceData[faceIndex];
    return buildRestingQ(normal, up, jitterAngle);
  };

  return {
    geometry,
    cannonShape,
    getRestingQuaternion,
    radius,
    inRadius: radius * 0.5774
  };
}

/**
 * d4 (Tetrahedron, numbers 1 - 4)
 */
export function createD4Bundle(radius = 1.45): DieGeometryBundle {
  const geometry = new THREE.TetrahedronGeometry(radius, 0);
  const pos = geometry.attributes.position;
  const uvs = geometry.attributes.uv;

  const cols = 2;
  const rows = 2;
  for (let f = 0; f < 4; f++) {
    const col = f % cols;
    const row = Math.floor(f / cols);

    const uLeft = col / cols;
    const uRight = (col + 1) / cols;
    const uMid = (uLeft + uRight) / 2;

    const vBottom = 1 - (row + 1) / rows;
    const vTop = 1 - row / rows;

    const padU = 0.015;
    const padV = 0.02;

    uvs.setXY(f * 3, uLeft + padU, vBottom + padV);
    uvs.setXY(f * 3 + 1, uRight - padU, vBottom + padV);
    uvs.setXY(f * 3 + 2, uMid, vTop - padV);
  }
  uvs.needsUpdate = true;
  geometry.computeVertexNormals();

  const faceData: { normal: THREE.Vector3; up: THREE.Vector3 }[] = [];
  for (let f = 0; f < 4; f++) {
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

  const cannonShape = makeCannonConvex(geometry);

  const getRestingQuaternion = (targetValue: number, jitterAngle = 0.15): THREE.Quaternion => {
    const safeVal = Math.max(1, Math.min(4, Math.round(targetValue || 4)));
    const faceIndex = safeVal - 1;
    const { normal, up } = faceData[faceIndex];
    return buildRestingQ(normal, up, jitterAngle);
  };

  return {
    geometry,
    cannonShape,
    getRestingQuaternion,
    radius,
    inRadius: radius
  };
}

/**
 * d6 (Cube, numbers 1 - 6)
 */
export function createD6Bundle(size = 1.8): DieGeometryBundle {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const half = size / 2;
  const cannonShape = new CANNON.Box(new CANNON.Vec3(half, half, half));

  // d6 face order: 1 (+X), 6 (-X), 2 (+Y), 5 (-Y), 3 (+Z), 4 (-Z)
  const d6Normals: Record<number, { normal: THREE.Vector3; up: THREE.Vector3 }> = {
    1: { normal: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    6: { normal: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    2: { normal: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) },
    5: { normal: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
    3: { normal: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) },
    4: { normal: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) }
  };

  const getRestingQuaternion = (targetValue: number, jitterAngle = 0.15): THREE.Quaternion => {
    const safeVal = Math.max(1, Math.min(6, Math.round(targetValue || 6)));
    const { normal, up } = d6Normals[safeVal];
    return buildRestingQ(normal, up, jitterAngle);
  };

  return {
    geometry,
    cannonShape,
    getRestingQuaternion,
    radius: size * 0.7,
    inRadius: half
  };
}

/**
 * d10 (Pentagonal Trapezohedron, numbers 1 - 10 / 0 - 9)
 */
export function createD10Bundle(radius = 1.35, isPercentile = false): DieGeometryBundle {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const uvsArray: number[] = [];

  const h = radius * 1.1;
  const r = radius * 0.95;
  const topApex = new THREE.Vector3(0, h, 0);
  const bottomApex = new THREE.Vector3(0, -h, 0);
  const eq: THREE.Vector3[] = [];

  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI * 2) / 10;
    const y = (i % 2 === 0 ? 0.28 : -0.28) * radius;
    eq.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
  }

  const cols = 5;
  const rows = 2;
  const faceData: { normal: THREE.Vector3; up: THREE.Vector3 }[] = [];

  for (let i = 0; i < 10; i++) {
    const next = (i + 1) % 10;
    let v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3;

    if (i % 2 === 0) {
      // Upper pyramid
      v0 = eq[i];
      v1 = eq[next];
      v2 = topApex;
    } else {
      // Lower pyramid
      v0 = eq[next];
      v1 = eq[i];
      v2 = bottomApex;
    }

    vertices.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);

    const normal = new THREE.Vector3()
      .crossVectors(new THREE.Vector3().subVectors(v1, v0), new THREE.Vector3().subVectors(v2, v0))
      .normalize();
    const baseMid = new THREE.Vector3().addVectors(v0, v1).multiplyScalar(0.5);
    const up = new THREE.Vector3().subVectors(v2, baseMid).normalize();
    faceData.push({ normal, up });

    // UV mapping into 5x2 atlas
    const col = i % cols;
    const row = Math.floor(i / cols);
    const uL = col / cols;
    const uR = (col + 1) / cols;
    const uM = (uL + uR) / 2;
    const vB = 1 - (row + 1) / rows;
    const vT = 1 - row / rows;

    uvsArray.push(uL + 0.015, vB + 0.02, uR - 0.015, vB + 0.02, uM, vT - 0.02);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvsArray, 2));
  geometry.computeVertexNormals();

  const cannonShape = makeCannonConvex(geometry);

  const getRestingQuaternion = (targetValue: number, jitterAngle = 0.15): THREE.Quaternion => {
    let faceIndex = 0;
    if (isPercentile) {
      // 00, 10, 20... 90
      const val = Math.floor(Math.abs(targetValue) / 10) % 10;
      faceIndex = val;
    } else {
      // 1 to 10 (where 0 or 10 is the 10th face)
      const val = targetValue === 0 || targetValue === 10 ? 10 : Math.max(1, Math.min(10, Math.round(targetValue)));
      faceIndex = val - 1;
    }
    const { normal, up } = faceData[faceIndex];
    return buildRestingQ(normal, up, jitterAngle);
  };

  return {
    geometry,
    cannonShape,
    getRestingQuaternion,
    radius,
    inRadius: radius * 0.92
  };
}

/**
 * d12 (Dodecahedron, numbers 1 - 12)
 */
export function createD12Bundle(radius = 1.35): DieGeometryBundle {
  const geometry = new THREE.DodecahedronGeometry(radius, 0);
  const pos = geometry.attributes.position;
  const uvs = geometry.attributes.uv;

  // Group 36 triangles into 12 pentagons by shared normal
  const pentagons: { normal: THREE.Vector3; tris: number[]; up: THREE.Vector3 }[] = [];
  for (let f = 0; f < 36; f++) {
    const v0 = new THREE.Vector3().fromBufferAttribute(pos, f * 3);
    const v1 = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 1);
    const v2 = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 2);
    const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(v1, v0), new THREE.Vector3().subVectors(v2, v0)).normalize();

    const existing = pentagons.find(p => p.normal.dot(n) > 0.999);
    if (existing) {
      existing.tris.push(f);
    } else {
      pentagons.push({ normal: n, tris: [f], up: new THREE.Vector3() });
    }
  }

  // Planar UV mapping for 12 pentagons into 4x3 atlas
  const cols = 4;
  const rows = 3;
  const scale = 0.082;

  for (let p = 0; p < 12; p++) {
    const col = p % cols;
    const row = Math.floor(p / cols);
    const uM = (col + 0.5) / cols;
    const vM = 1 - (row + 0.5) / rows;

    const pent = pentagons[p];
    const upRef = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(pent.normal, upRef);
    if (right.lengthSq() < 0.001) right.set(1, 0, 0);
    else right.normalize();

    const realUp = new THREE.Vector3().crossVectors(right, pent.normal).normalize();
    pent.up = realUp;

    for (const f of pent.tris) {
      for (let i = 0; i < 3; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + i);
        const dx = v.dot(right) * scale;
        const dy = v.dot(realUp) * scale;
        uvs.setXY(f * 3 + i, uM + dx, vM + dy);
      }
    }
  }
  uvs.needsUpdate = true;
  geometry.computeVertexNormals();

  const cannonShape = makeCannonConvex(geometry);

  const getRestingQuaternion = (targetValue: number, jitterAngle = 0.15): THREE.Quaternion => {
    const safeVal = Math.max(1, Math.min(12, Math.round(targetValue || 12)));
    const pentIndex = safeVal - 1;
    const pent = pentagons[pentIndex];
    return buildRestingQ(pent.normal, pent.up, jitterAngle);
  };

  return {
    geometry,
    cannonShape,
    getRestingQuaternion,
    radius,
    inRadius: radius * 0.7946
  };
}
