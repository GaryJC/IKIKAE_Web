// Bake a low-relief lockstitch into the existing garment atlases. Sample each
// stitch in model space so its size and direction survive cuts in the UVs.
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Box3, CatmullRomCurve3, Triangle, Vector2, Vector3 } from 'three';
import sharp from 'sharp';

// Garment-space seam allowances on the finished pose, just inside the folded
// edges. The shoulder seam stops under the hood; the pocket ends before the
// embroidery. A single row on each lip keeps the stitching tonal at distance.
const seams = [
  [[.145,.421,.018],[.178,.401,.019],[.212,.382,.021],[.256,.355,.016],[.302,.323,.014],[.344,.292,.009]],
  [[-.149,.429,.051],[-.176,.419,.052],[-.205,.411,.047],[-.249,.389,.047],[-.293,.363,.052],[-.328,.337,.050]],
  [[-.035,.564,-.226],[-.083,.564,-.211],[-.125,.564,-.192],[-.158,.559,-.169],[-.188,.552,-.141],[-.207,.545,-.103],[-.216,.534,-.061],[-.209,.525,-.014],[-.184,.513,.014],[-.153,.500,.042],[-.112,.484,.068],[-.073,.470,.088],[-.044,.457,.103]],
  [[-.256,-.283,.156],[-.260,-.249,.129],[-.239,-.195,.156],[-.219,-.123,.176],[-.207,-.096,.188]],
  [[.238,-.107,.148],[.250,-.144,.148],[.259,-.191,.126],[.265,-.243,.111],[.274,-.281,.098]],
  [[.058,-.429,.262],[.098,-.427,.249],[.144,-.427,.237],[.184,-.423,.194],[.232,-.431,.146],[.272,-.435,.098]],
  [[-.036,-.431,.257],[-.074,-.427,.256],[-.108,-.412,.267],[-.153,-.421,.241],[-.205,-.417,.225]],
];

function readMesh(doc, bin, primitive) {
  function attribute(index, components) {
    const a = doc.accessors[index], view = doc.bufferViews[a.bufferView];
    const data = new DataView(bin.buffer, bin.byteOffset + (view.byteOffset || 0) + (a.byteOffset || 0));
    const bytes = a.componentType === 5123 ? 2 : 4;
    const stride = view.byteStride || bytes * components;
    return Array.from({ length:a.count }, (_, i) => {
      const at = i * stride;
      if (components === 1) return bytes === 2 ? data.getUint16(at, true) : data.getUint32(at, true);
      const x = data.getFloat32(at,true), y = data.getFloat32(at+4,true);
      return components === 2 ? new Vector2(x,y) : new Vector3(x,y,data.getFloat32(at+8,true));
    });
  }
  const positions = attribute(primitive.attributes.POSITION,3), uvs = attribute(primitive.attributes.TEXCOORD_0,2);
  const indices = attribute(primitive.indices,1), faces = [];
  for (let i=0; i<indices.length; i+=3) {
    const a=indices[i], b=indices[i+1], c=indices[i+2];
    const triangle = new Triangle(positions[a],positions[b],positions[c]);
    const edgeB = positions[b].clone().sub(positions[a]), edgeC = positions[c].clone().sub(positions[a]);
    const uvB = uvs[b].clone().sub(uvs[a]), uvC = uvs[c].clone().sub(uvs[a]);
    const det = uvB.cross(uvC);
    if (Math.abs(det)<1e-11 || triangle.getArea()<1e-11) continue;
    const normal = triangle.getNormal(new Vector3());
    const tangent = edgeB.clone().multiplyScalar(uvC.y/det).addScaledVector(edgeC,-uvB.y/det).normalize();
    const bitangent = new Vector3().crossVectors(normal,tangent).multiplyScalar(Math.sign(det));
    faces.push({ triangle, edgeB, edgeC, uvA:uvs[a], uvB, uvC, det, normal, tangent, bitangent,
      bounds:new Box3().setFromPoints([triangle.a,triangle.b,triangle.c]) });
  }
  return faces;
}

