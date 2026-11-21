// Local refinement of the actual posed garment. Keep the finished pose and
// decals; transfer only the curvature lost during the original decimation.
import fs from 'node:fs';
import {bodyClothDetail,bodyNeedsSubdivision} from './body-cloth-profiles.mjs';
import {hoodReturnDetail,hoodReturnNeedsSubdivision} from './hood-return-profile.mjs';
import {fileURLToPath} from 'node:url';
import {Vector2,Vector3,CatmullRomCurve3} from 'three';

function unpack(buffer){
  const end=20+buffer.readUInt32LE(12),doc=JSON.parse(buffer.subarray(20,end));
  const bin=buffer.subarray(end+8);
  const views=doc.bufferViews.map(v=>bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength));
  function read(id,Type){
    const access=doc.accessors[id],b=views[access.bufferView];
    return new Type(b.buffer,b.byteOffset+(access.byteOffset||0),b.length/Type.BYTES_PER_ELEMENT);
  }
  return {doc,views,read};
}
function pack({doc,views}){
  let length=0;
  const chunks=[];
  for(const [i,view] of doc.bufferViews.entries()){
    const data=views[i],padding=Buffer.alloc((4-data.length%4)%4);
    view.byteOffset=length;view.byteLength=data.length;
    chunks.push(data,padding);length+=data.length+padding.length;
  }
  doc.buffers[0].byteLength=length;
  const raw=Buffer.from(JSON.stringify(doc)),json=Buffer.alloc((raw.length+3)&~3,32);raw.copy(json);
  const head=Buffer.alloc(20),binHead=Buffer.alloc(8);
  head.write('glTF');head.writeUInt32LE(2,4);head.writeUInt32LE(28+json.length+length,8);
  head.writeUInt32LE(json.length,12);head.write('JSON',16);
  binHead.writeUInt32LE(length);binHead.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([head,json,binHead,...chunks]);
}

function surface(mesh,input){
  const p=mesh.read(input.POSITION,Float32Array),n=mesh.read(input.NORMAL,Float32Array),uv=mesh.read(input.TEXCOORD_0,Float32Array);
  return {p:Array.from({length:p.length/3},(_,i)=>new Vector3().fromArray(p,i*3)),
    n:Array.from({length:n.length/3},(_,i)=>new Vector3().fromArray(n,i*3)),
    uv:Array.from({length:uv.length/2},(_,i)=>new Vector2().fromArray(uv,i*2))};
}

// Source UV islands also cover the backs of doubled folds. Use the closest
// corresponding surface in posed space when a texel hits two triangles.
function sourceSampler(source){
  const prim=source.doc.meshes[0].primitives[0],s=surface(source,prim.attributes);
  const ix=source.read(prim.indices,Uint32Array),cells=new Map(),grid=128;
  for(let i=0;i<ix.length;i+=3){
    const ids=[ix[i],ix[i+1],ix[i+2]];
    if(ids.every(k=>s.p[k].y<-.65)||ids.every(k=>s.p[k].y>.68))continue;
    const [u,v]=['x','y'].map(k=>ids.map(j=>Math.floor(s.uv[j][k]*grid)));
    for(let y=Math.min(...v);y<=Math.max(...v);y++)for(let x=Math.min(...u);x<=Math.max(...u);x++){
      const key=y*grid+x;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);
    }
  }
  return (uv,near)=>{
    const candidates=cells.get(Math.floor(uv.y*grid)*grid+Math.floor(uv.x*grid))||[];
    let distance=.018*.018,best=null;
    for(const i of candidates){
      const ids=[ix[i],ix[i+1],ix[i+2]],[a,b,c]=ids.map(k=>s.uv[k]);
      const x=b.x-a.x,y=b.y-a.y,X=c.x-a.x,Y=c.y-a.y,det=x*Y-y*X;
      if(Math.abs(det)<1e-12)continue;
      const t=((uv.x-a.x)*Y-(uv.y-a.y)*X)/det,u=(x*(uv.y-a.y)-y*(uv.x-a.x))/det;
      if(Math.min(t,u,1-t-u)<-1e-4)continue;
      const weights=[1-t-u,t,u],pos=new Vector3(),nor=new Vector3();
      ids.forEach((id,j)=>{pos.addScaledVector(s.p[id],weights[j]);nor.addScaledVector(s.n[id],weights[j]);});
      const error=pos.distanceToSquared(near);
      if(error<distance){distance=error;best={pos,nor:nor.normalize()};}
    }
    return best;
  };
}

