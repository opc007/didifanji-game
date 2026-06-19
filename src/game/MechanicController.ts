/**
 * 关卡独占机关 controller（Wave 0.8）
 *
 * 支持的 mechanic 类型：
 *  - moving_platform: 在 [xMin, xMax] 区间水平摆动
 *  - wave_indicator: 在指定 x 绘制音波预警线（跟着敌人）
 *  - ice_zone: 进入后玩家摩擦系数变化（冰面滑行）
 *  - homework_rain: 周期性从屏幕上方投作业本
 *  - low_gravity_zone: 进入后重力 × 系数
 *  - crisis_wave: 玩家走到 xTrigger 触发 15s 连刷
 *  - interactive: 简单物件提示
 */
import Phaser from "phaser";
import type { LevelMechanic } from "./types";

export interface MechanicRuntime {
  id: string;
  update: (dt: number, ctx: { player: Phaser.Physics.Arcade.Image; time: number }) => void;
  destroy: () => void;
  type: LevelMechanic["type"];
}

interface ProjectileRef {
  group: Phaser.Physics.Arcade.Group;
}

export class MechanicController {
  private items: MechanicRuntime[] = [];
  private scene: Phaser.Scene;
  private player!: Phaser.Physics.Arcade.Image;
  private time = 0;
  private playerRef!: Phaser.Physics.Arcade.Image;
  private projectileGroup?: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  bindPlayer(player: Phaser.Physics.Arcade.Image, projectileGroup?: Phaser.Physics.Arcade.Group) {
    this.player = player;
    this.playerRef = player;
    this.projectileGroup = projectileGroup;
  }

  buildAll(mechanics: LevelMechanic[] | undefined) {
    this.disposeAll();
    if (!mechanics) return;
    for (const m of mechanics) {
      const r = this.build(m);
      if (r) this.items.push(r);
    }
  }

  update(dt: number) {
    this.time += dt;
    if (!this.player) return;
    for (const item of this.items) {
      try {
        item.update(dt, { player: this.player, time: this.time });
      } catch (e) {
        console.warn("[Mechanic] update failed", item.type, e);
      }
    }
  }

  disposeAll() {
    for (const item of this.items) item.destroy();
    this.items = [];
    this.time = 0;
  }

  private build(m: LevelMechanic): MechanicRuntime | null {
    switch (m.type) {
      case "moving_platform":
        return this.buildMovingPlatform(m);
      case "wave_indicator":
        return this.buildWaveIndicator(m);
      case "ice_zone":
        return this.buildIceZone(m);
      case "homework_rain":
        return this.buildHomeworkRain(m);
      case "low_gravity_zone":
        return this.buildLowGravityZone(m);
      case "crisis_wave":
        return this.buildCrisisWave(m);
      case "secret_entry":
        return this.buildSecretEntry(m);
      case "interactive":
        return this.buildInteractive(m);
      default:
        return null;
    }
  }