function closestPoint(faces, point) {
  const nearest = new Vector3(), sample = new Vector3();
  let best = .023, normal;
  for (const face of faces) {
    if (face.bounds.distanceToPoint(point)>best) continue;
    face.triangle.closestPointToPoint(point,sample);
    const distance = point.distanceTo(sample);
    if (distance<best) { best=distance; nearest.copy(sample); normal=face.normal; }
  }
  return normal ? { point:nearest, normal } : null;
}

function stitchHeight(s,t) {
  // A flattened thread crown dips through the cloth at each end. The small
  // annular depressions pick up light on the opposite side of the crown.
  const crown = Math.exp(-2.7*s*s*s*s - 2.2*t*t);
  const hole = Math.exp(-9*(Math.abs(s)-1.06)**2 - 1.15*t*t);
  return .00105*crown - .00041*hole;
}

function stamp(face, stitch, maps) {
  const {center,along,across,up,halfLength,radius,strength} = stitch;
  if (face.normal.dot(up)<.45 || face.bounds.distanceToPoint(center)>halfLength*1.9) return;
  const {uvA,uvB,uvC,det} = face;
  const {width,height,gradientX,gradientY,gloss} = maps;
  const ax=uvA.x*width, ay=uvA.y*height, bx=uvB.x*width, by=uvB.y*height, cx=uvC.x*width, cy=uvC.y*height;
  const firstX=Math.max(0,Math.floor(ax+Math.min(0,bx,cx))), lastX=Math.min(width-1,Math.ceil(ax+Math.max(0,bx,cx)));
  const firstY=Math.max(0,Math.floor(ay+Math.min(0,by,cy))), lastY=Math.min(height-1,Math.ceil(ay+Math.max(0,by,cy)));
  const rel=face.triangle.a.clone().sub(center), sample=new Vector3(), subsamples=4;
  const inverseDet=1/(det*width*height), step=.04;
  for (let y=firstY;y<=lastY;y++) for (let x=firstX;x<=lastX;x++) {
    const pixel=y*width+x;
    for (let j=0;j<subsamples;j++) for (let i=0;i<subsamples;i++) {
      const dx=x+(i+.5)/subsamples-ax, dy=y+(j+.5)/subsamples-ay;
      const b=(dx*cy-dy*cx)*inverseDet, c=(bx*dy-by*dx)*inverseDet;
      if (b<0 || c<0 || b+c>1) continue;
      sample.copy(rel).addScaledVector(face.edgeB,b).addScaledVector(face.edgeC,c);
      const s=sample.dot(along)/halfLength, t=sample.dot(across)/radius;
      if (Math.abs(s)>1.9 || Math.abs(t)>2.3 || Math.abs(sample.dot(up))>.0028) continue;
      const ds=(stitchHeight(s+step,t)-stitchHeight(s-step,t))/(2*step*halfLength);
      const dt=(stitchHeight(s,t+step)-stitchHeight(s,t-step))/(2*step*radius);
      const weight=strength/(subsamples*subsamples);
      gradientX[pixel]-=weight*(ds*along.dot(face.tangent)+dt*across.dot(face.tangent));
      gradientY[pixel]-=weight*(ds*along.dot(face.bitangent)+dt*across.dot(face.bitangent));
      gloss[pixel]+=weight*Math.exp(-2.7*s*s*s*s-2.2*t*t);
    }
  }
}

function sew(faces, maps) {
  let stitchCount=0;
  for (const knots of seams) {
    const curve=new CatmullRomCurve3(knots.map(p=>new Vector3(...p)));
    const bounds=new Box3().setFromPoints(curve.getSpacedPoints(50)).expandByScalar(.027);
    const localFaces=faces.filter(f=>bounds.intersectsBox(f.bounds));
    const length=curve.getLength(), count=Math.max(2,Math.round(length/.0082));
    for (let i=0;i<count;i++) {
      const fraction=(i+.5)/count;
      const pick=closestPoint(localFaces,curve.getPointAt(fraction));
      if (!pick) continue;
      const up=pick.normal, along=curve.getTangentAt(fraction);
      along.addScaledVector(up,-up.dot(along)).normalize();
      const across=new Vector3().crossVectors(up,along);
      const strength=Math.min(1,(i+1)/2,(count-i)/2)*(.94+.06*Math.sin(2.16*i));
      const stitch={center:pick.point,along,across,up,halfLength:length/count*.36,radius:.00148,strength};
      for (const face of localFaces) stamp(face,stitch,maps);
      stitchCount++;
    }
  }
  if (!stitchCount) throw new Error('No stitch paths land on the posed garment');
}

