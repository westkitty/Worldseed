// Genuine 3D Creature Phenotype Mesh Generator in Three.js (CC0-1.0)

import * as THREE from 'three';
import { Species } from '../../types/simulation';

export class ThreeCreatureMesh {
  // Generate a true 3D THREE.Group mesh for a species based on genetic traits
  public static createCreatureMesh(species: Species): THREE.Group {
    const group = new THREE.Group();
    const g = species.genome;
    const color = new THREE.Color(species.colorHex);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.6,
      metalness: 0.1
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: g.sensoryModality === 'OPTIC' ? 0x38bdf8 : (g.sensoryModality === 'THERMAL' ? 0xf43f5e : 0xfde047),
      emissive: g.sensoryModality === 'OPTIC' ? 0x0284c7 : 0x000000,
      roughness: 0.2
    });

    // 1. Torso Segmentation (True 3D Ellipsoid/Cylinder segments)
    const segmentCount = g.bodySizeMeters > 3 ? 3 : (species.morphology === 'INVERTEBRATE_ARTHROPOD' ? 4 : 2);
    for (let i = 0; i < segmentCount; i++) {
      const zOffset = (i - segmentCount / 2) * 1.5;
      const taper = 1.0 - Math.abs(i - segmentCount / 2) * 0.2;
      const segGeo = new THREE.SphereGeometry(1.2 * taper, 16, 16);
      const segMesh = new THREE.Mesh(segGeo, bodyMat);
      segMesh.scale.set(1.0, 0.8, 1.2);
      segMesh.position.set(0, 0, zOffset);
      group.add(segMesh);
    }

    // 2. Head & Sensory Organs
    const headGeo = new THREE.SphereGeometry(0.9, 16, 16);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.position.set(0, 0.3, -(segmentCount / 2 + 0.6) * 1.5);
    group.add(headMesh);

    // Left & Right Eyes
    const eyeGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.45, 0.6, -(segmentCount / 2 + 0.9) * 1.5);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.45, 0.6, -(segmentCount / 2 + 0.9) * 1.5);
    group.add(rightEye);

    // 3. Limbs & Locomotion
    if (g.locomotion === 'QUADRUPEDAL' || g.locomotion === 'CRAWLING') {
      const pairCount = g.locomotion === 'QUADRUPEDAL' ? 2 : 3;
      const limbGeo = new THREE.CylinderGeometry(0.2, 0.15, 1.6, 12);
      for (let p = 0; p < pairCount; p++) {
        const limbZ = (p - (pairCount - 1) / 2) * 1.4;

        // Left Leg
        const leftLeg = new THREE.Mesh(limbGeo, bodyMat);
        leftLeg.position.set(-1.2, -0.9, limbZ);
        leftLeg.rotation.z = Math.PI / 12;
        group.add(leftLeg);

        // Right Leg
        const rightLeg = new THREE.Mesh(limbGeo, bodyMat);
        rightLeg.position.set(1.2, -0.9, limbZ);
        rightLeg.rotation.z = -Math.PI / 12;
        group.add(rightLeg);
      }
    } else if (g.locomotion === 'BIPEDAL') {
      const legGeo = new THREE.CylinderGeometry(0.25, 0.18, 2.2, 12);
      const leftLeg = new THREE.Mesh(legGeo, bodyMat);
      leftLeg.position.set(-0.6, -1.4, 0.2);
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, bodyMat);
      rightLeg.position.set(0.6, -1.4, 0.2);
      group.add(rightLeg);
    } else if (g.locomotion === 'WINGED_FLIGHT' || g.locomotion === 'GLIDING') {
      // 3D Wings
      const wingGeo = new THREE.BoxGeometry(2.8, 0.08, 1.2);
      const leftWing = new THREE.Mesh(wingGeo, bodyMat);
      leftWing.position.set(-1.8, 0.5, 0);
      leftWing.rotation.z = Math.PI / 10;
      group.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, bodyMat);
      rightWing.position.set(1.8, 0.5, 0);
      rightWing.rotation.z = -Math.PI / 10;
      group.add(rightWing);
    } else if (g.locomotion === 'SWIMMING') {
      // 3D Dorsal & Caudal Fins
      const finGeo = new THREE.ConeGeometry(0.6, 1.2, 4);
      const dorsalFin = new THREE.Mesh(finGeo, bodyMat);
      dorsalFin.position.set(0, 1.2, 0);
      dorsalFin.rotation.x = -Math.PI / 4;
      group.add(dorsalFin);

      const tailFin = new THREE.Mesh(finGeo, bodyMat);
      tailFin.position.set(0, 0, (segmentCount / 2 + 0.8) * 1.5);
      tailFin.rotation.x = Math.PI / 2;
      group.add(tailFin);
    }

    // 4. Bioluminescence Glow
    if (species.isSapient || g.cognition > 50) {
      const glowGeo = new THREE.SphereGeometry(0.35, 12, 12);
      const glowMat = new THREE.MeshStandardMaterial({
        color: species.isSapient ? 0x38bdf8 : 0xa855f7,
        emissive: species.isSapient ? 0x38bdf8 : 0xa855f7,
        emissiveIntensity: 0.8
      });
      const glowNode = new THREE.Mesh(glowGeo, glowMat);
      glowNode.position.set(0, 1.0, 0);
      group.add(glowNode);
    }

    return group;
  }
}
