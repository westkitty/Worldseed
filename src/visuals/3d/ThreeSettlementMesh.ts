// Genuine 3D Civilization Architecture Mesh Generator in Three.js (CC0-1.0)

import * as THREE from 'three';
import { Settlement } from '../../types/simulation';

export class ThreeSettlementMesh {
  // Generate a true 3D THREE.Group architectural model for a settlement
  public static createSettlementMesh(settlement: Settlement): THREE.Group {
    const group = new THREE.Group();
    const tier = settlement.tier;

    if (tier === 'CAMP') {
      // 3D Nomadic Leather Tents (Cones) & Campfire
      const tentGeo = new THREE.ConeGeometry(0.8, 1.2, 5);
      const tentMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
      for (const [x, z] of [[-0.6, 0.4], [0.6, 0.4], [0, -0.6]]) {
        const tent = new THREE.Mesh(tentGeo, tentMat);
        tent.position.set(x, 0.6, z);
        group.add(tent);
      }
    } else if (tier === 'HAMLET' || tier === 'VILLAGE') {
      // 3D Timber & Thatched Roof Cottages (Boxes + Prisms)
      const count = tier === 'HAMLET' ? 4 : 8;
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.7 });

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const dist = 1.0 + (i % 2) * 0.5;
        const hx = Math.cos(angle) * dist;
        const hz = Math.sin(angle) * dist;

        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), wallMat);
        wall.position.set(hx, 0.3, hz);
        group.add(wall);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.4, 4), roofMat);
        roof.position.set(hx, 0.8, hz);
        roof.rotation.y = Math.PI / 4;
        group.add(roof);
      }
    } else if (tier === 'TOWN' || tier === 'CITY') {
      // 3D Masonry Fortress, Citadel Keep & Watchtower Spire
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });

      // Central Keep
      const keep = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 2.0), stoneMat);
      keep.position.set(0, 0.7, 0);
      group.add(keep);

      // Watchtower Spire
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 2.4, 8), stoneMat);
      tower.position.set(-1.0, 1.2, -1.0);
      group.add(tower);

      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 8), roofMat);
      spire.position.set(-1.0, 2.8, -1.0);
      group.add(spire);

      if (settlement.infrastructure.hasTemple) {
        // Golden Temple Dome
        const domeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.3 });
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
        dome.position.set(0.8, 1.4, 0.8);
        group.add(dome);
      }
    } else if (tier === 'METROPOLIS') {
      // 3D Imperial Arcology, Golden Palace Dome, and Flanking Towers
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.5 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.7 });

      // Arcology Core
      const core = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 3.0), metalMat);
      core.position.set(0, 1.0, 0);
      group.add(core);

      // Monumental Palace Dome
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2), goldMat);
      dome.position.set(0, 2.0, 0);
      group.add(dome);

      // 4 Flanking Spire Towers
      const towerGeo = new THREE.CylinderGeometry(0.35, 0.45, 3.2, 8);
      for (const [tx, tz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) {
        const tMesh = new THREE.Mesh(towerGeo, metalMat);
        tMesh.position.set(tx, 1.6, tz);
        group.add(tMesh);
      }
    }

    return group;
  }
}
