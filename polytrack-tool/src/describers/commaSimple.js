"use strict";

/**
 * Comma-separated describer.
 * Input: "start, straight, right2, end"
 * Output: ["start","straight","right2","end"]
 */

function normalizeToken(t) {
  return String(t ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function parse(description) {
  const desc = String(description ?? "");
  const tokens = desc.split(",").map(normalizeToken).filter(Boolean);
  if (tokens.length === 0) throw new Error("No tokens provided.");
  return tokens;
}

module.exports = { parse };


