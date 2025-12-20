"use strict";

/**
 * Minimal local server:
 * - Serves web UI from /web
 * - POST /api/encode {name,input,describer} -> {code} or {error}
 * - CORS enabled
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const { buildTrackFromTokens } = require("./src/build/placer");
const v3 = require("./src/core/v3");

const commaSimple = require("./src/describers/commaSimple");

const PORT = process.env.PORT || 3000;
const WEB_DIR = path.join(__dirname, "web");
const PIECES_PATH = path.join(__dirname, "pieces.json");

function loadPiecesFresh() {
  const raw = fs.readFileSync(PIECES_PATH, "utf8");
  return JSON.parse(raw);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString("utf8"); });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(new Error("Invalid JSON body")); }
    });
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

function serveStatic(req, res) {
  const parsed = url.parse(req.url, true);
  let pathname = parsed.pathname || "/";
  if (pathname === "/") pathname = "/index.html";

  // prevent directory traversal
  const filePath = path.normalize(path.join(WEB_DIR, pathname));
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad request");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function getDescriber(name) {
  const key = String(name || "commaSimple");
  const map = {
    commaSimple
  };
  return map[key] || map.commaSimple;
}

async function handleEncode(req, res) {
  const { name, input, describer } = await readJsonBody(req);
  if (!input) throw new Error("Missing 'input' field");

  const d = getDescriber(describer);
  const tokens = d.parse(input);
  const pieces = loadPiecesFresh();
  const track = buildTrackFromTokens(tokens, name || "MyTrack", pieces);
  const code = v3.encodeV3(track);

  // Safety: ensure it decodes.
  v3.decodeV3(code);

  return code;
}

const server = http.createServer(async (req, res) => {
  // CORS for simplicity
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url && req.url.startsWith("/api/encode")) {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
    try {
      const code = await handleEncode(req, res);
      return sendJson(res, 200, { code });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`PolyTrack tool running at http://localhost:${PORT}`);
});


