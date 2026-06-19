/**
 * SaveManager（Wave 1.4）
 *
 * 单一 storage key 存全部游戏数据。所有升级的"长期进度"都走这里：
 *  - 关卡解锁 / 星级 / 最佳时间
 *  - 金币总数 / 徽章
 *  - 难度设置 / 音量
 *  - 姐姐日记 / 图鉴解锁
 *  - 每日挑战完成种子
 *  - 玩家行为统计（动态 AI）
 */
const KEY = "didifanji_save_v1";
const VERSION = "1.0.0";

export interface LevelRecord {
  stars: number;       // 0-3
  bestTimeSec: number;
  cleared: boolean;
}

export interface GameSave {
  version: string;
  unlockedLevels: number;
  coins: number;
  levelRecords: Record<number, LevelRecord>;
  badges: string[];
  diaryUnlocked: string[];
  codexUnlocked: string[];
  storyFlags: string[];
  dailiesCompleted: string[];
  weekliesCompleted: string[];
  settings: {
    musicVolume: number;
    sfxVolume: number;
    muted: boolean;
    difficulty: "easy" | "standard" | "challenge" | "nightmare";
  };
  behavior: {
    jumpsPerLevel: number[];
    usesFireball: number;
    usesHammer: number;
    usesShield: number;
    diesOnSpikes: number;
    diesOnFalling: number;
    diesOnBoss: number;
    avgLevelTime: number;
    recentItems: string[];
  };
  updatedAt: string;
}

export function defaultSave(): GameSave {
  return {
    version: VERSION,
    unlockedLevels: 1,
    coins: 0,
    levelRecords: {},
    badges: [],
    diaryUnlocked: [],
    codexUnlocked: [],
    storyFlags: [],
    dailiesCompleted: [],
    weekliesCompleted: [],
    settings: {
      musicVolume: 0.55,
      sfxVolume: 0.75,
      muted: false,
      difficulty: "standard",
    },
    behavior: {
      jumpsPerLevel: [],
      usesFireball: 0,
      usesHammer: 0,
      usesShield: 0,
      diesOnSpikes: 0,
      diesOnFalling: 0,
      diesOnBoss: 0,
      avgLevelTime: 0,
      recentItems: [],
    },
    updatedAt: new Date().toISOString(),
  };
}

export class SaveManager {
  static load(): GameSave {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as GameSave;
      // patch forward-compat
      return { ...defaultSave(), ...parsed, settings: { ...defaultSave().settings, ...parsed.settings }, behavior: { ...defaultSave().behavior, ...parsed.behavior } };
    } catch {
      return defaultSave();
    }
  }

  static save(s: GameSave): void {
    try {
      s.updatedAt = new Date().toISOString();
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // ignore quota
    }
  }

  static reset(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }

  /** 关卡完成后更新记录（解锁下一关 + 星级 / 最佳时间取最高） */
  static recordLevelResult(levelIndex: number, timeSec: number, stars: number): GameSave {
    const save = SaveManager.load();
    const prev = save.levelRecords[levelIndex] ?? { stars: 0, bestTimeSec: Infinity, cleared: false };
    save.levelRecords[levelIndex] = {
      stars: Math.max(prev.stars, stars),
      bestTimeSec: Math.min(prev.bestTimeSec, timeSec),
      cleared: true,
    };
    if (levelIndex + 1 > save.unlockedLevels && levelIndex < 9) {
      save.unlockedLevels = levelIndex + 2;
    }
    if (levelIndex === 9) save.unlockedLevels = 10;
    SaveManager.save(save);
    return save;
  }

  static setFlag(flag: string): void {
    const save = SaveManager.load();
    if (!save.storyFlags.includes(flag)) {
      save.storyFlags.push(flag);
      SaveManager.save(save);
    }
  }

  static hasFlag(flag: string): boolean {
    return SaveManager.load().storyFlags.includes(flag);
  }

  static unlockCodex(id: string): void {
    const save = SaveManager.load();
    if (!save.codexUnlocked.includes(id)) {
      save.codexUnlocked.push(id);
      SaveManager.save(save);
    }
  }

  static unlockDiary(id: string): void {
    const save = SaveManager.load();
    if (!save.diaryUnlocked.includes(id)) {
      save.diaryUnlocked.push(id);
      SaveManager.save(save);
    }
  }

  static updateBehavior(patch: Partial<GameSave["behavior"]>): void {
    const save = SaveManager.load();
    save.behavior = { ...save.behavior, ...patch };
    SaveManager.save(save);
  }
}
