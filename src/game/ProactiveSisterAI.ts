/**
 * 主动攻击AI系统 (Wave 2.8+)
 *
 * 让姐姐在不同阶段能够主动出击，不再只是被动反应
 * 包含阶段化攻击模式、新武器、动态策略和增强的AI决策
 */
import Phaser from "phaser";
import type { EnemyKind } from "./types";

export interface ProactiveAttackProfile {
  // 基础攻击参数
  key: string;
  cooldown: number;
  windupMs: number;
  speedX: number;
  speedY: number;
  gravity: boolean;
  range: number;
  maxYDiff: number;
  damage: number;
  
  // 主动攻击特有参数
  initiativeLevel: number; // 主动性等级 0-1
  phaseRequirement: number; // 需要的关卡阶段
  aggressionRequirement: number; // 需要的愤怒程度 0-1
  
  // 特殊效果
  specialEffect?: 'stun' | 'slow' | 'push' | 'tracking';
  balloonDrop?: boolean;
  trackingDuration?: number;  // 追踪弹持续时间
}

export interface AttackStrategy {
  name: string;
  type: 'aggressive' | 'defensive' | 'tactical' | 'desperate';
  priority: number;  // 优先级 0-10
  conditions: {
    minPhase?: number;
    maxPhase?: number;
    minPlayerHp?: number;
    maxPlayerHp?: number;
    playerDistance?: { min: number; max: number };
    sisterHp?: { min: number; max: number };
  };
  attacks: string[];  // 此策略下使用的攻击类型
  behavior: {
    movementPattern: 'chase' | 'retreat' | 'circle' | 'random';
    attackFrequency: number;  // 攻击频率乘数
    riskTolerance: number;    // 风险容忍度 0-1
  };
}

export interface InitiativeContext {
  // 当前游戏状态
  gamePhase: number;  // 关卡阶段
  timeSinceLastAttack: number;
  playerBehavior: {
    aggressionLevel: number;  // 玩家攻击性 0-1
    movementPattern: string;
    recentDamage: number;     // 最近受到的伤害
  };
  
  // 战场态势
  battlefieldAdvantage: 'sister' | 'player' | 'neutral';
  terrainAdvantage: boolean;
  hasBackup: boolean;  // 是否有其他姐姐在附近
  
  // 战术考量
  shouldAmbush: boolean;
  shouldFlank: boolean;
  shouldCoordinate: boolean;
}

export class ProactiveSisterAI {
  private attackProfiles: Map<EnemyKind, ProactiveAttackProfile[]> = new Map();
  private attackStrategies: AttackStrategy[] = [];
  private lastAttackTime: Map<string, number> = new Map();
  private initiativeCooldown: Map<string, number> = new Map();
  
  // 主动攻击类型
  private initiativeAttacks = [
    'comb_throw',    // 梳子投掷
    'chair_smash',   // 椅子砸击  
    'book_toss',     // 书本投掷
    'bottle_lob',    // 瓶子投掷
    'dust_spray',    // 灰尘喷射
    'tracking_orb'   // 追踪魔法球
  ];

  constructor() {
    this.initializeAttackProfiles();
    this.initializeAttackStrategies();
  }

  private initializeAttackProfiles() {
    // 普通姐姐的新攻击方式
    this.attackProfiles.set('sister_small', [
      {
        key: 'projectile:comb',
        cooldown: 4200,
        windupMs: 500,
        speedX: 380,
        speedY: -30,
        gravity: true,
        range: 450,
        maxYDiff: 100,
        damage: 1,
        initiativeLevel: 0.7,
        phaseRequirement: 2,
        aggressionRequirement: 0.3,
        specialEffect: 'stun',
        balloonDrop: false
      },
      {
        key: 'projectile:book',
        cooldown: 3800,
        windupMs: 400,
        speedX: 420,
        speedY: -50,
        gravity: true,
        range: 380,
        maxYDiff: 80,
        damage: 1,
        initiativeLevel: 0.6,
        phaseRequirement: 1,
        aggressionRequirement: 0.4
      }
    ]);

    // Boss姐姐的主动攻击
    this.attackProfiles.set('sister_boss', [
      {
        key: 'projectile:chair',
        cooldown: 5500,
        windupMs: 800,
        speedX: 350,
        speedY: -80,
        gravity: true,
        range: 600,
        maxYDiff: 150,
        damage: 2,
        initiativeLevel: 0.9,
        phaseRequirement: 3,
        aggressionRequirement: 0.6,
        specialEffect: 'push'
      },
      {
        key: 'projectile:tracking_orb',
        cooldown: 7000,
        windupMs: 1000,
        speedX: 280,
        speedY: 0,
        gravity: false,
        range: 800,
        maxYDiff: 200,
        damage: 2,
        initiativeLevel: 0.8,
        phaseRequirement: 5,
        aggressionRequirement: 0.5,
        specialEffect: 'tracking',
        trackingDuration: 3000
      }
    ]);

    // 耳机姐姐的特殊攻击
    this.attackProfiles.set('sister_headphone', [
      {
        key: 'projectile:sound_wave',
        cooldown: 3000,
        windupMs: 450,
        speedX: 500,
        speedY: 0,
        gravity: false,
        range: 650,
        maxYDiff: 120,
        damage: 1,
        initiativeLevel: 0.5,
        phaseRequirement: 4,
        aggressionRequirement: 0.3,
        specialEffect: 'slow'
      }
    ]);

    // 管子姐姐的区域攻击
    this.attackProfiles.set('sister_pipe', [
      {
        key: 'projectile:dust_cloud',
        cooldown: 4500,
        windupMs: 600,
        speedX: 200,
        speedY: -100,
        gravity: true,
        range: 500,
        maxYDiff: 200,
        damage: 1,
        initiativeLevel: 0.8,
        phaseRequirement: 3,
        aggressionRequirement: 0.4,
        specialEffect: 'slow'
      }
    ]);
  }

