// Offline shaping of the free sleeves. Sections were measured on the posed
// jacket, in its own coordinates. Keep the photographed wrist angles and the
// volume under the elbow while replacing the small angular scan creases.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Vector3} from 'three';
import {seatPocketHardware} from './seat-pocket-hardware.mjs';
import {cleanPocketSliders} from './clean-pocket-sliders.mjs';
import {refineCloth} from './refine-local-cloth.mjs';

const smooth=(a,b,x)=>{
  const t=Math.min(1,Math.max(0,(x-a)/(b-a)));
  return t*t*(3-2*t);
};
// Height, absolute centre X, centre Z, horizontal and front/back radii.
// The bent left forearm projects further forward as it approaches the wrist.
const right=[
  [-.56,.422,.030,.057,.079],[-.515,.424,.008,.059,.077],
  [-.475,.422,-.016,.067,.087],[-.450,.420,-.032,.077,.097],
  [-.375,.412,-.057,.087,.107],[-.275,.404,-.096,.092,.117],
  [-.155,.402,-.123,.090,.118],[-.055,.400,-.131,.092,.120],
  [.08,.381,-.136,.094,.132]
];
const left=[
  [-.56,.401,.142,.059,.075],[-.512,.405,.139,.061,.082],
  [-.483,.408,.130,.065,.086],[-.448,.410,.112,.074,.097],
  [-.375,.414,.084,.083,.113],[-.275,.416,.024,.092,.121],
  [-.155,.419,-.012,.097,.120],[-.055,.416,-.030,.100,.125],
  [.08,.397,-.041,.099,.135]
];

function section(y,knots){
  let i=0;
  while(i<knots.length-2 && y>knots[i+1][0])i++;
  const a=knots[i],b=knots[i+1],prev=knots[Math.max(0,i-1)],next=knots[Math.min(knots.length-1,i+2)];
  const span=b[0]-a[0],t=(y-a[0])/span,remaining=1-t;
  return [1,2,3,4].map(k=>{
    const slopeA=(b[k]-prev[k])/(b[0]-prev[0]),slopeB=(next[k]-a[k])/(next[0]-a[0]);
    return (1+2*t)*remaining*remaining*a[k]+t*remaining*remaining*span*slopeA
      +t*t*(3-2*t)*b[k]-t*t*remaining*span*slopeB;
  });
}

function fold(distance,width){
  // A broad crest turns underneath into a shorter recessed lip.
  return Math.exp(-.5*(distance/width)**2)
    -.58*Math.exp(-.5*((distance+1.45*width)/(.72*width))**2);
}

function shell(y,angle,sign,frame){
  const [cx,cz,rx,rz]=frame,front=Math.sin(angle),outside=Math.cos(angle);
  const facing=smooth(-.62,.80,front);
  // The primary pleat falls towards the inside elbow, then sweeps upward
  // on the outside. A shorter pleat runs off the front halfway round the arm.
  const elbow=(sign>0?-.133:-.110)+.065*outside-.022*front*front+.012*Math.sin(2*angle);
  const lower=(sign>0?-.309:-.282)+.073*outside+.028*outside*outside-.010*Math.sin(2*angle);
  const wrist=(sign>0?-.423:-.432)-.034*outside+.016*Math.sin(2*angle);
  const elbowWeight=.14+.86*facing;
  const lowerWeight=facing*smooth(-.88,.16,outside);
  const wristWeight=facing*(1-smooth(.30,.91,outside));
  const depth=.025*elbowWeight*fold(y-elbow,.023+.008*(1-outside))
    +.024*lowerWeight*fold(y-lower,.018+.008*(1-outside))
    +.014*wristWeight*fold(y-wrist,.021);
  return new Vector3(sign*(cx+(rx+depth)*outside),y,cz+(rz+depth)*front);
}

function influence(p){
  const side=Math.abs(p.x);
  // The sleeve merges into the body at its upper, inside corner. Protect
  // that junction, the separate pocket welts, the cuff opening and hands.
  // The scan fuses the inner elbow to the jacket just above the slits.
  // Feather around that recess in depth; the pocket in front stays pinned.
  const recessZ=p.x>0?-.063:.019;
  const inner=smooth(.288,.317,side)*(1-smooth(.031,.078,Math.abs(p.z-recessZ)))
    *smooth(-.29,-.25,p.y)*(1-smooth(-.14,-.065,p.y));
  return smooth(-.543,-.455,p.y)*(1-smooth(-.045,.075,p.y))
    *Math.max(smooth(.31,.339,side),inner);
}

export function finishSleeves(sewn){
  return refineCloth(sewn,{
    splitEdge:(p,a,b)=>influence(p)>=.02 && a.distanceToSquared(b)>=.0175**2,
    shape(p,position,normal){
      const weight=influence(p);
      if(!weight)return;
      const sign=Math.sign(p.x),knots=sign>0?right:left;
      const frame=section(p.y,knots),[cx,cz,rx,rz]=frame;
      const angle=Math.atan2((p.z-cz)/rz,(sign*p.x-cx)/rx);
      const candidate=shell(p.y,angle,sign,frame);
      const displacement=candidate.clone().sub(p);
      position.addScaledVector(displacement,weight*.86);
      const dy=.0002,da=.002;
      const along=shell(p.y+dy,angle,sign,section(p.y+dy,knots))
        .sub(shell(p.y-dy,angle,sign,section(p.y-dy,knots)));
      const around=shell(p.y,angle+da,sign,frame).sub(shell(p.y,angle-da,sign,frame));
      const n=along.cross(around).multiplyScalar(sign).normalize();
      normal.lerp(n,.98*weight).normalize();
    }
  });
}

export function finishPocketGarment(sewn) {
  return cleanPocketSliders(seatPocketHardware(finishSleeves(sewn)));
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const dir=new URL('../public/concept/',import.meta.url);
  const sewn=fs.readFileSync(new URL('hoodie-sculpture-sewn.glb',dir));
  fs.writeFileSync(new URL('hoodie-sculpture-pocket.glb',dir),await finishPocketGarment(sewn));
}
