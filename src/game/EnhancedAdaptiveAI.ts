/**
 * 增强版自适应AI系统（Wave 2.7+）
 *
 * 基于玩家实时表现进行动态难度调整，包含短期和长期策略
 * 新增：实时难度调节、表现分析、情绪反制策略
 */
import { SaveManager } from "./SaveManager";
import { analyzeBehavior } from "./AdaptiveAI";

export interface PerformanceMetrics {
  // 实时表现指标
  accuracy: number;          // 攻击命中率 0-1
  reactionTime: number;      // 平均反应时间（毫秒）
  comboConsistency: number;  // 连击稳定性 0-1
  perfectDodges: number;     // 完美闪避次数
  totalDodges: number;       // 总闪避尝试次数
  
  // 关卡表现
  timeSpent: number;         // 当前关卡耗时
  deathsThisLevel: number;   // 当前关卡死亡次数
  currentHp: number;         // 当前血量
  maxHp: number;             // 最大血量
  
  // 进度指标
  levelProgress: number;     // 关卡完成度 0-1
  enemiesDefeated: number;   // 击败敌人数量
  itemsUsed: number;         // 道具使用数量
}

export interface DynamicDifficulty {
  // 基础数值调节
  enemySpeedMultiplier: number;
  enemyHealthMultiplier: number;
  projectileFrequencyMultiplier: number;
  damageMultiplier: number;
  
  // 智能反制策略
  counterStrategies: {
    aggressivePursuit: boolean;    // 主动追击玩家
    predictiveAiming: boolean;      // 预判性攻击
    shieldFrequency: number;        // 敌人护盾频率 0-1
    ambushTactics: boolean;         // 埋伏战术
    cooperationTactics: boolean;    // 敌人协作
  };
  
  // 适应性和学习
  difficultyLevel: 'too_easy' | 'comfortable' | 'challenging' | 'frustrating';
  adjustmentTrend: 'increasing' | 'stable' | 'decreasing';
  
  // 特殊机制调节
  crisisWaveIntensity: number;     // 危机波强度 0.5-2.0
  itemDropRate: number;            // 道具掉落率 0.5-1.5
  perfectDodgeWindow: number;      // 完美闪避判定窗口 100-300ms
}

export interface EmotionalCounterStrategy {
  // 基于情绪的反制
  playerFrustrationLevel: number;  // 0-1
  playerConfidence: number;        // 0-1
  
  // 情绪化行为反制
  strategies: {
    mockeryMode: boolean;           // 嘲讽模式（当玩家表现优秀时）
    mercyMode: boolean;             // 仁慈模式（当玩家表现糟糕时）
    psychologicalWarfare: boolean;  // 心理战术（频繁死亡后）
    rewardMode: boolean;           // 奖励模式（长期表现良好）
  };
}

export class EnhancedAdaptiveAI {
  private baseBehavior = analyzeBehavior();
  private currentMetrics: PerformanceMetrics = this.getDefaultMetrics();
  private difficultyHistory: DynamicDifficulty[] = [];
  private adjustmentTimer = 0;
  private readonly UPDATE_INTERVAL = 5000; // 5秒更新一次
  
  private emotionalState: EmotionalCounterStrategy = {
    playerFrustrationLevel: 0,
    playerConfidence: 0.5,
    strategies: {
      mockeryMode: false,
      mercyMode: false,
      psychologicalWarfare: false,
      rewardMode: false
    }
  };

  constructor() {
    this.difficultyHistory.push(this.getDefaultDifficulty());
  }

  /** 更新实时表现指标 */
  updatePerformance(metrics: Partial<PerformanceMetrics>) {
    this.currentMetrics = { ...this.currentMetrics, ...metrics };
    
    this.adjustmentTimer += 16; // 假设60fps
    if (this.adjustmentTimer >= this.UPDATE_INTERVAL) {
      this.adjustDifficulty();
      this.adjustmentTimer = 0;
    }
  }

