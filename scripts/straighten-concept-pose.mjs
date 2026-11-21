// Undo most of the baked 3° torso roll (Blender Y = glTF -Z), leaving yaw intact.
// Waist blends into the fixed pelvis; upper chest, neck and head move as one.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const dir=process.env.IKIKAE_CLOTH_BUILD_DIR
    ? pathToFileURL(process.env.IKIKAE_CLOTH_BUILD_DIR+'/') : new URL('../public/concept/',import.meta.url);
const file=fs.readFileSync(new URL('hoodie-sculpture-tailored.glb',dir));
const length=file.readUInt32LE(12), doc=JSON.parse(file.subarray(20,20+length));
const bin=file.subarray(28+length);
const {POSITION,NORMAL}=doc.meshes[0].primitives[0].attributes;
function triples(id){
  const attr=doc.accessors[id],view=doc.bufferViews[attr.bufferView];
  return new Float32Array(bin.buffer,bin.byteOffset+(view.byteOffset||0)+(attr.byteOffset||0),attr.count*3);
}
const pos=triples(POSITION),norm=triples(NORMAL),attr=doc.accessors[POSITION];
attr.min=[Infinity,Infinity,Infinity];attr.max=[-Infinity,-Infinity,-Infinity];
const angle=-2.7*Math.PI/180;
for(let i=0;i<pos.length;i+=3){
  const x=pos[i], y=pos[i+1]+.48;
  const t=Math.max(0,Math.min(1,(y+.27)/.40)), a=angle*t*t*(3-2*t);
  const c=Math.cos(a),s=Math.sin(a);
  pos[i]=c*x-s*y;pos[i+1]=s*x+c*y-.48;
  // Inverse-transpose of the weighted rotation, including the waist gradient.
  const da=angle*6*t*(1-t)/.40, nx=norm[i],ny=(norm[i+1]+y*da*nx)/(1+x*da),nz=norm[i+2];
  const n=Math.hypot(nx,ny,nz)||1;
  norm[i]=(c*nx-s*ny)/n;norm[i+1]=(s*nx+c*ny)/n;norm[i+2]=nz/n;
  for(let k=0;k<3;k++){attr.min[k]=Math.min(attr.min[k],pos[i+k]);attr.max[k]=Math.max(attr.max[k],pos[i+k]);}
}
const raw=Buffer.from(JSON.stringify(doc)),json=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(json);
const header=Buffer.from(file.subarray(0,20));header.writeUInt32LE(json.length,12);header.writeUInt32LE(28+json.length+bin.length,8);
fs.writeFileSync(new URL('hoodie-sculpture-upright.glb',dir),Buffer.concat([header,json,file.subarray(20+length,28+length),bin]));
