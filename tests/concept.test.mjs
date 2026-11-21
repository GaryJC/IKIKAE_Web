import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import {
  CONCEPT_DRAFT_KEY,
  normalizeMotto,
  readConceptDraft,
  writeConceptDraft,
  clearConceptDraft,
} from '../src/lib/conceptDraft.js';
import { createGarment } from '../src/app/concept/three/garment.js';
import { createMannequin } from '../src/app/concept/three/mannequin.js';
import { scenePose } from '../src/app/concept/three/scene.js';
import { STORY_STOPS, advanceProgress, createCameraMotion, storyState, SHOT_BOUNDARIES, cameraFrame } from '../src/app/concept/three/timeline.js';

test('garment and lighting weights ease continuously into each held chapter', () => {
  const e=1e-6;
  for(const p of SHOT_BOUNDARIES.slice(1,-1)) {
    const a=scenePose(p-e),b=scenePose(p),c=scenePose(p+e);
    for(const key of Object.keys(b)) {
      assert.ok(Math.abs((b[key]-a[key])/e-(c[key]-b[key])/e)<.01, `${p}: ${key} velocity`);
    }
  }
  assert.deepEqual(scenePose(1.01),scenePose(1));
});

test('progress smoothing is refresh-rate independent and converges without overshoot', () => {
  const advance=hz=>{
    let state=[0,0];
    for(let i=0;i<hz/2;i++)state=advanceProgress(...state,1,1/hz);
    return state;
  };
  const [position,velocity]=advance(30),fine=advance(120);
  assert.ok(Math.abs(position-fine[0])<1e-9 && Math.abs(velocity-fine[1])<1e-9);
  // Reversing the target preserves velocity, then brakes and returns to zero.
  const [next,speed]=advanceProgress(position,velocity,0,1e-5);
  assert.ok(next>=position && Math.abs(speed-velocity)<.01);
  let state=[1,0];
  for(let i=0;i<300;i++){
    const moved=advanceProgress(...state,0,1/60);assert.ok(moved[0]>=0 && moved[0]<=state[0]);state=moved;
  }
  assert.deepEqual(state,[0,0]);
});

test('each chapter has a distinct held composition and copy stays out of transitions', () => {
  for(const p of [.22,.55,.88]){
    const s=storyState(p);assert.equal(s.hero+s.detail+s.editor+s.final,0);
  }
  assert.equal(storyState(.38).detail,1);
  assert.equal(storyState(.72).editor,1);
  assert.equal(storyState(.97).cta,0);
  assert.equal(storyState(1).cta,1);
  assert.equal(scenePose(.38).close,0);
  assert.equal(scenePose(.72).close,1);
  assert.notEqual(scenePose(.38).rotation,scenePose(.72).rotation);
});

test('actual camera path keeps clearance, finite framing and continuous motion on both layouts',()=>{
  for(const aspect of [1022/765,390/469]){
    const frame=p=>cameraFrame(p,aspect,[.55,-.85,.5],[.1,.3,1]);
    for(let i=0;i<=1000;i++){
      const f=frame(i/1000);
      assert.ok([...f.position,...f.target].every(Number.isFinite));
      assert.ok(f.radius>=1.45-1e-10);
      assert.ok(f.position[2]-f.target[2]>1.3,'camera remains in front of cloth');
      if(i){const previous=frame((i-1)/1000);assert.ok(Math.hypot(...f.position.map((v,k)=>v-previous.position[k]))<.12,'no camera jump');}
    }
  }
});

