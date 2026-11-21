import assert from 'node:assert/strict';
import test from 'node:test';
import { Triangle, Vector3 } from 'three';
import { clothOcclusion } from '../scripts/bake-cloth-visibility.mjs';

test('a close overhang shades the cloth underneath; outside and reverse-facing cloth stay open',()=>{
  const points=[new Vector3(),new Vector3(),new Vector3(.4,0,0),new Vector3()];
  const normals=[new Vector3(0,1,0),new Vector3(0,1,0),new Vector3(0,1,0),new Vector3(0,-1,0)];
  const corners=[[-.2,.02,-.2],[.2,.02,-.2],[.2,.02,.2],[-.2,.02,.2]].map(p=>new Vector3(...p));
  const overhang=[new Triangle(corners[0],corners[1],corners[2]),new Triangle(corners[0],corners[2],corners[3])];
  const visibility=clothOcclusion(points,normals,new Set([0,1,2]),overhang);
  assert.ok(visibility[0]>180,'nearby canopy should strongly occlude indirect illumination');
  assert.equal(visibility[1],visibility[0],'atlas splits should have identical occlusion');
  assert.equal(visibility[2],0,'adjacent exposed panel should remain neutral');
  assert.equal(clothOcclusion(points,normals,new Set([3]),overhang)[3],0,'no occlusion from behind');
});