  private initializeAttackStrategies() {
    this.attackStrategies = [
      {
        name: 'Aggressive Assault',
        type: 'aggressive',
        priority: 9,
        conditions: {
          minPhase: 2,
          playerDistance: { min: 50, max: 400 },
          sisterHp: { min: 0.6, max: 1.0 }
        },
        attacks: ['comb_throw', 'book_toss', 'chair_smash'],
        behavior: {
          movementPattern: 'chase',
          attackFrequency: 1.4,
          riskTolerance: 0.8
        }
      },
      {
        name: 'Tactical Ranged',
        type: 'tactical',
        priority: 7,
        conditions: {
          minPhase: 3,
          playerDistance: { min: 200, max: 600 }
        },
        attacks: ['bottle_lob', 'tracking_orb', 'dust_spray'],
        behavior: {
          movementPattern: 'circle',
          attackFrequency: 1.1,
          riskTolerance: 0.5
        }
      },
      {
        name: 'Defensive Poking',
        type: 'defensive',
        priority: 5,
        conditions: {
          maxPlayerHp: 0.8,
          playerDistance: { min: 100, max: 500 },
          sisterHp: { min: 0, max: 0.7 }
        },
        attacks: ['book_toss', 'dust_spray'],
        behavior: {
          movementPattern: 'retreat',
          attackFrequency: 0.8,
          riskTolerance: 0.3
        }
      },
      {
        name: 'Desperate Measures',
        type: 'desperate',
        priority: 10,
        conditions: {
          sisterHp: { min: 0, max: 0.3 }
        },
        attacks: ['chair_smash', 'tracking_orb', 'bottle_lob'],
        behavior: {
          movementPattern: 'random',
          attackFrequency: 2.0,
          riskTolerance: 1.0
        }
      },
      {
        name: 'Coordinated Attack',
        type: 'tactical',
        priority: 8,
        conditions: {
          minPhase: 4,
          playerDistance: { min: 100, max: 400 }
        },
        attacks: ['comb_throw', 'book_toss', 'sound_wave'],
        behavior: {
          movementPattern: 'chase',
          attackFrequency: 1.3,
          riskTolerance: 0.6
        }
      }
    ];
  }

  /**
   * 评估是否应该主动发起攻击
   */
  shouldInitiateAttack(
    enemyId: string,
    kind: EnemyKind,
    gamePhase: number,
    playerDistance: number,
    playerHp: number,
    playerMaxHp: number,
    sisterHp: number,
    sisterMaxHp: number,
    emotionLevel: number,  // 0-1 愤怒程度
    time: number
  ): { shouldAttack: boolean; selectedStrategy?: AttackStrategy; attackType?: string } {
    
    // 检查冷却时间
    const lastAttack = this.lastAttackTime.get(enemyId) || 0;
    const initiativeCooldown = this.initiativeCooldown.get(enemyId) || 0;
    if (time < lastAttack + initiativeCooldown) {
      return { shouldAttack: false };
    }

    // 创建评估上下文
    const context = this.createInitiativeContext(
      gamePhase,
      playerDistance,
      playerHp / playerMaxHp,
      sisterHp / sisterMaxHp,
      emotionLevel,
      time - lastAttack
    );

    // 选择最佳策略
    const strategy = this.selectBestStrategy(context);
    if (!strategy) {
      return { shouldAttack: false };
    }

    // 检查策略条件
    if (!this.meetsStrategyConditions(strategy, context)) {
      return { shouldAttack: false };
    }

    // 选择攻击类型
    const availableAttacks = this.getAvailableAttacks(kind, gamePhase, emotionLevel);
    const attackType = this.selectBestAttack(availableAttacks, context, strategy);
    
    if (attackType) {
      return {
        shouldAttack: true,
        selectedStrategy: strategy,
        attackType
      };
    }

    return { shouldAttack: false };
  }

