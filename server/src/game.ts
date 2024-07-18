import { NOUNS, ADJECTIVES } from "@shared/cards";
import { Card, Player as TPlayer, Game as TGame } from "@shared/types";
import { find, findIndex, shuffle, sample, sortBy } from "lodash";
import { Server, Socket } from "socket.io";
import { v4 as uuid } from "uuid";

const INTERVAL = 180000; // 3 mins

export class Game {
  state: "Waiting" | "Playing" | "Judging";
  players: Player[];
  nouns: Card[];
  discardedNouns: Card[];
  adjectives: Card[];
  last?: {
    judge: Player;
    adjective: Card;
    noun: Card;
    winner: Player;
  };
  adjective?: Card;
  judge?: Player;
  start: number;
  io: Server;

  constructor(io: Server) {
    this.state = "Waiting";
    this.players = [];
    this.nouns = [];
    this.adjectives = [];
    this.discardedNouns = NOUNS.slice();
    this.start = Date.now();
    this.io = io;
  }

  toJSON(): TGame {
    return {
      state: this.state,
      players: this.players.map((p) => p.toJSON()),
      adjective: this.adjective,
      last: this.last && {
        judge: this.last.judge.toJSON(),
        adjective: this.last.adjective,
        noun: this.last.noun,
        winner: this.last.winner.toJSON(),
      },
      cards: this.state === "Judging" ? this.playedCards() : undefined,
      // elapsed: Math.floor((Date.now() - this.start) / 1000),
    };
  }

  send() {
    this.io.emit("game", this.toJSON());
  }

  nextRound() {
    this.players.forEach((player) => {
      delete player.played;
      player.draw(7 - player.hand.length);
    });
    this.state = "Playing";
    this.start = Date.now();
    if (this.adjectives.length === 0) {
      this.adjectives = shuffle(ADJECTIVES.slice());
    }
    this.adjective = this.adjectives.shift()!;
    this.nextJudge();
  }

  nextJudge() {
    if (this.players.length > 0) {
      let i = 0;

      if (this.judge != null) {
        i = (findIndex(this.players, "judge") + 1) % this.players.length;
        this.judge.judge = false;
      }

      this.judge = this.players[i];
      this.judge.judge = true;
      if (this.judge.played != null) {
        this.judge.hand.unshift(this.judge.played);
      }
      delete this.judge.played;
    } else {
      delete this.judge;
    }

    this.play(true);
  }

  stop() {
    this.players.forEach((player) => {
      delete player.played;
      player.judge = false;
    });
    delete this.adjective;
    delete this.judge;
    this.state = "Waiting";
    this.start = Date.now();

    this.send();
  }

  pick(card: Card) {
    const winner = this.players.find((p) => p.played?.name === card.name)!;
    ++winner.score;
    this.last = {
      judge: this.judge!,
      adjective: this.adjective!,
      winner: winner,
      noun: card,
    };
    this.players.forEach((p) => {
      if (p.played != null) {
        this.discardedNouns.push(p.played);
      }
    });
    this.nextRound();
  }

  draw() {
    if (this.nouns.length === 0) {
      this.nouns = shuffle(this.discardedNouns);
      this.discardedNouns = [];
    }
    return this.nouns.shift()!;
  }

  playedCards() {
    const cards: Card[] = [];
    this.players.forEach((player) => {
      if (!player.judge && player.played != null) {
        cards.push(player.played);
      }
    });
    return sortBy(cards, "name");
  }

  play(changed = false) {
    const elapsed = Date.now() - this.start;
    if (this.state === "Playing") {
      if (
        this.playedCards().length >= 2 &&
        (this.players.every((p) => p.judge || p.played != null) ||
          elapsed > INTERVAL)
      ) {
        this.state = "Judging";
        this.start = Date.now();

        changed = true;
      }
    }

    if (changed) {
      this.send();
    }
  }

  update() {
    const elapsed = Date.now() - this.start;
    // this.io.emit("elapsed", elapsed);
    switch (this.state) {
      case "Playing":
        this.play();
        break;
      case "Judging":
        if (elapsed > INTERVAL) {
          this.state = "Playing";
          this.start = Date.now();
          if (this.judge) {
            --this.judge.score;
          }
          this.nextJudge();
        }
        break;
      case "Waiting":
        break;
    }
  }

  createPlayer(socket: Socket) {
    const player = new Player(this, socket);

    player.draw(7);

    this.players.push(player);

    if (this.players.length === 3) {
      this.nextRound();
    }

    this.send();

    return player;
  }

  removePlayer(player: Player) {
    this.discardedNouns.push(...player.hand);
    if (player.played) {
      this.discardedNouns.push(player.played);
    }
    if (player.judge && this.players.length > 1) {
      this.nextJudge();
    }

    this.players.splice(this.players.indexOf(player), 1);

    if (this.players.length < 3) {
      // not enough players
      this.stop();
    } else {
      this.play();
    }

    this.send();
  }
}

export class Player {
  game: Game;
  socket: Socket;
  lastMessage: string;
  id: string;
  name: string;
  hand: Card[];
  score: number;
  judge: boolean;
  played?: Card;

  constructor(game: Game, socket: Socket) {
    this.name = sample(NOUNS)!.name;
    this.id = uuid();
    this.lastMessage = "";
    this.game = game;
    this.socket = socket;
    this.hand = [];
    this.score = 0;
    this.judge = false;
  }

  toJSON(): TPlayer {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      judge: this.judge,
      played: this.played != null,
    };
  }

  draw(n = 1) {
    let changed = false;
    for (let i = 0; i < n; ++i) {
      this.hand.unshift(this.game.draw());
      changed = true;
    }

    if (changed) {
      this.socket.emit("hand", this.hand);
    }
  }

  play(card: Card) {
    if (this.game.state === "Playing" && !this.judge && this.played == null) {
      this.played = card;
      this.hand.splice(
        findIndex(this.hand, (c) => card.name === c.name),
        1
      );
      this.socket.emit("hand", this.hand);
      this.game.play(true);
    }
  }

  quit() {
    this.game.removePlayer(this);

    this.game.send();
  }
}
