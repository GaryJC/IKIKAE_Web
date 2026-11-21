// Rebuild with node scripts/refine-sculpture.mjs after the collar pass.
import {readFileSync,writeFileSync} from 'node:fs';
import {Vector3} from 'three';
import sharp from 'sharp';
import {repack} from './bake-concept-topstitch.mjs';

const directory=new URL('../public/concept/',import.meta.url);
const source=readFileSync(new URL('hoodie-sculpture-collar.glb',directory));
const end=20+source.readUInt32LE(12);
const document=JSON.parse(source.subarray(20,end)),bin=source.subarray(end+8);
const [cloth,stone]=document.meshes[0].primitives;
function read(id,Type,width) {
  const a=document.accessors[id],v=document.bufferViews[a.bufferView];
  return new Type(bin.buffer,bin.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*width);
}
const xyz=read(stone.attributes.POSITION,Float32Array,3);
const sourceNormals=read(stone.attributes.NORMAL,Float32Array,3);
const uv=read(stone.attributes.TEXCOORD_0,Float32Array,2);
const stoneIndex=[...read(stone.indices,Uint32Array,1)],clothIndex=[],hands=[];
const originalStone=stoneIndex.length/3;
const texture=document.materials[cloth.material].pbrMetallicRoughness.baseColorTexture;
const image=document.images[document.textures[texture.index].source];
const imageView=document.bufferViews[image.bufferView];
const {data:pixels,info}=await sharp(bin.subarray(imageView.byteOffset,imageView.byteOffset+imageView.byteLength))
  .removeAlpha().raw().toBuffer({resolveWithObject:true});
// Fingers and the adjacent cuff share two packed UV charts. Position excludes
// the jacket body and trousers. Require ivory albedo at four interior points
// so mixed fabric/skin triangles at the photographed cuff stay on their atlas.
const probes=[[1/3,1/3,1/3],[.7,.15,.15],[.15,.7,.15],[.15,.15,.7]];
function isExposedHand(a,b,c) {
  const x=(xyz[3*a]+xyz[3*b]+xyz[3*c])/3,y=(xyz[3*a+1]+xyz[3*b+1]+xyz[3*c+1])/3;
  if(Math.abs(x)<.31 || y>-.538 || y<-.84)return false;
  return probes.every(([wa,wb,wc])=>{
    const u=wa*uv[2*a]+wb*uv[2*b]+wc*uv[2*c],v=wa*uv[2*a+1]+wb*uv[2*b+1]+wc*uv[2*c+1];
    const k=(Math.round(v*(info.height-1))*info.width+Math.round(u*(info.width-1)))*info.channels;
    return pixels[k]+pixels[k+1]+pixels[k+2]>210;
  });
}
// The continuous jacket ends at y=.576. The nineteen disconnected faces
// above .60 are isolated atlas misclassifications inside the head surface.
const originalCloth=read(cloth.indices,Uint32Array,1);
for(let i=0;i<originalCloth.length;i+=3) {
  const a=originalCloth[i],b=originalCloth[i+1],c=originalCloth[i+2];
  const aboveCollar=Math.min(xyz[a*3+1],xyz[b*3+1],xyz[c*3+1])>.60;
  if(aboveCollar)stoneIndex.push(a,b,c);
  else if(isExposedHand(a,b,c))hands.push(a,b,c);
  else clothIndex.push(a,b,c);
}

const positions=[],byPosition=new Map(),geomId=new Map();
for(const sourceId of new Set(stoneIndex)) {
  const p=new Vector3().fromArray(xyz,sourceId*3),key=p.toArray().join(',');
  if(!byPosition.has(key)){byPosition.set(key,positions.length);positions.push(p);}
  geomId.set(sourceId,byPosition.get(key));
}
const cornerPosition=stoneIndex.map(id=>geomId.get(id));
const angleAt=[],faceNormals=[],edges=new Map(),faceEdges=[];
const edgeKey=(a,b)=>Math.min(a,b)*positions.length+Math.max(a,b);
const cornerAfter=c=>Math.floor(c/3)*3+(c+1)%3;
for(let i=0;i<stoneIndex.length;i+=3) {
  const ids=cornerPosition.slice(i,i+3),v=ids.map(id=>positions[id]);
  const directions=v.map((p,k)=>v[(k+1)%3].clone().sub(p));
  const face=directions[0].clone().cross(directions[1]);
  const altitude=face.length()/Math.max(...directions.map(e=>e.length()));
  faceNormals.push(face.normalize());
  for(let k=0;k<3;k++) {
    angleAt.push(Math.PI-directions[(k+2)%3].angleTo(directions[k]));
    const a=ids[k],b=ids[(k+1)%3],key=edgeKey(a,b);
    if(!edges.has(key))edges.set(key,{uses:[],altitude});
    const edge=edges.get(key);
    edge.altitude=Math.min(edge.altitude,altitude);
    edge.uses.push(i+k);faceEdges.push(edge);
  }
}

