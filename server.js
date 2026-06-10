import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Game } from "./server/Game.js";
import { CONFIG } from "./server/config.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const game = new Game();

app.use(express.static("public"));

wss.on("connection", socket => {
  let playerId = null;

  socket.on("message", raw => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join" && !playerId) {
      if (game.players.size >= CONFIG.maxPlayers) {
        socket.send(JSON.stringify({ type: "error", message: "Server full" }));
        socket.close();
        return;
      }

      playerId = game.addPlayer(socket, msg.name);
      socket.send(JSON.stringify({ type: "init", id: playerId, config: CONFIG }));
      return;
    }

    if (msg.type === "input" && playerId) {
      game.setPlayerInput(playerId, msg.input);
    }
  });

  socket.on("close", () => {
    if (playerId) game.removePlayer(playerId);
  });
});

const tickMs = 1000 / CONFIG.tickRate;
let last = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
}, tickMs);

setInterval(() => {
  const state = JSON.stringify(game.getState());
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(state);
  }
}, 1000 / CONFIG.sendRate);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Slither server running on port ${PORT}`);
});
