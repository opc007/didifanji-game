/**
 * 通用对话气泡组件（Wave 1.1 + 2.3）
 *
 * 用于：
 *  - 姐姐情绪气泡（傲娇/烦躁/暴怒/哭）
 *  - 弟弟内心独白
 *  - 真心话（战斗结算后）
 */
import Phaser from "phaser";

export type BubbleSide = "top" | "bottom";

export interface BubbleOptions {
  text: string;
  speaker: "sister" | "brother" | "narrator";
  color?: string;
  durationMs?: number;
  side?: BubbleSide;
  fontSize?: number;
  offsetY?: number;
}

const SPEAKER_COLOR: Record<BubbleOptions["speaker"], string> = {
  sister: "#ffe7f0",
  brother: "#e7f3ff",
  narrator: "#fff3bd",
};

const SPEAKER_BORDER: Record<BubbleOptions["speaker"], number> = {
  sister: 0xff7ac8,
  brother: 0x7ed6ff,
  narrator: 0xffd34d,
};

export class DialogBubble {
  private bubble?: Phaser.GameObjects.Container;
  private bg?: Phaser.GameObjects.Rectangle;
  private tail?: Phaser.GameObjects.Triangle;
  private label?: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {}

  show(target: { x: number; y: number }, opts: BubbleOptions): Phaser.GameObjects.Container {
    const side: BubbleSide = opts.side ?? "top";
    const fontSize = opts.fontSize ?? 18;
    const color = opts.color ?? SPEAKER_COLOR[opts.speaker];
    const borderColor = SPEAKER_BORDER[opts.speaker];
    const offsetY = opts.offsetY ?? (side === "top" ? -76 : 76);

    // 销毁旧的
    if (this.bubble) this.bubble.destroy();

    const label = this.scene.add.text(0, 0, opts.text, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: "bold",
      color,
      stroke: "#172137",
      strokeThickness: 3,
    }).setOrigin(0.5);

    const padX = 16;
    const padY = 8;
    const w = label.width + padX * 2;
    const h = label.height + padY * 2;

    const bg = this.scene.add.rectangle(0, 0, w, h, 0xffffff, 0.92).setStrokeStyle(2, borderColor, 0.9).setOrigin(0.5);

    const tailY = side === "top" ? h / 2 : -h / 2;
    const tail = this.scene.add.triangle(0, tailY, -8, 0, 8, 0, 0, side === "top" ? 12 : -12, borderColor, 1).setOrigin(0.5);

    const container = this.scene.add.container(target.x, target.y + offsetY, [bg, tail, label]).setDepth(50);
    container.setAlpha(0).setScale(0.4);

    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      scale: 1,
      duration: 160,
      ease: "Back.easeOut",
    });

    this.bubble = container;
    this.bg = bg;
    this.tail = tail;
    this.label = label;

    // 跟随 target
    container.setData("follow", { x: target.x, y: target.y });
    this.scene.events.on("update", this.followTarget);

    // 自动消失
    const dur = opts.durationMs ?? 1800;
    this.scene.time.delayedCall(dur, () => this.hide());

    return container;
  }

  private followTarget = () => {
    if (!this.bubble) return;
    const t = this.bubble.getData("follow") as { x: number; y: number } | undefined;
    if (!t) return;
    const offsetY = (this.bubble.y - (t.y + (this.bg ? -76 : 0)));
    this.bubble.setPosition(t.x, t.y + offsetY);
  };

  hide() {
    if (!this.bubble) return;
    const b = this.bubble;
    this.scene.events.off("update", this.followTarget);
    this.scene.tweens.add({
      targets: b,
      alpha: 0,
      scale: 0.6,
      y: b.y - 16,
      duration: 220,
      ease: "Quad.easeIn",
      onComplete: () => b.destroy(),
    });
    this.bubble = undefined;
    this.bg = undefined;
    this.tail = undefined;
    this.label = undefined;
  }
}
