/**
 * CodexScene - 收藏图鉴（Wave 2.6）
 *
 * 展示：道具 / 姐姐 / 关卡 / 徽章 / 姐姐日记 五大分类。
 * 数据来自 SaveManager.codexUnlocked / diaryUnlocked / levelRecords。
 */
import Phaser from "phaser";
import { SaveManager } from "./SaveManager";

type Category = "items" | "enemies" | "levels" | "diary";

interface CodexEntry {
  id: string;
  name: string;
  description: string;
  /** 已解锁条件 */
  condition: string;
  artHint?: string;
}

const ITEM_CATALOG: CodexEntry[] = [
  { id: "codex_fireball_candy", name: "火球糖", description: "5 发火球，远程攻击", condition: "使用 1 次火球糖" },
  { id: "codex_bubble_shield", name: "泡泡盾", description: "抵挡 1 次伤害", condition: "使用 1 次泡泡盾" },
  { id: "codex_toy_hammer", name: "玩具锤", description: "近距离矩形攻击", condition: "使用 1 次玩具锤" },
  { id: "codex_bouncy_shoes", name: "跳跳鞋", description: "跳得更高", condition: "使用 1 次跳跳鞋" },
  { id: "codex_flying_cap", name: "飞行帽", description: "短暂滑翔", condition: "使用 1 次飞行帽" },
  { id: "codex_boomerang_toy", name: "回旋玩具", description: "丢出飞回", condition: "使用 1 次回旋玩具" },
  { id: "codex_popcorn_bomb", name: "爆米花炸弹", description: "小范围爆炸", condition: "使用 1 次爆米花炸弹" },
  { id: "codex_ice_cream_blaster", name: "冰淇淋枪", description: "冻住姐姐 2 秒", condition: "使用 1 次冰淇淋枪" },
  { id: "codex_giant_cookie", name: "变大饼干", description: "变大并抗 1 次伤害", condition: "使用 1 次变大饼干" },
  { id: "codex_star_cape", name: "星星披风", description: "无敌冲刺", condition: "使用 1 次星星披风" },
  { id: "codex_craft_burning_popcorn", name: "燃烧爆米花", description: "火球糖 + 爆米花炸弹", condition: "合成成功 1 次" },
  { id: "codex_craft_flying_bubble", name: "飞行泡泡", description: "泡泡盾 + 飞行帽", condition: "合成成功 1 次" },
  { id: "codex_craft_star_jump", name: "星跳冲刺", description: "跳跳鞋 + 星星披风", condition: "合成成功 1 次" },
  { id: "codex_craft_spinning_hammer", name: "回旋飞锤", description: "回旋玩具 + 玩具锤", condition: "合成成功 1 次" },
  { id: "codex_craft_giant_ice_block", name: "巨型冰砖", description: "冰淇淋枪 + 变大饼干", condition: "合成成功 1 次" },
];

const ENEMY_CATALOG: CodexEntry[] = [
  { id: "defeat_sister_small", name: "姐姐小怪", description: "基础巡逻敌人。踩头击倒。", condition: "击败 1 次" },
  { id: "defeat_sister_headphone", name: "耳机姐姐", description: "横向音波攻击。音波后停顿可踩。", condition: "击败 1 次" },
  { id: "defeat_sister_balloon", name: "气球姐姐", description: "空中漂浮。踩中可弹高。", condition: "击败 1 次" },
  { id: "defeat_sister_pipe", name: "管道姐姐", description: "管道探头机关。2 血。", condition: "击败 1 次" },
  { id: "defeat_sister_boss", name: "Boss 姐姐", description: "关卡 Boss。多阶段多血。", condition: "击败 1 次" },
  { id: "codex_secret_1", name: "回忆 · 小时候的客厅", description: "隐藏房间奖励。", condition: "进入隐藏房间 1" },
  { id: "codex_challenge_5", name: "限时挑战 · 30 秒", description: "30 秒击败 5 个姐姐。", condition: "通关限时挑战" },
  { id: "codex_easter_10", name: "彩蛋 · 姐姐日记本", description: "最终章隐藏彩蛋。", condition: "找到彩蛋" },
];

const DIARY_CATALOG: CodexEntry[] = [
  { id: "diary_brother_01", name: "弟弟 · 小时候", description: "那时候姐姐才 12 岁，她抱着弟弟在沙发上看动画片…", condition: "进入回忆房间" },
  { id: "diary_sister_small_01", name: "姐姐小怪 · 小本本", description: "今天弟弟又把客厅弄乱了。", condition: "击败姐姐小怪" },
  { id: "diary_sister_headphone_01", name: "耳机姐姐 · 烦恼", description: "作业太多了…", condition: "击败耳机姐姐" },
  { id: "diary_sister_boss_01", name: "Boss · 真心话", description: "弟弟…其实姐姐也不想追你…", condition: "击败任何 Boss" },
  { id: "diary_sister_boss_02", name: "Boss · 彩蛋日记", description: "陪他玩挺开心的。弟弟，你要一直这么调皮哦。", condition: "最终章彩蛋" },
];

