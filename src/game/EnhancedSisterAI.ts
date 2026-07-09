/**
 * 增强版姐姐AI行为模式系统（Wave 1.1+）
 *
 * 基于情绪状态、玩家行为、动态难度等因素，
 * 让姐姐敌人展现出更智能、更个性化的行为模式
 */
import Phaser from "phaser";
import { SisterEmotion, EmotionState, EMOTION_TABLE } from "./SisterEmotion";
import { EnhancedAdaptiveAI } from "./EnhancedAdaptiveAI";

export interface SisterPersonality {
  // 基础性格特质
  aggressiveness: number;     // 攻击性 0-1
  stubbornness: number;       // 固执程度 0-1
  intelligence: number;       // 智能程度 0-1
  
  // 行为偏好
  attackStyle: 'ranged' | 'melee' | 'balanced'; // 攻击风格
  movementPattern: 'aggressive' | 'defensive' | 'tactical'; // 移动模式
  
  // 社交特性
  mockeryLevel: number;       // 嘲讽频率 0-1
  cooperationTendency: number; // 协作倾向 0-1
  
  // 学习能力
  adaptsToPlayer: boolean;    // 是否适应玩家战术
  learningRate: number;       // 学习速度 0-1
}

export interface BattleMemory {
  // 对玩家的认知
  playerPatterns: {
    jumpFrequency: number;    // 跳跃频率
    attackAccuracy: number;   // 攻击准确率
    favoriteItem: string;     // 偏好道具
    aggressionLevel: number;  // 攻击性
    reactionTime: number;     // 反应速度
  };
  
  // 战斗历史
  lastEncounters: {
    outcome: 'win' | 'lose' | 'retreat';
    timestamp: number;
    strategies: string[];     // 使用的策略
    playerResponse: string[]; // 玩家应对方式
  }[];
  
  // 当前战术
  currentStrategy: {
    name: string;
    confidence: number;       // 信心程度 0-1
    effectiveness: number;    // 效果评估 0-1
    usedCount: number;        // 使用次数
  };
}

export interface TacticalDecision {
  type: 'attack' | 'defend' | 'maneuver' | 'cooperate' | 'taunt';
  target?: 'player' | 'ally' | 'position';
  priority: number;           // 优先级 0-1
  estimatedEffectiveness: number; // 预估效果 0-1
  riskLevel: number;          // 风险等级 0-1
}

export class EnhancedSisterAI {
  private personality: SisterPersonality;
  private memory: BattleMemory;
  private tacticalMood: 'cautious' | 'confident' | 'frustrated' | 'aggressive' = 'cautious';
  private lastUpdateTime = 0;
  private currentStrategyTimer = 0;
  private nearbyAllies: Array<{ distance: number; state: EmotionState; synchronized: boolean }> = [];
  
  constructor(
    public readonly enemyId: string,
    private adaptiveAI: EnhancedAdaptiveAI,
    personality?: Partial<SisterPersonality>
  ) {
    // 生成或继承个性
    this.personality = {
      aggressiveness: personality?.aggressiveness ?? Phaser.Math.FloatBetween(0.3, 0.8),
      stubbornness: personality?.stubbornness ?? Phaser.Math.FloatBetween(0.2, 0.6),
      intelligence: personality?.intelligence ?? Phaser.Math.FloatBetween(0.4, 0.9),
      attackStyle: personality?.attackStyle ?? this.randomAttackStyle(),
      movementPattern: personality?.movementPattern ?? this.randomMovementPattern(),
      mockeryLevel: personality?.mockeryLevel ?? Phaser.Math.FloatBetween(0.1, 0.7),
      cooperationTendency: personality?.cooperationTendency ?? Phaser.Math.FloatBetween(0.2, 0.7),
      adaptsToPlayer: personality?.adaptsToPlayer ?? true,
      learningRate: personality?.learningRate ?? Phaser.Math.FloatBetween(0.3, 0.8)
    };
    
    // 初始化记忆
    this.memory = {
      playerPatterns: {
        jumpFrequency: 0.5,
        attackAccuracy: 0.5,
        favoriteItem: 'none',
        aggressionLevel: 0.5,
        reactionTime: 250
      },
      lastEncounters: [],
      currentStrategy: {
        name: 'default_patrol',
        confidence: 0.5,
        effectiveness: 0.5,
        usedCount: 0
      }
    };
  }

