import * as THREE from "three";

// Model coordinates: metres are deliberately abstract. +Z is the front,
// the hem is -1.6 and the shoulder/neck ridge reaches 1.56. All embellishments use
// the garment's own surface sampler, so they remain attached while it turns.
const HEM = -1.6;
const ARM_BOTTOM = -0.08;
const ARM_TOP = 1.28;
const ARM_CENTER = (ARM_BOTTOM + ARM_TOP) / 2;
const NECK_U = 0.36;
const ARM_DEPTH_FRONT = 0.47;
const ARM_DEPTH_BACK = 0.48;
const BODY_COLUMNS = 40;
const LOWER_ROWS = 34;
const UPPER_ROWS = 20;
const SLEEVE_RINGS = 10;
const SLEEVE_POINTS = UPPER_ROWS * 2;
const lerp = THREE.MathUtils.lerp;
const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);

function sectionAt(y, rows) {
  let index = 0;
  while (index < rows.length - 2 && y > rows[index + 1][0]) index += 1;
  const a = rows[index];
  const b = rows[index + 1];
  return lerp(a[1], b[1], smooth(a[0], b[0], y));
}

function bodyWidth(y) {
  // A broad rib cage and a quieter waist keep the cloth supported by a body.
  // The shape is not a uniform depth-scaled version of the hanging shirt.
  return sectionAt(y, [[HEM, 1.075], [-0.68, 1.055], [0.1, 1.18], [0.63, 1.28], [1.56, 1.2]]);
}

function neckline(u, front) {
  const x = Math.abs(u);
  if (x <= NECK_U) {
    return 1.56 - (front ? 0.42 : 0.08) * Math.sqrt(Math.max(0, 1 - (x / NECK_U) ** 2));
  }
  const shoulderT = (x - NECK_U) / (1 - NECK_U);
  return 1.56 - 0.28 * shoulderT ** 0.85 + 0.045 * Math.sin(Math.PI * shoulderT);
}

/** Analytic front/back surface shared by the body, seams and embroidery. */
export function sampleGarmentSurface(u, y, front = true) {
  const sign = front ? 1 : -1;
  const abs = Math.abs(u);
  const top = neckline(u, front);
  // A superellipse gives the chest a broad front plane and rounded sides.
  // Separate chest/back profiles avoid a balloon or an inflated flat slab.
  const crossSection = Math.max(0, 1 - Math.abs(u) ** 2.7) ** (1 / 2.7);
  const depth = front
    ? sectionAt(y, [[HEM, 0.55], [-1.2, 0.56], [-0.6, 0.61], [0, 0.615], [0.6, 0.67], [1.56, 0.56]])
    : sectionAt(y, [[HEM, 0.58], [-1.1, 0.615], [-0.6, 0.49], [0, 0.56], [0.65, 0.67], [1.56, 0.54]]);
  // A circular shoulder crown has an upward-facing normal at its top.
  // Smoothstep-to-zero created a knife edge with front/back-facing normals.
  const crownT = THREE.MathUtils.clamp((top - y) / 0.37, 0, 1);
  const crown = Math.sqrt(Math.max(0, 2 * crownT - crownT * crownT));
  const neckDepth = abs < NECK_U
    ? (front ? 0.4 : 0.34) * Math.sqrt(Math.max(0, 1 - (abs / NECK_U) ** 2))
    : 0;
  let z = lerp(neckDepth, depth * crossSection, crown);

  // The armhole boundary is an ellipse, shared exactly by the sleeve root.
  if (y > ARM_BOTTOM && y < ARM_TOP) {
    const h = (y - ARM_CENTER) / ((ARM_TOP - ARM_BOTTOM) / 2);
    z += (front ? ARM_DEPTH_FRONT : ARM_DEPTH_BACK) * Math.sqrt(Math.max(0, 1 - h * h)) * abs ** 9;
  }

  // Low amplitude, asymmetric folds shaped into the mesh (no time-based flutter).
  const edgeFalloff = Math.max(0, 1 - abs) ** 0.45;
  const neckFalloff = 1 - smooth(top - 0.28, top, y);
  const hemWeight = 0.45 + 0.55 * (1 - smooth(-1.6, 0.35, y));
  const vertical = 0.025 * Math.sin(u * 15 + y * 1.7)
    + 0.011 * Math.sin(u * 31 - y * 2.2);
  const drape = 0.033 * Math.sin(abs * 14 - y * 5.2 + (front ? 0 : 1.1))
    * smooth(0.15, 0.85, abs) * (1 - smooth(0.2, 0.95, y));
  z += (vertical * hemWeight + drape) * edgeFalloff * neckFalloff;

  const hemWave = (0.012 * Math.sin(u * 10 + 0.6) + 0.008 * Math.sin(u * 19))
    * (1 - smooth(HEM, HEM + 0.35, y)) * (1 - abs);
  return new THREE.Vector3(u * bodyWidth(y), y + hemWave, sign * z);
}

