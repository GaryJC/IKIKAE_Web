import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The scan already contains the body of the slider. Hang the pull from its
// existing bridge, following the zipper as it slopes out over the chest.
export function createZipperPull(model) {
  const hinge = new THREE.Vector3(.019, .3747, .1306);
  const tip = new THREE.Vector3(.023, .334, .1412);
  const up = hinge.clone().sub(tip).normalize();
  const across = up.clone().cross(new THREE.Vector3(0, 0, 1)).normalize();
  const front = across.clone().cross(up);
  const placement = new THREE.Matrix4().makeBasis(across, up, front).setPosition(hinge);

  // Draw in units of 1/1000 model units so the bevels and clearances are legible.
  const tab = new THREE.Shape();
  tab.moveTo(-3.2, 0);
  tab.quadraticCurveTo(-5.4, 0, -5.4, -2.5);
  tab.quadraticCurveTo(-5.1, -9, -4.4, -12);
  tab.bezierCurveTo(-4.2, -16, -6.9, -23, -6.9, -37.8);
  tab.quadraticCurveTo(-6.9, -42, -3.5, -42);
  tab.lineTo(3.5, -42);
  tab.quadraticCurveTo(6.9, -42, 6.9, -37.8);
  tab.bezierCurveTo(6.9, -23, 4.2, -16, 4.4, -12);
  tab.quadraticCurveTo(5.1, -9, 5.4, -2.5);
  tab.quadraticCurveTo(5.4, 0, 3.2, 0);
  tab.closePath();

  const grip = new THREE.Path();
  grip.moveTo(-2.2, -27);
  grip.quadraticCurveTo(-2.2, -25.4, 0, -25.4);
  grip.quadraticCurveTo(2.2, -25.4, 2.2, -27);
  grip.lineTo(2.6, -35.9);
  grip.quadraticCurveTo(2.6, -38, 0, -38);
  grip.quadraticCurveTo(-2.6, -38, -2.6, -35.9);
  grip.closePath();
  tab.holes.push(grip);

  const eye = new THREE.Path();
  eye.absellipse(0, -5.3, 3.1, 2.5, 0, Math.PI * 2, true);
  tab.holes.push(eye);

  const tabGeometry = new THREE.ExtrudeGeometry(tab, {
    depth: 1.3, bevelEnabled: true, bevelSize: .55, bevelThickness: .55,
    bevelSegments: 3, curveSegments: 5,
  });
  // Give the stamped face a slight crown and curve its reflected light across
  // the width, including the bevels around the cutouts.
  const positions = tabGeometry.getAttribute('position');
  const normals = tabGeometry.getAttribute('normal');
  const normal = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    positions.setZ(i, positions.getZ(i) + .7 * (1 - x * x / 49));
    normal.fromBufferAttribute(normals, i);
    normal.x += x * normal.z / 35;
    normal.normalize();
    normals.setXYZ(i, normal.x, normal.y, normal.z);
  }
  // A rounded wire staple passes through the eye into the underside of the slider.
  const staplePath = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, -4.5, -.65), new THREE.Vector3(0, -6.7, 5.1),
    new THREE.Vector3(0, 3.7, 4.4), new THREE.Vector3(0, 4.2, -1.8),
  );
  const staple = new THREE.TubeGeometry(staplePath, 12, 1.0, 8, false);
  const stapleGeometry = staple.toNonIndexed();
  const geometry = mergeGeometries([tabGeometry, stapleGeometry]);
  tabGeometry.dispose();
  staple.dispose();
  stapleGeometry.dispose();

  model.updateWorldMatrix(true, false);
  geometry.scale(.001, .001, .001);
  geometry.applyMatrix4(placement);
  geometry.applyMatrix4(model.matrixWorld);
  const material = new THREE.MeshStandardMaterial({ color: 0x626365, roughness: .32, metalness: .8 });
  const pull = new THREE.Mesh(geometry, material);
  pull.name = 'Gunmetal zipper pull';
  return pull;
}
