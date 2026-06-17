import Phaser from "phaser";
import { LEVELS } from "./levelData";
import type { ActiveItem, EnemyKind, EnemySpawn, ItemConfig, LevelConfig, RectSpec } from "./types";

type PlayerState = {
  hp: number;
  coins: number;
  defeatedEnemies: number;
  checkpoint: Phaser.Math.Vector2;
  invincibleUntil: number;
  activeItem?: ActiveItem;
  bubbleShield: boolean;
  starUntil: number;
  bouncyUntil: number;
  flyingUntil: number;
  giantUntil: number;
  facing: 1 | -1;
  locked: boolean;
};

type CharacterVisual = {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  width: number;
  height: number;
};

type EnemyLane = {
  left: number;
  right: number;
  top: number;
  kind: "ground" | "platform";
};

type ArcadeBodyWithPrev = Phaser.Physics.Arcade.Body & {
  prev?: Phaser.Math.Vector2;
};

type EnemyThrowProfile = {
  key: string;
  cooldown: number;
  windupMs: number;
  speedX: number;
  speedY: number;
  gravity: boolean;
  range: number;
  maxYDiff: number;
  damage: number;
  balloonDrop?: boolean;
};

const PLAYER_SPEED = 255;
const JUMP_VELOCITY = -560;
const COYOTE_MS = 120;
const JUMP_BUFFER_MS = 120;
const INVINCIBLE_MS = 1500;
const PROJECTILE_SPEED = 520;
const ENEMY_CHASE_RANGE = 620;
const PICKUP_DISPLAY_MAX = 56;
const BLOCK_PICKUP_ROLL_SPEED = 168;
const BLOCK_PICKUP_MIN_LIFE_MS = 5000;
const BLOCK_PICKUP_MAX_LIFE_MS = 10000;
const BLOCK_PICKUP_OFFSCREEN_MARGIN = 200;

const CHAR_HEIGHT = {
  player: 128,
  playerGiant: 172,
  playerCry: 114,
  sister: 128,
  boss: 132
} as const;

/** Reference display sizes used to scale physics body boxes when aspect-fit width changes. */
const CHAR_DISPLAY_REF = {
  player: { w: 72, h: 128 },
  playerGiant: { w: 96, h: 172 },
  playerCry: { w: 94, h: 114 },
  sister: { w: 74, h: 128 },
  boss: { w: 100, h: 132 }
} as const;

const CHAR_BODY = {
  player: { w: 36, h: 104, bottom: 6 },
  playerGiant: { w: 48, h: 138, bottom: 8 },
  playerCry: { w: 44, h: 96, bottom: 5 },
  sister: { w: 38, h: 102, bottom: 6 },
  boss: { w: 56, h: 110, bottom: 8 }
} as const;

export class GameScene extends Phaser.Scene {
  private levelIndex = 0;
  private level!: LevelConfig;
  private player!: Phaser.Physics.Arcade.Image;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private questionBlocks!: Phaser.Physics.Arcade.StaticGroup;
  private pickups!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.StaticGroup;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private goal!: Phaser.Physics.Arcade.Image;
  private checkpoint!: Phaser.Physics.Arcade.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<"a" | "d" | "s" | "j" | "space" | "esc", Phaser.Input.Keyboard.Key>;
  private state!: PlayerState;
  private itemPool: ItemConfig[] = [];
  private hud!: {
    hearts: Phaser.GameObjects.Text;
    coins: Phaser.GameObjects.Text;
    itemText: Phaser.GameObjects.Text;
    itemIcon: Phaser.GameObjects.Image;
    level: Phaser.GameObjects.Text;
    hint: Phaser.GameObjects.Text;
  };
  private touchMove = 0;
  private touchJump = false;
  private touchUse = false;
  private bossCleared = false;
  private playerBaseScaleX = 1;
  private playerBaseScaleY = 1;
  private lastDustAt = 0;
  private lastGroundedAt = 0;
  private jumpBufferUntil = 0;
  private prevTouchJump = false;
  private playerShadow?: Phaser.GameObjects.Image;
  private playerVisual?: CharacterVisual;
  private playerVisualMode: "gameplay" | "cry" = "gameplay";
  private bubbleShieldVisual?: Phaser.GameObjects.Arc;
  private questionHintActive = false;

  constructor() {
    super("GameScene");
  }

  init(data: { levelIndex?: number }) {
    this.levelIndex = Phaser.Math.Clamp(data.levelIndex ?? 0, 0, LEVELS.length - 1);
    this.level = LEVELS[this.levelIndex];
  }

  create() {
    this.sound.stopAll();
    this.sound.play(this.level.enemies.some((enemy) => enemy.kind === "sister_boss") ? "bgm_fight_loop" : "bgm_gameplay_loop", {
      loop: true,
      volume: 0.48
    });
    this.physics.world.gravity.y = this.level.gravityY ?? 1200;
    this.physics.world.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    this.disablePhysicsDebug();
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);

    this.itemPool = this.registry.get("items") as ItemConfig[];
    this.state = {
      hp: 3,
      coins: 0,
      defeatedEnemies: 0,
      checkpoint: new Phaser.Math.Vector2(130, 680),
      invincibleUntil: 0,
      bubbleShield: false,
      starUntil: 0,
      bouncyUntil: 0,
      flyingUntil: 0,
      giantUntil: 0,
      facing: 1,
      locked: false
    };
    this.bossCleared = false;
    this.lastGroundedAt = 0;
    this.jumpBufferUntil = 0;
    this.prevTouchJump = false;

