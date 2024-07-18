export type Card = {
  readonly name: string;
  readonly definition: string;
};

export type Player = {
  id: string;
  name: string;
  score: number;
  judge: boolean;
  played: boolean;
};

export type Game = {
  state: "Waiting" | "Playing" | "Judging";
  players: Player[];
  adjective?: Card;
  last?: {
    judge: Player;
    adjective: Card;
    noun: Card;
    winner: Player;
  };
  cards?: Card[];
};
