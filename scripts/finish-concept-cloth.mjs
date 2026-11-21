// Tailoring pass after posture correction. Add secondary drape within the
// existing panels; never shift collars, cuffs, zipper or projected lettering.
import fs from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {bakeClothVisibility} from './bake-cloth-visibility.mjs';

const smooth=(low,high,x)=>{
  const t=Math.max(0,Math.min(1,(x-low)/(high-low)));
  return t*t*(3-2*t);
};
const bell=(value,width)=>Math.exp(-.5*(value/width)**2);
const tuck=(d,w)=>bell(d,w)-.6*bell(d+1.55*w,.72*w);
function protectedPatch(x,y,cx,cy,halfWidth,halfHeight){
  return smooth(1,1.28,Math.max(Math.abs(x-cx)/halfWidth,Math.abs(y-cy)/halfHeight));
}
function relief(x,y,z){
  const side=Math.abs(x-.012),right=x>0;
  const front=smooth(-.075,.105,z);
  const preserve=protectedPatch(x,y,.133,.258,.112,.064)*protectedPatch(x,y,.172,-.344,.151,.064);
  const panel=smooth(.048,.098,side)*(1-smooth(.25,.335,side))*front;
  // A longer fold hangs diagonally from the armhole; it broadens and
  // flattens as it approaches the chest. The second branch stops sooner.
  const reach=Math.max(0,Math.min(1,(side-.055)/.24));
  const armpitY=.023+(right?.176:.14)*reach-.039*Math.sin(Math.PI*reach);
  const shoulder=(.014*tuck(y-armpitY,.024+.025*(1-reach))
      +.008*reach*tuck(y-armpitY-.083+.021*reach,.022+.012*(1-reach)));
  // Pocket-mouth compression dies into the centre panel rather than running
  // in parallel stripes all the way to the zip or across the inscription.
  const waistPath=(right?-.408:-.376)+.114*reach-.068*Math.sin(Math.PI*reach);
  const waist=.013*tuck(y-waistPath,.020+.026*(1-reach));
  // Two different cuff heights; an elbow buckle and a shorter return tuck.
  const sleeve=smooth(.27,.33,side)*(1-smooth(.414,.473,side))*smooth(-.093,-.008,z);
  const elbowY=(right?-.207:-.157)+.67*(side-.35);
  const elbow=.014*tuck(y-elbowY,.032)+.007*tuck(y-elbowY+.088-.27*(side-.35),.026);
  return preserve*(panel*(shoulder+waist)+sleeve*elbow);
}