    this.createTextures();
    this.createItemDisplayTextures();
    this.createWorld();
    this.createPlayer();
    this.createControls();
    this.createHud();
    this.createTouchControls();
    this.registerPhysics();
    this.questionHintActive = this.levelIndex === 0 && this.level.questionBlocks.length > 0;
    this.showToast(`${this.level.name} · ${this.level.theme}`, 2600);
  }

  update(time: number, delta: number) {
    if (!this.player?.body || this.state.locked) return;

    this.updatePlayer(time);
    this.updateCoinMagnet();
    this.updateEnemies(time);
    this.resolvePlayerEnemyVisualOverlap();
    this.updateProjectiles();
    this.updateTimedItems(delta, time);
    this.updateCharacterPose(time);
    this.updateBubbleShieldVisual(time);
    this.updateBlockPickups(time);
    this.updateQuestionBlockHits();
    this.updateQuestionHint();
    this.updateHud(time);
    this.storeBodyPreviousPositions();
  }

  private createTextures() {
    const makeRect = (key: string, width: number, height: number, color: number, stroke = 0xffffff) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, width, height, 8);
      g.lineStyle(3, stroke, 0.55);
      g.strokeRoundedRect(1.5, 1.5, width - 3, height - 3, 8);
      g.generateTexture(key, width, height);
      g.destroy();
    };

    makeRect("platform:ground", 64, 32, 0x7ec850, 0xf9f5c7);
    makeRect("platform:wood", 64, 32, 0xb97845, 0xf6d19d);
    makeRect("platform:bounce", 64, 32, 0xff8fc8, 0xffffff);
    makeRect("platform:ice", 64, 32, 0x7edcf4, 0xffffff);
    makeRect("question:block", 48, 48, 0xffca3a, 0x7a4c00);
    makeRect("projectile:fire", 30, 24, 0xff6d2d, 0xfff0a6);
    makeRect("projectile:ice", 34, 24, 0x65ddff, 0xffffff);
    makeRect("projectile:boom", 42, 32, 0xffdf4e, 0xff7052);
    makeRect("projectile:wave", 44, 24, 0xd589ff, 0xffffff);
    makeRect("projectile:toy", 28, 28, 0xff8f5a, 0xfff2b8);
    makeRect("dust:puff", 20, 10, 0xffffff, 0xffffff);

    if (!this.textures.exists("shadow:oval")) {
      const g = this.add.graphics();
      g.fillStyle(0x163117, 0.34);
      g.fillEllipse(42, 12, 84, 24);
      g.generateTexture("shadow:oval", 84, 24);
      g.destroy();
    }

    if (!this.textures.exists("physics:hidden")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.001);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture("physics:hidden", 4, 4);
      g.destroy();
    }

    if (!this.textures.exists("stomp:star")) {
      const g = this.add.graphics();
      g.fillStyle(0xfff05a, 1);
      g.fillTriangle(16, 0, 20, 11, 32, 11);
      g.fillTriangle(32, 11, 22, 18, 26, 31);
      g.fillTriangle(26, 31, 16, 23, 6, 31);
      g.fillTriangle(6, 31, 10, 18, 0, 11);
      g.fillTriangle(0, 11, 12, 11, 16, 0);
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeCircle(16, 16, 12);
      g.generateTexture("stomp:star", 32, 32);
      g.destroy();
    }

    if (!this.textures.exists("hit:spark")) {
      const g = this.add.graphics();
      g.lineStyle(4, 0xffffff, 0.9);
      for (let i = 0; i < 8; i += 1) {
        const a = (Math.PI * 2 * i) / 8;
        g.lineBetween(24, 24, 24 + Math.cos(a) * 24, 24 + Math.sin(a) * 24);
      }
      g.fillStyle(0xfff07a, 1).fillCircle(24, 24, 8);
      g.generateTexture("hit:spark", 48, 48);
      g.destroy();
    }

    if (!this.textures.exists("coin")) {
      const g = this.add.graphics();
      g.fillStyle(0xffd34d, 1);
      g.fillCircle(18, 18, 17);
      g.lineStyle(3, 0xfff6a6, 1);
      g.strokeCircle(18, 18, 14);
      g.generateTexture("coin", 36, 36);
      g.destroy();
    }

    if (!this.textures.exists("flag")) {
      const g = this.add.graphics();
      g.fillStyle(0x5c3b26, 1).fillRect(8, 0, 8, 120);
      g.fillStyle(0xff5678, 1).fillTriangle(16, 10, 92, 38, 16, 66);
      g.lineStyle(3, 0xffffff, 0.8).strokeTriangle(16, 10, 92, 38, 16, 66);
      g.generateTexture("flag", 100, 120);
      g.destroy();
    }

    if (!this.textures.exists("checkpoint")) {
      const g = this.add.graphics();
      g.fillStyle(0x4f6bdc, 1).fillRect(6, 0, 8, 94);
      g.fillStyle(0xffe15f, 1).fillTriangle(14, 8, 78, 30, 14, 52);
      g.generateTexture("checkpoint", 84, 96);
      g.destroy();
    }
  }

  private createItemDisplayTextures() {
    this.itemPool.forEach((item) => {
      this.createCleanItemTexture(`item:${item.id}`, `item-display:${item.id}`, 18);
      this.createCleanItemTexture(`hud:${item.id}`, `hud-display:${item.id}`, 8);
      this.createRoundItemTexture(item.id);
    });
  }

  private createRoundItemTexture(itemId: string) {
    const roundKey = `pickup-round:${itemId}`;
    if (this.textures.exists(roundKey)) return;

    const sourceKey = this.textures.exists(`item-display:${itemId}`) ? `item-display:${itemId}` : `item:${itemId}`;
    if (!this.textures.exists(sourceKey)) return;

    const size = 56;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return;

    const center = size / 2;
    const gradient = context.createRadialGradient(center - 6, center - 8, 4, center, center, center - 2);
    gradient.addColorStop(0, "#fff8d8");
    gradient.addColorStop(0.55, "#ffd34d");
    gradient.addColorStop(1, "#e8a824");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(center, center, center - 3, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = "#fff6c8";
    context.stroke();

    const source = this.textures.get(sourceKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const sw = "naturalWidth" in source ? source.naturalWidth : source.width;
    const sh = "naturalHeight" in source ? source.naturalHeight : source.height;
    const iconSize = 30;
    context.drawImage(source, center - iconSize / 2, center - iconSize / 2, iconSize, iconSize);

    const output = this.textures.createCanvas(roundKey, size, size);
    if (!output) return;
    output.draw(0, 0, canvas);
    output.refresh();
  }

  private createCleanItemTexture(sourceKey: string, outputKey: string, padding: number) {
    if (this.textures.exists(outputKey) || !this.textures.exists(sourceKey)) return;

    const source = this.textures.get(sourceKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const width = "naturalWidth" in source ? source.naturalWidth : source.width;
    const height = "naturalHeight" in source ? source.naturalHeight : source.height;
    if (!width || !height) return;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    context.drawImage(source, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    const visited = new Uint8Array(width * height);
    const queue: number[] = [];

    const isBackgroundCandidate = (pixelIndex: number) => {
      const offset = pixelIndex * 4;
      const alpha = data[offset + 3];
      if (alpha < 18) return true;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      return red > 236 && green > 236 && blue > 236;
    };

    const enqueueEdge = (x: number, y: number) => {
      const index = y * width + x;
      if (visited[index] || !isBackgroundCandidate(index)) return;
      visited[index] = 1;
      queue.push(index);
    };

    for (let x = 0; x < width; x += 1) {
      enqueueEdge(x, 0);
      enqueueEdge(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
      enqueueEdge(0, y);
      enqueueEdge(width - 1, y);
    }

    while (queue.length > 0) {
      const index = queue.pop()!;
      const x = index % width;
      const y = Math.floor(index / width);
      data[index * 4 + 3] = 0;

      if (x > 0) enqueueEdge(x - 1, y);
      if (x < width - 1) enqueueEdge(x + 1, y);
      if (y > 0) enqueueEdge(x, y - 1);
      if (y < height - 1) enqueueEdge(x, y + 1);
    }

    for (let index = 0; index < width * height; index += 1) {
      const offset = index * 4;
      if (data[offset + 3] <= 18) {
        data[offset + 3] = 0;
        continue;
      }
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const brightest = Math.max(red, green, blue);
      const darkest = Math.min(red, green, blue);
      if (brightest > 246 && darkest > 238 && brightest - darkest < 20) {
        data[offset + 3] = 0;
      }
    }

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha <= 18) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) return;

    context.putImageData(imageData, 0, 0);
    const contentWidth = maxX - minX + 1;
    const contentHeight = maxY - minY + 1;
    const output = this.textures.createCanvas(outputKey, contentWidth + padding * 2, contentHeight + padding * 2);
    if (!output) return;

    const outputContext = output.getContext();
    outputContext.clearRect(0, 0, output.width, output.height);
    outputContext.drawImage(canvas, minX, minY, contentWidth, contentHeight, padding, padding, contentWidth, contentHeight);
    output.refresh();
  }

  private createWorld() {
    const bg = this.add.image(0, 0, this.level.backgroundKey).setOrigin(0, 0);
    bg.setDisplaySize(this.level.worldWidth, this.level.worldHeight);
    bg.setScrollFactor(0.82, 0.2);
    this.add.rectangle(this.level.worldWidth / 2, 0, this.level.worldWidth, 240, 0x8dd8ff, 0.28).setOrigin(0.5, 0);

    this.platforms = this.physics.add.staticGroup();
    this.level.platforms.forEach((platform) => this.addPlatform(platform));

    this.coins = this.physics.add.staticGroup();
    this.level.coinArcs.forEach((arc) => {
      for (let i = 0; i < arc.count; i += 1) {
        const x = arc.x + i * arc.gap;
        const arcY = arc.y - Math.sin((i / Math.max(1, arc.count - 1)) * Math.PI) * 28;
        const y = this.resolveCoinY(x, arcY);
        const coin = this.coins.create(x, y, "coin") as Phaser.Physics.Arcade.Image;
        coin.setData("collected", false);
        coin.setDisplaySize(38, 38);
        coin.refreshBody();
        const body = coin.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(62, 62);
        body.updateFromGameObject();
      }
    });

    this.questionBlocks = this.physics.add.staticGroup();
    this.level.questionBlocks.forEach((block) => {
      const question = this.questionBlocks.create(block.x, block.y, "question:block") as Phaser.Physics.Arcade.Image;
      question.setData("used", false);
      question.setDisplaySize(48, 48);
      const body = question.body as Phaser.Physics.Arcade.StaticBody;
      // Upper bump hitbox only — keeps walk path clear under floating block.
      body.setSize(44, 28);
      body.setOffset(2, 2);
      body.debugShowBody = false;
    });

    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });
    this.level.looseItems.forEach((item) => this.spawnPickup(item.id, item.x, item.y));

    this.checkpoint = this.physics.add.staticImage(this.level.checkpoint.x, this.level.checkpoint.y, "checkpoint");
    this.checkpoint.setData("active", false);
    this.goal = this.physics.add.staticImage(this.level.goal.x, this.level.goal.y, "flag");
  }

  private resolveCoinY(x: number, desiredY: number) {
    const coinRadius = 19;
    const visualGap = 12;
    return this.level.platforms.reduce((resolvedY, platform) => {
      const left = platform.x - platform.width / 2 - coinRadius;
      const right = platform.x + platform.width / 2 + coinRadius;
      if (x < left || x > right) return resolvedY;

      const platformTop = platform.y - platform.height / 2;
      const platformBottom = platform.y + platform.height / 2;
      const coinBottom = resolvedY + coinRadius;
      const isInsidePlatformBand = coinBottom > platformTop - visualGap && resolvedY < platformBottom + coinRadius;
      if (!isInsidePlatformBand) return resolvedY;

      return Math.min(resolvedY, platformTop - coinRadius - visualGap);
    }, desiredY);
  }

  private addPlatform(spec: RectSpec) {
    const key = spec.kind === "bounce" ? "platform:bounce" : spec.kind === "ice" ? "platform:ice" : spec.kind === "ground" ? "platform:ground" : "platform:wood";
    const platform = this.platforms.create(spec.x, spec.y, key) as Phaser.Physics.Arcade.Image;
    platform.setDisplaySize(spec.width, spec.height);
    platform.setDepth(spec.kind === "ground" ? 4 : 6);
    platform.setData("kind", spec.kind ?? "platform");
    platform.refreshBody();
  }

  private hidePhysicsSprite(sprite: Phaser.Physics.Arcade.Image, keepTexture = false) {
    const width = sprite.displayWidth;
    const height = sprite.displayHeight;
    if (!keepTexture) {
      sprite.setTexture("physics:hidden");
    }
    sprite.setDisplaySize(width, height);
    sprite.setVisible(false);
    sprite.setAlpha(0);
  }

  private getAspectDisplaySize(textureKey: string, targetHeight: number): { w: number; h: number } {
    const frame = this.textures.getFrame(textureKey);
    const texW = frame?.width ?? targetHeight;
    const texH = frame?.height ?? targetHeight;
    if (texW <= 0 || texH <= 0) {
      return { w: targetHeight, h: targetHeight };
    }
    const h = targetHeight;
    const w = Math.round(h * (texW / texH));
    return { w, h };
  }

  private scaleBodyBox(
    box: { w: number; h: number; bottom: number },
    refDisplay: { w: number; h: number },
    display: { w: number; h: number }
  ) {
    return {
      w: Math.round(box.w * (display.w / refDisplay.w)),
      h: Math.round(box.h * (display.h / refDisplay.h)),
      bottom: Math.round(box.bottom * (display.h / refDisplay.h))
    };
  }

  private createPlayer() {
    const { w, h } = this.getAspectDisplaySize("brother_player", CHAR_HEIGHT.player);
    this.playerShadow = this.add
      .image(this.state.checkpoint.x, this.state.checkpoint.y + h * 0.5, "shadow:oval")
      .setDepth(6)
      .setAlpha(0.42);
    this.player = this.physics.add.image(this.state.checkpoint.x, this.state.checkpoint.y, "brother_player");
    this.player.setDisplaySize(w, h);
    this.playerBaseScaleX = this.player.scaleX;
    this.playerBaseScaleY = this.player.scaleY;
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setDragX(1300);
    this.player.setMaxVelocity(520, 950);
    this.setFeetAlignedBodyBox(
      this.player,
      this.scaleBodyBox(CHAR_BODY.player, CHAR_DISPLAY_REF.player, { w, h })
    );
    this.playerVisualMode = "gameplay";
    this.rebuildPlayerVisual();
    this.hidePhysicsSprite(this.player, true);
    this.syncPlayerBodyPosition();
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14, -120, 40);
  }

  private syncPlayerBodyPosition() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.reset(this.player.x, this.player.y);
    body.updateFromGameObject();
  }

  private getPlayerVisualSize() {
    if (this.time.now < this.state.giantUntil) {
      return this.getAspectDisplaySize("brother_player", CHAR_HEIGHT.playerGiant);
    }
    return this.getAspectDisplaySize("brother_player", CHAR_HEIGHT.player);
  }

  private rebuildPlayerVisual() {
    this.playerVisual?.container.destroy();
    const { w: width, h: height } = this.getPlayerVisualSize();
    this.playerVisual = this.createCharacterVisual("brother_player", width, height, 10);
    this.playerVisual.container.setPosition(this.player.x, this.player.y);
    if (this.playerVisualMode === "gameplay") {
      this.hidePhysicsSprite(this.player, true);
      this.resetPlayerBodyBox();
      this.syncPlayerBodyPosition();
    }
  }

  private showPlayerCryVisual() {
    this.playerVisualMode = "cry";
    this.playerVisual?.container.setVisible(false);
    this.player.setTexture("brother_cry_defeat");
    const cryDisplay = this.getAspectDisplaySize("brother_cry_defeat", CHAR_HEIGHT.playerCry);
    this.player.setDisplaySize(cryDisplay.w, cryDisplay.h);
    this.player.setVisible(true);
    this.player.setAlpha(1);
    this.player.setAngle(0);
    this.player.setScale(Math.abs(this.playerBaseScaleX), Math.abs(this.playerBaseScaleY));
    this.setFeetAlignedBodyBox(
      this.player,
      this.scaleBodyBox(CHAR_BODY.playerCry, CHAR_DISPLAY_REF.playerCry, cryDisplay)
    );
    this.syncPlayerBodyPosition();
  }

  private disablePhysicsDebug() {
    this.physics.world.drawDebug = false;
    this.physics.world.defaults.debugShowBody = false;
    this.physics.world.defaults.debugShowStaticBody = false;
    this.physics.world.defaults.debugShowVelocity = false;
    if (this.physics.world.debugGraphic) {
      this.physics.world.debugGraphic.destroy();
    }
  }

  private setFeetAlignedBodyBox(
    sprite: Phaser.Physics.Arcade.Image,
    box: { w: number; h: number; bottom: number }
  ) {
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    const scaleX = Math.max(Math.abs(sprite.scaleX), 0.001);
    const scaleY = Math.max(Math.abs(sprite.scaleY), 0.001);
    const offsetX = (sprite.displayWidth - box.w) / 2;
    const offsetY = sprite.displayHeight - box.h - box.bottom;
    body.setSize(box.w / scaleX, box.h / scaleY, false);
    body.setOffset(offsetX / scaleX, offsetY / scaleY);
    body.debugShowBody = false;
    body.debugShowVelocity = false;
  }

  private resetPlayerBodyBox() {
    if (this.time.now < this.state.giantUntil) {
      const display = this.getAspectDisplaySize("brother_player", CHAR_HEIGHT.playerGiant);
      this.setFeetAlignedBodyBox(
        this.player,
        this.scaleBodyBox(CHAR_BODY.playerGiant, CHAR_DISPLAY_REF.playerGiant, display)
      );
      return;
    }
    const display = this.getAspectDisplaySize("brother_player", CHAR_HEIGHT.player);
    this.setFeetAlignedBodyBox(
      this.player,
      this.scaleBodyBox(CHAR_BODY.player, CHAR_DISPLAY_REF.player, display)
    );
  }

  private getEnemyDisplaySize(kind: EnemyKind) {
    const targetH = kind === "sister_boss" ? CHAR_HEIGHT.boss : CHAR_HEIGHT.sister;
    return this.getAspectDisplaySize(kind, targetH);
  }

  private getEnemyBodyBox(kind: EnemyKind) {
    return kind === "sister_boss" ? CHAR_BODY.boss : CHAR_BODY.sister;
  }

  private createControls() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC
    }) as Record<"a" | "d" | "s" | "j" | "space" | "esc", Phaser.Input.Keyboard.Key>;

    this.keys.esc.on("down", () => {
      this.scene.start("StartScene");
    });
  }

  private createHud() {
    const panel = this.add.rectangle(480, 34, 920, 54, 0x16263e, 0.68).setScrollFactor(0).setDepth(1000);
    panel.setStrokeStyle(2, 0xffffff, 0.18);
    this.hud = {
      hearts: this.add.text(24, 18, "", this.hudStyle(23, "#ff6b87")).setScrollFactor(0).setDepth(1001),
      coins: this.add.text(164, 18, "", this.hudStyle(20, "#ffe07a")).setScrollFactor(0).setDepth(1001),
      level: this.add.text(320, 18, "", this.hudStyle(18, "#ffffff")).setScrollFactor(0).setDepth(1001),
      itemIcon: this.add.image(742, 34, "hud:fireball_candy").setScrollFactor(0).setDepth(1001).setVisible(false).setDisplaySize(42, 42),
      itemText: this.add.text(772, 18, "无道具", this.hudStyle(18, "#eaf6ff")).setScrollFactor(0).setDepth(1001),
      hint: this.add.text(480, 82, "", this.hudStyle(18, "#fff3bd")).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setAlpha(0)
    };
    this.updateHud(this.time.now);
  }

  private hudStyle(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: "#172137",
      strokeThickness: 4
    };
  }

  private createTouchControls() {
    if (this.sys.game.device.os.desktop) return;

    const makeButton = (x: number, y: number, label: string, onDown: () => void, onUp: () => void) => {
      const circle = this.add.circle(x, y, 31, 0x10213a, 0.42).setScrollFactor(0).setDepth(1002).setInteractive();
      circle.setStrokeStyle(2, 0xffffff, 0.34);
      this.add.text(x, y, label, this.hudStyle(24, "#ffffff")).setOrigin(0.5).setScrollFactor(0).setDepth(1003);
      circle.on("pointerdown", onDown);
      circle.on("pointerup", onUp);
      circle.on("pointerout", onUp);
    };

    makeButton(58, 470, "←", () => (this.touchMove = -1), () => (this.touchMove = this.touchMove === -1 ? 0 : this.touchMove));
    makeButton(132, 470, "→", () => (this.touchMove = 1), () => (this.touchMove = this.touchMove === 1 ? 0 : this.touchMove));
    makeButton(822, 470, "↑", () => (this.touchJump = true), () => (this.touchJump = false));
    makeButton(896, 470, "J", () => (this.touchUse = true), () => (this.touchUse = false));
  }

  private registerPhysics() {
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    this.level.enemies.forEach((enemy) => this.spawnEnemy(enemy));
    this.disablePhysicsDebug();
    this.enemies.children.iterate((child) => {
      const body = (child as Phaser.Physics.Arcade.Image)?.body as Phaser.Physics.Arcade.Body | undefined;
      if (body) {
        body.debugShowBody = false;
        body.debugShowVelocity = false;
      }
      return true;
    });

    this.physics.add.collider(this.player, this.platforms, this.onPlayerPlatform, this.shouldCollidePlayerPlatform, this);
    this.physics.add.collider(this.enemies, this.platforms, undefined, this.shouldCollideEnemyPlatform, this);
    this.physics.add.collider(
      this.player,
      this.questionBlocks,
      this.onQuestionBlock,
      this.shouldCollidePlayerQuestionBlock,
      this
    );
    this.physics.add.overlap(this.player, this.coins, this.onCoinPickup, undefined, this);
    this.physics.add.collider(
      this.pickups,
      this.platforms,
      undefined,
      (pickupObj) => (pickupObj as Phaser.Physics.Arcade.Image).getData("spawnedFromBlock") === true,
      this
    );
    this.physics.add.overlap(this.player, this.pickups, this.onItemPickup, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerEnemy, undefined, this);
    this.physics.add.overlap(this.projectiles, this.enemies, this.onProjectileEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.checkpoint, this.onCheckpoint, undefined, this);
    this.physics.add.overlap(this.player, this.goal, this.onGoal, undefined, this);
  }

  private spawnEnemy(spawn: EnemySpawn) {
    const enemy = this.enemies.create(spawn.x, spawn.y, spawn.kind) as Phaser.Physics.Arcade.Image;
    const isBoss = spawn.kind === "sister_boss";
    const display = this.getEnemyDisplaySize(spawn.kind);
    enemy.setDisplaySize(display.w, display.h);
    const lane = this.findEnemyLane(spawn, isBoss);
    const enemyY = spawn.kind === "sister_balloon" ? lane.top - display.h : lane.top - enemy.displayHeight / 2;
    enemy.setPosition(Phaser.Math.Clamp(spawn.x, lane.left, lane.right), enemyY);
    enemy.setDepth(10);
    enemy.setData("kind", spawn.kind);
    const defaultHp = isBoss
      ? 3 + Math.floor(this.levelIndex / 2)
      : spawn.kind === "sister_pipe"
        ? 2 + Math.floor(this.levelIndex / 4)
        : 1 + Math.floor(this.levelIndex / 5);
    const hp = spawn.hp ?? defaultHp;
    enemy.setData("hp", hp);
    enemy.setData("maxHp", hp);
    enemy.setData("patrol", [lane.left, lane.right]);
    enemy.setData("leash", [lane.left, lane.right]);
    enemy.setData("laneTop", lane.top);
    enemy.setData("laneKind", lane.kind);
    const patrolSpeed = (isBoss ? 48 : 70) + this.levelIndex * 3;
    enemy.setData("speed", patrolSpeed);
    enemy.setData("direction", -1);
    enemy.setData("baseY", enemyY);
    enemy.setData("nextDustAt", 0);
    const attackDelayMin = Math.max(520, 1200 - this.levelIndex * 70);
    const attackDelayMax = Math.max(900, 2100 - this.levelIndex * 110);
    enemy.setData("nextAttackAt", this.time.now + Phaser.Math.Between(attackDelayMin, attackDelayMax));
    enemy.setCollideWorldBounds(true);
    const visual = this.createCharacterVisual(spawn.kind, display.w, display.h, 10);
    visual.container.setPosition(enemy.x, enemy.y);
    enemy.setData("visual", visual);
    this.hidePhysicsSprite(enemy);
    const bodyRef = spawn.kind === "sister_boss" ? CHAR_DISPLAY_REF.boss : CHAR_DISPLAY_REF.sister;
    this.setFeetAlignedBodyBox(
      enemy,
      this.scaleBodyBox(this.getEnemyBodyBox(spawn.kind), bodyRef, display)
    );
    enemy.setData("baseScaleX", enemy.scaleX);
    enemy.setData("baseScaleY", enemy.scaleY);
  }

  private findEnemyLane(spawn: EnemySpawn, isBoss: boolean): EnemyLane {
    const requested: [number, number] = spawn.patrol ?? [spawn.x - (isBoss ? 360 : 220), spawn.x + (isBoss ? 360 : 220)];
    const ground = this.level.platforms.find((platform) => platform.kind === "ground") ?? this.level.platforms[0];
    const groundTop = ground.y - ground.height / 2;
    const enemyStandOffset = Math.round((isBoss ? CHAR_HEIGHT.boss : CHAR_HEIGHT.sister) * 0.46);

    if (spawn.kind !== "sister_balloon") {
      let bestPlatform: RectSpec | undefined;
      let bestScore = Number.NEGATIVE_INFINITY;

      this.level.platforms.forEach((platform) => {
        const left = platform.x - platform.width / 2;
        const right = platform.x + platform.width / 2;
        const patrolOverlap = Math.max(0, Math.min(requested[1], right) - Math.max(requested[0], left));
        const spawnInside = spawn.x >= left && spawn.x <= right ? 120 : 0;
        const top = platform.y - platform.height / 2;
        const surfaceY = top - enemyStandOffset;
        const yDelta = Math.abs(surfaceY - spawn.y);
        const yMatch = yDelta <= 36 ? 280 : yDelta <= 72 ? 140 : yDelta <= 110 ? 50 : 0;
        const yProximity = -yDelta;
        const score =
          patrolOverlap + spawnInside + yMatch + yProximity + (platform.kind === "ground" ? -48 : 24);
        if (score > bestScore) {
          bestScore = score;
          bestPlatform = platform;
        }
      });

      if (bestPlatform && bestScore > 40) {
        const lane = this.makeLaneFromPlatform(bestPlatform, bestPlatform.kind === "ground" ? "ground" : "platform");
        return {
          left: Math.max(lane.left, Math.max(32, requested[0])),
          right: Math.min(lane.right, Math.min(this.level.worldWidth - 32, requested[1])),
          top: lane.top,
          kind: lane.kind
        };
      }

      return {
        left: Math.max(32, requested[0]),
        right: Math.min(this.level.worldWidth - 32, requested[1]),
        top: groundTop,
        kind: "ground"
      };
    }

    const nonGroundPlatforms = this.level.platforms.filter((platform) => platform.kind !== "ground");
    let bestPlatform: RectSpec | undefined;
    let bestScore = 0;

    nonGroundPlatforms.forEach((platform) => {
      const left = platform.x - platform.width / 2;
      const right = platform.x + platform.width / 2;
      const overlap = Math.max(0, Math.min(requested[1], right) - Math.max(requested[0], left));
      const spawnInside = spawn.x >= left && spawn.x <= right ? 80 : 0;
      const score = overlap + spawnInside;
      if (score > bestScore) {
        bestScore = score;
        bestPlatform = platform;
      }
    });

    if (bestPlatform && bestScore > 90) {
      return this.makeLaneFromPlatform(bestPlatform, "platform");
    }

    return {
      left: Math.max(32, requested[0]),
      right: Math.min(this.level.worldWidth - 32, requested[1]),
      top: groundTop,
      kind: "ground"
    };
  }

  private makeLaneFromPlatform(platform: RectSpec, kind: "ground" | "platform"): EnemyLane {
    const margin = Math.min(44, Math.max(14, platform.width * 0.14));
    return {
      left: Math.max(32, platform.x - platform.width / 2 + margin),
      right: Math.min(this.level.worldWidth - 32, platform.x + platform.width / 2 - margin),
      top: platform.y - platform.height / 2,
      kind
    };
  }

  private updatePlayer(time: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (
      this.player.y > this.level.worldHeight + 40 ||
      this.player.y < -80 ||
      this.player.x < -60 ||
      this.player.x > this.level.worldWidth + 60
    ) {
      this.player.setPosition(this.state.checkpoint.x, this.state.checkpoint.y);
      body.reset(this.state.checkpoint.x, this.state.checkpoint.y);
      body.setVelocity(0, 0);
    }

    const left = this.cursors.left?.isDown || this.keys.a.isDown || this.touchMove < 0;
    const right = this.cursors.right?.isDown || this.keys.d.isDown || this.touchMove > 0;
    const jumpKeyPressed = Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.cursors.up!);
    const touchJumpJustPressed = this.touchJump && !this.prevTouchJump;
    this.prevTouchJump = this.touchJump;
    const usePressed = Phaser.Input.Keyboard.JustDown(this.keys.j) || this.touchUse;
    const grounded = body.blocked.down || body.touching.down;
    const speedBoost = time < this.state.starUntil ? 1.45 : 1;
    const speed = PLAYER_SPEED * speedBoost * (time < this.state.giantUntil ? 0.9 : 1);

    if (grounded) {
      this.lastGroundedAt = time;
    }

    if (jumpKeyPressed || touchJumpJustPressed) {
      this.jumpBufferUntil = time + JUMP_BUFFER_MS;
    }

    if (left) {
      body.setDragX(0);
      body.setVelocityX(-speed);
      this.state.facing = -1;
      this.player.setFlipX(true);
    } else if (right) {
      body.setDragX(0);
      body.setVelocityX(speed);
      this.state.facing = 1;
      this.player.setFlipX(false);
    } else {
      body.setDragX(1300);
    }

    const canJump = grounded || (this.lastGroundedAt > 0 && time - this.lastGroundedAt <= COYOTE_MS);
    if (time <= this.jumpBufferUntil && canJump) {
      body.setVelocityY(this.level.jumpVelocity ?? (time < this.state.bouncyUntil ? -620 : JUMP_VELOCITY));
      this.sound.play("sfx_player_jump", { volume: 0.62 });
      this.jumpBufferUntil = 0;
      this.touchJump = false;
    }

    if ((this.keys.s.isDown || this.cursors.down?.isDown) && !body.blocked.down) {
      body.setVelocityY(760);
    }

    if (time < this.state.flyingUntil && !grounded && body.velocity.y > 60 && (this.keys.space.isDown || this.cursors.up?.isDown || this.touchJump)) {
      body.setVelocityY(Math.min(body.velocity.y, 120));
    }

    if (usePressed) {
      this.useCurrentItem();
      this.touchUse = false;
    }

    if (body.y > this.level.worldHeight - 20) {
      this.hurtPlayer(1, -this.state.facing, true);
    }
  }

  private updateEnemies(time: number) {
    this.enemies.children.iterate((child) => {
      if (!child) return true;
      const enemy = child as Phaser.Physics.Arcade.Image;
      if (!enemy.active || enemy.getData("defeated")) return true;
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      const kind = enemy.getData("kind") as string;
      const frozenUntil = enemy.getData("frozenUntil") as number | undefined;
      if (frozenUntil && time < frozenUntil) {
        body.setVelocityX(0);
        this.tintCharacterVisual(enemy.getData("visual") as CharacterVisual | undefined, 0x99e8ff);
        this.updateEnemyPose(enemy, time, false);
        return true;
      }
      this.clearCharacterVisualTint(enemy.getData("visual") as CharacterVisual | undefined);

      if (kind === "sister_balloon") {
        const patrol = enemy.getData("patrol") as [number, number] | undefined;
        const direction = enemy.getData("direction") as 1 | -1;
        const chaseDirection = this.getChaseDirection(enemy, ENEMY_CHASE_RANGE * 0.85, 130);
        body.setAllowGravity(false);
        if (!enemy.getData("throwWindup")) {
          this.setEnemyLeashedVelocity(enemy, (chaseDirection || direction) * (chaseDirection ? 95 : (enemy.getData("speed") as number)), enemy.getData("speed") as number);
        } else {
          body.setVelocityX(0);
        }
        enemy.y = (enemy.getData("baseY") as number) + Math.sin(time / 420) * 46 + (chaseDirection ? Phaser.Math.Clamp(this.player.y - enemy.y, -60, 60) * 0.015 : 0);
        if (!chaseDirection && patrol && (enemy.x < patrol[0] || enemy.x > patrol[1])) enemy.setData("direction", direction * -1);
        this.updateEnemyPose(enemy, time, !!chaseDirection);
        this.tryScheduleEnemyThrow(enemy, kind as EnemyKind, time);
        return true;
      }

      if (kind === "sister_pipe") {
        body.setAllowGravity(false);
        const baseY = enemy.getData("baseY") as number;
        enemy.y = baseY + Math.sin(time / 520) * 38;
        this.updateEnemyPose(enemy, time, false);
        this.tryScheduleEnemyThrow(enemy, kind as EnemyKind, time);
        return true;
      }

      const patrol = enemy.getData("patrol") as [number, number] | undefined;
      const direction = enemy.getData("direction") as 1 | -1;
      const chaseDirection = this.getChaseDirection(enemy, kind === "sister_boss" ? 760 : ENEMY_CHASE_RANGE, kind === "sister_boss" ? 110 : 78);
      if (enemy.getData("throwWindup")) {
        body.setVelocityX(0);
      } else if (this.shouldHoldAtLaneFence(enemy)) {
        body.setVelocityX(0);
      } else if (chaseDirection) {
        const levelChaseBonus = this.levelIndex * 2;
        const chaseSpeed =
          kind === "sister_boss" ? 78 + levelChaseBonus : kind === "sister_headphone" ? 98 + levelChaseBonus : 125 + levelChaseBonus;
        this.setEnemyLeashedVelocity(enemy, chaseDirection * chaseSpeed, chaseSpeed);
        enemy.setData("direction", chaseDirection);
      } else if (patrol) {
        this.setEnemyLeashedVelocity(enemy, (enemy.getData("speed") as number) * direction, enemy.getData("speed") as number);
        if (enemy.x < patrol[0] || enemy.x > patrol[1]) enemy.setData("direction", direction * -1);
      } else if (kind === "sister_boss") {
        this.setEnemyLeashedVelocity(enemy, Math.sin(time / 900) * 45, 48);
      } else {
        body.setVelocityX(0);
      }

      this.updateEnemyPose(enemy, time, !!chaseDirection);
      this.tryScheduleEnemyThrow(enemy, kind as EnemyKind, time);
      return true;
    });
  }

  private getChaseDirection(enemy: Phaser.Physics.Arcade.Image, range: number, maxYDiff: number): 1 | -1 | 0 {
    const xDiff = this.player.x - enemy.x;
    const yDiff = Math.abs(this.player.y - enemy.y);
    const [left, right] = enemy.getData("leash") as [number, number];
    if (!this.isPlayerOnEnemyLane(enemy, 46)) return 0;
    if (this.player.x < left || this.player.x > right) return 0;
    if (Math.abs(xDiff) > range || yDiff > maxYDiff) return 0;
    return xDiff >= 0 ? 1 : -1;
  }

  private getEnemyThrowScale() {
    const li = this.levelIndex;
    const t = li / 9;
    if (li === 0) return { cooldownMul: 1.65, speedMul: 0.58, windupMul: 1.42, damage: 1 };
    return {
      cooldownMul: Phaser.Math.Linear(1.48, 0.76, t),
      speedMul: Phaser.Math.Linear(0.64, 1.2, t),
      windupMul: Phaser.Math.Linear(1.32, 0.8, t),
      damage: li >= 8 ? 2 : 1
    };
  }

  /** Escalate projectile type as levels progress: toys → ice/wave → boom. */
  private resolveEnemyProjectileKey(kind: EnemyKind, baseKey: string): string {
    const li = this.levelIndex;
    if (li >= 8 && (kind === "sister_headphone" || kind === "sister_boss")) return "projectile:boom";
    if (li >= 6 && kind === "sister_small") return "projectile:ice";
    if (li >= 4 && kind === "sister_balloon") return "projectile:ice";
    return baseKey;
  }

  private getEnemyThrowProfile(kind: EnemyKind): EnemyThrowProfile | null {
    const scale = this.getEnemyThrowScale();
    const base: Partial<Record<EnemyKind, Omit<EnemyThrowProfile, "cooldown" | "windupMs" | "speedX" | "speedY" | "damage" | "key"> & { key: string; cooldown: number; windupMs: number; speedX: number; speedY: number }>> = {
      sister_small: { key: "projectile:toy", cooldown: 3600, windupMs: 420, speedX: 400, speedY: -50, gravity: true, range: 390, maxYDiff: 96 },
      sister_headphone: { key: "projectile:wave", cooldown: 2700, windupMs: 380, speedX: 480, speedY: 0, gravity: false, range: 520, maxYDiff: 88 },
      sister_pipe: { key: "projectile:ice", cooldown: 2900, windupMs: 340, speedX: 440, speedY: -70, gravity: true, range: 500, maxYDiff: 130 },
      sister_balloon: { key: "projectile:toy", cooldown: 3200, windupMs: 480, speedX: 140, speedY: 400, gravity: true, range: 540, maxYDiff: 220, balloonDrop: true },
      sister_boss: { key: "projectile:boom", cooldown: 2100, windupMs: 400, speedX: 500, speedY: -150, gravity: true, range: 700, maxYDiff: 120 }
    };
    const profile = base[kind];
    if (!profile) return null;
    const bossBoost = kind === "sister_boss" && this.levelIndex === 9 ? 0.72 : kind === "sister_boss" ? 0.88 : 1;
    const rangeBonus = this.levelIndex * 18;
    return {
      ...profile,
      key: this.resolveEnemyProjectileKey(kind, profile.key),
      cooldown: Math.round(profile.cooldown * scale.cooldownMul * bossBoost),
      windupMs: Math.round(profile.windupMs * scale.windupMul),
      speedX: Math.round(profile.speedX * scale.speedMul * (kind === "sister_boss" ? 1.08 : 1)),
      speedY: Math.round(profile.speedY * scale.speedMul * (kind === "sister_boss" ? 1.08 : 1)),
      range: profile.range + rangeBonus,
      damage: scale.damage
    };
  }

  private canEnemyThrowAtPlayer(enemy: Phaser.Physics.Arcade.Image, profile: EnemyThrowProfile) {
    const [left, right] = enemy.getData("leash") as [number, number];
    if (!this.isPlayerOnEnemyLane(enemy, profile.balloonDrop ? 72 : 46)) return false;
    if (this.player.x < left || this.player.x > right) return false;
    const xDiff = Math.abs(this.player.x - enemy.x);
    const yDiff = Math.abs(this.player.y - enemy.y);
    return xDiff <= profile.range && yDiff <= profile.maxYDiff;
  }

  private tryScheduleEnemyThrow(enemy: Phaser.Physics.Arcade.Image, kind: EnemyKind, time: number) {
    if (enemy.getData("throwWindup")) return;
    if (time < (enemy.getData("nextAttackAt") as number)) return;
    const profile = this.getEnemyThrowProfile(kind);
    if (!profile) return;
    if (!this.canEnemyThrowAtPlayer(enemy, profile)) {
      enemy.setData("nextAttackAt", time + 480);
      return;
    }

    enemy.setData("throwWindup", true);
    enemy.setData("nextAttackAt", time + profile.cooldown);
    const visual = enemy.getData("visual") as CharacterVisual | undefined;
    this.tintCharacterVisual(visual, 0xffe8c8);
    if (kind === "sister_pipe") this.sound.play("sfx_pipe_sister_pop", { volume: 0.45 });

    this.time.delayedCall(profile.windupMs, () => {
      if (!enemy.active || enemy.getData("defeated")) return;
      enemy.setData("throwWindup", false);
      this.clearCharacterVisualTint(visual);
      if (!this.canEnemyThrowAtPlayer(enemy, profile)) return;
      this.spawnEnemyProjectile(enemy, profile);
    });
  }

  private getPlayerLaneTop() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!(body.blocked.down || body.touching.down)) return undefined;

    const feetY = body.y + body.height;
    const playerX = this.player.x;
    let bestTop: number | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    this.level.platforms.forEach((platform) => {
      const left = platform.x - platform.width / 2 - 18;
      const right = platform.x + platform.width / 2 + 18;
      if (playerX < left || playerX > right) return;
      const top = platform.y - platform.height / 2;
      const distance = Math.abs(feetY - top);
      if (distance < bestDistance && distance < 44) {
        bestDistance = distance;
        bestTop = top;
      }
    });

    return bestTop;
  }

  private isPlayerOnEnemyLane(enemy: Phaser.Physics.Arcade.Image, tolerance: number) {
    const playerLaneTop = this.getPlayerLaneTop();
    if (playerLaneTop === undefined) return false;
    return Math.abs(playerLaneTop - (enemy.getData("laneTop") as number)) <= tolerance;
  }

  /** Side damage / push-back: same lane or true body contact, not distant floors. */
  private canPlayerTakeDamageFromEnemy(enemy: Phaser.Physics.Arcade.Image) {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
    const overlapX = Math.min(playerBody.right, enemyBody.right) - Math.max(playerBody.left, enemyBody.left);
    if (overlapX <= 10) return false;

    const playerLaneTop = this.getPlayerLaneTop();
    const enemyLaneTop = enemy.getData("laneTop") as number;
    const laneGap = playerLaneTop === undefined ? Number.POSITIVE_INFINITY : Math.abs(playerLaneTop - enemyLaneTop);

    if (playerLaneTop !== undefined && laneGap <= 56) return true;

    const playerFeet = playerBody.y + playerBody.height;
    const enemyTop = enemyBody.y + 10;
    const feetAboveEnemyTop = playerFeet - enemyTop;

    if (playerLaneTop !== undefined && playerLaneTop < enemyLaneTop - 44) return false;

    if (laneGap > 100 && feetAboveEnemyTop > 36) return false;
    if (feetAboveEnemyTop > 88) return false;

    return feetAboveEnemyTop <= 46 && feetAboveEnemyTop >= -34;
  }

  private setEnemyLeashedVelocity(enemy: Phaser.Physics.Arcade.Image, velocityX: number, fallbackSpeed: number) {
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    const [left, right] = enemy.getData("leash") as [number, number];
    let nextVelocity = velocityX;

    if (enemy.x <= left && nextVelocity < 0) {
      enemy.x = left;
      nextVelocity = Math.abs(fallbackSpeed);
      enemy.setData("direction", 1);
    } else if (enemy.x >= right && nextVelocity > 0) {
      enemy.x = right;
      nextVelocity = -Math.abs(fallbackSpeed);
      enemy.setData("direction", -1);
    }

    body.setVelocityX(nextVelocity);
  }

  private shouldHoldAtLaneFence(enemy: Phaser.Physics.Arcade.Image) {
    const closeHorizontally = Math.abs(this.player.x - enemy.x) < 170;
    const [left, right] = enemy.getData("leash") as [number, number];
    const playerInThisZone = this.player.x >= left && this.player.x <= right;
    return !this.isPlayerOnEnemyLane(enemy, 46) && closeHorizontally && playerInThisZone;
  }

  private updateEnemyPose(enemy: Phaser.Physics.Arcade.Image, time: number, chasing: boolean) {
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    const kind = enemy.getData("kind") as string;
    const visual = enemy.getData("visual") as CharacterVisual | undefined;
    const patrolMoving = Math.abs(body.velocity.x) > 8;
    const moving = patrolMoving || (kind === "sister_pipe" && Math.sin(time / 520) > 0.72);
    const direction = patrolMoving ? (body.velocity.x >= 0 ? 1 : -1) : ((enemy.getData("direction") as number) ?? 1);
    const depth = 10 + enemy.y / 1000;
    const energy = kind === "sister_boss" ? 0.72 : kind === "sister_headphone" ? 0.92 : kind === "sister_pipe" ? 0.58 : kind === "sister_balloon" ? 0.78 : 0.86;
    const stepRate = kind === "sister_boss" ? 92 : chasing ? 74 : kind === "sister_pipe" ? 360 : kind === "sister_balloon" ? 108 : 118;

    enemy.setDepth(depth);
    enemy.setFlipX(direction < 0);
    const baseScaleX = enemy.getData("baseScaleX") as number;
    const baseScaleY = enemy.getData("baseScaleY") as number;
    if (Math.abs(enemy.scaleX - baseScaleX) > 0.001 || Math.abs(enemy.scaleY - baseScaleY) > 0.001) {
      enemy.setScale(baseScaleX, baseScaleY);
    }
    enemy.setAngle(0);

    this.syncCharacterVisual(visual, enemy.x, enemy.y, direction, time, moving, kind !== "sister_balloon", energy, depth, 1, {
      stepRate,
      velocityY: body.velocity.y
    });

    if (patrolMoving && chasing && time > (enemy.getData("nextDustAt") as number)) {
      this.spawnDust(enemy.x - direction * 24, enemy.y + enemy.displayHeight * 0.42, direction, 0.55);
      enemy.setData("nextDustAt", time + 170);
    }
  }

  private updateCoinMagnet() {
    this.coins.children.iterate((child) => {
      if (!child) return true;
      const coin = child as Phaser.Physics.Arcade.Image;
      if (!coin.active || coin.getData("collected")) return true;
      const xDiff = Math.abs(this.player.x - coin.x);
      const yDiff = Math.abs(this.player.y - coin.y);
      if (xDiff < 92 && yDiff < 132) {
        this.collectCoin(coin);
      } else if (xDiff < 126 && yDiff < 166) {
        coin.setScale(1 + Math.sin(this.time.now / 55) * 0.05);
      } else if (coin.scale !== 1) {
        coin.setScale(1);
      }
      return true;
    });
  }

  private updateCharacterPose(time: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const moving = Math.abs(body.velocity.x) > 12;
    const grounded = body.blocked.down || body.touching.down;
    const step = Math.sin(time / 70);

    if (this.playerVisualMode === "cry") {
      this.playerShadow?.setVisible(false);
      return;
    }

    const { w: width, h: height } = this.getPlayerVisualSize();
    if (this.playerVisual && (this.playerVisual.width !== width || this.playerVisual.height !== height)) {
      this.rebuildPlayerVisual();
    }

    const energy = time < this.state.starUntil ? 1.25 : 1;
    const alpha = time < this.state.invincibleUntil || time < this.state.starUntil ? (Math.sin(time / 70) > 0 ? 0.55 : 1) : 1;
    this.syncCharacterVisual(
      this.playerVisual,
      this.player.x,
      this.player.y,
      this.state.facing,
      time,
      moving,
      grounded,
      energy,
      grounded ? 9 : 12,
      alpha,
      { stepRate: grounded ? 68 : 92, velocityY: body.velocity.y }
    );

    if (grounded && moving && time > this.lastDustAt + 135) {
      this.spawnDust(this.player.x - this.state.facing * 28, this.player.y + this.player.displayHeight * 0.43, this.state.facing, 0.8);
      this.lastDustAt = time;
    }

    this.playerShadow
      ?.setPosition(this.player.x, this.player.y + this.player.displayHeight * 0.5)
      .setScale(grounded ? 1.05 + Math.abs(step) * 0.08 : 0.72, grounded ? 1 : 0.75)
      .setAlpha(grounded ? 0.42 : 0.2);
  }

  private spawnDust(x: number, y: number, direction: number, scale = 0.8) {
    const dust = this.add.image(x, y, "dust:puff");
    dust.setDepth(7).setAlpha(0.55).setScale(scale);
    this.tweens.add({
      targets: dust,
      x: dust.x - direction * 22,
      y: dust.y + 4,
      scaleX: 1.8,
      scaleY: 1.2,
      alpha: 0,
      duration: 280,
      ease: "Quad.easeOut",
      onComplete: () => dust.destroy()
    });
  }

  private createCharacterVisual(textureKey: string, width: number, height: number, depth: number): CharacterVisual {
    const container = this.add.container(0, 0).setDepth(depth);

    const image = this.make.image({ key: textureKey, add: false });
    image.setDisplaySize(width, height);
    image.setOrigin(0.5, 0.5);
    image.setFlipX(false);
    image.setData("baseScaleX", image.scaleX);
    image.setData("baseScaleY", image.scaleY);
    container.add(image);
    image.setPosition(0, 0);

    return { container, body: image, width, height };
  }

  private syncCharacterVisual(
    visual: CharacterVisual | undefined,
    x: number,
    y: number,
    facing: 1 | -1 | number,
    time: number,
    moving: boolean,
    grounded: boolean,
    energy: number,
    depth: number,
    alpha: number,
    options?: { stepRate?: number; velocityY?: number }
  ) {
    if (!visual) return;
    const stepRate = options?.stepRate ?? (grounded ? 65 : 95);
    const walkStep = moving ? Math.sin(time / stepRate) : 0;
    const idleStep = moving ? 0 : Math.sin(time / (stepRate * 3.4)) * 0.38;
    const step = walkStep + idleStep;
    const bounce = grounded && moving ? Math.abs(walkStep) * 3.5 * energy : grounded ? Math.abs(idleStep) * 1.2 : Math.sin(time / 240) * 2.2;
    const squash = grounded && moving ? Math.abs(walkStep) * 0.055 * energy : 0;
    const direction = facing < 0 ? -1 : 1;
    const partScale = (scaleX = 1, scaleY = 1) => {
      visual.body.setScale((visual.body.getData("baseScaleX") as number) * scaleX, (visual.body.getData("baseScaleY") as number) * scaleY);
    };

    visual.container.setPosition(x, y - bounce).setDepth(depth).setAlpha(alpha).setVisible(true);
    visual.container.setScale(1, 1);
    visual.body.setFlipX(direction < 0);

    if (!grounded) {
      const velocityY = options?.velocityY ?? 0;
      const airTilt = Phaser.Math.Clamp(velocityY / 140, -1, 1);
      visual.body.setAngle(Phaser.Math.Clamp(airTilt * -10, -10, 10) + step * 1.2);
      partScale(0.97, 1.04);
      return;
    }

    visual.body.setAngle(step * 2.8 * energy);
    partScale(1 - squash * 0.35, 1 + squash * 0.25);
  }

  private getCharacterVisualParts(visual?: CharacterVisual) {
    if (!visual) return [] as Phaser.GameObjects.Image[];
    return [visual.body];
  }

  private tintCharacterVisual(visual: CharacterVisual | undefined, tint: number) {
    this.getCharacterVisualParts(visual).forEach((part) => part.setTint(tint));
  }

  private clearCharacterVisualTint(visual: CharacterVisual | undefined) {
    this.getCharacterVisualParts(visual).forEach((part) => part.clearTint());
  }

  private destroyCharacterVisual(visual: CharacterVisual | undefined) {
    visual?.container.destroy();
  }

  private updateProjectiles() {
    this.resolveEnemyProjectilePlayerHits();
    this.resolveProjectileEnemyHits();
    for (const group of [this.projectiles, this.enemyProjectiles]) {
      group.children.iterate((child) => {
        if (!child) return true;
        const projectile = child as Phaser.Physics.Arcade.Image;
        if (!projectile.active) return true;
        projectile.angle += projectile.getData("spin") ?? 10;
        if (this.time.now > ((projectile.getData("nextTrailAt") as number | undefined) ?? 0)) {
          this.spawnProjectileTrail(projectile);
          projectile.setData("nextTrailAt", this.time.now + 55);
        }
        if (
          projectile.x < this.cameras.main.scrollX - 160 ||
          projectile.x > this.cameras.main.scrollX + 1120 ||
          projectile.y < -60 ||
          projectile.y > this.level.worldHeight + 80
        ) {
          projectile.destroy();
        }
        return true;
      });
    }
  }

  private resolveProjectileEnemyHits() {
    this.projectiles.children.iterate((projectileObj) => {
      if (!projectileObj) return true;
      const projectile = projectileObj as Phaser.Physics.Arcade.Image;
      if (!projectile.active || projectile.getData("spent")) return true;

      this.enemies.children.iterate((enemyObj) => {
        if (!enemyObj || projectile.getData("spent")) return true;
        const enemy = enemyObj as Phaser.Physics.Arcade.Image;
        if (!enemy.active || enemy.getData("defeated")) return true;

        const xLimit = Math.max(42, enemy.displayWidth * 0.55);
        const yLimit = Math.max(54, enemy.displayHeight * 0.52);
        if (Math.abs(projectile.x - enemy.x) > xLimit || Math.abs(projectile.y - enemy.y) > yLimit) return true;

        this.hitEnemyWithProjectile(projectile, enemy);
        return true;
      });
      return true;
    });
  }

  private resolveEnemyProjectilePlayerHits() {
    if (this.state.locked || this.time.now < this.state.starUntil) return;
    const now = this.time.now;
    this.enemyProjectiles.children.iterate((projectileObj) => {
      if (!projectileObj || this.state.locked) return true;
      const projectile = projectileObj as Phaser.Physics.Arcade.Image;
      if (!projectile.active || projectile.getData("spent")) return true;

      const xLimit = Math.max(36, this.player.displayWidth * 0.46 + projectile.displayWidth * 0.38);
      const yLimit = Math.max(48, this.player.displayHeight * 0.38 + projectile.displayHeight * 0.38);
      if (Math.abs(projectile.x - this.player.x) > xLimit || Math.abs(projectile.y - this.player.y) > yLimit) return true;

      if (now < this.state.invincibleUntil) return true;

      projectile.setData("spent", true);
      projectile.destroy();
      const damage = (projectile.getData("damage") as number | undefined) ?? 1;
      this.hurtPlayer(damage, projectile.x < this.player.x ? 1 : -1);
      return true;
    });
  }

  private updateTimedItems(delta: number, time: number) {
    const item = this.state.activeItem;
    if (item?.activated && item.remainingMs !== undefined) {
      item.remainingMs = Math.max(0, item.remainingMs - delta);
      if (item.remainingMs <= 0) {
        this.expireTimedItem(item.config.id);
      }
    }

    const playerDisplay = this.getAspectDisplaySize("brother_player", CHAR_HEIGHT.player);
    if (time >= this.state.giantUntil && this.player.displayWidth > playerDisplay.w + 8) {
      this.player.setDisplaySize(playerDisplay.w, playerDisplay.h);
      this.playerBaseScaleX = this.player.scaleX;
      this.playerBaseScaleY = this.player.scaleY;
      this.rebuildPlayerVisual();
      this.resetPlayerBodyBox();
    }
  }

  private updateHud(time: number) {
    this.hud.hearts.setText("♥".repeat(this.state.hp) + "♡".repeat(3 - this.state.hp));
    this.hud.coins.setText(`金币 ${this.state.coins}`);
    this.hud.level.setText(`${this.levelIndex + 1}/10  ${this.level.name}`);

    const item = this.state.activeItem;
    if (!item) {
      this.hud.itemText.setText("无道具");
      this.hud.itemIcon.setVisible(false);
    } else {
      const suffix =
        item.remainingMs !== undefined ? `${Math.ceil(item.remainingMs / 1000)}s` : item.usesLeft !== undefined ? `x${item.usesLeft}` : "";
      this.hud.itemText.setText(`${item.config.name} ${suffix}`);
      const iconKey = this.textures.exists(`hud-display:${item.config.id}`) ? `hud-display:${item.config.id}` : `hud:${item.config.id}`;
      this.hud.itemIcon.setTexture(iconKey).setVisible(true);
    }
  }

  private onPlayerPlatform(playerObj: unknown, platformObj: unknown) {
    const platform = platformObj as Phaser.Physics.Arcade.Image;
    const player = playerObj as Phaser.Physics.Arcade.Image;
    const body = player.body as Phaser.Physics.Arcade.Body;
    if (platform.getData("kind") === "bounce" && (body.blocked.down || body.touching.down)) {
      body.setVelocityY(-650);
      this.sound.play("sfx_player_jump", { volume: 0.5, rate: 1.25 });
    }
  }

  private shouldCollidePlayerPlatform(playerObj: unknown, platformObj: unknown) {
    const platform = platformObj as Phaser.Physics.Arcade.Image;
    const kind = platform.getData("kind") as string | undefined;
    if (kind === "ground") return true;

    const body = (playerObj as Phaser.Physics.Arcade.Image).body as ArcadeBodyWithPrev;
    const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody;
    const platformTop = platformBody.y;
    const previousBottom = (body.prev?.y ?? body.y) + body.height;
    const currentBottom = body.y + body.height;
    const falling = body.velocity.y >= -20;
    const horizontalMargin = 4;
    const horizontallyInside =
      body.right > platformBody.x + horizontalMargin && body.x < platformBody.x + platformBody.width - horizontalMargin;

    return falling && horizontallyInside && previousBottom <= platformTop + 28 && currentBottom <= platformTop + 56;
  }

  private shouldCollideEnemyPlatform(enemyObj: unknown, platformObj: unknown) {
    const platform = platformObj as Phaser.Physics.Arcade.Image;
    const kind = platform.getData("kind") as string | undefined;
    if (kind === "ground") return true;

    const body = (enemyObj as Phaser.Physics.Arcade.Image).body as ArcadeBodyWithPrev;
    const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody;
    const platformTop = platformBody.y;
    const previousBottom = (body.prev?.y ?? body.y) + body.height;
    const currentBottom = body.y + body.height;

    return body.velocity.y >= -20 && previousBottom <= platformTop + 20 && currentBottom <= platformTop + 46;
  }

  private shouldCollidePlayerQuestionBlock(_playerObj: unknown, _blockObj: unknown) {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const blockBody = (_blockObj as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.StaticBody;
    if (playerBody.velocity.y < -16) return true;
    if (playerBody.blocked.up || playerBody.touching.up) return true;
    const blockBottom = blockBody.y + blockBody.height;
    return playerBody.y + 16 < blockBottom;
  }

  private onQuestionBlock(_playerObj: unknown, blockObj: unknown) {
    const block = blockObj as Phaser.Physics.Arcade.Image;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    if (block.getData("used") || !this.canHitQuestionBlock(playerBody, block)) return;
    block.setData("used", true);
    block.setTint(0xb9a27a);
    this.sound.play("sfx_question_block", { volume: 0.7 });
    const item = Phaser.Utils.Array.GetRandom(this.itemPool);
    this.spawnBlockPickup(item.id, block.x, block.y - 72);
    this.tweens.add({ targets: block, y: block.y - 10, yoyo: true, duration: 80 });
    if (this.questionHintActive && block.x === this.level.questionBlocks[0]?.x) {
      this.hud.hint.setAlpha(0);
      this.questionHintActive = false;
    }
  }

  private canHitQuestionBlock(playerBody: Phaser.Physics.Arcade.Body, block: Phaser.Physics.Arcade.Image) {
    const blockBody = block.body as Phaser.Physics.Arcade.StaticBody;
    const playerBottom = playerBody.y + playerBody.height;
    const playerTop = playerBody.y;
    const blockBottom = blockBody.y + blockBody.height;
    const blockTop = blockBody.y;
    const alignedX = playerBody.right > blockBody.x + 2 && playerBody.x < blockBody.right - 2;

    if ((playerBody.touching.up || playerBody.blocked.up) && alignedX) return true;

    const rising = playerBody.velocity.y < -24;
    const headBump = playerTop <= blockBottom + 20 && playerBottom > blockTop;
    return rising && alignedX && headBump;
  }

  private updateQuestionBlockHits() {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    if (playerBody.velocity.y >= 0) return;

    this.questionBlocks.children.iterate((child) => {
      if (!child) return true;
      const block = child as Phaser.Physics.Arcade.Image;
      if (block.getData("used") || !this.canHitQuestionBlock(playerBody, block)) return true;
      this.onQuestionBlock(this.player, block);
      return true;
    });
  }

  private updateQuestionHint() {
    if (!this.questionHintActive || this.levelIndex !== 0) return;
    const block = this.level.questionBlocks[0];
    if (!block) return;
    const used = this.questionBlocks.children.entries.some(
      (entry) => Math.abs((entry as Phaser.Physics.Arcade.Image).x - block.x) < 1 && entry.getData("used")
    );
    if (used) {
      this.hud.hint.setAlpha(0);
      this.questionHintActive = false;
      return;
    }
    if (this.player.x > block.x - 300 && this.player.x < block.x + 80) {
      this.hud.hint.setText("跳起顶方块!").setAlpha(1);
    } else if (this.player.x < block.x - 320) {
      this.hud.hint.setAlpha(0);
    }
  }

  private updateBlockPickups(time: number) {
    const camLeft = this.cameras.main.scrollX - BLOCK_PICKUP_OFFSCREEN_MARGIN;
    const camRight = this.cameras.main.scrollX + 960 + BLOCK_PICKUP_OFFSCREEN_MARGIN;

    this.pickups.children.iterate((child) => {
      if (!child) return true;
      const pickup = child as Phaser.Physics.Arcade.Image;
      if (!pickup.active || !pickup.getData("spawnedFromBlock")) return true;

      const glow = pickup.getData("glow") as Phaser.GameObjects.Arc | undefined;
      if (glow?.active) {
        glow.setPosition(pickup.x, pickup.y);
        glow.setAngle(pickup.angle);
      }

      if (time >= (pickup.getData("despawnAt") as number) || pickup.x < camLeft || pickup.x > camRight) {
        pickup.destroy();
      }
      return true;
    });
  }

  private onCoinPickup(_playerObj: unknown, coinObj: unknown) {
    this.collectCoin(coinObj as Phaser.Physics.Arcade.Image);
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Image) {
    if (coin.getData("collected")) return;
    coin.setData("collected", true);
    this.state.coins += 1;
    this.sound.play("sfx_coin_pickup", { volume: 0.52, rate: 1 + Math.min(0.25, this.state.coins * 0.01) });
    coin.disableBody(true, false);
    coin.setDepth(20);
    this.tweens.add({
      targets: coin,
      x: this.player.x,
      y: this.player.y - 52,
      scale: 0.15,
      alpha: 0,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => coin.destroy()
    });
  }

  private onItemPickup(_playerObj: unknown, itemObj: unknown) {
    const pickup = itemObj as Phaser.Physics.Arcade.Image;
    const id = pickup.getData("itemId") as string;
    const config = this.itemPool.find((entry) => entry.id === id);
    if (!config) return;
    pickup.destroy();
    this.state.activeItem = {
      config,
      usesLeft: config.uses,
      remainingMs: undefined,
      activated: false
    };
    this.sound.play("sfx_item_pickup", { volume: 0.72 });
    this.showToast(`获得 ${config.name}`);
  }

  private onPlayerEnemy(_playerObj: unknown, enemyObj: unknown) {
    const enemy = enemyObj as Phaser.Physics.Arcade.Image;
    if (!enemy.active || enemy.getData("defeated") || this.state.locked) return;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const isStomp = this.isStompingEnemy(enemy);
    if (isStomp || this.time.now < this.state.starUntil) {
      this.player.setDepth(12);
      playerBody.setVelocityY(enemy.getData("kind") === "sister_balloon" ? -650 : -460);
      this.crushEnemy(enemy);
      this.sound.play("sfx_player_stomp", { volume: 0.65 });
      return;
    }
    if (!this.canPlayerTakeDamageFromEnemy(enemy)) return;
    this.separatePlayerFromEnemy(enemy);
    this.hurtPlayer(1, this.player.x < enemy.x ? -1 : 1);
  }

  private resolvePlayerEnemyVisualOverlap() {
    if (this.state.locked) return;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.enemies.children.iterate((child) => {
      if (!child) return true;
      const enemy = child as Phaser.Physics.Arcade.Image;
      if (!enemy.active || enemy.getData("defeated")) return true;
      const xGap = Math.abs(this.player.x - enemy.x);
      const yGap = Math.abs(this.player.y - enemy.y);
      const visualXLimit = this.player.displayWidth * 0.42 + enemy.displayWidth * 0.38;
      const visualYLimit = this.player.displayHeight * 0.35 + enemy.displayHeight * 0.32;
      if (xGap > visualXLimit || yGap > visualYLimit) return true;

      const fallingOntoEnemy = playerBody.velocity.y > 40 && this.player.y + this.player.displayHeight * 0.2 < enemy.y;
      if (fallingOntoEnemy || this.isStompingEnemy(enemy)) {
        this.player.setDepth(12);
        playerBody.setVelocityY(enemy.getData("kind") === "sister_balloon" ? -650 : -460);
        this.crushEnemy(enemy);
        this.sound.play("sfx_player_stomp", { volume: 0.65 });
      } else if (this.canPlayerTakeDamageFromEnemy(enemy)) {
        this.separatePlayerFromEnemy(enemy);
        this.hurtPlayer(1, this.player.x < enemy.x ? -1 : 1);
      }
      return true;
    });
  }

  private isStompingEnemy(enemy: Phaser.Physics.Arcade.Image) {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
    const previousBottom = ((playerBody as unknown as { prev?: Phaser.Math.Vector2 }).prev?.y ?? playerBody.y) + playerBody.height;
    const currentBottom = playerBody.y + playerBody.height;
    const enemyTop = enemyBody.y + 8;
    return playerBody.velocity.y > 70 && previousBottom <= enemyTop + 34 && currentBottom <= enemyTop + 82;
  }

  private separatePlayerFromEnemy(enemy: Phaser.Physics.Arcade.Image) {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const direction = this.player.x < enemy.x ? -1 : 1;
    const minGap = (playerBody.width + ((enemy.body as Phaser.Physics.Arcade.Body).width || enemy.displayWidth)) * 0.5 + 18;
    this.player.x = enemy.x + direction * minGap;
    playerBody.setVelocityX(direction * 360);
  }

  private onProjectileEnemy(projectileObj: unknown, enemyObj: unknown) {
    const projectile = projectileObj as Phaser.Physics.Arcade.Image;
    const enemy = enemyObj as Phaser.Physics.Arcade.Image;
    this.hitEnemyWithProjectile(projectile, enemy);
  }

  private hitEnemyWithProjectile(projectile: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Image) {
    if (!projectile.active || projectile.getData("spent") || !enemy.active || enemy.getData("defeated")) return;
    projectile.setData("spent", true);
    const damage = projectile.getData("damage") as number;
    const freezes = projectile.getData("freezes") as boolean;
    if (freezes) enemy.setData("frozenUntil", this.time.now + 2000);
    this.spawnHitSpark(enemy.x, enemy.y - enemy.displayHeight * 0.28);
    if (enemy.getData("kind") === "sister_boss") {
      this.damageEnemy(enemy, damage ?? 1);
    } else {
      this.sound.play("sfx_sister_hit", { volume: 0.58 });
      this.defeatEnemy(enemy, false);
    }
    projectile.destroy();
  }

  private onCheckpoint() {
    if (this.checkpoint.getData("active")) return;
    this.checkpoint.setData("active", true);
    this.checkpoint.setTint(0x89ffb1);
    this.state.checkpoint.set(this.checkpoint.x, this.checkpoint.y + 70);
    this.showToast("检查点保存！");
  }

  private onGoal() {
    if (!this.bossCleared && this.enemies.children.entries.some((enemy) => enemy.active && enemy.getData("kind") === "sister_boss")) {
      this.showToast("先把 Boss 姐姐打到服气！");
      return;
    }
    this.finishLevel();
  }

  private spawnPickup(id: string, x: number, y: number) {
    const textureKey = this.textures.exists(`item-display:${id}`) ? `item-display:${id}` : `item:${id}`;
    const glow = this.add.circle(x, y, 34, 0x93e9ff, 0.24).setDepth(8);
    glow.setStrokeStyle(2, 0xffffff, 0.4);
    const pickup = this.pickups.create(x, y, textureKey) as Phaser.Physics.Arcade.Image;
    pickup.setDisplaySize(PICKUP_DISPLAY_MAX, PICKUP_DISPLAY_MAX);
    pickup.setData("itemId", id);
    pickup.setData("glow", glow);
    pickup.setData("spawnedFromBlock", false);
    pickup.setDepth(9);
    const pickupBody = pickup.body as Phaser.Physics.Arcade.Body;
    pickupBody.setAllowGravity(false);
    pickupBody.setImmovable(true);
    pickupBody.setSize(40, 40, true);
    pickup.once("destroy", () => {
      this.tweens.killTweensOf(pickup);
      this.tweens.killTweensOf(glow);
      glow.destroy();
    });
    this.tweens.add({ targets: [pickup, glow], y: y - 12, yoyo: true, repeat: -1, duration: 700, ease: "Sine.inOut" });
    this.tweens.add({ targets: glow, scale: 1.22, alpha: 0.1, yoyo: true, repeat: -1, duration: 520, ease: "Sine.inOut" });
    this.tweens.add({ targets: pickup, angle: 8, yoyo: true, repeat: -1, duration: 620, ease: "Sine.inOut" });
  }

  private spawnBlockPickup(id: string, x: number, y: number) {
    this.createRoundItemTexture(id);
    const textureKey = this.textures.exists(`pickup-round:${id}`)
      ? `pickup-round:${id}`
      : this.textures.exists(`item-display:${id}`)
        ? `item-display:${id}`
        : `item:${id}`;
    const glow = this.add.circle(x, y, 30, 0x93e9ff, 0.18).setDepth(8);
    glow.setStrokeStyle(2, 0xffffff, 0.35);
    const pickup = this.pickups.create(x, y, textureKey) as Phaser.Physics.Arcade.Image;
    pickup.setDisplaySize(PICKUP_DISPLAY_MAX, PICKUP_DISPLAY_MAX);
    pickup.setData("itemId", id);
    pickup.setData("glow", glow);
    pickup.setData("spawnedFromBlock", true);
    pickup.setData("spawnedAt", this.time.now);
    pickup.setData("despawnAt", this.time.now + Phaser.Math.Between(BLOCK_PICKUP_MIN_LIFE_MS, BLOCK_PICKUP_MAX_LIFE_MS));
    pickup.setDepth(9);
    const pickupBody = pickup.body as Phaser.Physics.Arcade.Body;
    pickupBody.setAllowGravity(true);
    pickupBody.setImmovable(false);
    pickupBody.setBounce(0.15, 0.08);
    pickupBody.setCircle(18);
    pickupBody.setVelocity(this.state.facing * BLOCK_PICKUP_ROLL_SPEED, -140);
    pickup.once("destroy", () => {
      this.tweens.killTweensOf(pickup);
      this.tweens.killTweensOf(glow);
      glow.destroy();
    });
    this.tweens.add({ targets: pickup, angle: 360, repeat: -1, duration: 900, ease: "Linear" });
  }

  private useCurrentItem() {
    const item = this.state.activeItem;
    if (!item) {
      this.showToast("还没有道具");
      return;
    }

    const id = item.config.id;
    if (item.activated && item.remainingMs !== undefined) return;

    if (["fireball_candy", "boomerang_toy", "ice_cream_blaster", "popcorn_bomb"].includes(id)) {
      this.spawnPlayerProjectile(id);
      item.usesLeft = Math.max(0, (item.usesLeft ?? 1) - 1);
      if (item.usesLeft <= 0) this.clearItem("道具用完啦！");
      return;
    }

    if (id === "toy_hammer") {
      this.swingHammer();
      item.usesLeft = Math.max(0, (item.usesLeft ?? 1) - 1);
      if (item.usesLeft <= 0) this.clearItem("道具用完啦！");
      return;
    }

    if (id === "bubble_shield") {
      this.activateBubbleShield();
      this.clearItem();
      return;
    }

    const duration = (item.config.durationSeconds ?? 6) * 1000;
    item.activated = true;
    item.remainingMs = duration;
    const until = this.time.now + duration;
    if (id === "star_cape") this.state.starUntil = until;
    if (id === "bouncy_shoes") this.state.bouncyUntil = until;
    if (id === "flying_cap") this.state.flyingUntil = until;
    if (id === "giant_cookie") {
      this.state.giantUntil = until;
      const giantDisplay = this.getAspectDisplaySize("brother_player", CHAR_HEIGHT.playerGiant);
      this.player.setDisplaySize(giantDisplay.w, giantDisplay.h);
      this.playerBaseScaleX = this.player.scaleX;
      this.playerBaseScaleY = this.player.scaleY;
      this.resetPlayerBodyBox();
      this.rebuildPlayerVisual();
    }
    this.showToast(`${item.config.name} 启动！`);
  }

  private activateBubbleShield() {
    this.state.bubbleShield = true;
    this.bubbleShieldVisual?.destroy();
    this.bubbleShieldVisual = this.add.circle(this.player.x, this.player.y - 6, 58, 0x7fdfff, 0.18).setDepth(13);
    this.bubbleShieldVisual.setStrokeStyle(4, 0xe8fbff, 0.82);
    this.tweens.add({
      targets: this.bubbleShieldVisual,
      scale: 1.12,
      alpha: 0.34,
      yoyo: true,
      repeat: -1,
      duration: 520,
      ease: "Sine.inOut"
    });
    this.showToast("泡泡盾展开！");
  }

  private updateBubbleShieldVisual(time: number) {
    if (!this.bubbleShieldVisual) return;
    if (!this.state.bubbleShield || !this.player.active) {
      this.bubbleShieldVisual.destroy();
      this.bubbleShieldVisual = undefined;
      return;
    }
    const pulse = Math.sin(time / 120) * 0.04;
    this.bubbleShieldVisual.setPosition(this.player.x, this.player.y - 6);
    this.bubbleShieldVisual.setScale(1 + pulse, 0.92 + pulse);
  }

  private breakBubbleShield(knockbackDirection: number, fromPit: boolean) {
    this.state.bubbleShield = false;
    this.sound.play("sfx_bubble_shield_break", { volume: 0.78 });
    this.showToast("泡泡盾挡住了一次！");
    this.state.invincibleUntil = this.time.now + 900;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(knockbackDirection * 260, fromPit ? -520 : -260);
    this.player.x += knockbackDirection * 18;

    if (this.bubbleShieldVisual) {
      this.tweens.killTweensOf(this.bubbleShieldVisual);
      this.tweens.add({
        targets: this.bubbleShieldVisual,
        scale: 1.65,
        alpha: 0,
        duration: 220,
        ease: "Quad.easeOut",
        onComplete: () => {
          this.bubbleShieldVisual?.destroy();
          this.bubbleShieldVisual = undefined;
        }
      });
    }
  }

  private spawnPlayerProjectile(itemId: string) {
    const projectileKey =
      itemId === "ice_cream_blaster" ? "projectile:ice" : itemId === "popcorn_bomb" ? "projectile:boom" : "projectile:fire";
    const projectile = this.projectiles.create(this.player.x + this.state.facing * 48, this.player.y - 22, projectileKey) as Phaser.Physics.Arcade.Image;
    projectile.setData("damage", itemId === "popcorn_bomb" ? 2 : 1);
    projectile.setData("freezes", itemId === "ice_cream_blaster");
    projectile.setData("spin", itemId === "boomerang_toy" ? 22 : itemId === "popcorn_bomb" ? 14 : 8);
    projectile.setData("nextTrailAt", 0);
    projectile.setDepth(12);
    projectile.setVelocityX(PROJECTILE_SPEED * this.state.facing);
    projectile.setVelocityY(itemId === "boomerang_toy" ? -90 : 0);
    (projectile.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.sound.play(itemId === "fireball_candy" ? "sfx_fire_candy_shoot" : "sfx_toy_hammer_hit", { volume: 0.58 });
    if (itemId === "boomerang_toy") {
      this.tweens.add({
        targets: projectile,
        x: this.player.x,
        duration: 820,
        delay: 280,
        onComplete: () => projectile.destroy()
      });
    }
  }

  private spawnEnemyProjectile(enemy: Phaser.Physics.Arcade.Image, profile: EnemyThrowProfile) {
    const direction = this.player.x >= enemy.x ? 1 : -1;
    const key = profile.key;
    const spawnX = enemy.x + direction * (profile.balloonDrop ? 8 : 48);
    const spawnY = profile.balloonDrop ? enemy.y + 28 : enemy.y - 22;
    const projectile = this.enemyProjectiles.create(spawnX, spawnY, key) as Phaser.Physics.Arcade.Image;
    const size = key === "projectile:boom" ? { w: 36, h: 28 } : key === "projectile:wave" ? { w: 40, h: 22 } : { w: 26, h: 26 };
    projectile.setDisplaySize(size.w, size.h);
    projectile.setData("spin", key === "projectile:boom" ? 10 : key === "projectile:wave" ? 5 : 8);
    projectile.setData("nextTrailAt", 0);
    projectile.setData("enemyThrown", true);
    projectile.setData("damage", profile.damage);
    projectile.setVelocityX(profile.speedX * direction);
    projectile.setVelocityY(profile.speedY);
    projectile.setDepth(11);
    (projectile.body as Phaser.Physics.Arcade.Body).setAllowGravity(profile.gravity);
    const sfx =
      key === "projectile:boom"
        ? "sfx_boss_book_throw"
        : key === "projectile:wave"
          ? "sfx_headphone_wave"
          : key === "projectile:ice"
            ? "sfx_pipe_sister_pop"
            : "sfx_toy_hammer_hit";
    this.sound.play(sfx, { volume: key === "projectile:wave" ? 0.5 : 0.42, rate: key === "projectile:toy" ? 1.15 : 1 });
  }

  private swingHammer() {
    const hitX = this.player.x + this.state.facing * 80;
    const hitbox = new Phaser.Geom.Rectangle(hitX - 58, this.player.y - 86, 116, 112);
    let hit = false;
    this.enemies.children.iterate((child) => {
      const enemy = child as Phaser.Physics.Arcade.Image;
      if (enemy.active && !enemy.getData("defeated") && hitbox.contains(enemy.x, enemy.y)) {
        this.damageEnemy(enemy, 2);
        hit = true;
      }
      return true;
    });
    this.sound.play("sfx_toy_hammer_hit", { volume: 0.7 });
    this.showToast(hit ? "玩具锤命中！" : "挥空啦");
  }

  private damageEnemy(enemy: Phaser.Physics.Arcade.Image, damage: number) {
    const hp = (enemy.getData("hp") as number) - damage;
    enemy.setData("hp", hp);
    const visual = enemy.getData("visual") as CharacterVisual | undefined;
    const hitTargets = this.getCharacterVisualParts(visual);
    hitTargets.forEach((part) => part.setTint(0xfff0a5));
    this.sound.play("sfx_sister_hit", { volume: 0.58 });
    this.spawnHitSpark(enemy.x, enemy.y - enemy.displayHeight * 0.18);
    this.tweens.add({
      targets: hitTargets.length > 0 ? hitTargets : enemy,
      scaleX: "*=1.08",
      scaleY: "*=0.92",
      yoyo: true,
      duration: 90,
      onComplete: () => {
        hitTargets.forEach((part) => part.clearTint());
        enemy.clearTint();
      }
    });
    if (hp > 0) return;

    this.defeatEnemy(enemy, false);
  }

  private crushEnemy(enemy: Phaser.Physics.Arcade.Image) {
    const isBoss = enemy.getData("kind") === "sister_boss";
    if (isBoss) {
      this.damageEnemy(enemy, 1);
      return;
    }
    this.defeatEnemy(enemy, true);
  }

  private defeatEnemy(enemy: Phaser.Physics.Arcade.Image, flattened: boolean) {
    if (enemy.getData("defeated")) return;
    enemy.setData("defeated", true);
    this.state.defeatedEnemies += 1;
    const isBoss = enemy.getData("kind") === "sister_boss";
    const groundY = enemy.y + enemy.displayHeight * 0.34;
    const fallDirection = this.player.x <= enemy.x ? 1 : -1;
    this.destroyCharacterVisual(enemy.getData("visual") as CharacterVisual | undefined);
    enemy.setData("visual", undefined);
    enemy.setTexture("sister_cry_defeated");
    enemy.setVelocity(0, 0);
    enemy.disableBody(false, false);
    enemy.setVisible(true);
    enemy.setDepth(8);
    enemy.clearTint();
    this.tweens.killTweensOf(enemy);
    if (flattened) {
      this.spawnStompStars(enemy.x, enemy.y - enemy.displayHeight * 0.5);
      this.spawnSisterFallEffects(enemy.x, groundY, fallDirection);
      enemy.setFlipX(fallDirection < 0);
      enemy.setOrigin(0.5, 0.78);
      const cryDisplay = this.getAspectDisplaySize("sister_cry_defeated", 116);
      enemy.setDisplaySize(cryDisplay.w, cryDisplay.h);
      enemy.setPosition(enemy.x + fallDirection * 10, groundY - 4);
      enemy.setAngle(fallDirection * 68);
      this.showToast("姐姐被踩倒了！");
      this.tweens.add({
        targets: enemy,
        y: groundY + 2,
        angle: fallDirection * 82,
        scaleX: enemy.scaleX * 1.08,
        scaleY: enemy.scaleY * 0.92,
        yoyo: true,
        duration: 130,
        ease: "Back.easeOut"
      });
    }
    this.tweens.add({
      targets: enemy,
      y: flattened ? groundY - 8 : enemy.y - 38,
      alpha: 0,
      scaleX: flattened ? enemy.scaleX * 0.96 : enemy.scaleX,
      scaleY: flattened ? enemy.scaleY * 0.96 : enemy.scaleY,
      angle: flattened ? fallDirection * 86 : 16,
      delay: flattened ? 900 : 0,
      duration: isBoss ? 1200 : flattened ? 760 : 420,
      onComplete: () => {
        enemy.destroy();
        if (isBoss) {
          this.bossCleared = true;
          this.showToast("Boss 姐姐被打到服气啦！");
        }
      }
    });
  }

  private spawnSisterFallEffects(x: number, groundY: number, direction: number) {
    const shadow = this.add.ellipse(x, groundY + 12, 110, 24, 0x1d3a18, 0.28).setDepth(7);
    this.tweens.add({
      targets: shadow,
      alpha: 0,
      scaleX: 0.72,
      scaleY: 0.7,
      delay: 920,
      duration: 620,
      onComplete: () => shadow.destroy()
    });

    for (let i = 0; i < 3; i += 1) {
      const tear = this.add.circle(x - direction * (28 + i * 8), groundY - 48 - i * 6, 4, 0x7fdfff, 0.9).setDepth(31);
      this.tweens.add({
        targets: tear,
        x: tear.x - direction * Phaser.Math.Between(18, 34),
        y: tear.y + Phaser.Math.Between(18, 32),
        alpha: 0,
        scale: 0.35,
        delay: i * 65,
        duration: 430,
        ease: "Quad.easeOut",
        onComplete: () => tear.destroy()
      });
    }
  }

  private spawnProjectileTrail(projectile: Phaser.Physics.Arcade.Image) {
    const trail = this.add.image(projectile.x, projectile.y, projectile.texture.key);
    trail.setDepth(projectile.depth - 1);
    trail.setAlpha(0.28);
    trail.setScale(projectile.scaleX * 0.8, projectile.scaleY * 0.8);
    trail.setTint(0xffffff);
    this.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: trail.scaleX * 0.35,
      scaleY: trail.scaleY * 0.35,
      duration: 190,
      onComplete: () => trail.destroy()
    });
  }

  private spawnHitSpark(x: number, y: number) {
    const spark = this.add.image(x, y, "hit:spark").setDepth(30).setScale(0.25).setAlpha(0.95);
    this.tweens.add({
      targets: spark,
      scale: 1.15,
      alpha: 0,
      angle: 40,
      duration: 240,
      ease: "Quad.easeOut",
      onComplete: () => spark.destroy()
    });
  }

  private spawnStompStars(x: number, y: number) {
    for (let i = 0; i < 5; i += 1) {
      const star = this.add.image(x, y, "stomp:star").setDepth(31).setScale(0.4).setAlpha(0.95);
      const angle = -Math.PI + (i / 4) * Math.PI;
      this.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * Phaser.Math.Between(34, 74),
        y: y + Math.sin(angle) * Phaser.Math.Between(34, 60),
        scale: 0.05,
        alpha: 0,
        angle: Phaser.Math.Between(-120, 120),
        duration: 520,
        ease: "Quad.easeOut",
        onComplete: () => star.destroy()
      });
    }
  }

  private storeBodyPreviousPositions() {
    const store = (body: ArcadeBodyWithPrev) => {
      if (!body.prev) body.prev = new Phaser.Math.Vector2();
      body.prev.set(body.x, body.y);
    };
    store(this.player.body as ArcadeBodyWithPrev);
    this.enemies?.children.iterate((child) => {
      if (child) store((child as Phaser.Physics.Arcade.Image).body as ArcadeBodyWithPrev);
      return true;
    });
  }

  private hurtPlayer(amount: number, knockbackDirection: number, fromPit = false) {
    const now = this.time.now;
    if (now < this.state.starUntil || this.state.locked) return;

    if (fromPit) {
      if (this.state.bubbleShield) {
        this.breakBubbleShield(knockbackDirection, true);
        this.player.setPosition(this.state.checkpoint.x, this.state.checkpoint.y);
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        return;
      }
      if (now < this.state.invincibleUntil) return;
      this.failAndRestartLevel("掉下去了，重新来！");
      return;
    }

    if (now < this.state.invincibleUntil) return;

    if (this.state.bubbleShield) {
      this.breakBubbleShield(knockbackDirection, false);
      return;
    }

    this.state.hp = Math.max(0, this.state.hp - amount);
    this.state.invincibleUntil = now + INVINCIBLE_MS;
    this.sound.play("sfx_player_hurt", { volume: 0.72 });

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(knockbackDirection * 280, -220);
    this.player.x += knockbackDirection * 14;
    this.cameras.main.shake(90, 0.005);

    if (this.state.hp <= 0) {
      this.failAndRestartLevel("被打到啦，重新来！");
    } else {
      this.showToast(`还有 ${this.state.hp} 颗心！`, 900);
    }
  }

  private failAndRestartLevel(message: string) {
    if (this.state.locked) return;
    this.state.locked = true;
    this.state.hp = 0;
    this.state.bubbleShield = false;
    this.state.invincibleUntil = 0;
    this.state.activeItem = undefined;
    this.physics.world.timeScale = 1;
    this.playerShadow?.setVisible(false);
    this.bubbleShieldVisual?.destroy();
    this.bubbleShieldVisual = undefined;
    this.projectiles?.clear(true, true);
    this.enemyProjectiles?.clear(true, true);
    this.enemies?.children.iterate((child) => {
      const enemy = child as Phaser.Physics.Arcade.Image | undefined;
      enemy?.setVelocity(0, 0);
      return true;
    });

    this.showPlayerCryVisual();
    this.player.setDepth(20);
    this.player.setVelocity(0, 0);
    const cryDisplay = this.getAspectDisplaySize("brother_cry_defeat", CHAR_HEIGHT.playerCry);
    this.setFeetAlignedBodyBox(
      this.player,
      this.scaleBodyBox(CHAR_BODY.playerCry, CHAR_DISPLAY_REF.playerCry, cryDisplay)
    );
    this.syncPlayerBodyPosition();
    this.sound.stopAll();
    this.sound.play("sfx_player_cry", { volume: 0.85 });
    this.cameras.main.shake(180, 0.007);
    this.showToast(message, 900);
    this.time.delayedCall(900, () => {
      this.scene.restart({ levelIndex: this.levelIndex });
    });
  }

  private expireTimedItem(id: string) {
    if (id === "star_cape") this.state.starUntil = 0;
    if (id === "bouncy_shoes") this.state.bouncyUntil = 0;
    if (id === "flying_cap") this.state.flyingUntil = 0;
    if (id === "giant_cookie") {
      this.state.giantUntil = 0;
      const playerDisplay = this.getAspectDisplaySize("brother_player", CHAR_HEIGHT.player);
      this.player.setDisplaySize(playerDisplay.w, playerDisplay.h);
      this.playerBaseScaleX = this.player.scaleX;
      this.playerBaseScaleY = this.player.scaleY;
      this.rebuildPlayerVisual();
      this.resetPlayerBodyBox();
    }
    this.clearItem("道具用完啦！");
  }

  private clearItem(message?: string) {
    this.state.activeItem = undefined;
    if (message) this.showToast(message);
  }

  private cryAndRestart() {
    this.state.locked = true;
    this.physics.world.timeScale = 0.55;
    this.playerShadow?.setVisible(false);
    this.showPlayerCryVisual();
    this.player.setVelocity(0, 0);
    this.sound.stopAll();
    this.sound.play("sfx_player_cry", { volume: 0.85 });
    this.showToast("弟弟哭啦！");
    this.time.delayedCall(1400, () => {
      this.physics.world.timeScale = 1;
      this.scene.start("GameOverScene", { levelIndex: this.levelIndex });
    });
  }

  private finishLevel() {
    if (this.state.locked) return;
    this.state.locked = true;
    this.sound.play("sfx_goal_flag", { volume: 0.72 });
    this.tweens.add({ targets: this.player, y: this.player.y - 44, yoyo: true, duration: 260 });
    this.time.delayedCall(650, () => this.scene.start("VictoryScene", { levelIndex: this.levelIndex }));
  }

  private showToast(text: string, duration = 1500) {
    this.hud?.hint.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.hud?.hint);
    this.tweens.add({
      targets: this.hud?.hint,
      alpha: 0,
      delay: duration,
      duration: 280
    });
  }
}
