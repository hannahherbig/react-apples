import { WebSocketServer } from "ws";
import { Game, Player } from "./game";
import { ClientUpdate } from "@shared/types";

const wss = new WebSocketServer({
  port: 8080,
});

const game = new Game();

wss.on("connection", (ws) => {
  ws.on("error", console.error);

  const player = game.createPlayer(ws);

  function sendGame() {
    ws.send(JSON.stringify(game));
  }

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
