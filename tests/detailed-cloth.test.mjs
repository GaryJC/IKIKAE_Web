import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { Vector3 } from 'three';
import sharp from 'sharp';

function sculpture(version) {
  const bytes=fs.readFileSync(new URL('../public/concept/hoodie-sculpture-'+version+'.glb',import.meta.url));
  const jsonEnd=20+bytes.readUInt32LE(12);
  const doc=JSON.parse(bytes.subarray(20,jsonEnd));
  const bin=bytes.subarray(jsonEnd+8);
  function bufferView(id) {
    const view=doc.bufferViews[id], start=view.byteOffset||0;
    return bin.subarray(start,start+view.byteLength);
  }
  function attribute(id) {
    const acc=doc.accessors[id];
    const Type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array}[acc.componentType];
    const width={VEC3:3,VEC2:2,SCALAR:1}[acc.type];
    if(acc.bufferView!==undefined) {
      const view=bufferView(acc.bufferView);
      return new Type(view.buffer,view.byteOffset+(acc.byteOffset||0),acc.count*width);
    }
    const data=new Type(acc.count*width), {indices,values,count}=acc.sparse;
    const src=bufferView(values.bufferView), indexBytes=bufferView(indices.bufferView);
    const indexSize={5123:2,5125:4}[indices.componentType];
    for(let i=0;i<count;i++) data[indexBytes.readUIntLE((indices.byteOffset||0)+i*indexSize,indexSize)]=src[(values.byteOffset||0)+i];
    return data;
  }
  const [cloth,stone]=doc.meshes[0].primitives;
  return {
    pos:attribute(cloth.attributes.POSITION), normal:attribute(cloth.attributes.NORMAL), uv:attribute(cloth.attributes.TEXCOORD_0),
    occlusion:attribute(cloth.attributes._CLOTH_AO), tris:attribute(cloth.indices), stone:attribute(stone.indices),
    textures:doc.images.map(image=>bufferView(image.bufferView))
  };
}

const source=sculpture('finished'), detailed=sculpture('tailoring');
const originalCount=source.pos.length/3;

test('local refinement preserves the label, embroidered motto, stone, and original UVs',()=>{
  assert.ok(detailed.pos.length>source.pos.length);
  assert.ok(detailed.tris.length>source.tris.length);
  assert.deepEqual(detailed.stone,source.stone);
  const seamPositions=new Map();
  for(let id=0;id<originalCount;id++){
    const old=point(source,id),current=point(detailed,id);
    const key=old.toArray().join(',');
    if(seamPositions.has(key))assert.ok(seamPositions.get(key).distanceTo(current)<1e-6,'original welded vertex must stay welded');
    else seamPositions.set(key,current);
    const badge=old.z>.05 && Math.abs(old.x-.133)<.1 && Math.abs(old.y-.258)<.054;
    const motto=old.z>.05 && Math.abs(old.x-.172)<.138 && Math.abs(old.y+.344)<.04;
    if(old.y<-.72 || badge || motto)assert.ok(current.equals(old),'trousers, motto and badge placement must remain fixed');
  }
  assert.deepEqual(detailed.uv.subarray(0,source.uv.length),source.uv);
  assert.deepEqual(detailed.occlusion.subarray(0,originalCount),source.occlusion);
  assert.deepEqual(detailed.textures,source.textures);
  assert.equal(detailed.normal.length,detailed.pos.length);
  assert.equal(detailed.uv.length,detailed.pos.length/3*2);
  assert.equal(detailed.occlusion.length,detailed.pos.length/3);
  for(const id of new Set(source.stone)){
    assert.ok(point(source,id).equals(point(detailed,id)));
    assert.deepEqual(detailed.normal.subarray(3*id,3*id+3),source.normal.subarray(3*id,3*id+3));
  }
});

const edgeKey=(a,b)=>a<b?a+','+b:b+','+a;
const faceKey=ids=>[...ids].sort((a,b)=>a-b).join(',');
const point=(model,id)=>new Vector3().fromArray(model.pos,3*id);
const faceNormal=(model,[a,b,c])=>point(model,b).sub(point(model,a)).cross(point(model,c).sub(point(model,a)));

