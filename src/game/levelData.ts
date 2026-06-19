import type { LevelConfig } from "./types";

// Question-block height rule (Mario-style head bump from platform below):
// Block 48×48, center origin → blockBottom = y + 24. Platform top = platform.y − height/2.
// Min air gap (platformTop − blockBottom) = 128 px (player display ~128 px); ideal 150 px headroom.
// block.y = platformTop − 150 − 24  (use questionBlockY(platform.y)).
// block.x must sit on a platform below (within its width). Jump rise ~130 px, body ~104 px.

const QUESTION_BLOCK_HALF = 24;
const QUESTION_BLOCK_AIR_GAP = 150;

/** Place a question block above a platform with Mario-style jump-bump clearance. */
function questionBlockY(platformY: number, platformHeight = 36, airGap = QUESTION_BLOCK_AIR_GAP) {
  const platformTop = platformY - platformHeight / 2;
  return platformTop - airGap - QUESTION_BLOCK_HALF;
}

function coinArc(x: number, y: number, count = 6, gap = 36) {
  return { x, y, count, gap };
}

function makeLevel(index: number, overrides: Partial<LevelConfig>): LevelConfig {
  const worldWidth = overrides.worldWidth ?? 4200;
  const base: LevelConfig = {
    id: `level-${String(index).padStart(2, "0")}`,
    name: "家庭路线教学关",
    theme: "家庭路线",
    backgroundKey: "concept_level_01_home_tutorial",
    worldWidth,
    worldHeight: 900,
    platforms: [{ x: worldWidth / 2, y: 830, width: worldWidth, height: 140, kind: "ground" }],
    enemies: [],
    questionBlocks: [],
    looseItems: [],
    coinArcs: [],
    checkpoint: { x: Math.round(worldWidth * 0.48), y: 650 },
    goal: { x: worldWidth - 110, y: 700 },
    targetTimeSec: 90,
  };

  return { ...base, ...overrides };
}