function surfaceNormal(u, y, front) {
  const delta = 0.0002;
  const left = sampleGarmentSurface(Math.max(-1, u - delta), y, front);
  const right = sampleGarmentSurface(Math.min(1, u + delta), y, front);
  const bottom = sampleGarmentSurface(u, y - delta, front);
  const top = sampleGarmentSurface(u, y + delta, front);
  const normal = right.sub(left).cross(top.sub(bottom)).normalize();
  return front ? normal : normal.negate();
}

function pointAboveSurface(u, y, front, offset = 0.005) {
  return sampleGarmentSurface(u, y, front).addScaledVector(surfaceNormal(u, y, front), offset);
}

function geometryFromGrid(points, columns, rows, reverse = false, uvScale = [1, 1]) {
  const positions = [];
  const uv = [];
  const indices = [];
  points.forEach((point, i) => {
    positions.push(point.x, point.y, point.z);
    uv.push((i % (columns + 1)) / columns * uvScale[0], Math.floor(i / (columns + 1)) / rows * uvScale[1]);
  });
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const a = row * (columns + 1) + col;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      if (reverse) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeBody(front) {
  const points = [];
  // Include both exact neck/shoulder junctions, and cluster neck vertices
  // around their tight curvature. A uniform x grid leaves small triangular
  // gaps underneath the rolled collar where the neckline rises steeply.
  const shoulderColumns = 12;
  const neckColumns = BODY_COLUMNS - shoulderColumns * 2;
  const columnU = (col) => {
    if (col <= shoulderColumns) return lerp(-1, -NECK_U, col / shoulderColumns);
    if (col >= shoulderColumns + neckColumns) return lerp(NECK_U, 1, (col - shoulderColumns - neckColumns) / shoulderColumns);
    return NECK_U * Math.sin(-Math.PI / 2 + Math.PI * (col - shoulderColumns) / neckColumns);
  };
  for (let row = 0; row <= LOWER_ROWS + UPPER_ROWS; row += 1) {
    for (let col = 0; col <= BODY_COLUMNS; col += 1) {
      const u = columnU(col);
      const y = row <= LOWER_ROWS
        ? lerp(HEM, ARM_BOTTOM, row / LOWER_ROWS)
        : lerp(ARM_BOTTOM, neckline(u, front), 0.5 - 0.5 * Math.cos(Math.PI * (row - LOWER_ROWS) / UPPER_ROWS));
      points.push(sampleGarmentSurface(u, y, front));
    }
  }
  return geometryFromGrid(points, BODY_COLUMNS, LOWER_ROWS + UPPER_ROWS, !front);
}

function sleeveRoot(index) {
  const i = index % SLEEVE_POINTS;
  const front = i <= UPPER_ROWS;
  const raw = front ? i / UPPER_ROWS : (SLEEVE_POINTS - i) / UPPER_ROWS;
  const p = 0.5 - 0.5 * Math.cos(Math.PI * raw);
  const y = lerp(ARM_BOTTOM, ARM_TOP, p);
  const normalY = (y - ARM_CENTER) / ((ARM_TOP - ARM_BOTTOM) / 2);
  return { y, front, yUnit: normalY, zUnit: (front ? 1 : -1) * Math.sqrt(Math.max(0, 1 - normalY * normalY)) };
}

function sleevePoint(side, t, index) {
  const { y, front, yUnit, zUnit } = sleeveRoot(index);
  const drop = ARM_CENTER * t;
  const centerX = lerp(bodyWidth(y), 1.6, t);
  const centerY = ARM_CENTER - drop;
  const radialY = lerp((ARM_TOP - ARM_BOTTOM) / 2, 0.39, t);
  const radialZ = lerp(front ? ARM_DEPTH_FRONT : ARM_DEPTH_BACK, front ? 0.43 : 0.41, t);
  const angle = 0.98 * t;
  const envelope = Math.sin(Math.PI * t);
  const wrinkles = 0.012 * Math.sin(t * 16 + yUnit * 4) * envelope;
  return new THREE.Vector3(
    side * (centerX + Math.sin(angle) * radialY * yUnit),
    centerY + Math.cos(angle) * radialY * yUnit + wrinkles * zUnit,
    (radialZ + wrinkles) * zUnit,
  );
}

function makeSleeve(side, from = 0, to = 1, outward = 0) {
  const points = [];
  const rows = from > 0 ? 3 : SLEEVE_RINGS;
  for (let row = 0; row <= rows; row += 1) {
    const t = lerp(from, to, row / rows);
    for (let col = 0; col <= SLEEVE_POINTS; col += 1) {
      const point = sleevePoint(side, t, col);
      if (outward) {
        const { yUnit, zUnit } = sleeveRoot(col);
        point.y += yUnit * outward;
        point.z += zUnit * outward;
      }
      points.push(point);
    }
  }
  // Grid u follows the cuff, v travels away from the armhole.
  return geometryFromGrid(points, SLEEVE_POINTS, rows, side > 0, [0.7, 0.6]);
}

function insideGeometry(outer, thickness = 0.009) {
  const inner = outer.clone();
  const p = inner.attributes.position;
  const n = inner.attributes.normal;
  for (let i = 0; i < p.count; i += 1) {
    p.setXYZ(i, p.getX(i) - n.getX(i) * thickness, p.getY(i) - n.getY(i) * thickness, p.getZ(i) - n.getZ(i) * thickness);
  }
  p.needsUpdate = true;
  inner.computeBoundingSphere();
  return inner;
}

function makeClothTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const pixels = ctx.createImageData(512, 512);
  let seed = 28119;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < 512; y += 1) {
    for (let x = 0; x < 512; x += 1) {
      const row = Math.floor(y / 8);
      const course = Math.sin((x + (row % 2) * 4) * Math.PI / 4);
      const wale = Math.cos((y % 8) * Math.PI / 4);
      const value = Math.round(126 + 23 * course * wale + 10 * wale + (random() - 0.5) * 19);
      const i = (y * 512 + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 9);
  texture.anisotropy = 4;
  return texture;
}

function makeEmbroideryGeometry() {
  const points = [];
  const columns = 32;
  const rows = 8;
  for (let row = 0; row <= rows; row += 1) {
    for (let col = 0; col <= columns; col += 1) {
      points.push(pointAboveSurface(lerp(0.29, 0.84, col / columns), lerp(-1.32, -1.18, row / rows), true, 0.003));
    }
  }
  return geometryFromGrid(points, columns, rows);
}

// Keep long inscriptions at a readable stitch size. Split on a word boundary
// when possible, or between complete graphemes for text without spaces.
function inscriptionLines(ctx, text, maxWidth) {
  if (ctx.measureText(text).width < maxWidth * 1.55 || !Intl.Segmenter) return [text];
  const letters = [...new Intl.Segmenter(undefined, {granularity: "grapheme"}).segment(text)].map(item => item.segment);
  let best = [text], bestWidth = Infinity;
  const hasSpaces = /\s/u.test(text.trim());
  for (let i = 1; i < letters.length; i++) {
    if (hasSpaces && !/\s/u.test(letters[i - 1] + letters[i])) continue;
    const lines = [letters.slice(0, i).join("").trimEnd(), letters.slice(i).join("").trimStart()];
    if (lines.some(line => !line)) continue;
    const width = Math.max(...lines.map(line => ctx.measureText(line).width));
    if (width < bestWidth) { bestWidth = width; best = lines; }
  }
  return best;
}

export function makeEmbroideryTextures(initial = "Stay in it.") {
  const makeCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 256;
    return canvas;
  };
  const color = makeCanvas(), relief = makeCanvas(), silhouette = makeCanvas();
  const colorMap = new THREE.CanvasTexture(color), bumpMap = new THREE.CanvasTexture(relief);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = bumpMap.anisotropy = 4;
  const mask = silhouette.getContext("2d", {willReadFrequently:true});
  const ink = color.getContext("2d"), bump = relief.getContext("2d");
  let previous;
  function draw(value) {
    const text = String(value || "Stay in it.");
    if (previous === text) return false;
    previous = text;
    const font = size => `italic 600 ${size}px Georgia, "Songti SC", "Noto Serif CJK SC", serif`;
    const width = color.width, height = color.height, maxWidth = width - 88;
    mask.clearRect(0, 0, width, height);
    mask.textAlign = "center"; mask.textBaseline = "middle";
    mask.font = font(145);
    const lines = inscriptionLines(mask, text, maxWidth);
    const measured = Math.max(...lines.map(line => mask.measureText(line).width));
    const size = Math.min(lines.length === 1 ? 145 : 97, 145 * maxWidth / measured);
    mask.font = font(size); mask.fillStyle = "#fff";
    lines.forEach((line,index) => mask.fillText(line,width/2,height/2+(index-(lines.length-1)/2)*size*1.10));
    const alpha = mask.getImageData(0,0,width,height).data;
    const strands=new Path2D(), crowns=new Path2D(), slope=.54;
    for(let column=-height*slope;column<width;column+=6){
      let start=-1;
      for(let row=0;row<=height;row++){
        const x=Math.round(column+row*slope);
        const inside=x>=0 && x<width && row<height && alpha[(row*width+x)*4+3]>100;
        if(inside && start<0)start=row;
        if(inside || start<0)continue;
        const end=row-1,span=end-start;
        if(span>=1){
          const x1=column+start*slope,x2=column+end*slope;
          strands.moveTo(x1,start);strands.quadraticCurveTo((x1+x2)/2+1.3,(start+end)/2,x2,end);
          crowns.moveTo(x1+.22*(x2-x1)+.7,start+.22*span);crowns.lineTo(x1+.79*(x2-x1)+.7,start+.79*span);
        }
        start=-1;
      }
    }
    for(const [ctx,ground,yarn,glint] of [[ink,"#817664","#d1c6b1","#ebe2d1"],[bump,"#474747","#adadad","#e5e5e5"]]){
      ctx.fillStyle=ground;ctx.fillRect(0,0,width,height);
      ctx.lineCap="round";ctx.lineWidth=4.6;ctx.strokeStyle=yarn;ctx.stroke(strands);
      ctx.lineWidth=1.55;ctx.strokeStyle=glint;ctx.stroke(crowns);
      ctx.globalCompositeOperation="destination-in";ctx.drawImage(silhouette,0,0);ctx.globalCompositeOperation="source-over";
    }
    bump.globalCompositeOperation="destination-over";bump.fillStyle="#000";bump.fillRect(0,0,width,height);bump.globalCompositeOperation="source-over";
    colorMap.needsUpdate = bumpMap.needsUpdate = true;
    return true;
  }
  draw(initial);
  return { colorMap, bumpMap, draw };
}

