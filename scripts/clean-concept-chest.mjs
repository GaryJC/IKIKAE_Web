// Offline atlas repair. Replace the generated lettering under the woven label
// in all three PBR maps. The donor is the adjacent unmarked panel to its right.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

function cleanColour(jpeg) {
  // Copy whole JPEG blocks so the rest of the garment is never recompressed.
  const dir=mkdtempSync(join(tmpdir(),'concept-cloth-'));
  try {
    const tile=join(dir,'tile.jpg');
    writeFileSync(tile,execFileSync('jpegtran',['-crop','48x112+816+96'],{input:jpeg}));
    return execFileSync('jpegtran',['-optimize','-drop','+768+96',tile],{input:jpeg,maxBuffer:16*1024*1024});
  } finally {
    rmSync(dir,{recursive:true,force:true});
  }
}

export async function cleanChestAtlas(glb) {
  const jsonEnd=20+glb.readUInt32LE(12);
  const doc=JSON.parse(glb.subarray(20,jsonEnd));
  const bin=glb.subarray(jsonEnd+8);
  const images=new Map(doc.images.map(image=>[image.bufferView,image]));
  const parts=[];
  let offset=0;
  for(const [id,view] of doc.bufferViews.entries()){
    const start=view.byteOffset||0;
    let bytes=bin.subarray(start,start+view.byteLength);
    const image=images.get(id);
    if(image?.name==='texture_diffuse' && image.mimeType==='image/jpeg'){
      bytes=cleanColour(bytes);
    } else if(['texture_diffuse','texture_normal','texture_metallic-texture_roughness'].includes(image?.name)){
      // The same UV patch must move on the native and preview texture sets.
      const {width,height}=await sharp(bytes).metadata();
      const px=x=>Math.round(x*width/2048),py=y=>Math.round(y*height/2048);
      const top=py(96);
      const tile=await sharp(bytes).extract({left:px(816),top,width:px(48),height:py(112)}).png().toBuffer();
      bytes=await sharp(bytes).composite([{input:tile,left:px(768),top}]).removeAlpha().png().toBuffer();
    }
    view.byteOffset=offset;
    view.byteLength=bytes.length;
    const padding=(4-bytes.length%4)%4;
    parts.push(bytes,Buffer.alloc(padding));
    offset+=bytes.length+padding;
  }
  doc.buffers[0].byteLength=offset;
  const json=Buffer.from(JSON.stringify(doc));
  const padded=Buffer.alloc((json.length+3)&~3,32);
  json.copy(padded);
  const header=Buffer.from(glb.subarray(0,20));
  header.writeUInt32LE(28+padded.length+offset,8);
  header.writeUInt32LE(padded.length,12);
  const binHeader=Buffer.from(glb.subarray(jsonEnd,jsonEnd+8));
  binHeader.writeUInt32LE(offset,0);
  return Buffer.concat([header,padded,binHeader,...parts]);
}