test('subdivision preserves UV seams, winding and occlusion while changing the upper and lower cloth profiles',()=>{
  const originalFaces=new Map(),edges=new Set(),oldEdgesByPosition=new Map();
  for(let offset=0;offset<source.tris.length;offset+=3) {
    const ids=source.tris.subarray(offset,offset+3);
    originalFaces.set(faceKey(ids),faceNormal(source,ids));
    for(let i=0;i<3;i++) {
      const a=ids[i],b=ids[(i+1)%3],edge=edgeKey(a,b);
      if(edges.has(edge))continue;
      edges.add(edge);
      const positionEdge=[point(source,a).toArray().join(','),point(source,b).toArray().join(',')].sort().join(':');
      if(!oldEdgesByPosition.has(positionEdge))oldEdgesByPosition.set(positionEdge,[]);
      oldEdgesByPosition.get(positionEdge).push(edge);
    }
  }
  // An appended midpoint can have other original neighbors across the face.
  // Recover its parent edge using the unchanged texture coordinates.
  const neighbors=new Map();
  for(let offset=0;offset<detailed.tris.length;offset+=3) {
    const ids=detailed.tris.subarray(offset,offset+3);
    for(const id of ids)if(id>=originalCount) {
      if(!neighbors.has(id))neighbors.set(id,new Set());
      for(const other of ids)if(other<originalCount)neighbors.get(id).add(other);
    }
  }
  const parents=new Map(),splitEdgePositions=new Map();
  let upperDisplaced=0,lowerDisplaced=0;
  for(const [id,adjacent] of neighbors) {
    let parent;
    for(const a of adjacent)for(const b of adjacent){
      if(a>=b||!edges.has(edgeKey(a,b)))continue;
      const u=(source.uv[2*a]+source.uv[2*b])/2,v=(source.uv[2*a+1]+source.uv[2*b+1])/2;
      if(Math.abs(detailed.uv[2*id]-u)<1e-6 && Math.abs(detailed.uv[2*id+1]-v)<1e-6)parent=[a,b];
    }
    assert.ok(parent,'inserted vertex must inherit a cloth edge');
    const [a,b]=parent;
    parents.set(id,parent);
    const value=point(detailed,id);
    const planar=point(source,a).lerp(point(source,b),.5);
    if(value.distanceTo(planar)>.0001){
      if(value.y>0)upperDisplaced++;
      else lowerDisplaced++;
    }
    assert.ok(value.y>-.72,'refinement stays above the trousers');
    const occlusion=(source.occlusion[a]+source.occlusion[b])/2;
    assert.ok(Math.abs(detailed.occlusion[id]-occlusion)<=1,'midpoint inherits local occlusion');
    splitEdgePositions.set(edgeKey(a,b),value);
  }
  assert.ok(upperDisplaced>0 && lowerDisplaced>0,'refinement changes both the shoulder and lower garment');
  // Duplicated vertex IDs along a UV seam must still describe one joined edge.
  for(const edgeIds of oldEdgesByPosition.values()) {
    const splits=edgeIds.map(id=>splitEdgePositions.get(id));
    if(splits.length<2||!splits.some(Boolean))continue;
    assert.ok(splits.every(Boolean),'both sides of an atlas cut must subdivide');
    for(const value of splits)assert.ok(value.distanceTo(splits[0])<1e-6,'UV split must stay welded');
  }
  for(let offset=0;offset<detailed.tris.length;offset+=3) {
    const ids=detailed.tris.subarray(offset,offset+3);
    const origin=new Set(Array.from(ids).flatMap(id=>parents.get(id)||[id]));
    const normal=originalFaces.get(faceKey(origin));
    assert.ok(normal,'new triangles must come from a single source face');
    if(normal.lengthSq()>0)assert.ok(faceNormal(detailed,ids).dot(normal)>0,'subdivision must preserve face winding');
  }
});

test('construction stitching changes the finish without moving the garment or repainting its lettering', () => {
  const sewn = sculpture('sewn');
  for (const key of ['pos', 'normal', 'uv', 'tris', 'stone', 'occlusion']) {
    assert.deepEqual(sewn[key], detailed[key], key);
  }
  const [normal, color, roughness] = sewn.textures;
  assert.deepEqual(color, detailed.textures[1]);
  assert.ok(!normal.equals(detailed.textures[0]), 'raised thread should change the normal map');
  assert.ok(!roughness.equals(detailed.textures[2]), 'thread should have its own roughness');
});

