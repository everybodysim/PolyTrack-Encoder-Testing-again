"use strict";

/**
 * Track binary format (writer + parser)
 */

const OFFSET = 2 ** 23;

function pushU24LE(arr, v) { arr.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255); }
function pushU16LE(arr, v) { arr.push(v & 255, (v >>> 8) & 255); }
function pushU32LE(arr, v) { arr.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255); }

function buildTrackBytes(blocksInOrder) {
  const map = new Map();
  for (const b of blocksInOrder) {
    if (!map.has(b.partId)) map.set(b.partId, []);
    map.get(b.partId).push(b);
  }

  const out = [];
  for (const [partId, blocks] of map.entries()) {
    pushU16LE(out, partId);
    pushU32LE(out, blocks.length);

    for (const b of blocks) {
      const rx = (b.x + OFFSET) >>> 0;
      const ry = (b.y >>> 0);
      const rz = (b.z + OFFSET) >>> 0;
      pushU24LE(out, rx);
      pushU24LE(out, ry);
      pushU24LE(out, rz);
      out.push(b.rot & 3);
    }
  }
  return new Uint8Array(out);
}

function parseTrackBytes(rawBytes) {
  const blocks = [];
  let s = 0;
  const r = rawBytes;

  while (s < r.length) {
    if (r.length - s < 2) throw new Error("Truncated partId");
    const partId = r[s] | (r[s + 1] << 8);
    s += 2;

    if (r.length - s < 4) throw new Error("Truncated count");
    const count = (r[s] | (r[s + 1] << 8) | (r[s + 2] << 16) | (r[s + 3] << 24)) >>> 0;
    s += 4;

    for (let n = 0; n < count; n++) {
      if (r.length - s < 3) throw new Error("Truncated x");
      const x = (r[s] | (r[s + 1] << 8) | (r[s + 2] << 16)) - OFFSET;
      s += 3;

      if (r.length - s < 3) throw new Error("Truncated y");
      const y = (r[s] | (r[s + 1] << 8) | (r[s + 2] << 16)) >>> 0;
      s += 3;

      if (r.length - s < 3) throw new Error("Truncated z");
      const z = (r[s] | (r[s + 1] << 8) | (r[s + 2] << 16)) - OFFSET;
      s += 3;

      if (r.length - s < 1) throw new Error("Truncated rot");
      const rot = r[s] & 3;
      s += 1;

      blocks.push({ partId, x, y, z, rot });
    }
  }

  return blocks;
}

module.exports = { buildTrackBytes, parseTrackBytes };

