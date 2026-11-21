// Offline GLB optimization. Preserve head vertices; simplify the garment/body.
// node scripts/optimize-concept-glb.mjs input.glb output.glb
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';

const [source, destination, mode] = process.argv.slice(2);
const keepSource = mode === '--keep-source-mesh';
if (!source || !destination) throw new Error('Supply input and output GLB paths.');
const file = await fs.readFile(source);
if (file.readUInt32LE(0) !== 0x46546c67 || file.readUInt32LE(4) !== 2) throw new Error('Expected GLB 2.0');
const jsonLength = file.readUInt32LE(12);
const document = JSON.parse(file.subarray(20, 20 + jsonLength).toString());
const bin = file.subarray(28 + jsonLength);
const oldViews = document.bufferViews;
const oldAccessors = document.accessors;
const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const constructors = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };
function readAccessor(id) {
  const a = oldAccessors[id], v = oldViews[a.bufferView], Type = constructors[a.componentType];
  if (!Type || a.sparse || !widths[a.type]) throw new Error('Unsupported source accessor');
  const width = widths[a.type], stride = v.byteStride || width * Type.BYTES_PER_ELEMENT;
  const result = new Type(a.count * width);
  for (let i = 0; i < a.count; i++) {
    const offset = (v.byteOffset || 0) + (a.byteOffset || 0) + i * stride;
    const bytes = bin.subarray(offset, offset + width * Type.BYTES_PER_ELEMENT);
    new Uint8Array(result.buffer, i * width * Type.BYTES_PER_ELEMENT, bytes.length).set(bytes);
  }
  return result;
}
const chunks = [], views = [], accessors = [];
let byteLength = 0;
function append(bytes, target) {
  const padding = (4 - byteLength % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
  const id = views.length;
  views.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length, ...(target ? { target } : {}) });
  chunks.push(bytes); byteLength += bytes.length; return id;
}
function accessor(array, original, target, bounds = false) {
  const metadata = { ...original, bufferView: append(Buffer.from(array.buffer, array.byteOffset, array.byteLength), target), byteOffset: 0, count: array.length / widths[original.type] };
  delete metadata.min; delete metadata.max;
  if (bounds) {
    metadata.min = [Infinity, Infinity, Infinity]; metadata.max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < array.length; i++) { const axis = i % 3; metadata.min[axis] = Math.min(metadata.min[axis], array[i]); metadata.max[axis] = Math.max(metadata.max[axis], array[i]); }
  }
  accessors.push(metadata); return accessors.length - 1;
}
await MeshoptSimplifier.ready;
// Generated eye normal maps can contain false doubled eyelids. Keep the real
// head geometry and give marble its own clean PBR material instead of that map.
const colorTexture = document.materials[0]?.pbrMetallicRoughness?.baseColorTexture?.index;
const colorImage = document.images[document.textures[colorTexture].source];
const colorView = oldViews[colorImage.bufferView];
const colorPixels = await sharp(bin.subarray(colorView.byteOffset || 0, (colorView.byteOffset || 0) + colorView.byteLength)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const marbleMaterial = document.materials.length;
document.materials.push({ name: 'Clean ivory marble — geometric eyelids', doubleSided: false, pbrMetallicRoughness: { baseColorFactor: [.68, .65, .59, 1], roughnessFactor: .84, metallicFactor: 0 } });
let inputTriangles = 0, outputTriangles = 0, lockedVertices = 0;
let marbleTriangles = 0;
for (const mesh of document.meshes) for (const primitive of [...mesh.primitives]) {
  const attrs = Object.fromEntries(Object.entries(primitive.attributes).map(([name, id]) => [name, readAccessor(id)]));
  const p = attrs.POSITION, count = p.length / 3, originalIndices = new Uint32Array(readAccessor(primitive.indices));
  inputTriangles += originalIndices.length / 3;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 1; i < p.length; i += 3) { minY = Math.min(minY, p[i]); maxY = Math.max(maxY, p[i]); }
  const rest = attrs._REST_POSITION || p;
  minY=Infinity;maxY=-Infinity;
  for(let i=1;i<rest.length;i+=3){minY=Math.min(minY,rest[i]);maxY=Math.max(maxY,rest[i]);}
  const lock = new Uint8Array(count), attributes = new Float32Array(count * 5);
  for (let i = 0; i < count; i++) {
    if (rest[i * 3 + 1] > minY + (maxY - minY) * .79) { lock[i] = 1; lockedVertices++; }
    attributes.set(attrs.NORMAL.subarray(i * 3, i * 3 + 3), i * 5);
    attributes.set(attrs.TEXCOORD_0.subarray(i * 2, i * 2 + 2), i * 5 + 3);
  }
  const target = Math.min(originalIndices.length, 52000 * 3);
  const reduced = keepSource ? originalIndices : MeshoptSimplifier.simplifyWithAttributes(originalIndices, p, 3, attributes, 5, [.1, .1, .1, 1, 1], lock, target, .025, ['LockBorder'])[0];
  outputTriangles += reduced.length / 3;
  const remap = new Map(), used = [];
  const indices = new Uint32Array(reduced.length);
  for (let i = 0; i < reduced.length; i++) { const old = reduced[i]; if (!remap.has(old)) { remap.set(old, used.length); used.push(old); } indices[i] = remap.get(old); }
  for (const [name, id] of Object.entries(primitive.attributes)) {
    if(name==='_REST_POSITION'){delete primitive.attributes[name];continue;}
    const original = oldAccessors[id], width = widths[original.type], Type = constructors[original.componentType];
    const compact = new Type(used.length * width);
    used.forEach((old, index) => compact.set(attrs[name].subarray(old * width, (old + 1) * width), index * width));
    primitive.attributes[name] = accessor(compact, original, 34962, name === 'POSITION');
  }
  const stoneIndices = [], clothIndices = [];
  for (let i = 0; i < reduced.length; i += 3) {
    const a = reduced[i], b = reduced[i + 1], c = reduced[i + 2];
    const y = (rest[a * 3 + 1] + rest[b * 3 + 1] + rest[c * 3 + 1]) / 3;
    const u = (attrs.TEXCOORD_0[a * 2] + attrs.TEXCOORD_0[b * 2] + attrs.TEXCOORD_0[c * 2]) / 3;
    const v = (attrs.TEXCOORD_0[a * 2 + 1] + attrs.TEXCOORD_0[b * 2 + 1] + attrs.TEXCOORD_0[c * 2 + 1]) / 3;
    const xPixel = Math.max(0, Math.min(colorPixels.info.width - 1, Math.floor(u * colorPixels.info.width)));
    const yPixel = Math.max(0, Math.min(colorPixels.info.height - 1, Math.floor(v * colorPixels.info.height)));
    const pixel = (yPixel * colorPixels.info.width + xPixel) * colorPixels.info.channels;
    const brightness = (colorPixels.data[pixel] + colorPixels.data[pixel + 1] + colorPixels.data[pixel + 2]) / 765;
    const isStone = y > minY + (maxY - minY) * .68 && brightness > .4;
    (isStone ? stoneIndices : clothIndices).push(indices[i], indices[i + 1], indices[i + 2]);
  }
  primitive.indices = accessor(new Uint32Array(clothIndices), { componentType: 5125, type: 'SCALAR' }, 34963);
  if (stoneIndices.length) {
    mesh.primitives.push({ attributes: { ...primitive.attributes }, indices: accessor(new Uint32Array(stoneIndices), { componentType: 5125, type: 'SCALAR' }, 34963), material: marbleMaterial });
    marbleTriangles += stoneIndices.length / 3;
  }
}
for (const image of document.images || []) {
  const view = oldViews[image.bufferView];
  const bytes = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  if(process.argv.includes('--native-textures')) {
    image.bufferView=append(bytes);
    continue;
  }
  const color = /diffuse|base.?color/i.test(image.name || '');
  const pipeline = sharp(bytes).resize({ width: color ? 2048 : 1024, height: color ? 2048 : 1024, fit: 'inside', withoutEnlargement: true });
  const compressed = color ? await pipeline.jpeg({ quality: 91, chromaSubsampling: '4:4:4' }).toBuffer() : await pipeline.png({ compressionLevel: 9 }).toBuffer();
  image.bufferView = append(compressed); image.mimeType = color ? 'image/jpeg' : 'image/png';
}
document.accessors = accessors; document.bufferViews = views; document.buffers = [{ byteLength }];
document.asset.generator = keepSource ? 'IKIKAE full source mesh / split stone and cloth' : 'IKIKAE offline meshopt / head-preserving GLB optimization';
const rawJson = Buffer.from(JSON.stringify(document)), json = Buffer.alloc(Math.ceil(rawJson.length / 4) * 4, 32); rawJson.copy(json);
const binary = Buffer.concat(chunks); const padded = Buffer.alloc(Math.ceil(binary.length / 4) * 4); binary.copy(padded);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + padded.length, 8); header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(padded.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
await fs.mkdir(path.dirname(destination), { recursive: true });
const output = Buffer.concat([header, json, binHeader, padded]); await fs.writeFile(destination, output);
const report = { source, destination, inputBytes: file.length, outputBytes: output.length, inputTriangles, outputTriangles, lockedVertices, marbleTriangles };
await fs.writeFile(destination + '.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
if (!keepSource && outputTriangles > 54000) throw new Error('Model exceeds scene triangle budget; inspect before publishing.');