test('sleeve and pocket finishing preserves the torso, the stone and the welded cloth', () => {
  const before = sculpture('sewn'), after = sculpture('pocket');
  assert.ok(after.tris.length > before.tris.length);
  assert.deepEqual(after.stone, before.stone);
  assert.deepEqual(after.uv.subarray(0, before.uv.length), before.uv);
  assert.deepEqual(after.occlusion.subarray(0, before.occlusion.length), before.occlusion);
  assert.equal(after.occlusion.length * 3, after.pos.length);
  for (let i = before.pos.length / 3; i < after.pos.length / 3; i++) {
    const p = point(after, i);
    assert.ok(Math.abs(p.x) > .28 && p.y < .12 && p.y > -.56, 'subdivide only the free sleeves');
  }
  const welds = new Map();
  const movedSleeves = [0, 0], seatedPockets = [0, 0];
  for (const id of new Set(before.tris)) {
    const old = point(before, id), current = point(after, id);
    const key = old.toArray().join(',');
    if (welds.has(key)) assert.ok(welds.get(key).distanceTo(current) < 1e-6);
    else welds.set(key, current);
    if (old.equals(current)) continue;
    const side = Number(old.x > 0);
    if (Math.abs(old.x) > .28 && old.y < .23 && old.y > -.73) movedSleeves[side]++;
    else if (Math.abs(old.x) > .15 && old.z > .09 && old.y < -.09 && old.y > -.20) {
      seatedPockets[side]++;
      assert.ok(current.z <= old.z, 'original slider must recede into its seat');
    }
    else assert.fail('position outside sleeves and pocket slider seats changed at ' + key);
    const n = new Vector3().fromArray(after.normal, id * 3);
    assert.ok(Math.abs(n.length() - 1) < .001, 'changed vertex must have a finite unit normal');
  }
  assert.ok(movedSleeves.every(count => count > 0));
  assert.ok(seatedPockets.every(count => count > 0));
  for (const id of new Set(before.stone)) assert.ok(point(before, id).equals(point(after, id)));
  for (let i = 0; i < before.tris.length; i += 3) {
    const ids = before.tris.subarray(i, i + 3);
    const inPocket = ids.some(id => {
      const p = point(before, id);
      return p.y > -.20 && p.y < -.09 && p.z > .09 && Math.abs(p.x) < .29;
    });
    if (inPocket) {
      const oldNormal = faceNormal(before, ids);
      if (oldNormal.lengthSq()) assert.ok(faceNormal(after, ids).dot(oldNormal) > 0, 'pocket seat winding');
    }
  }
});


test('cuff shaping keeps wrist skin pinned where the hand shares the cloth atlas', async () => {
  const before = sculpture('pocket'), after = sculpture('bound');
  for (const key of ['tris', 'stone', 'uv', 'textures', 'occlusion']) assert.deepEqual(after[key], before[key], key);
  const { data, info } = await sharp(before.textures[1]).raw().toBuffer({ resolveWithObject: true });
  const shaped = [0, 0];
  for (const id of new Set(before.tris)) {
    const old = point(before, id), current = point(after, id);
    const x = Math.min(info.width - 1, Math.floor(before.uv[2 * id] * info.width));
    const y = Math.min(info.height - 1, Math.floor(before.uv[2 * id + 1] * info.height));
    const i = (y * info.width + x) * info.channels;
    if (old.y < -.52 && data[i] + data[i + 1] + data[i + 2] > 210) {
      assert.ok(current.equals(old), 'hand moves at cuff opening');
    }
    if (current.equals(old)) continue;
    assert.ok(Math.abs(old.x) >= .321 && old.y >= -.61 && old.y <= -.39);
    shaped[Number(old.x > 0)]++;
  }
  assert.ok(shaped.every(count => count > 0));
});

test('full-source garment retains the original triangle density and occlusion beyond 16-bit indices',()=>{
  const master=sculpture('master');
  const posed=fs.readFileSync(new URL('../artifacts/hoodie-study/hoodie-posed-source.glb',import.meta.url));
  const doc=JSON.parse(posed.subarray(20,20+posed.readUInt32LE(12)));
  const originalIndices=doc.accessors[doc.meshes[0].primitives[0].indices].count;
  assert.ok(master.tris.length+master.stone.length>=originalIndices);
  assert.ok(master.tris.length>detailed.tris.length*3);
  assert.ok(master.occlusion.subarray(65536).some(value=>value>0));
  assert.equal(master.occlusion.length,master.pos.length/3);
});

test('native cloth finish repairs the badge footprint in all three full-size maps',async()=>{
  const textile=sculpture('textile');
  for(const texture of textile.textures){
    const {width,height,format}=await sharp(texture).metadata();
    assert.deepEqual([width,height,format],[2048,2048,'png']);
    // Fixed UVs for the old generated letters and the adjacent clean fabric.
    const panel=left=>sharp(texture).extract({left,top:132,width:16,height:22}).raw().toBuffer();
    assert.deepEqual(await panel(776),await panel(824));
  }
});

test('rolled hood refinement stays around the neckline and preserves the face and the finished panels',()=>{
  const garment=sculpture('textile'),collar=sculpture('collar');
  assert.ok(collar.tris.length>garment.tris.length);
  assert.deepEqual(collar.stone,garment.stone);
  assert.deepEqual(collar.textures,garment.textures);
  assert.deepEqual(collar.uv.subarray(0,garment.uv.length),garment.uv);
  const stone=new Set(garment.stone);
  let shaped=0;
  for(let i=0;i<garment.pos.length/3;i++){
    const p=point(garment,i);
    if(p.y<.385 || p.y>.60 || stone.has(i)){
      assert.ok(point(collar,i).equals(p));
      assert.deepEqual(collar.normal.subarray(i*3,i*3+3),garment.normal.subarray(i*3,i*3+3));
    }else if(!point(collar,i).equals(p))shaped++;
  }
  assert.ok(shaped>0);
});
