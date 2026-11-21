// Offline build: node scripts/build-concept-mannequin.mjs /private/tmp/ikikae-makehuman
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const revision = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
const sourceRoot = `https://raw.githubusercontent.com/makehumancommunity/makehuman/${revision}/`;
const cache = process.argv[2] || '/private/tmp/ikikae-makehuman';
const project = fileURLToPath(new URL('../', import.meta.url));
const sourceFiles = {
  'base.obj': 'makehuman/data/3dobjs/base.obj',
  'caucasian-male-young.target': 'makehuman/data/targets/macrodetails/caucasian-male-young.target',
  'universal-male-young-maxmuscle-averageweight.target': 'makehuman/data/targets/macrodetails/universal-male-young-maxmuscle-averageweight.target',
  'default.mhskel': 'makehuman/data/rigs/default.mhskel',
  'default_weights.mhw': 'makehuman/data/rigs/default_weights.mhw',
  'LICENSE.ASSETS.md': 'LICENSE.ASSETS.md',
};
await fs.mkdir(cache, { recursive: true });
async function readSource(name) {
  const destination = path.join(cache, name);
  try { return await fs.readFile(destination, 'utf8'); } catch {
    const response = await fetch(sourceRoot + sourceFiles[name]);
    if (!response.ok) throw new Error(`Asset download failed: ${name} ${response.status}`);
    const data = await response.text(); await fs.writeFile(destination, data); return data;
  }
}
const source = Object.fromEntries(await Promise.all(Object.keys(sourceFiles).map(async name => [name, await readSource(name)])));
const vertices = [], faces = [];
let group = '';
for (const line of source['base.obj'].split('\n')) {
  if (line.startsWith('v ')) vertices.push(new THREE.Vector3(...line.split(/\s+/).slice(1).map(Number)));
  else if (line.startsWith('g ')) group = line.slice(2).trim();
  else if (line.startsWith('f ')) faces.push({ group, points: line.split(/\s+/).slice(1).map(token => Number(token.split('/')[0]) - 1) });
}
for (const name of ['caucasian-male-young.target', 'universal-male-young-maxmuscle-averageweight.target']) {
  for (const line of source[name].split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [index, x, y, z] = line.trim().split(/\s+/).map(Number);
    vertices[index].add(new THREE.Vector3(x, y, z));
  }
}
const skeleton = JSON.parse(source['default.mhskel']);
const weights = JSON.parse(source['default_weights.mhw']).weights;
const joint = name => skeleton.joints[name].reduce((sum, index) => sum.add(vertices[index]), new THREE.Vector3()).divideScalar(skeleton.joints[name].length);
const transforms = {}, armAxes = {};
function pivotRotation(center, quaternion) {
  return new THREE.Matrix4().makeTranslation(...center.toArray()).multiply(new THREE.Matrix4().makeRotationFromQuaternion(quaternion)).multiply(new THREE.Matrix4().makeTranslation(...center.clone().negate().toArray()));
}
function ancestor(name, target) {
  while (name) { if (name === target) return true; name = skeleton.bones[name]?.parent; }
  return false;
}
for (const [side, sign] of [['L', 1], ['R', -1]]) {
  const shoulder = joint(skeleton.bones[`upperarm01.${side}`].head);
  const elbow = joint(skeleton.bones[`lowerarm01.${side}`].head);
  const wrist = joint(skeleton.bones[`wrist.${side}`].head);
  for (const suffix of ['01', '02']) {
    armAxes[`upperarm${suffix}.${side}`] = { from: shoulder, to: elbow, growth: .18 };
    armAxes[`lowerarm${suffix}.${side}`] = { from: elbow, to: wrist, growth: .20, taper: true };
  }
  const upper = pivotRotation(shoulder, new THREE.Quaternion().setFromUnitVectors(elbow.clone().sub(shoulder).normalize(), new THREE.Vector3(.45 * sign, -.892, .025).normalize()));
  const newElbow = elbow.clone().applyMatrix4(upper);
  const lower = pivotRotation(newElbow, new THREE.Quaternion().setFromUnitVectors(wrist.clone().applyMatrix4(upper).sub(newElbow).normalize(), new THREE.Vector3(.09 * sign, -.993, .06).normalize())).multiply(upper);
  for (const name of Object.keys(skeleton.bones)) {
    if (ancestor(name, `lowerarm01.${side}`)) transforms[name] = lower;
    else if (ancestor(name, `upperarm01.${side}`)) transforms[name] = upper;
  }
}
const posed = vertices.map(() => new THREE.Vector3()), weightSums = new Float64Array(vertices.length);
const shaped = vertices.map(vertex => vertex.clone());
for (const [bone, axis] of Object.entries(armAxes)) {
  const direction = axis.to.clone().sub(axis.from), lengthSquared = direction.lengthSq();
  for (const [index, weight] of weights[bone]) {
    const relative = vertices[index].clone().sub(axis.from);
    const t = THREE.MathUtils.clamp(relative.dot(direction) / lengthSquared, 0, 1);
    const radial = vertices[index].clone().sub(axis.from.clone().addScaledVector(direction, t));
    const amount = axis.growth * weight * (axis.taper ? 1 - THREE.MathUtils.smoothstep(t, .48, .94) : 1);
    shaped[index].addScaledVector(radial, amount);
  }
}
for (const [bone, entries] of Object.entries(weights)) for (const [index, weight] of entries) {
  const point = shaped[index].clone();
  if (transforms[bone]) point.applyMatrix4(transforms[bone]);
  posed[index].addScaledVector(point, weight); weightSums[index] += weight;
}
for (let i = 0; i < vertices.length; i++) {
  if (weightSums[i]) posed[i].divideScalar(weightSums[i]); else posed[i].copy(vertices[i]);
  posed[i].set(posed[i].x * .49, posed[i].y * .47 - 1.671, (posed[i].z - .25) * .4841);
}
let positions = [], indices = [];
const remap = new Map(), cut = new Set();
const waistY = .35;
function addPoint(key, point, atCut = false) {
  if (remap.has(key)) return remap.get(key);
  const index = positions.length / 3;
  positions.push(...point.toArray()); remap.set(key, index); if (atCut) cut.add(index); return index;
}
for (const face of faces) {
  if (!['body', 'helper-l-eye', 'helper-r-eye'].includes(face.group)) continue;
  const polygon = [];
  for (let i = 0; i < face.points.length; i++) {
    const a = face.points[i], b = face.points[(i + 1) % face.points.length];
    const aInside = vertices[a].y >= waistY, bInside = vertices[b].y >= waistY;
    if (aInside) polygon.push(addPoint(`v${a}`, posed[a]));
    if (aInside !== bInside) {
      const t = (waistY - vertices[a].y) / (vertices[b].y - vertices[a].y);
      polygon.push(addPoint(`e${Math.min(a, b)}:${Math.max(a, b)}`, posed[a].clone().lerp(posed[b], t), true));
    }
  }
  for (let i = 1; i + 1 < polygon.length; i++) indices.push(polygon[0], polygon[i], polygon[i + 1]);
}
// Seal the torso cut; the pose keeps both complete hands.
const cutIndices = [...cut];
const center = cutIndices.reduce((sum, index) => sum.add(new THREE.Vector3().fromArray(positions, index * 3)), new THREE.Vector3()).divideScalar(cutIndices.length);
cutIndices.sort((a, b) => Math.atan2(positions[a * 3 + 2] - center.z, positions[a * 3] - center.x) - Math.atan2(positions[b * 3 + 2] - center.z, positions[b * 3] - center.x));
const centerIndex = addPoint('waist-center', center);
for (let i = 0; i < cutIndices.length; i++) indices.push(centerIndex, cutIndices[i], cutIndices[(i + 1) % cutIndices.length]);