export class CodexScene extends Phaser.Scene {
  private category: Category = "items";
  private selected = 0;
  private itemTexts: Phaser.GameObjects.Text[] = [];

  constructor() { super("CodexScene"); }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0e1a2e");

    this.add.text(width / 2, 36, "收藏图鉴", {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "28px",
      fontStyle: "bold",
      color: "#fff3bd",
    }).setOrigin(0.5);

    this.add.text(width / 2, height - 30, "← → 切换分类  ↑ ↓ 选择  Esc 返回", {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "13px",
      color: "#a4f0ff",
    }).setOrigin(0.5);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.addKey("ESC").on("down", () => this.scene.start("StartScene"));
    this.events.on("update", this.updateMenu);
    this.draw();
  }

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private updateMenu = () => {
    if (!this.cursors) return;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) {
      const order: Category[] = ["items", "enemies", "diary"];
      this.category = order[(order.indexOf(this.category) - 1 + order.length) % order.length];
      this.selected = 0;
      this.draw();
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) {
      const order: Category[] = ["items", "enemies", "diary"];
      this.category = order[(order.indexOf(this.category) + 1) % order.length];
      this.selected = 0;
      this.draw();
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
      this.selected = Math.max(0, this.selected - 1);
      this.draw();
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
      this.selected = Math.min(this.getCatalog().length - 1, this.selected + 1);
      this.draw();
    } else if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey("ESC"))) {
      this.scene.start("StartScene");
    }
  };

  private getCatalog(): CodexEntry[] {
    if (this.category === "items") return ITEM_CATALOG;
    if (this.category === "enemies") return ENEMY_CATALOG;
    if (this.category === "diary") return DIARY_CATALOG;
    return [];
  }

  private getCategoryLabel(): string {
    if (this.category === "items") return "道具";
    if (this.category === "enemies") return "姐姐";
    if (this.category === "diary") return "日记";
    return "";
  }

  private getUnlockedSet(): Set<string> {
    const save = SaveManager.load();
    return new Set([...save.codexUnlocked, ...save.diaryUnlocked]);
  }

  private draw() {
    this.itemTexts.forEach((t) => t.destroy());
    this.itemTexts = [];
    const { width, height } = this.scale;
    const cat = this.getCategoryLabel();
    const all = ["items", "enemies", "diary"];
    const labels = ["道具", "姐姐", "日记"];
    // 分类标签
    all.forEach((c, i) => {
      const t = this.add.text(150 + i * 220, 90, `[${labels[i]}]`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "16px",
        fontStyle: "bold",
        color: c === this.category ? "#ffcf3a" : "#a4f0ff",
        backgroundColor: c === this.category ? "#3a4a6c" : "#1a2740",
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5);
      this.itemTexts.push(t);
    });
    this.add.text(width - 200, 90, `分类: ${cat}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "16px",
      color: "#a4f0ff",
    }).setOrigin(0.5);
    void cat;

    // 列表
    const unlocked = this.getUnlockedSet();
    const catalog = this.getCatalog();
    const listStartY = 140;
    const rowH = 36;
    catalog.forEach((entry, i) => {
      const y = listStartY + i * rowH;
      const isSel = i === this.selected;
      const have = unlocked.has(entry.id);
      const color = !have ? "#666666" : isSel ? "#ffcf3a" : "#eaf6ff";
      const row = this.add.text(40, y, `${have ? "●" : "○"}  ${entry.name}`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "16px",
        fontStyle: isSel ? "bold" : "normal",
        color,
      }).setOrigin(0, 0.5);
      this.itemTexts.push(row);
    });

    // 详情面板
    const entry = catalog[this.selected];
    if (entry) {
      const have = unlocked.has(entry.id);
      const desc = have ? entry.description : `🔒 ${entry.condition}`;
      const panelY = listStartY + catalog.length * rowH + 20;
      this.add.text(width / 2, panelY, entry.name, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "20px",
        fontStyle: "bold",
        color: have ? "#ffcf3a" : "#888888",
      }).setOrigin(0.5);
      this.add.text(width / 2, panelY + 32, desc, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "14px",
        color: have ? "#eaf6ff" : "#666666",
        wordWrap: { width: 700 },
        align: "center",
      }).setOrigin(0.5);
    }

    // 进度
    const totalCount = ITEM_CATALOG.length + ENEMY_CATALOG.length + DIARY_CATALOG.length;
    const unlockedCount = unlocked.size;
    this.add.text(width / 2, height - 56, `总进度: ${unlockedCount} / ${totalCount}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: "14px",
      color: "#a4f0ff",
    }).setOrigin(0.5);
  }
}
