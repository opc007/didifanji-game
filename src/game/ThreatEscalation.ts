/**
 * 局内威胁叠加（Wave 0.4）
 *
 * 见升级文档 §9.4.3。
 * 不替代 getEnemyThrowScale 的关卡难度，而是 **同一关内**随时间/连击/残血
 * 动态增加压力：投射 CD 缩短、额外敌人、屏幕边缘红 tint。
 *
 * 调用：GameScene.update() 中 tick(dt, ctx)；
 *      EnemyManager / spawner 在生成投射 / 敌人时读 getModifiers()。
 */
export interface ThreatCtx {
  /** 玩家当前连击（来自 ComboSystem） */
  combo: number;
  /** 玩家血量 0-3 */
  playerHp: number;
  /** 是否在 Boss 区（提前抬到 ≥3） */
  inBossZone: boolean;
  /** 关卡开始后秒数 */
  elapsedSec: number;
}

export interface ThreatModifiers {
  enemySpeedMul: number;
  throwCooldownMul: number;
  /** 同时多刷的投射物（>0 时敌人倾向于连发） */
  extraBurst: number;
  /** 同屏允许额外敌人 */
  extraEnemies: number;
  /** 屏幕边缘红色 tint（0=无） */
  edgeTintAlpha: number;
}

export class ThreatEscalation {
  private level = 0;
  private nextUpgradeAtSec = 30;       // 第一次升级时间
  private bossTriggered = false;

  /** 关卡开始时调用 */
  reset() {
    this.level = 0;
    this.nextUpgradeAtSec = 30;
    this.bossTriggered = false;
  }

  /** 收到 Boss 战事件 */
  onBossEnter() {
    this.bossTriggered = true;
    if (this.level < 3) this.level = 3;
  }

  tick(dt: number, ctx: ThreatCtx) {
    if (this.bossTriggered) {
      // Boss 区独立节奏：每 25 秒 +1，封顶 5
      if (this.level < 5 && ctx.elapsedSec >= (this.bossTriggered ? 25 : 999) * (this.level - 2)) {
        this.bump("boss_rhythm");
      }
    } else {
      if (ctx.elapsedSec >= this.nextUpgradeAtSec && this.level < 5) {
        this.bump("time_pressure");
        // 之后每 25 秒再升一级（30 / 55 / 80 / 105 / 130）
        this.nextUpgradeAtSec += 25;
      }
    }

    // 连击压制：玩家连击≥10 持续 5 秒，姐姐进入"认真模式"
    if (ctx.combo >= 10 && this.level < 4) {
      this.bump("player_domination");
    }
  }

  getModifiers(): ThreatModifiers {
    const l = this.level;
    return {
      enemySpeedMul: 1 + l * 0.06,
      throwCooldownMul: Math.max(0.55, 1 - l * 0.09),
      extraBurst: l >= 3 ? 1 : 0,
      extraEnemies: l >= 4 ? 1 : 0,
      edgeTintAlpha: l >= 4 ? 0.08 : 0,
    };
  }

  getLevel(): number { return this.level; }

  private bump(reason: string) {
    if (this.level >= 5) return;
    this.level += 1;
  }
}
