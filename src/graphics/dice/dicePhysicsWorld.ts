import * as CANNON from 'cannon-es';

export interface ViewportBounds {
  width: number;
  height: number;
}

export class DicePhysicsWorld {
  public world: CANNON.World;
  public floorBody: CANNON.Body;
  private wallBodies: CANNON.Body[] = [];
  private diceMaterial: CANNON.Material;
  private tableMaterial: CANNON.Material;

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -42, 0)
    });
    this.world.allowSleep = true;

    this.diceMaterial = new CANNON.Material('dice');
    this.tableMaterial = new CANNON.Material('table');

    // Contact material between dice and table
    const contact = new CANNON.ContactMaterial(this.diceMaterial, this.tableMaterial, {
      friction: 0.45,
      restitution: 0.32,
      contactEquationStiffness: 1e7,
      contactEquationRelaxation: 3
    });
    this.world.addContactMaterial(contact);

    // Self-contact between dice
    const diceDiceContact = new CANNON.ContactMaterial(this.diceMaterial, this.diceMaterial, {
      friction: 0.35,
      restitution: 0.4
    });
    this.world.addContactMaterial(diceDiceContact);

    // Tabletop floor at Y = 0
    this.floorBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: this.tableMaterial
    });
    this.floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(this.floorBody);

    this.updateBounds({ width: 28, height: 18 });
  }

  public getDiceMaterial(): CANNON.Material {
    return this.diceMaterial;
  }

  public updateBounds(bounds: ViewportBounds) {
    // Remove existing wall bodies
    for (const wall of this.wallBodies) {
      this.world.removeBody(wall);
    }
    this.wallBodies = [];

    const halfW = bounds.width / 2;
    const halfH = bounds.height / 2;
    const thickness = 2;
    const wallHeight = 25;

    // Left Wall
    const leftWall = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(thickness, wallHeight, halfH)),
      position: new CANNON.Vec3(-halfW - thickness, wallHeight / 2, 0),
      material: this.tableMaterial
    });
    this.world.addBody(leftWall);
    this.wallBodies.push(leftWall);

    // Right Wall
    const rightWall = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(thickness, wallHeight, halfH)),
      position: new CANNON.Vec3(halfW + thickness, wallHeight / 2, 0),
      material: this.tableMaterial
    });
    this.world.addBody(rightWall);
    this.wallBodies.push(rightWall);

    // Top Wall (North / -Z)
    const topWall = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(halfW, wallHeight, thickness)),
      position: new CANNON.Vec3(0, wallHeight / 2, -halfH - thickness),
      material: this.tableMaterial
    });
    this.world.addBody(topWall);
    this.wallBodies.push(topWall);

    // Bottom Wall (South / +Z)
    const bottomWall = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(halfW, wallHeight, thickness)),
      position: new CANNON.Vec3(0, wallHeight / 2, halfH + thickness),
      material: this.tableMaterial
    });
    this.world.addBody(bottomWall);
    this.wallBodies.push(bottomWall);
  }

  public step(dt: number) {
    this.world.step(1 / 60, dt, 3);
  }
}