  /**
   * 执行主动攻击
   */
  executeInitiativeAttack(
    enemyId: string,
    kind: EnemyKind,
    attackType: string,
    gamePhase: number,
    emotionLevel: number,
    time: number
  ): ProactiveAttackProfile | null {
    
    const availableAttacks = this.getAvailableAttacks(kind, gamePhase, emotionLevel);
    const attack = availableAttacks.find(a => this.getAttackName(a.key) === attackType);
    
    if (attack) {
      this.lastAttackTime.set(enemyId, time);
      this.initiativeCooldown.set(enemyId, attack.cooldown);
      return attack;
    }
    
    return null;
  }

  private createInitiativeContext(
    gamePhase: number,
    playerDistance: number,
    playerHpRatio: number,
    sisterHpRatio: number,
    emotionLevel: number,
    timeSinceLastAttack: number
  ): InitiativeContext {
    
    return {
      gamePhase,
      timeSinceLastAttack,
      playerBehavior: {
        aggressionLevel: this.calculatePlayerAggression(playerDistance),
        movementPattern: 'aggressive', // 简化
        recentDamage: 1 - sisterHpRatio
      },
      battlefieldAdvantage: sisterHpRatio > playerHpRatio ? 'sister' : playerHpRatio > sisterHpRatio ? 'player' : 'neutral',
      terrainAdvantage: gamePhase > 3,
      hasBackup: false, // 简化
      shouldAmbush: gamePhase > 5 && playerDistance > 300,
      shouldFlank: playerDistance < 200,
      shouldCoordinate: gamePhase > 4
    };
  }

  private selectBestStrategy(context: InitiativeContext): AttackStrategy | null {
    const validStrategies = this.attackStrategies
      .filter(strategy => this.meetsStrategyConditions(strategy, context))
      .sort((a, b) => b.priority - a.priority);
    
    return validStrategies.length > 0 ? validStrategies[0] : null;
  }

  private meetsStrategyConditions(strategy: AttackStrategy, context: InitiativeContext): boolean {
    const cond = strategy.conditions;
    
    if (cond.minPhase && context.gamePhase < cond.minPhase) return false;
    if (cond.maxPhase && context.gamePhase > cond.maxPhase) return false;
    if (cond.minPlayerHp && context.playerBehavior.recentDamage < (1 - cond.minPlayerHp)) return false;
    if (cond.maxPlayerHp && context.playerBehavior.recentDamage > (1 - cond.maxPlayerHp)) return false;
    
    return true;
  }

  private getAvailableAttacks(kind: EnemyKind, gamePhase: number, emotionLevel: number): ProactiveAttackProfile[] {
    const profiles = this.attackProfiles.get(kind) || [];
    return profiles.filter(profile => 
      gamePhase >= profile.phaseRequirement && 
      emotionLevel >= profile.aggressionRequirement
    );
  }

  private selectBestAttack(
    attacks: ProactiveAttackProfile[],
    context: InitiativeContext,
    strategy: AttackStrategy
  ): string | null {
    if (attacks.length === 0) return null;
    
    // 根据策略和情境选择最合适的攻击
    const suitableAttacks = attacks.filter(attack => {
      const attackName = this.getAttackName(attack.key);
      return strategy.attacks.includes(attackName);
    });

    if (suitableAttacks.length === 0) {
      // 如果没有完全匹配的，选择主动性最高的
      const best = attacks.reduce((prev, current) => 
        prev.initiativeLevel > current.initiativeLevel ? prev : current
      );
      return this.getAttackName(best.key);
    }

    // 随机选择适合的攻防之一
    const selected = Phaser.Math.RND.pick(suitableAttacks);
    return this.getAttackName(selected.key);
  }

  private getAttackName(key: string): string {
    const mappings: Record<string, string> = {
      'projectile:comb': 'comb_throw',
      'projectile:chair': 'chair_smash',
      'projectile:book': 'book_toss',
      'projectile:bottle': 'bottle_lob',
      'projectile:dust_cloud': 'dust_spray',
      'projectile:tracking_orb': 'tracking_orb',
      'projectile:sound_wave': 'sound_wave'
    };
    return mappings[key] || key;
  }

  private calculatePlayerAggression(playerDistance: number): number {
    // 距离越近，认为玩家攻击性越高
    return Phaser.Math.Clamp((400 - playerDistance) / 400, 0, 1);
  }

  /**
   * 重置所有状态
   */
  reset() {
    this.lastAttackTime.clear();
    this.initiativeCooldown.clear();
  }
}