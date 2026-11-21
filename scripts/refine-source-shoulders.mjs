// Shape the raglan return between the badge panel and upper sleeve. Work in
// an oblique section of the actual jacket so the front of each rolled fold
// stays distinct from the cloth on the other side of the arm.
import {BufferAttribute,BufferGeometry,DoubleSide,MathUtils,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {refineCloth} from './refine-local-cloth.mjs';

const s=.5,c=Math.sqrt(1-s*s);
const across=p=>c*p.x-s*p.z;
const outward=p=>s*p.x+c*p.z;
const smooth=(lo,hi,x)=>MathUtils.smoothstep(x,lo,hi);

function crease(y){
  const t=y-.276;
  return .261-.24*t-4.8*Math.max(t,0)**2-.8*Math.min(t,0)**2;
}

function envelope(u,y){
  const d=u-crease(y);
  return smooth(.140,.215,y)*(1-smooth(.367,.407,y))
    *smooth(-.088,-.048,d)*(1-smooth(.039,.073,d));
}

// Smooth high-frequency scan angles on the outer surface before fitting the
// new roll. Preserve the measured volume and separate it from the rear shell.
function shoulderSection(source){
  const end=20+source.readUInt32LE(12),doc=JSON.parse(source.subarray(20,end)),bin=source.subarray(end+8);
  const cloth=doc.meshes[0].primitives[0];
  function attribute(index,Type,width){
    const a=doc.accessors[index],view=doc.bufferViews[a.bufferView];
    return new Type(bin.buffer,bin.byteOffset+(view.byteOffset||0)+(a.byteOffset||0),a.count*width);
  }
  const p=attribute(cloth.attributes.POSITION,Float32Array,3),indices=attribute(cloth.indices,Uint32Array,1),faces=[];
  for(let i=0;i<indices.length;i+=3){
    const tri=indices.subarray(i,i+3);
    if(tri.some(id=>p[3*id]>.070 && p[3*id]<.49 && p[3*id+1]>.075 && p[3*id+1]<.462))faces.push(...tri);
  }
  const geo=new BufferGeometry();
  geo.setAttribute('position',new BufferAttribute(p,3));geo.setIndex(faces);
  const mesh=new Mesh(geo,new MeshBasicMaterial({side:DoubleSide})),ray=new Raycaster();
  const step=.0075,u0=.00,y0=.0775,cols=58,rows=52;
  const depths=new Float64Array(cols*rows).fill(NaN);
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const u=u0+i*step,y=y0+j*step;
    ray.set(new Vector3(c*u+s*.6,y,-s*u+c*.6),new Vector3(-s,0,-c));
    const hit=ray.intersectObject(mesh)[0];
    if(hit)depths[j*cols+i]=outward(hit.point);
  }
  geo.dispose();mesh.material.dispose();

  return function surface(u,y){
    const col=(u-u0)/step,row=(y-y0)/step;
    let sum=0,weight=0;
    for(let j=Math.max(0,Math.ceil(row-7));j<=Math.min(rows-1,Math.floor(row+7));j++){
      for(let i=Math.max(0,Math.ceil(col-7));i<=Math.min(cols-1,Math.floor(col+7));i++){
        const depth=depths[j*cols+i];
        if(!Number.isFinite(depth))continue;
        const x=col-i,v=row-j;
        const w=Math.exp(-.5*((x/2.3)**2+(v/2.8)**2))*(1-smooth(5,7,Math.abs(x)))*(1-smooth(5,7,Math.abs(v)));
        weight+=w;sum+=w*depth;
      }
    }
    if(!weight)return NaN;
    // A broad, supported ridge near the shoulder narrows and turns toward the
    // armpit. Its steep return blends into the short fold beside the seam.
    const t=smooth(.190,.340,y);
    const width=.011+.008*t,d=(u-crease(y))/width;
    const crest=Math.exp(-.5*d*d),returnFold=Math.exp(-.5*((d-1.48)/.74)**2);
    return sum/weight+(.008+.004*t)*(crest-.64*returnFold);
  };
}

export function refineSourceShoulders(buffer){
  const surface=shoulderSection(buffer);
  return refineCloth(buffer,{
    splitEdge(p,a,b){
      return outward(p)>.09 && envelope(across(p),p.y)>.05 && a.distanceToSquared(b)>.008**2;
    },
    shape(p,pos,normal){
      const u=across(p),y=p.y,zone=envelope(u,y);
      if(!zone || outward(p)<.07)return;
      const target=surface(u,y);
      if(!Number.isFinite(target))return;
      const delta=target-outward(p);
      const mix=zone*(1-smooth(.036,.071,Math.abs(delta)))*.54;
      if(!mix)return;
      pos.x+=s*mix*delta;pos.z+=c*mix*delta;
      const du=(surface(u+.0005,y)-surface(u-.0005,y))/.001;
      const dy=(surface(u,y+.0005)-surface(u,y-.0005))/.001;
      const n=new Vector3(s-c*du,-dy,c+s*du).normalize();
      normal.lerp(n,mix).normalize();
    }
  });
}
