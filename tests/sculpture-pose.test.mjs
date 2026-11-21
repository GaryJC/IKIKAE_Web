import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
function glb(file){const b=fs.readFileSync(new URL(file,import.meta.url)),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n));return {j,read(id){const a=j.accessors[id],v=j.bufferViews[a.bufferView],offset=28+n+(v.byteOffset||0)+(a.byteOffset||0);return Array.from({length:a.count},(_,i)=>Array.from({length:a.type==='SCALAR'?1:3},(_,k)=>b[a.componentType===5126?'readFloatLE':'readUInt32LE'](offset+i*(v.byteStride||(a.type==='SCALAR'?4:12))+k*4)));}};}

test('the original slider cap stays outside the refined graphite surface',()=>{
  const previous=glb('../public/concept/hoodie-sculpture-collar.glb');
  const current=glb('../public/concept/hoodie-sculpture-patina.glb');
  const oldStone=previous.j.meshes[0].primitives[1];
  const primitives=current.j.meshes[0].primitives;
  const stone=primitives.find(p=>current.j.materials[p.material].name==='Musée graphite sculpture');
  const hardware=primitives.find(p=>current.j.materials[p.material].name==='Original dark zipper hardware');
  const oldPos=previous.read(oldStone.attributes.POSITION);
  const inSlider=([x,y,z])=>x>0 && x<.03 && y>.35 && y<.40 && z>.11 && z<.14;
  const oldIndices=previous.read(oldStone.indices).flat();
  const oldCap=oldIndices.filter(id=>inSlider(oldPos[id]));
  assert.ok(oldCap.length>=69*3);
  const kept=current.read(hardware.indices).flat();
  assert.deepEqual(kept.filter(id=>inSlider(oldPos[id])),oldCap);
  assert.equal(current.read(stone.attributes.POSITION).some(inSlider),false);
  const pbr=current.j.materials[stone.material].pbrMetallicRoughness;
  assert.deepEqual(pbr.baseColorFactor,[3/255/12.92,3/255/12.92,3/255/12.92,1]);
  assert.equal(pbr.roughnessFactor,.4);
  assert.equal(pbr.metallicFactor,.5);
});
test('baked sculpture has no runtime rig and fits model budget',()=>{const {j}=glb('../public/concept/hoodie-sculpture-posed.glb');assert.equal(j.skins?.length||0,0);assert.equal(j.animations?.length||0,0);const tris=j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0);assert.ok(tris<=54000);});
test('posing rigidly preserves face and hair distances',()=>{const g=glb('../artifacts/hoodie-study/hoodie-posed-source.glb'),a=g.j.meshes[0].primitives[0].attributes,p=g.read(a.POSITION),r=g.read(a._REST_POSITION);const ids=r.map((v,i)=>v[1]>.60?i:-1).filter(i=>i>=0);assert.ok(ids.length>1000);let maximum=0;const distance=(x,y)=>Math.hypot(...x.map((v,i)=>v-y[i]));for(let i=0;i<ids.length;i+=79){const x=ids[i],y=ids[(i+997)%ids.length];maximum=Math.max(maximum,Math.abs(distance(p[x],p[y])-distance(r[x],r[y])));}assert.ok(maximum<1e-5,`head distortion ${maximum}`);});

test('cotton refinement retains stone positions, normals and scene geometry budget',()=>{
  const old=glb('../public/concept/hoodie-sculpture-posed.glb'),current=glb('../public/concept/hoodie-sculpture-cotton.glb');
  const primitives=current.j.meshes[0].primitives;
  assert.equal(primitives.reduce((n,p)=>n+current.j.accessors[p.indices].count/3,0),52000);
  const stone=primitives.find(p=>current.j.materials[p.material].name.includes('Clean ivory'));
  const ids=current.read(stone.indices).flat();
  for(const attribute of ['POSITION','NORMAL']){
    const a=old.read(stone.attributes[attribute]),b=current.read(stone.attributes[attribute]);
    for(const id of ids)assert.deepEqual(a[id],b[id]);
  }
  for(const p of primitives)assert.deepEqual(old.read(p.indices),current.read(p.indices));
  const id=primitives[0].attributes.POSITION,a=old.read(id),b=current.read(id);
  let changed=0;
  for(let i=0;i<a.length;i++){const d=Math.hypot(...a[i].map((v,k)=>v-b[i][k]));assert.ok(d<.002501);if(d>1e-7)changed++;}
  assert.ok(changed>1000);
});