export const LEVELS: LevelConfig[] = [
  // L1 — gentle tutorial stairs, forgiving gaps (~56px steps, ~160px gaps)
  makeLevel(1, {
    name: "家庭路线教学关",
    theme: "低台阶、沙发、桌面、阳台出口",
    backgroundKey: "concept_level_01_home_tutorial",
    prologue: "放学啦！偷偷溜回家…等等,姐姐在客厅?",
    epilogue: "顺利到阳台！下一关，去学校路上~",
    platforms: [
      { x: 2100, y: 830, width: 4200, height: 140, kind: "ground" },
      { x: 380, y: 722, width: 260, height: 36 },
      { x: 620, y: 698, width: 180, height: 36 },
      { x: 820, y: 678, width: 260, height: 36 },
      { x: 1050, y: 710, width: 240, height: 36 },
      { x: 1280, y: 710, width: 300, height: 36, kind: "bounce" },
      { x: 1660, y: 650, width: 320, height: 36 },
      { x: 2040, y: 700, width: 360, height: 36 },
      { x: 2440, y: 635, width: 320, height: 36 },
      { x: 2860, y: 700, width: 340, height: 36 },
      { x: 3300, y: 655, width: 340, height: 36 },
      { x: 3760, y: 720, width: 460, height: 36 }
    ],
    enemies: [
      { kind: "sister_small", x: 480, y: 641, patrol: [290, 500] },
      { kind: "sister_small", x: 710, y: 617, patrol: [560, 680] },
      { kind: "sister_small", x: 1280, y: 629, patrol: [1180, 1380] },
      { kind: "sister_headphone", x: 2260, y: 640, patrol: [2120, 2420] },
      { kind: "sister_boss", x: 3920, y: 690, hp: 5 }
    ],
    questionBlocks: [
      { x: 620, y: questionBlockY(698) },
      { x: 1660, y: questionBlockY(650) },
      { x: 2440, y: questionBlockY(635) },
      { x: 3300, y: questionBlockY(655) }
    ],
    looseItems: [{ id: "bubble_shield", x: 2440, y: 577 }],
    coinArcs: [coinArc(270, 705), coinArc(780, 660), coinArc(1620, 650), coinArc(2860, 665), coinArc(3650, 680)],
    checkpoint: { x: 2050, y: 650 },
    mechanics: [
      { type: "interactive", x: 1280, y: 660, kind: "fridge" },
      { type: "secret_entry", x: 1380, y: 650, condition: "hidden", id: "secret_1_memory" },
      { type: "crisis_wave", xTrigger: 2900, durationMs: 15000, waves: 3, reward: { coins: 200, hp: 1 } },
    ],
    segments: [
      { id: "A", xStart: 0, xEnd: 800, threatBase: 0, spawnBudget: 1, projectileBudget: 2 },
      { id: "B", xStart: 800, xEnd: 1700, threatBase: 1, spawnBudget: 2, projectileBudget: 3 },
      { id: "C", xStart: 1700, xEnd: 2600, threatBase: 2, spawnBudget: 3, projectileBudget: 4 },
      { id: "D", xStart: 2600, xEnd: 3300, threatBase: 1, spawnBudget: 1, projectileBudget: 2 },
      { id: "E", xStart: 3300, xEnd: 3900, threatBase: 3, spawnBudget: 3, projectileBudget: 5 },
      { id: "F", xStart: 3900, xEnd: 9999, threatBase: 2, spawnBudget: 2, projectileBudget: 3 },
    ],
    targetTimeSec: 75,
  }),

  // L2 — wider gaps, mild vertical undulation
  makeLevel(2, {
    name: "校门斑马线",
    theme: "路沿跳跃、交通灯、移动斑马线平台",
    backgroundKey: "concept_level_02_school_crosswalk",
    worldWidth: 4400,
    platforms: [
      { x: 2200, y: 830, width: 4400, height: 140, kind: "ground" },
      { x: 480, y: 718, width: 220, height: 36 },
      { x: 850, y: 668, width: 240, height: 36 },
      { x: 1180, y: 710, width: 200, height: 36 },
      { x: 1550, y: 655, width: 260, height: 36 },
      { x: 1950, y: 700, width: 220, height: 36 },
      { x: 2400, y: 660, width: 200, height: 36 },
      { x: 2850, y: 695, width: 280, height: 36 },
      { x: 3350, y: 650, width: 300, height: 36 },
      { x: 3850, y: 715, width: 350, height: 36 }
    ],
    enemies: [
      { kind: "sister_small", x: 640, y: 641, patrol: [430, 650] },
      { kind: "sister_small", x: 1320, y: 639, patrol: [1200, 1520] },
      { kind: "sister_small", x: 1950, y: 629, patrol: [1820, 2080] },
      { kind: "sister_pipe", x: 2400, y: 730, patrol: [2280, 2520] },
      { kind: "sister_headphone", x: 2850, y: 640, patrol: [2640, 3060] },
      { kind: "sister_boss", x: 4080, y: 690, hp: 6 }
    ],
    questionBlocks: [
      { x: 850, y: questionBlockY(668) },
      { x: 1550, y: questionBlockY(655) },
      { x: 2850, y: questionBlockY(695) }
    ],
    coinArcs: [coinArc(300, 700), coinArc(980, 645), coinArc(1950, 675), coinArc(2850, 660), coinArc(3700, 680)],
    checkpoint: { x: 2200, y: 650 },
    goal: { x: 4300, y: 700 },
    prologue: "上学路上要小心,姐姐在后面追呢！",
    epilogue: "差点被抓到…还好斑马线绿灯了！",
    mechanics: [
      { type: "moving_platform", x: 1900, y: 670, width: 140, height: 32, range: [1700, 2200], speed: 80 },
      { type: "moving_platform", x: 3100, y: 640, width: 140, height: 32, range: [2950, 3400], speed: 90 },
    ],
    segments: [
      { id: "A", xStart: 0, xEnd: 1100, threatBase: 0, spawnBudget: 1, projectileBudget: 2 },
      { id: "B", xStart: 1100, xEnd: 2200, threatBase: 1, spawnBudget: 2, projectileBudget: 3 },
      { id: "C", xStart: 2200, xEnd: 3300, threatBase: 2, spawnBudget: 3, projectileBudget: 4 },
      { id: "D", xStart: 3300, xEnd: 4300, threatBase: 2, spawnBudget: 2, projectileBudget: 3 },
    ],
    targetTimeSec: 80,
  }),

  // L3 — narrow pads, long run-jump spacing (moving-bus-stop rhythm)
  makeLevel(3, {
    name: "公交站音波",
    theme: "长椅平台、站牌高台、音波躲避",
    backgroundKey: "concept_level_03_bus_stop_soundwave",
    worldWidth: 4500,
    platforms: [
      { x: 2250, y: 830, width: 4500, height: 140, kind: "ground" },
      { x: 400, y: 725, width: 160, height: 36 },
      { x: 620, y: 690, width: 140, height: 36 },
      { x: 880, y: 655, width: 150, height: 36 },
      { x: 1150, y: 720, width: 140, height: 36 },
      { x: 1420, y: 680, width: 130, height: 36 },
      { x: 1700, y: 645, width: 140, height: 36 },
      { x: 2000, y: 710, width: 150, height: 36 },
      { x: 2280, y: 665, width: 130, height: 36 },
      { x: 2580, y: 720, width: 140, height: 36 },
      { x: 2880, y: 650, width: 150, height: 36 },
      { x: 3200, y: 700, width: 160, height: 36 },
      { x: 3550, y: 660, width: 140, height: 36 },
      { x: 3900, y: 715, width: 200, height: 36 }
    ],
    enemies: [
      { kind: "sister_small", x: 620, y: 617, patrol: [560, 680] },
      { kind: "sister_headphone", x: 1150, y: 639, patrol: [1090, 1210] },
      { kind: "sister_headphone", x: 2000, y: 629, patrol: [1940, 2060] },
      { kind: "sister_headphone", x: 2880, y: 619, patrol: [2820, 2940] },
      { kind: "sister_balloon", x: 3550, y: 570, patrol: [3420, 3680] },
      { kind: "sister_boss", x: 4050, y: 690, hp: 7 }
    ],
    questionBlocks: [
      { x: 620, y: questionBlockY(690) },
      { x: 1420, y: questionBlockY(680) },
      { x: 2880, y: questionBlockY(650) }
    ],
    coinArcs: [coinArc(270, 705), coinArc(880, 625), coinArc(1700, 615), coinArc(2580, 690), coinArc(3550, 630)],
    checkpoint: { x: 2250, y: 650 },
    goal: { x: 4400, y: 700 },
    prologue: "耳机姐姐的音乐好吵…但是躲过音波就能过！",
    epilogue: "啊,公交站到了！快跑！",
    mechanics: [
      { type: "wave_indicator", x: 1150, y: 580, warningMs: 1500, range: 120 },
      { type: "wave_indicator", x: 2000, y: 580, warningMs: 1400, range: 120 },
      { type: "wave_indicator", x: 2880, y: 580, warningMs: 1300, range: 120 },
    ],
    segments: [
      { id: "A", xStart: 0, xEnd: 1100, threatBase: 1, spawnBudget: 2, projectileBudget: 3 },
      { id: "B", xStart: 1100, xEnd: 2400, threatBase: 2, spawnBudget: 3, projectileBudget: 4 },
      { id: "C", xStart: 2400, xEnd: 3500, threatBase: 2, spawnBudget: 2, projectileBudget: 4 },
      { id: "D", xStart: 3500, xEnd: 4500, threatBase: 3, spawnBudget: 3, projectileBudget: 5 },
    ],
    targetTimeSec: 85,
  }),

  // L4 — bounce pads, high arcs between cushions
  makeLevel(4, {
    name: "客厅沙发弹跳",
    theme: "沙发垫弹跳、抱枕短坑、玩具车障碍",
    backgroundKey: "concept_level_04_sofa_bounce",
    platforms: [
      { x: 2100, y: 830, width: 4200, height: 140, kind: "ground" },
      { x: 400, y: 722, width: 240, height: 36 },
      { x: 700, y: 660, width: 180, height: 36, kind: "bounce" },
      { x: 980, y: 590, width: 160, height: 36, kind: "bounce" },
      { x: 1250, y: 680, width: 200, height: 36 },
      { x: 1500, y: 620, width: 180, height: 36, kind: "bounce" },
      { x: 1780, y: 700, width: 220, height: 36 },
      { x: 2100, y: 640, width: 200, height: 36, kind: "bounce" },
      { x: 2380, y: 720, width: 240, height: 36 },
      { x: 2700, y: 600, width: 180, height: 36, kind: "bounce" },
      { x: 2980, y: 680, width: 220, height: 36 },
      { x: 3300, y: 620, width: 200, height: 36, kind: "bounce" },
      { x: 3600, y: 710, width: 280, height: 36 },
      { x: 3900, y: 680, width: 320, height: 36 }
    ],
    enemies: [
      { kind: "sister_small", x: 880, y: 740, patrol: [760, 1000] },
      { kind: "sister_small", x: 1500, y: 740, patrol: [1380, 1620] },
      { kind: "sister_small", x: 2380, y: 740, patrol: [2260, 2500] },
      { kind: "sister_headphone", x: 2100, y: 640, patrol: [1980, 2220] },
      { kind: "sister_pipe", x: 2980, y: 730, hp: 2, patrol: [2860, 3100] },
      { kind: "sister_boss", x: 3920, y: 690, hp: 8 }
    ],
    questionBlocks: [
      { x: 700, y: questionBlockY(660) },
      { x: 1500, y: questionBlockY(620) },
      { x: 2100, y: questionBlockY(640) },
      { x: 3300, y: questionBlockY(620) }
    ],
    looseItems: [{ id: "bouncy_shoes", x: 1500, y: 562 }],
    coinArcs: [coinArc(270, 705), coinArc(980, 555), coinArc(1500, 585), coinArc(2700, 565), coinArc(3600, 675)],
    prologue: "沙发好软！跳！再跳！",
    epilogue: "客厅跳完了,下一关是哪里?",
    mechanics: [
      { type: "interactive", x: 1500, y: 580, kind: "toybox" },
      { type: "interactive", x: 2700, y: 560, kind: "tv" },
    ],
    segments: [
      { id: "A", xStart: 0, xEnd: 1100, threatBase: 0, spawnBudget: 1, projectileBudget: 2 },
      { id: "B", xStart: 1100, xEnd: 2400, threatBase: 1, spawnBudget: 2, projectileBudget: 3 },
      { id: "C", xStart: 2400, xEnd: 3300, threatBase: 2, spawnBudget: 3, projectileBudget: 4 },
      { id: "D", xStart: 3300, xEnd: 4200, threatBase: 2, spawnBudget: 2, projectileBudget: 4 },
    ],
    targetTimeSec: 80,
  }),

  // L5 — vertical stacks, short pads, tight timing
  makeLevel(5, {
    name: "教室作业雨",
    theme: "课桌平台、椅子连跳、黑板擦移动平台",
    backgroundKey: "concept_level_05_classroom_homework",
    platforms: [
      { x: 2100, y: 830, width: 4200, height: 140, kind: "ground" },
      { x: 350, y: 720, width: 180, height: 36 },
      { x: 560, y: 660, width: 160, height: 36 },
      { x: 720, y: 600, width: 140, height: 36 },
      { x: 880, y: 660, width: 160, height: 36 },
      { x: 1040, y: 720, width: 180, height: 36 },
      { x: 1200, y: 600, width: 140, height: 36 },
      { x: 1360, y: 540, width: 120, height: 36 },
      { x: 1520, y: 600, width: 140, height: 36 },
      { x: 1680, y: 660, width: 160, height: 36 },
      { x: 1840, y: 720, width: 180, height: 36 },
      { x: 2040, y: 580, width: 130, height: 36 },
      { x: 2220, y: 640, width: 150, height: 36 },
      { x: 2420, y: 700, width: 160, height: 36 },
      { x: 2640, y: 620, width: 140, height: 36 },
      { x: 2860, y: 560, width: 130, height: 36 },
      { x: 3080, y: 620, width: 150, height: 36 },
      { x: 3300, y: 680, width: 180, height: 36 },
      { x: 3540, y: 720, width: 220, height: 36 },
      { x: 3820, y: 660, width: 260, height: 36 }
    ],
    enemies: [
      { kind: "sister_small", x: 560, y: 617, patrol: [490, 630] },
      { kind: "sister_small", x: 1200, y: 557, patrol: [1140, 1260] },
      { kind: "sister_headphone", x: 1680, y: 597, patrol: [1620, 1740] },
      { kind: "sister_headphone", x: 2420, y: 637, patrol: [2360, 2480] },
      { kind: "sister_pipe", x: 2860, y: 730, hp: 2, patrol: [2800, 2920] },
      { kind: "sister_balloon", x: 3080, y: 527, patrol: [2960, 3200] },
      { kind: "sister_boss", x: 3920, y: 690, hp: 9 }
    ],
    questionBlocks: [
      { x: 720, y: questionBlockY(600) },
      { x: 1360, y: questionBlockY(540) },
      { x: 2040, y: questionBlockY(580) },
      { x: 2860, y: questionBlockY(560) }
    ],
    coinArcs: [coinArc(270, 705), coinArc(720, 585), coinArc(1360, 525), coinArc(2420, 685), coinArc(3540, 685)],
    prologue: "教室…作业…姐姐来了！",
    epilogue: "作业本太多啦！下次不要打瞌睡！",
    mechanics: [
      { type: "homework_rain", xStart: 1100, xEnd: 3800, y: 200, intervalMs: 2500, count: 4 },
    ],
    segments: [
      { id: "A", xStart: 0, xEnd: 1200, threatBase: 1, spawnBudget: 2, projectileBudget: 3 },
      { id: "B", xStart: 1200, xEnd: 2400, threatBase: 3, spawnBudget: 4, projectileBudget: 6 },
      { id: "C", xStart: 2400, xEnd: 3600, threatBase: 3, spawnBudget: 4, projectileBudget: 6 },
      { id: "D", xStart: 3600, xEnd: 4200, threatBase: 2, spawnBudget: 2, projectileBudget: 4 },
    ],
    targetTimeSec: 95,
  }),

  // L6 — mixed bounce pads + long horizontal gaps
  makeLevel(6, {
    name: "小区花园机关",
    theme: "滑梯加速、跷跷板弹跳、秋千时机跳",
    backgroundKey: "concept_level_06_playground",
    worldWidth: 4400,
    platforms: [
      { x: 2200, y: 830, width: 4400, height: 140, kind: "ground" },
      { x: 420, y: 715, width: 200, height: 36 },
      { x: 700, y: 660, width: 160, height: 36 },
      { x: 1000, y: 710, width: 180, height: 36, kind: "bounce" },
      { x: 1350, y: 640, width: 140, height: 36 },
      { x: 1700, y: 700, width: 200, height: 36 },
      { x: 2050, y: 630, width: 160, height: 36, kind: "bounce" },
      { x: 2450, y: 710, width: 180, height: 36 },
      { x: 2850, y: 650, width: 160, height: 36 },
      { x: 3200, y: 710, width: 200, height: 36, kind: "bounce" },
      { x: 3600, y: 640, width: 180, height: 36 },
      { x: 4000, y: 710, width: 300, height: 36 }
    ],
    enemies: [
      { kind: "sister_small", x: 700, y: 617, patrol: [630, 770] },
      { kind: "sister_small", x: 1350, y: 597, patrol: [1280, 1420] },
      { kind: "sister_headphone", x: 1700, y: 637, patrol: [1620, 1780] },
      { kind: "sister_headphone", x: 2450, y: 647, patrol: [2380, 2520] },
      { kind: "sister_pipe", x: 2850, y: 730, hp: 2, patrol: [2780, 2920] },
      { kind: "sister_balloon", x: 3600, y: 527, patrol: [3480, 3720] },
      { kind: "sister_boss", x: 4120, y: 690, hp: 10 }
    ],
    questionBlocks: [
      { x: 1000, y: questionBlockY(710) },
      { x: 2050, y: questionBlockY(630) },
      { x: 3200, y: questionBlockY(710) }
    ],
    looseItems: [{ id: "star_cape", x: 2050, y: 572 }],
    coinArcs: [coinArc(290, 705), coinArc(1000, 675), coinArc(1700, 665), coinArc(2850, 615), coinArc(3600, 605)],
    checkpoint: { x: 2200, y: 650 },
    goal: { x: 4300, y: 700 },
    prologue: "小区花园好好玩！但是姐姐在后面追！",
    epilogue: "差点被抓！滑梯好快！",
    mechanics: [
      { type: "interactive", x: 700, y: 620, kind: "lamp" },
    ],
    segments: [
      { id: "A", xStart: 0, xEnd: 1300, threatBase: 1, spawnBudget: 2, projectileBudget: 3 },
      { id: "B", xStart: 1300, xEnd: 2700, threatBase: 2, spawnBudget: 3, projectileBudget: 4 },
      { id: "C", xStart: 2700, xEnd: 4400, threatBase: 3, spawnBudget: 3, projectileBudget: 5 },
    ],
    targetTimeSec: 90,
  }),

  // L7 — ice slides + gap landings
  makeLevel(7, {
    name: "超市零食区",
    theme: "货架高低平台、购物车移动平台、冰柜滑行",
    backgroundKey: "concept_level_07_supermarket",
    worldWidth: 4400,
    platforms: [
      { x: 2200, y: 830, width: 4400, height: 140, kind: "ground" },
      { x: 400, y: 720, width: 240, height: 36 },
      { x: 680, y: 680, width: 180, height: 36 },
      { x: 960, y: 720, width: 200, height: 36 },
      { x: 1280, y: 665, width: 220, height: 36 },
      { x: 1600, y: 720, width: 260, height: 36, kind: "ice" },
      { x: 1950, y: 655, width: 180, height: 36 },
      { x: 2280, y: 710, width: 200, height: 36 },
      { x: 2600, y: 660, width: 180, height: 36, kind: "ice" },
      { x: 2920, y: 720, width: 220, height: 36 },
      { x: 3260, y: 650, width: 200, height: 36 },
      { x: 3600, y: 705, width: 240, height: 36 },
      { x: 3950, y: 665, width: 280, height: 36 },
      { x: 4200, y: 718, width: 300, height: 36 }
    ],
    enemies: [
      { kind: "sister_small", x: 680, y: 637, patrol: [600, 760] },
      { kind: "sister_small", x: 1280, y: 622, patrol: [1200, 1360] },
      { kind: "sister_headphone", x: 1950, y: 612, patrol: [1880, 2020] },
      { kind: "sister_pipe", x: 2280, y: 730, hp: 2, patrol: [2200, 2360] },
      { kind: "sister_pipe", x: 2920, y: 730, hp: 2, patrol: [2840, 3000] },
      { kind: "sister_balloon", x: 3260, y: 527, patrol: [3140, 3380] },
      { kind: "sister_headphone", x: 3600, y: 632, patrol: [3520, 3680] },
      { kind: "sister_boss", x: 4120, y: 690, hp: 11 }
    ],
    questionBlocks: [
      { x: 680, y: questionBlockY(680) },
      { x: 1600, y: questionBlockY(720) },
      { x: 2600, y: questionBlockY(660) },
      { x: 3260, y: questionBlockY(650) }
    ],
    looseItems: [{ id: "ice_cream_blaster", x: 1950, y: 597 }],
    coinArcs: [coinArc(290, 705), coinArc(960, 685), coinArc(1600, 685), coinArc(2600, 625), coinArc(3600, 670)],
    checkpoint: { x: 2200, y: 650 },
    goal: { x: 4300, y: 700 },
    prologue: "冰面好滑！小心别冲过头！",
    epilogue: "冻住姐姐！冰淇淋枪真管用！",
    mechanics: [
      { type: "ice_zone", x: 1600, y: 720, width: 240, height: 80, friction: 0.4 },
      { type: "ice_zone", x: 2600, y: 660, width: 180, height: 80, friction: 0.4 },
    ],
    segments: [
      { id: "A", xStart: 0, xEnd: 1200, threatBase: 1, spawnBudget: 2, projectileBudget: 3 },
      { id: "B", xStart: 1200, xEnd: 2400, threatBase: 2, spawnBudget: 3, projectileBudget: 4 },
      { id: "C", xStart: 2400, xEnd: 3500, threatBase: 2, spawnBudget: 2, projectileBudget: 4 },
      { id: "D", xStart: 3500, xEnd: 4400, threatBase: 3, spawnBudget: 3, projectileBudget: 5 },
    ],
    targetTimeSec: 85,
  }),

  // L8 — bubble bounce towers, vertical climbs
  makeLevel(8, {
    name: "浴室泡泡城",
    theme: "泡泡浮台、水流推动、毛巾摆荡",
    backgroundKey: "concept_level_08_bathroom_bubbles",
    worldWidth: 4300,
    platforms: [
      { x: 2150, y: 830, width: 4300, height: 140, kind: "ground" },
      { x: 380, y: 722, width: 220, height: 36 },
      { x: 620, y: 680, width: 160, height: 36, kind: "bounce" },
      { x: 820, y: 600, width: 140, height: 36, kind: "bounce" },
      { x: 1020, y: 520, width: 120, height: 36, kind: "bounce" },
      { x: 1220, y: 580, width: 160, height: 36 },
      { x: 1420, y: 640, width: 180, height: 36, kind: "bounce" },
      { x: 1680, y: 560, width: 140, height: 36, kind: "bounce" },
      { x: 1920, y: 620, width: 200, height: 36 },
      { x: 2160, y: 680, width: 180, height: 36, kind: "bounce" },
      { x: 2420, y: 600, width: 160, height: 36, kind: "bounce" },
      { x: 2680, y: 660, width: 200, height: 36 },
      { x: 2940, y: 580, width: 180, height: 36, kind: "bounce" },
      { x: 3220, y: 640, width: 220, height: 36 },
      { x: 3480, y: 700, width: 260, height: 36 },
      { x: 3750, y: 620, width: 200, height: 36, kind: "bounce" },
      { x: 4000, y: 680, width: 280, height: 36 }
    ],
    enemies: [
      { kind: "sister_small", x: 820, y: 740, patrol: [760, 880] },
      { kind: "sister_balloon", x: 1020, y: 447, patrol: [900, 1140] },
      { kind: "sister_headphone", x: 1420, y: 557, patrol: [1360, 1480] },
      { kind: "sister_balloon", x: 1920, y: 527, patrol: [1860, 1980] },
      { kind: "sister_pipe", x: 2680, y: 730, hp: 2, patrol: [2600, 2760] },
      { kind: "sister_balloon", x: 2940, y: 487, patrol: [2880, 3000] },
      { kind: "sister_headphone", x: 3480, y: 617, patrol: [3400, 3560] },
      { kind: "sister_boss", x: 4020, y: 690, hp: 12 }
    ],
    questionBlocks: [
      { x: 620, y: questionBlockY(680) },
      { x: 1020, y: questionBlockY(520) },
      { x: 1680, y: questionBlockY(560) },
      { x: 2420, y: questionBlockY(600) },
      { x: 3220, y: questionBlockY(640) }
    ],
    looseItems: [{ id: "bubble_shield", x: 1420, y: 582 }, { id: "flying_cap", x: 2680, y: 602 }],
    coinArcs: [coinArc(270, 705), coinArc(820, 565), coinArc(1420, 605), coinArc(2420, 565), coinArc(3480, 665)],
    checkpoint: { x: 2150, y: 650 },
    goal: { x: 4200, y: 700 },
    prologue: "泡泡好软！别踩破！",
    epilogue: "浴室泡泡世界,下次再玩！",
    mechanics: [
      { type: "moving_platform", x: 1300, y: 580, width: 120, height: 28, range: [1100, 1600], speed: 60 },
    ],
    segments: [
      { id: "A", xStart: 0, xEnd: 1200, threatBase: 1, spawnBudget: 2, projectileBudget: 3 },
      { id: "B", xStart: 1200, xEnd: 2400, threatBase: 2, spawnBudget: 3, projectileBudget: 4 },
      { id: "C", xStart: 2400, xEnd: 3600, threatBase: 2, spawnBudget: 3, projectileBudget: 5 },
      { id: "D", xStart: 3600, xEnd: 4200, threatBase: 2, spawnBudget: 2, projectileBudget: 3 },
    ],
    targetTimeSec: 85,
  }),

  // L9 — low gravity, floaty long jumps
  makeLevel(9, {
    name: "梦境星空",
    theme: "低重力跳跃、枕头云、漂浮平台",
    backgroundKey: "concept_level_09_dream_sky",
    gravityY: 850,
    jumpVelocity: -560,
    worldWidth: 4800,
    platforms: [
      { x: 2400, y: 830, width: 4800, height: 140, kind: "ground" },
      { x: 400, y: 728, width: 200, height: 36 },
      { x: 680, y: 680, width: 180, height: 36 },
      { x: 980, y: 630, width: 160, height: 36 },
      { x: 1320, y: 690, width: 180, height: 36 },
      { x: 1680, y: 620, width: 170, height: 36 },
      { x: 2060, y: 680, width: 190, height: 36 },
      { x: 2460, y: 600, width: 160, height: 36 },
      { x: 2860, y: 670, width: 180, height: 36 },
      { x: 3260, y: 580, width: 170, height: 36 },
      { x: 3660, y: 640, width: 200, height: 36 },
      { x: 4060, y: 580, width: 180, height: 36 },
      { x: 4400, y: 660, width: 320, height: 36 }
    ],
    enemies: [
      { kind: "sister_small", x: 680, y: 617, patrol: [610, 750] },
      { kind: "sister_balloon", x: 1320, y: 557, patrol: [1260, 1380] },
      { kind: "sister_headphone", x: 2060, y: 617, patrol: [1980, 2140] },
      { kind: "sister_balloon", x: 2860, y: 547, patrol: [2800, 2920] },
      { kind: "sister_headphone", x: 3260, y: 497, patrol: [3200, 3320] },
      { kind: "sister_pipe", x: 3660, y: 730, hp: 3, patrol: [3580, 3740] },
      { kind: "sister_balloon", x: 4060, y: 487, patrol: [4000, 4120] },
      { kind: "sister_boss", x: 4420, y: 690, hp: 14 }
    ],
    questionBlocks: [
      { x: 980, y: questionBlockY(630) },
      { x: 1680, y: questionBlockY(620) },
      { x: 2460, y: questionBlockY(600) },
      { x: 3260, y: questionBlockY(580) }
    ],
    looseItems: [{ id: "flying_cap", x: 2060, y: 622 }, { id: "star_cape", x: 3660, y: 582 }],
    coinArcs: [coinArc(270, 705), coinArc(980, 605), coinArc(1680, 595), coinArc(2860, 645), coinArc(4060, 555)],
    checkpoint: { x: 2400, y: 650 },
    goal: { x: 4700, y: 700 },
    prologue: "梦境星空…漂浮的月亮姐姐好漂亮！",
    epilogue: "梦里赢了一次,但醒来还要继续…",
    mechanics: [
      { type: "low_gravity_zone", x: 600, y: 500, width: 3800, height: 400, gravityMul: 0.55 },
    ],
    segments: [
      { id: "A", xStart: 0, xEnd: 1500, threatBase: 1, spawnBudget: 2, projectileBudget: 3 },
      { id: "B", xStart: 1500, xEnd: 3000, threatBase: 2, spawnBudget: 3, projectileBudget: 4 },
      { id: "C", xStart: 3000, xEnd: 4800, threatBase: 3, spawnBudget: 4, projectileBudget: 5 },
    ],
    targetTimeSec: 90,
  }),

  // L10 — boss runway, hardest gap combo (still within jump -560)
  makeLevel(10, {
    name: "最终幻想房间",
    theme: "综合机关、Boss 入口、最终反击",
    backgroundKey: "concept_level_10_final_bedroom",
    worldWidth: 4600,
    platforms: [
      { x: 2300, y: 830, width: 4600, height: 140, kind: "ground" },
      { x: 400, y: 718, width: 200, height: 36 },
      { x: 640, y: 668, width: 160, height: 36 },
      { x: 900, y: 718, width: 140, height: 36 },
      { x: 1150, y: 620, width: 150, height: 36 },
      { x: 1380, y: 680, width: 140, height: 36 },
      { x: 1620, y: 600, width: 130, height: 36 },
      { x: 1860, y: 660, width: 150, height: 36 },
      { x: 2120, y: 580, width: 140, height: 36 },
      { x: 2360, y: 640, width: 160, height: 36 },
      { x: 2620, y: 700, width: 150, height: 36 },
      { x: 2860, y: 620, width: 140, height: 36 },
      { x: 3100, y: 680, width: 160, height: 36 },
      { x: 3340, y: 600, width: 150, height: 36 },
      { x: 3580, y: 660, width: 180, height: 36 },
      { x: 3820, y: 720, width: 200, height: 36 },
      { x: 4080, y: 655, width: 400, height: 36, kind: "bounce" },
      { x: 4380, y: 700, width: 420, height: 36 }
    ],
    enemies: [
      { kind: "sister_small", x: 640, y: 617, patrol: [570, 710] },
      { kind: "sister_small", x: 1150, y: 557, patrol: [1080, 1220] },
      { kind: "sister_headphone", x: 1620, y: 517, patrol: [1560, 1680] },
      { kind: "sister_pipe", x: 2120, y: 730, hp: 3, patrol: [2060, 2180] },
      { kind: "sister_balloon", x: 2620, y: 527, patrol: [2560, 2680] },
      { kind: "sister_headphone", x: 3100, y: 597, patrol: [3040, 3160] },
      { kind: "sister_pipe", x: 3340, y: 730, hp: 3, patrol: [3280, 3400] },
      { kind: "sister_balloon", x: 3580, y: 577, patrol: [3520, 3640] },
      { kind: "sister_boss", x: 4250, y: 660, hp: 18 }
    ],
    questionBlocks: [
      { x: 900, y: questionBlockY(718) },
      { x: 1620, y: questionBlockY(600) },
      { x: 2360, y: questionBlockY(640) },
      { x: 3100, y: questionBlockY(680) },
      { x: 3820, y: questionBlockY(720) }
    ],
    coinArcs: [coinArc(290, 705), coinArc(1150, 595), coinArc(2120, 555), coinArc(3100, 655), coinArc(4080, 620)],
    checkpoint: { x: 2500, y: 650 },
    goal: { x: 4500, y: 700 },
    prologue: "最终幻想房间…姐姐的最强形态！冲！",
    epilogue: "姐姐服气了！我们一起去吃冰淇淋吧~",
    mechanics: [
      { type: "low_gravity_zone", x: 2400, y: 600, width: 800, height: 400, gravityMul: 0.6 },
      { type: "moving_platform", x: 3300, y: 580, width: 120, height: 28, range: [3100, 3500], speed: 90 },
      { type: "homework_rain", xStart: 1500, xEnd: 4000, y: 200, intervalMs: 3000, count: 3 },
      { type: "crisis_wave", xTrigger: 2000, durationMs: 15000, waves: 3, reward: { coins: 300, hp: 1 } },
    ],
    segments: [
      { id: "A", xStart: 0, xEnd: 1400, threatBase: 2, spawnBudget: 3, projectileBudget: 4 },
      { id: "B", xStart: 1400, xEnd: 2400, threatBase: 3, spawnBudget: 4, projectileBudget: 6 },
      { id: "C", xStart: 2400, xEnd: 3600, threatBase: 4, spawnBudget: 4, projectileBudget: 6 },
      { id: "D", xStart: 3600, xEnd: 4600, threatBase: 4, spawnBudget: 4, projectileBudget: 7 },
    ],
    targetTimeSec: 110,
  })
];
