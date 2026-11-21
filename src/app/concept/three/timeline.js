export const STORY_STOPS = [0, .38, .72, 1];
export const EDITOR_STOP = .72;
export const CAMERA = {
  fov: 34, wholeHeight: 2.62, wholeWidth: 1.96, wholeFill: .94,
  upperHeight: 2.21, upperWidth: 1.80, upperFill: .88,
  wholeTargetY: 1.85, upperTargetY: 1.99,
  embroideryWidth: .76, embroideryFill: .50,
};
export const clamp = v => Math.min(1, Math.max(0, v));
// Zero velocity AND acceleration at the edge of every held composition.
export const easeShot = t => { const x=clamp(t);return x*x*x*(10+x*(-15+6*x)); };
const ramp = (p,a,b) => easeShot((p-a)/(b-a));
// Ease the garment pose, framing crop and studio lights at the chapter edges.
function travel(t) {
  const shoulder=.22;
  const start=x=>shoulder*x*x*x*(1-.5*x)/(1-shoulder);
  if(t<shoulder)return start(t/shoulder);
  if(t>1-shoulder)return 1-start((1-t)/shoulder);
  return (t-.5*shoulder)/(1-shoulder);
}
export const SHOT_BOUNDARIES = STORY_STOPS;
function segment(p) {
  return p<STORY_STOPS[1]?0:p<STORY_STOPS[2]?1:2;
}
function travelFraction(p,i) {
  return travel(clamp((p-STORY_STOPS[i])/(STORY_STOPS[i+1]-STORY_STOPS[i])));
}
const mix=(a,b,t)=>a+(b-a)*t;
const yawAngles=[8,30,8,-44];
export function scenePose(progress) {
  const p=clamp(progress),i=segment(p),t=travelFraction(p,i);
  return {
    opening:i===0?1-t:0,rotation:mix(yawAngles[i],yawAngles[i+1],t)*Math.PI/180,
    upper:i===0?t:i===1?1:1-t,close:i===0?0:i===1?t:1-t,
    framing:1,finale:i===2?t:0
  };
}

