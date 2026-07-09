/**
 * 完美闪避系统
 *
 * 当玩家在攻击即将命中的瞬间（危险窗口期内）进行闪避操作时，
 * 触发完美闪避奖励：短暂无敌、时间减速、分数奖励
 */
import Phaser from "phaser";

export interface PerfectDodgeConfig {
  // 完美闪避判定窗口（毫秒）
  dodgeWindowMs: number;
  // 完美闪避成功后奖励的无敌时间
  invincibilityRewardMs: number;
  // 完美闪避后的慢动作持续时间
  slowMotionDuration: number;
  // 完美闪避后的慢动作倍率
  slowMotionRate: number;
  // 完美闪避的分数奖励
  scoreBonus: number;
}

const DEFAULT_CONFIG: PerfectDodgeConfig = {
  dodgeWindowMs: 200,        // 200ms窗口期
  invincibilityRewardMs: 1500, // 1.5秒无敌
  slowMotionDuration: 600,    // 600ms慢动作
  slowMotionRate: 0.3,        // 30%速度
  scoreBonus: 50,            // 50分奖励
};

export interface ThreatInfo {
  source: Phaser.GameObjects.GameObject;
  type: 'enemy' | 'projectile' | 'hazard';
  dangerTime: number; // 威胁出现的时间
  hitTime: number;    // 预计命中时间
  active: boolean;    // 威胁是否还在活跃
}

export class PerfectDodgeSystem {
  private config: PerfectDodgeConfig;
  private threats: ThreatInfo[] = [];
  private perfectDodges: number = 0;
  private totalDodgeAttempts: number = 0;
  
  // 状态追踪
  private isSlowMotionActive = false;
  private slowMotionTimer = 0;
  private perfectDodgeActive = false;
  
  constructor(config: Partial<PerfectDodgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** 添加威胁（敌人攻击、投射物等） */
  addThreat(
    source: Phaser.GameObjects.GameObject,
    type: 'enemy' | 'projectile' | 'hazard',
    dangerTime: number,
    estimatedHitTime: number
  ) {
    // 移除过期的威胁
    this.cleanupExpiredThreats();
    
    const threat: ThreatInfo = {
      source,
      type,
      dangerTime,
      hitTime: estimatedHitTime,
      active: true
    };
    
    this.threats.push(threat);
    
    // 在预计命中时间自动移除威胁
    setTimeout(() => {
      this.removeThreat(source);
    }, estimatedHitTime - dangerTime + 50);
  }

  /** 移除威胁 */
  removeThreat(source: Phaser.GameObjects.GameObject) {
    const index = this.threats.findIndex(t => t.source === source);
    if (index >= 0) {
      this.threats[index].active = false;
      this.threats.splice(index, 1);
    }
  }

  /** 检查完美闪避尝试 */
  checkPerfectDodge(
    playerAction: { isDodging: boolean; dodgeTime: number; position: Phaser.Math.Vector2 },
    currentTime: number
  ): boolean {
    if (!playerAction.isDodging) return false;
    
    this.totalDodgeAttempts++;
    
    // 查找在完美闪避窗口内的威胁
    const activeThreats = this.threats.filter(threat => 
      threat.active && 
      Math.abs(threat.hitTime - playerAction.dodgeTime) <= this.config.dodgeWindowMs
    );
    
    if (activeThreats.length > 0) {
      // 完美闪避成功！
      this.triggerPerfectDodge(playerAction.dodgeTime);
      
      // 移除被完美闪避的威胁
      activeThreats.forEach(threat => this.removeThreat(threat.source));
      
      this.perfectDodges++;
      return true;
    }
    
    return false;
  }

  /** 触发完美闪避效果 */
  private triggerPerfectDodge(dodgeTime: number) {
    this.perfectDodgeActive = true;
    
    // 触发慢动作效果的事件
    if (typeof window !== 'undefined') {
      (window as any).dispatchEvent(new CustomEvent('perfectDodgeSuccess', {
        detail: {
          dodgeTime,
          invincibilityMs: this.config.invincibilityRewardMs,
          slowMotionMs: this.config.slowMotionDuration,
          scoreBonus: this.config.scoreBonus
        }
      }));
    }
  }

  /** 更新系统 */
  update(deltaMs: number, currentTime: number) {
    // 清理过期威胁
    this.cleanupExpiredThreats(currentTime);
    
    // 更新慢动作计时器
    if (this.isSlowMotionActive) {
      this.slowMotionTimer -= deltaMs;
      if (this.slowMotionTimer <= 0) {
        this.isSlowMotionActive = false;
        // 恢复正常速度的事件
        if (typeof window !== 'undefined') {
          (window as any).dispatchEvent(new CustomEvent('perfectDodgeEnd'));
        }
      }
    }
  }

  /** 清理过期威胁 */
  private cleanupExpiredThreats(currentTime?: number) {
    const now = currentTime || Date.now();
    this.threats = this.threats.filter(threat => 
      threat.active && threat.hitTime > now - 1000 // 保留最近1秒内的威胁
    );
  }

  /** 获取统计信息 */
  getStats() {
    return {
      perfectDodges: this.perfectDodges,
      totalAttempts: this.totalDodgeAttempts,
      successRate: this.totalDodgeAttempts > 0 ? this.perfectDodges / this.totalDodgeAttempts : 0
    };
  }

  /** 重置系统 */
  reset() {
    this.threats = [];
    this.perfectDodges = 0;
    this.totalDodgeAttempts = 0;
    this.isSlowMotionActive = false;
    this.slowMotionTimer = 0;
    this.perfectDodgeActive = false;
  }

  /** 获取配置 */
  getConfig(): PerfectDodgeConfig {
    return { ...this.config };
  }

  /** 检查是否处于完美闪避状态 */
  isPerfectDodgeActive(): boolean {
    return this.perfectDodgeActive;
  }

  /** 获取当前威胁数量 */
  getThreatCount(): number {
    return this.threats.filter(t => t.active).length;
  }
}

// 全局实例导出
export const perfectDodgeSystem = new PerfectDodgeSystem();