test('scroll immediately moves the camera goal and a reversal carries its world velocity',()=>{
  const frame=p=>cameraFrame(p,1.34,[.55,-.85,.5],[.1,.3,1]);
  const start=frame(0),end=frame(.38),firstInput=frame(.038);
  for(const key of ['position','target']){
    for(let axis=0;axis<3;axis++){
      assert.ok(Math.abs(firstInput[key][axis]-(start[key][axis]*.9+end[key][axis]*.1))<1e-12);
    }
  }
  const motion=createCameraMotion(start);
  motion.step(end,.15);
  const before=[...motion.position],dt=.00001;
  motion.step(end,dt);
  const turn=[...motion.position];
  motion.step(start,dt);
  for(let axis=0;axis<3;axis++){
    const incoming=(turn[axis]-before[axis])/dt;
    const outgoing=(motion.position[axis]-turn[axis])/dt;
    assert.ok(Math.abs(outgoing-incoming)<.01,'world-space velocity stays continuous');
  }
  const eyeZ=motion.position[2];
  motion.step(start,1/60);
  assert.ok(motion.position[2]<eyeZ,'the dolly brakes before reversing');
  for(let i=0;i<400;i++)motion.step(start,1/60);
  assert.equal(motion.step(start,1/60),false);
  assert.deepEqual(motion.position,start.position);
  // An immediate seek / reduced-motion update also clears any residual drift.
  motion.step(end,.12);
  motion.step(start,0,true);
  assert.equal(motion.step(start,1/60),false);
  assert.deepEqual(motion.drift,start.drift);
});

function replaceWindow(t, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  if (value === undefined) delete globalThis.window;
  else Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else delete globalThis.window;
  });
}

test('motto input limits visible graphemes without breaking Unicode characters', () => {
  for (const character of ['汉', 'e\u0301', '👨‍👩‍👧‍👦', '👍🏽', '🇨🇳']) {
    assert.equal(normalizeMotto(character.repeat(30)), character.repeat(24));
  }
  assert.equal(normalizeMotto('Stay in it.'), 'Stay in it.');
  assert.equal(normalizeMotto('初心\n不改\t向前'), '初心 不改 向前');
  assert.equal(normalizeMotto(null), '');
  assert.equal(normalizeMotto(undefined), '');
  assert.equal(normalizeMotto('one '), 'one ', 'typing a space must remain possible');
});

test('motto segmentation fallback retains combining marks and joined emoji', (t) => {
  const segmenter = Intl.Segmenter;
  Intl.Segmenter = undefined;
  t.after(() => { Intl.Segmenter = segmenter; });
  for (const character of ['汉', 'e\u0301', '👨‍👩‍👧‍👦', '👍🏽']) {
    assert.equal(normalizeMotto(character.repeat(30)), character.repeat(24));
  }
});

test('draft helpers are safe during server rendering without window', (t) => {
  replaceWindow(t, undefined);
  assert.equal(readConceptDraft(), '');
  assert.equal(writeConceptDraft('Stay in it.'), false);
  assert.doesNotThrow(() => clearConceptDraft());
});

test('draft round-trip stores a bounded plain string and clears only its key', (t) => {
  const storage = new Map([['unrelated', 'keep me']]);
  replaceWindow(t, {
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  });
  assert.equal(readConceptDraft(), '');
  assert.equal(writeConceptDraft('初心不改'), true);
  assert.equal(storage.get(CONCEPT_DRAFT_KEY), '初心不改');
  assert.equal(readConceptDraft(), '初心不改');
  assert.equal(writeConceptDraft('梦'.repeat(40)), true);
  assert.equal(storage.get(CONCEPT_DRAFT_KEY), '梦'.repeat(24));
  storage.set(CONCEPT_DRAFT_KEY, 'x'.repeat(100));
  assert.equal(readConceptDraft(), 'x'.repeat(24), 'untrusted stored values are bounded on read');
  clearConceptDraft();
  assert.equal(readConceptDraft(), '');
  assert.equal(storage.get('unrelated'), 'keep me');
});

