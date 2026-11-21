// Bounded offline garment smoothing; retain the original GLB and all stone vertices.
import fs from 'node:fs';
// Default reproduces the earlier cotton asset; --drape starts at that saved result.
const tailor=process.argv.includes('--tailor');
const drape=tailor || process.argv.includes('--drape');
const directory=process.env.IKIKAE_CLOTH_BUILD_DIR || 'public/concept';
const source = directory+'/hoodie-sculpture-'+(tailor?'drape':drape?'cotton':'posed')+'.glb';
const destination = directory+'/hoodie-sculpture-'+(tailor?'tailored':drape?'drape':'cotton')+'.glb';
function smooth(low,high,value) {
  const t=Math.min(1,Math.max(0,(value-low)/(high-low)));
  return t*t*(3-2*t);
}
// Broad, tapered folds from sleeve/side tension above the ribbed hem.
// Offset continuously across welded positions. Leave the zip, hem, cuff,
// neckline, back and embroidery landing area in their original positions.
function frontFolds([x,y,z]) {
  const side=Math.abs(x+.017);
  const panel=smooth(.045,.115,side)*(1-smooth(.22,.32,side))
    *smooth(.055,.155,z)*smooth(-.545,-.485,y)*(1-smooth(-.15,.02,y));
  const height=y+(x>0 ? .50 : .36)*(side-.16);
  const gaussian=(centre,width)=>Math.exp(-((height-centre)**2)/(2*width**2));
  const fold= .011*gaussian(-.235,.043)-.004*gaussian(-.298,.030)
    +.009*gaussian(-.453,.037)-.0025*gaussian(-.493,.023);
  return panel*fold;
}
// Shape only the front shell. The near-flat landing for the inscription and
// the zip stay pinned. Let folds hang deeper in the unsupported inner panel
// and gather to narrower crests at their attachment on the side or arm.
function tailoredFold([x,y,z]) {
  const right=x>-.017, side=Math.abs(x+.017);
  const front=smooth(.035,.155,z);
  const torso=front*smooth(.042,.105,side)*(1-smooth(.211,.304,side));
  const protect=right?smooth(.74,1.32,Math.hypot((x-.161)/.141,(y+.345)/.054)):1;
  const lane=Math.min(1,Math.max(0,(side-.028)/.258));
  const hanging=4*lane*(1-lane);
  const ridge=(d,w)=>Math.exp(-.5*(d/w)**2);
  const saddle=(d,w)=>ridge(d,w)-.57*ridge(d+w*1.35,w*.66);
  const sweep=right?.120:.071;
  const pocketY=(right?-.378:-.354)+sweep*lane-.084*hanging;
  const pocket=torso*protect*(.022*saddle(y-pocketY,.015+.034*(1-lane))+
    .012*saddle(y-(pocketY+.114+.032*lane),.017+.041*(1-lane))*smooth(.08,.5,lane));
  // One softer diagonal pulls away from the underarm toward the sternum.
  const armY=.193-.099*(1-lane)-.136*hanging+(right?.014:-.02);
  const shoulder=torso*smooth(.13,.42,lane)*.013*saddle(y-armY,.022+.027*(1-lane));
  // A bent sleeve compresses on the inside of the elbow. Keep the outer
  // silhouette untouched and let the two sides settle at different heights.
  const sleeve=front*smooth(.253,.325,side)*(1-smooth(.39,.49,side));
  const elbowY=(right?-.189:-.234)+.79*(side-.334);
  const elbow=sleeve*.015*saddle(y-elbowY,.039);
  return {depth:pocket+shoulder+elbow,
    relax:Math.min(1,torso*protect*(ridge(y-pocketY,.135)+.8*ridge(y-armY,.115))+sleeve*ridge(y-elbowY,.142))};
}
const bytes = fs.readFileSync(source), jsonLength = bytes.readUInt32LE(12);
const doc = JSON.parse(bytes.subarray(20,20+jsonLength));
const bin = bytes.subarray(28+jsonLength);
function read(id) {
  const a=doc.accessors[id],v=doc.bufferViews[a.bufferView],width=a.type==='VEC3'?3:1;
  const size=a.componentType===5123?2:4,stride=v.byteStride||width*size;
  const offset=(v.byteOffset||0)+(a.byteOffset||0);
  return {a,offset,stride,values:Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,k)=>a.componentType===5126?bin.readFloatLE(offset+i*stride+k*size):size===2?bin.readUInt16LE(offset+i*stride):bin.readUInt32LE(offset+i*stride)))};
}
let moved=0,maxDisplacement=0;
for(const mesh of doc.meshes) {
  const cloth=mesh.primitives.find(p=>!doc.materials[p.material].name.includes('Clean ivory'));
  const stone=mesh.primitives.find(p=>doc.materials[p.material].name.includes('Clean ivory'));
  if(!cloth || !stone) throw new Error('Expected separate cloth and stone primitives');
  const positions=read(cloth.attributes.POSITION),normals=read(cloth.attributes.NORMAL);
  const original=positions.values,groups=[],ids=[],keys=new Map();
  for(const p of original) {
    const key=p.map(v=>Math.round(v*1e6)).join(',');
    if(!keys.has(key)){keys.set(key,groups.length);groups.push({p:[...p],neighbors:new Set(),locked:false});}
    ids.push(keys.get(key));
  }
  for(const [i] of read(stone.indices).values) groups[ids[i]].locked=true;
  const triangles=read(cloth.indices).values.flat(),edges=new Map();
  for(let i=0;i<triangles.length;i+=3) {
    const t=triangles.slice(i,i+3).map(v=>ids[v]);
    for(let k=0;k<3;k++) {
      const a=t[k],b=t[(k+1)%3]; if(a===b)continue;
      groups[a].neighbors.add(b);groups[b].neighbors.add(a);
      const key=[Math.min(a,b),Math.max(a,b)].join(',');edges.set(key,(edges.get(key)||0)+1);
    }
  }
  for(const [edge,count] of edges)if(count===1)for(const i of edge.split(',').map(Number))groups[i].locked=true;
  const rest=groups.map(g=>[...g.p]);
  const weights=tailor ? [.36,.32,.30,.26,.24,.18] : drape ? [.38,.27,.20,-.16,.22,.14] : [.35,-.36,.35,-.36,.35,-.36];
  for(const weight of weights) {
    const next=groups.map(g=>{
      if(g.locked||!g.neighbors.size)return g.p;
      const mean=[0,0,0];for(const i of g.neighbors)for(let k=0;k<3;k++)mean[k]+=groups[i].p[k]/g.neighbors.size;
      return g.p.map((v,k)=>v+weight*(mean[k]-v));
    });
    groups.forEach((g,i)=>{g.p=next[i];});
  }
  groups.forEach((g,i)=>{
    const [x,y,z]=rest[i];
    const sleeve=smooth(.23,.35,Math.abs(x))*smooth(-.57,-.45,y)*(1-smooth(.18,.33,y));
    const waist=smooth(.06,.13,Math.abs(x+.017))*smooth(.06,.16,z)*smooth(-.54,-.47,y)*(1-smooth(-.1,.02,y));
    const tailored=tailor?tailoredFold(rest[i]):null;
    const influence=tailored?tailored.relax:drape?Math.max(sleeve,waist):1;
    const d=g.p.map((v,k)=>(v-rest[i][k])*influence);if(drape && !g.locked)d[2]+=tailored?tailored.depth:frontFolds(rest[i]);
    const length=Math.hypot(...d),factor=Math.min(1,(tailor?.023:drape?.012:.0025)/(length||1));
    g.p=rest[i].map((v,k)=>v+d[k]*factor);maxDisplacement=Math.max(maxDisplacement,length*factor);
  });
  // Irregular generated topology includes skinny faces. Restore their entire
  // welded corner groups if smoothing would turn any face inside out.
  if(drape){
    const face=(a,b,c)=>{
      const u=b.map((v,k)=>v-a[k]),v=c.map((n,k)=>n-a[k]);
      return [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    };
    for(let round=0;round<=groups.length;round++){
      const restore=new Set();
      for(let i=0;i<triangles.length;i+=3){
        const vertices=triangles.slice(i,i+3),t=vertices.map(v=>ids[v]);
        const old=face(...vertices.map(v=>original[v]));
        const next=face(...t.map(v=>groups[v].p));
        if(old.reduce((sum,x,k)=>sum+x*next[k],0)<0)
          t.forEach(v=>{if(groups[v].p!==rest[v]) restore.add(v);});
      }
      if(!restore.size)break;
      for(const v of restore)groups[v].p=rest[v];
    }
  }
  const sums=groups.map(()=>[0,0,0]);
  for(let i=0;i<triangles.length;i+=3){
    const t=triangles.slice(i,i+3).map(v=>ids[v]),[a,b,c]=t.map(v=>groups[v].p);
    const u=b.map((v,k)=>v-a[k]),v=c.map((n,k)=>n-a[k]);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    for(const j of t)for(let k=0;k<3;k++)sums[j][k]+=n[k];
  }
  original.forEach((p,i)=>{
    const group=groups[ids[i]];if(group.locked||!group.neighbors.size)return;
    const n=sums[ids[i]],length=Math.hypot(...n);if(!length)return;
    moved++;
    for(let k=0;k<3;k++){
      bin.writeFloatLE(group.p[k],positions.offset+i*positions.stride+k*4);
      bin.writeFloatLE(n[k]/length,normals.offset+i*normals.stride+k*4);
    }
  });
}
// Recompute bounds: even small Taubin steps may expand a former extremum.
for(const mesh of doc.meshes)for(const primitive of mesh.primitives){
  const {a,values}=read(primitive.attributes.POSITION);
  a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];
  for(const p of values)for(let k=0;k<3;k++){a.min[k]=Math.min(a.min[k],p[k]);a.max[k]=Math.max(a.max[k],p[k]);}
}
const raw=Buffer.from(JSON.stringify(doc)),json=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(json);
const header=Buffer.from(bytes.subarray(0,20));header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);
const output=Buffer.concat([header,json,bytes.subarray(20+jsonLength,28+jsonLength),bin]);
fs.writeFileSync(destination,output);
console.log(JSON.stringify({destination,moved,maxDisplacement,bytes:output.length}));
