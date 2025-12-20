"use strict";

/**
 * Piece library (pieces.json) loader/saver
 */

const fs = require("fs");
const path = require("path");

const PIECES_PATH = path.join(__dirname, "../../pieces.json");

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

module.exports = { loadPieces, savePieces, PIECES_PATH };