test('blocked storage methods and a throwing storage getter do not break the page', (t) => {
  const denied = () => { throw new Error('Storage access denied'); };
  const fakeWindow = { sessionStorage: { getItem: denied, setItem: denied, removeItem: denied } };
  replaceWindow(t, fakeWindow);
  function assertSafe() {
    assert.equal(readConceptDraft(), '');
    assert.equal(writeConceptDraft('Your words'), false);
    assert.doesNotThrow(() => clearConceptDraft());
  }
  assertSafe();
  Object.defineProperty(fakeWindow, 'sessionStorage', { configurable: true, get: denied });
  assertSafe();
});

test('untextured garment is valid, volumetric geometry within the triangle budget', (t) => {
  const garment = createGarment({ textures: false });
  t.after(() => garment.dispose());
  let triangles = 0;
  let meshCount = 0;
  garment.group.traverse((object) => {
    if (!object.isMesh) return;
    meshCount += 1;
    const geometry = object.geometry;
    const positions = geometry.getAttribute('position');
    assert.ok(positions?.count > 0, `${object.name}: positions exist`);
    for (const name of ['position', 'normal', 'uv']) {
      const attribute = geometry.getAttribute(name);
      assert.ok(attribute, `${object.name}: ${name} exists`);
      assert.equal(attribute.count, positions.count, `${object.name}: ${name} vertex count matches`);
      for (const value of attribute.array) {
        assert.ok(Number.isFinite(value), `${object.name}: finite ${name}`);
      }
    }
    const index = geometry.getIndex();
    if (index) {
      assert.equal(index.count % 3, 0);
      for (const vertex of index.array) assert.ok(vertex >= 0 && vertex < positions.count, `${object.name}: index in range`);
    }
    triangles += (index ? index.count : positions.count) / 3;
  });
  assert.ok(meshCount >= 6, 'body, sleeves, collar and details are actual meshes');
  assert.equal(garment.triangleCount, triangles);
  assert.ok(triangles > 1000 && triangles < 60000, `triangle budget: ${triangles}`);
  const bounds = new Box3().setFromObject(garment.group);
  const size = bounds.getSize(new Vector3());
  assert.ok(size.x > 3 && size.x < 5, `full sleeve span: ${size.x}`);
  assert.ok(size.y > 2.5 && size.y < 4, `shirt length: ${size.y}`);
  assert.ok(size.z > 0.9 && size.z < 1.7, `chest and back have wearable volume: ${size.z}`);
  assert.ok(bounds.min.z < -0.15 && bounds.max.z > 0.15, 'front and back surround the centre plane');
  assert.doesNotThrow(() => garment.updateMotto('只管向前'), 'headless mode requires no canvas');
});

test('sculptural mannequin has a solid chest and back and fits the scene budget', (t) => {
  const mannequin = createMannequin();
  const garment = createGarment({ textures: false });
  t.after(() => { mannequin.dispose(); garment.dispose(); });
  const chest = new Box3();
  const point = new Vector3();
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  const cross = new Vector3(), edge = new Vector3(), centre = new Vector3(0,2.4,0);
  let headFlux = 0;
  mannequin.group.updateMatrixWorld(true);
  mannequin.group.traverse((object) => {
    if (!object.isMesh) return;
    const positions = object.geometry.getAttribute('position');
    for (let i=0;i<positions.count;i++) {
      point.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);
      assert.ok(point.toArray().every(Number.isFinite));
      if (Math.abs(point.x)<.75 && point.y>.2 && point.y<.9) chest.expandByPoint(point);
    }
    const index = object.geometry.index;
    for (let i=0;i<index.count;i+=3) {
      a.fromBufferAttribute(positions,index.getX(i));
      b.fromBufferAttribute(positions,index.getX(i+1));
      c.fromBufferAttribute(positions,index.getX(i+2));
      if (Math.min(a.y,b.y,c.y)<=1.8) continue;
      cross.subVectors(b,a).cross(edge.subVectors(c,a));
      headFlux += cross.dot(point.copy(a).add(b).add(c).multiplyScalar(1/3).sub(centre));
    }
  });
  assert.ok(!chest.isEmpty(), 'a complete torso exists underneath the garment');
  assert.ok(chest.max.z-chest.min.z > .8, 'chest is volumetric in side view');
  assert.ok(chest.min.z < -.3 && chest.max.z > .3, 'both chest and back exist');
  assert.ok(headFlux > .1, 'scanned head faces point outward after coordinate conversion');
  assert.ok(mannequin.triangleCount+garment.triangleCount+4608 < 60000, 'garment, mannequin and halo remain within budget');
});

