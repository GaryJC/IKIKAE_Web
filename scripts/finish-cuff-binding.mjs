// Shape the short transition between the free sleeve and rib binding. Work on
// welded positions so duplicated vertices at a chart edge follow each other.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Matrix3, Vector3} from 'three';
import sharp from 'sharp';
import {repack} from './bake-concept-topstitch.mjs';

function smooth(a,b,value) {
  const t=Math.max(0,Math.min(1,(value-a)/(b-a)));
  return t*t*(3-2*t);
}
const bell=(v,w)=>Math.exp(-.5*(v/w)**2);

function shape(point) {
  const {x,y,z}=point;
  const sign=Math.sign(x),right=sign>0;
  const centreX=right?.422:.405;
  const centreZ=right?.030-.51*(y+.56):.142-.24*(y+.56);
  const dx=sign*x-centreX,dz=z-centreZ;
  const a=Math.atan2(dz/.087,dx/.066),front=Math.sin(a),outer=Math.cos(a);
  // Wrist pitch and the fold line differ on the turned left forearm.
  const rim=(right?-.580:-.577)+(right?.021:.027)*front-.003*outer;
  const welt=(right?-.474:-.481)+(right?.012:.024)*front+.005*outer;
  const aboveRim=y-rim;
  const sleeveSide=y-welt;
  const envelope=smooth(.321,.340,Math.abs(x))*(1-smooth(.045,.055,sleeveSide))
    *smooth(-.007,.002,aboveRim);
  if(!envelope)return point.clone();

  // Ease the lower few millimetres in to the wrist. The outer rib bulges a
  // little above the return, gradually rounding into the underside at the hand.
  const turn=-.0085*bell(aboveRim-.003,.0085)+.002*bell(aboveRim-.022,.012);
  const oblique=sleeveSide-.011*outer-.0025*Math.sin(2*a);
  const ease=smooth(-.60,.78,front);
  // Excess cloth is taken up at two unequal places round the opening. The
  // taller fold is concentrated at the inner wrist and dies out on the back.
  const first=bell(outer+.43,.35)*ease;
  const second=bell(outer-.77,.30)*ease;
  const crown=.005*(.40+.60*first)*bell(oblique-.004,.011);
  const recess=-.0045*(.45+.55*ease)*bell(oblique+.012,.009);
  const gather=.0065*first*bell(oblique-.023,.014)-.0045*second*bell(oblique-.019,.012);
  const radial=envelope*(turn+crown+recess+gather);
  const lower=envelope*(-.0025*bell(aboveRim-.011,.010)
    -.003*(first+.45*second)*bell(oblique-.008,.019));
  return new Vector3(x+sign*outer*radial,y+lower,z+front*radial);
}

function cuffChart(x,u,v) {
  return x>0?u>.88&&v>.72:u>.10&&u<.31&&v>.86;
}