  /** 获取当前推荐难度设置 */
  getCurrentDifficulty(): DynamicDifficulty {
    return this.difficultyHistory[this.difficultyHistory.length - 1];
  }

  /** 根据表现调整难度 */
  private adjustDifficulty() {
    const current = this.getCurrentDifficulty();
    const metrics = this.currentMetrics;
    
    // 计算表现得分
    const performanceScore = this.calculatePerformanceScore();
    
    // 基于表现调整难度
    let newDifficulty = { ...current };
    
    if (performanceScore > 0.8) {
      // 玩家表现优秀，增加难度
      newDifficulty = this.increaseDifficulty(current, performanceScore);
      newDifficulty.difficultyLevel = 'challenging';
      newDifficulty.adjustmentTrend = 'increasing';
    } else if (performanceScore > 0.6) {
      // 玩家表现良好，轻微增加难度
      newDifficulty = this.slightlyIncreaseDifficulty(current, performanceScore);
      newDifficulty.difficultyLevel = 'comfortable';
      newDifficulty.adjustmentTrend = 'stable';
    } else if (performanceScore < 0.3) {
      // 玩家挣扎中，降低难度
      newDifficulty = this.decreaseDifficulty(current, performanceScore);
      newDifficulty.difficultyLevel = 'frustrating';
      newDifficulty.adjustmentTrend = 'decreasing';
    } else {
      // 难度适中
      newDifficulty.difficultyLevel = 'comfortable';
      newDifficulty.adjustmentTrend = 'stable';
    }
    
    // 更新情绪状态
    this.updateEmotionalState(performanceScore);
    
    // 应用情绪反制策略
    newDifficulty = this.applyEmotionalCounterStrategies(newDifficulty);
    
    // 确保数值在合理范围内
    newDifficulty = this.clampDifficulty(newDifficulty);
    
    this.difficultyHistory.push(newDifficulty);
    
    // 保持历史记录不过于冗长
    if (this.difficultyHistory.length > 50) {
      this.difficultyHistory.shift();
    }
  }

  /** 计算综合表现得分 */
  private calculatePerformanceScore(): number {
    const metrics = this.currentMetrics;
    
    // 准确率得分
    const accuracyScore = metrics.accuracy;
    
    // 反应时间得分（反应越快得分越高）
    const reactionScore = Math.max(0, 1 - (metrics.reactionTime - 150) / 300);
    
    // 连击表现得分
    const comboScore = metrics.comboConsistency;
    
    // 闪避技能得分
    const dodgeScore = metrics.totalDodges > 0 ? 
      Math.min(1, metrics.perfectDodges / metrics.totalDodges * 2) : 0.5;
    
    // 生存能力得分
    const survivalScore = metrics.currentHp / metrics.maxHp;
    
    // 权重计算综合得分
    const weights = {
      accuracy: 0.25,
      reaction: 0.2,
      combo: 0.2,
      dodge: 0.15,
      survival: 0.2
    };
    
    return (
      accuracyScore * weights.accuracy +
      reactionScore * weights.reaction +
      comboScore * weights.combo +
      dodgeScore * weights.dodge +
      survivalScore * weights.survival
    );
  }

  /** 增加难度 */
  private increaseDifficulty(current: DynamicDifficulty, score: number): DynamicDifficulty {
    const difficulty = { ...current };
    const increaseFactor = Math.min(0.15, (score - 0.8) * 0.3); // 最大增加15%
    
    difficulty.enemySpeedMultiplier = Math.min(1.8, current.enemySpeedMultiplier + increaseFactor * 0.3);
    difficulty.enemyHealthMultiplier = Math.min(1.5, current.enemyHealthMultiplier + increaseFactor * 0.2);
    difficulty.projectileFrequencyMultiplier = Math.min(1.6, current.projectileFrequencyMultiplier + increaseFactor * 0.25);
    difficulty.crisisWaveIntensity = Math.min(2.0, current.crisisWaveIntensity + increaseFactor * 0.2);
    
    // 解锁高级AI战术
    if (score > 0.9) {
      difficulty.counterStrategies.predictiveAiming = true;
      difficulty.counterStrategies.cooperationTactics = true;
    }
    
    return difficulty;
  }

