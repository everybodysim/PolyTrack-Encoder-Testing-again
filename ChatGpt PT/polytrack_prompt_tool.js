#!/usr/bin/env node
"use strict";

/**
 * PolyTrack 0.4.1 v3 builder + encoder/decoder + Learn mode (SAFE)
 *
 * BUILD MODE (interactive):
 *   - You type: start, straight, right2, straight, left1, end
 *   - It builds blocks + encodes to v3 code.
 *
 * LEARN MODE (batch paste):
 *   - You paste lines: right2=v3....
 *   - IMPORTANT: Each exported learning track MUST be:
 *       start, <piece>, straight, end
 *     (the script learns piece stepping/rotation from the straight, not the finish)
 *
 * Files:
 *   - pieces.json stores learned pieces
 */

const fs = require("fs");
const zlib = require("zlib");
const readline = require("readline");

// =========================
// Base62 (exact PolyTrack bitpacking)
// =========================

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

// =========================
// Track binary format (writer + parser)
// =========================

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

// =========================
// v3 encode/decode
// =========================

function encodeV3({ name, blocks }) {
  const nameEnc = fy(new TextEncoder().encode(name));
  const lenByte = new Uint8Array([nameEnc.length]);
  let lenEnc = fy(lenByte);
  if (lenEnc.length === 1) lenEnc += "A";

  const raw = buildTrackBytes(blocks);
  const deflated = zlib.deflateSync(Buffer.from(raw), { level: 9 }); // zlib-wrapped
  const trackDataEnc = fy(new Uint8Array(deflated));

  return "v3" + lenEnc + nameEnc + trackDataEnc;
}

function decodeV3(code) {
  const cleaned = code.replace(/\s+/g, "");
  if (!cleaned.startsWith("v3")) throw new Error("Not a v3 code");

  const nameLenBytes = my(cleaned.substring(2, 4));
  if (!nameLenBytes || nameLenBytes.length !== 1) throw new Error("Bad name length");
  const nameLen = nameLenBytes[0];

  const nameBytes = my(cleaned.substring(4, 4 + nameLen));
  if (!nameBytes) throw new Error("Bad name bytes");
  const name = new TextDecoder("utf-8").decode(nameBytes);

  const dataStr = cleaned.substring(4 + nameLen);
  const comp = my(dataStr);
  if (!comp) throw new Error("Bad track data base62");

  const inflated = zlib.inflateSync(Buffer.from(comp)); // zlib-wrapped
  const blocks = parseTrackBytes(new Uint8Array(inflated));

  return { name, blocks };
}

// =========================
// Piece library (pieces.json)
// =========================

const PIECES_PATH = "./pieces.json";

function defaultPieces() {
  return {
    // Base pieces we already know
    start:    { partId: 5, baseRot: 0, step: { dx: 0, dy: 0, dz: -1 }, rotDelta: 0 },
    straight: { partId: 0, baseRot: 0, step: { dx: 0, dy: 0, dz: -1 }, rotDelta: 0 },
    end:      { partId: 6, baseRot: 0, step: { dx: 0, dy: 0, dz:  0 }, rotDelta: 0 },
    finish:   { partId: 6, baseRot: 0, step: { dx: 0, dy: 0, dz:  0 }, rotDelta: 0 },

    // Turns you want (learn these)
    right1: null, right2: null, right3: null, right4: null,
    left1:  null, left2:  null, left3:  null, left4:  null,

    // Side shifts (learn these)
    shiftleft: null,
    shiftright: null,
  };
}

function loadPieces() {
  try {
    const raw = fs.readFileSync(PIECES_PATH, "utf8");
    const obj = JSON.parse(raw);
    return { ...defaultPieces(), ...obj };
  } catch {
    const obj = defaultPieces();
    fs.writeFileSync(PIECES_PATH, JSON.stringify(obj, null, 2), "utf8");
    return obj;
  }
}

function savePieces(pieces) {
  fs.writeFileSync(PIECES_PATH, JSON.stringify(pieces, null, 2), "utf8");
}

// =========================
// Build from comma-separated keywords
// =========================

