// Reapply the garment finishes to the original posed topology. Historical
// preview meshes remain available as the before images for matched-camera QA.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {finishSourceWaist} from './finish-source-waist.mjs';
import {refineSourceShoulders} from './refine-source-shoulders.mjs';
import {refineHoodCollar} from './refine-hood-collar.mjs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const collar=process.argv.includes('--collar');
const textile=collar || process.argv.includes('--textile');
const directory=mkdtempSync(join(tmpdir(),'ikikae-source-detail-'));
function run(script,...args){
  execFileSync(process.execPath,[fileURLToPath(new URL(script,import.meta.url)),...args],{
    env:{...process.env,IKIKAE_CLOTH_BUILD_DIR:directory},stdio:'inherit'
  });
}
try {
  run('optimize-concept-glb.mjs',
    fileURLToPath(new URL('../artifacts/hoodie-study/hoodie-posed-source.glb',import.meta.url)),
    join(directory,'hoodie-sculpture-posed.glb'),'--keep-source-mesh',...(textile?['--native-textures']:[]));
  for(const args of [[],['--drape'],['--tailor']])run('refine-concept-cloth.mjs',...args);
  run('straighten-concept-pose.mjs');
  run('finish-concept-cloth.mjs');
  const dense=readFileSync(join(directory,'hoodie-sculpture-crest.glb'));
  const approved=readFileSync(new URL('../public/concept/hoodie-sculpture-crest.glb',import.meta.url));
  const fitted=finishSourceWaist(dense,approved);
  const garment=textile?refineSourceShoulders(fitted):fitted;
  const name=collar?'collar':textile?'textile':'master';
  writeFileSync(new URL('../public/concept/hoodie-sculpture-'+name+'.glb',import.meta.url),collar?refineHoodCollar(garment):garment);
} finally {
  rmSync(directory,{recursive:true,force:true});
}
