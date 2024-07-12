import { NOUNS, ADJECTIVES } from "@shared/cards";
import {
  Card,
  Player as TPlayer,
  Game as TGame,
  GameState,
} from "@shared/types";
import { find, findIndex, shuffle, every, sample } from "lodash";
import { v4 as uuid } from "uuid";
import WebSocket from "ws";

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
  cards?: Card[];

  constructor() {
    this.state = "Waiting";
    this.players = [];
    this.nouns = [];
    this.adjectives = [];
    this.discardedNouns = NOUNS.slice();
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
      cards: this.cards,
    };
  }

  send() {
    this.players.forEach((player) => {
      player.send();
    });
  }

  nextRound() {
    this.nextJudge();
    this.players.forEach((p) => {
      delete p.played;
    });
    delete this.cards;
    this.state = "Playing";
    if (this.adjectives.length === 0) {
      this.adjectives = shuffle(ADJECTIVES.slice());
    }
    this.adjective = this.adjectives.shift()!;

    this.send();
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
      delete this.judge.played;
    } else {
      delete this.judge;
    }

    this.play();

    this.send();
  }

  stop() {
    this.players.forEach((player) => {
      delete player.played;
      player.judge = false;
    });
    delete this.adjective;
    delete this.judge;
    this.state = "Waiting";

    this.send();
  }

  pick(card: Card) {
    const winner = find(this.players, (p) => p.played?.name === card.name)!;
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

    this.send();
  }

  draw() {
    if (this.nouns.length === 0) {
      this.nouns = shuffle(this.discardedNouns);
      this.discardedNouns = [];
    }
    return this.nouns.shift()!;
  }

  play() {
    const cards = shuffle(
      this.players.filter((p) => !p.judge).map((p) => p.played)
    );

    if (every(cards)) {
      this.state = "Judging";
      this.cards = cards as Card[];
    }

    this.send();
  }

  createPlayer(ws: WebSocket) {
    const player = new Player(this, ws);

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
  ws: WebSocket;
  lastMessage: string;
  id: string;
  name: string;
  hand: Card[];
  score: number;
  judge: boolean;
  played?: Card;

  constructor(game: Game, ws: WebSocket) {
    this.name = sample(NOUNS)!.name;
    this.id = uuid();
    this.lastMessage = "";
    this.game = game;
    this.ws = ws;
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

  send() {
    if (this.ws.readyState === WebSocket.OPEN) {
      const state: GameState = {
        game: this.game.toJSON(),
        hand: this.hand,
        id: this.id,
      };
      const message = JSON.stringify(state);
      if (message !== this.lastMessage) {
        this.ws.send((this.lastMessage = message));
      }
    }
  }

  draw(n = 1) {
    for (let i = 0; i < n; ++i) {
      this.hand.push(this.game.draw());
    }

    this.game.send();
  }

  play(card: Card) {
    if (!this.judge && this.played == null && this.game.state === "Playing") {
      this.played = card;
      this.hand.splice(
        findIndex(this.hand, (c) => card.name === c.name),
        1
      );
      this.draw();
      this.game.play();
    }

    this.game.send();
  }

  quit() {
    this.game.removePlayer(this);

    this.game.send();
  }
}
