// Fit the dense mesh to the approved side seam. The original scan has several
// overlapping folds here, where the front lip turns away from the camera.
import {BufferAttribute,BufferGeometry,DoubleSide,MathUtils,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {repack} from './bake-concept-topstitch.mjs';

function meshData(buffer){
  const end=20+buffer.readUInt32LE(12),doc=JSON.parse(buffer.subarray(20,end)),bin=buffer.subarray(end+8);
  const cloth=doc.meshes[0].primitives[0];
  function read(id,Type,size){
    const a=doc.accessors[id],v=doc.bufferViews[a.bufferView];
    return new Type(bin.buffer,bin.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*size);
  }
  return {doc,bin,cloth,p:read(cloth.attributes.POSITION,Float32Array,3),
    n:read(cloth.attributes.NORMAL,Float32Array,3),ix:read(cloth.indices,Uint32Array,1)};
}

export function finishSourceWaist(source,approved){
  const previous=meshData(approved),model=meshData(source);
  const faces=[];
  for(let i=0;i<previous.ix.length;i+=3){
    const tri=previous.ix.subarray(i,i+3);
    if(tri.some(id=>{const j=id*3;return previous.p[j]>.22 && previous.p[j]<.326
      && previous.p[j+1]>-.52 && previous.p[j+1]<-.31;}))faces.push(...tri);
  }
  const geo=new BufferGeometry();
  geo.setAttribute('position',new BufferAttribute(previous.p,3));geo.setIndex(faces);
  const mesh=new Mesh(geo,new MeshBasicMaterial({side:DoubleSide}));
  const ray=new Raycaster(),samples=[];
  for(let y=-.499;y<-.323;y+=.006)for(let z=-.085;z<.175;z+=.007){
    ray.set(new Vector3(.329,y,z),new Vector3(-1,0,0));
    const hit=ray.intersectObject(mesh)[0];
    if(hit) samples.push(hit.point);
  }
  function side(y,z){
    let total=0,weight=0;
    for(const point of samples){
      const d=((point.y-y)/.010)**2+((point.z-z)/.013)**2;
      if(d>18)continue;
      const w=Math.exp(-.5*d);total+=w*point.x;weight+=w;
    }
    if(!weight)throw Error('Missing reference surface for the waist side seam');
    return total/weight;
  }
  const smooth=(lo,hi,x)=>MathUtils.smoothstep(x,lo,hi);
  const {p,n,ix,doc,cloth,bin}=model;
  const pos=new Float32Array(p),normal=new Float32Array(n);
  for(const id of new Set(ix)){
    const k=id*3,x=p[k],y=p[k+1],z=p[k+2];
    const w=smooth(.241,.281,x)*(1-smooth(.313,.329,x))*smooth(-.475,-.445,y)*
      (1-smooth(-.394,-.345,y))*smooth(-.07,-.036,z)*(1-smooth(.091,.151,z));
    if(!w)continue;
    const target=side(y,z);
    pos[k]+=w*.97*(target-x);
    const dy=(side(y+.0005,z)-side(y-.0005,z))/.001;
    const dz=(side(y,z+.0005)-side(y,z-.0005))/.001;
    const surface=new Vector3(1,-dy,-dz).normalize();
    surface.lerp(new Vector3().fromArray(n,k),1-w).normalize().toArray(normal,k);
  }
  geo.dispose();mesh.material.dispose();
  // Sleeve extents can change substantially when restoring the scan. Keep
  // the optical centre used by the four already composed camera stops.
  doc.scenes[doc.scene||0].extras.framingCenter=previous.doc.scenes[previous.doc.scene||0].extras.framingCenter;
  return repack(source,doc,bin,new Map([[doc.accessors[cloth.attributes.POSITION].bufferView,Buffer.from(pos.buffer)],
    [doc.accessors[cloth.attributes.NORMAL].bufferView,Buffer.from(normal.buffer)]]));
}
