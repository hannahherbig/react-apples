import { WebSocketServer } from "ws";
import { Game, Player } from "./game";

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
  });

  sendGame();

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