export function repack(input,doc,bin,substitutions) {
  const parts=[];
  let offset=0;
  for (const [i,view] of doc.bufferViews.entries()) {
    const start=view.byteOffset||0, bytes=substitutions.get(i)||bin.subarray(start,start+view.byteLength);
    const padding=Buffer.alloc((4-bytes.length%4)%4);
    parts.push(bytes,padding); view.byteOffset=offset; view.byteLength=bytes.length;
    offset+=bytes.length+padding.length;
  }
  doc.buffers[0].byteLength=offset;
  const json=Buffer.from(JSON.stringify(doc)), chunk=Buffer.alloc((json.length+3)&~3,32); json.copy(chunk);
  const header=Buffer.from(input.subarray(0,20)), binHeader=Buffer.alloc(8);
  header.writeUInt32LE(28+chunk.length+offset,8); header.writeUInt32LE(chunk.length,12);
  binHeader.writeUInt32LE(offset); binHeader.write('BIN\0',4);
  return Buffer.concat([header,chunk,binHeader,...parts]);
}

export async function bakeTopstitch(input) {
  const end=20+input.readUInt32LE(12), doc=JSON.parse(input.subarray(20,end)), bin=input.subarray(end+8);
  const cloth=doc.meshes.flatMap(m=>m.primitives).find(p=>doc.materials[p.material].normalTexture);
  const material=doc.materials[cloth.material];
  // Buffer views are resolved from the material so reordering an atlas will
  // never paint the colour image or the sculpture's stone material.
  async function atlas(texture) {
    const image=doc.images[doc.textures[texture.index].source], id=image.bufferView;
    const v=doc.bufferViews[id], start=v.byteOffset||0;
    const {data,info}=await sharp(bin.subarray(start,start+v.byteLength)).raw().toBuffer({resolveWithObject:true});
    return {id,data,info};
  }
  const [normal,orm]=await Promise.all([atlas(material.normalTexture),atlas(material.pbrMetallicRoughness.metallicRoughnessTexture)]);
  const {width,height}=normal.info, size=width*height;
  if (orm.info.width!==width || orm.info.height!==height) throw new Error('Cloth atlases must share dimensions');
  const gradientX=new Float32Array(size), gradientY=new Float32Array(size), gloss=new Float32Array(size);
  sew(readMesh(doc,bin,cloth),{width,height,gradientX,gradientY,gloss});
  const n=new Vector3();
  for (let i=0;i<size;i++) {
    if (Math.abs(gradientX[i])+Math.abs(gradientY[i])+gloss[i]<.001) continue;
    const j=i*normal.info.channels, k=i*orm.info.channels+1;
    n.set(normal.data[j]/127.5-1,normal.data[j+1]/127.5-1,normal.data[j+2]/127.5-1);
    n.x+=gradientX[i]*n.z; n.y+=gradientY[i]*n.z; n.normalize();
    normal.data[j]=Math.round((n.x+1)*127.5); normal.data[j+1]=Math.round((n.y+1)*127.5); normal.data[j+2]=Math.round((n.z+1)*127.5);
    orm.data[k]=Math.max(0,Math.round(orm.data[k]-45*gloss[i]));
  }
  const substitutions=new Map(await Promise.all([normal,orm].map(async a=>[a.id,await sharp(a.data,{raw:a.info}).png({compressionLevel:9}).toBuffer()])));
  return repack(input,doc,bin,substitutions);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  const source=process.argv[2]||new URL('../public/concept/hoodie-sculpture-tailoring.glb',import.meta.url);
  const output=process.argv[3]||new URL('../public/concept/hoodie-sculpture-sewn.glb',import.meta.url);
  await fs.writeFile(output,await bakeTopstitch(await fs.readFile(source)));
}
