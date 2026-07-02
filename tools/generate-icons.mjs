/* ============================================================================
 * Generates the PWA icons (a pokéball on the app's dark gradient) as PNGs,
 * with no image-library dependencies — pixels are computed directly and
 * encoded as PNG by hand. Rerun after tweaking:
 *   node tools/generate-icons.mjs
 * ==========================================================================*/

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");
const SS = 4; // supersampling factor for smooth edges

// ---- tiny PNG encoder ------------------------------------------------------
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(rgba, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- scene -------------------------------------------------------------------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const BG_TOP = hex("#2a2060");
const BG_BOT = hex("#14102b");
const RED_HI = hex("#ff8787");
const RED_LO = hex("#e03131");
const WHITE = hex("#f8f9fa");
const DARK = hex("#212529");

/**
 * Color of one (sub)pixel. u,v in [0,1]; opts control corner rounding
 * (transparent corners) and pokéball size for maskable padding.
 * Returns [r,g,b,a] with a in 0..255.
 */
function shade(u, v, { cornerRadius, ballRadius }) {
  // rounded-square background mask
  let alpha = 1;
  if (cornerRadius > 0) {
    const r = cornerRadius;
    const cx = Math.max(r - u, u - (1 - r), 0);
    const cy = Math.max(r - v, v - (1 - r), 0);
    if (Math.hypot(cx, cy) > r) alpha = 0;
  }
  if (alpha === 0) return [0, 0, 0, 0];

  let color = mix(BG_TOP, BG_BOT, v);

  // pokéball
  const dx = u - 0.5;
  const dy = v - 0.5;
  const d = Math.hypot(dx, dy);
  const R = ballRadius;
  if (d < R) {
    const isTop = dy < 0;
    // shell with a subtle radial shade
    const shadeT = Math.min(1, d / R);
    color = isTop ? mix(RED_HI, RED_LO, 0.25 + 0.75 * shadeT) : mix(WHITE, [214, 216, 220], shadeT * 0.7);
    // center band
    if (Math.abs(dy) < R * 0.14) color = DARK;
    // button
    if (d < R * 0.30) color = DARK;
    if (d < R * 0.18) color = WHITE;
    // rim
    if (d > R * 0.92) color = DARK;
  }

  return [...color, alpha * 255];
}

function render(size, opts) {
  const big = size * SS;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [pr, pg, pb, pa] = shade((x * SS + sx + 0.5) / big, (y * SS + sy + 0.5) / big, opts);
          r += pr * pa; g += pg * pa; b += pb * pa; a += pa;
        }
      }
      const i = (y * size + x) * 4;
      rgba[i] = a ? r / a : 0;
      rgba[i + 1] = a ? g / a : 0;
      rgba[i + 2] = a ? b / a : 0;
      rgba[i + 3] = a / (SS * SS);
    }
  }
  return encodePNG(rgba, size, size);
}

mkdirSync(OUT_DIR, { recursive: true });
const ICONS = [
  ["icon-192.png", 192, { cornerRadius: 0.22, ballRadius: 0.34 }],
  ["icon-512.png", 512, { cornerRadius: 0.22, ballRadius: 0.34 }],
  ["icon-maskable-512.png", 512, { cornerRadius: 0, ballRadius: 0.28 }], // full bleed + safe zone
  ["apple-touch-icon.png", 180, { cornerRadius: 0, ballRadius: 0.34 }], // iOS rounds corners itself
];
for (const [name, size, opts] of ICONS) {
  writeFileSync(join(OUT_DIR, name), render(size, opts));
  console.log(`wrote icons/${name} (${size}x${size})`);
}
