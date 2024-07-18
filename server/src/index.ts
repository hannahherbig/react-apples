import { Server } from "socket.io";
import express from "express";
import http from "http";
import path from "path";
import { Game } from "./game";
import { Card } from "@shared/types";

const app = express();
app.use(express.static(path.join(__dirname, "../../client/build")));
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000" },
});

const game = new Game(io);

io.on("connection", (socket) => {
  socket.on("error", console.error);

  const player = game.createPlayer(socket);

  socket.on("pick", (card: Card) => {
    if (game.judge === player && game.state === "Judging") {
      game.pick(card);
    }
  });

  socket.on("play", (card: Card) => {
    if (game.state === "Playing") {
      player.play(card);
    }
  });

  socket.on("name", (name: string) => {
    if (player.name !== name) {
      player.name = name;
      game.send();
    }
  });

  socket.emit("me", player.id);
  game.send();

  socket.on("disconnect", () => {
    player.quit();
  });
});

let last = "";
setInterval(() => {
  game.update();
  const msg = JSON.stringify(game);
  if (last !== msg) {
    console.log((last = msg));
  }
}, 100);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
