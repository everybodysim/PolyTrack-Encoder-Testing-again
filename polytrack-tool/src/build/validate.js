"use strict";

function isEndToken(token) {
  return token === "end" || token === "finish";
}

function requireTokenSpec(token, tokenIndex, pieces) {
  if (!pieces || typeof pieces !== "object") {
    throw new Error("Invalid pieces library (expected object).");
  }
  if (!(token in pieces)) {
    const known = Object.keys(pieces).sort().join(", ");
    throw new Error(`Unknown token "${token}" at index ${tokenIndex}. Known: ${known}`);
  }
  const spec = pieces[token];
  if (spec == null) {
    throw new Error(`Token "${token}" at index ${tokenIndex} is null/undefined in pieces.json (not learned).`);
  }
  return spec;
}

function validateStep(token, tokenIndex, step) {
  const dx = step?.dx ?? 0;
  const dy = step?.dy ?? 0;
  const dz = step?.dz ?? 0;
  if (!isEndToken(token) && dx === 0 && dy === 0 && dz === 0) {
    throw new Error(`Invalid step (0,0,0) for token "${token}" at index ${tokenIndex}. Only end/finish may have zero step.`);
  }
}

function coordKey(x, y, z) {
  return `${x},${y},${z}`;
}

function coordString(x, y, z) {
  return `(${x},${y},${z})`;
}

module.exports = {
  isEndToken,
  requireTokenSpec,
  validateStep,
  coordKey,
  coordString
};


