// Reconstruct one continuous front waist surface across the overlapping atlas
// charts. Sample the garment itself to retain the volume of its gathered folds.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {BufferAttribute,BufferGeometry,DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {repack} from './bake-concept-topstitch.mjs';

function ramp(a,b,x) {
  const t=Math.max(0,Math.min(1,(x-a)/(b-a)));
  return t*t*(3-2*t);
}
const bell=x=>Math.exp(-.5*x*x);

export function finishHemJoin(input) {
  const end=20+input.readUInt32LE(12),doc=JSON.parse(input.subarray(20,end)),bin=input.subarray(end+8);
  const cloth=doc.meshes[0].primitives.find(p=>doc.materials[p.material].normalTexture);
  function array(id,Type) {
    const a=doc.accessors[id],v=doc.bufferViews[a.bufferView];
    return new Type(bin.buffer,bin.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*(a.type==='VEC3'?3:1));
  }
  const p=array(cloth.attributes.POSITION,Float32Array),n=array(cloth.attributes.NORMAL,Float32Array);
  const indices=array(cloth.indices,Uint32Array),faces=[];
  for(let i=0;i<indices.length;i+=3) {
    const tri=indices.subarray(i,i+3);
    if(tri.some(id=>Math.abs(p[3*id])<.315 && p[3*id+1]>-.58 && p[3*id+1]<-.33 && p[3*id+2]>-.08)) faces.push(...tri);
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new BufferAttribute(p,3));
  geometry.setIndex(faces);
  const mesh=new Mesh(geometry,new MeshBasicMaterial({side:DoubleSide}));
  const ray=new Raycaster(),origin=new Vector3(),direction=new Vector3();
  const da=.043,dy=.008,na=83,ny=29,y0=-.560;
  const radii=new Float64Array(na*ny);
  for(let j=0;j<ny;j++) for(let i=0;i<na;i++) {
    const a=(i-(na-1)/2)*da;
    direction.set(-Math.sin(a),0,-Math.cos(a));
    origin.set(-.01,y0+j*dy,-.025).addScaledVector(direction,-.52);
    ray.set(origin,direction);
    const hit=ray.intersectObject(mesh,false).find(h=>Math.abs(h.point.x)<.312);
    if(hit) radii[j*na+i]=.52-hit.distance;
  }
  function radius(a,y) {
    const u=a/da+(na-1)/2,v=(y-y0)/dy;
    let total=0,weights=0;
    for(let j=Math.max(0,Math.floor(v)-4);j<=Math.min(ny-1,Math.ceil(v)+4);j++)
      for(let i=Math.max(0,Math.floor(u)-5);i<=Math.min(na-1,Math.ceil(u)+5);i++) {
        const r=radii[j*na+i]; if(!r)continue;
        const w=bell((i-u)/1.75)*bell((j-v)/1.8);
        total+=w*r;weights+=w;
      }
    if(!weights) throw new Error('Missing front waistband section');
    const seam=-.423-.006*Math.sin(a)**2+.004*Math.sin(4*a);
    // Short gathers turn into the joining seam; each dies into the body
    // before reaching the embroidery. Vary their width around the front.
    const h=y-seam;
    const gathers=.0038*bell((a-.33-1.7*h)/.075)-.0024*bell((a-.49+h)/.047)
      +.0032*bell((a-.81+.8*h)/.092)-.0020*bell((a-1.17-1.2*h)/.062);
    return total/weights+.0037*bell((h-.009)/.009)-.0024*bell((h+.003)/.006)
      +gathers*bell((h-.014)/.012);
  }
  const pos=new Float32Array(p),norm=new Float32Array(n);
  for(const id of new Set(indices)) {
    const k=id*3,x=p[k],y=p[k+1],z=p[k+2],a=Math.atan2(x+.01,z+.025);
    const t=ramp(.024,.042,Math.abs(x-.016))*ramp(-.555,-.508,y)*(1-ramp(-.401,-.367,y))*
      (1-ramp(1.48,1.70,Math.abs(a)))*(1-ramp(.300,.314,Math.abs(x)));
    if(!t)continue;
    const r=Math.hypot(x+.01,z+.025),target=radius(a,y);
    if(Math.abs(target-r)>.045)continue;
    const change=.90*t*(target-r),s=Math.sin(a),c=Math.cos(a);
    pos[k]+=s*change;pos[k+2]+=c*change;
    const slopeA=(radius(a+.002,y)-radius(a-.002,y))/.004;
    const slopeY=(radius(a,y+.00025)-radius(a,y-.00025))/.0005;
    const normal=new Vector3(s-c*slopeA/target,-slopeY,c+s*slopeA/target).normalize();
    normal.lerp(new Vector3().fromArray(n,k),1-.995*t).normalize().toArray(norm,k);
  }
  // A few folded-back scan slivers can reverse at a seam. Back off only
  // those corners, moving their coincident UV copies by the same amount.
  const key=id=>p.subarray(3*id,3*id+3).join(',');
  const face=(points,a,b,c)=>new Vector3().fromArray(points,b*3).sub(new Vector3().fromArray(points,a*3))
    .cross(new Vector3().fromArray(points,c*3).sub(new Vector3().fromArray(points,a*3)));
  for(let pass=0;pass<40;pass++) {
    const unsafe=new Set();
    for(let i=0;i<faces.length;i+=3) {
      const [a,b,c]=faces.slice(i,i+3),ref=face(p,a,b,c);
      if(ref.lengthSq() && face(pos,a,b,c).dot(ref)<=0) for(const id of [a,b,c]) unsafe.add(key(id));
    }
    if(!unsafe.size)break;
    if(pass===39)throw new Error('Unable to preserve waistband winding');
    for(const id of new Set(faces)) if(unsafe.has(key(id))) {
      pos[3*id]=(p[3*id]+pos[3*id])/2;
      pos[3*id+2]=(p[3*id+2]+pos[3*id+2])/2;
    }
  }
  geometry.dispose();mesh.material.dispose();
  return repack(input,doc,bin,new Map([[doc.accessors[cloth.attributes.POSITION].bufferView,Buffer.from(pos.buffer)],
    [doc.accessors[cloth.attributes.NORMAL].bufferView,Buffer.from(norm.buffer)]]));
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const dir=new URL('../public/concept/',import.meta.url);
  fs.writeFileSync(new URL('hoodie-sculpture-hem.glb',dir),finishHemJoin(fs.readFileSync(new URL('hoodie-sculpture-bound.glb',dir))));
}
