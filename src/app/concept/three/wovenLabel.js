import * as THREE from 'three';

// A 2-over/2-under twill. The exposed yarn runs across the short floats in
// the lettering, giving the pale thread a different reflection from the tape.
function twillPatterns(color, height, roughness, lettering) {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 16;
  const ctx = tile.getContext('2d');
  const pixels = ctx.createImageData(16, 16);
  const fill = (target, sample) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const warp = (Math.floor(x / 4) - Math.floor(y / 4) + 4) % 4 < 2;
        const phase = ((warp !== lettering ? x : y) % 4 + .5) / 4;
        const crown = Math.sin(Math.PI * phase);
        const rgb = sample(crown, warp);
        pixels.data.set([...rgb, 255], (y * 16 + x) * 4);
      }
    }
    ctx.putImageData(pixels, 0, 0);
    // Snapshot each channel before reusing the tile for the next one.
    target.fillStyle = target.createPattern(tile, 'repeat');
    if (lettering) target.fillText('IKIKAE', 384, 132);
    else target.fillRect(0, 0, 768, 256);
  };
  const grey = value => [value, value, value];
  fill(color, (crown, warp) => {
    const v = lettering ? 109 + 32 * crown + (warp ? 4 : 0) : 28 + 12 * crown + (warp ? 2 : 0);
    return [v, v + 2, v - 2];
  });
  fill(height, crown => grey((lettering ? 139 : 103) + 33 * crown));
  fill(roughness, (crown, warp) => grey((lettering ? 143 : 199) - 21 * crown + (warp ? 5 : 0)));
}

export function createWovenLabelMaterial() {
  const label = document.createElement('canvas');
  label.width = 768;
  label.height = 256;
  const relief = label.cloneNode(), finish = label.cloneNode();
  const color = label.getContext('2d'), height = relief.getContext('2d'), roughness = finish.getContext('2d');
  twillPatterns(color, height, roughness, false);

  for (const [inset, width, value] of [[2, 4, 42], [6, 4, 160], [9, 3, 149], [15, 6, 91]]) {
    height.lineWidth = width;
    height.strokeStyle = `rgb(${value}, ${value}, ${value})`;
    height.strokeRect(inset, inset, label.width - inset * 2, label.height - inset * 2);
  }
  for (const [ctx, base, crown] of [
    [color, '#393b34', '#52554b'], [height, '#515151', '#c5c5c5'], [roughness, '#b5b5b5', '#848484'],
  ]) {
    // A lockstitch dips into the fabric at each end; only its centre catches light.
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.roundRect(15, 15, 738, 226, 6);
    ctx.setLineDash([8, 7]);
    ctx.strokeStyle = base;
    ctx.lineWidth = 3.7;
    ctx.stroke();
    ctx.setLineDash([5, 10]);
    ctx.lineDashOffset = -1.5;
    ctx.strokeStyle = crown;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 72px Arial';
  }
  twillPatterns(color, height, roughness, true);

  const map = new THREE.CanvasTexture(label);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(relief), roughnessMap = new THREE.CanvasTexture(finish);
  for (const texture of [map, bumpMap, roughnessMap]) texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({
    map, bumpMap, roughnessMap, bumpScale: .0014, roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
}
