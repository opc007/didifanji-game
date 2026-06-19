/**
 * SecretScene - 隐藏奖励房间（Wave 2.1）
 *
 * 玩家在主线关卡接近 secret_entry 时按 J 进入。
 * 包含一个限时挑战 / 回忆场景 / 彩蛋，3 秒倒计时。
 * 完成后奖励金币 + 解锁姐姐日记条目。
 */
import Phaser from "phaser";

export type SecretType = "memory" | "challenge" | "easter_egg";

export interface SecretConfig {
  id: string;
  parentLevel: number;
  type: SecretType;
  title: string;
  /** 限时挑战的时长（秒），其他类型不用 */
  challengeDurationSec?: number;
  /** 奖励 */
  reward: {
    coins: number;
    diaryId?: string;
    codexId?: string;
  };
}

export const SECRET_CONFIGS: SecretConfig[] = [
  { id: "secret_1_memory", parentLevel: 0, type: "memory", title: "回忆 · 小时候的客厅",
    reward: { coins: 100, diaryId: "diary_brother_01", codexId: "codex_secret_1" } },
  { id: "secret_5_challenge", parentLevel: 4, type: "challenge", title: "限时挑战 · 30 秒打 5 个姐姐",
    challengeDurationSec: 30, reward: { coins: 200, codexId: "codex_challenge_5" } },
  { id: "secret_10_easter", parentLevel: 9, type: "easter_egg", title: "彩蛋 · 姐姐的日记本",
    reward: { coins: 300, diaryId: "diary_sister_boss_02", codexId: "codex_easter_10" } },
];

export class SecretScene extends Phaser.Scene {
  private config!: SecretConfig;
  private timeLeft = 0;
  private kills = 0;
  private goal = 0;
  private spawnedEnemies: Phaser.Physics.Arcade.Group | null = null;
  private player!: Phaser.Physics.Arcade.Image;
  private timerText?: Phaser.GameObjects.Text;
  private rewardText?: Phaser.GameObjects.Text;
  private done = false;

  constructor() { super("SecretScene"); }

