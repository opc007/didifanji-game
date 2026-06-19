/**
 * 道具合成系统（Wave 1.2）
 *
 * 拾取新道具时，若「当前道具 + 新道具」在合成表中，弹出 3 秒倒计时提示，
 * 按 J 合成；不按则保留旧的、丢掉新的（保持原 MVP 行为）。
 */
import Phaser from "phaser";

export interface CraftRecipe {
  ingredients: [string, string];
  result: {
    id: string;
    name: string;
    uses?: number;
    durationSeconds?: number;
    action: string;
    description: string;
  };
  visual: { effect: string; durationMs: number };
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    ingredients: ["fireball_candy", "popcorn_bomb"],
    result: { id: "burning_popcorn", name: "燃烧爆米花", uses: 3, action: "throw_burning_popcorn", description: "投出后地面持续燃烧 5 秒" },
    visual: { effect: "burn_ground", durationMs: 5000 },
  },
  {
    ingredients: ["bubble_shield", "flying_cap"],
    result: { id: "flying_bubble", name: "飞行泡泡", durationSeconds: 8, action: "fly_with_shield", description: "飞行 8 秒，期间不受伤害" },
    visual: { effect: "fly_shield_aura", durationMs: 8000 },
  },
  {
    ingredients: ["bouncy_shoes", "star_cape"],
    result: { id: "star_jump", name: "星跳冲刺", durationSeconds: 6, action: "star_jump", description: "大幅跳 + 无敌冲刺" },
    visual: { effect: "star_trail", durationMs: 6000 },
  },
  {
    ingredients: ["boomerang_toy", "toy_hammer"],
    result: { id: "spinning_hammer", name: "回旋飞锤", uses: 4, action: "spin_hammer", description: "锤子绕身体旋转一圈" },
    visual: { effect: "spin_hammer", durationMs: 1000 },
  },
  {
    ingredients: ["ice_cream_blaster", "giant_cookie"],
    result: { id: "giant_ice_block", name: "巨型冰砖", uses: 2, action: "throw_ice_block", description: "投出大冰块，冻住姐姐 3 秒" },
    visual: { effect: "frost_aura", durationMs: 3000 },
  },
];

export function findRecipe(a: string, b: string): CraftRecipe | undefined {
  return CRAFT_RECIPES.find(
    (r) => (r.ingredients[0] === a && r.ingredients[1] === b) || (r.ingredients[0] === b && r.ingredients[1] === a),
  );
}

export interface CraftingPromptHandle {
  destroy: () => void;
}

export class CraftingPrompt {
  /** 显示 3 秒合成提示；返回 destroy 句柄。按 J 在 GameScene 中处理。 */
  static show(scene: Phaser.Scene, a: string, b: string, recipe: CraftRecipe, onConfirm: () => void, onCancel: () => void): CraftingPromptHandle {
    const cam = scene.cameras.main;
    const w = 380;
    const h = 110;
    const panel = scene.add.rectangle(cam.centerX, cam.centerY, w, h, 0x14213d, 0.92).setStrokeStyle(3, 0xfff3bd, 0.85).setScrollFactor(0).setDepth(1100);
    const title = scene.add.text(cam.centerX, cam.centerY - 32, `合成？${recipe.result.name}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "20px",
      fontStyle: "bold",
      color: "#fff3bd",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1101);
    const desc = scene.add.text(cam.centerX, cam.centerY - 6, recipe.result.description, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "14px",
      color: "#eaf6ff",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1101);
    const hint = scene.add.text(cam.centerX, cam.centerY + 28, "按 J 合成   不按则保留原道具", {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "14px",
      color: "#a4f0ff",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1101);

    // 倒计时环
    const ring = scene.add.circle(cam.centerX + w / 2 - 16, cam.centerY - h / 2 + 16, 10, 0xffd34d, 1).setScrollFactor(0).setDepth(1101);
    let remainMs = 3000;

    const tick = scene.time.addEvent({
      delay: 50,
      callback: () => {
        remainMs -= 50;
        ring.setScale(Math.max(0.05, remainMs / 3000));
        if (remainMs <= 0) {
          destroy();
          onCancel();
        }
      },
      loop: true,
    });

    const destroy = () => {
      tick.remove();
      panel.destroy();
      title.destroy();
      desc.destroy();
      hint.destroy();
      ring.destroy();
    };

    return { destroy };
  }
}
