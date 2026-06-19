/**
 * 连击系统（Wave 0.3）
 *
 * 设计：每次"击败姐姐"累计 combo，2.2s 内没续就连击归零。
 * 达到阈值弹浮动文字 + 调整金币音高 + 评分加权。
 * 见升级文档 §9.5.2。
 */
import Phaser from "phaser";

export type ComboTier = "none" | "good" | "great" | "fantastic" | "perfect" | "max";

export interface ComboTierConfig {
  threshold: number;
  label: string;
  color: string;
}

export const COMBO_TIERS: ComboTierConfig[] = [
  { threshold: 3,  label: "Good!",       color: "#ffe07a" },
  { threshold: 5,  label: "Great!",      color: "#ffb347" },
  { threshold: 8,  label: "Fantastic!",  color: "#ff7ac8" },
  { threshold: 12, label: "Perfect!",    color: "#a4f0ff" },
  { threshold: 15, label: "姐姐服了!",   color: "#ff5e5e" },
];

const COMBO_WINDOW_MS = 2200;

export interface ComboStats {
  peak: number;
  hits: number;
}

export class ComboSystem {
  private count = 0;
  private peak = 0;
  private totalHits = 0;
  private timer = 0;
  private hitsLabel?: Phaser.GameObjects.Text;
  private tierLabel?: Phaser.GameObjects.Text;
  private listeners: Array<(c: number, tier: ComboTier) => void> = [];

  constructor(private scene: Phaser.Scene) {
    // Lazy init：所有 add.text 在第一次 tick() 时才创建（避免 scene systems 未挂载时崩溃）
  }

  private ensureHud() {
    if (this.hitsLabel) return;
    try {
      this.hitsLabel = this.scene.add.text(0, 0, "", {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "22px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#172137",
        strokeThickness: 4,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1005).setAlpha(0);
    } catch (e) {
      // scene.add 不可用，组合系统降级为不渲染
    }
  }

  onChange(fn: (c: number, tier: ComboTier) => void) {
    this.listeners.push(fn);
  }

  /** 击败/命中时调用。返回当前 tier。 */
  registerHit(): ComboTier {
    this.count += 1;
    this.totalHits += 1;
    if (this.count > this.peak) this.peak = this.count;
    this.timer = COMBO_WINDOW_MS;
    const tier = this.getTier();
    const cfg = COMBO_TIERS.find((c) => c.threshold === this.count);
    if (cfg) this.burstLabel(cfg.label, cfg.color);
    this.pulseLabel(String(this.count));
    this.listeners.forEach((fn) => fn(this.count, tier));
    return tier;
  }

  /** 每帧 tick：维护倒计时 */
  tick(deltaMs: number) {
    this.ensureHud();
    if (this.timer <= 0) return;
    this.timer -= deltaMs;
    if (this.timer <= 0) {
      this.count = 0;
      this.fadeLabel();
    }
  }

  getCount(): number { return this.count; }
  getStats(): ComboStats { return { peak: this.peak, hits: this.totalHits }; }

  reset() {
    this.count = 0;
    this.peak = 0;
    this.totalHits = 0;
    this.timer = 0;
    this.fadeLabel();
  }

  getTier(): ComboTier {
    let tier: ComboTier = "none";
    for (const c of COMBO_TIERS) if (this.count >= c.threshold) tier = c.label === "Good!" ? "good" : c.label === "Great!" ? "great" : c.label === "Fantastic!" ? "fantastic" : c.label === "Perfect!" ? "perfect" : "max";
    return tier;
  }

  /** 金币音高：每 5 连击升半音（最高 ×1.25） */
  coinPitch(): number {
    return 1 + Math.min(this.count, 25) * 0.01;
  }

  /** 关卡结算加权（用于星级）：峰值 ≥8 加 0.5 星 */
  starBonus(): number {
    if (this.peak >= 12) return 1;
    if (this.peak >= 8) return 0.5;
    return 0;
  }

  private pulseLabel(text: string) {
    if (!this.hitsLabel) return;
    const cam = this.scene.cameras?.main;
    if (!cam) return;
    this.hitsLabel.setText(`× ${text}`);
    this.hitsLabel.setPosition(cam.centerX, cam.centerY - 96);
    this.hitsLabel.setScale(0.6);
    this.hitsLabel.setAlpha(1);
    this.scene.tweens?.killTweensOf(this.hitsLabel);
    this.scene.tweens?.add({
      targets: this.hitsLabel,
      scale: 1,
      duration: 120,
      ease: "Back.easeOut",
    });
  }

  private burstLabel(text: string, color: string) {
    if (!this.hitsLabel || !this.scene.cameras?.main || !this.scene.add) return;
    const cam = this.scene.cameras.main;
    const t = this.scene.add.text(cam.centerX, cam.centerY - 132, text, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "34px",
      fontStyle: "bold",
      color,
      stroke: "#172137",
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1006).setAlpha(0).setScale(0.4);

    this.scene.tweens?.add({
      targets: t,
      alpha: 1,
      scale: 1.15,
      y: cam.centerY - 168,
      duration: 140,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens?.add({
          targets: t,
          alpha: 0,
          y: cam.centerY - 220,
          duration: 360,
          delay: 380,
          onComplete: () => t.destroy(),
        });
      },
    });
  }

  private fadeLabel() {
    if (!this.hitsLabel) return;
    this.scene.tweens.killTweensOf(this.hitsLabel);
    this.scene.tweens.add({
      targets: this.hitsLabel,
      alpha: 0,
      duration: 220,
    });
  }
}
