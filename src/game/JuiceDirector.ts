/**
 * Juice 调度中心（Wave 0.2）
 *
 * 所有"打击反馈"统一通过这里触发：
 *  - hitstop（顿帧）
 *  - camera shake / flash
 *  - 屏幕 zoom
 *  - vignette / tint
 *  - 触屏震动（可选）
 *
 * 调用方只关心"发生了什么事件"，不直接管 shake / flash 参数。
 * 见升级文档 §9.7。
 */
import Phaser from "phaser";

export type JuiceEvent =
  | "stomp"        // 踩怪
  | "hammer_hit"   // 锤子命中
  | "projectile_hit" // 投射物命中姐姐
  | "hurt"         // 弟弟受伤
  | "cry"          // 血量归零
  | "coin"         // 捡金币
  | "item_pickup"  // 捡道具
  | "boss_phase"   // Boss 阶段切换
  | "boss_defeat"
  | "goal";        // 通关

interface JuiceRecipe {
  hitstopMs: number;
  shake: { duration: number; intensity: number };
  flash?: { color: number; alpha: number; duration: number };
  zoom?: { target: number; duration: number };
  tint?: { color: number; alpha: number };
  pitch?: number;          // 音效音高
  vibrate?: number | number[];
}

const RECIPES: Record<JuiceEvent, JuiceRecipe> = {
  stomp:        { hitstopMs: 40,  shake: { duration: 80,  intensity: 0.003 } },
  hammer_hit:   { hitstopMs: 60,  shake: { duration: 100, intensity: 0.004 } },
  projectile_hit: { hitstopMs: 35, shake: { duration: 70,  intensity: 0.0025 } },
  hurt:         { hitstopMs: 60,  shake: { duration: 90,  intensity: 0.008 }, flash: { color: 0xff3344, alpha: 0.45, duration: 110 }, vibrate: [30, 20, 30] },
  cry:          { hitstopMs: 0,   shake: { duration: 180, intensity: 0.007 } },
  coin:         { hitstopMs: 0,   shake: { duration: 0,   intensity: 0 } },
  item_pickup:  { hitstopMs: 80,  shake: { duration: 0,   intensity: 0 }, zoom: { target: 1.02, duration: 100 }, pitch: 1.1 },
  boss_phase:   { hitstopMs: 120, shake: { duration: 220, intensity: 0.01 }, flash: { color: 0xffffff, alpha: 0.6, duration: 120 } },
  boss_defeat:  { hitstopMs: 200, shake: { duration: 320, intensity: 0.012 }, flash: { color: 0xffffff, alpha: 0.8, duration: 200 }, zoom: { target: 1.05, duration: 220 } },
  goal:         { hitstopMs: 100, shake: { duration: 0,   intensity: 0 }, zoom: { target: 1.04, duration: 200 } },
};

export class JuiceDirector {
  private baseZoom = 1;
  private tintOverlay?: Phaser.GameObjects.Rectangle;
  private flashOverlay?: Phaser.GameObjects.Rectangle;

  constructor(private scene: Phaser.Scene) {
    // 延迟到 emit 第一次调用时再读 zoom，因为 Phaser scene systems 在 init 之后才挂载
  }

  emit(event: JuiceEvent) {
    const r = RECIPES[event];
    if (!r) return;

    // Hitstop
    if (r.hitstopMs > 0) {
      const prev = this.scene.physics.world.timeScale;
      this.scene.physics.world.timeScale = 0.05;
      this.scene.time.delayedCall(r.hitstopMs, () => {
        // 仅当不是被 cry 永久慢放才恢复
        if (prev > 0.1) this.scene.physics.world.timeScale = prev;
      });
    }

    // Shake
    if (r.shake.duration > 0 && r.shake.intensity > 0) {
      this.scene.cameras.main.shake(r.shake.duration, r.shake.intensity);
    }

    // Flash（全屏）
    if (r.flash) {
      this.flashScreen(r.flash.color, r.flash.alpha, r.flash.duration);
    }

    // Zoom（轻微）
    if (r.zoom) {
      const cam = this.scene.cameras.main;
      this.scene.tweens.add({
        targets: cam,
        zoom: r.zoom.target,
        duration: r.zoom.duration,
        ease: "Quad.easeOut",
        yoyo: true,
        hold: 40,
      });
    }

    // 触屏震动
    if (r.vibrate && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { (navigator as Navigator).vibrate(r.vibrate as number | number[]); } catch { /* noop */ }
    }

    return r.pitch;
  }

  /** 屏幕边缘红色 tint（用于危机波 / 1 心残血） */
  setEdgeTint(color: number, alpha: number) {
    const cam = this.scene.cameras.main;
    if (this.tintOverlay) {
      this.tintOverlay.destroy();
      this.tintOverlay = undefined;
    }
    if (alpha <= 0) return;
    this.tintOverlay = this.scene.add
      .rectangle(cam.centerX, cam.centerY, cam.width, cam.height, color, alpha)
      .setScrollFactor(0)
      .setDepth(990)
      .setBlendMode(Phaser.BlendModes.SCREEN);
    // 让 tint 跟随相机
    this.scene.tweens.add({
      targets: this.tintOverlay,
      alpha: alpha * 0.6,
      yoyo: true,
      repeat: -1,
      duration: 600,
      ease: "Sine.inOut",
    });
  }

  clearEdgeTint() {
    if (this.tintOverlay) {
      this.tintOverlay.destroy();
      this.tintOverlay = undefined;
    }
  }

  private flashScreen(color: number, alpha: number, duration: number) {
    const cam = this.scene.cameras.main;
    if (this.flashOverlay) this.flashOverlay.destroy();
    this.flashOverlay = this.scene.add
      .rectangle(cam.centerX, cam.centerY, cam.width, cam.height, color, alpha)
      .setScrollFactor(0)
      .setDepth(999);
    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.flashOverlay?.destroy();
        this.flashOverlay = undefined;
      },
    });
  }
}
