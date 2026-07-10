import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";

import { WorldCache } from "./cache/WorldCache.js";
import { startWorldSubscriptions } from "./cache/subscriptions.js";
import { PlayerWriter } from "./persistence/PlayerWriter.js";
import { Logger } from "./persistence/Logger.js";
import { GameRoom } from "./rooms/GameRoom.js";

const PORT = Number(process.env.PORT ?? 2567);
const PERSIST_MS = Number(process.env.PERSIST_INTERVAL_MS ?? 5000);
const LOG_MS = Number(process.env.LOG_FLUSH_INTERVAL_MS ?? 10000);

async function main() {
  // 1. Snapshot inicial do mundo (bloqueia o boot até estar pronto)
  await WorldCache.loadAll();

  // 2. Realtime — recarrega cache quando admin edita no painel /dev
  startWorldSubscriptions();

  // 3. Loops de persistência em batch
  PlayerWriter.start(PERSIST_MS);
  Logger.start(LOG_MS);

  // 4. Colyseus
  const app = express();
  app.get("/health", (_req, res) =>
    res.json({
      ok: WorldCache.isReady(),
      status: WorldCache.serverStatus(),
      motd: WorldCache.serverMotd(),
    }),
  );

  const httpServer = createServer(app);
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });
  gameServer.define("game", GameRoom);

  await gameServer.listen(PORT);
  console.log(`[Colyseus] ouvindo em ws://0.0.0.0:${PORT}`);
  Logger.push({ level: "info", source: "boot", message: `listening on ${PORT}` });

  const shutdown = async (sig: string) => {
    console.log(`[boot] ${sig} recebido, finalizando...`);
    PlayerWriter.stop();
    Logger.stop();
    await Promise.allSettled([PlayerWriter.flush(), Logger.flush()]);
    await gameServer.gracefullyShutdown();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((e) => {
  console.error("[boot] falha crítica:", e);
  process.exit(1);
});
