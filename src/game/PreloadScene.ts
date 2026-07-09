import Phaser from "phaser";
import audioManifest from "../../assets/audio/audio-manifest.json";
import characterManifest from "../../assets/characters/manifest.json";
import itemManifest from "../../assets/items/items-manifest.json";
import levelMapManifest from "../../assets/concepts/levels/level-maps-manifest.json";
import transitionManifest from "../../assets/transitions/transitions-manifest.json";
import { assetUrl, audioUrls } from "./assetResolver";

type CharacterEntry = (typeof characterManifest.assets)[number];
type TransitionEntry = (typeof transitionManifest.transitions)[number];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    this.load.setCORS("anonymous");
    this.createLoadingView();

    characterManifest.assets.forEach((entry: CharacterEntry) => {
      this.load.image(entry.preloadKey, assetUrl(entry.path));
    });

    itemManifest.items.forEach((item) => {
      this.load.image(`item:${item.id}`, assetUrl(item.image));
      this.load.image(`hud:${item.id}`, assetUrl(item.hudIcon));
    });

// 注意: sfx_combo_bonus 音频文件不存在，已在 ComboSystem 中使用 sfx_toy_hammer_hit 替代

    transitionManifest.transitions.forEach((entry: TransitionEntry) => {
      this.load.image(entry.key, assetUrl(entry.image));
    });

    levelMapManifest.levels.forEach((level) => {
      this.load.image(level.assetKey, assetUrl(level.file));
    });

    [...audioManifest.music, ...audioManifest.sfx].forEach((entry) => {
      this.load.audio(entry.key, audioUrls(entry.files));
    });
  }

  create() {
    this.registry.set("items", itemManifest.items);
    this.registry.set("audioManifest", audioManifest);
    this.registry.set("transitions", transitionManifest.transitions);
    this.scene.start("StartScene");
  }

  private createLoadingView() {
    const { width, height } = this.scale;
    const title = this.add
      .text(width / 2, height / 2 - 44, "弟弟反击战", {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "42px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#26304f",
        strokeThickness: 6
      })
      .setOrigin(0.5);
    const barBg = this.add.rectangle(width / 2, height / 2 + 32, 360, 18, 0x314665, 0.9);
    const bar = this.add.rectangle(width / 2 - 176, height / 2 + 32, 0, 12, 0xffcc4d, 1).setOrigin(0, 0.5);
    const label = this.add
      .text(width / 2, height / 2 + 72, "正在把姐姐们请进关卡...", {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "18px",
        color: "#eaf6ff"
      })
      .setOrigin(0.5);

    this.load.on("progress", (value: number) => {
      bar.width = 352 * value;
    });
    this.load.once("complete", () => {
      title.setText("准备开跑！");
      label.setText("按键和道具马上就位");
      barBg.setFillStyle(0x2f6f4f, 0.9);
    });
  }
}