// Replace the modern head with SMK's public-domain cast of Michelangelo's David.
// The body's fitted shoulder, chest and arm coordinates remain unchanged.
function clippedMesh(inputPositions, inputIndices, height, keepAbove) {
  const p = [], ix = [], lookup = new Map(), rim = new Set();
  const append = (key, v, edge = false) => {
    if (lookup.has(key)) return lookup.get(key);
    const id = p.length / 3; p.push(...v); lookup.set(key, id); if (edge) rim.add(id); return id;
  };
  for (let t = 0; t < inputIndices.length; t += 3) {
    const polygon = [];
    for (let j = 0; j < 3; j++) {
      const a = inputIndices[t + j], b = inputIndices[t + (j + 1) % 3];
      const av = inputPositions.slice(a * 3, a * 3 + 3), bv = inputPositions.slice(b * 3, b * 3 + 3);
      const insideA = keepAbove ? av[1] >= height : av[1] <= height;
      const insideB = keepAbove ? bv[1] >= height : bv[1] <= height;
      if (insideA) polygon.push(append(`v${a}`, av));
      if (insideA !== insideB) {
        const f = (height - av[1]) / (bv[1] - av[1]);
        polygon.push(append(`e${Math.min(a, b)}:${Math.max(a, b)}`, av.map((value, n) => value + (bv[n] - value) * f), true));
      }
    }
    for (let j = 1; j + 1 < polygon.length; j++) ix.push(polygon[0], polygon[j], polygon[j + 1]);
  }
  return { positions: p, indices: ix, rim: [...rim] };
}
function ringInfo(mesh) {
  const points = mesh.rim.map(index => new THREE.Vector3(...mesh.positions.slice(index * 3, index * 3 + 3)));
  const box = new THREE.Box3().setFromPoints(points), center = box.getCenter(new THREE.Vector3());
  const atRim = new Set(mesh.rim), adjacent = new Map(mesh.rim.map(index => [index, new Set()]));
  for (let i = 0; i < mesh.indices.length; i += 3) for (let j = 0; j < 3; j++) {
    const a = mesh.indices[i + j], b = mesh.indices[i + (j + 1) % 3];
    if (atRim.has(a) && atRim.has(b)) { adjacent.get(a).add(b); adjacent.get(b).add(a); }
  }
  if ([...adjacent.values()].some(neighbors => neighbors.size !== 2)) throw new Error('Neck boundary is not a simple loop');
  const ordered = [], start = mesh.rim[0];
  let previous = -1, current = start;
  do {
    ordered.push(current);
    const next = [...adjacent.get(current)].find(index => index !== previous);
    previous = current; current = next;
  } while (current !== start && ordered.length <= mesh.rim.length);
  if (ordered.length !== mesh.rim.length) throw new Error(`Neck cut contains disconnected loops: ${ordered.length}/${mesh.rim.length}`);
  let area = 0;
  for (let i = 0; i < ordered.length; i++) { const a = ordered[i] * 3, b = ordered[(i + 1) % ordered.length] * 3; area += mesh.positions[a] * mesh.positions[b + 2] - mesh.positions[b] * mesh.positions[a + 2]; }
  if (area < 0) ordered.reverse();
  let first = 0, best = Infinity;
  for (let i = 0; i < ordered.length; i++) {
    const index = ordered[i], angle = Math.abs(Math.atan2(mesh.positions[index * 3 + 2] - center.z, mesh.positions[index * 3] - center.x));
    if (angle < best) { first = i; best = angle; }
  }
  const rotated = [...ordered.slice(first), ...ordered.slice(0, first)];
  let length = 0;
  const ring = rotated.map((index, i) => {
    const parameter = length;
    const a = new THREE.Vector3(...mesh.positions.slice(index * 3, index * 3 + 3)), next = rotated[(i + 1) % rotated.length];
    length += a.distanceTo(new THREE.Vector3(...mesh.positions.slice(next * 3, next * 3 + 3)));
    return { index, parameter };
  });
  ring.forEach(point => { point.parameter /= length; });
  return { center, ring };
}
// Keep the established head placement while moving the weld down the neck.
const neckAnchor = ringInfo(clippedMesh(positions, indices, 1.60, false)).center;
const body = clippedMesh(positions, indices, 1.45, false), bodyRing = ringInfo(body);
const davidPath = path.join(cache, 'david-small.stl');
const davidUrl = 'https://api.smk.dk/api/v1/download-3d/nz806401j_KAS2232_small.stl';
let davidBytes;
try { davidBytes = await fs.readFile(davidPath); } catch {
  const response = await fetch(davidUrl); if (!response.ok) throw new Error('SMK scan download failed');
  davidBytes = Buffer.from(await response.arrayBuffer()); await fs.writeFile(davidPath, davidBytes);
}
const scanGeometry = new STLLoader().parse(davidBytes.buffer.slice(davidBytes.byteOffset, davidBytes.byteOffset + davidBytes.byteLength));
scanGeometry.deleteAttribute('normal');
const weldedScan = mergeVertices(scanGeometry, .0001);
const scanPositions = [], scanAngle = Math.PI * .75;
for (let i = 0; i < weldedScan.attributes.position.count; i++) {
  const x = weldedScan.attributes.position.getX(i), y = weldedScan.attributes.position.getY(i), z = weldedScan.attributes.position.getZ(i);
  scanPositions.push(x * Math.cos(scanAngle) + y * Math.sin(scanAngle), z, -x * Math.sin(scanAngle) + y * Math.cos(scanAngle));
}
// Z-up -> Y-up swaps two axes (determinant -1), so reverse every face.
const scanIndices = Array.from(weldedScan.index.array);
for (let i = 0; i < scanIndices.length; i += 3) [scanIndices[i + 1], scanIndices[i + 2]] = [scanIndices[i + 2], scanIndices[i + 1]];
const scanAnchor = ringInfo(clippedMesh(scanPositions, scanIndices, 70, true)).center;
const head = clippedMesh(scanPositions, scanIndices, 70, true);
for (let i = 0; i < head.positions.length; i += 3) {
  const x = (head.positions[i] - scanAnchor.x) * .0095 + neckAnchor.x;
  const z = (head.positions[i + 2] - scanAnchor.z) * .0095 + neckAnchor.z;
  const y = (head.positions[i + 1] - 70) * .0095 + 1.68;
  // All retained scan points are rigid: no deformation reaches the jaw (Z≈78).
  head.positions[i] = x;
  head.positions[i + 1] = y;
  head.positions[i + 2] = z;
}
const headRing = ringInfo(head), offset = body.positions.length / 3;
positions = [...body.positions, ...head.positions];
indices = [...body.indices, ...head.indices.map(index => index + offset)];
// Six smooth neck bands connect true boundary order; angle-sorting an uneven
// anatomical cut creates crossed faces. The scan itself remains untouched.
function sampleRing(mesh, ring, t) {
  let next = ring.findIndex(point => point.parameter >= t); if (next < 0) next = 0;
  const previous = (next + ring.length - 1) % ring.length;
  let a = ring[previous].parameter, b = ring[next].parameter, parameter = t;
  if (b <= a) b += 1; if (parameter < a) parameter += 1;
  return new THREE.Vector3(...mesh.positions.slice(ring[previous].index * 3, ring[previous].index * 3 + 3)).lerp(
    new THREE.Vector3(...mesh.positions.slice(ring[next].index * 3, ring[next].index * 3 + 3)), (parameter - a) / (b - a),
  );
}
function zipRings(lower, upper) {
  let bi = 0, hi = 0;
  while (bi < lower.length || hi < upper.length) {
    const b = lower[bi % lower.length].index, h = upper[hi % upper.length].index;
    const nextB = bi + 1 < lower.length ? lower[bi + 1].parameter : 1;
    const nextH = hi + 1 < upper.length ? upper[hi + 1].parameter : 1;
    if (bi < lower.length && (hi >= upper.length || nextB <= nextH)) { indices.push(b, h, lower[(bi + 1) % lower.length].index); bi++; }
    else { indices.push(b, h, upper[(hi + 1) % upper.length].index); hi++; }
  }
}
let lower = bodyRing.ring;
for (let band = 1; band < 6; band++) {
  const t = band / 6, blend = 1 - (1 - t) ** 5, upper = [];
  for (let i = 0; i < 96; i++) {
    const parameter = i / 96, bottom = sampleRing(body, bodyRing.ring, parameter), top = sampleRing(head, headRing.ring, parameter);
    const point = bottom.clone().lerp(top, blend); point.y = THREE.MathUtils.lerp(1.45, 1.68, t);
    upper.push({ index: positions.length / 3, parameter }); positions.push(...point.toArray());
  }
  zipRings(lower, upper); lower = upper;
}
zipRings(lower, headRing.ring.map(point => ({ ...point, index: point.index + offset })));
await MeshoptSimplifier.ready;
let simplified, error;
for (const maxError of [.001, .002, .004, .008]) {
  [simplified, error] = MeshoptSimplifier.simplify(new Uint32Array(indices), new Float32Array(positions), 3, 25500 * 3, maxError, ['LockBorder']);
  if (simplified.length <= 25500 * 3) break;
}
if (simplified.length > 26000 * 3) throw new Error(`Geometry budget exceeded: ${simplified.length / 3}`);
const compactPositions = [], compactIndices = [], used = new Map();
for (const old of simplified) {
  if (!used.has(old)) { used.set(old, compactPositions.length / 3); compactPositions.push(...positions.slice(old * 3, old * 3 + 3)); }
  compactIndices.push(used.get(old));
}
if (!compactPositions.every(Number.isFinite)) throw new Error('Non-finite mesh');
const quantized = new Int16Array(compactPositions.map(value => Math.round(value * 10000)));
const packedIndices = new Uint16Array(compactIndices);
const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(compactPositions, 3)); geometry.setIndex(compactIndices); geometry.computeBoundingBox();
const bounds = geometry.boundingBox;
const metadata = { source: `https://github.com/makehumancommunity/makehuman/tree/${revision}`, headSource: 'https://open.smk.dk/artwork/image/KAS2232', headDownload: davidUrl, license: 'MakeHuman CC0-1.0; SMK PDM-1.0', triangles: compactIndices.length / 3, vertices: compactPositions.length / 3, simplificationError: error, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } };
const output = path.join(project, 'src/app/concept/three/mannequinData.js');
await fs.writeFile(output, `// Generated by scripts/build-concept-mannequin.mjs. Do not edit by hand.\n// MakeHuman CC0-1.0 and SMK public-domain scan. Provenance in metadata.\nexport const mannequinAsset = ${JSON.stringify({ ...metadata, positionScale: .0001, positions: Buffer.from(quantized.buffer).toString('base64'), indices: Buffer.from(packedIndices.buffer).toString('base64') })};\n`);
await fs.writeFile(path.join(project, 'src/app/concept/three/SMK-DAVID-LICENSE.txt'), `SMK - Statens Museum for Kunst\nObject KAS2232, Davids hoved (cast after Michelangelo Buonarroti).\nhttps://api.smk.dk/api/v1/art/?object_number=KAS2232\nPublic domain: true. Rights: https://creativecommons.org/publicdomain/mark/1.0/\nSource scan: ${davidUrl}\nModified: cropped pedestal and shoulders, aligned and blended neck, simplified mesh.\nThe scan is distributed in generated geometry, without textures.\n`);
await fs.writeFile(path.join(project, 'src/app/concept/three/MAKEHUMAN-LICENSE.txt'), `MakeHuman CC0 human basemesh, macro targets and rig weights.\nSource revision: ${revision}\n${sourceRoot}\n\n${source['LICENSE.ASSETS.md']}`);
console.log(JSON.stringify(metadata, null, 2)); console.log('Generated bytes:', (await fs.stat(output)).size);
for (const y of [-1.4, -1, -.5, 0, .4, .8, 1.05, 1.25, 1.5, 2]) {
  const points = [];
  for (let i = 0; i < compactPositions.length; i += 3) if (Math.abs(compactPositions[i + 1] - y) < .06) points.push(new THREE.Vector3(...compactPositions.slice(i, i + 3)));
  if (!points.length) continue;
  const box = new THREE.Box3().setFromPoints(points);
  console.log('slice', y, JSON.stringify({ min: box.min.toArray(), max: box.max.toArray() }));
}
