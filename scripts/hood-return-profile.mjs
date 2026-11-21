// Surface paths sampled on the near-side hood in the high three-quarter return
// camera. The crown turns behind the neck; the second path marks where the
// folded shell settles onto the shoulder. Their ends meet the existing drape.
import { CatmullRomCurve3, Vector3 } from 'three';

function trace(points, direction, width, height) {
  const curve = new CatmullRomCurve3(points.map(p => new Vector3(...p)));
  const samples = curve.getSpacedPoints(40);
  const segments = samples.slice(0, -1).map((start, i) => {
    const step = samples[i + 1].clone().sub(start);
    return { start, step, lengthSq: step.lengthSq() };
  });
  return { segments, direction: new Vector3(...direction).normalize(), width, height };
}

const folds = [
  trace([
    [-.035,.566,-.231],[-.083,.566,-.216],[-.125,.566,-.197],[-.159,.560,-.173],
    [-.192,.554,-.146],[-.213,.547,-.107],[-.222,.536,-.061],[-.215,.527,-.013],
    [-.190,.515,.014],[-.158,.502,.042],[-.116,.486,.068],[-.076,.472,.088],
    [-.047,.460,.104],[-.019,.439,.107]
  ], [-.12,.97,.15], .0125, .0070),
  trace([
    [-.250,.457,-.146],[-.268,.449,-.128],[-.277,.443,-.102],[-.272,.445,-.071],
    [-.259,.448,-.034],[-.232,.457,.008],[-.194,.463,.047],[-.147,.465,.074],
    [-.101,.456,.094],[-.051,.447,.105]
  ], [-.71,.52,.47], .0155, .0060),
  // The shoulder slopes away under the shell. Give the seat of the hood a
  // broad compressed area, fading before it reaches the front raglan seam.
  trace([
    [-.308,.402,-.126],[-.292,.413,-.098],[-.287,.420,-.062],
    [-.271,.422,-.022],[-.243,.422,.007],[-.216,.422,.030]
  ], [-.49,.86,.08], .020, -.0042)
];

export function hoodReturnNeedsSubdivision(p) {
  return p.x > -.34 && p.x < 0 && p.y > .38 && p.y < .59 &&
    p.z > -.254 && p.z < .13;
}

export function hoodReturnDetail(p, n) {
  if (!hoodReturnNeedsSubdivision(p)) return;
  const original = p.clone();
  for (const { segments, direction, width, height } of folds) {
    let best = Infinity, distanceVector, station = 0;
    for (const [i, { start, step, lengthSq }] of segments.entries()) {
      const offset = original.clone().sub(start);
      const t = Math.max(0, Math.min(1, offset.dot(step) / lengthSq));
      offset.addScaledVector(step, -t);
      const squared = offset.lengthSq();
      if (squared < best) {
        best = squared;
        distanceVector = offset;
        station = (i + t) / segments.length;
      }
    }
    if (best >= 16 * width * width) continue;
    // Only the middle of the run is in tension; taper both ends to the
    // original shell instead of laying a uniform cord around the opening.
    const t = Math.min(1, station * 5.2, (1 - station) * 4.5);
    const fade = t*t*(3 - 2*t);
    const bulge = height*fade*Math.exp(-.5*best/(width*width));
    p.addScaledVector(direction, bulge);
    const gradient = distanceVector.multiplyScalar(-bulge/(width*width));
    n.addScaledVector(gradient, -n.dot(direction)/(1 + gradient.dot(direction))).normalize();
  }
}