for (const [sourceName, revisedName, maxStep] of [['cotton','drape',.012], ['drape','tailored',.023], ['upright','finished',.019]]) {
test(revisedName + ': preserves topology, stone and surrounding atlas; folds do not flip triangles',async()=>{
  const before='../public/concept/hoodie-sculpture-'+sourceName+'.glb', after='../public/concept/hoodie-sculpture-'+revisedName+'.glb';
  const source=glb(before), draped=glb(after);
  const [cloth,stone]=draped.j.meshes[0].primitives;
  const pos=cloth.attributes.POSITION, normal=cloth.attributes.NORMAL;
  const original=source.read(pos), revised=draped.read(pos);
  const oldNormals=source.read(normal), newNormals=draped.read(normal);
  for(const [index] of draped.read(stone.indices)){
    assert.deepEqual(revised[index],original[index]);assert.deepEqual(newNormals[index],oldNormals[index]);
  }
  const buffers=[before,after].map(path=>fs.readFileSync(new URL(path,import.meta.url)));
  const bin=buffers.map(buffer=>buffer.subarray(28+buffer.readUInt32LE(12)));
  const writable=new Set([pos,normal].map(id=>draped.j.accessors[id].bufferView));
  for(const [id,view] of source.j.bufferViews.entries()){
    if(writable.has(id))continue;
    const revisedView=draped.j.bufferViews[id];
    const oldStart=view.byteOffset||0,newStart=revisedView.byteOffset||0;
    const oldBytes=bin[0].subarray(oldStart,oldStart+view.byteLength);
    const newBytes=bin[1].subarray(newStart,newStart+revisedView.byteLength);
    if(revisedName==='finished' && source.j.images.some(image=>image.bufferView===id)){
      const [oldMap,newMap]=await Promise.all([oldBytes,newBytes].map(bytes=>sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true})));
      const {width,height,channels}=oldMap.info;
      const scale=width/2048;
      for(let y=0;y<height;y++){
        const row=y*width*channels;
        const end=row+width*channels;
        if(y<96*scale-2 || y>=208*scale+2){
          assert.ok(oldMap.data.subarray(row,end).equals(newMap.data.subarray(row,end)));
        }else{
          // JPEG chroma interpolation can reach into the adjacent pixel.
          const left=row+(768*scale-2)*channels,right=row+(816*scale+2)*channels;
          assert.ok(oldMap.data.subarray(row,left).equals(newMap.data.subarray(row,left)));
          assert.ok(oldMap.data.subarray(right,end).equals(newMap.data.subarray(right,end)));
          if(y>=100*scale && y<204*scale){
            const start=row+772*scale*channels,length=40*scale*channels;
            const donor=start+48*scale*channels;
            assert.ok(newMap.data.subarray(start,start+length).equals(oldMap.data.subarray(donor,donor+length)));
          }
        }
      }
    }else{
      assert.deepEqual(oldBytes,newBytes);
    }
  }
  let substantial=0;
  for(let index=0;index<original.length;index++){
    if(revisedName==='finished'){
      const [x,y,z]=original[index];
      const inBadge=Math.abs(x-.133)<.10 && Math.abs(y-.258)<.054;
      const inStitch=Math.abs(x-.172)<.138 && Math.abs(y+.344)<.04;
      if(z>.05 && (inBadge||inStitch)){
        assert.deepEqual(revised[index],original[index]);assert.deepEqual(newNormals[index],oldNormals[index]);
      }
    }
    const distance=Math.hypot(...original[index].map((v,k)=>v-revised[index][k]));
    assert.ok(distance<maxStep+1e-6);if(distance>.001)substantial++;
  }
  assert.ok(substantial>1000, 'cloth has measurable three-dimensional drape');
  const indices=draped.read(cloth.indices).flat();
  for(let i=0;i<indices.length;i+=3){
    const normals=[original,revised].map(vertices=>{
      const [a,b,c]=indices.slice(i,i+3).map(id=>vertices[id]);
      const u=b.map((v,k)=>v-a[k]),v=c.map((n,k)=>n-a[k]);
      return [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    });
    const [a,b]=normals;
    assert.ok(a.reduce((sum,v,k)=>sum+v*b[k],0)>=0, 'no folded-over triangles');
  }
});
}

test('upright correction centres the upper body while retaining rigid shoulder yaw and a planted pelvis',()=>{
  const source=glb('../public/concept/hoodie-sculpture-tailored.glb'),fixed=glb('../public/concept/hoodie-sculpture-upright.glb');
  const attr=source.j.meshes[0].primitives[0].attributes.POSITION;
  const before=source.read(attr),after=fixed.read(attr),head=[],chest=[];
  before.forEach(([x,y,z],i)=>{
    if(y<-.76)assert.deepEqual(after[i],before[i]);
    if(y>-.3)assert.equal(after[i][2],z,'correction leaves forward depth unchanged');
    if(y>.62)head.push(i);
    if(y>.18 && y<.38)chest.push(i);
  });
  const meanX=(arr,ids)=>ids.reduce((s,i)=>s+arr[i][0],0)/ids.length;
  assert.ok(Math.abs(meanX(after,head))<Math.abs(meanX(before,head))*.5);
  const dist=(arr,i,j)=>Math.hypot(...arr[i].map((v,k)=>v-arr[j][k]));
  for(let i=0;i<head.length;i+=103){
    const a=head[i],b=chest[i%chest.length];assert.ok(Math.abs(dist(after,a,b)-dist(before,a,b))<1e-6);
  }
});
