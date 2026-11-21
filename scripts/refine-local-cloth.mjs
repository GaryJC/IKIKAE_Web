import {Vector2,Vector3} from 'three';
import {repack} from './bake-concept-topstitch.mjs';

function signedFace(points,a,b,c){
  return points[b].clone().sub(points[a]).cross(points[c].clone().sub(points[a]));
}

export function refineCloth(input,{splitEdge,shape,passes=1}){
  const result=Buffer.from(input),length=result.readUInt32LE(12);
  const doc=JSON.parse(result.subarray(20,20+length)),bin=result.subarray(28+length);
  const [cloth,stone]=doc.meshes[0].primitives;
  function read(id,Type){
    const accessor=doc.accessors[id],view=doc.bufferViews[accessor.bufferView];
    return new Type(bin.buffer,bin.byteOffset+(view.byteOffset||0)+(accessor.byteOffset||0),view.byteLength/Type.BYTES_PER_ELEMENT);
  }
  const positions=read(cloth.attributes.POSITION,Float32Array),normals=read(cloth.attributes.NORMAL,Float32Array);
  const coarseIndices=read(cloth.indices,Uint32Array),stoneIndices=read(stone.indices,Uint32Array);
  const fromBuffer=data=>Array.from({length:data.length/3},(_,i)=>new Vector3().fromArray(data,3*i));
  const before=fromBuffer(positions),sourceNormals=fromBuffer(normals);
  const texcoords=read(cloth.attributes.TEXCOORD_0,Float32Array);
  const uv=Array.from({length:before.length},(_,i)=>new Vector2().fromArray(texcoords,2*i));
  const aoAttr=doc.accessors[cloth.attributes._CLOTH_AO];
  const views=doc.bufferViews.map(v=>bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength));
  const ao=Array(before.length).fill(0);
  const aoIndex=views[aoAttr.sparse.indices.bufferView],aoValues=views[aoAttr.sparse.values.bufferView];
  const sparse=aoAttr.sparse;
  const indexSize={5121:1,5123:2,5125:4}[sparse.indices.componentType];
  for(let i=0;i<sparse.count;i++){
    const id=aoIndex.readUIntLE((sparse.indices.byteOffset||0)+indexSize*i,indexSize);
    ao[id]=aoValues[(sparse.values.byteOffset||0)+i];
  }
  const stonePoints=new Set(Array.from(stoneIndices,i=>before[i].toArray().join(',')));
  const edges=new Map();
  function midpoint(a,b) {
    const key=a<b?a+','+b:b+','+a;
    if(edges.has(key))return edges.get(key);
    const p=before[a].clone().lerp(before[b],.5);
    if(!splitEdge(p,before[a],before[b]) ||
      stonePoints.has(before[a].toArray().join(',')) || stonePoints.has(before[b].toArray().join(',')))return -1;
    const id=before.length;
    before.push(p);sourceNormals.push(sourceNormals[a].clone().add(sourceNormals[b]).normalize());
    uv.push(uv[a].clone().lerp(uv[b],.5));ao.push(Math.round((ao[a]+ao[b])*.5));
    edges.set(key,id);return id;
  }
  // Conforming splits across both sides of each long edge. All original
  // IDs/UVs stay at their original offsets, including the shared stone mesh.
  function subdivide(inputIndices){
    const output=[];
    for(let k=0;k<inputIndices.length;k+=3){
      const ids=inputIndices.slice(k,k+3),corners=Array.from(ids);
      const mid=corners.map((id,i)=>midpoint(id,corners[(i+1)%3]));
      const split=mid.filter(id=>id>=0).length;
      if(!split){output.push(...corners);continue;}
      const [a,b,c]=corners,[ab,bc,ca]=mid;
      if(split===3){output.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);continue;}
      const start=mid.findIndex(id=>(id>=0)===(split===1));
      const [A,B,C]=[0,1,2].map(i=>corners[(start+i)%3]);
      const [M,N,O]=[0,1,2].map(i=>mid[(start+i)%3]);
      if(split===1)output.push(A,M,C,M,B,C);
      else output.push(O,N,C,A,B,O,B,N,O);
    }
    return output;
  }
  let clothIndices=coarseIndices;
  for(let pass=0;pass<passes;pass++)clothIndices=subdivide(clothIndices);
  const after=before.map(v=>v.clone()),finalNormals=sourceNormals.map(v=>v.clone());
  const positionKey=p=>p.toArray().join(',');
  const keys=before.map(positionKey);
  for(const id of new Set(clothIndices)){
    const p=before[id];
    if(stonePoints.has(keys[id]))continue;
    shape(p,after[id],finalNormals[id]);
    after[id].set(Math.fround(after[id].x),Math.fround(after[id].y),Math.fround(after[id].z));
  }
  // Extremely thin original triangles can fold back on themselves. Reduce
  // the corresponding displacement together across duplicated UV vertices.
  const affected=[];
  for(let k=0;k<clothIndices.length;k+=3){
    const a=clothIndices[k],b=clothIndices[k+1],c=clothIndices[k+2];
    if(after[a].equals(before[a])&&after[b].equals(before[b])&&after[c].equals(before[c]))continue;
    const normal=signedFace(before,a,b,c);
    if(normal.lengthSq()>0)affected.push({a,b,c,normal});
  }
  for(let pass=0;pass<64;pass++){
    const unsafe=new Set();
    for(const {a,b,c,normal} of affected){
      if(signedFace(after,a,b,c).dot(normal)<=0){
        unsafe.add(keys[a]);unsafe.add(keys[b]);unsafe.add(keys[c]);
      }
    }
    if(!unsafe.size)break;
    if(pass===63)throw new Error('Cannot preserve cloth winding');
    for(let id=0;id<before.length;id++)if(unsafe.has(keys[id])){
      after[id].lerp(before[id],.5);
      after[id].set(Math.fround(after[id].x),Math.fround(after[id].y),Math.fround(after[id].z));
    }
  }
  const limits=doc.accessors[cloth.attributes.POSITION];
  const scene=doc.scenes[doc.scene||0];
  scene.extras={...scene.extras,framingCenter:scene.extras?.framingCenter??limits.min.map((min,i)=>(min+limits.max[i])*.5)};
  limits.min=[Infinity,Infinity,Infinity];limits.max=[-Infinity,-Infinity,-Infinity];
  for(const p of after)for(let axis=0;axis<3;axis++){
    const value=p.getComponent(axis);
    limits.min[axis]=Math.min(limits.min[axis],value);limits.max[axis]=Math.max(limits.max[axis],value);
  }
  const replacements=new Map();
  function replaceAccessor(id,array,count){
    const a=doc.accessors[id];a.count=count;
    replacements.set(a.bufferView,Buffer.from(array.buffer,array.byteOffset,array.byteLength));
  }
  function writeVectors(id,vectors){
    replaceAccessor(id,new Float32Array(vectors.flatMap(v=>v.toArray())),vectors.length);
  }
  writeVectors(cloth.attributes.POSITION,after);
  writeVectors(cloth.attributes.NORMAL,finalNormals);
  writeVectors(cloth.attributes.TEXCOORD_0,uv);
  replaceAccessor(cloth.indices,new Uint32Array(clothIndices),clothIndices.length);
  if(doc.accessors[cloth.indices].max)doc.accessors[cloth.indices].max=[before.length-1];
  const aoIDs=[];for(let i=0;i<ao.length;i++)if(ao[i])aoIDs.push(i);
  const AoType=before.length<=65536?Uint16Array:Uint32Array;
  aoAttr.count=ao.length;aoAttr.sparse.count=aoIDs.length;
  aoAttr.sparse.indices.componentType=AoType===Uint16Array?5123:5125;
  aoAttr.sparse.indices.byteOffset=0;aoAttr.sparse.values.byteOffset=0;
  replacements.set(aoAttr.sparse.indices.bufferView,Buffer.from(new AoType(aoIDs).buffer));
  replacements.set(aoAttr.sparse.values.bufferView,Buffer.from(aoIDs.map(i=>ao[i])));
  return repack(result,doc,bin,replacements);
}

