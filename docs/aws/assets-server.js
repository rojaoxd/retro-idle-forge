/**
 * assets-server.js — standalone HTTP static server for the Tibia74 client assets.
 *
 * Roda ao lado do engine.js na AWS. Serve /data/740/Tibia.spr, Tibia.dat e
 * constants.json com CORS liberado para o site do Lovable, para que o cliente
 * hospedado em retro-idle-forge.lovable.app consiga baixar os sprites.
 *
 * Uso:
 *   cd ~/olddungeons/game-server
 *   pm2 start docs/assets-server.js --name olddungeons-assets --update-env
 *   pm2 save
 *
 * Depois configure um proxy HTTPS (Caddy/Nginx) apontando https://fibula.pro
 * -> http://127.0.0.1:2223, ou mude VITE_GAME_ASSETS_URL para o host:porta
 * público que expõe esta porta.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.ASSETS_PORT || 2223);
const HOST = process.env.ASSETS_HOST || "0.0.0.0";
const ROOT = path.resolve(__dirname, "..", "client", "data");
// Ajuste ROOT se seus Tibia.spr/Tibia.dat estiverem em outro lugar.
// Ex.: const ROOT = "/home/ubuntu/olddungeons/game-server/data";

const ALLOWED_ORIGINS = new Set([
  "https://retro-idle-forge.lovable.app",
  "https://id-preview--639c9069-4daa-4c95-9ffc-13b3d0151427.lovable.app",
]);

const MIME = {
  ".dat": "application/octet-stream",
  ".spr": "application/octet-stream",
  ".json": "application/json; charset=utf-8",
  ".ogg": "audio/ogg",
  ".png": "image/png",
};

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Max-Age": "86400",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || "";
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    return res.end();
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { ...cors, Allow: "GET, HEAD, OPTIONS" });
    return res.end();
  }

  // Aceita paths estilo /data/740/Tibia.spr — mapeia para ROOT/740/Tibia.spr
  const url = decodeURIComponent(req.url.split("?")[0]);
  const rel = url.replace(/^\/+data\/+/, "").replace(/\.\.+/g, "");
  const full = path.join(ROOT, rel);

  if (!full.startsWith(ROOT + path.sep)) {
    res.writeHead(403, cors);
    return res.end("forbidden");
  }

  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, cors);
      return res.end("not found");
    }
    const ext = path.extname(full).toLowerCase();
    const headers = {
      ...cors,
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": st.size,
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    if (req.method === "HEAD") {
      res.writeHead(200, headers);
      return res.end();
    }
    res.writeHead(200, headers);
    fs.createReadStream(full).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[assets] serving ${ROOT} on http://${HOST}:${PORT}`);
});