// Rails sampled on the finished hood lip and the two raglan seams. Shape the
// rolled edge and a shallow adjacent channel through one smooth vector field.
const lines=[
  {points:[[.14,.428,.014],[.178,.407,.014],[.212,.388,.016],[.256,.361,.011],[.302,.329,.009],[.348,.296,.004]],direction:[.43,.68,.6],width:.0095,height:.00365},
  {points:[[-.144,.434,.047],[-.17,.425,.047],[-.205,.417,.042],[-.249,.395,.042],[-.293,.369,.047],[-.331,.341,.045]],direction:[-.43,.65,.64],width:.0095,height:.00315},
  {points:[[.017,.414,.107],[.054,.416,.077],[.09,.421,.05],[.124,.433,.023],[.158,.443,.023],[.187,.454,.01],[.211,.458,-.019],[.232,.452,-.067],[.242,.440,-.118]],direction:[.30,.32,.90],width:.012,height:.0067}
].map(r=>{
  const samples=new CatmullRomCurve3(r.points.map(p=>new Vector3(...p))).getPoints(48);
  return {...r,direction:new Vector3(...r.direction).normalize(),samples};
});
function profile(p,n){
  if(p.y<.265||p.y>.50||p.z<-.16)return;
  const original=p.clone();
  for(const r of lines){
    let best=Infinity,delta,station=0;
    for(let i=1;i<r.samples.length;i++){
      const a=r.samples[i-1],b=r.samples[i],seg=b.clone().sub(a),v=original.clone().sub(a);
      const t=Math.min(1,Math.max(0,v.dot(seg)/seg.lengthSq()));
      v.addScaledVector(seg,-t);const d=v.lengthSq();
      if(d<best){best=d;delta=v;station=(i-1+t)/(r.samples.length-1);}
    }
    const dist=Math.sqrt(best),w=r.width;
    if(dist>4*w)continue;
    const ramp=Math.min(1,station*9,(1-station)*9),fade=ramp*ramp*(3-2*ramp);
    const crown=Math.exp(-best/(2*w*w)),valley=Math.exp(-.5*((dist-1.8*w)/(.63*w))**2);
    const h=r.height*fade*(crown-.32*valley);
    p.addScaledVector(r.direction,h);
    const slope=r.height*fade*(-dist*crown/(w*w)+.32*valley*(dist-1.8*w)/(.63*w)**2);
    const g=delta.multiplyScalar(slope/Math.max(1e-8,dist));
    n.addScaledVector(g,-n.dot(r.direction)/(1+g.dot(r.direction))).normalize();
  }
}