test('embroidery focus lies on the front lower hem, on the wearer’s left', (t) => {
  const garment = createGarment({ textures: false });
  t.after(() => garment.dispose());
  const bounds = new Box3().setFromObject(garment.group);
  const target = garment.embroideryTarget;
  assert.ok(target.toArray().every(Number.isFinite));
  assert.ok(target.x > 0 && target.x < 1.05, 'wearer’s left is positive X in front view');
  assert.ok(target.y > bounds.min.y && target.y < bounds.min.y + 0.65, 'focus is above the hem in the lower shirt');
  assert.ok(target.z > 0.15 && target.z <= bounds.max.z + 0.01, 'focus sits on the front surface');
});

test('camera path has hero endpoints and clamps out-of-range progress', () => {
  const first = scenePose(0);
  const last = scenePose(1);
  assert.equal(first.close, 0);
  assert.equal(last.close, 0);
  assert.ok(Math.abs(first.rotation) < Math.PI / 4);
  assert.ok(Math.abs(last.rotation) < Math.PI / 4);
  assert.deepEqual(scenePose(-1), first);
  assert.deepEqual(scenePose(2), last);
});

test('camera path is continuous at transitions and the editorial aim settles at its stop', () => {
  const epsilon = 1e-5;
  for (const progress of SHOT_BOUNDARIES.slice(1,-1)) {
    const before = scenePose(progress - epsilon);
    const at = scenePose(progress);
    const after = scenePose(progress + epsilon);
    for (const key of ['rotation', 'close']) {
      assert.ok(Math.abs(before[key] - at[key]) < .001, `${key} left continuity at ${progress}`);
      assert.ok(Math.abs(after[key] - at[key]) < .001, `${key} right continuity at ${progress}`);
    }
  }
  const macroPose = scenePose(0.72);
  assert.equal(macroPose.close, 1);
  assert.ok(scenePose(.68).close<macroPose.close && scenePose(.76).close<macroPose.close);
  assert.deepEqual(scenePose(STORY_STOPS[2]),macroPose);
});

test('camera poses remain bounded and reverse scrolling retraces the same path', () => {
  const forward = Array.from({ length: 1001 }, (_, index) => scenePose(index / 1000));
  forward.forEach((pose, index) => {
    assert.ok(Number.isFinite(pose.rotation) && Number.isFinite(pose.close));
    assert.ok(pose.close >= 0 && pose.close <= 1);
    if (index) {
      assert.ok(Math.abs(pose.rotation - forward[index - 1].rotation) < 0.02, 'no rotation jump between adjacent samples');
      assert.ok(Math.abs(pose.close - forward[index - 1].close) < 0.02, 'no zoom jump between adjacent samples');
    }
  });
  for (let index = 1000; index >= 0; index -= 1) {
    assert.deepEqual(scenePose(index / 1000), forward[index], `reverse progress ${index / 1000}`);
  }
});

