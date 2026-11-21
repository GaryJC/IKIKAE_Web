import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Stations on the two cleaned pocket openings, sampled offline on the posed
// garment. The fourth coordinate is the cross-slope of the welt at each station.
const openings = [
  [
    [-.1910,-.1010,.2058,-.23],[-.1930,-.1112,.2050,-.16],[-.1952,-.1214,.2041,-.16],
    [-.1973,-.1316,.2028,-.17],[-.1999,-.1418,.2014,-.23],[-.2035,-.1520,.1995,-.19],
    [-.2073,-.1622,.1971,-.20],[-.2120,-.1724,.1960,-.16],[-.2187,-.1826,.1990,-.14],
    [-.2225,-.1928,.2007,-.20],[-.2263,-.2030,.2016,.01],[-.2288,-.2132,.2000,.10],
    [-.2299,-.2234,.1959,.22],[-.2316,-.2336,.1901,.15],[-.2331,-.2438,.1830,-.60],
    [-.2365,-.2540,.1797,-.46],[-.2406,-.2642,.1782,-.27],[-.2423,-.2744,.1757,-.28],
    [-.2455,-.2846,.1760,-.39],[-.2494,-.2948,.1774,.01],[-.2527,-.3050,.1783,.35],
  ],
  [
    [.2441,-.1040,.1396,-.25],[.2466,-.1147,.1394,-.20],[.2484,-.1255,.1383,-.24],
    [.2503,-.1362,.1372,-.19],[.2522,-.1470,.1361,-.18],[.2542,-.1578,.1346,-.21],
    [.2569,-.1685,.1337,-.10],[.2599,-.1792,.1328,.17],[.2606,-.1900,.1294,.47],
    [.2616,-.2008,.1264,.51],[.2627,-.2115,.1234,.54],[.2637,-.2222,.1203,.50],
    [.2648,-.2330,.1174,.45],[.2656,-.2437,.1144,.34],[.2671,-.2545,.1120,.22],
    [.2689,-.2653,.1097,.19],[.2706,-.2760,.1067,.03],[.2728,-.2867,.1039,-.04],
    [.2751,-.2975,.1009,-.09],[.2774,-.3083,.0979,-.25],[.2804,-.3190,.0949,-.35],
  ],
];

function pocketPath(stations) {
  const curve = new THREE.CatmullRomCurve3(stations.map(([x,y,z]) => new THREE.Vector3(x,y,z)));
  const outward = new THREE.Vector3(.68 * Math.sign(stations[0][0]), 0, .733).normalize();
  const horizontal = new THREE.Vector3(outward.z, 0, -outward.x);
  return {
    length: curve.getLength(),
    frame(u) {
      const t = curve.getUtoTmapping(u), index = t * (stations.length - 1);
      const i = Math.min(Math.floor(index), stations.length - 2);
      const slope = THREE.MathUtils.lerp(stations[i][3], stations[i + 1][3], index - i);
      const down = curve.getTangent(t);
      const across = horizontal.clone().addScaledVector(outward, slope);
      across.addScaledVector(down, -across.dot(down)).normalize();
      const front = down.clone().cross(across);
      return new THREE.Matrix4().makeBasis(across, down.negate(), front).setPosition(curve.getPoint(t));
    },
  };
}

function partBuilder() {
  const positions = [], colors = [], indices = [];
  return {
    vertex(x,y,z,frame,color) {
      const index = positions.length / 3;
      const point = new THREE.Vector3(x,y,z).applyMatrix4(frame);
      positions.push(point.x,point.y,point.z);
      colors.push(color.r,color.g,color.b);
      return index;
    },
    triangle(a,b,c) { indices.push(a,b,c); },
    geometry() {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    },
  };
}

const binding = new THREE.Color(0x33312e), tapeFace = new THREE.Color(0x2b2927);
const toothColor = new THREE.Color(0x505354), toothRoot = new THREE.Color(0x383a3a);

