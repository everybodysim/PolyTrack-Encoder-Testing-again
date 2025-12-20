#!/usr/bin/env node
"use strict";

/**
 * CLI:
 * - node src/cli.js build        (interactive)
 * - node src/cli.js decode "<v3>"
 */

const readline = require("readline");
const fs = require("fs");
const path = require("path");

const commaSimple = require("./describers/commaSimple");
const { buildTrackFromTokens } = require("./build/placer");
const v3 = require("./core/v3");

const PIECES_PATH = path.join(__dirname, "../pieces.json");

function loadPiecesFresh() {
  const raw = fs.readFileSync(PIECES_PATH, "utf8");
  return JSON.parse(raw);
}

function usage() {
  console.log(`
Usage:
  node src/cli.js build
  node src/cli.js decode "<v3code>"

Build input example:
  start, straight, right2, straight, left1, end
`);
}

async function ask(promptText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(promptText, resolve));
  rl.close();
  return answer;
}

async function runInteractiveBuild() {
  console.log("PolyTrack 0.4.1 v3 Tool\n");
  console.log("Comma-separated description.");
  console.log('Example: start, straight, right2, straight, left1, end\n');

  const name = (await ask("Track name (default: MyTrack): ")).trim() || "MyTrack";
  const input = (await ask("Tokens: ")).trim();
  const tokens = commaSimple.parse(input);

  const pieces = loadPiecesFresh();
  const track = buildTrackFromTokens(tokens, name, pieces);
  const code = v3.encodeV3(track);

  // Safety: round-trip decode to ensure structural validity.
  v3.decodeV3(code);

  console.log("\n=== IMPORT CODE ===\n");
  console.log(code);
  console.log("\n===================\n");
}

function runDecode(code) {
  const decoded = v3.decodeV3(code);
  console.log(JSON.stringify(decoded, null, 2));
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
    try {
      runDecode(code);
    } catch (e) {
      console.error("ERROR:", e.message);
      process.exit(1);
    }
    return;
  }

  usage();
}

main();