// The original albedo threshold also selected the bright zip bridge and
// one isolated face at the inner collar. Only the surface connected to
// the crown is the head/neck. Keep the other faces and their old finish.
const surfaces=faceNormals.map((_,i)=>i);
function group(parents,i) {
  while(i!==parents[i]){parents[i]=parents[parents[i]];i=parents[i];}
  return i;
}
for(const {uses} of edges.values()) {
  const first=Math.floor(uses[0]/3);
  for(const corner of uses.slice(1))surfaces[group(surfaces,Math.floor(corner/3))]=group(surfaces,first);
}
const crown=cornerPosition.reduce((best,id,i)=>positions[id].y>positions[cornerPosition[best]].y?i:best,0);
const headSurface=group(surfaces,Math.floor(crown/3));
const isHead=surfaces.map((_,i)=>group(surfaces,i)===headSurface);
const originalDetails=[];

// Source UV/normal seams fragment even the smooth cheek into small planar
// reflections. Reconstruct the normal for each connected fan, with a real
// crease at sharp carving edges. UV coordinates stay on their own charts.
const parents=stoneIndex.map((_,i)=>i);
const root=i=>group(parents,i);
const creaseCos=Math.cos(48*Math.PI/180);
for(const edge of edges.values()) {
  if(edge.uses.length!==2)continue;
  const [a,b]=edge.uses,an=cornerAfter(a),bn=cornerAfter(b);
  if(cornerPosition[a]!==cornerPosition[bn] || cornerPosition[an]!==cornerPosition[b])continue;
  edge.smooth=faceNormals[Math.floor(a/3)].dot(faceNormals[Math.floor(b/3)])>creaseCos;
  if(edge.smooth){parents[root(a)]=root(bn);parents[root(an)]=root(b);}
}
const normals=new Map();
for(let i=0;i<stoneIndex.length;i++) {
  const fan=root(i);
  if(!normals.has(fan))normals.set(fan,new Vector3());
  normals.get(fan).addScaledVector(faceNormals[Math.floor(i/3)],angleAt[i]);
}
for(const n of normals.values())n.normalize();

const points=[],outNormals=[],outUV=[],ids=[],vertices=new Map(),midpoints=new Map();
function vertex(p,n,u,v) {
  const index=points.length;
  points.push(p);outNormals.push(n);outUV.push(u,v);
  return index;
}
for(let corner=0;corner<stoneIndex.length;corner++) {
  if(!isHead[Math.floor(corner/3)]){ids.push(-1);originalDetails.push(stoneIndex[corner]);continue;}
  const sourceId=stoneIndex[corner],fan=root(corner),u=uv[sourceId*2],v=uv[sourceId*2+1];
  const key=fan+','+u+','+v;
  if(!vertices.has(key))vertices.set(key,vertex(positions[cornerPosition[corner]],normals.get(fan),u,v));
  ids.push(vertices.get(key));
}
const lower=new Vector3().fromArray(document.accessors[cloth.attributes.POSITION].min);
const upper=new Vector3().fromArray(document.accessors[cloth.attributes.POSITION].max);
let maxLift=0;
function midpoint(corner) {
  const edge=faceEdges[corner];
  // The animated neckline border must keep exactly the cloth's tessellation.
  if(edge.uses.length!==2)return -1;
  const a=ids[corner],b=ids[cornerAfter(corner)],key=Math.min(a,b)+','+Math.max(a,b);
  if(midpoints.has(key))return midpoints.get(key);
  const pa=points[a],pb=points[b],direction=pb.clone().sub(pa);
  const na=outNormals[a],nb=outNormals[b],n=na.clone().add(nb).normalize();
  if(!edge.point) {
    const middle=pa.clone().lerp(pb,.5);
    edge.point=middle.clone();
    if(edge.smooth) {
      // Midpoint of a cubic Hermite edge. Each endpoint tangent is the
      // original edge projected into that endpoint's tangent plane.
      const lift=nb.clone().multiplyScalar(direction.dot(nb)).addScaledVector(na,-direction.dot(na)).multiplyScalar(.125);
      lift.clampLength(0,Math.min(edge.altitude*.12,.0012));
      edge.point.add(lift).clamp(lower,upper);
      maxLift=Math.max(maxLift,edge.point.distanceTo(middle));
    }
    edge.point.set(Math.fround(edge.point.x),Math.fround(edge.point.y),Math.fround(edge.point.z));
  }
  if(edge.smooth) {
    const tangent=direction.clone().addScaledVector(na,.25*direction.dot(na)).addScaledVector(nb,.25*direction.dot(nb)).normalize();
    n.addScaledVector(tangent,-n.dot(tangent)).normalize();
  }
  const id=vertex(edge.point,n,.5*(outUV[2*a]+outUV[2*b]),.5*(outUV[2*a+1]+outUV[2*b+1]));
  midpoints.set(key,id);return id;
}

