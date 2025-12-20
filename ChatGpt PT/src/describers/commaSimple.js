"use strict";

/**
 * Comma-separated describer: parses "start, straight, right2, end" into tokens array
 */

function normalizeToken(t) {
  return t.trim().toLowerCase().replace(/\s+/g, "");
}

function parse(description) {
  const tokens = description.split(",").map(normalizeToken).filter(Boolean);
  if (tokens.length === 0) {
    throw new Error("No pieces provided.");
  }
  return tokens;
}

module.exports = { parse };
