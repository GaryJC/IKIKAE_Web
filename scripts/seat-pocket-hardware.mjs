// Recess the two oversized slider impressions in the scan. Work in the
// horizontal cross section of each pocket: along the welt and out of the body.
function ramp(low, high, value) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

export function seatPocketHardware(input) {
  const result = Buffer.from(input);
  const jsonEnd = 20 + result.readUInt32LE(12);
  const doc = JSON.parse(result.subarray(20, jsonEnd));
  function triples(id) {
    const a = doc.accessors[id];
    const view = doc.bufferViews[a.bufferView];
    const offset = result.byteOffset + jsonEnd + 8 + (view.byteOffset || 0) + (a.byteOffset || 0);
    return new Float32Array(result.buffer, offset, a.count * 3);
  }
  const cloth = doc.meshes[0].primitives.find(p => doc.materials[p.material].normalTexture);
  const pos = triples(cloth.attributes.POSITION);
  const normal = triples(cloth.attributes.NORMAL);
  const axis = Math.SQRT1_2;

  for (let i = 0; i < pos.length; i += 3) {
    const [x, y, z] = pos.subarray(i, i + 3);
    if (y < -.192 || y > -.094 || z < .09 || Math.abs(x) < .15) continue;
    const side = Math.sign(x);
    const across = (side * x - z) * axis;
    const depth = (side * x + z) * axis;
    // Cross sections on each side of the original tab determine the cloth
    // plane. The left and right halves have different cut angles and slopes.
    const left = side < 0;
    const centre = (left ? -.002 : .079) - (left ? .23 : .215) * (y + .10);
    const u = across - centre;
    const span = (1 - ramp(.012, .025, Math.abs(u))) *
      ramp(-.192, -.163, y) * (1 - ramp(-.112, -.094, y));
    if (!span) continue;
    const acrossSlope = left ? .15 : -.23;
    const plane = (left ? .281 : .2695) - (left ? .068 : .035) * (y + .10) + acrossSlope * u;
    const lift = depth - plane;
    if (lift <= 0) continue;
    // Preserve a little relief at the seat and leave the lip below it intact.
    // Integrate the pressure ramp so vertices keep their depth order even
    // through the soft contact edge of the press.
    const contact = .0012;
    const excess = lift < contact ? lift * lift / (2 * contact) : lift - contact / 2;
    const pressure = .92 * span;
    const press = pressure * Math.min(1, lift / contact);
    const shift = pressure * excess * axis;
    pos[i] -= side * shift;
    pos[i + 2] -= shift;

    const nx = side * axis * (1 - acrossSlope);
    const nz = axis * (1 + acrossSlope);
    const ny = (left ? .068 : .035) - acrossSlope * (left ? .23 : .215);
    const inv = 1 / Math.hypot(nx, ny, nz);
    normal[i] += press * (nx * inv - normal[i]);
    normal[i + 1] += press * (ny * inv - normal[i + 1]);
    normal[i + 2] += press * (nz * inv - normal[i + 2]);
    const length = Math.hypot(normal[i], normal[i + 1], normal[i + 2]);
    normal[i] /= length;
    normal[i + 1] /= length;
    normal[i + 2] /= length;
  }
  return result;
}
