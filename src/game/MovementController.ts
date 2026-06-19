/**
 * 玩家移动手感控制器（Wave 0.1）
 *
 * 设计目标（见升级文档 §9.2）：
 *  - 可变跳跃（短按/长按区分）
 *  - 地面/空中分离加速曲线（避免"飘"）
 *  - 落地硬/软反馈
 *  - 下砸独立状态（震波 + 短无敌 + 链跳）
 *
 * 用法：在 GameScene.update(dt) 中调用 update(dt, ctx)，
 * 本类只**计算并写入 body.velocity**，不直接读输入；输入由调用方转成 InputState。
 */
import Phaser from "phaser";

export interface InputState {
  left: boolean;
  right: boolean;
  jumpDown: boolean;        // 刚按下（边沿）
  jumpHeld: boolean;        // 按住中
  stompDown: boolean;       // 刚按下下砸（边沿）
  stompHeld: boolean;       // 按住下方向
  useDown: boolean;         // 用道具
}

export interface MovementConfig {
  maxGroundSpeed: number;
  maxAirSpeed: number;
  groundAccel: number;
  groundDecel: number;
  airAccel: number;
  jumpVelocityShort: number;
  jumpVelocityLong: number;
  jumpHoldDurationMs: number;
  jumpCutMultiplier: number;
  maxFallSpeed: number;
  fastFallMultiplier: number;
  coyoteMs: number;
  jumpBufferMs: number;
}

export const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
  maxGroundSpeed: 380,
  maxAirSpeed: 340,
  groundAccel: 4200,
  groundDecel: 3800,
  airAccel: 2800,
  jumpVelocityShort: -480,
  jumpVelocityLong: -620,
  jumpHoldDurationMs: 220,
  jumpCutMultiplier: 0.42,
  maxFallSpeed: 720,
  fastFallMultiplier: 1.45,
  coyoteMs: 150,
  jumpBufferMs: 180,
};

export type PlayerMoveState = "idle" | "running" | "jumping" | "falling" | "stomping" | "flying";

export interface MovementResult {
  state: PlayerMoveState;
  jumpedThisFrame: boolean;
  stompLandedThisFrame: boolean;
  facing: 1 | -1;
}

export class MovementController {
  private config: MovementConfig;
  private lastGroundedAt = 0;
  private jumpBufferUntil = 0;
  private jumpStartedAt = -1;
  private jumpHeldPrev = false;
  private stompPrev = false;
  private flyingUntil = 0;

  constructor(config: Partial<MovementConfig> = {}) {
    this.config = { ...DEFAULT_MOVEMENT_CONFIG, ...config };
  }

  getConfig(): MovementConfig {
    return this.config;
  }

  setFlying(untilTimeMs: number) {
    this.flyingUntil = Math.max(this.flyingUntil, untilTimeMs);
  }

  /** 重置（关卡重开 / 出检查点） */
  reset() {
    this.lastGroundedAt = 0;
    this.jumpBufferUntil = 0;
    this.jumpStartedAt = -1;
    this.jumpHeldPrev = false;
    this.stompPrev = false;
    this.flyingUntil = 0;
  }

