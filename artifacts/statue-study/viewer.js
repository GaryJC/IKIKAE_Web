import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setClearColor(0xe9e7e2);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.01, 100);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = false;
controls.minDistance = 1;
controls.maxDistance = 15;
scene.add(new THREE.HemisphereLight(0xffffff, 0x77746c, 1.2));
for (const [position, intensity] of [[[3, 5, 4], 3], [[-4, 2, -3], 2], [[-3, 0, 3], 0.4]]) {
  const light = new THREE.DirectionalLight(0xffffff, intensity); light.position.set(...position); scene.add(light);
}
const clay = new THREE.MeshStandardMaterial({ color: 0xc9c5ba, roughness: 0.85 });
const originals = new Map();
let distance = 5.8;
function render() { if (!document.hidden) renderer.render(scene, camera); }
function view(name) {
  if (name === 'face') {
    camera.position.set(0, 1.0, 2.1); controls.target.set(0, .94, 0); controls.update(); render();
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
    return;
  }
  const azimuth = { front: 0, side: Math.PI / 2, back: Math.PI }[name];
  camera.position.set(Math.sin(azimuth) * distance, 0.18, Math.cos(azimuth) * distance);
  controls.target.set(0, 0, 0); controls.update(); render();
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  distance = Math.max(5.8, 3.8 / camera.aspect);
  camera.position.sub(controls.target).normalize().multiplyScalar(distance).add(controls.target);
  controls.update(); render();
}
controls.addEventListener('change', render);
addEventListener('resize', resize);
document.addEventListener('visibilitychange', render);
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => view(button.dataset.view));
document.querySelector('#material').onclick = e => {
  const enabled = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(enabled));
  originals.forEach((material, mesh) => { mesh.material = enabled ? clay : material; }); render();
};
resize(); view('front');
const modelUrl = new URLSearchParams(location.search).get('model') === 'hoodie' ? '/hoodie.glb' : '/statue.glb';
document.querySelector('header a').href = modelUrl;
new GLTFLoader().load(modelUrl, gltf => {
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 2.6 / size.y;
  model.position.copy(center).multiplyScalar(-scale); model.scale.setScalar(scale);
  let triangles = 0;
  model.traverse(mesh => { if (mesh.isMesh) { originals.set(mesh, mesh.material); triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3; } });
  scene.add(model); document.querySelector('#status').remove();
  document.querySelector('#details').textContent = `${Math.round(triangles).toLocaleString()} triangles · Drag to rotate`;
  render();
}, undefined, error => { document.querySelector('#status').textContent = 'Model could not load.'; console.error(error); });
