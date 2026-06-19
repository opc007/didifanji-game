/**
 * AdaptiveAI - 姐姐懂你（Wave 2.7）
 *
 * 收集玩家行为，根据历史调整敌人数值。
 * 数据存在 SaveManager.behavior 里。
 */
import { SaveManager, GameSave } from "./SaveManager";

export interface BehaviorProfile {
  prefersFireball: number;     // 0-1，>0.6 = 爱用火球
  prefersHammer: number;       // 0-1
  prefersShield: number;       // 0-1
  jumpyPlayer: boolean;        // 跳得多
  dieOften: { spike: boolean; falling: boolean; boss: boolean };
  avgTimePerLevel: number;
}

export function analyzeBehavior(): BehaviorProfile {
  const b = SaveManager.load().behavior;
  const totalUses = b.usesFireball + b.usesHammer + b.usesShield + 1;
  return {
    prefersFireball: b.usesFireball / totalUses,
    prefersHammer: b.usesHammer / totalUses,
    prefersShield: b.usesShield / totalUses,
    jumpyPlayer: b.jumpsPerLevel.length > 0 && (b.jumpsPerLevel.reduce((a, c) => a + c, 0) / b.jumpsPerLevel.length) > 30,
    dieOften: {
      spike: b.diesOnSpikes >= 2,
      falling: b.diesOnFalling >= 2,
      boss: b.diesOnBoss >= 2,
    },
    avgTimePerLevel: b.avgLevelTime,
  };
}

/**
 * 根据玩家历史调整关卡参数。
 * 返回的 multiplier 在 GameScene 加载关卡时使用。
 */
export interface CounterMeasures {
  enemySpeedMul: number;
  projectileCooldownMul: number;
  /** 是否在敌人处加泡泡盾（反制火球） */
  enemyShieldMul: number;
  /** 是否给玩家隐形护栏 */
  invisibleRail: boolean;
  /** 是否在 Boss 房前多放耳机姐姐 */
  extraHeadphone: number;
  /** 道具掉落率倍率 */
  itemDropMul: number;
}

export function getCounterMeasures(): CounterMeasures {
  const p = analyzeBehavior();
  const cm: CounterMeasures = {
    enemySpeedMul: 1,
    projectileCooldownMul: 1,
    enemyShieldMul: 1,
    invisibleRail: false,
    extraHeadphone: 0,
    itemDropMul: 1,
  };

  if (p.prefersFireball > 0.6) {
    cm.enemyShieldMul = 1.4;        // 姐姐有泡泡盾
    cm.itemDropMul = 0.7;          // 道具减少
  }
  if (p.prefersHammer > 0.5) {
    cm.extraHeadphone = 1;          // 多远程
  }
  if (p.jumpyPlayer) {
    cm.enemySpeedMul = 1.1;        // 更快
    cm.projectileCooldownMul = 0.85; // 更快
  }
  if (p.dieOften.falling) {
    cm.invisibleRail = true;        // 显示隐形护栏（仅对掉坑多次的玩家）
  }
  if (p.dieOften.boss) {
    cm.projectileCooldownMul *= 0.9; // Boss 攻击频率略减
  }
  return cm;
}

export function recordEvent(event: "jump" | "use_fireball" | "use_hammer" | "use_shield" | "die_spike" | "die_falling" | "die_boss" | "finish_level" | "item_use", value?: number | string) {
  const save = SaveManager.load();
  const b = { ...save.behavior };
  switch (event) {
    case "jump":
      b.jumpsPerLevel.push(typeof value === "number" ? value : 1);
      break;
    case "use_fireball":
    case "item_use":
      if (value === "fireball_candy") b.usesFireball++;
      else if (value === "toy_hammer") b.usesHammer++;
      else if (value === "bubble_shield") b.usesShield++;
      else if (event === "use_fireball") b.usesFireball++;
      break;
    case "use_hammer":
      b.usesHammer++;
      break;
    case "use_shield":
      b.usesShield++;
      break;
    case "die_spike":
      b.diesOnSpikes++;
      break;
    case "die_falling":
      b.diesOnFalling++;
      break;
    case "die_boss":
      b.diesOnBoss++;
      break;
    case "finish_level":
      b.avgLevelTime = (b.avgLevelTime + (typeof value === "number" ? value : 60)) / 2;
      break;
  }
  save.behavior = b;
  SaveManager.save(save);
  void 0 as unknown as GameSave;
}