export async function finishCuffs(input) {
  const end=20+input.readUInt32LE(12),doc=JSON.parse(input.subarray(20,end));
  const source=input.subarray(end+8);
  const cloth=doc.meshes[0].primitives.find(p=>doc.materials[p.material].normalTexture);
  const stone=doc.meshes[0].primitives.find(p=>p!==cloth);
  function values(id,Type) {
    const a=doc.accessors[id],v=doc.bufferViews[a.bufferView];
    return new Type(source.buffer,source.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),v.byteLength/Type.BYTES_PER_ELEMENT);
  }
  const pos=values(cloth.attributes.POSITION,Float32Array),nor=values(cloth.attributes.NORMAL,Float32Array);
  const uv=values(cloth.attributes.TEXCOORD_0,Float32Array),ix=values(cloth.indices,Uint32Array);
  const stoneIds=new Set(values(stone.indices,Uint32Array));
  const mat=doc.materials[cloth.material],map=doc.textures[mat.pbrMetallicRoughness.baseColorTexture.index];
  const imageView=doc.bufferViews[doc.images[map.source].bufferView];
  const image=source.subarray(imageView.byteOffset,imageView.byteOffset+imageView.byteLength);
  const {data,info}=await sharp(image).removeAlpha().raw().toBuffer({resolveWithObject:true});
  function handTexel(id){
    const u=Math.min(info.width-1,Math.floor(uv[2*id]*info.width));
    const v=Math.min(info.height-1,Math.floor(uv[2*id+1]*info.height));
    const index=(v*info.width+u)*info.channels;
    return data[index]+data[index+1]+data[index+2]>210;
  }
  const outPos=new Float32Array(pos),outNormal=new Float32Array(nor);
  const groups=new Map(),idToGroup=new Map();
  for(const i of new Set(ix)) {
    const p=new Vector3().fromArray(pos,3*i);
    if(Math.abs(p.x)<.321||p.y<-.610||p.y>-.390)continue;
    const key=p.toArray().join(',');
    if(!groups.has(key))groups.set(key,{p,ids:[],locked:false});
    const group=groups.get(key);
    group.ids.push(i);idToGroup.set(i,group);
    // Hands share the generated base mesh. Pin the inside edge where the
    // wrist skin starts, including any coincident cuff-side copy.
    if(stoneIds.has(i) || (p.y<-.52&&(!cuffChart(p.x,uv[2*i],uv[2*i+1])||handTexel(i))))group.locked=true;
  }
  for(const group of groups.values()) {
    if(group.locked)continue;
    const {p}=group,q=shape(p);
    if(q.distanceToSquared(p)<1e-16)continue;
    const eps=.00005;
    const axes=[new Vector3(eps,0,0),new Vector3(0,eps,0),new Vector3(0,0,eps)];
    const [dx,dy,dz]=axes.map(axis=>shape(p.clone().add(axis)).sub(shape(p.clone().sub(axis))).multiplyScalar(.5/eps));
    const normalTransform=new Matrix3().set(dx.x,dy.x,dz.x,dx.y,dy.y,dz.y,dx.z,dy.z,dz.z).invert().transpose();
    for(const id of group.ids){
      q.toArray(outPos,3*id);
      new Vector3().fromArray(nor,3*id).applyMatrix3(normalTransform).normalize().toArray(outNormal,3*id);
    }
  }
  // Preserve face orientation at the small triangular scan slivers around
  // the cuff mouth, restoring welded copies together when necessary.
  function face(points,ids) {
    const [a,b,c]=Array.from(ids,id=>new Vector3().fromArray(points,id*3));
    return b.sub(a).cross(c.sub(a));
  }
  const faces=[];
  for(let k=0;k<ix.length;k+=3){
    const ids=ix.subarray(k,k+3);
    if(ids.some(id=>idToGroup.has(id)))faces.push({ids,normal:face(pos,ids)});
  }
  for(let pass=0;pass<=groups.size;pass++){
    const restore=new Set();
    for(const {ids,normal} of faces){
      if(normal.lengthSq()>0 && face(outPos,ids).dot(normal)<=0)
        for(const id of ids)if(idToGroup.has(id))restore.add(idToGroup.get(id));
    }
    if(!restore.size)break;
    if(pass===groups.size)throw new Error('Cannot preserve cuff winding');
    for(const g of restore)for(const id of g.ids){
      outPos.set(pos.subarray(3*id,3*id+3),3*id);
      outNormal.set(nor.subarray(3*id,3*id+3),3*id);
    }
  }
  const position=doc.accessors[cloth.attributes.POSITION],normal=doc.accessors[cloth.attributes.NORMAL];
  const replacements=new Map([[position.bufferView,Buffer.from(outPos.buffer)],[normal.bufferView,Buffer.from(outNormal.buffer)]]);
  return repack(input,doc,source,replacements);
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const dir=new URL('../public/concept/',import.meta.url);
  fs.writeFileSync(new URL('hoodie-sculpture-bound.glb',dir),await finishCuffs(fs.readFileSync(new URL('hoodie-sculpture-pocket.glb',dir))));
}