  /** 轻微增加难度 */
  private slightlyIncreaseDifficulty(current: DynamicDifficulty, score: number): DynamicDifficulty {
    const difficulty = { ...current };
    const increaseFactor = (score - 0.6) * 0.1; // 轻微增加
    
    difficulty.enemySpeedMultiplier = Math.min(1.4, current.enemySpeedMultiplier + increaseFactor);
    difficulty.projectileFrequencyMultiplier = Math.min(1.3, current.projectileFrequencyMultiplier + increaseFactor * 0.8);
    difficulty.itemDropRate = Math.min(1.2, current.itemDropRate + increaseFactor * 0.05);
    
    return difficulty;
  }

  /** 降低难度 */
  private decreaseDifficulty(current: DynamicDifficulty, score: number): DynamicDifficulty {
    const difficulty = { ...current };
    const decreaseFactor = Math.max(-0.1, (0.3 - score) * 0.2); // 最大降低10%
    
    difficulty.enemySpeedMultiplier = Math.max(0.7, current.enemySpeedMultiplier + decreaseFactor);
    difficulty.enemyHealthMultiplier = Math.max(0.8, current.enemyHealthMultiplier + decreaseFactor);
    difficulty.projectileFrequencyMultiplier = Math.max(0.6, current.projectileFrequencyMultiplier + decreaseFactor);
    difficulty.crisisWaveIntensity = Math.max(0.5, current.crisisWaveIntensity + decreaseFactor);
    
    // 增加道具掉落率帮助玩家
    difficulty.itemDropRate = Math.min(1.5, current.itemDropRate - decreaseFactor * 2);
    
    // 扩大完美闪避窗口
    difficulty.perfectDodgeWindow = Math.min(300, current.perfectDodgeWindow - decreaseFactor * 50);
    
    return difficulty;
  }

  /** 更新情绪状态 */
  private updateEmotionalState(performanceScore: number) {
    const metrics = this.currentMetrics;
    
    // 计算挫败感
    this.emotionalState.playerFrustrationLevel = Math.min(1, 
      (metrics.deathsThisLevel * 0.3) + 
      ((1 - performanceScore) * 0.4) + 
      (metrics.timeSpent > 300 ? 0.3 : 0) // 长时间消耗增加挫败感
    );
    
    // 计算自信心
    this.emotionalState.playerConfidence = Math.max(0, 
      performanceScore * 0.7 + 
      (metrics.comboConsistency * 0.3)
    );
  }

  /** 应用情绪反制策略 */
  private applyEmotionalCounterStrategies(difficulty: DynamicDifficulty): DynamicDifficulty {
    const emotional = this.emotionalState;
    const strategies = emotional.strategies;
    
    // 重置策略
    strategies.mockeryMode = false;
    strategies.mercyMode = false;
    strategies.psychologicalWarfare = false;
    strategies.rewardMode = false;
    
    if (emotional.playerConfidence > 0.8) {
      // 玩家过于自信，开始嘲讽
      strategies.mockeryMode = true;
      difficulty.damageMultiplier = Math.min(1.3, difficulty.damageMultiplier * 1.1);
    }
    
    if (emotional.playerFrustrationLevel > 0.7) {
      // 玩家很挫败，展现仁慈
      strategies.mercyMode = true;
      difficulty.enemySpeedMultiplier *= 0.9;
      difficulty.itemDropRate *= 1.2;
    }
    
    if (emotional.playerFrustrationLevel > 0.5 && this.currentMetrics.deathsThisLevel > 3) {
      // 心理战术
      strategies.psychologicalWarfare = true;
      difficulty.counterStrategies.ambushTactics = true;
    }
    
    if (this.calculatePerformanceScore() > 0.7 && this.currentMetrics.timeSpent > 60) {
      // 长期良好表现，给予奖励
      strategies.rewardMode = true;
      difficulty.itemDropRate *= 1.1;
    }
    
    return difficulty;
  }

