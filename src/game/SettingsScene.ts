/**
 * SettingsScene - 难度 / 音量 / 清除存档（Wave 2.5）
 */
import Phaser from "phaser";
import { SaveManager } from "./SaveManager";
import type { GameSave } from "./SaveManager";

export interface DifficultyConfig {
  playerMaxHp: number;          // 1-5
  enemySpeedMul: number;        // 0.5-1.5
  itemDropMul: number;          // 0-2
  trapDamage: number;           // 0-3
  invincibilityMs: number;      // 500-3000
}

export const PRESETS: Record<string, DifficultyConfig> = {
  easy:      { playerMaxHp: 5, enemySpeedMul: 0.7, itemDropMul: 1.5, trapDamage: 0, invincibilityMs: 2500 },
  standard:  { playerMaxHp: 3, enemySpeedMul: 1.0, itemDropMul: 1.0, trapDamage: 1, invincibilityMs: 1500 },
  challenge: { playerMaxHp: 1, enemySpeedMul: 1.3, itemDropMul: 0.5, trapDamage: 1, invincibilityMs: 1500 },
  nightmare: { playerMaxHp: 1, enemySpeedMul: 1.5, itemDropMul: 0,   trapDamage: 3, invincibilityMs: 500 },
};

export class SettingsScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private selected = 0;
  private items: { label: string; get: () => number; set: (v: number) => void; min: number; max: number; step: number }[] = [];
  private menuTexts: Phaser.GameObjects.Text[] = [];

  constructor() { super("SettingsScene"); }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0e1a2e");

    this.add.text(width / 2, 36, "难度与设置", {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "28px",
      fontStyle: "bold",
      color: "#fff3bd",
    }).setOrigin(0.5);

    this.add.text(width / 2, height - 30, "↑↓ 选择  ←→ 调整  Enter/Space 应用  Esc 返回", {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "13px",
      color: "#a4f0ff",
    }).setOrigin(0.5);

    const save = SaveManager.load();
    const cfg = PRESETS[save.settings.difficulty] ?? PRESETS.standard;

    this.items = [
      { label: "弟弟生命", get: () => cfg.playerMaxHp, set: (v) => cfg.playerMaxHp = v, min: 1, max: 5, step: 1 },
      { label: "姐姐速度", get: () => Math.round(cfg.enemySpeedMul * 100), set: (v) => cfg.enemySpeedMul = v / 100, min: 50, max: 150, step: 5 },
      { label: "道具频率", get: () => Math.round(cfg.itemDropMul * 100), set: (v) => cfg.itemDropMul = v / 100, min: 0, max: 200, step: 10 },
      { label: "陷阱伤害", get: () => cfg.trapDamage, set: (v) => cfg.trapDamage = v, min: 0, max: 3, step: 1 },
      { label: "无敌时长(ms)", get: () => cfg.invincibilityMs, set: (v) => cfg.invincibilityMs = v, min: 500, max: 3000, step: 100 },
    ];

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.addKeys({ enter: Phaser.Input.Keyboard.KeyCodes.ENTER, space: Phaser.Input.Keyboard.KeyCodes.SPACE, esc: Phaser.Input.Keyboard.KeyCodes.ESC, r: Phaser.Input.Keyboard.KeyCodes.R });

    this.drawMenu();

    // 预设快捷键
    this.input.keyboard!.addKey("ONE").on("down", () => this.applyPreset("easy"));
    this.input.keyboard!.addKey("TWO").on("down", () => this.applyPreset("standard"));
    this.input.keyboard!.addKey("THREE").on("down", () => this.applyPreset("challenge"));
    this.input.keyboard!.addKey("FOUR").on("down", () => this.applyPreset("nightmare"));

    this.input.keyboard!.addKey("R").on("down", () => {
      SaveManager.reset();
      this.add.text(width / 2, height - 60, "存档已清除", {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "14px",
        color: "#ff8e8e",
      }).setOrigin(0.5);
    });

    this.events.on("update", this.updateMenu);
  }

  private drawMenu() {
    this.menuTexts.forEach((t) => t.destroy());
    this.menuTexts = [];
    const { width, height } = this.scale;
    const startY = 110;

    // 预设按钮
    const presets = ["easy", "standard", "challenge", "nightmare"];
    const labels = ["轻松", "标准", "挑战", "噩梦"];
    const save = SaveManager.load();
    presets.forEach((p, i) => {
      const t = this.add.text(120 + i * 180, startY - 36, `[${labels[i]}]`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "16px",
        fontStyle: "bold",
        color: save.settings.difficulty === p ? "#ffcf3a" : "#a4f0ff",
        backgroundColor: save.settings.difficulty === p ? "#3a4a6c" : "#1a2740",
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5);
      this.menuTexts.push(t);
    });

    this.items.forEach((item, i) => {
      const y = startY + i * 50;
      const selected = i === this.selected;
      const labelColor = selected ? "#ffcf3a" : "#eaf6ff";
      const valueColor = selected ? "#a4f0ff" : "#ffffff";

      const lbl = this.add.text(160, y, item.label, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "18px",
        color: labelColor,
      }).setOrigin(0, 0.5);
      this.menuTexts.push(lbl);

      const val = this.add.text(width - 200, y, String(item.get()), {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "20px",
        fontStyle: "bold",
        color: valueColor,
      }).setOrigin(0.5, 0.5);
      this.menuTexts.push(val);
    });
  }

  private updateMenu = () => {
    if (!this.cursors) return;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
      this.selected = (this.selected - 1 + this.items.length) % this.items.length;
      this.drawMenu();
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
      this.selected = (this.selected + 1) % this.items.length;
      this.drawMenu();
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) {
      const it = this.items[this.selected];
      it.set(Phaser.Math.Clamp(it.get() - it.step, it.min, it.max));
      this.drawMenu();
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) {
      const it = this.items[this.selected];
      it.set(Phaser.Math.Clamp(it.get() + it.step, it.min, it.max));
      this.drawMenu();
    } else if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey("ENTER")) ||
               Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey("SPACE"))) {
      this.apply();
    } else if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey("ESC"))) {
      this.scene.start("StartScene");
    }
  };

  private applyPreset(p: keyof typeof PRESETS) {
    const save = SaveManager.load();
    save.settings.difficulty = p as GameSave["settings"]["difficulty"];
    SaveManager.save(save);
    // 重新生成 items
    const cfg = PRESETS[p];
    this.items[0].set(cfg.playerMaxHp);
    this.items[1].set(Math.round(cfg.enemySpeedMul * 100));
    this.items[2].set(Math.round(cfg.itemDropMul * 100));
    this.items[3].set(cfg.trapDamage);
    this.items[4].set(cfg.invincibilityMs);
    this.drawMenu();
  }

  private apply() {
    const save = SaveManager.load();
    save.settings.difficulty = this.detectPreset() as GameSave["settings"]["difficulty"];
    SaveManager.save(save);
    this.add.text(this.scale.width / 2, this.scale.height - 60, "已应用！", {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "14px",
      color: "#a4f0ff",
    }).setOrigin(0.5);
  }

  private detectPreset(): keyof typeof PRESETS {
    const v = this.items.map((i) => i.get());
    const keys = Object.keys(PRESETS) as (keyof typeof PRESETS)[];
    for (const k of keys) {
      const p = PRESETS[k];
      if (p.playerMaxHp === v[0] && Math.abs(p.enemySpeedMul - v[1] / 100) < 0.01 &&
          Math.abs(p.itemDropMul - v[2] / 100) < 0.01 && p.trapDamage === v[3] &&
          Math.abs(p.invincibilityMs - v[4]) < 50) return k;
    }
    return "standard";
  }
}
