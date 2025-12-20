"use strict";

/**
 * v3 encode/decode
 */

const zlib = require("zlib");
const base62 = require("./base62");
const binary = require("./binary");

function encodeV3({ name, blocks }) {
  const nameEnc = base62.encode(new TextEncoder().encode(name));
  const lenByte = new Uint8Array([nameEnc.length]);
  let lenEnc = base62.encode(lenByte);
  if (lenEnc.length === 1) lenEnc += "A";

  const raw = binary.buildTrackBytes(blocks);
  const deflated = zlib.deflateSync(Buffer.from(raw), { level: 9 }); // zlib-wrapped
  const trackDataEnc = base62.encode(new Uint8Array(deflated));

  return "v3" + lenEnc + nameEnc + trackDataEnc;
}

function decodeV3(code) {
  const cleaned = code.replace(/\s+/g, "");
  if (!cleaned.startsWith("v3")) throw new Error("Not a v3 code");

  const nameLenBytes = base62.decode(cleaned.substring(2, 4));
  if (!nameLenBytes || nameLenBytes.length !== 1) throw new Error("Bad name length");
  const nameLen = nameLenBytes[0];

  const nameBytes = base62.decode(cleaned.substring(4, 4 + nameLen));
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

