import Phaser from "phaser";
import "./style.css";
import { GameOverScene, StartScene, VictoryScene } from "./game/MenuScenes";
import { GameScene } from "./game/GameScene";
import { PreloadScene } from "./game/PreloadScene";

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
  scene: [PreloadScene, StartScene, GameScene, GameOverScene, VictoryScene]
});

if (import.meta.env.DEV) {
  (window as Window & { __game?: Phaser.Game }).__game = game;
}

export default game;
