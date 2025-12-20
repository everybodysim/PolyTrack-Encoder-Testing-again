"use strict";

/**
 * Web server for PolyTrack v3 Builder
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const pieces = require("./src/core/pieces");
const commaSimple = require("./src/describers/commaSimple");
const placer = require("./src/build/placer");
const v3 = require("./src/core/v3");

const PORT = process.env.PORT || 3000;
const WEB_DIR = path.join(__dirname, "web");

function serveStatic(req, res) {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  if (pathname === "/") {
    pathname = "/index.html";
  }

  const filePath = path.join(WEB_DIR, pathname);
  const ext = path.extname(filePath).toLowerCase();

  const contentTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    res.writeHead(200, { "Content-Type": contentTypes[ext] || "text/plain" });
    res.end(data);
  });
}

function handleApiEncode(req, res) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    try {
      const { name, input } = JSON.parse(body);

      if (!input) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing 'input' field" }));
        return;
      }

      const piecesLib = pieces.loadPieces();
      const tokens = commaSimple.parse(input);
      const track = placer.placeTrack(tokens, name || "MyTrack", piecesLib);
      const code = v3.encodeV3(track);

      // Extra safety: round-trip decode to ensure the code is structurally valid
      try {
        v3.decodeV3(code);
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Internal sanity check failed: ${e.message}` }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ code }));
    } catch (error) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url.startsWith("/api/encode")) {
    if (req.method === "POST") {
      handleApiEncode(req, res);
    } else {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
    }
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`PolyTrack v3 Builder server running on http://localhost:${PORT}`);
});

