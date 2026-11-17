// Builds public/land-mask.png (equirectangular, 720x360, white = land) from Natural Earth via world-atlas.
// Run once with `node scripts/landmask.mjs`; the PNG is committed and the site never fetches map data.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { feature } from 'topojson-client';

const W = 720, H = 360;
const topo = JSON.parse(fs.readFileSync(new URL('../node_modules/world-atlas/land-50m.json', import.meta.url)));
const land = feature(topo, topo.objects.land);
const rings = land.features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)).flat();

// Scanline fill per ring, XOR-combined (holes fall out). Edges that jump across the antimeridian are skipped;
// a ring left with an odd crossing count closes at the map's east edge.
const px = Buffer.alloc(W * H);
for (const ring of rings) {
  for (let y = 0; y < H; y++) {
    const lat = 90 - ((y + 0.5) * 180) / H;
    const xs = [];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x1, y1] = ring[j], [x2, y2] = ring[i];
      if (Math.abs(x2 - x1) > 180) continue;
      if ((y1 > lat) !== (y2 > lat)) xs.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
    }
    if (!xs.length) continue;
    xs.sort((a, b) => a - b);
    if (xs.length % 2) xs.push(180);
    const fill = (l, r) => {
      const a = Math.max(0, Math.round(((l + 180) / 360) * W)), b = Math.min(W, Math.round(((r + 180) / 360) * W));
      for (let x = a; x < b; x++) px[y * W + x] ^= 255;
    };
    for (let k = 0; k + 1 < xs.length; k += 2) {
      // A span wider than half the world is an island straddling the antimeridian: fill the two outer ends.
      if (xs[k + 1] - xs[k] > 180) { fill(-180, xs[k]); fill(xs[k + 1], 180); } else fill(xs[k], xs[k + 1]);
    }
  }
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 0; // 8-bit greyscale
const raw = Buffer.concat(Array.from({ length: H }, (_, y) => Buffer.concat([Buffer.from([0]), px.subarray(y * W, (y + 1) * W)])));
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
fs.writeFileSync(new URL('../public/land-mask.png', import.meta.url), png);
const share = px.reduce((s, v) => s + (v ? 1 : 0), 0) / px.length;
console.log(`land-mask.png ${png.length} bytes, land share ${(share * 100).toFixed(1)}%`);
