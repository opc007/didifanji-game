import Phaser from "phaser";
import "./style.css";
import { GameOverScene, StartScene, VictoryScene } from "./game/MenuScenes";
import { GameScene } from "./game/GameScene";
import { PreloadScene } from "./game/PreloadScene";
import { SecretScene } from "./game/SecretScene";
import { SettingsScene } from "./game/SettingsScene";
import { CodexScene } from "./game/CodexScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#8fd7ff",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 1200 },
      debug: false,
      debugShowBody: false,
      debugShowStaticBody: false,
      debugShowVelocity: false
    }
  },
  scene: [PreloadScene, StartScene, GameScene, GameOverScene, VictoryScene, SecretScene, SettingsScene, CodexScene]
});

// 调试用：暴露到 window 方便手动跳转场景
if (import.meta.env.DEV) {
  (window as Window & { __game?: Phaser.Game; __scenes?: Record<string, string> }).__game = game;
  (window as Window & { __game?: Phaser.Game; __scenes?: Record<string, string> }).__scenes = {
    preload: "PreloadScene",
    start: "StartScene",
    game: "GameScene",
    over: "GameOverScene",
    win: "VictoryScene",
    secret: "SecretScene",
    settings: "SettingsScene",
    codex: "CodexScene",
  };
  console.info("[弟弟反击战] 已就绪。在控制台可用 __game.scene.start('GameScene', { levelIndex: 0 }) 直接进游戏。");
}

export default game;
