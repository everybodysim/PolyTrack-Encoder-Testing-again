"use strict";

/**
 * PolyTrack 0.4.1 v3 encoder/decoder.
 *
 * Format:
 * - "v3" prefix
 * - nameLenEnc: 2 base62 chars that must decode to exactly 1 byte (nameEnc length in chars)
 * - nameEnc: base62(name UTF-8 bytes), length = nameLen
 * - trackEnc: base62(zlib(deflate(level=9, binaryTrackBytes)))
 */

const zlib = require("zlib");
const { TextEncoder, TextDecoder } = require("util");

const base62 = require("./base62");
const binary = require("./binary");

function encodeV3({ name, blocks }) {
  const nameBytes = new TextEncoder().encode(String(name ?? ""));
  const nameEnc = base62.encode(nameBytes);

  if (nameEnc.length > 255) {
    throw new Error(`Track name is too long after encoding (nameEnc length ${nameEnc.length} > 255).`);
  }

  // One byte, but the v3 header always stores it using 2 base62 chars.
  let nameLenEnc = base62.encode(new Uint8Array([nameEnc.length]));
  if (nameLenEnc.length < 2) nameLenEnc = nameLenEnc.padEnd(2, "A");
  if (nameLenEnc.length !== 2) {
    throw new Error(`Internal error: nameLenEnc must be 2 chars, got ${nameLenEnc.length}.`);
  }

  const raw = binary.buildTrackBytes(blocks);
  const deflated = zlib.deflateSync(Buffer.from(raw), { level: 9 }); // zlib-wrapped
  const trackEnc = base62.encode(new Uint8Array(deflated));

  return "v3" + nameLenEnc + nameEnc + trackEnc;
}

function decodeV3(code) {
  const cleaned = String(code ?? "").replace(/\s+/g, "");
  if (!cleaned.startsWith("v3")) throw new Error("Not a v3 code");
  if (cleaned.length < 4) throw new Error("Truncated v3 code");

  const nameLenBytes = base62.decode(cleaned.substring(2, 4));
  if (!nameLenBytes || nameLenBytes.length !== 1) throw new Error("Bad name length");
  const nameLen = nameLenBytes[0];

  const nameEnc = cleaned.substring(4, 4 + nameLen);
  if (nameEnc.length !== nameLen) throw new Error("Truncated name");

  const nameBytes = base62.decode(nameEnc);
  if (!nameBytes) throw new Error("Bad name bytes");
  const name = new TextDecoder("utf-8").decode(nameBytes);

  const dataStr = cleaned.substring(4 + nameLen);
  const comp = base62.decode(dataStr);
  if (!comp) throw new Error("Bad track data base62");

  const inflated = zlib.inflateSync(Buffer.from(comp)); // zlib-wrapped
  const blocks = binary.parseTrackBytes(new Uint8Array(inflated));

  return { name, blocks };
}

module.exports = { encodeV3, decodeV3 };