  update(
    dt: number,
    time: number,
    body: Phaser.Physics.Arcade.Body,
    facing: 1 | -1,
    input: InputState,
    ctx: {
      starUntil: number;
      giantUntil: number;
    }
  ): MovementResult {
    const cfg = this.config;
    const grounded = body.blocked.down || body.touching.down;

    if (grounded) this.lastGroundedAt = time;

    // ─── 缓冲 / 边沿 ───────────────────────────────────
    if (input.jumpDown) this.jumpBufferUntil = time + cfg.jumpBufferMs;
    const jumpEdge = input.jumpDown;

    // ─── 跳跃判定 ─────────────────────────────────────
    const canJump = grounded || time - this.lastGroundedAt <= cfg.coyoteMs;
    let jumpedThisFrame = false;
    if (time <= this.jumpBufferUntil && canJump && body.velocity.y >= -40) {
      const heldMs = this.jumpStartedAt > 0 ? time - this.jumpStartedAt : cfg.jumpHoldDurationMs;
      const t = Phaser.Math.Clamp(heldMs / cfg.jumpHoldDurationMs, 0, 1);
      const vy = Phaser.Math.Linear(cfg.jumpVelocityShort, cfg.jumpVelocityLong, t);
      body.setVelocityY(vy);
      this.jumpBufferUntil = 0;
      this.jumpStartedAt = time;
      this.lastGroundedAt = -9999; // 跳出 coyote
      jumpedThisFrame = true;
    }

    // ─── 跳跃松开（短按）减速度 ───────────────────────
    if (!input.jumpHeld && body.velocity.y < 0 && time - this.jumpStartedAt < 200) {
      body.setVelocityY(body.velocity.y * cfg.jumpCutMultiplier);
    }

    // ─── 下砸 ─────────────────────────────────────────
    let stompLandedThisFrame = false;
    const stompEdge = input.stompDown && !this.stompPrev;
    this.stompPrev = input.stompDown;
    if (stompEdge && !grounded) {
      const speed = cfg.maxFallSpeed * cfg.fastFallMultiplier;
      body.setVelocityY(speed);
    }
    if (input.stompHeld && !grounded) {
      body.setVelocityY(Math.min(body.velocity.y, cfg.maxFallSpeed * cfg.fastFallMultiplier));
    }

    // ─── 飞行帽（轻按跳跃降低下落速度） ──────────────
    if (time < this.flyingUntil && !grounded && body.velocity.y > 60 && input.jumpHeld) {
      body.setVelocityY(Math.min(body.velocity.y, 120));
    }

    // ─── 水平加速曲线（地面 / 空气 分开） ─────────────
    let targetDir = 0;
    if (input.left) targetDir -= 1;
    if (input.right) targetDir += 1;
    let nextFacing = facing;
    if (targetDir !== 0) nextFacing = targetDir as 1 | -1;

    const speedBoost = time < ctx.starUntil ? 1.45 : 1;
    const giantPenalty = time < ctx.giantUntil ? 0.9 : 1;
    const maxGround = cfg.maxGroundSpeed * speedBoost * giantPenalty;
    const maxAir = cfg.maxAirSpeed * speedBoost * giantPenalty;
    const maxNow = grounded ? maxGround : maxAir;
    const accel = grounded ? cfg.groundAccel : cfg.airAccel;

    if (targetDir !== 0) {
      // 朝目标速度平滑逼近（指数趋近，dt 无关）
      const targetVx = targetDir * maxNow;
      const ratio = 1 - Math.exp(-(accel * (dt / 1000)) / Math.max(maxNow, 1));
      body.velocity.x = body.velocity.x + (targetVx - body.velocity.x) * ratio;
    } else {
      // 无输入时快速减速（避免滑步）
      const decel = grounded ? cfg.groundDecel : cfg.groundDecel * 0.85;
      const ratio = 1 - Math.exp(-(decel * (dt / 1000)) / Math.max(maxNow, 1));
      body.velocity.x = body.velocity.x + (0 - body.velocity.x) * ratio;
      if (Math.abs(body.velocity.x) < 4) body.velocity.x = 0;
    }

    // 限制最大下落速度
    if (body.velocity.y > cfg.maxFallSpeed) {
      body.velocity.y = cfg.maxFallSpeed;
    }

    this.jumpHeldPrev = input.jumpHeld;

    // ─── 状态分类 ─────────────────────────────────────
    let state: PlayerMoveState;
    if (input.stompHeld && !grounded) state = "stomping";
    else if (!grounded && time < this.flyingUntil) state = "flying";
    else if (!grounded && body.velocity.y < -40) state = "jumping";
    else if (!grounded) state = "falling";
    else if (Math.abs(body.velocity.x) > 12) state = "running";
    else state = "idle";

    return {
      state,
      jumpedThisFrame,
      stompLandedThisFrame,
      facing: nextFacing,
    };
  }
}
