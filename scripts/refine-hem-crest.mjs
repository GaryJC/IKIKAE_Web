// Shape the embroidery-side fold above the waistband, in the same cylindrical
// frame used to fit the existing waist seam. Keep the zip and side return pinned.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {MathUtils} from 'three';
import {refineCloth} from './refine-local-cloth.mjs';

const smooth=(lo,hi,x)=>MathUtils.smoothstep(x,lo,hi);
const bell=x=>Math.exp(-.5*x*x);

function height(angle,y){
  const ends=smooth(.12,.33,angle)*(1-smooth(1.10,1.46,angle));
  const crown=bell((angle-.68)/.35);
  const seam=-.423-.006*Math.sin(angle)**2+.004*Math.sin(4*angle);
  const ridge=seam+.010+.009*crown+.005*Math.sin(4.6*angle-.6);
  const width=.0075+.0055*crown;
  const dy=y-ridge;
  const taper=smooth(-.454,-.440,y)*(1-smooth(-.387,-.368,y));
  return ends*taper*((.005+.011*crown)*bell(dy/width)
    -.0038*bell((dy+1.55*width)/(.73*width)));
}

export function refineHemCrest(input){
  return refineCloth(input,{
    passes:2,
    splitEdge(p,a,b){
      if(p.y<-.457 || p.y>-.365 || p.x<.018 || p.x>.305 || p.z<.004)return false;
      const angle=Math.atan2(p.x+.01,p.z+.025);
      return angle<1.49 && a.distanceToSquared(b)>.007**2;
    },
    shape(p,position,normal){
      if(p.x<.012 || p.y<=-.454 || p.y>=-.368 || p.z<0)return;
      const angle=Math.atan2(p.x+.01,p.z+.025);
      const depth=height(angle,p.y);
      if(!depth)return;
      const radius=Math.hypot(p.x+.01,p.z+.025);
      const s=Math.sin(angle),c=Math.cos(angle);
      position.x+=s*depth;
      position.z+=c*depth;
      // Inverse-transpose of the radial displacement, including the change
      // in circumference. Preserve the smooth normals inherited from the cloth.
      const da=(height(angle+.001,p.y)-height(angle-.001,p.y))/.002;
      const dy=(height(angle,p.y+.0001)-height(angle,p.y-.0001))/.0002;
      const radial=normal.x*s+normal.z*c;
      const tangent=(radius*(normal.x*c-normal.z*s)-radial*da)/(radius+depth);
      normal.set(radial*s+tangent*c,normal.y-radial*dy,radial*c-tangent*s).normalize();
    }
  });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const dir=new URL('../public/concept/',import.meta.url);
  fs.writeFileSync(new URL('hoodie-sculpture-crest.glb',dir),
    refineHemCrest(fs.readFileSync(new URL('hoodie-sculpture-hem.glb',dir))));
}