  init(data: { secretId: string }) {
    const cfg = SECRET_CONFIGS.find((s) => s.id === data?.secretId);
    if (!cfg) {
      // 默认进第一个 secret
      this.config = SECRET_CONFIGS[0];
      return;
    }
    this.config = cfg;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#1a2a3f");

    // 标题
    this.add.text(width / 2, 40, this.config.title, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "26px",
      fontStyle: "bold",
      color: "#fff3bd",
      stroke: "#172137",
      strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // 提示
    this.add.text(width / 2, height - 30, "Esc / 点击返回主线", {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "14px",
      color: "#a4f0ff",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    if (this.config.type === "challenge") {
      this.startChallenge();
    } else if (this.config.type === "memory") {
      this.showMemory();
    } else {
      this.showEasterEgg();
    }

    this.input.keyboard?.once("keydown-ESC", () => this.exitToMain());
    this.input.once("pointerdown", () => { if (this.done) this.exitToMain(); });
  }

  private startChallenge() {
    const { width, height } = this.scale;
    this.timeLeft = this.config.challengeDurationSec ?? 30;
    this.goal = 5;
    this.kills = 0;
    this.spawnedEnemies = this.physics.add.group();

    this.timerText = this.add.text(width / 2, 90, `时间 ${this.timeLeft}   击败 0 / ${this.goal}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "20px",
      fontStyle: "bold",
      color: "#ffcf3a",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // 平台
    this.add.rectangle(width / 2, height - 40, width, 80, 0x4a6a9c).setDepth(0);

    // 玩家
    this.player = this.physics.add.image(80, height - 100, "brother_player") as Phaser.Physics.Arcade.Image;
    this.player.setDisplaySize(48, 84);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);

    // 5 个敌人（循环 spawn）
    for (let i = 0; i < 3; i++) {
      const x = width - 200 - i * 90;
      const e = this.spawnedEnemies.create(x, height - 110, "sister_small") as Phaser.Physics.Arcade.Image;
      e.setDisplaySize(40, 72);
      e.setVelocityX(Phaser.Math.Between(-80, -40));
      e.setDepth(5);
      e.setData("hp", 1);
      e.setData("kind", "sister_small");
      e.setCollideWorldBounds(true);
    }

    this.physics.add.overlap(this.player, this.spawnedEnemies, (_p, enemy) => {
      const e = enemy as Phaser.Physics.Arcade.Image;
      if (e.getData("dead")) return;
      e.setData("dead", true);
      e.destroy();
      this.kills++;
      if (this.timerText) this.timerText.setText(`时间 ${this.timeLeft}   击败 ${this.kills} / ${this.goal}`);
      if (this.kills >= this.goal) this.finishChallenge(true);
    });

    this.time.addEvent({ delay: 1000, callback: () => this.tickChallenge(), loop: true });
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.addKeys({ space: Phaser.Input.Keyboard.KeyCodes.SPACE });
    this.events.on("update", this.updateChallenge);
  }

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private tickChallenge() {
    if (this.done) return;
    this.timeLeft--;
    if (this.timerText) this.timerText.setText(`时间 ${this.timeLeft}   击败 ${this.kills} / ${this.goal}`);
    if (this.timeLeft <= 0) this.finishChallenge(false);
  }

  private updateChallenge = () => {
    if (!this.cursors || !this.player) return;
    const speed = 220;
    if (this.cursors.left?.isDown) this.player.setVelocityX(-speed);
    else if (this.cursors.right?.isDown) this.player.setVelocityX(speed);
    else this.player.setVelocityX(0);
    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey("SPACE")) && this.player.body!.touching.down) {
      this.player.setVelocityY(-440);
    }
  };

  private finishChallenge(success: boolean) {
    if (this.done) return;
    this.done = true;
    this.events.off("update", this.updateChallenge);
    const { width, height } = this.scale;
    const text = success ? `通关！奖励 ${this.config.reward.coins} 金币` : `时间到！击败 ${this.kills}/${this.goal}`;
    this.rewardText = this.add.text(width / 2, height / 2, text + "\n(点击任意处返回)", {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "22px",
      fontStyle: "bold",
      color: success ? "#a4f0ff" : "#ff8e8e",
      align: "center",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    if (success) this.grantReward();
  }

  private showMemory() {
    const { width, height } = this.scale;
    const text = [
      "📷 回忆 · 小时候的客厅",
      "",
      "那时候姐姐才 12 岁。",
      "她抱着弟弟在沙发上看动画片。",
      "",
      "弟弟睡着了，姐姐轻轻把他放下，",
      "还给他盖上了小毯子。",
      "",
      "(你发现了一段被遗忘的温暖)",
    ].join("\n");
    this.add.text(width / 2, height / 2, text, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "17px",
      color: "#fff3bd",
      align: "center",
      lineSpacing: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.grantReward();
    this.done = true;
  }

  private showEasterEgg() {
    const { width, height } = this.scale;
    const text = [
      "📔 姐姐的日记本",
      "",
      "「今天弟弟又跟我打架了，",
      "  居然用爆米花炸弹…",
      "  我有点想笑但不能让他看出来。」",
      "",
      "「其实…陪他玩挺开心的。",
      "  弟弟，你要一直这么调皮哦。」",
    ].join("\n");
    this.add.text(width / 2, height / 2, text, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "17px",
      color: "#ffcfd5",
      align: "center",
      lineSpacing: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.grantReward();
    this.done = true;
  }

  private grantReward() {
    import("./SaveManager").then(({ SaveManager }) => {
      const save = SaveManager.load();
      save.coins += this.config.reward.coins;
      if (this.config.reward.diaryId && !save.diaryUnlocked.includes(this.config.reward.diaryId)) {
        save.diaryUnlocked.push(this.config.reward.diaryId);
      }
      if (this.config.reward.codexId && !save.codexUnlocked.includes(this.config.reward.codexId)) {
        save.codexUnlocked.push(this.config.reward.codexId);
      }
      SaveManager.save(save);
    });
  }

  private exitToMain() {
    // 回到最近主线关
    const save = import("./SaveManager").then(({ SaveManager }) => {
      const s = SaveManager.load();
      this.scene.start("GameScene", { levelIndex: this.config.parentLevel });
      void s;
    });
    void save;
  }
}