function normalizeToken(t) {
  return t.trim().toLowerCase().replace(/\s+/g, "");
}

function rotateDxDz(dx, dz, rot) {
  // rot: 0=N, 1=E, 2=S, 3=W
  if (rot === 0) return { dx, dz };
  if (rot === 1) return { dx: -dz, dz: dx };
  if (rot === 2) return { dx: -dx, dz: -dz };
  return { dx: dz, dz: -dx };
}

function buildTrackFromKeywords(desc, name, pieces) {
  const tokens = desc.split(",").map(normalizeToken).filter(Boolean);
  if (tokens.length === 0) throw new Error("No pieces provided.");

  // Validate tokens exist + are learned
  for (const tok of tokens) {
    if (!(tok in pieces)) {
      const known = Object.keys(pieces).sort().join(", ");
      throw new Error(`Unknown keyword "${tok}". Known: ${known}`);
    }
    if (pieces[tok] == null) {
      throw new Error(`"${tok}" is not learned yet (or is null). Fix pieces.json or re-learn.`);
    }
  }

  let x = 0, y = 0, z = 0;
  let curRot = 0; // 0..3
  const blocks = [];

  // OVERLAP GUARD: prevents tracks that import but black-screen the game
  const seen = new Set();
  const posKey = (x, y, z) => `${x},${y},${z}`;

  for (const tok of tokens) {
    const spec = pieces[tok];

    // Refuse pieces with missing or zero movement (except end/finish)
    const step = spec.step || { dx: 0, dy: 0, dz: 0 };
    const isEnd = (tok === "end" || tok === "finish");
    if (!isEnd && step.dx === 0 && (step.dy || 0) === 0 && step.dz === 0) {
      throw new Error(`"${tok}" has step (0,0,0). That will stack pieces and break PolyTrack. Fix pieces.json for ${tok}.`);
    }

    // Overlap check BEFORE placing
    const k = posKey(x, y, z);
    if (seen.has(k)) {
      throw new Error(`Overlap at (${x},${y},${z}) before placing "${tok}". A piece step/rotation is wrong.`);
    }
    seen.add(k);

    // Place
    const placedRot = (curRot + (spec.baseRot || 0)) & 3;
    blocks.push({ partId: spec.partId, x, y, z, rot: placedRot });

    // Move cursor by learned step, rotated by curRot
    const r = rotateDxDz(step.dx, step.dz, curRot);
    x += r.dx;
    y += (step.dy || 0);
    z += r.dz;

    // Apply rotation change
    curRot = (curRot + (spec.rotDelta || 0)) & 3;
  }

  return { name, blocks };
}


// =========================
// LEARN mode (SAFE)
// Track MUST be: start, <piece>, straight, end
// =========================

function findOne(blocks, predicate, label) {
  const hits = blocks.filter(predicate);
  if (hits.length !== 1) throw new Error(`Expected exactly 1 ${label}, found ${hits.length}`);
  return hits[0];
}

function learnOne(pieces, keyword, v3code) {
  const decoded = decodeV3(v3code);

  const START = 5;
  const STRAIGHT = 0;

  // Find the tested piece: not start, not end(6), not straight(0)
  const midHits = decoded.blocks.filter(b => b.partId !== START && b.partId !== 6 && b.partId !== STRAIGHT);
  if (midHits.length !== 1) {
    throw new Error(
      `Learn expects exactly 1 test piece (not start/end/straight). Found ${midHits.length}. ` +
      `Make the track: start, ${keyword}, straight, end`
    );
  }
  const mid = midHits[0];

  // Find the straight that comes after the piece:
  // In these calibration tracks there should be exactly one straight.
  const nextStraight = findOne(decoded.blocks, b => b.partId === STRAIGHT, "straight piece");

  // Step is from mid -> nextStraight
  const step = {
    dx: nextStraight.x - mid.x,
    dy: nextStraight.y - mid.y,
    dz: nextStraight.z - mid.z,
  };

  // Rotation delta is how rotation changes from the piece to the straight.
  // This works well as a “turn effect” template.
  const rotDelta = (nextStraight.rot - mid.rot) & 3;

  pieces[keyword] = {
    partId: mid.partId,
    baseRot: mid.rot,
    step,
    rotDelta,
  };

  return { trackName: decoded.name, learned: pieces[keyword] };
}

