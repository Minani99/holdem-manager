// PNG 앱 아이콘 생성 (외부 패키지 없이): node tools/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const BG = hex('#0d1218'), RAIL = hex('#2b1d14'), GOLD = hex('#f6c350');
const F1 = hex('#25975f'), F2 = hex('#187448'), F3 = hex('#0c4a2f');

// 512 기준 좌표에서 한 점의 색
function shade(x, y) {
  const dx = x - 256, dy = y - 256, d = Math.hypot(dx, dy);
  // 스페이드: 뒤집힌 하트 + 줄기
  const s = 86, hx = dx / s, hy = (y - 236) / s;
  const heart = Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * hy * hy * hy <= 0;
  const t = (y - 300) / 96;
  const stem = t >= 0 && t <= 1 && Math.abs(dx) <= 9 + t * t * 46;
  if (heart || stem) return GOLD;
  if (d <= 170) {
    const g = Math.hypot(dx, y - 225) / 230;
    return g < 0.55 ? mix(F1, F2, g / 0.55) : mix(F2, F3, Math.min(1, (g - 0.55) / 0.45));
  }
  if (d >= 182 && d <= 186) return mix(RAIL, GOLD, 0.45);
  if (d <= 196) return RAIL;
  return BG;
}

function render(size) {
  const out = Buffer.alloc(size * size * 4);
  const SS = 4, k = 512 / size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = shade((px + (sx + 0.5) / SS) * k, (py + (sy + 0.5) / SS) * k);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS, i = (py * size + px) * 4;
      out[i] = Math.round(r / n); out[i + 1] = Math.round(g / n); out[i + 2] = Math.round(b / n); out[i + 3] = 255;
    }
  }
  return out;
}

const dir = path.join(__dirname, '..', 'icons');
for (const size of [192, 512]) {
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), png(size, render(size)));
  console.log(`icons/icon-${size}.png`);
}
