#!/usr/bin/env node
"use strict";

/**
 * CLI for PolyTrack v3 builder
 */

const readline = require("readline");
const pieces = require("./core/pieces");
const commaSimple = require("./describers/commaSimple");
const placer = require("./build/placer");
const v3 = require("./core/v3");

function usage() {
  console.log(`
Usage:
  node src/cli.js               (interactive build)
  node src/cli.js build         (interactive build)
  node src/cli.js decode "<v3>" (decode to JSON)

BUILD input example:
  start, straight, right2, straight, left1, end

Pieces are stored in: ${pieces.PIECES_PATH}
`);
}

async function ask(promptText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(promptText, resolve));
  rl.close();
  return answer;
}

async function runInteractiveBuild() {
  const piecesLib = pieces.loadPieces();

  console.log("PolyTrack 0.4.1 v3 Builder\n");
  console.log("Comma-separated description.");
  console.log('Example: start, straight, right2, straight, left1, end\n');

  const name = (await ask("Track name (default: MyTrack): ")).trim() || "MyTrack";
  const desc = (await ask("> ")).trim();

  const tokens = commaSimple.parse(desc);
  const track = placer.placeTrack(tokens, name, piecesLib);
  const code = v3.encodeV3(track);

  // Extra safety: round-trip decode to ensure the code is structurally valid
  try { v3.decodeV3(code); } catch (e) {
    throw new Error(`Internal sanity check failed after encoding: ${e.message}`);
  }

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
    try { runDecode(code); } catch (e) { console.error("ERROR:", e.message); process.exit(1); }
    return;
  }

  usage();
}

main();