// =========================
// CLI / interactive
// =========================

function usage() {
  console.log(`
Usage:
  node polytrack_prompt_tool.js               (interactive build)
  node polytrack_prompt_tool.js build         (interactive build)
  node polytrack_prompt_tool.js decode "<v3>" (decode to JSON)
  node polytrack_prompt_tool.js learn         (batch learn: keyword=v3CODE)

BUILD input example:
  start, straight, right2, straight, left1, end

LEARN mode IMPORTANT:
  Each learning export MUST be: start, <piece>, straight, end
  Then paste lines like:
    right2=v3....
    left1=v3....
  End with a blank line.

Pieces are stored in: ${PIECES_PATH}
`);
}

async function ask(promptText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(promptText, resolve));
  rl.close();
  return answer;
}

async function runInteractiveBuild() {
  const pieces = loadPieces();

  console.log("PolyTrack 0.4.1 v3 Builder\n");
  console.log("Comma-separated description.");
  console.log('Example: start, straight, right2, straight, left1, end\n');

  const name = (await ask("Track name (default: MyTrack): ")).trim() || "MyTrack";
  const desc = (await ask("> ")).trim();

  const track = buildTrackFromKeywords(desc, name, pieces);
  const code = encodeV3(track);

  // Extra safety: round-trip decode to ensure the code is structurally valid
  try { decodeV3(code); } catch (e) {
    throw new Error(`Internal sanity check failed after encoding: ${e.message}`);
  }

  console.log("\n=== IMPORT CODE ===\n");
  console.log(code);
  console.log("\n===================\n");
}

function runDecode(code) {
  const decoded = decodeV3(code);
  console.log(JSON.stringify(decoded, null, 2));
}

function runLearnPasteMode() {
  const pieces = loadPieces();

  console.log("LEARN MODE (SAFE)");
  console.log("Paste lines like: keyword=v3CODE");
  console.log("IMPORTANT: Each export must be: start, <piece>, straight, end");
  console.log("Finish by submitting a blank line.\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const lines = [];

  rl.on("line", (line) => {
    const t = line.trim();
    if (!t) { rl.close(); return; }
    lines.push(t);
  });

  rl.on("close", () => {
    for (const line of lines) {
      const eq = line.indexOf("=");
      if (eq === -1) {
        console.log(`Skipping (missing '='): ${line}`);
        continue;
      }
      const key = normalizeToken(line.slice(0, eq));
      const code = line.slice(eq + 1).trim();

      try {
        const info = learnOne(pieces, key, code);
        const L = info.learned;
        console.log(
          `Learned ${key}: partId=${L.partId}, baseRot=${L.baseRot}, step=(${L.step.dx},${L.step.dy},${L.step.dz}), rotDelta=${L.rotDelta} (trackName="${info.trackName}")`
        );
      } catch (e) {
        console.log(`Failed to learn "${key}": ${e.message}`);
      }
    }

    savePieces(pieces);
    console.log(`\nSaved piece map to ${PIECES_PATH}`);
    console.log("Now use build mode: node polytrack_prompt_tool.js");
  });
}

function main() {
  const args = process.argv.slice(2);
  const cmd = (args[0] || "build").toLowerCase();

  if (cmd === "help" || cmd === "--help" || cmd === "-h") return usage();

  if (cmd === "build") {
    runInteractiveBuild().catch((e) => {
      console.error("\nERROR:", e.message);
      process.exit(1);
    });
    return;
  }

  if (cmd === "decode") {
    const code = args.slice(1).join(" ").trim();
    if (!code) return usage();
    try { runDecode(code); } catch (e) { console.error("ERROR:", e.message); process.exit(1); }
    return;
  }

  if (cmd === "learn") {
    runLearnPasteMode();
    return;
  }

  usage();
}

main();
