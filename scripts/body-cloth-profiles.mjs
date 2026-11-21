// Sewn edges and compression folds sampled on the posed garment in shots 01
// and 03. Three-dimensional paths distinguish a sleeve from the pocket lying
// behind it; equal positions across UV cuts receive identical deformation.
import { Box3, CatmullRomCurve3, Vector3 } from 'three';

function roll(points, direction, width, height) {
  const curve = new CatmullRomCurve3(points.map(point => new Vector3(...point)));
  const samples = curve.getSpacedPoints(24);
  const segments = samples.slice(1).map((end, index) => {
    const start = samples[index];
    const delta = end.clone().sub(start);
    return { start, delta, inverseLengthSquared: 1 / delta.lengthSq() };
  });
  return { segments, bounds: new Box3().setFromPoints(samples).expandByScalar(3.5 * width),
    direction: new Vector3(...direction).normalize(), width, height };
}

const rolls = [
  // Elbow compression follows the bend of each forearm. The return fold
  // shortens towards the inside of the elbow and opens towards the silhouette.
  roll([[.296,-.140,-.045],[.334,-.124,-.021],[.381,-.098,-.001],[.420,-.098,-.025],[.458,-.116,-.044],[.480,-.136,-.057]],
    [.30,-.20,.94],.026,.012),
  roll([[.316,-.240,-.040],[.354,-.220,-.016],[.394,-.183,-.014],[.431,-.180,-.012],[.466,-.196,-.046]],
    [.26,-.14,.95],.019,.008),
  roll([[-.489,-.102,.059],[-.445,-.096,.082],[-.384,-.112,.103],[-.339,-.144,.084],[-.319,-.153,.057]],
    [-.36,-.16,.92],.024,.012),
  roll([[-.481,-.283,.119],[-.432,-.262,.133],[-.385,-.245,.128],[-.349,-.220,.093],[-.333,-.206,.048]],
    [-.30,-.10,.95],.021,.009),

  // Joined welt and body. The longer diagonal on the left is the tension
  // crease between the pocket foot and the relatively loose centre panel.
  roll([[-.261,-.295,.155],[-.267,-.249,.125],[-.246,-.195,.152],[-.225,-.120,.172],[-.207,-.090,.189]],
    [-.60,0,.80],.012,.006),
  roll([[.241,-.102,.143],[.256,-.144,.144],[.265,-.191,.122],[.271,-.243,.107],[.282,-.293,.092]],
    [.71,0,.70],.012,.006),
  roll([[-.180,-.348,.239],[-.158,-.313,.236],[-.125,-.277,.238],[-.089,-.229,.246],[-.065,-.197,.248]],
    [-.14,-.16,.98],.028,.010),

  // The hem is gathered along its upper joining seam, with the heavier
  // binding turning under at the lower edge. Both end before the zip.
  roll([[.054,-.423,.265],[.098,-.421,.249],[.144,-.421,.237],[.184,-.417,.194],[.232,-.425,.146],[.274,-.429,.098],[.293,-.424,.043]],
    [.26,-.30,.92],.012,.0067),
  roll([[.051,-.540,.262],[.089,-.542,.242],[.150,-.535,.218],[.210,-.534,.184],[.266,-.532,.130],[.295,-.536,.079]],
    [.29,-.20,.94],.011,.0043),
  roll([[-.032,-.425,.257],[-.074,-.421,.256],[-.108,-.406,.267],[-.153,-.415,.241],[-.206,-.411,.225]],
    [-.28,-.30,.91],.013,.0058),

  // The wrist is visible immediately beside the lettering in 03. Give the
  // bunched sleeve a soft turn over its cuff instead of a hard circular line.
  roll([[.323,-.332,-.063],[.342,-.324,-.018],[.360,-.306,.007],[.381,-.292,.031],[.409,-.283,.027],[.455,-.267,-.002]],
    [.40,-.20,.89],.022,.010),
  roll([[.351,-.446,.013],[.374,-.439,.052],[.389,-.425,.059],[.407,-.421,.063],[.444,-.420,.046],[.466,-.422,.020]],
    [.28,-.23,.93],.017,.0075),
  roll([[.343,-.475,-.012],[.361,-.470,.027],[.378,-.465,.052],[.396,-.463,.062],[.413,-.462,.064],[.446,-.462,.046],[.466,-.465,.020]],
    [.17,-.20,.97],.011,.0054),
];

const clamp01 = value => Math.max(0, Math.min(1, value));
function smooth(value) {
  const t = clamp01(value);
  return t*t*(3-2*t);
}
function protection(x,y,z) {
  const zip = smooth((Math.abs(x-.012)-.025)/.022);
  if (z<.045) return zip;
  const decal = Math.max(Math.abs(x-.172)/.151, Math.abs(y+.344)/.064);
  return zip*smooth((decal-1)/.18);
}

function nearest(shape,x,y,z) {
  let distanceSquared = Infinity, station = 0, vertical = 0;
  for (let i=0;i<shape.segments.length;i++) {
    const { start, delta, inverseLengthSquared } = shape.segments[i];
    const dx=x-start.x, dy=y-start.y, dz=z-start.z;
    const t=clamp01((dx*delta.x+dy*delta.y+dz*delta.z)*inverseLengthSquared);
    const rx=dx-t*delta.x, ry=dy-t*delta.y, rz=dz-t*delta.z;
    const d=rx*rx+ry*ry+rz*rz;
    if (d<distanceSquared) {
      distanceSquared=d;
      station=(i+t)/shape.segments.length;
      vertical=ry;
    }
  }
  return {distanceSquared, station, vertical};
}

function offset(shape,x,y,z) {
  const {distanceSquared, station, vertical}=nearest(shape,x,y,z);
  // The cloth eases into a crest on top and turns more abruptly beneath it.
  const width=shape.width*(1+.25*Math.tanh(vertical/shape.width));
  const d2=distanceSquared/(width*width);
  const taper=smooth(station*7)*smooth((1-station)*7);
  const feather=1-smooth((d2-5)/3);
  return shape.height*taper*feather*Math.exp(-.5*d2)*protection(x,y,z);
}

export function bodyNeedsSubdivision(p) {
  if (p.y>-.045 || p.y<-.575 || !protection(p.x,p.y,p.z)) return false;
  return rolls.some(shape => shape.bounds.containsPoint(p)
    && nearest(shape,p.x,p.y,p.z).distanceSquared < (2.8*shape.width)**2);
}

export function bodyClothDetail(p,n) {
  if (p.y>-.045 || p.y<-.575) return;
  const original=p.clone(), {x,y,z}=original;
  const eps=.00008;
  for (const shape of rolls) {
    if (!shape.bounds.containsPoint(original)) continue;
    const h=offset(shape,x,y,z);
    if (!h) continue;
    p.addScaledVector(shape.direction,h);
    // Inverse transpose of p + direction * offset(p). Keep the source's
    // split shading normals and account for tapering at the end of a seam.
    const grad=new Vector3(offset(shape,x+eps,y,z)-offset(shape,x-eps,y,z),
      offset(shape,x,y+eps,z)-offset(shape,x,y-eps,z),
      offset(shape,x,y,z+eps)-offset(shape,x,y,z-eps)).multiplyScalar(.5/eps);
    n.addScaledVector(grad,-n.dot(shape.direction)/(1+grad.dot(shape.direction))).normalize();
  }
}