// Cloth depth in mm across each end, measured in its own zipper frame. The
// lower corner on the figure's right turns sharply away underneath the welt.
const endDepths = [
  [
    [[-.87,-.35,-.01,.16,.26,.30,-.03],[-1.83,-.88,-.63,-.93,-1.04,-.81,-.58]],
    [[-.89,-.34,.25,.20,.14,-1.33,-5.74],[-2.73,-1.88,-1.18,-.96,-1.12,-1.67,-4.10]],
  ],
  [
    [[-1.54,-.62,-.06,.23,.15,-.11,-.52],[-1.99,-.52,-.07,-.15,0,-.22,-.50]],
    [[.72,.59,.46,-.29,.39,1.28,2.55],[1.05,.92,.79,.43,-.01,.71,1.39]],
  ],
];

function bartack(tape,uvs,frame,depths,direction) {
  // A short turned-under lip crosses the tape. Its outside perimeter sinks
  // into the panel, and the satin stitches pierce the lip at both ends.
  function depth(x,r) {
    const u = THREE.MathUtils.clamp((x + 9) / 3,0,6);
    const i = Math.min(5,Math.floor(u));
    const a = THREE.MathUtils.lerp(depths[0][i],depths[0][i+1],u-i);
    const b = THREE.MathUtils.lerp(depths[1][i],depths[1][i+1],u-i);
    return THREE.MathUtils.lerp(a,b,(r+3)/9);
  }
  const fold = new THREE.Color(0x34312e), crease = new THREE.Color(0x282522);
  const thread = new THREE.Color(0x605b54), flank = new THREE.Color(0x433e39);
  function vertex(x,r,height,color) {
    uvs.push(x,r);
    return tape.vertex(.001*x,.001*r*direction,.001*(depth(x,r)+height),frame,color);
  }
  function stitchQuad(a,b,c,d) {
    if (direction > 0) { tape.triangle(a,b,c); tape.triangle(a,c,d); }
    else { tape.triangle(a,c,b); tape.triangle(a,d,c); }
  }
  const xs = [-9,-7.5,-6,-3,0,3,6,7.5,9];
  const rows = [[-2.8,-.20,crease],[-2.1,.68,crease],[-1.25,.99,fold],[.7,.76,fold],[2,.40,fold],[3.4,-.38,fold]];
  let previous;
  for (const [station,height,color] of rows) {
    const row = xs.map(x => {
      const edge = Math.abs(x)/9;
      return vertex(x,station + edge*edge*.65,height*(1-.55*edge*edge) - .49*edge**6,color);
    });
    if (previous) for (let j=1;j<row.length;j++) stitchQuad(previous[j-1],previous[j],row[j],row[j-1]);
    previous = row;
  }
  // Each short strand has one rounded crown. The small diagonal lean is the
  // return of the same locking thread as the machine advances across the bar.
  for (let i=-6;i<=6;i++) {
    const x=i*1.23, edge=Math.abs(i)/6;
    const middle=.27 + .42*edge*edge;
    const reach=1.36-.33*edge*edge;
    const height=1.15-.78*edge*edge;
    const a=vertex(x-.30,middle-reach,height-.51,flank);
    const b=vertex(x+.17,middle-reach,height-.48,flank);
    const c=vertex(x+.46,middle+.05,height+.22,flank);
    const d=vertex(x-.32,middle-.05,height+.46,thread);
    const e=vertex(x+.40,middle+reach,height-.61,flank);
    const f=vertex(x-.05,middle+reach,height-.57,flank);
    stitchQuad(a,b,c,d); stitchQuad(d,c,e,f);
  }
}