export function finishCloth(source){
  const result=Buffer.from(source),jsonLength=result.readUInt32LE(12);
  const doc=JSON.parse(result.subarray(20,20+jsonLength)),bin=result.subarray(28+jsonLength);
  const [cloth,stone]=doc.meshes[0].primitives;
  function data(id,Type,width){
    const attr=doc.accessors[id],view=doc.bufferViews[attr.bufferView];
    return new Type(bin.buffer,bin.byteOffset+(view.byteOffset||0)+(attr.byteOffset||0),attr.count*width);
  }
  const pos=data(cloth.attributes.POSITION,Float32Array,3),normal=data(cloth.attributes.NORMAL,Float32Array,3);
  const locked=new Set(data(stone.indices,Uint32Array,1)),clothIds=data(cloth.indices,Uint32Array,1);
  const original=pos.slice(), originalNormals=normal.slice();
  const shared=new Map();
  for(const index of new Set(clothIds)){
    const key=original.subarray(3*index,3*index+3).join(',');
    if(!shared.has(key))shared.set(key,[]);
    shared.get(key).push(index);
    if(locked.has(index))continue;
    const j=3*index,x=pos[j],y=pos[j+1],z=pos[j+2],offset=relief(x,y,z);
    if(Math.abs(offset)<1e-8)continue;
    pos[j+2]=z+offset;
    // Inverse transpose of (x,y,z+relief). Preserves source shading seams
    // and smooth curvature on the broad triangles; no re-welding of normals.
    const eps=.0001,half=.5/eps;
    const dx=(relief(x+eps,y,z)-relief(x-eps,y,z))*half;
    const dy=(relief(x,y+eps,z)-relief(x,y-eps,z))*half;
    const dz=(relief(x,y,z+eps)-relief(x,y,z-eps))*half;
    const nz=normal[j+2]/(1+dz),nx=normal[j]-dx*nz,ny=normal[j+1]-dy*nz;
    const magnitude=Math.hypot(nx,ny,nz);
    normal[j]=nx/magnitude;normal[j+1]=ny/magnitude;normal[j+2]=nz/magnitude;
  }
  // Avoid bending extremely thin source slivers inside out. Correct all UV
  // copies together so the fix cannot produce a tiny crack at an atlas split.
  const face=(vertices,a,b,c)=>{
    const ux=vertices[3*b]-vertices[3*a], uy=vertices[3*b+1]-vertices[3*a+1], uz=vertices[3*b+2]-vertices[3*a+2];
    const vx=vertices[3*c]-vertices[3*a], vy=vertices[3*c+1]-vertices[3*a+1], vz=vertices[3*c+2]-vertices[3*a+2];
    return [uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
  };
  for(let round=0;round<clothIds.length;round++){
    const restore=new Set();
    for(let i=0;i<clothIds.length;i+=3){
      const a=clothIds[i],b=clothIds[i+1],c=clothIds[i+2];
      const old=face(original,a,b,c),next=face(pos,a,b,c);
      if(old[0]*next[0]+old[1]*next[1]+old[2]*next[2]<0){
        for(const id of [a,b,c])restore.add(original.subarray(3*id,3*id+3).join(','));
      }
    }
    if(!restore.size)break;
    for(const key of restore)for(const id of shared.get(key)){
      pos[3*id+2]=original[3*id+2];normal.set(originalNormals.subarray(3*id,3*id+3),3*id);
    }
  }
  const bounds=doc.accessors[cloth.attributes.POSITION];
  for(let k=0;k<3;k++){
    let min=Infinity,max=-Infinity;
    for(let j=k;j<pos.length;j+=3){min=Math.min(min,pos[j]);max=Math.max(max,pos[j]);}
    bounds.min[k]=min;bounds.max[k]=max;
  }
  const json=Buffer.from(JSON.stringify(doc)),chunk=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(chunk);
  const header=Buffer.from(result.subarray(0,20));header.writeUInt32LE(chunk.length,12);header.writeUInt32LE(28+chunk.length+bin.length,8);
  return Buffer.concat([header,chunk,result.subarray(20+jsonLength,28+jsonLength),bin]);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const dir=process.env.IKIKAE_CLOTH_BUILD_DIR
    ? pathToFileURL(process.env.IKIKAE_CLOTH_BUILD_DIR+'/') : new URL('../public/concept/',import.meta.url);
  const source=fs.readFileSync(new URL('hoodie-sculpture-upright.glb',dir));
  const {cleanChestAtlas}=await import('./clean-concept-chest.mjs');
  const finished=await cleanChestAtlas(bakeClothVisibility(finishCloth(source)));
  fs.writeFileSync(new URL('hoodie-sculpture-finished.glb',dir),finished);
  const {detailHoodie}=await import('./detail-concept-hoodie.mjs');
  const posed=fs.readFileSync(new URL('hoodie-sculpture-posed.glb',dir));
  const sculpt=fs.readFileSync(new URL('../artifacts/hoodie-study/hoodie-posed-source.glb',import.meta.url));
  const tailored=detailHoodie(finished,posed,sculpt);
  fs.writeFileSync(new URL('hoodie-sculpture-tailoring.glb',dir),tailored);
  const {bakeTopstitch}=await import('./bake-concept-topstitch.mjs');
  const sewn=await bakeTopstitch(tailored);
  fs.writeFileSync(new URL('hoodie-sculpture-sewn.glb',dir),sewn);
  const {finishPocketGarment}=await import('./finish-concept-sleeves.mjs');
  const pocket=await finishPocketGarment(sewn);
  fs.writeFileSync(new URL('hoodie-sculpture-pocket.glb',dir),pocket);
  const {finishCuffs}=await import('./finish-cuff-binding.mjs');
  const bound=await finishCuffs(pocket);
  fs.writeFileSync(new URL('hoodie-sculpture-bound.glb',dir),bound);
  const {finishHemJoin}=await import('./finish-hem-join.mjs');
  const hem=finishHemJoin(bound);
  fs.writeFileSync(new URL('hoodie-sculpture-hem.glb',dir),hem);
  const {refineHemCrest}=await import('./refine-hem-crest.mjs');
  fs.writeFileSync(new URL('hoodie-sculpture-crest.glb',dir),refineHemCrest(hem));
}
