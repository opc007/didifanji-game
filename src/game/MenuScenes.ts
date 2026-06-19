import Phaser from "phaser";
import { LEVELS } from "./levelData";

function playMusic(scene: Phaser.Scene, key: string, loop = true, volume = 0.55) {
  scene.sound.stopAll();
  scene.sound.play(key, { loop, volume });
}

function addTransitionImage(scene: Phaser.Scene, key: string) {
  const { width, height } = scene.scale;
  const image = scene.add.image(width / 2, height / 2, key).setOrigin(0.5);
  const scale = Math.max(width / image.width, height / image.height);
  image.setScale(scale);
  return image;
}

function addMenuText(scene: Phaser.Scene, hint: string) {
  const { width, height } = scene.scale;
  scene.add.rectangle(width / 2, height - 28, Math.min(620, width - 80), 36, 0x15233a, 0.56).setStrokeStyle(2, 0xffffff, 0.18);
  scene.add
    .text(width / 2, height - 28, hint, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "16px",
      color: "#fff3bd"
    })
    .setOrigin(0.5);
}

export class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  create() {
    addTransitionImage(this, "start_screen");

    const { width, height } = this.scale;
    // 主菜单按钮
    const buttons = [
      { label: "▶ 开始游戏", y: height - 130, onClick: () => this.scene.start("GameScene", { levelIndex: 0 }) },
      { label: "📖 图鉴", y: height - 95, onClick: () => this.scene.start("CodexScene") },
      { label: "⚙ 设置 / 难度", y: height - 60, onClick: () => this.scene.start("SettingsScene") },
    ];
    const texts: Phaser.GameObjects.Text[] = [];
    buttons.forEach((b) => {
      const t = this.add.text(width / 2, b.y, b.label, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "20px",
        fontStyle: "bold",
        color: "#fff3bd",
        backgroundColor: "#1a2740",
        padding: { x: 24, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on("pointerover", () => t.setStyle({ backgroundColor: "#3a4a6c" }));
      t.on("pointerout", () => t.setStyle({ backgroundColor: "#1a2740" }));
      t.on("pointerdown", () => { this.sound.play("sfx_ui_confirm", { volume: 0.6 }); b.onClick(); });
      texts.push(t);
    });

    addMenuText(this, "Space / 点击开始 · A/D 移动 · J 道具 · T 挑衅 · Y 大叫 · S 下砸");

    const start = () => {
      this.sound.play("sfx_ui_confirm", { volume: 0.6 });
      this.scene.start("GameScene", { levelIndex: 0 });
    };
    this.input.keyboard?.once("keydown-SPACE", start);
    this.input.keyboard?.once("keydown-ENTER", start);
  }
}

export class GameOverScene extends Phaser.Scene {
  private levelIndex = 0;

  constructor() {
    super("GameOverScene");
  }

  init(data: { levelIndex?: number }) {
    this.levelIndex = data.levelIndex ?? 0;
  }

  create() {
    addTransitionImage(this, "game_over_screen");
    addMenuText(this, "R / Space / 点击重新挑战");
    playMusic(this, "jingle_game_over", false, 0.75);

    const restart = () => this.scene.start("GameScene", { levelIndex: this.levelIndex });
    this.input.keyboard?.once("keydown-R", restart);
    this.input.keyboard?.once("keydown-SPACE", restart);
    this.input.once("pointerdown", restart);
  }
}

export class VictoryScene extends Phaser.Scene {
  private levelIndex = 0;

  constructor() {
    super("VictoryScene");
  }

  init(data: { levelIndex?: number }) {
    this.levelIndex = data.levelIndex ?? 0;
  }

  create() {
    const nextIndex = (this.levelIndex + 1) % LEVELS.length;
    // 仍然显示原本的胜利画面作为底图
    addTransitionImage(this, "victory_screen");

    // ─── Wave 0.5：浮动结算层 ─────────────────────────
    const result = (this.registry.get("levelResult") as
      | {
          levelIndex: number;
          levelName: string;
          coins: number;
          defeatedEnemies: number;
          comboPeak: number;
          comboHits: number;
          cried: boolean;
          timeSec: number;
          starBonus: number;
        }
      | undefined) ?? {
      levelIndex: this.levelIndex,
      levelName: LEVELS[this.levelIndex].name,
      coins: 0,
      defeatedEnemies: 0,
      comboPeak: 0,
      comboHits: 0,
      cried: false,
      timeSec: 0,
      starBonus: 0,
    };

    // 星级计算：基础 1★ + 0.5★(无伤/未哭) + 0.5★(连击≥8) + 0.5★(时间<目标)
    const stars = 1 + (result.cried ? 0 : 0.5) + result.starBonus + (result.timeSec < 90 ? 0.5 : 0);
    const filledStars = Math.min(3, Math.round(stars));
    const emptyStars = 3 - filledStars;

    const { width, height } = this.scale;
    const panelW = 560;
    const panelH = 240;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2 - 10;
    const panel = this.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0x14213d, 0.84)
      .setStrokeStyle(3, 0xfff3bd, 0.7);

    this.add.text(panelX + panelW / 2, panelY + 26, `第 ${result.levelIndex + 1} 关 · ${result.levelName}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "22px",
      fontStyle: "bold",
      color: "#fff3bd",
    }).setOrigin(0.5);

    // 星级（用一个 unicode 五角星 + 描边）
    const starsText = "★".repeat(filledStars) + "☆".repeat(emptyStars);
    this.add.text(panelX + panelW / 2, panelY + 66, starsText, {
      fontFamily: "Arial",
      fontSize: "36px",
      color: filledStars >= 3 ? "#ffcf3a" : filledStars >= 2 ? "#ffb347" : "#ff8e8e",
    }).setOrigin(0.5);

    // 统计行
    const lines = [
      `通关时间 ${result.timeSec.toFixed(1)} 秒`,
      `金币 ${result.coins}    击败姐姐 ${result.defeatedEnemies}`,
      `最高连击 ×${result.comboPeak}    共 ${result.comboHits} 击`,
      result.cried ? "（弟弟哭了一次）" : "（无伤通关！）",
    ];
    lines.forEach((line, i) => {
      this.add.text(panelX + panelW / 2, panelY + 106 + i * 22, line, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "16px",
        color: "#eaf6ff",
      }).setOrigin(0.5);
    });

    addMenuText(this, `Space / 点击继续：${LEVELS[nextIndex].name}`);
    playMusic(this, "jingle_victory", false, 0.75);

    const next = () => this.scene.start("GameScene", { levelIndex: nextIndex });
    this.input.keyboard?.once("keydown-SPACE", next);
    this.input.once("pointerdown", next);
  }
}
