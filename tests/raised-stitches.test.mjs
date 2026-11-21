import test from 'node:test';
import assert from 'node:assert/strict';
import {PlaneGeometry,Vector3} from 'three';
import {planStitches,raisedThreadGeometry} from '../src/app/concept/three/raisedStitches.js';

test('satin changes needle direction when the pen stroke turns, with finite tapered arches',()=>{
  const width=150,height=140,alpha=new Uint8Array(width*height*4);
  for(let y=18;y<110;y++)for(let x=20;x<120;x++){
    if(x<35 || y>94) alpha[(width*y+x)*4+3]=255;
  }
  const paths=planStitches(alpha,width,height);
  const vertical=paths.filter(p=>p.start[1]<86 && p.end[1]<86);
  const horizontal=paths.filter(p=>p.start[0]>42 && p.end[0]>42);
  const alongX=p=>Math.abs(p.end[0]-p.start[0])>Math.abs(p.end[1]-p.start[1]);
  assert.ok(vertical.length>=4 && vertical.filter(alongX).length>=vertical.length*.75);
  assert.ok(horizontal.length>=4 && horizontal.filter(alongX).length<=horizontal.length*.25);
  const plane=new PlaneGeometry(.76,.19),geometry=raisedThreadGeometry(plane,paths,new Vector3(0,0,1));
  const pos=geometry.getAttribute('position');
  for(let i=0;i<pos.count;i+=12){
    assert.ok(pos.getZ(i+4)>pos.getZ(i+1)+.002,'crest stands above needle entry');
    assert.ok(pos.getZ(i+4)>pos.getZ(i+3)+.001,'crest has a curved cross-section');
  }
  assert.ok(pos.count>=12 && pos.array.every(Number.isFinite));
  const busy=raisedThreadGeometry(plane,Array.from({length:400},(_,i)=>paths[i%paths.length]),new Vector3(0,0,1));
  assert.equal(busy.index.count/3,2760,'long text respects geometry budget');
  busy.dispose();geometry.dispose();plane.dispose();
});
