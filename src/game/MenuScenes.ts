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
    addMenuText(this, "Space / 点击开始 · A/D 移动 · J 使用道具");

    const start = () => {
      this.sound.play("sfx_ui_confirm", { volume: 0.6 });
      this.scene.start("GameScene", { levelIndex: 0 });
    };

    this.input.keyboard?.once("keydown-SPACE", start);
    this.input.once("pointerdown", start);
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
    addTransitionImage(this, "victory_screen");
    addMenuText(this, `Space / 点击继续：${LEVELS[nextIndex].name}`);
    playMusic(this, "jingle_victory", false, 0.75);

    const next = () => this.scene.start("GameScene", { levelIndex: nextIndex });
    this.input.keyboard?.once("keydown-SPACE", next);
    this.input.once("pointerdown", next);
  }
}
