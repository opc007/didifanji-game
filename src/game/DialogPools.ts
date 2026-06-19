/**
 * 真心话 + 弟弟独白池（Wave 2.3）
 */

export const HEARTFELT_BY_KIND: Record<string, string[]> = {
  sister_small: [
    "哼，弟弟你等着…",
    "才不疼呢…(揉揉头)",
    "下次我一定赢！",
    "作业你到底写没写啊！",
  ],
  sister_headphone: [
    "我把音乐开大声点…是想盖住妈妈的唠叨",
    "哎，作业太多了…",
    "哎哟…我的耳机！",
  ],
  sister_balloon: [
    "哼，飘起来再打你！",
    "漏气了…好丢人…",
  ],
  sister_pipe: [
    "我只是想躲起来…结果被你找到了",
    "下次换个地方躲！",
  ],
  sister_boss: [
    "弟弟…其实姐姐也不想追你…",
    "我也想玩,但作业没写完…",
    "谢谢你陪姐姐玩了一局…",
  ],
};

export function pickHeartfelt(kind: string, isBoss: boolean): string | undefined {
  if (isBoss) return HEARTFELT_BY_KIND.sister_boss[Math.floor(Math.random() * HEARTFELT_BY_KIND.sister_boss.length)];
  const pool = HEARTFELT_BY_KIND[kind] ?? HEARTFELT_BY_KIND.sister_small;
  // 30% 概率显示真心话（避免每次都喊）
  if (Math.random() > 0.35) return undefined;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── 弟弟独白 ─────────────────────────────────────
export interface MonologueTrigger {
  id: string;
  /** 触发条件 */
  when: "level_start" | "first_coin" | "near_secret" | "boss_zone" | "low_hp" | "checkpoint" | "ice_zone" | "rain_zone";
  /** 最少关卡（0-based） */
  minLevel?: number;
  /** 触发概率 */
  probability?: number;
  text: string;
}

export const BROTHER_MONOLOGUES: MonologueTrigger[] = [
  { id: "m_lvl_start", when: "level_start", text: "嘿嘿,姐姐我来啦!" },
  { id: "m_first_coin", when: "first_coin", text: "金币金币,越多越好!" },
  { id: "m_secret_1", when: "near_secret", text: "咦?这里好像有什么…" },
  { id: "m_secret_2", when: "near_secret", minLevel: 2, text: "墙上好像有裂缝…", probability: 0.6 },
  { id: "m_boss_1", when: "boss_zone", text: "姐…姐姐?!你怎么这么大!" },
  { id: "m_boss_2", when: "boss_zone", minLevel: 5, text: "我要用道具打败你!" },
  { id: "m_low_hp_1", when: "low_hp", text: "只剩一颗心了…小心!" },
  { id: "m_low_hp_2", when: "low_hp", minLevel: 3, text: "再挨一下就要哭了…" },
  { id: "m_ckpt", when: "checkpoint", text: "检查点!这下安全了!" },
  { id: "m_ice", when: "ice_zone", text: "好滑!站不稳!" },
  { id: "m_rain", when: "rain_zone", text: "作业本雨?!快躲!" },
];