test('chapter three lands on the sewn panel directly and holds through editing',()=>{
  const focus=[.55,-.72,.5], normal=[.1,.3,1];
  for(const aspect of [1.34,.83]){
    const frame=p=>cameraFrame(p,aspect,focus,normal);
    const stitch=frame(.72);
    assert.ok(Math.hypot(...stitch.target.map((v,i)=>v-focus[i]))<.07);
    assert.ok(stitch.position[0]>stitch.target[0], 'maintains three-quarter approach');
    // Keep the opening waist-up, distinct from the shoulder close-up.
    assert.ok(frame(0).radius>frame(.38).radius*1.45 && frame(0).target[1]<1.2);
    assert.ok(frame(.38).target[1]-stitch.target[1]>1.6);
    assert.ok(Math.hypot(...frame(.38).target.map((v,i)=>v-[.40,1.03,.5][i]))<.2);
    const expectedHemRadius=Math.max(1.48,.76/(2*Math.tan(17*Math.PI/180)*aspect*.50));
    assert.ok(Math.abs(stitch.radius-expectedHemRadius)<1e-8);
    // Descend from the chest without reversing the zoom. The narrow
    // viewport needs extra distance to keep the inscription fully visible.
    let previous=frame(.38);
    const direction=Math.sign(stitch.radius-previous.radius);
    for(let i=1;i<=50;i++){
      const next=frame(.38+.34*i/50);
      assert.ok(direction*(next.radius-previous.radius)>=-1e-9 && next.target[1]<=previous.target[1]+1e-9);
      previous=next;
    }
  }
});

test('closing portrait rises above the face on the opposite side of the shoulder study',()=>{
  for(const aspect of [1.34,.83]){
    const frame=p=>cameraFrame(p,aspect,[.51,-.68,.63],[.38,-.02,.93]);
    const finish=frame(1);
    assert.ok(finish.position[0]<finish.target[0]-1.5 && finish.position[1]>finish.target[1]+1.1);
    assert.ok(finish.target[1]>2 && finish.radius<frame(0).radius);
    assert.deepEqual(finish,frame(1.01));
  }
});

test('chapter copy follows orbit, descent and return, and rests at every reading stop',()=>{
  for(const p of [0,.38,.72,1]){
    const state=storyState(p);
    assert.ok(Math.hypot(state.copyX,state.copyY)<.001);
  }
  assert.ok(storyState(.16).copyX<0 && storyState(.29).copyX>0);
  assert.ok(storyState(.49).copyY<0);
  let previousY=storyState(.565).copyY;
  assert.ok(previousY<0);
  for(const p of [.58,.60,.62,.64,.66,.68]){
    const {copyX,copyY}=storyState(p);
    assert.equal(copyX,0);
    assert.ok(copyY>previousY && copyY<=0);
    previousY=copyY;
  }
  assert.equal(Math.abs(previousY),0);
  for(const [start,end] of [[.80,.875],[.88,.98]]){
    let y=storyState(start).copyY;
    for(let i=1;i<=8;i++){
      const next=storyState(start+(end-start)*i/8);
      assert.equal(next.copyX,0);
      assert.ok(next.copyY<y);
      y=next.copyY;
    }
  }
  assert.ok(storyState(.84).copyY<0 && storyState(.94).copyY>0);
  assert.equal(storyState(.98).copyY,0);
});

test('idle travel is lateral, restrained at the embroidery, and silent in the middle of changes',()=>{
  const frame=(p,aspect=1.4)=>cameraFrame(p,aspect,[.51,-.68,.63],[.38,-.02,.93]);
  for(const [i,p] of STORY_STOPS.entries()){
    const f=frame(p),axis=new Vector3().fromArray(f.drift);
    const sight=new Vector3().fromArray(f.position).sub(new Vector3().fromArray(f.target));
    assert.ok(axis.length()/f.radius>.02 && axis.length()/f.radius<.065);
    assert.ok(Math.abs(sight.dot(axis))<1e-10);
    assert.ok(Math.hypot(...frame(p,.65).drift)/frame(p,.65).radius < axis.length()/f.radius);
    if(i>0)assert.equal(Math.hypot(...frame((p+STORY_STOPS[i-1])/2).drift),0);
  }
  assert.ok(Math.hypot(...frame(.72).drift)<Math.hypot(...frame(.38).drift));
});