  /** 确保难度数值在合理范围内 */
  private clampDifficulty(difficulty: DynamicDifficulty): DynamicDifficulty {
    return {
      ...difficulty,
      enemySpeedMultiplier: Phaser.Math.Clamp(difficulty.enemySpeedMultiplier, 0.5, 2.0),
      enemyHealthMultiplier: Phaser.Math.Clamp(difficulty.enemyHealthMultiplier, 0.5, 2.0),
      projectileFrequencyMultiplier: Phaser.Math.Clamp(difficulty.projectileFrequencyMultiplier, 0.4, 2.0),
      damageMultiplier: Phaser.Math.Clamp(difficulty.damageMultiplier, 0.5, 1.5),
      crisisWaveIntensity: Phaser.Math.Clamp(difficulty.crisisWaveIntensity, 0.5, 2.0),
      itemDropRate: Phaser.Math.Clamp(difficulty.itemDropRate, 0.5, 1.5),
      perfectDodgeWindow: Phaser.Math.Clamp(difficulty.perfectDodgeWindow, 100, 350),
      counterStrategies: {
        ...difficulty.counterStrategies,
        shieldFrequency: Phaser.Math.Clamp(difficulty.counterStrategies.shieldFrequency, 0, 1)
      }
    };
  }

  /** 汇报AI决策 */
  getAIDecisionReport(): string {
    const difficulty = this.getCurrentDifficulty();
    const emotional = this.emotionalState;
    const metrics = this.currentMetrics;
    
    return `AI决策分析:
难度等级: ${difficulty.difficultyLevel}
趋势: ${difficulty.adjustmentTrend}
表现得分: ${this.calculatePerformanceScore().toFixed(2)}
挫败感: ${emotional.playerFrustrationLevel.toFixed(2)}
自信心: ${emotional.playerConfidence.toFixed(2)}

当前调节:
敌人速度: ${difficulty.enemySpeedMultiplier.toFixed(2)}x
投射物频率: ${difficulty.projectileFrequencyMultiplier.toFixed(2)}x
道具掉落: ${difficulty.itemDropRate.toFixed(2)}x
完美闪避窗口: ${difficulty.perfectDodgeWindow}ms

活跃策略: ${Object.entries(emotional.strategies)
  .filter(([_, active]) => active)
  .map(([name, _]) => name).join(', ') || '无'}`;
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      accuracy: 0.5,
      reactionTime: 250,
      comboConsistency: 0.5,
      perfectDodges: 0,
      totalDodges: 0,
      timeSpent: 0,
      deathsThisLevel: 0,
      currentHp: 3,
      maxHp: 3,
      levelProgress: 0,
      enemiesDefeated: 0,
      itemsUsed: 0
    };
  }

  private getDefaultDifficulty(): DynamicDifficulty {
    return {
      enemySpeedMultiplier: 1.0,
      enemyHealthMultiplier: 1.0,
      projectileFrequencyMultiplier: 1.0,
      damageMultiplier: 1.0,
      counterStrategies: {
        aggressivePursuit: false,
        predictiveAiming: false,
        shieldFrequency: 0,
        ambushTactics: false,
        cooperationTactics: false
      },
      difficultyLevel: 'comfortable',
      adjustmentTrend: 'stable',
      crisisWaveIntensity: 1.0,
      itemDropRate: 1.0,
      perfectDodgeWindow: 200
    };
  }

  /** 重置关卡状态 */
  resetLevel() {
    this.currentMetrics = {
      ...this.getDefaultMetrics(),
      maxHp: this.currentMetrics.maxHp // 保持最大血量
    };
    this.adjustmentTimer = 0;
  }
}