  /** 更新AI决策 */
  update(
    deltaMs: number, 
    emotion: SisterEmotion, 
    playerDistance: number,
    playerVisible: boolean,
    playerState: {
      hp: number;
      maxHp: number;
      speed: number;
      facing: number;
      position: Phaser.Math.Vector2;
    }
  ): TacticalDecision | null {
    this.lastUpdateTime = Date.now();
    this.currentStrategyTimer += deltaMs;
    
    // 每5秒重新评估战略
    if (this.currentStrategyTimer >= 5000) {
      this.reassessStrategy(deltaMs, emotion, playerDistance, playerVisible, playerState);
      this.currentStrategyTimer = 0;
    }
    
    // 分析当前局势
    const situation = this.analyzeSituation(emotion, playerDistance, playerVisible, playerState);
    
    // 基于情况和个性做决策
    return this.makeDecision(situation, emotion);
  }
  
  /** 记录战斗结果用于学习 */
  recordEncounterOutcome(
    outcome: 'win' | 'lose' | 'retreat',
    playerActions: string[],
    strategyUsed: string
  ) {
    // 添加到战斗历史
    this.memory.lastEncounters.push({
      outcome,
      timestamp: Date.now(),
      strategies: [strategyUsed],
      playerResponse: playerActions
    });
    
    // 限制历史记录数量
    if (this.memory.lastEncounters.length > 10) {
      this.memory.lastEncounters.shift();
    }
    
    // 更新当前策略效果
    if (this.memory.currentStrategy.name === strategyUsed) {
      const adjustment = outcome === 'win' ? 0.1 : outcome === 'lose' ? -0.15 : -0.05;
      this.memory.currentStrategy.effectiveness = Phaser.Math.Clamp(
        this.memory.currentStrategy.effectiveness + adjustment,
        0.1, 1.0
      );
      this.memory.currentStrategy.usedCount++;
    }
    
    // 学习玩家模式
    if (this.personality.adaptsToPlayer) {
      this.learnPlayerPatterns(playerActions, outcome);
    }
  }
  
  /** 获取战术建议 */
  getTacticalAdvice(
    emotion: SisterEmotion,
    allies: Array<{ distance: number; state: EmotionState; canCommunicate: boolean }>,
    playerPosition: Phaser.Math.Vector2
  ): string[] {
    const advice: string[] = [];
    const currentEmotion = emotion.getState();
    
    // 基于情绪给出建议
    if (currentEmotion === 'wrath' && this.personality.aggressiveness > 0.7) {
      advice.push('集中火力攻击！');
    }
    
    // 协作建议
    const nearbyAllies = allies.filter(a => a.distance < 150 && a.canCommunicate);
    if (nearbyAllies.length > 0 && this.personality.cooperationTendency > 0.5) {
      advice.push('包围弟弟！');
      
      // 同步攻击建议
      const angryAllies = nearbyAllies.filter(a => 
        ['annoyed', 'wrath'].includes(a.state)
      );
      if (angryAllies.length >= 2) {
        advice.push('同时攻击！');
      }
    }
    
    // 基于玩家模式的反制建议
    if (this.memory.playerPatterns.jumpFrequency > 0.7) {
      advice.push('预判跳跃轨迹！');
    }
    
    if (this.memory.playerPatterns.attackAccuracy > 0.8) {
      advice.push('小心他的瞄准！');
    }
    
    return advice.slice(0, 3); // 最多3条建议
  }
  
  /** 生成个性化对话 */
  generatePersonalizedDialog(
    emotion: SisterEmotion,
    trigger: 'hit' | 'miss' | 'taunt' | 'cooperate' | 'victory' | 'defeat'
  ): string {
    const currentEmotion = emotion.getState();
    const baseConfig = EMOTION_TABLE[currentEmotion];
    
    // 基于个性的个性化对话
    let personalizedText = baseConfig.bubbleText || '';
    
    if (this.personality.mockeryLevel > 0.6 && trigger === 'miss') {
      const mockeryTexts = [
        '瞄不准就别乱打！',
        '弟弟还需要练习呢～',
        '这就是你的实力？',
        '再练十年吧！'
      ];
      personalizedText = mockeryTexts[Math.floor(Math.random() * mockeryTexts.length)];
    }
    
    if (this.personality.intelligence > 0.7 && trigger === 'cooperate') {
      const tacticalTexts = [
        '听我指挥！',
        '按计划行动！',
        '包抄他！',
        '火力压制！'
      ];
      personalizedText = tacticalTexts[Math.floor(Math.random() * tacticalTexts.length)];
    }
    
    // 基于学习经验的自定义对话
    if (this.personality.adaptsToPlayer && this.memory.playerPatterns.favoriteItem !== 'none') {
      if (trigger === 'taunt' && Math.random() < 0.3) {
        personalizedText = `又在用${this.memory.playerPatterns.favoriteItem}？我早就看穿了！`;
      }
    }
    
    return personalizedText;
  }

