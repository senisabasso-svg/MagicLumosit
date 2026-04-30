export type GameId = "reflex" | "flash" | "memory" | "parity" | "stroop";

export type GameMeta = {
  id: GameId;
  title: string;
  tag: string;
  description: string;
  emoji: string;
};