/** No textures mode is useful for deterministic geometry checks in Node. */
export function createGarment({ textures = true } = {}) {
  const group = new THREE.Group();
  group.name = "IKIKAE — concept cotton tee";
  const geometries = new Set();
  const materials = new Set();
  const maps = new Set();
  const clothMap = textures ? makeClothTexture() : null;
  if (clothMap) maps.add(clothMap);

  const cloth = new THREE.MeshPhysicalMaterial({
    color: 0x242726,
    roughness: 0.91,
    metalness: 0,
    sheen: 0.48,
    sheenColor: new THREE.Color(0x787d75),
    sheenRoughness: 0.95,
    bumpMap: clothMap,
    bumpScale: 0.009,
    side: THREE.FrontSide,
  });
  const inner = new THREE.MeshStandardMaterial({ color: 0x131615, roughness: 1, side: THREE.BackSide });
  const rib = cloth.clone();
  rib.color.set(0x202322);
  rib.roughness = 0.95;
  rib.side = THREE.DoubleSide;
  const stitch = new THREE.MeshStandardMaterial({ color: 0x323631, roughness: 0.9 });
  [cloth, inner, rib, stitch].forEach((material) => materials.add(material));

  function addMesh(geometry, material, name) {
    geometries.add(geometry);
    materials.add(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function shell(geometry, name) {
    addMesh(geometry, cloth, name);
    addMesh(insideGeometry(geometry), inner, `${name} / inside`);
  }

  function seam(points, name, radius = 0.004, closed = false, segments = 64) {
    const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
    addMesh(new THREE.TubeGeometry(curve, segments, radius, 4, closed), stitch, name);
  }

  shell(makeBody(true), "Front cloth");
  shell(makeBody(false), "Back cloth");

  for (const side of [-1, 1]) {
    shell(makeSleeve(side), side > 0 ? "Left sleeve" : "Right sleeve");
    addMesh(makeSleeve(side, 0.89, 1, 0.004), rib, "Folded sleeve cuff");
    const cuff = [];
    const stitchLine = [];
    const armSeam = [];
    for (let i = 0; i < SLEEVE_POINTS; i += 1) {
      cuff.push(sleevePoint(side, 1, i));
      stitchLine.push(sleevePoint(side, 0.88, i));
      armSeam.push(sleevePoint(side, 0.018, i));
    }
    seam(cuff, "Cuff edge", 0.008, true, 64);
    seam(stitchLine, "Cuff topstitch", 0.003, true, 64);
    seam(armSeam, "Dropped shoulder seam", 0.0045, true, 64);
  }

  // Open, front-dropped collar. The rib is a narrow cloth band sampled from
  // the torso; its loop leaves an actual neck hole visible from above.
  const collarPoints = [];
  const neckLoop = [];
  const collarSegments = 72;
  for (let row = 0; row <= 4; row += 1) {
    const offset = row / 4;
    for (let col = 0; col <= collarSegments; col += 1) {
      const angle = col / collarSegments * Math.PI * 2;
      const u = NECK_U * Math.cos(angle);
      const front = Math.sin(angle) >= 0;
      const outerU = u * (1 + offset * 0.15);
      const y = neckline(u, front) - offset * 0.072;
      const point = pointAboveSurface(outerU, Math.min(y, neckline(outerU, front) - 0.002), front, 0.0035);
      collarPoints.push(point);
      if (row === 0 && col < collarSegments) neckLoop.push(point);
    }
  }
  addMesh(geometryFromGrid(collarPoints, collarSegments, 4), rib, "Ribbed collar band");
  seam(neckLoop, "Collar rolled edge", 0.009, true, 96);

  for (const front of [true, false]) {
    const bottomEdge = [];
    const hemStitch = [];
    const shoulderLeft = [];
    const shoulderRight = [];
    for (let i = 0; i <= 48; i += 1) {
      const u = i / 48 * 2 - 1;
      bottomEdge.push(pointAboveSurface(u, HEM + 0.005, front, 0.003));
      hemStitch.push(pointAboveSurface(u, HEM + 0.068, front, 0.003));
    }
    seam(bottomEdge, "Folded hem", 0.008, false, 64);
    seam(hemStitch, "Hem topstitch", 0.0028, false, 64);
    if (front) {
      for (let i = 0; i <= 20; i += 1) {
        const u = lerp(NECK_U + 0.02, 0.99, i / 20);
        shoulderLeft.push(pointAboveSurface(u, neckline(u, true) - 0.01, true, 0.003));
        shoulderRight.push(pointAboveSurface(-u, neckline(-u, true) - 0.01, true, 0.003));
      }
      seam(shoulderLeft, "Left shoulder topstitch", 0.004, false, 28);
      seam(shoulderRight, "Right shoulder topstitch", 0.004, false, 28);
    }
  }

  const embroidery = textures ? makeEmbroideryTextures() : null;
  if (embroidery) {
    maps.add(embroidery.colorMap);
    maps.add(embroidery.bumpMap);
  }
  const embroideryMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4d8d0,
    map: embroidery?.colorMap || null,
    bumpMap: embroidery?.bumpMap || null,
    bumpScale: 0.001,
    roughness: 0.81,
    metalness: 0,
    transparent: true,
    alphaTest: 0.12,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const embroideryMesh = addMesh(makeEmbroideryGeometry(), embroideryMaterial, "Personal motto embroidery");
  embroideryMesh.visible = textures;
  embroideryMesh.renderOrder = 1;
  const embroideryTarget = pointAboveSurface(0.565, -1.25, true, 0.005);
  let triangleCount = 0;
  group.traverse((object) => {
    if (object.isMesh) triangleCount += object.geometry.index ? object.geometry.index.count / 3 : object.geometry.attributes.position.count / 3;
  });

  return {
    group,
    embroideryTarget,
    triangleCount,
    updateMotto(text) { embroidery?.draw(text); },
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      maps.forEach((map) => map.dispose());
      group.clear();
    },
  };
}
