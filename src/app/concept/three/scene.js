import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { createHoodie } from './hoodie.js';

import { CAMERA, STORY_STOPS, scenePose, cameraFrame, storyState, advanceProgress, createCameraMotion } from './timeline.js';
export { scenePose } from './timeline.js';
const clamp = (v,min,max) => Math.min(max,Math.max(min,v));

export function createScene(container, { motto, onReady, onFailure, reducedMotion = false, onProgress = () => {} }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch { onFailure(); return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', 'Classical stone figure wearing a three-dimensional charcoal zip hoodie with personalised hem embroidery');
  canvas.setAttribute('role', 'img');
  container.appendChild(canvas);

  const world = new THREE.Scene();
  // Shape the reflections in a one-time studio bake. A feathered bank gives
  // broad folds a bright crest and a soft tail instead of a rectangular patch.
  const studio = new THREE.Scene();
  studio.background=new THREE.Color(0x020202);
  function panel(x,y,z,width,height,radiance,tint,feather,roll=0) {
    const shape=new THREE.PlaneGeometry(width,height,16,12);
    const uv=shape.getAttribute('uv'), colors=[];
    const smooth=THREE.MathUtils.smoothstep;
    for(let i=0;i<uv.count;i++){
      const u=uv.getX(i),v=uv.getY(i);
      const edge=Math.min(u,1-u,v,1-v);
      // A graduated scrim softens the inward side of the reflection.
      // The narrow bright side still traces the seam when it turns away.
      const power=smooth(edge,0,feather)*(.24+.76*smooth(u,.03,.74))*
        (.48+.52*smooth(v,.05,.83));
      colors.push(power,power,power);
    }
    shape.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const card=new THREE.Mesh(shape,new THREE.MeshBasicMaterial({
      color:new THREE.Color(tint).multiplyScalar(radiance),vertexColors:true
    }));
    card.position.set(x,y,z);card.lookAt(0,0,0);card.rotateZ(roll);studio.add(card);
  }
  panel(-3.8,4.4,1.45,2.45,4.3,14.4,0xfff5e8,.18,-.36);
  panel(3.05,2.55,-2.0,.86,4.9,17.5,0xdce9ff,.15,.26);
  // A low, dim bounce across the front separates dark folded panels from
  // their valleys. Leave the space between the three reflectors dark.
  panel(-.45,-1.1,3.35,2.75,1.03,.94,0xe4eafa,.25,-.24);
  function bakeStudio(size) {
    const baker=new THREE.PMREMGenerator(renderer);
    try {
      return baker.fromScene(studio,0,.1,30,{size});
    } finally {
      for(const card of studio.children){card.geometry.dispose();card.material.dispose();}
      studio.clear();
      baker.dispose();
    }
  }
  const reflection=bakeStudio(256);
  world.environment=reflection.texture;
  // Keep the cool studio reflections on the sculpture. Two feathered
  // bounce cards open the cheek and jaw under the low and overhead cameras.
  let stoneReflection;
  const stoneEnvironment=new EXRLoader().loadAsync('/concept/sculpture-studio.exr').then(texture=>{
    try {
      if(disposed)return null;
      texture.mapping=THREE.EquirectangularReflectionMapping;
      studio.background=texture;
      studio.backgroundIntensity=.52;
      panel(-1.7,-.25,4.8,4.4,4.3,13,0xe6edf5,.30,.18);
      panel(-3.3,-2.8,1.8,3.0,2.7,12,0xe1e8ef,.29,.3);
      stoneReflection=bakeStudio(128);
      return stoneReflection.texture;
    } finally {
      studio.background=null;
      texture.dispose();
    }
  }).catch(()=>reflection.texture);
  renderer.autoClear=false;
  renderer.info.autoReset=false;
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, .05, 60);
  const garment = createHoodie({ motto, stoneEnvironment, onLoad() {
    if (disposed) return;
    modelReady=true; macroPoint.copy(garment.embroideryTarget); dirty = true; schedule(); onReady();
  }, onError: onFailure });
  const assembly = new THREE.Group();
  assembly.add(garment.group);
  world.add(assembly);
  garment.updateMotto(motto);
  const hemi = new THREE.HemisphereLight(0xe6e6df, 0x252229, .48);
  world.add(hemi);
  const key = new THREE.DirectionalLight(0xfff1dd, 3.5);
  key.position.set(-4.5, 5.5, 3.5); world.add(key);
  const fill = new THREE.DirectionalLight(0xcbd9e4, .45);
  fill.position.set(4, 1, 3); world.add(fill);
  const rim = new THREE.DirectionalLight(0xf7e9d2, 5.2);
  rim.position.set(2.8, 3.2, -2.5); world.add(rim);
  // A feathered, gridded accent lights just the fabric around the feature
  // in focus. The far chest and the inside of the hood stay in shadow.
  const accent = new THREE.SpotLight(0xe3eaf0, 0, 0, .30, .92);
  world.add(accent,accent.target);
  // Close, narrow bank skims the shoulder. Its finite width gives the zip a
  // tight reflection, while the cloth roughness softens the same light.
  if (!THREE.UniformsLib.LTC_HALF_1) RectAreaLightUniformsLib.init();
  const shoulderBank = new THREE.RectAreaLight(0xfff3df, 0, .42, 2.65);
  // Keep one strip light. It rakes the sleeve, shoulder seam, hem binding
  // and hood in sequence. Orbit the light so it never crosses the garment.
  const clothLights=[
    {x:2.22,y:1.02,z:-.54,aim:[.68,.03,.18],roll:.35,width:.35,length:2.8,intensity:9.8,accent:4.8},
    {x:2.24,y:2.62,z:-.65,aim:[.52,1.11,.38],roll:.70,width:.33,length:2.95,intensity:20.5,accent:4.6},
    {x:1.83,y:-.33,z:.48,aim:[.49,-.89,.48],roll:.74,width:.48,length:1.72,intensity:6.9,accent:4.6},
    {x:-2.09,y:2.1,z:-1.14,aim:[-.40,1.25,-.06],roll:-.55,width:.37,length:1.95,intensity:12.2,accent:6.6}
  ].map(light=>({...light,angle:Math.atan2(light.z,light.x),
    radius:Math.hypot(light.x,light.z),aim:new THREE.Vector3(...light.aim)}));
  const bankAim=new THREE.Vector3();
  function placeClothLight(index,t){
    const a=clothLights[index],b=clothLights[index+1],mix=THREE.MathUtils.lerp;
    const angle=mix(a.angle,b.angle,t),radius=mix(a.radius,b.radius,t);
    shoulderBank.position.set(radius*Math.cos(angle),mix(a.y,b.y,t),radius*Math.sin(angle));
    shoulderBank.lookAt(bankAim.lerpVectors(a.aim,b.aim,t));
    shoulderBank.rotateZ(mix(a.roll,b.roll,t));
    shoulderBank.intensity=mix(a.intensity,b.intensity,t);
    shoulderBank.width=mix(a.width,b.width,t);
    shoulderBank.height=mix(a.length,b.length,t);
    accent.target.position.copy(bankAim);
    accent.position.set(bankAim.x-1.85,bankAim.y+1.35,bankAim.z+1.05);
    accent.intensity=mix(a.accent,b.accent,t);
  }
  world.add(shoulderBank);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.51, .071, 10, 128), new THREE.MeshBasicMaterial({ color: 0xfffdf7, toneMapped: false, transparent: true, opacity: 1 }));
  ring.position.set(0,1.10,-1);world.add(ring);
  // Local bloom: a narrow spill at the tube and a much weaker wide skirt.
  // Normal alpha also composites correctly over the CSS backdrop and PNG posters.
  const spill=new THREE.Mesh(new THREE.RingGeometry(1.51-.54,1.51+.54,160),new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, toneMapped:false, uniforms:{strength:{value:1}},
    vertexShader:`varying vec2 localXY;
      void main(){localXY=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 localXY;uniform float strength;
      void main(){
        float d=max(abs(length(localXY)-1.51)-.060,0.);
        float glow=.40*exp(-d*d/.0032)+.16*exp(-d*d/.033)+.042*exp(-d*d/.082);
        gl_FragColor=vec4(1.,.97,.89,strength*glow*(1.-smoothstep(.41,.475,d)));
      }`
  }));
  spill.position.copy(ring.position);spill.position.z-=.08;spill.renderOrder=-1;world.add(spill);
  let target = 0, current = 0, frame = 0, disposed = false, active = true, inspectionYaw = null;
  let dirty = true, modelReady = false;
  let velocity = 0, elapsed = 0, presentedProgress = null;
  const drift = new THREE.Vector3();
  const bufferSize = new THREE.Vector2();
  let frames = [], previousTime = 0, animationTime = 0;
  const targetPoint = new THREE.Vector3();
  const macroPoint = garment.embroideryTarget.clone();
  const observer = new ResizeObserver(() => resize());
  function draw() {
    renderer.info.reset();renderer.clear();
    renderer.render(world,camera);
  }
  function resize() {
    if (disposed) return;
    // Scroll animates the CSS crop. Writing canvas.width/height here for
    // every crop change clears frames between draw() and browser paint.
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const bufferHeight = Math.max(1, window.innerHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1 : 1.5);
    renderer.getSize(bufferSize);
    if (bufferSize.x !== width || bufferSize.y !== bufferHeight || renderer.getPixelRatio() !== ratio) {
      renderer.setDrawingBufferSize(width, bufferHeight, ratio);
    }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    dirty = true; schedule();
  }
  function frameAt(p) {
    return cameraFrame(p,camera.aspect,macroPoint.toArray(),garment.embroideryNormal.toArray(),inspectionYaw,garment.badgeTarget.toArray());
  }
  function aimCamera(framing,phase=0) {
    camera.position.fromArray(framing.position).addScaledVector(drift.fromArray(framing.drift),phase);
    camera.lookAt(targetPoint.fromArray(framing.target));
  }
  function pose(p, notify = true) {
    const state = scenePose(p);
    garment.setOpeningPose(state.opening);
    assembly.rotation.set(0, 0, 0);
    assembly.updateMatrixWorld();
    const presentation = storyState(p);
    // In the high oblique shot, frame the head between both arcs instead
    // of letting the nearby rim cut across the title. Keep the same emitter.
    ring.position.set(.76*state.finale-.14*state.opening,1.10+1.38*state.finale+.52*state.opening,-1);
    ring.rotation.set(0,-.40*state.finale,0);
    // Align the opening halo to the sensor plane so the low angle still shows a circle.
    ring.quaternion.slerp(camera.quaternion,state.opening);
    spill.position.copy(ring.position);spill.rotation.copy(ring.rotation);spill.translateZ(-.08);
    ring.material.opacity = presentation.ring;
    spill.material.uniforms.strength.value=presentation.ring;
    spill.visible=ring.visible=presentation.ring>.001;
    const hem=state.close;
    const chest=p<=STORY_STOPS[2]?state.upper*(1-hem):0;
    // Trade some of the broad studio reflection for the diagonal shoulder light
    // during the chest approach and hold, using the same weight in reverse.
    world.environmentIntensity=1-.44*chest-.10*state.finale;
    if(p<=STORY_STOPS[1])placeClothLight(0,1-state.opening);
    else if(p<=STORY_STOPS[2])placeClothLight(1,hem);
    else placeClothLight(2,state.finale);
    key.intensity=.79-.24*chest+1.55*hem;
    key.position.set(-5.3,5.8-2.20*hem,2.65+.24*hem);
    hemi.intensity=.083+.048*chest+.22*hem;
    fill.intensity=.078+.19*chest+.27*hem;
    rim.intensity=2.25-.23*hem;
    if (notify && p!==presentedProgress) {
      presentedProgress=p; onProgress(p,presentation);
    }
  }

  let goalProgress=0, goal=frameAt(0), resetCamera=true;
  const cameraMotion=createCameraMotion(goal);
  function render(time) {
    frame = 0;
    if (disposed || !active || document.hidden) return;
    const dt=animationTime ? Math.max(0,(time-animationTime)/1000) : 0;
    animationTime=time;
    const previous=current;
    if(reducedMotion){current=target;velocity=0;}
    else if(current!==target || velocity!==0){
      [current,velocity]=advanceProgress(current,velocity,target,dt);
    }
    if(dirty || goalProgress!==target) {
      goal=frameAt(target);
      goalProgress=target;
    }
    const settling=cameraMotion.step(goal,dt,resetCamera || reducedMotion);
    resetCamera=false;
    const canFloat=modelReady && !reducedMotion && inspectionYaw===null;
    if(canFloat)elapsed+=dt;
    if(dirty || current!==previous) {
      // The opening halo faces the neutral camera, so a resize or still
      // export during an idle hold cannot rotate it to a different phase.
      aimCamera(cameraMotion);
      pose(current);
    }
    aimCamera(cameraMotion,canFloat?Math.sin(elapsed*.5):0);
    draw();
    if (previousTime) {
      frames.push(time - previousTime); if (frames.length > 90) frames.shift();
      if (frames.length > 10) canvas.dataset.fps = String(Math.round(1000 / (frames.reduce((a,b)=>a+b,0)/frames.length)));
    }
    previousTime = time;
    canvas.dataset.triangles = String(renderer.info.render.triangles);
    canvas.dataset.drawCalls = String(renderer.info.render.calls);
    canvas.dataset.progress = current.toFixed(3);
    dirty = false;
    if (current !== target || velocity!==0 || settling || (canFloat && drift.lengthSq()>0)) schedule();
    else { previousTime = 0; animationTime=0; }
  }
  function schedule() { if (!frame && !disposed && active && !document.hidden) frame = requestAnimationFrame(render); }
  function visibility() { if (document.hidden) { cancelAnimationFrame(frame); frame=0; previousTime=0; animationTime=0; } else { dirty=true; schedule(); } }
  function contextLost(event) { event.preventDefault(); active=false; modelReady=false; cancelAnimationFrame(frame); frame=0; onFailure(); }
  canvas.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', visibility);
  observer.observe(container); resize();
  aimCamera(frameAt(0));pose(0);draw();

  return {
    setProgress(p, immediate = false) {
      if(inspectionYaw!==null){inspectionYaw=null;dirty=true;}
      target=clamp(p,0,1);
      if(immediate){current=target;velocity=0;resetCamera=true;dirty=true;}
      if(current!==target || velocity!==0 || goalProgress!==target || dirty)schedule();
    },
    setMotto(text) { garment.updateMotto(text); dirty=true; schedule(); },
    setActive(value) { active=value; if(value) { dirty=true; schedule(); } else { cancelAnimationFrame(frame);frame=0;previousTime=0;animationTime=0; } },
    setReducedMotion(value) { reducedMotion=value; dirty=true; schedule(); },
    inspect(yaw) { inspectionYaw=yaw;current=target=0;velocity=0;resetCamera=true;dirty=true;schedule(); },
    capture(p = 0, yaw = null) {
      const oldAspect = camera.aspect;
      const oldYaw = inspectionYaw; inspectionYaw = yaw;
      renderer.setPixelRatio(1); renderer.setSize(1200,1400,false); camera.aspect=1200/1400; camera.updateProjectionMatrix();
      try {
        aimCamera(frameAt(p));pose(p,false);draw();
        return canvas.toDataURL('image/png');
      } finally {
        inspectionYaw=oldYaw;camera.aspect=oldAspect;resize();
      }
    },
    dispose() {
      disposed=true; cancelAnimationFrame(frame);observer.disconnect();
      document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',contextLost);
      reflection.dispose();stoneReflection?.dispose();garment.dispose();spill.geometry.dispose();spill.material.dispose();ring.geometry.dispose();ring.material.dispose();renderer.dispose();canvas.remove();
    }
  };
}
