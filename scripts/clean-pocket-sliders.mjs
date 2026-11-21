// Remove the generated pocket pulls from their original atlas footprints before
// adding the new hardware. Coordinates below refer to the 1024px PBR charts.
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { repack } from './bake-concept-topstitch.mjs';

const sliders=[
  {start:[236.0,140.9],end:[246.7,134.4],radius:5.1,feather:1.8,donor:[8,16]},
  {start:[242.3,629.6],end:[242.1,646.8],radius:6.0,feather:2.1,donor:[-15,0]}
];

function fillFootprint(source,output,info,slider) {
  const {width,channels}=info,scale=width/1024;
  const {start:[ax,ay],end:[bx,by],radius,feather,donor}=slider;
  const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);
  const reach=radius+feather;
  // Align tightly fitted crop bounds to JPEG MCUs for the colour-map drop.
  const left=Math.floor((Math.min(ax,bx)-reach)*scale/8)*8;
  const right=Math.ceil((Math.max(ax,bx)+reach)*scale/8)*8;
  const top=Math.floor((Math.min(ay,by)-reach)*scale/8)*8;
  const bottom=Math.ceil((Math.max(ay,by)+reach)*scale/8)*8;
  const index=(x,y)=>(Math.floor(y*scale)*width+Math.floor(x*scale))*channels;
  const stride=right-left,rows=bottom-top,field=new Float32Array(stride*rows*3);
  const pixels=[];
  for(let py=top;py<bottom;py++)for(let px=left;px<right;px++){
    const x=(px+.5)/scale,y=(py+.5)/scale;
    const along=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(length*length)));
    const dist=Math.hypot(x-ax-along*dx,y-ay-along*dy);
    const at=(py*width+px)*channels, local=((py-top)*stride+px-left)*3;
    for(let c=0;c<3;c++)field[local+c]=source[at+c];
    if(dist>=reach || py===top || py===bottom-1 || px===left || px===right-1)continue;
    const f=Math.max(0,Math.min(1,(reach-dist)/feather));
    const sx=x+donor[0],sy=y+donor[1];
    pixels.push({at,local,alpha:f*f*(3-2*f),sample:index(sx,sy),
      nearby:[index(sx-1,sy),index(sx+1,sy),index(sx,sy-1),index(sx,sy+1)]});
  }
  // Continue broad shading inward from all edges. A one-sided clone would
  // drag the adjacent pocket seam across the cleared area.
  for(let pass=0;pass<300;pass++){
    let change=0;
    for(const {local} of pixels)for(let c=0;c<3;c++){
      const i=local+c;
      const average=(field[i-3]+field[i+3]+field[i-3*stride]+field[i+3*stride])*.25;
      change=Math.max(change,Math.abs(average-field[i]));field[i]=average;
    }
    if(change<.004)break;
  }
  for(const {at,local,alpha,sample,nearby} of pixels)for(let c=0;c<3;c++){
    const yarn=source[sample+c]-nearby.reduce((n,i)=>n+source[i+c],0)/4;
    output[at+c]=Math.max(0,Math.min(255,Math.round(source[at+c]*(1-alpha)+(field[local+c]+yarn)*alpha)));
  }
  return {left,top,width:right-left,height:bottom-top};
}

async function repair(bytes,mime,dir) {
  const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const output=Buffer.from(data);
  const boxes=sliders.map(s=>fillFootprint(data,output,info,s));
  if(mime==='image/png')return sharp(output,{raw:info}).png({compressionLevel:9}).toBuffer();
  let jpeg=bytes;
  for(const box of boxes){
    const file=join(dir,'slider.jpg');
    await sharp(output,{raw:info}).extract(box).jpeg({quality:100,chromaSubsampling:'4:4:4'}).toFile(file);
    jpeg=execFileSync('jpegtran',['-optimize','-trim','-drop','+'+box.left+'+'+box.top,file],{input:jpeg,maxBuffer:16*1024*1024});
  }
  return jpeg;
}

export async function cleanPocketSliders(input) {
  const end=20+input.readUInt32LE(12),doc=JSON.parse(input.subarray(20,end)),bin=input.subarray(end+8);
  const material=doc.materials.find(m=>m.normalTexture && m.pbrMetallicRoughness?.baseColorTexture);
  const pbr=material.pbrMetallicRoughness;
  const textures=[pbr.baseColorTexture,material.normalTexture,pbr.metallicRoughnessTexture];
  const replacements=new Map(), dir=await mkdtemp(join(tmpdir(),'ikikae-pocket-'));
  try{
    for(const texture of textures){
      const image=doc.images[doc.textures[texture.index].source],view=doc.bufferViews[image.bufferView];
      const start=view.byteOffset||0;
      replacements.set(image.bufferView,await repair(bin.subarray(start,start+view.byteLength),image.mimeType,dir));
    }
    return repack(input,doc,bin,replacements);
  }finally{await rm(dir,{recursive:true,force:true});}
}
