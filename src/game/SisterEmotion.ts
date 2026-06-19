/**
 * 姐姐情绪系统（Wave 1.1）
 *
 * 每个姐姐敌人有"情绪状态机"，被击中/被接近时切换：
 *  idle → aware → patrol → tsundere → annoyed → wrath → cry → defeat
 * 状态影响速度、攻击频率、对话气泡。
 *
 * 调用：GameScene.updateEnemies() 中 tick(emotion, dt)
 *      命中时 onHit() / 玩家远离时 onPlayerFar()
 */

export type EmotionState =
  | "idle" | "aware" | "patrol"
  | "tsundere" | "annoyed" | "wrath"
  | "cry" | "defeat";

export interface EmotionConfig {
  speedMul: number;
  attackCooldownMul: number;
  bubbleText: string | null;
  bubbleColor: string;
  durationMs?: number;
}

export const EMOTION_TABLE: Record<EmotionState, EmotionConfig> = {
  idle:     { speedMul: 0.6, attackCooldownMul: 1.2, bubbleText: null,         bubbleColor: "#ffffff" },
  aware:    { speedMul: 0.9, attackCooldownMul: 1.0, bubbleText: "?",         bubbleColor: "#ffeb99" },
  patrol:   { speedMul: 1.0, attackCooldownMul: 1.0, bubbleText: null,         bubbleColor: "#ffffff" },
  tsundere: { speedMul: 1.0, attackCooldownMul: 0.95, bubbleText: "哼!才不疼!", bubbleColor: "#ffb3c1" },
  annoyed:  { speedMul: 1.15, attackCooldownMul: 0.85, bubbleText: "你给我等着!", bubbleColor: "#ff9a8b" },
  wrath:    { speedMul: 1.3,  attackCooldownMul: 0.7, bubbleText: "我要告诉妈妈!", bubbleColor: "#ff5e5e" },
  cry:      { speedMul: 0.4,  attackCooldownMul: 2.5, bubbleText: "呜呜呜…",  bubbleColor: "#9ec5ff", durationMs: 1500 },
  defeat:   { speedMul: 0,    attackCooldownMul: 99, bubbleText: "我…没输!",  bubbleColor: "#cccccc" },
};

/** 对话池 */
export const SISTER_DIALOG = {
  enter:   ["弟弟你来啦!", "不许跑!", "今天作业写了吗?"],
  preAtk:  ["看招!", "接住!", "嘿!"],
  hit: {
    tsundere: ["哼!", "才不疼!", "小意思~", "这算什么!"],
    annoyed:  ["哎呀!", "你!你!你!", "别打了!", "疼…"],
    wrath:    ["啊啊啊!", "我真的生气了!", "我数到三!", "我要找妈妈!"],
  },
  cry:     ["呜呜呜…", "好疼啊…", "我要告诉妈妈…", "再打我就哭给你看!"],
  defeat:  ["我…我认输…", "哼,下次一定赢!", "我不服!", "弟弟最厉害了…(小声)"],
  seeItem: ["那个是我的!", "放下!", "不许吃!"],
  playerHurt: ["活该!", "知道错了吧!", "下次还敢不敢!"],
};

export class SisterEmotion {
  private state: EmotionState = "patrol";
  private hits = 0;
  private timer = 0;
  private frozenUntil = 0;

  constructor(public enemyId: string) {}

  getState(): EmotionState { return this.state; }
  getSpeedMul(): number { return EMOTION_TABLE[this.state].speedMul; }
  getCooldownMul(): number { return EMOTION_TABLE[this.state].attackCooldownMul; }

  onHit(isBoss = false): EmotionState {
    if (this.state === "defeat") return this.state;
    this.hits++;
    const next = this.computeState(isBoss);
    this.transition(next);
    return this.state;
  }

  onPlayerFar(): EmotionState {
    if (this.state === "wrath" || this.state === "annoyed" || this.state === "tsundere") {
      this.hits = Math.max(0, this.hits - 1);
      this.transition(this.computeState(false));
    }
    return this.state;
  }

  tick(deltaMs: number, playerVisible: boolean, isBoss = false): EmotionState {
    this.timer += deltaMs;
    if (this.state === "cry") {
      if (this.timer >= (EMOTION_TABLE.cry.durationMs ?? 1500)) {
        this.timer = 0;
        this.transition("annoyed");
      }
    }
    if (this.state === "idle" && playerVisible && this.timer > 600) {
      this.transition("aware");
      this.timer = 0;
    }
    if (this.state === "aware" && this.timer > 800) {
      this.transition("patrol");
      this.timer = 0;
    }
    if (this.frozenUntil > 0) {
      this.frozenUntil -= deltaMs;
    }
    return this.state;
  }

  freeze(ms: number) {
    this.frozenUntil = Math.max(this.frozenUntil, ms);
  }

  isFrozen(): boolean { return this.frozenUntil > 0; }

  private computeState(isBoss: boolean): EmotionState {
    if (this.state === "defeat") return "defeat";
    if (isBoss) {
      // Boss 没有 cry 阶段
      if (this.hits >= 5) return "defeat";
      if (this.hits >= 3) return "wrath";
      if (this.hits >= 2) return "annoyed";
      if (this.hits >= 1) return "tsundere";
      return "patrol";
    }
    if (this.hits >= 4) return "cry";
    if (this.hits >= 3) return "wrath";
    if (this.hits >= 2) return "annoyed";
    if (this.hits >= 1) return "tsundere";
    return "patrol";
  }

  private transition(next: EmotionState) {
    if (this.state === next) return;
    this.state = next;
    this.timer = 0;
  }
}
