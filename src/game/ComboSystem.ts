/**
 * 连击系统（Wave 0.3 Enhanced）
 *
 * 设计：每次"击败姐姐"累计 combo，2.2s 内没续就连击归零。
 * 达到阈值弹浮动文字 + 调整金币音高 + 评分加权。
 * 新增：里程碑慢动作、时间暂停、特殊奖励效果。
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
  
  // 新增：慢动作状态管理
  private slowMotionActive = false;
  private slowMotionTimer = 0;
  private timeFreezeActive = false;
  private timeFreezeTimer = 0;

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
    
    // 新增：里程碑特殊效果
    this.checkComboMilestones();
    
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
    
    // 新增：处理慢动作和时间暂停计时
    this.updateSlowMotion(deltaMs);
    this.updateTimeFreeze(deltaMs);
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

  // ============== 新增：连击里程碑特效系统 ==============

  /** 检查连击里程碑并触发特殊效果 */
  private checkComboMilestones() {
    const combo = this.count;
    
    // 5连击：触发慢动作
    if (combo === 5) {
      this.triggerSlowMotion(800, 0.4);
      this.showSpecialEffect("COMBO STORM!", "#ffb347");
    }
    
    // 10连击：时间暂停
    if (combo === 10) {
      this.triggerTimeFreeze(1000);
      this.showSpecialEffect("TIME FREEZE!", "#ff7ac8");
    }
    
    // 15连击：超级暴击奖励
    if (combo === 15) {
      this.triggerSlowMotion(1200, 0.3);
      this.showSpecialEffect("SUPER COMBO!", "#ff5e5e");
      this.grantComboBonus();
    }
  }

  /** 触发慢动作效果 */
  private triggerSlowMotion(durationMs: number, timeScale: number) {
    if (this.slowMotionActive) return; // 避免重复触发
    
    this.slowMotionActive = true;
    this.slowMotionTimer = durationMs;
    
    // 设置物理世界时间缩放来实现慢动作
    if (this.scene.physics && this.scene.physics.world) {
      this.scene.physics.world.timeScale = timeScale;
    }
    
    // 摄像机震动
    this.scene.cameras.main.shake(300, 0.01);
    
    // 屏幕边缘发光效果
    this.scene.cameras.main.setZoom(1.05);
    this.scene.tweens.add({
      targets: this.scene.cameras.main,
      zoom: 1,
      duration: 200,
      ease: "Back.easeOut"
    });
  }

  /** 触发时间暂停效果 */
  private triggerTimeFreeze(durationMs: number) {
    if (this.timeFreezeActive) return; // 避免重复触发
    
    this.timeFreezeActive = true;
    this.timeFreezeTimer = durationMs;
    
    // 暂停敌人和投射物
    if (this.scene.physics && this.scene.children) {
      const enemies = this.scene.children.list.filter(child => 
        child.getData && child.getData('type') === 'enemy'
      );
      
      const projectiles = this.scene.children.list.filter(child =>
        child.getData && child.getData('type') === 'projectile'
      );
      
       // 暂停敌人动画和移动
       enemies.forEach(enemy => {
         if (enemy.body && 'moves' in enemy.body) {
           (enemy.body as any).moves = false;
         }
         if ((enemy as any).anims) {
           (enemy as any).anims.pause();
         }
       });
       
       // 暂停投射物
       projectiles.forEach(proj => {
         if (proj.body && 'moves' in proj.body) {
           (proj.body as any).moves = false;
         }
       });
       
       // 时间暂停结束后恢复
       this.scene.time.delayedCall(durationMs, () => {
         enemies.forEach(enemy => {
           if (enemy.body && 'moves' in enemy.body) {
             (enemy.body as any).moves = true;
           }
           if ((enemy as any).anims) {
             (enemy as any).anims.resume();
           }
         });
         
         projectiles.forEach(proj => {
           if (proj.body && 'moves' in proj.body) {
             (proj.body as any).moves = true;
           }
         });
       });
    }
  }

  /** 更新慢动作计时器 */
  private updateSlowMotion(deltaMs: number) {
    if (!this.slowMotionActive) return;
    
    this.slowMotionTimer -= deltaMs;
    if (this.slowMotionTimer <= 0) {
      this.slowMotionActive = false;
      // 恢复正常速度
      if (this.scene.physics && this.scene.physics.world) {
        this.scene.physics.world.timeScale = 1;
      }
    }
  }

  /** 更新时间暂停计时器 */
  private updateTimeFreeze(deltaMs: number) {
    if (!this.timeFreezeActive) return;
    
    this.timeFreezeTimer -= deltaMs;
    if (this.timeFreezeTimer <= 0) {
      this.timeFreezeActive = false;
    }
  }

  /** 显示特殊效果文字 */
  private showSpecialEffect(text: string, color: string) {
    if (!this.scene.cameras?.main || !this.scene.add) return;
    
    const cam = this.scene.cameras.main;
    const effectText = this.scene.add.text(cam.centerX, cam.centerY - 200, text, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "42px",
      fontStyle: "bold",
      color: color,
      stroke: "#000000",
      strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1007)
      .setAlpha(0).setScale(0.3);

  // 暂时禁用粒子效果，避免drawImage错误

    this.scene.tweens.add({
      targets: effectText,
      alpha: 1,
      scale: 1.2,
      duration: 200,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: effectText,
          alpha: 0,
          scale: 0.8,
          y: effectText.y - 100,
          duration: 600,
          delay: 800,
          ease: "Cubic.easeOut",
          onComplete: () => effectText.destroy(),
        });
      }
    });
  }

  /** 创建连击粒子效果 */
  private createComboParticles() {
    // 暂时禁用粒子效果，因为particle_star纹理有问题
    // TODO: 以后可以使用实际的粒子纹理
  }

  /** 授予连击奖励 */
  private grantComboBonus() {
    // 给予金币奖励
    const coinBonus = Math.floor(this.count / 5) * 3;
    
    // 这里需要与游戏场景的coin系统连接
    // 可以通过事件系统或直接调用场景方法
    this.scene.events.emit('comboBonus', {
      coins: coinBonus,
      invincibility: 1000 // 1秒无敌
    });
    
    // 播放特殊音效
    if (this.scene.sound) {
      this.scene.sound.play('sfx_toy_hammer_hit', { 
        rate: 1.2,
        volume: 0.8
      });
    }
  }

  // ============== 新增：状态查询方法 ==============

  /** 检查是否处于慢动作状态 */
  isSlowMotionActive(): boolean {
    return this.slowMotionActive;
  }

  /** 检查是否处于时间暂停状态 */
  isTimeFreezeActive(): boolean {
    return this.timeFreezeActive;
  }

  /** 获取当前的时间缩放比例 */
  getCurrentTimeScale(): number {
    if (this.slowMotionActive) return 0.4;
    if (this.timeFreezeActive) return 0.1;
    return 1.0;
  }

  /** 重置所有状态（用于关卡重新开始） */
  enhancedReset() {
    this.reset(); // 调用原有重置方法
    
    // 重置特效状态
    this.slowMotionActive = false;
    this.slowMotionTimer = 0;
    this.timeFreezeActive = false;
    this.timeFreezeTimer = 0;
    
    // 确保时间恢复正常
    if (this.scene.physics && this.scene.physics.world) {
      this.scene.physics.world.timeScale = 1;
    }
  }
}
