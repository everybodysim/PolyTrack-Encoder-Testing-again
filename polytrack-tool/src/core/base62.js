"use strict";

/**
 * Base62 encoding/decoding (PolyTrack v3 bitpacking).
 *
 * Alphabet: ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789
 * Packing rule:
 * - If (value & 30) == 30 then pack 5 bits (value & 31)
 * - Else pack 6 bits
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
const MASK_30 = 30;

const REVERSE = new Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i++) {
  const c = ALPHABET[i].charCodeAt(0);
  if (c < REVERSE.length) REVERSE[c] = i;
}

// bit get
function gy(bytes, bitIndex) {
  const n = Math.floor(bitIndex / 8);
  const i = bytes[n];
  const r = bitIndex - 8 * n;
  // If we can't safely read next byte, return only what's available (same as PolyTrack).
  if (r <= 2 || n >= bytes.length - 1) return ((i & (63 << r)) >>> r);
  return ((i & (63 << r)) >>> r) | ((bytes[n + 1] & (63 >>> (8 - r))) << (8 - r));
}

// bit set
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

// bytes -> string
function fy(bytes) {
  let t = 0;
  let n = "";
  while (t < 8 * bytes.length) {
    const i = gy(bytes, t);
    let r;
    if ((i & MASK_30) === MASK_30) {
      r = 31 & i;
      t += 5;
    } else {
      r = i;
      t += 6;
    }
    n += ALPHABET[r];
  }
  return n;
}

// string -> bytes (Uint8Array) or null
function my(str) {
  let t = 0;
  const n = [];
  const i = str.length;
  for (let r = 0; r < i; r++) {
    const a = str.charCodeAt(r);
    if (a >= REVERSE.length) return null;
    const o = REVERSE[a];
    if (o === -1) return null;
    if ((o & MASK_30) === MASK_30) {
      vy(n, t, 5, o, r === i - 1);
      t += 5;
    } else {
      vy(n, t, 6, o, r === i - 1);
      t += 6;
    }
  }
  return new Uint8Array(n);
}

module.exports = {
  encode: fy,
  decode: my,
  _internal: { gy, vy, ALPHABET: ALPHABET.join("") }
};