  // ── moving platform ──────────────────────────────
  private buildMovingPlatform(m: Extract<LevelMechanic, { type: "moving_platform" }>): MechanicRuntime {
    const platform = this.scene.physics.add.image(m.x, m.y, "platform:wood") as Phaser.Physics.Arcade.Image;
    platform.setImmovable(true);
    platform.setDisplaySize(m.width, m.height);
    (platform.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    platform.setData("kind", "moving_platform");
    platform.setDepth(6);
    platform.refreshBody();
    let t = 0;
    let dir = 1;
    return {
      id: `moving_platform_${m.x}`,
      type: m.type,
      update: (dt) => {
        t += dt;
        const range = m.range[1] - m.range[0];
        const speed = (m.speed * dir) * (dt / 1000);
        platform.x += speed;
        if (platform.x >= m.range[1]) { platform.x = m.range[1]; dir = -1; }
        if (platform.x <= m.range[0]) { platform.x = m.range[0]; dir = 1; }
        // 让站在上面的玩家一起移动
        if (platform.body && (platform.body as Phaser.Physics.Arcade.Body).touching.up === false) {
          // (phaser 自动处理 pushing)
        }
      },
      destroy: () => platform.destroy(),
    };
  }

  // ── wave indicator (耳机姐姐音波预警) ────────────
  private buildWaveIndicator(m: Extract<LevelMechanic, { type: "wave_indicator" }>): MechanicRuntime {
    const warning = this.scene.add.rectangle(m.x, m.y - 36, m.range, 6, 0xff66cc, 0).setDepth(7).setOrigin(0, 0.5);
    return {
      id: `wave_${m.x}`,
      type: m.type,
      update: (dt, { time }) => {
        const phase = (time % m.warningMs) / m.warningMs;
        // 0~0.7s 红线闪烁；0.7~1.0s 警告消失=音波已发
        if (phase < 0.7) {
          warning.setAlpha(0.25 + 0.55 * Math.sin(time / 50));
        } else {
          warning.setAlpha(0);
        }
      },
      destroy: () => warning.destroy(),
    };
  }

  // ── ice zone ─────────────────────────────────────
  private buildIceZone(m: Extract<LevelMechanic, { type: "ice_zone" }>): MechanicRuntime {
    const tint = this.scene.add.rectangle(m.x, m.y, m.width, m.height, 0xb4e8f5, 0.18).setDepth(3);
    let onIce = false;
    return {
      id: `ice_${m.x}`,
      type: m.type,
      update: (dt, { player }) => {
        const inside = player.x > m.x - m.width / 2 && player.x < m.x + m.width / 2 && Math.abs(player.y - m.y) < m.height;
        if (inside && !onIce) {
          onIce = true;
          player.setData("iceFriction", m.friction);
        } else if (!inside && onIce) {
          onIce = false;
          player.setData("iceFriction", undefined);
        }
      },
      destroy: () => {
        tint.destroy();
        this.player?.setData("iceFriction", undefined);
      },
    };
  }

  // ── homework rain (作业本雨) ─────────────────────
  private buildHomeworkRain(m: Extract<LevelMechanic, { type: "homework_rain" }>): MechanicRuntime {
    let elapsed = 0;
    return {
      id: `homework_${m.xStart}`,
      type: m.type,
      update: (dt, { player }) => {
        elapsed += dt;
        if (elapsed < m.intervalMs) return;
        elapsed = 0;
        // 在 [xStart, xEnd] 内随机 count 颗作业本
        const proj = this.projectileGroup;
        if (!proj) return;
        for (let i = 0; i < m.count; i++) {
          const x = Phaser.Math.Between(m.xStart, m.xEnd);
          const p = proj.create(x, m.y - 200, "projectile:toy") as Phaser.Physics.Arcade.Image;
          p.setDisplaySize(24, 24);
          p.setData("damage", 1);
          p.setData("homeworkRain", true);
          (p.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
          p.setVelocity(Phaser.Math.Between(-40, 40), Phaser.Math.Between(80, 160));
          p.setDepth(11);
          p.setAngle(Phaser.Math.Between(-30, 30));
          p.setData("spin", Phaser.Math.Between(2, 6));
        }
      },
      destroy: () => { /* projectiles self-destroy */ },
    };
  }

  // ── low gravity zone ─────────────────────────────
  private buildLowGravityZone(m: Extract<LevelMechanic, { type: "low_gravity_zone" }>): MechanicRuntime {
    const tint = this.scene.add.rectangle(m.x, m.y, m.width, m.height, 0xffe9a3, 0.12).setDepth(3);
    const originalGravity = this.scene.physics.world.gravity.y;
    let inside = false;
    return {
      id: `lowgrav_${m.x}`,
      type: m.type,
      update: (dt, { player }) => {
        const nowInside = player.x > m.x - m.width / 2 && player.x < m.x + m.width / 2 && Math.abs(player.y - m.y) < m.height;
        if (nowInside !== inside) {
          inside = nowInside;
          this.scene.physics.world.gravity.y = inside ? originalGravity * m.gravityMul : originalGravity;
        }
      },
      destroy: () => {
        tint.destroy();
        this.scene.physics.world.gravity.y = originalGravity;
      },
    };
  }

  // ── crisis wave (危机波次) ───────────────────────
  private buildCrisisWave(m: Extract<LevelMechanic, { type: "crisis_wave" }>): MechanicRuntime {
    let triggered = false;
    let elapsed = 0;
    let waveIdx = 0;
    const scene = this.scene;
    return {
      id: `crisis_${m.xTrigger}`,
      type: m.type,
      update: (dt, { player }) => {
        if (triggered) return;
        if (player.x >= m.xTrigger) {
          triggered = true;
          // 屏幕边缘闪红
          scene.cameras.main.flash(200, 255, 0, 0);
          scene.cameras.main.shake(120, 0.005);
          // 标记给 GameScene 显示 "危机波！" 提示
          scene.events.emit("crisis_wave_start");
        }
      },
      destroy: () => { triggered = false; },
    };
  }

  // ── secret entry (隐藏入口视觉) ───────────────────
  private buildSecretEntry(m: Extract<LevelMechanic, { type: "secret_entry" }>): MechanicRuntime {
    const hintColor = m.condition === "star_cape" ? 0xffd34d : m.condition === "fly_cap" ? 0x7ed6ff : 0xcccccc;
    const marker = this.scene.add.circle(m.x, m.y, 14, hintColor, 0.0).setStrokeStyle(2, hintColor, 0.6).setDepth(3);
    let t = 0;
    return {
      id: `secret_${m.id}`,
      type: m.type,
      update: (dt) => {
        t += dt;
        marker.setAlpha(0.3 + 0.4 * Math.sin(t / 220));
      },
      destroy: () => marker.destroy(),
    };
  }

  // ── interactive (冰箱/电视/灯/玩具箱) ──────────
  private buildInteractive(m: Extract<LevelMechanic, { type: "interactive" }>): MechanicRuntime {
    const colors: Record<string, number> = { fridge: 0x88c8ff, tv: 0x99e8ff, lamp: 0xffe599, toybox: 0xff9a8b };
    const c = colors[m.kind] ?? 0xffffff;
    const obj = this.scene.add.rectangle(m.x, m.y, 56, 56, c, 0.85).setStrokeStyle(2, 0xffffff, 0.6).setDepth(4);
    const icon = this.scene.add.text(m.x, m.y, m.kind === "fridge" ? "冷" : m.kind === "tv" ? "TV" : m.kind === "lamp" ? "灯" : "玩", {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "20px",
      fontStyle: "bold",
      color: "#1b2740",
    }).setOrigin(0.5).setDepth(5);
    return {
      id: `interact_${m.x}_${m.kind}`,
      type: m.type,
      update: () => { /* 玩家接近时由 GameScene 显示提示 */ },
      destroy: () => { obj.destroy(); icon.destroy(); },
    };
  }
}
