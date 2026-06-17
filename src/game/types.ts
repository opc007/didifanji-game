export type EnemyKind = "sister_small" | "sister_headphone" | "sister_balloon" | "sister_pipe" | "sister_boss";

export type EnemySpawn = {
  kind: EnemyKind;
  x: number;
  y: number;
  patrol?: [number, number];
  hp?: number;
};

export type RectSpec = {
  x: number;
  y: number;
  width: number;
  height: number;
  kind?: "ground" | "platform" | "bounce" | "ice";
};

export type LevelConfig = {
  id: string;
  name: string;
  theme: string;
  backgroundKey: string;
  worldWidth: number;
  worldHeight: number;
  gravityY?: number;
  jumpVelocity?: number;
  platforms: RectSpec[];
  enemies: EnemySpawn[];
  questionBlocks: { x: number; y: number }[];
  looseItems: { id: string; x: number; y: number }[];
  coinArcs: { x: number; y: number; count: number; gap: number }[];
  checkpoint: { x: number; y: number };
  goal: { x: number; y: number };
};

export type ItemConfig = {
  id: string;
  name: string;
  type: string;
  uses?: number;
  durationSeconds?: number;
  effect: string;
  image: string;
  hudIcon: string;
};

export type ActiveItem = {
  config: ItemConfig;
  usesLeft?: number;
  remainingMs?: number;
  activated: boolean;
};
