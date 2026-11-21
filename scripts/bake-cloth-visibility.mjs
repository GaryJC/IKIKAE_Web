// Offline only. Store short-range angular occlusion as a sparse custom attribute:
// exposed fabric is exactly zero, neither stone nor the original maps are edited.
import { Box3, Ray, Triangle, Vector3 } from 'three';

function buildTree(triangles) {
  const bounds=new Box3();
  for(const face of triangles) bounds.expandByPoint(face.a).expandByPoint(face.b).expandByPoint(face.c);
  if(triangles.length<=12) return {bounds,triangles};
  const extent=bounds.getSize(new Vector3());
  const axis=extent.x>extent.y && extent.x>extent.z?'x':extent.y>extent.z?'y':'z';
  const center=face=>face.a[axis]+face.b[axis]+face.c[axis];
  triangles.sort((a,b)=>center(a)-center(b));
  const middle=triangles.length>>1;
  return {bounds,children:[buildTree(triangles.slice(0,middle)),buildTree(triangles.slice(middle))]};
}

export function clothOcclusion(vertices,normals,receivers,triangles,radius=.115) {
  const tree=buildTree(triangles), ray=new Ray(), hit=new Vector3(), end=new Vector3();
  const tangent=new Vector3(),bitangent=new Vector3();
  // Cosine-weighted hemisphere. Keep the same sample pattern on neighboring
  // vertices (no random ray noise); reduce distant hits with a smooth kernel.
  const samples=Array.from({length:40},(_,i)=>{
    const r=Math.sqrt((i+.5)/40), theta=i*Math.PI*(3-Math.sqrt(5));
    return [r*Math.cos(theta),r*Math.sin(theta),Math.sqrt(1-r*r)];
  });
  function nearest(node,limit) {
    const box=node.bounds, origin=ray.origin;
    if(!box.containsPoint(origin) && (!ray.intersectBox(box,end) || end.distanceToSquared(origin)>=limit*limit))return limit;
    if(node.children) {
      for(const child of node.children)limit=nearest(child,limit);
    }else{
      for(const face of node.triangles){
        if(ray.intersectTriangle(face.a,face.b,face.c,false,hit))limit=Math.min(limit,hit.distanceTo(origin));
      }
    }
    return limit;
  }
  const values=new Uint8Array(vertices.length);
  // Ray origins at atlas seams share one physical point and one averaged normal.
  const groups=new Map();
  for(const id of receivers){
    const point=vertices[id],key=[point.x,point.y,point.z].map(v=>Math.round(v*1e6)).join('/');
    let group=groups.get(key);
    if(!group){group={ids:[],point,normal:new Vector3()};groups.set(key,group);}
    group.ids.push(id);group.normal.add(normals[id]);
  }
  for(const {point,normal,ids} of groups.values()){
    if(normal.lengthSq()<1e-6)continue;
    normal.normalize();
    tangent.set(0,Math.abs(normal.y)<.95?1:0,Math.abs(normal.y)<.95?0:1).cross(normal).normalize();
    bitangent.crossVectors(normal,tangent);
    ray.origin.copy(point).addScaledVector(normal,.0015);
    let blocked=0;
    for(const [x,y,z] of samples){
      ray.direction.copy(tangent).multiplyScalar(x).addScaledVector(bitangent,y).addScaledVector(normal,z);
      const u=1-nearest(tree,radius)/radius;
      blocked+=u*u*(3-2*u);
    }
    const value=Math.round(255*blocked/samples.length);
    for(const id of ids)values[id]=value;
  }
  return values;
}

export function bakeClothVisibility(buffer) {
  const jsonLength=buffer.readUInt32LE(12),doc=JSON.parse(buffer.subarray(20,20+jsonLength));
  const bin=buffer.subarray(jsonLength+28),parts=[bin];let byteLength=bin.length;
  const primitives=doc.meshes[0].primitives;
  const cloth=primitives.find(p=>!doc.materials[p.material].name.includes('Clean ivory'));
  if(!cloth || cloth.attributes._CLOTH_AO!==undefined) throw new Error('Expected cloth primitive without baked occlusion');
  function data(id){
    const accessor=doc.accessors[id],view=doc.bufferViews[accessor.bufferView];
    const offset=(accessor.byteOffset||0)+(view.byteOffset||0);
    if(accessor.type==='VEC3' && accessor.componentType===5126){
      return Array.from({length:accessor.count},(_,i)=>{
        const start=offset+i*(view.byteStride||12);
        return new Vector3(bin.readFloatLE(start),bin.readFloatLE(start+4),bin.readFloatLE(start+8));
      });
    }
    if(accessor.type==='SCALAR' && [5123,5125].includes(accessor.componentType)){
      const bytes=accessor.componentType===5125?4:2;
      return Array.from({length:accessor.count},(_,i)=>bin.readUIntLE(offset+i*bytes,bytes));
    }
    throw new Error('Unsupported accessor in cloth visibility bake');
  }
  const vertices=data(cloth.attributes.POSITION),normals=data(cloth.attributes.NORMAL),triangles=[];
  for(const p of primitives) {
    if(p.attributes.POSITION!==cloth.attributes.POSITION)throw new Error('Expected shared sculpture positions');
    const idx=data(p.indices);
    for(let i=0;i<idx.length;i+=3) triangles.push(new Triangle(vertices[idx[i]],vertices[idx[i+1]],vertices[idx[i+2]]));
  }
  const occlusion=clothOcclusion(vertices,normals,new Set(data(cloth.indices)),triangles);
  const ids=Array.from(occlusion.keys()).filter(id=>occlusion[id]>0);
  function append(bytes){
    const view=doc.bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:bytes.length})-1;
    const padded=Buffer.alloc((bytes.length+3)&~3);bytes.copy(padded);parts.push(padded);byteLength+=padded.length;return view;
  }
  if(ids.length){
    const indexWidth=vertices.length>65536?4:2;
    const indices=Buffer.alloc(ids.length*indexWidth);
    ids.forEach((id,i)=>indices.writeUIntLE(id,i*indexWidth,indexWidth));
    const indexView=append(indices),valueView=append(Buffer.from(ids.map(id=>occlusion[id])));
    cloth.attributes._CLOTH_AO=doc.accessors.push({type:'SCALAR',componentType:5121,normalized:true,
      count:vertices.length,sparse:{count:ids.length,indices:{bufferView:indexView,componentType:indexWidth===4?5125:5123},values:{bufferView:valueView}}})-1;
  }
  doc.buffers[0].byteLength=byteLength;
  const raw=Buffer.from(JSON.stringify(doc)),json=Buffer.alloc((raw.length+3)&~3,32);raw.copy(json);
  const header=Buffer.from(buffer.subarray(0,20));header.writeUInt32LE(byteLength+json.length+28,8);header.writeUInt32LE(json.length,12);
  const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(byteLength);binHeader.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,json,binHeader,...parts]);
}