function sewTape(tape, path, uvs) {
  const profile = [
    [-.0090,-.0006,binding],[-.0079,.0012,binding],[-.0065,.0013,tapeFace],[-.004,.00065,tapeFace],
    [.004,.00065,tapeFace],[.0065,.0013,tapeFace],[.0079,.0012,binding],[.0090,-.0006,binding],
  ];
  let previous;
  for (let i = 0; i <= 64; i++) {
    const u = i / 64, frame = path.frame(u);
    const endDistance = Math.min(u,1-u) * path.length;
    const taper = .65 + .35 * Math.min(1,endDistance/.008);
    const tuck = .0015 * (1-THREE.MathUtils.smoothstep(endDistance,0,.0045));
    const row = profile.map(([x,z,color]) => {
      uvs.push(x * 1000,u * path.length * 1000);
      return tape.vertex(x * taper,0,z-tuck,frame,color);
    });
    if (previous) {
      for (let j = 1; j < row.length; j++) {
        tape.triangle(previous[j-1],row[j-1],row[j]);
        tape.triangle(previous[j-1],row[j],previous[j]);
      }
    }
    previous = row;
  }
}

function tapeMaterial() {
  const material = new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88});
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 pocketTape;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\npocketTape = uv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 pocketTape;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float stitch = pocketTape.y / 3.4;
        float needle = 1. - smoothstep(.10,.39 + .45 * fwidth(pocketTape.x),abs(abs(pocketTape.x)-6.7));
        float stitchEnds = smoothstep(.07,.24,abs(fract(stitch)-.5));
        float twill = pocketTape.y * 1.8 + abs(pocketTape.x) * .82;
        float twillVisibility = 1. - smoothstep(.14,.72,fwidth(twill));
        diffuseColor.rgb *= 1. + .19 * needle * stitchEnds + .06 * twillVisibility * cos(6.28318 * twill);
      `);
  };
  return material;
}

function addTeeth(teeth,path) {
  // Each tooth has a heavier head crossing the centre line. Half-pitch stagger
  // lets the two chains interlock, with dark spaces between the metal crowns.
  const count = Math.floor(path.length / .0031);
  const outline = [[.00345,-.00065],[.0017,-.00055],[-.00055,-.00112],[-.00058,.00017],[.0016,.00064],[.00345,.00062]];
  for (const side of [-1,1]) {
    for (let i = 3; i < count - 1; i++) {
      const frame = path.frame((i + (side > 0 ? .5 : 0)) / count);
      const base = [], rim = [];
      const perimeter = side < 0 ? outline : [...outline].reverse();
      for (const [x,y] of perimeter) {
        base.push(teeth.vertex(side*x,y,.00085,frame,toothRoot));
        rim.push(teeth.vertex(side*x*.97,y*.92,.00208,frame,toothColor));
      }
      const crown = teeth.vertex(side*.0011,-.0001,.00285,frame,toothColor);
      for (let j = 0; j < rim.length; j++) {
        const k = (j+1) % rim.length;
        teeth.triangle(rim[j],rim[k],crown);
        teeth.triangle(base[j],base[k],rim[k]);
        teeth.triangle(base[j],rim[k],rim[j]);
      }
    }
  }
}

function roundedOutline(widthTop,widthBottom,length) {
  const s = new THREE.Shape(), r = Math.min(widthTop,widthBottom)*.4;
  s.moveTo(-widthTop+r,0);
  s.quadraticCurveTo(-widthTop,0,-widthTop,-r);
  s.lineTo(-widthBottom,-length+r);
  s.quadraticCurveTo(-widthBottom,-length,-widthBottom+r,-length);
  s.lineTo(widthBottom-r,-length);
  s.quadraticCurveTo(widthBottom,-length,widthBottom,-length+r);
  s.lineTo(widthTop,-r);
  s.quadraticCurveTo(widthTop,0,widthTop-r,0);
  s.closePath();
  return s;
}

function addSlider(parts,path,side) {
  const slider = path.frame(.018);
  const local = new THREE.Matrix4().makeScale(.001,.001,.001);
  function place(geometry,matrix,color,attachment = slider) {
    const position = geometry.getAttribute('position');
    if (!geometry.index) {
      const index = new Uint16Array(position.count);
      for (let i=0;i<index.length;i++) index[i]=i;
      geometry.setIndex(new THREE.BufferAttribute(index,1));
    }
    const values = new Float32Array(position.count*3), rgb = new THREE.Color(color);
    for (let i=0;i<values.length;i+=3) rgb.toArray(values,i);
    geometry.setAttribute('color',new THREE.BufferAttribute(values,3));
    geometry.deleteAttribute('uv');
    geometry.applyMatrix4(matrix);
    geometry.applyMatrix4(local);
    geometry.applyMatrix4(attachment);
    parts.push(geometry);
  }
  const extrude = (shape,depth,bevel) => new THREE.ExtrudeGeometry(shape,{
    depth, bevelEnabled:true, bevelSegments:2, bevelSize:bevel, bevelThickness:bevel, curveSegments:5,
  });

  place(extrude(roundedOutline(5.8,4.1,12),2.2,.65),
    new THREE.Matrix4().makeTranslation(0,0,2.1),0x424547);
  const grip = roundedOutline(3.5,4.1,24);
  const eye = new THREE.Path(); eye.absellipse(0,-3.4,1.9,1.6,0,Math.PI*2,true); grip.holes.push(eye);
  const slot = new THREE.Path();
  slot.moveTo(-1.55,-13.9); slot.quadraticCurveTo(0,-12.5,1.55,-13.9);
  slot.lineTo(1.6,-19.6); slot.quadraticCurveTo(0,-21.7,-1.6,-19.6); slot.closePath();
  grip.holes.push(slot);
  // The tab swivels a few degrees around its eye and settles onto the tape.
  const tilt = new THREE.Euler(.10,0,side*.07,'ZXY');
  const tabMatrix = new THREE.Matrix4().makeRotationFromEuler(tilt).setPosition(0,-6,5.5);
  const tab = extrude(grip,1.0,.45);
  const positions = tab.getAttribute('position'), normals = tab.getAttribute('normal');
  const normal = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    positions.setZ(i,positions.getZ(i)+.54*(1-x*x/17));
    normal.fromBufferAttribute(normals,i);
    normal.x += .0635*x*normal.z; normal.normalize();
    normals.setXYZ(i,normal.x,normal.y,normal.z);
  }
  place(tab,tabMatrix,0x44484b);
  const staple = new THREE.CubicBezierCurve3(new THREE.Vector3(0,-9.4,5.5),new THREE.Vector3(0,-10,10.2),
    new THREE.Vector3(0,-2.3,10.2),new THREE.Vector3(0,-2.5,4.2));
  const wire = new THREE.TubeGeometry(staple,9,.74,6,false);
  place(wire,new THREE.Matrix4(),0x5b5d5d);

  // A crimped bottom stop closes both rows just before the bound pocket foot.
  const stop = extrude(roundedOutline(3.1,2.4,2.8),.75,.35);
  place(stop,new THREE.Matrix4().makeTranslation(0,0,1.1),0x343736,path.frame(.977));
}

export function createPocketZippers(model) {
  const tape = partBuilder(), teeth = partBuilder(), hardware = [], tapeUVs = [];
  for (const [index,stations] of openings.entries()) {
    const path = pocketPath(stations);
    sewTape(tape,path,tapeUVs); addTeeth(teeth,path); addSlider(hardware,path,Math.sign(stations[0][0]));
    bartack(tape,tapeUVs,path.frame(0),endDepths[index][0],1);
    bartack(tape,tapeUVs,path.frame(1),endDepths[index][1],-1);
  }
  hardware.push(teeth.geometry());
  const metalGeometry = mergeGeometries(hardware);
  hardware.forEach(part => part.dispose());
  model.updateWorldMatrix(true,false);
  const group = new THREE.Group();
  group.name = 'Inset zippered hand pockets';
  const tapeGeometry = tape.geometry().applyMatrix4(model.matrixWorld);
  tapeGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(tapeUVs,2));
  const tapeMesh = new THREE.Mesh(tapeGeometry,tapeMaterial());
  const metalMesh = new THREE.Mesh(metalGeometry.applyMatrix4(model.matrixWorld),
    new THREE.MeshStandardMaterial({vertexColors:true,roughness:.47,metalness:.85}));
  tapeMesh.name = 'Woven pocket zipper tapes';
  metalMesh.name = 'Pocket zipper teeth, sliders and stops';
  group.add(tapeMesh,metalMesh);
  return group;
}