export function detailHoodie(finished,posed,original){
  const model=unpack(finished),base=unpack(posed);
  const [cloth,stone]=model.doc.meshes[0].primitives;
  const s=surface(model,cloth.attributes),rest=surface(base,base.doc.meshes[0].primitives[0].attributes);
  const sample=sourceSampler(unpack(original));
  const indices=model.read(cloth.indices,Uint32Array),stoneIds=model.read(stone.indices,Uint32Array);
  const count=s.p.length;
  if(count!==rest.p.length)throw new Error('The posed and finished meshes need matching vertex IDs');
  const flat=s.p.map(p=>p.clone());
  const key=p=>p.toArray().join(','),coord=s.p.map(key);
  const stonePositions=new Set(Array.from(stoneIds,i=>coord[i]));
  const rawEdge=(a,b)=>a<b?a+':'+b:b+':'+a;
  const geometricEdge=(a,b)=>coord[a]<coord[b]?coord[a]+'|'+coord[b]:coord[b]+'|'+coord[a];
  const aoAttr=model.doc.accessors[cloth.attributes._CLOTH_AO];
  const {indices:aoIndices,values:aoValues}=aoAttr.sparse;
  const aoIds=model.views[aoIndices.bufferView],aoBytes=model.views[aoValues.bufferView];
  const ao=Array(count).fill(0);
  const indexWidth=aoIndices.componentType===5125?4:2;
  for(let i=0;i<aoAttr.sparse.count;i++)ao[aoIds.readUIntLE(i*indexWidth,indexWidth)]=aoBytes[i];
  const mids=new Map(),welded=new Map();
  const axis=new Vector3(0,0,1),angle=-2.7*Math.PI/180;
  function midpoint(a,b){
    const edge=rawEdge(a,b);
    if(mids.has(edge))return mids.get(edge);
    const p=s.p[a].clone().lerp(s.p[b],.5),len=s.p[a].distanceTo(s.p[b]);
    const side=Math.abs(p.x);
    const collar=p.y>.37&&p.y<.595&&side<.32;
    const shoulder=p.y>.265&&p.y<.44&&side>.13&&side<.40&&p.z>-.055&&p.z<.12;
    if(stonePositions.has(coord[a])||stonePositions.has(coord[b]))return -1;
    const upper=collar||shoulder||hoodReturnNeedsSubdivision(p);
    if(upper ? len<.013 : len<.018||!bodyNeedsSubdivision(p))return -1;
    const uv=s.uv[a].clone().lerp(s.uv[b],.5),n=s.n[a].clone().add(s.n[b]).normalize();
    const near=rest.p[a].clone().lerp(rest.p[b],.5),original=sample(uv,near);
    const g=geometricEdge(a,b);
    flat.push(p.clone());
    if(original){
      const deviation=original.pos.sub(near).applyAxisAngle(axis,angle).dot(n);
      p.addScaledVector(n,Math.max(-len*.11,Math.min(len*.11,deviation)));
      const sourceNormal=original.nor.applyAxisAngle(axis,angle);
      if(sourceNormal.dot(n)>.70)n.lerp(sourceNormal,.62).normalize();
    }
    if(welded.has(g))p.copy(welded.get(g));else welded.set(g,p.clone());
    const id=s.p.length;
    s.p.push(p);s.n.push(n);s.uv.push(uv);ao.push(Math.round((ao[a]+ao[b])*.5));mids.set(edge,id);
    return id;
  }
  const out=[],parentNormals=[];
  const faceNormal=(positions,a,b,c)=>positions[b].clone().sub(positions[a]).cross(positions[c].clone().sub(positions[a]));
  function emit(normal,...triangles){
    out.push(...triangles);
    for(let i=0;i<triangles.length;i+=3)parentNormals.push(normal);
  }
  for(let i=0;i<indices.length;i+=3){
    const a=indices[i],b=indices[i+1],c=indices[i+2],ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
    const normal=faceNormal(flat,a,b,c);
    const split=[ab,bc,ca].filter(id=>id>=0).length;
    if(split===0){emit(normal,a,b,c);continue;}
    if(split===3){emit(normal,a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);continue;}
    const verts=[a,b,c],edges=[ab,bc,ca];
    // Rotate the triangle so the single split (or single unsplit) is AB.
    const start=edges.findIndex(id=>(id>=0)===(split===1));
    const take=(v,k)=>v[(start+k)%3],A=take(verts,0),B=take(verts,1),C=take(verts,2);
    if(split===1){const M=take(edges,0);emit(normal,A,M,C,M,B,C);}
    else{const N=take(edges,1),O=take(edges,2);emit(normal,O,N,C,A,B,O,B,N,O);}
  }
  const clothIds=new Set(out);
  for(const i of clothIds){
    if(stonePositions.has(coord[i]))continue;
    profile(s.p[i],s.n[i]);
    hoodReturnDetail(s.p[i],s.n[i]);
    bodyClothDetail(s.p[i],s.n[i]);
  }
  // Slivers at source scan seams can invert even under a tiny displacement.
  // Back off the entire affected patch, including coincident UV copies.
  const flatKeys=flat.map(key);
  for(const p of s.p)p.set(Math.fround(p.x),Math.fround(p.y),Math.fround(p.z));
  for(let pass=0;pass<out.length;pass++){
    const unsafe=new Set();
    for(let i=0;i<out.length;i+=3){
      const a=out[i],b=out[i+1],c=out[i+2],ref=parentNormals[i/3];
      if(ref.lengthSq()>0 && faceNormal(s.p,a,b,c).dot(ref)<=0){
        unsafe.add(flatKeys[a]);unsafe.add(flatKeys[b]);unsafe.add(flatKeys[c]);
      }
    }
    if(!unsafe.size)break;
    let restored=0;
    for(let id=0;id<s.p.length;id++){
      if(!unsafe.has(flatKeys[id]))continue;
      const point=flat[id],x=Math.fround(point.x),y=Math.fround(point.y),z=Math.fround(point.z);
      if(s.p[id].x!==x||s.p[id].y!==y||s.p[id].z!==z)restored++;
      s.p[id].set(x,y,z);
    }
    if(!restored)throw new Error('Planar subdivision collapsed a triangle');
  }
  function replace(id,data,count){
    const attr=model.doc.accessors[id];attr.count=count;
    model.views[attr.bufferView]=Buffer.from(data.buffer,data.byteOffset,data.byteLength);
  }
  for(const [name,list] of [['POSITION',s.p],['NORMAL',s.n],['TEXCOORD_0',s.uv]]){
    replace(cloth.attributes[name],new Float32Array(list.flatMap(v=>v.toArray())),s.p.length);
  }
  // Restored waist folds can extend past the old atlas model's bounding box.
  const low=new Vector3(Infinity,Infinity,Infinity),high=new Vector3(-Infinity,-Infinity,-Infinity);
  for(const point of s.p){low.min(point);high.max(point);}
  const positionAttr=model.doc.accessors[cloth.attributes.POSITION];
  positionAttr.min=low.toArray();
  positionAttr.max=high.toArray();
  replace(cloth.indices,new Uint32Array(out),out.length);
  const indexAttr=model.doc.accessors[cloth.indices];
  if(indexAttr.max)indexAttr.max=[s.p.length-1];
  const ids=[];for(let i=0;i<ao.length;i++)if(ao[i])ids.push(i);
  const IndexArray=ao.length>65536?Uint32Array:Uint16Array;
  aoIndices.componentType=ao.length>65536?5125:5123;
  model.views[aoIndices.bufferView]=Buffer.from(new IndexArray(ids).buffer);
  model.views[aoValues.bufferView]=Buffer.from(ids.map(i=>ao[i]));
  aoAttr.count=s.p.length;aoAttr.sparse.count=ids.length;
  return pack(model);
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const dir=new URL('../public/concept/',import.meta.url);
  const read=url=>fs.readFileSync(new URL(url,dir));
  fs.writeFileSync(new URL('hoodie-sculpture-tailoring.glb',dir),detailHoodie(read('hoodie-sculpture-finished.glb'),read('hoodie-sculpture-posed.glb'),read('../../artifacts/hoodie-study/hoodie-posed-source.glb')));
}
