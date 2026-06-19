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
  /** Wave 0.8: 独占机关 */
  mechanics?: LevelMechanic[];
  /** Wave 0.4: 单关段配置（用于 ThreatEscalation 段落叠加） */
  segments?: LevelSegment[];
  /** Wave 1.1: 关卡剧情 prologue / epilogue */
  prologue?: string;
  epilogue?: string;
  /** Wave 1.5: 目标通关秒数（结算用） */
  targetTimeSec?: number;
};

export type LevelMechanic =
  | { type: "moving_platform"; x: number; y: number; width: number; height: number; range: [number, number]; speed: number; kind?: "wood" | "ground" }
  | { type: "wave_indicator"; x: number; y: number; warningMs: number; range: number }
  | { type: "ice_zone"; x: number; y: number; width: number; height: number; friction: number }
  | { type: "homework_rain"; xStart: number; xEnd: number; y: number; intervalMs: number; count: number }
  | { type: "low_gravity_zone"; x: number; y: number; width: number; height: number; gravityMul: number }
  | { type: "secret_entry"; x: number; y: number; condition: "star_cape" | "fly_cap" | "duck" | "hidden"; id: string }
  | { type: "crisis_wave"; xTrigger: number; durationMs: number; waves: number; reward: { coins: number; hp: number } }
  | { type: "interactive"; x: number; y: number; kind: "fridge" | "tv" | "lamp" | "toybox" };

export interface LevelSegment {
  id: string;
  xStart: number;
  xEnd: number;
  threatBase: number;
  spawnBudget: number;
  projectileBudget: number;
}

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