  private analyzeSituation(
    emotion: SisterEmotion,
    playerDistance: number,
    playerVisible: boolean,
    playerState: any
  ) {
    const difficulty = this.adaptiveAI.getCurrentDifficulty();
    
    return {
      threatLevel: this.calculateThreatLevel(playerDistance, playerState, difficulty),
      opportunityLevel: this.calculateOpportunityLevel(playerState, emotion),
      emotionalState: emotion.getState(),
      confidenceLevel: this.calculateConfidence(emotion, difficulty)
    };
  }
  
  private makeDecision(situation: any, emotion: SisterEmotion): TacticalDecision | null {
    const decisions: TacticalDecision[] = [];
    
    // 攻击决策
    if (situation.opportunityLevel > 0.6 && 
        ['patrol', 'tsundere', 'annoyed', 'wrath'].includes(situation.emotionalState)) {
      decisions.push({
        type: 'attack',
        target: 'player',
        priority: situation.opportunityLevel * this.personality.aggressiveness,
        estimatedEffectiveness: 0.7,
        riskLevel: 0.3
      });
    }
    
    // 防御/撤退决策
    if (situation.threatLevel > 0.7 && this.personality.intelligence > 0.5) {
      decisions.push({
        type: 'defend',
        priority: situation.threatLevel * (1 - this.personality.aggressiveness),
        estimatedEffectiveness: 0.6,
        riskLevel: 0.1
      });
    }
    
    // 协作决策
    if (this.nearbyAllies.length > 0 && this.personality.cooperationTendency > 0.6) {
      decisions.push({
        type: 'cooperate',
        priority: this.personality.cooperationTendency * 0.8,
        estimatedEffectiveness: 0.75,
        riskLevel: 0.2
      });
    }
    
    // 嘲讽决策
    if (situation.emotionalState === 'wrath' && this.personality.mockeryLevel > 0.5) {
      decisions.push({
        type: 'taunt',
        target: 'player',
        priority: this.personality.mockeryLevel * 0.6,
        estimatedEffectiveness: 0.4,
        riskLevel: 0.1
      });
    }
    
    // 选择最高优先级的决策
    if (decisions.length > 0) {
      decisions.sort((a, b) => b.priority - a.priority);
      return decisions[0];
    }
    
    return null;
  }
  
  private reassessStrategy(
    deltaMs: number, 
    emotion: SisterEmotion, 
    playerDistance: number,
    playerVisible: boolean,
    playerState: any
  ) {
    // 基于当前效果调整策略
    if (this.memory.currentStrategy.effectiveness < 0.3 && this.memory.currentStrategy.usedCount > 2) {
      this.switchStrategy();
    }
    
    // 情绪驱动的战略调整
    if (emotion.getState() === 'cry') {
      this.memory.currentStrategy = {
        name: 'retreat_and_recover',
        confidence: 0.8,
        effectiveness: 0.6,
        usedCount: 0
      };
    } else if (emotion.getState() === 'wrath' && this.personality.aggressiveness > 0.7) {
      this.memory.currentStrategy = {
        name: 'all_out_attack',
        confidence: 0.9,
        effectiveness: 0.7,
        usedCount: 0
      };
    }
  }
  
  private switchStrategy() {
    const strategies = [
      'flanking_maneuver',
      'hit_and_run',
      'coordinated_attack',
      'defensive_positioning',
      'psychological_warfare'
    ];
    
    // 选择未使用过的策略或效果较好的策略
    const availableStrategies = strategies.filter(s => s !== this.memory.currentStrategy.name);
    const newStrategy = availableStrategies[Math.floor(Math.random() * availableStrategies.length)];
    
    this.memory.currentStrategy = {
      name: newStrategy,
      confidence: 0.5,
      effectiveness: 0.5,
      usedCount: 0
    };
  }
  
