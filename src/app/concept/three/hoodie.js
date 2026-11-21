import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { cottonMaterial } from './fabric.js';
import { makeEmbroideryTextures } from './garment.js';
import { createWovenLabelMaterial } from './wovenLabel.js';
import { createZipperPull } from './zipper.js';
import { createPocketZippers } from './pocketZippers.js';

// The neckline rises towards the back of the head. Its measured opening
// and the underside of the jaw bound the part of the stone that can twist.
function openingHeadPose(material,weight) {
  const previous=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
    previous(shader,renderer);shader.uniforms.openingPose=weight;
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      uniform float openingPose;
      const vec3 neckPivot=vec3(-.005,.55,-.065);
      const vec3 neckAxis=normalize(vec3(.03,1.,.12));
      vec3 turnHead(vec3 v,vec2 cs){
        return cs.x*v+cs.y*cross(neckAxis,v)+(1.-cs.x)*dot(neckAxis,v)*neckAxis;
      }`).replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
        vec3 neckShift=vec3(0.);
        if(openingPose>0. && position.y>.435) {
          // Each pair gives the heights of the collar and the rigid skull.
          const vec2 backHeights=vec2(.580,.634),frontHeights=vec2(.435,.552);
          float depth=clamp((position.z+.20)/.35,0.,1.);
          vec2 heights=mix(backHeights,frontHeights,depth*depth*(3.-2.*depth));
          float span=heights.y-heights.x;
          float t=clamp((position.y-heights.x)/span,0.,1.);
          float fullTurn=.46*openingPose;
          float angle=fullTurn*t*t*(3.-2.*t);
          vec2 rotation=vec2(cos(angle),sin(angle));
          vec3 offset=position-neckPivot;
          neckShift=turnHead(offset,rotation)-offset;
          // Use the inverse transpose of the twist for the neck normals.
          // A rigid rotation here draws a false diagonal across the throat.
          vec2 slopes=(frontHeights-backHeights)*(6.*depth*(1.-depth)/.35);
          float dAngleDy=fullTurn*6.*t*(1.-t)/span;
          vec3 gradient=vec3(0.,dAngleDy,-mix(slopes.x,slopes.y,t)*dAngleDy);
          vec3 sweep=cross(neckAxis,offset);
          objectNormal-=gradient*(dot(sweep,objectNormal)/(1.+dot(sweep,gradient)));
          objectNormal=turnHead(objectNormal,rotation);
        }`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        transformed+=neckShift;`);
  };
  material.customProgramCacheKey=()=>key+'-opening-neck-v2';
  return material;
}

/** Model-backed garment adapter: the scene need not know how the asset was made. */
export function createHoodie({ motto, stoneEnvironment, onLoad, onError }) {
  const group = new THREE.Group();
  group.name = 'IKIKAE charcoal zip hoodie on a graphite-finished sculpture';
  const badgeTarget = new THREE.Vector3(.40, 1.03, .5);
  const embroideryTarget = new THREE.Vector3(.51, -.68, .5);
  const embroideryNormal = new THREE.Vector3(0,0,1);
  const embroidery = makeEmbroideryTextures(motto);
  const openingPose={value:1};
  let disposed = false;
  const resources = new Set([embroidery.colorMap, embroidery.bumpMap]);
  function collect(model) {
    model.traverse(object => {
      if (!object.isMesh) return;
      resources.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        resources.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
      }
    });
  }
  const sculpture=new GLTFLoader().loadAsync('/concept/hoodie-sculpture-patina.glb');
  Promise.all([sculpture,stoneEnvironment]).then(([gltf,environment])=>{
    const model = gltf.scene;
    collect(model);
    if (disposed) { resources.forEach(resource => resource.dispose()); return; }
    model.traverse(object=>{
      if(!object.isMesh) return;
      function revise(material) {
        if (material.name==='Musée graphite sculpture') {
          material.envMap=environment;
          return openingHeadPose(material,openingPose);
        }
        if (material.name==='Original dark zipper hardware') return material;
        const fabric=cottonMaterial(material);
        resources.add(fabric);
        return fabric;
      }
      object.material=Array.isArray(object.material)?object.material.map(revise):revise(object.material);
    });
    const bounds = new THREE.Box3().setFromObject(model);
    // The photographed torso is the framing reference. Asymmetrical sleeve
    // folds can change the silhouette bounds without moving the body or logo.
    const center = model.userData.framingCenter
      ? new THREE.Vector3().fromArray(model.userData.framingCenter)
      : bounds.getCenter(new THREE.Vector3());
    const scale = 5.4 / bounds.getSize(new THREE.Vector3()).y;
    model.scale.setScalar(scale);
    model.position.copy(center).multiplyScalar(-scale); model.position.y += .3;
    // Build the surface decal before parenting into the rotating scene assembly.
    model.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(embroideryTarget.x, embroideryTarget.y, 5), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(model, true)[0];
    if (!hit) { onError(new Error('Hoodie embroidery surface not found')); return; }
    embroideryTarget.copy(hit.point);
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    embroideryNormal.copy(normal);
    const projector = new THREE.Object3D(); projector.position.copy(hit.point); projector.lookAt(hit.point.clone().add(normal));
    const geometry = new DecalGeometry(hit.object, hit.point, projector.rotation, new THREE.Vector3(.76, .19, .22));
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff, map: embroidery.colorMap, bumpMap: embroidery.bumpMap,
      bumpScale: .00115, roughness: .55, metalness: 0, transparent: true,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
      alphaTest: .015,
    });
    const decal = new THREE.Mesh(geometry, material); decal.name = 'Surface stitched motto'; decal.renderOrder = 1;
    resources.add(geometry); resources.add(material);
    // A real surface label uses exact brand lettering instead of generated text.
    const brandRay = new THREE.Raycaster(new THREE.Vector3(badgeTarget.x, badgeTarget.y, 5), new THREE.Vector3(0, 0, -1));
    const brandHit = brandRay.intersectObject(model, true)[0];
    if (brandHit) {
      badgeTarget.copy(brandHit.point);
      const n = brandHit.face.normal.clone().transformDirection(brandHit.object.matrixWorld);
      const transform = new THREE.Object3D(); transform.position.copy(brandHit.point); transform.lookAt(brandHit.point.clone().add(n));
      const badgeGeometry = new DecalGeometry(brandHit.object, brandHit.point, transform.rotation, new THREE.Vector3(.48, .20, .18));
      const badgeMaterial = createWovenLabelMaterial();
      const badge = new THREE.Mesh(badgeGeometry, badgeMaterial); badge.renderOrder = 1; badge.name = 'IKIKAE woven chest label';
      group.add(badge); collect(badge);
    }
    const zipperPull = createZipperPull(model);
    collect(zipperPull);
    const pockets = createPocketZippers(model);
    collect(pockets);
    group.add(model, decal, zipperPull, pockets);
    onLoad();
  }).catch(error => { if (!disposed) onError(error); });
  return {
    group, embroideryTarget, embroideryNormal, badgeTarget,
    setOpeningPose(weight){openingPose.value=weight;},
    updateMotto(value) { embroidery.draw(value); },
    dispose() { disposed = true; resources.forEach(resource => resource.dispose()); group.clear(); },
  };
}
