import * as THREE from 'three';
import { mannequinAsset } from './mannequinData.js';

function bytesFromBase64(value) {
  const decoded = atob(value);
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}

/** A real anatomical mesh, posed and reduced entirely offline. */
export function createMannequin() {
  const positions = new Int16Array(bytesFromBase64(mannequinAsset.positions).buffer);
  const indices = new Uint16Array(bytesFromBase64(mannequinAsset.indices).buffer);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(positions, value => value * mannequinAsset.positionScale), 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({ color: 0xbcb8ab, roughness: .86, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Anatomical stone mannequin';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'IKIKAE — sculptural figure';
  group.add(mesh);
  let disposed = false;
  return {
    group,
    triangleCount: mannequinAsset.triangles,
    dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      material.dispose();
      group.clear();
    },
  };
}