  private learnPlayerPatterns(playerActions: string[], outcome: string) {
    // 分析玩家行为模式
    const jumpActions = playerActions.filter(a => a.includes('jump')).length;
    this.memory.playerPatterns.jumpFrequency = Phaser.Math.Clamp(
      this.memory.playerPatterns.jumpFrequency + (jumpActions > 0 ? 0.05 : -0.02),
      0.1, 1.0
    );
    
    // 更新最喜欢的道具
    const itemActions = playerActions.filter(a => a.includes('use_'));
    if (itemActions.length > 0) {
      const lastItem = itemActions[itemActions.length - 1].replace('use_', '');
      if (Math.random() < this.personality.learningRate) {
        this.memory.playerPatterns.favoriteItem = lastItem;
      }
    }
    
    // 学习成功反制
    if (outcome === 'win') {
      this.memory.currentStrategy.confidence = Math.min(1.0, this.memory.currentStrategy.confidence + 0.1);
    }
  }
  
  private calculateThreatLevel(playerDistance: number, playerState: any, difficulty: any): number {
    let threat = 0.3; // 基础威胁
    
    // 距离威胁
    if (playerDistance < 100) threat += 0.4;
    else if (playerDistance < 200) threat += 0.2;
    
    // 玩家状态威胁
    const playerHealthPercent = playerState.hp / playerState.maxHp;
    if (playerHealthPercent > 0.8) threat += 0.2;
    else if (playerHealthPercent > 0.5) threat += 0.1;
    
    // 玩家攻击性威胁
    if (playerState.speed > 200) threat += 0.1;
    
    return Math.min(1.0, threat);
  }
  
  private calculateOpportunityLevel(playerState: any, emotion: SisterEmotion): number {
    let opportunity = 0.3; // 基础机会
    
    // 玩家低血量时机会更大
    const playerHealthPercent = playerState.hp / playerState.maxHp;
    if (playerHealthPercent < 0.3) opportunity += 0.4;
    else if (playerHealthPercent < 0.6) opportunity += 0.2;
    
    // 情绪状态影响机会判断
    const currentEmotion = emotion.getState();
    if (currentEmotion === 'wrath') opportunity += 0.2;
    if (currentEmotion === 'cry') opportunity -= 0.3;
    
    return Math.min(1.0, Math.max(0.0, opportunity));
  }
  
  private calculateConfidence(emotion: SisterEmotion, difficulty: any): number {
    let confidence = this.memory.currentStrategy.confidence;
    
    // 情绪影响信心
    const currentEmotion = emotion.getState();
    if (currentEmotion === 'wrath') confidence += 0.2;
    else if (currentEmotion === 'cry') confidence -= 0.3;
    else if (currentEmotion === 'tsundere') confidence += 0.1;
    
    // 难度影响信心
    if (difficulty.difficultyLevel === 'frustrating') confidence -= 0.2;
    else if (difficulty.difficultyLevel === 'too_easy') confidence += 0.1;
    
    return Phaser.Math.Clamp(confidence, 0.1, 1.0);
  }
  
  private randomAttackStyle(): 'ranged' | 'melee' | 'balanced' {
    const rand = Math.random();
    if (rand < 0.3) return 'ranged';
    if (rand < 0.6) return 'melee';
    return 'balanced';
  }
  
  private randomMovementPattern(): 'aggressive' | 'defensive' | 'tactical' {
    const rand = Math.random();
    if (rand < 0.4) return 'aggressive';
    if (rand < 0.7) return 'defensive';
    return 'tactical';
  }
  
  /** 获取AI状态报告 */
  getStatusReport(): string {
    return `AI状态报告 (${this.enemyId}):
个性: 攻击性${(this.personality.aggressiveness * 100).toFixed(0)}% 智能${(this.personality.intelligence * 100).toFixed(0)}%
当前策略: ${this.memory.currentStrategy.name} (效果: ${(this.memory.currentStrategy.effectiveness * 100).toFixed(0)}%)
学习进度: ${this.memory.lastEncounters.length}场战斗记忆
玩家模式: 跳跃频率${(this.memory.playerPatterns.jumpFrequency * 100).toFixed(0)}%`;
  }
  
  // Getter方法
  getPersonality(): SisterPersonality { return { ...this.personality }; }
  getMemory(): BattleMemory { return JSON.parse(JSON.stringify(this.memory)); }
  getCurrentStrategy(): string { return this.memory.currentStrategy.name; }
  getTacticalMood(): string { return this.tacticalMood; }
}