// Scroll selects a point between the photographed compositions. The spring
// on the actual eye and aim supplies the acceleration, including on reversals.
export function cameraFrame(progress,aspect,focus,normal,inspectionYaw=null,badge=[.40,1.03,.5]) {
  const p=clamp(progress),i=segment(p);
  const t=clamp((p-STORY_STOPS[i])/(STORY_STOPS[i+1]-STORY_STOPS[i]));
  const tangent=Math.tan(CAMERA.fov*Math.PI/360);
  const distances=[
    Math.max(3.96/(2*tangent*.94),2.6/(2*tangent*aspect*.94))+.12,
    Math.max(2.42,1.38/(2*tangent*aspect)),
    Math.max(1.48,CAMERA.embroideryWidth/(2*tangent*aspect*CAMERA.embroideryFill)),
    Math.max(3.12,1.65/(2*tangent*aspect))
  ];
  const aims=[[0,CAMERA.wholeTargetY-.76,0],[badge[0]-.09,badge[1]+.13,badge[2]],
    [focus[0]-.035,focus[1]+.035,focus[2]],[-.10,CAMERA.wholeTargetY+.39,.09]];
  const hemYaw=Math.max(.10,Math.min(.27,Math.atan2(normal[0],normal[2])+.10));
  const yaws=[8*Math.PI/180,30*Math.PI/180,hemYaw,-44*Math.PI/180];
  const pitches=[-.130,.025,.070,.445];
  function eyeAt(index) {
    const yaw=inspectionYaw??yaws[index],pitch=pitches[index],r=distances[index];
    const horizontal=Math.cos(pitch)*r,aim=aims[index];
    return [aim[0]+Math.sin(yaw)*horizontal,aim[1]+Math.sin(pitch)*r,aim[2]+Math.cos(yaw)*horizontal];
  }
  const from=eyeAt(i),to=eyeAt(i+1);
  const position=from.map((value,axis)=>mix(value,to[axis],t));
  const target=aims[i].map((value,axis)=>mix(value,aims[i+1][axis],t));
  const radius=Math.hypot(...position.map((v,axis)=>v-target[axis]));

  // A lateral camera move with a fixed aim gives the halo and fabric real
  // parallax. Use less travel for the two reading shots and narrow screens.
  const amplitudes=[.057,-.039,.028,.052];
  const weight=amplitudes[i]*clamp(1-10*t)+amplitudes[i+1]*clamp(10*t-9);
  const amplitude=radius*weight*Math.min(1,aspect);
  const yaw=Math.atan2(position[0]-target[0],position[2]-target[2]);
  return {target,position,radius,drift:[Math.cos(yaw)*amplitude,0,-Math.sin(yaw)*amplitude]};
}
export function storyState(progress) {
  const p=clamp(progress);
  const pose=scenePose(p);
  const chapter=p<.24?0:p<.56?1:p<.88?2:3;
  const orbitOut=ramp(p,.10,.218), shoulderIn=1-ramp(p,.245,.34);
  const downOut=ramp(p,.44,.545), hemIn=1-ramp(p,.565,.68);
  const upOut=ramp(p,.80,.88), returnIn=1-ramp(p,.88,.98);
  // The hem title starts above its reading position and settles as the camera arrives.
  const copyX=chapter===0?-112*orbitOut:chapter===1?100*shoulderIn:0;
  const copyY=chapter===0?0:chapter===1?-74*downOut:
    chapter===2?-86*hemIn-62*upOut:78*returnIn;
  return {
    chapter,copyX,copyY,opening:pose.opening,
    hero:1-orbitOut,detail:(1-shoulderIn)*(1-downOut),
    editor:(1-hemIn)*(1-upOut),final:1-returnIn,
    cta:ramp(p,.975,1),ring:1-ramp(p,.43,.64)+ramp(p,.86,.98),
    macro:pose.close,
  };
}
// Closed-form solution of x″ + 40x′ + 100(x-target) = 0. Retaining velocity
// when input reverses prevents a kink in the camera path.
const slowRoot=-20+Math.sqrt(300),fastRoot=-20-Math.sqrt(300);
function advanceSpring(current,velocity,target,seconds) {
  const dt=Math.max(0,seconds),offset=current-target;
  const slow=(velocity-fastRoot*offset)/(slowRoot-fastRoot);
  const fast=offset-slow;
  const a=slow*Math.exp(slowRoot*dt),b=fast*Math.exp(fastRoot*dt);
  const position=target+a+b,speed=slowRoot*a+fastRoot*b;
  if(Math.abs(position-target)<.00005 && Math.abs(speed)<.0003)return [target,0];
  return [position,speed];
}
export function advanceProgress(current,velocity,target,seconds) {
  const [position,speed]=advanceSpring(current,velocity,target,seconds);
  return [clamp(position),speed];
}

// The velocity belongs to each world-space axis. Carry it through a new
// scroll target even when the next chapter travels in a different direction.
export function createCameraMotion(initial) {
  const fields=['position','target','drift'];
  const values={},velocities={};
  for(const field of fields) {
    values[field]=[...initial[field]];
    velocities[field]=[0,0,0];
  }
  return {
    ...values,
    step(goal,seconds,immediate=false) {
      let moving=false;
      for(const field of fields) {
        const value=values[field],speed=velocities[field],end=goal[field];
        for(let axis=0;axis<3;axis++) {
          if(immediate) { value[axis]=end[axis];speed[axis]=0; }
          else if(value[axis]!==end[axis] || speed[axis]!==0) {
            [value[axis],speed[axis]]=advanceSpring(value[axis],speed[axis],end[axis],seconds);
            moving ||= value[axis]!==end[axis] || speed[axis]!==0;
          }
        }
      }
      return moving;
    }
  };
}
