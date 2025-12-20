"use strict";

/**
 * Base62 encoding/decoding (exact PolyTrack bitpacking)
 */

const dy = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
const py = 30;

const uy = new Array(128).fill(-1);
for (let i = 0; i < dy.length; i++) {
  const c = dy[i].charCodeAt(0);
  if (c < uy.length) uy[c] = i;
}

function gy(bytes, bitIndex) {
  const n = Math.floor(bitIndex / 8);
  const i = bytes[n];
  const r = bitIndex - 8 * n;
  if (r <= 2 || n >= bytes.length - 1) return ((i & (63 << r)) >>> r);
  return ((i & (63 << r)) >>> r) | ((bytes[n + 1] & (63 >>> (8 - r))) << (8 - r));
}

function vy(out, bitIndex, bitCount, value, isLastChar) {
  const a = Math.floor(bitIndex / 8);
  while (a >= out.length) out.push(0);
  const o = bitIndex - 8 * a;
  out[a] |= (value << o) & 255;
  if (o > 8 - bitCount && !isLastChar) {
    const next = a + 1;
    if (next >= out.length) out.push(0);
    out[next] |= value >> (8 - o);
  }
}

function fy(bytes) {
  let t = 0;
  let n = "";
  while (t < 8 * bytes.length) {
    const i = gy(bytes, t);
    let r;
    if ((i & py) === py) { r = 31 & i; t += 5; }
    else { r = i; t += 6; }
    n += dy[r];
  }
  return n;
}

function my(str) {
  let t = 0;
  const n = [];
  const i = str.length;
  for (let r = 0; r < i; r++) {
    const a = str.charCodeAt(r);
    if (a >= uy.length) return null;
    const o = uy[a];
    if (o === -1) return null;
    if ((o & py) === py) {
      vy(n, t, 5, o, r === i - 1);
      t += 5;
    } else {
      vy(n, t, 6, o, r === i - 1);
      t += 6;
    }
  }
  return new Uint8Array(n);
}

module.exports = { encode: fy, decode: my };

