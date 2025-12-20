"use strict";

/**
 * Track placer: builds blocks from tokens using piece library
 */

const validate = require("./validate");

function rotateDxDz(dx, dz, rot) {
  // rot: 0=N, 1=E, 2=S, 3=W
  if (rot === 0) return { dx, dz };
  if (rot === 1) return { dx: -dz, dz: dx };
  if (rot === 2) return { dx: -dx, dz: -dz };
  return { dx: dz, dz: -dx };
}

function key(x,y,z){ return `${x},${y},${z}`; }

function neighborsKeySet(x,y,z){
  // 4-neighbors on x/z plane (same y)
  return [
    key(x+1,y,z),
    key(x-1,y,z),
    key(x,y,z+1),
    key(x,y,z-1),
  ];
}


function placeTrack(tokens, name, pieces) {
  // Validate tokens exist + are learned
  validate.validateTokens(tokens, pieces);

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
    validate.validateStep(tok, step);

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

module.exports = { placeTrack };

