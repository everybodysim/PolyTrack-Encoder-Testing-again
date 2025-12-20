"use strict";

/**
 * Placer: takes tokens + pieces.json and outputs blocks {partId,x,y,z,rot}.
 *
 * Guards:
 * - exact overlap (same x,y,z)
 * - collision (4-neighbor adjacency self-hit) except previous tile
 * - step(0,0,0) forbidden for non end/finish
 */

const validate = require("./validate");

function rotateDxDz(dx, dz, rot) {
  // rot: 0,1,2,3 = 90° increments around Y
  if ((rot & 3) === 0) return { dx, dz };
  if ((rot & 3) === 1) return { dx: -dz, dz: dx };
  if ((rot & 3) === 2) return { dx: -dx, dz: -dz };
  return { dx: dz, dz: -dx };
}

function neighborKeys4(x, y, z) {
  // 4-neighbors on x/z plane (same y)
  return [
    validate.coordKey(x + 1, y, z),
    validate.coordKey(x - 1, y, z),
    validate.coordKey(x, y, z + 1),
    validate.coordKey(x, y, z - 1)
  ];
}

function buildTrackFromTokens(tokens, name, pieces) {
  if (!Array.isArray(tokens)) throw new Error("tokens must be an array of strings");

  let x = 0, y = 0, z = 0;
  let curRot = 0; // 0..3

  const blocks = [];
  const used = new Set(); // coordKey of every placed tile
  let prevKey = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = String(tokens[i] ?? "").trim();
    if (!token) throw new Error(`Empty token at index ${i}.`);

    const spec = validate.requireTokenSpec(token, i, pieces);
    const step = spec.step ?? { dx: 0, dy: 0, dz: 0 };
    validate.validateStep(token, i, step);

    const k = validate.coordKey(x, y, z);

    // OVERLAP GUARD
    if (used.has(k)) {
      throw new Error(
        `Overlap: token "${token}" at index ${i} would place at ${validate.coordString(x, y, z)}, which is already used.`
      );
    }

    // COLLISION GUARD (neighbor self-hit)
    for (const nk of neighborKeys4(x, y, z)) {
      if (used.has(nk) && nk !== prevKey) {
        const [nx, ny, nz] = nk.split(",").map((v) => Number(v));
        throw new Error(
          `Collision: token "${token}" at index ${i} placed at ${validate.coordString(x, y, z)} touches prior tile at ${validate.coordString(nx, ny, nz)}.`
        );
      }
    }

    // Place current block at cursor
    const placedRot = (curRot + (spec.baseRot ?? 0)) & 3;
    blocks.push({ partId: spec.partId, x, y, z, rot: placedRot });

    used.add(k);
    prevKey = k;

    // Advance cursor by step rotated by curRot
    const dy = step.dy ?? 0;
    const r = rotateDxDz(step.dx ?? 0, step.dz ?? 0, curRot);
    x += r.dx;
    y += dy;
    z += r.dz;

    // Update direction
    curRot = (curRot + (spec.rotDelta ?? 0)) & 3;
  }

  return { name: String(name ?? "MyTrack"), blocks };
}

module.exports = { buildTrackFromTokens };


