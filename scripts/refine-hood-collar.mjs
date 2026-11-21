// Measured crown of the folded opening, in cylindrical sections around the
// neck. Radius and height vary independently on either side of the zipper.
import {MathUtils,Matrix3,Vector3} from 'three';
import {refineCloth} from './refine-local-cloth.mjs';

const crown=[
  // Radius, height at 15 degree intervals starting behind the neck.
  [.180,.568],[.183,.569],[.184,.572],[.187,.572],[.200,.563],[.211,.556],
  [.216,.545],[.221,.529],[.200,.513],[.181,.497],[.167,.480],[.163,.460],
  [.161,.430],[.153,.452],[.151,.472],[.158,.485],[.184,.502],[.203,.519],
  [.208,.539],[.202,.549],[.192,.558],[.178,.566],[.178,.569],[.179,.568]
];
const smooth=(lo,hi,t)=>MathUtils.smoothstep(t,lo,hi);
const bell=t=>Math.exp(-.5*t*t);
function section(angle,k){
  const turn=(angle+Math.PI)*(crown.length/(2*Math.PI));
  const j=Math.floor(turn),t=turn-j;
  const at=i=>crown[(j+i+crown.length)%crown.length][k];
  const a=at(0),b=at(1),ma=(b-at(-1))*.5,mb=(at(2)-a)*.5;
  return (1-t)*a+t*b+t*(1-t)*((1-t)*(ma-(b-a))+t*((b-a)-mb));
}

function profile(p){
  const {x,y,z}=p;
  if(y<.385 || y>.60)return;
  const radius=Math.hypot(x,z+.06),angle=Math.atan2(x,z+.06);
  const across=radius-section(angle,0),down=section(angle,1)-y;
  // Preserve the front closure. Make the turned edge stand proud of the
  // outer facing and roll inwards on its lining side.
  const weight=smooth(.13,.43,Math.abs(angle))*(1-smooth(.032,.062,Math.abs(across)))*
    smooth(-.026,-.010,down)*(1-smooth(.046,.073,down));
  if(weight<=0)return;
  const outer=smooth(-.008,.012,across);
  const turn=bell((down-.007)/.012),seat=bell((down-.030)/.010);
  const tension=.81+.19*Math.cos(2*angle+.30);
  // As the hood rests on either shoulder a short compression fold tapers
  // towards the zipper; it dissolves before reaching the rear neckline.
  const side=Math.abs(angle),pinch=bell((side-(x<0?1.04:1.25))/.37);
  const tuck=pinch*bell((down-.041-.018*(side-1.12))/.011);
  const spread=weight*(tension*((.004+.008*outer)*turn-.0048*outer*seat)
    +outer*.006*tuck);
  const rise=weight*(.0035*turn-.0020*seat)*tension;
  return new Vector3(x+spread*x/radius,y+rise,z+spread*(z+.06)/radius);
}

export function refineHoodCollar(input){
  const axes=[new Vector3(.00008,0,0),new Vector3(0,.00008,0),new Vector3(0,0,.00008)];
  return refineCloth(input,{
    passes:2,
    splitEdge(p,a,b){return a.distanceToSquared(b)>.006**2 && Boolean(profile(p));},
    shape(p,result,normal){
      const moved=profile(p);
      if(!moved)return;
      result.copy(moved);
      const [u,v,w]=axes.map(axis=>{
        const hi=p.clone().add(axis),lo=p.clone().sub(axis);
        return (profile(hi)??hi).sub(profile(lo)??lo).multiplyScalar(1/.00016);
      });
      const inverseTranspose=new Matrix3().set(u.x,v.x,w.x,u.y,v.y,w.y,u.z,v.z,w.z).invert().transpose();
      normal.applyMatrix3(inverseTranspose).normalize();
    }
  });
}
