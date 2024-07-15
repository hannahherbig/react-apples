import { WebSocketServer } from "ws";
import express from "express";
import http from "http";
import path from "path";
import { Game } from "./game";
import { ClientUpdate } from "@shared/types";

const app = express();
app.use(express.static(path.join(__dirname, "../../client/build")));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const game = new Game();

wss.on("connection", (ws) => {
  ws.on("error", console.error);

  const player = game.createPlayer(ws);

  ws.on("message", (data) => {
    console.log("received: %s", data);
    const update: ClientUpdate = JSON.parse(data.toString());
    if (update.name != null) {
      player.name = update.name;
    }
    if (update.pick && game.judge === player && game.state === "Judging") {
      game.pick(update.pick);
    }
    if (update.play && game.state === "Playing") {
      player.play(update.play);
    }
    game.send();
  });

  ws.on("close", () => {
    player.quit();
  });
});

let last = "";
setInterval(() => {
  const msg = JSON.stringify(game);
  if (last !== msg) {
    console.log((last = msg));
  }
}, 100);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
