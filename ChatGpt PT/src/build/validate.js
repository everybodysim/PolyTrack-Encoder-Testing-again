"use strict";

/**
 * Validation utilities for track building
 */

function validateTokens(tokens, pieces) {
  for (const tok of tokens) {
    if (!(tok in pieces)) {
      const known = Object.keys(pieces).sort().join(", ");
      throw new Error(`Unknown keyword "${tok}". Known: ${known}`);
    }
    if (pieces[tok] == null) {
      throw new Error(`"${tok}" is not learned yet (or is null). Fix pieces.json or re-learn.`);
    }
  }
}

function validateStep(tok, step) {
  const isEnd = (tok === "end" || tok === "finish");
  if (!isEnd && step.dx === 0 && (step.dy || 0) === 0 && step.dz === 0) {
    throw new Error(`"${tok}" has step (0,0,0). That will stack pieces and break PolyTrack. Fix pieces.json for ${tok}.`);
  }
}

function checkOverlap(x, y, z, seen) {
  const posKey = (x, y, z) => `${x},${y},${z}`;
  const k = posKey(x, y, z);
  if (seen.has(k)) {
    throw new Error(`Overlap at (${x},${y},${z}). A piece step/rotation is wrong.`);
  }
  seen.add(k);
}

module.exports = { validateTokens, validateStep, checkOverlap };