const refined=[];
for(let i=0;i<ids.length;i+=3) {
  if(!isHead[i/3])continue;
  const c=ids.slice(i,i+3),m=[midpoint(i),midpoint(i+1),midpoint(i+2)];
  const count=m.filter(id=>id!==-1).length;
  const start=refined.length;
  if(count===0)refined.push(...c);
  else if(count===3)refined.push(c[0],m[0],m[2],m[0],c[1],m[1],m[2],m[1],c[2],m[0],m[1],m[2]);
  else {
    const k=m.findIndex(id=>count===1?id!==-1:id===-1),j=(k+1)%3,l=(k+2)%3;
    if(count===1)refined.push(c[k],m[k],c[l],m[k],c[j],c[l]);
    else refined.push(c[k],c[j],m[l],c[j],m[j],m[l],m[l],m[j],c[l]);
  }
  for(let j=start;j<refined.length;j+=3) {
    const [a,b,c]=refined.slice(j,j+3).map(k=>points[k]);
    if(b.clone().sub(a).cross(c.clone().sub(a)).dot(faceNormals[i/3])<=0)throw new Error('Inverted sculpture triangle');
  }
}
const headTriangles=refined.length/3,handIds=new Map();
for(const id of hands) {
  if(!handIds.has(id))handIds.set(id,vertex(new Vector3().fromArray(xyz,3*id),
    new Vector3().fromArray(sourceNormals,3*id),uv[2*id],uv[2*id+1]));
  refined.push(handIds.get(id));
}

const replacements=new Map();
function indexData(prim,indices) {
  const a=document.accessors[prim.indices],data=new Uint32Array(indices);
  a.count=data.length;replacements.set(a.bufferView,Buffer.from(data.buffer));
}
function newAccessor(data,type,width,componentType,target) {
  const view=document.bufferViews.length;
  document.bufferViews.push({buffer:0,byteOffset:0,byteLength:data.byteLength,target});
  replacements.set(view,Buffer.from(data.buffer));
  document.accessors.push({bufferView:view,componentType,count:data.length/width,type});
  return document.accessors.length-1;
}
function newAttribute(array,type,width) {return newAccessor(new Float32Array(array),type,width,5126,34962);}
const originalColor=[0x35,0x2f,0x2b].map(c=>((c/255+.055)/1.055)**2.4);
document.meshes[0].primitives.push({
  attributes:{...stone.attributes},
  indices:newAccessor(new Uint32Array(originalDetails),'SCALAR',1,5125,34963),
  material:document.materials.push({
    name:'Original dark zipper hardware',
    pbrMetallicRoughness:{baseColorFactor:[...originalColor,1],metallicFactor:0,roughnessFactor:.29}
  })-1
});
stone.attributes={
  POSITION:newAttribute(points.flatMap(p=>p.toArray()),'VEC3',3),
  NORMAL:newAttribute(outNormals.flatMap(p=>p.toArray()),'VEC3',3),
  TEXCOORD_0:newAttribute(outUV,'VEC2',2)
};
const lo=new Vector3(Infinity,Infinity,Infinity),hi=new Vector3(-Infinity,-Infinity,-Infinity);
for(const p of points){lo.min(p);hi.max(p);}
Object.assign(document.accessors[stone.attributes.POSITION],{min:lo.toArray(),max:hi.toArray()});
indexData(cloth,clothIndex);indexData(stone,refined);
const black=3/255/12.92;
document.materials[stone.material]={
  name:'Musée graphite sculpture',
  pbrMetallicRoughness:{baseColorFactor:[black,black,black,1],metallicFactor:.5,roughnessFactor:.4}
};
const output=repack(source,document,bin,replacements);
writeFileSync(new URL('hoodie-sculpture-patina.glb',directory),output);
console.log({oldStoneTriangles:originalStone,transferredHeadFaces:stoneIndex.length/3-originalStone,
  headTriangles,handTriangles:hands.length/3,stoneTriangles:refined.length/3,clothTriangles:clothIndex.length/3,originalGarmentDetailTriangles:originalDetails.length/3,stoneVertices:points.length,
  maxLift,bytes:output.length});
