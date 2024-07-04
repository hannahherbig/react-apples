import CARDS from "./all_cards.json";
import { Card } from "./types";

function toCardList(arr: string[][]): Card[] {
  return arr.map(([name, definition]) => {
    return { name, definition };
  });
}

export const NOUNS = toCardList(CARDS.NOUNS);
export const ADJECTIVES = toCardList(CARDS.ADJECTIVES);
