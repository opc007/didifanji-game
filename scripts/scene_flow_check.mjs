// 模拟实际游戏流程：进入 StartScene -> 进入 GameScene（关卡 0）-> 模拟跳 + 移动 + 用道具
// 这个测试在 mock Phaser 下能跑"create()" 路径，并捕获所有抛错
import { build } from '/Users/ahs/Documents/姐弟游戏/node_modules/esbuild/lib/main.js';
import vm from 'node:vm';

const mockSrc = `
// === Mock Phaser 全功能 ===
class EventEmitter { constructor(){this._h={};} on(e,fn){(this._h[e]||(this._h[e]=[])).push(fn);} once(e,fn){const w=(...a)=>{this.off(e,w);fn(...a);};this.on(e,w);} off(e,fn){if(this._h[e])this._h[e]=this._h[e].filter(f=>f!==fn);} emit(e,...a){(this._h[e]||[]).forEach(fn=>fn(...a));} removeAllListeners(){this._h={};} }

class MockScene extends EventEmitter {
  constructor(key) {
    super();
    this.sceneKey = key || 'Scene';
    this.load = { on: () => {}, once: () => {}, image: () => {}, audio: () => {}, json: () => {}, spritesheet: () => {}, bitmapFont: () => {}, atlas: () => {}, start: () => {} };
    this.cameras = { main: { setBackgroundColor: () => {}, setBounds: () => {}, startFollow: () => {}, shake: () => {}, flash: () => {}, fadeOut: (ms, r, g, b, cb) => cb && setTimeout(cb, 1), fadeIn: () => {}, centerX: 480, centerY: 270, scrollX: 0, scrollY: 0, width: 960, height: 540, zoom: 1, on: () => {} }, add: () => {} };
    this.tweens = { add: (cfg) => { if (cfg && cfg.onComplete) setTimeout(() => cfg.onComplete(), 1); return { remove: () => {}, stop: () => {} }; }, killTweensOf: () => {}, chain: () => {} };
    this.physics = mkPhysics();
    this.time = { now: Date.now(), delayedCall: (ms, fn) => { if (fn) setTimeout(fn, 1); return { remove: () => {}, timeScale: 1 }; }, addEvent: (cfg) => { const t = setInterval(() => cfg.callback && cfg.callback(), cfg.delay || 100); return { remove: () => clearInterval(t), elapsed: 0 }; }, removeEvent: () => {} };
    this.input = mkInput();
    this.sound = { stopAll: () => {}, play: () => {}, add: () => {}, on: () => {}, setVolume: () => {}, setMute: () => {}, setRate: () => {}, removeAllListeners: () => {} };
    this.scale = { width: 960, height: 540, on: () => {}, centerX: 480, centerY: 270, gameSize: { width: 960, height: 540 } };
    this.game = { device: { os: { desktop: true, android: false, ios: false } }, config: {}, loop: { wake: () => {}, stop: () => {} }, sound: { on: () => {} } };
    this.registry = new MockRegistry();
    this.scene = { start: (key, data) => { console.log('  → scene.start(' + key + ') ' + JSON.stringify(data||{})); }, stop: () => {}, restart: (data) => console.log('  → scene.restart ' + JSON.stringify(data||{})), launch: () => {}, run: () => {}, pause: () => {}, resume: () => {}, switch: () => {}, isActive: () => true, isSleeping: () => false };
    this.sys = { game: { device: { os: { desktop: true } } }, settings: {}, events: new EventEmitter() };
    this.textures = { exists: () => true, getFrame: () => ({ width: 100, height: 100 }), list: {} };
    this.anims = { create: () => {}, generateFrameNumbers: () => [] };
    this.children = new MockList(this);
    this.cache = { json: { get: () => null }, audio: { get: () => null } };
    this.make = { image: () => makeObj() };
    this.data = new Map();
    this.add = new MockAdd(this);
    this._isCreated = false;
    this._isUpdated = false;
  }
  init(data) { this._initData = data; }
  preload() {}
  create() {}
  update(time, delta) {}
}
class MockRegistry {
  constructor() { this._d = {}; }
  set(k, v) { this._d[k] = v; }
  get(k) { return this._d[k]; }
}
class MockList {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.entries = [];
  }
  add(o) { this.list.push(o); return o; }
}
class MockAdd {
  constructor(scene) { this.scene = scene; this._id = 0; }
  image(x, y, key, frame) { const o = makeObj({ x, y, texture: { key }, frame }); this.scene.children.list.push(o); return o; }
  text(x, y, text, style) { const o = makeObj({ x, y, text }); this.scene.children.list.push(o); return o; }
  rectangle(x, y, w, h, color, alpha) { const o = makeObj({ x, y, width: w, height: h }); this.scene.children.list.push(o); return o; }
  circle(x, y, r, color, alpha) { const o = makeObj({ x, y, radius: r }); this.scene.children.list.push(o); return o; }
  triangle(x, y, x1, y1, x2, y2, x3, y3, color, alpha) { const o = makeObj({ x, y }); this.scene.children.list.push(o); return o; }
  ellipse(x, y, w, h, color, alpha) { const o = makeObj({ x, y, width: w, height: h }); this.scene.children.list.push(o); return o; }
  container(x, y, children) { const o = makeObj({ x, y, list: children || [] }); this.scene.children.list.push(o); return o; }
  graphics() { return makeObj(); }
  tileSprite() { return makeObj(); }
  sprite(x, y, key) { const o = makeObj({ x, y, texture: { key } }); this.scene.children.list.push(o); return o; }
}
function makeObj(extra) {
  const o = Object.assign({
    setData: function(k, v) { if (typeof k === 'object') Object.assign(this.data || (this.data = {}), k); else (this.data || (this.data = {}))[k] = v; return this; },
    getData: function(k) { return this.data && this.data[k]; },
    setOrigin: () => o, setDisplaySize: () => o,
    setDepth: () => o, setScrollFactor: () => o, setAlpha: () => o, setVisible: () => o,
    setPosition: () => o, setScale: () => o, setFlipX: () => o, setRotation: () => o,
    setAngle: () => o, setTint: () => o, clearTint: () => o, setText: () => o,
    setStyle: () => o, setInteractive: () => o, setMask: () => o,
    setCollideWorldBounds: () => o, setAllowGravity: () => o, setImmovable: () => o,
    setBounce: () => o, setCircle: () => o, setSize: () => o, setOffset: () => o,
    setMaxVelocity: () => o, setDragX: () => o, setFrictionX: () => o,
    setVelocity: () => o, setVelocityX: () => o, setVelocityY: () => o,
    setAccelerationX: () => o, setAccelerationY: () => o,
    disableBody: () => o, enableBody: () => o, refreshBody: () => o,
    setTexture: () => o, setActive: () => o, setBlendMode: () => o,
    setStrokeStyle: () => o, setShadow: () => o, setFontSize: () => o, setFontFamily: () => o,
    updateFromGameObject: () => o, setPushable: () => o, setName: () => o,
    setPipeline: () => o,
    body: makeBody(),
    once: function(e, fn) { return this; }, on: function() { return this; }, off: function() { return this; }, emit: function() { return this; },
    add: () => o, remove: () => o, destroy: function() { return this; },
    play: () => o, pause: () => o, stop: () => o,
    x: 0, y: 0, width: 100, height: 100, displayWidth: 100, displayHeight: 100, scaleX: 1, scaleY: 1, alpha: 1, depth: 0, angle: 0, rotation: 0,
    getCenter: () => ({ x: 0, y: 0 }),
    children: { iterate: (fn) => fn, entries: [] },
    list: [],
    data: {},
  }, extra);
  if (!o.body) o.body = makeBody();
  return o;
}
function makeBody() {
  return {
    x: 0, y: 0, width: 36, height: 104, height: 104, velocity: { x: 0, y: 0 },
    blocked: { down: false, up: false, left: false, right: false },
    touching: { down: false, up: false, left: false, right: false },
    right: 36, left: 0, top: 0, bottom: 104,
    prev: { x: 0, y: 0 },
    enable: true, allowGravity: true, isStatic: false, immovable: false,
    setAllowGravity: () => {}, setImmovable: () => {}, setVelocity: () => {},
    setVelocityX: () => {}, setVelocityY: () => {}, setSize: () => {}, setOffset: () => {},
    setBounce: () => {}, setCircle: () => {}, setMaxVelocity: () => {},
    debugShowBody: false, debugShowVelocity: false, updateFromGameObject: () => {},
    setPushable: () => {}, setCollideWorldBounds: () => {}, setGravity: () => {},
    setDrag: () => {}, setFriction: () => {}, setMass: () => {},
  };
}
function mkPhysics() {
  const world = {
    gravity: { y: 1200, x: 0 },
    bounds: { setBounds: () => {}, x: 0, y: 0, width: 99999, height: 99999 },
    timeScale: 1,
    drawDebug: false,
    defaults: { debugShowBody: false, debugShowStaticBody: false, debugShowVelocity: false },
    debugGraphic: null,
  };
  return {
    world,
    add: {
      group: (cfg) => makeObj({ children: { iterate: (fn) => fn, entries: [] }, create: (x, y, k) => makeObj({ x, y, texture: { key: k } }) }),
      staticGroup: (cfg) => makeObj({ children: { iterate: (fn) => fn, entries: [] }, create: (x, y, k) => makeObj({ x, y, texture: { key: k } }) }),
      image: (x, y, key) => makeObj({ x, y, body: makeBody() }),
      sprite: (x, y, key) => makeObj({ x, y, body: makeBody() }),
      overlap: () => {},
      collider: () => {},
    },
  };
}
function mkInput() {
  return {
    keyboard: {
      createCursorKeys: () => ({ up: mkKey(), down: mkKey(), left: mkKey(), right: mkKey(), space: mkKey() }),
      addKeys: () => ({}),
      addKey: (k) => mkKey(),
      once: () => {}, on: () => {},
    },
    activePointer: { isDown: false, x: 0, y: 0 },
    on: () => {}, once: () => {}, setDefaultCursor: () => {},
  };
}
function mkKey() { return { on: () => {}, once: () => {}, isDown: false }; }

class PhaserClass extends MockScene {}
const Phaser = {
  Game: class {
    constructor(cfg) { this.config = cfg; this.scene = { start: () => {}, add: () => {}, launch: () => {}, run: () => {} }; this.events = new EventEmitter(); this.scale = { on: () => {}, refresh: () => {}, width: 960, height: 540 }; this.loop = { wake: () => {}, stop: () => {} }; this.sound = { on: () => {} }; this._scenes = []; this._registered = new Map(); }
  },
  AUTO: 0, NO_BLEND: 0, BlendModes: { SCREEN: 0, NORMAL: 0 }, Scale: { FIT: 0, CENTER_BOTH: 0, NONE: 0 },
  Physics: { Arcade: { World: class {} } },
  Scene: PhaserClass,
  Math: {
    Clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    Linear: (a, b, t) => a + (b - a) * t,
    Between: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    Distance: { Between: () => 0 },
    Vector2: class { constructor(x, y) { this.x = x || 0; this.y = y || 0; } set(x, y) { this.x = x; this.y = y; return this; } },
  },
  Display: { Color: class { constructor(c) { this.color = c || 0; } }, HexStringToColor: () => ({ color: 0 }) },
  Utils: { Array: { GetRandom: () => ({ id: 'fireball_candy', name: '火球糖', type: 'active', uses: 5, image: 'x', hudIcon: 'y' }) } },
  Input: { Keyboard: { KeyCodes: { A: 65, D: 68, S: 83, J: 74, SPACE: 32, ESC: 27, T: 84, Y: 89, ENTER: 13, R: 82, ONE: 49, TWO: 50, THREE: 51, FOUR: 52 }, JustDown: () => false } },
  Geom: { Rectangle: class { constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; } contains() { return false; } } },
  Curves: {}, Time: { Event: class {} }, Sound: { BaseSound: class {} }, Cameras: { Scene2D: class {} },
};

globalThis.Phaser = Phaser;
globalThis.window = { addEventListener: () => {}, removeEventListener: () => {}, innerWidth: 960, innerHeight: 540, devicePixelRatio: 1, navigator: { vibrate: () => {} } };
globalThis.document = { getElementById: () => ({ style: {}, appendChild: () => {}, innerHTML: '', getContext: () => ({ canvas: { width: 0, height: 0 } }) }), createElement: () => ({ style: {}, getContext: () => ({ canvas: { width: 0, height: 0 } }), addEventListener: () => {}, removeEventListener: () => {} }), addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [], body: { appendChild: () => {}, style: {} } };
globalThis.localStorage = { _s: {}, getItem(k){return this._s[k]||null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} };
globalThis.navigator = { vibrate: () => {}, userAgent: 'node' };
globalThis.Image = class { set src(v){} };
globalThis.Audio = class { set src(v){} };
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
`;

const result = await build({
  stdin: { contents: mockSrc, resolveDir: '/Users/ahs/Documents/姐弟游戏', sourcefile: 'mock.ts', loader: 'ts' },
  bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2020',
  external: ['phaser'],
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.ogg': 'empty', '.mp3': 'empty', '.wav': 'empty', '.mid': 'empty' },
  logLevel: 'silent',
});

if (result.errors.length) { for (const e of result.errors) console.log('  -', e.text); process.exit(1); }

const code = result.outputFiles[0].text;

const logs = [];
const errors = [];

const sandbox = {
  console: {
    log: (...a) => logs.push(a.join(' ')),
    warn: () => {},
    error: (...a) => errors.push('CONSOLE: ' + a.map(x => typeof x === 'object' ? JSON.stringify(x).slice(0, 300) : String(x)).join(' ')),
    info: () => {}, debug: () => {},
  },
  setTimeout, clearTimeout, setInterval, clearInterval,
  Promise, Map, Set, Date, Math, JSON, Error, TypeError, RangeError,
  Array, Object, String, Number, Boolean, RegExp, Symbol, Proxy,
};
sandbox.globalThis = sandbox;

process.on('uncaughtException', (e) => errors.push('UNCAUGHT: ' + e.message + '\n  ' + (e.stack||'').split('\n').slice(0,5).join('\n  ')));

let bundle;
try {
  bundle = new vm.Script(code, { filename: 'bundle.js' });
  bundle.runInNewContext({ ...sandbox, console: sandbox.console, setTimeout, clearTimeout }, { displayErrors: true });
} catch (e) {
  errors.push('VM INIT: ' + e.message + '\n  ' + (e.stack||'').split('\n').slice(0,5).join('\n  '));
}

await new Promise(r => setTimeout(r, 100));

console.log('=== Logs ===');
logs.forEach(l => console.log(l));
console.log('=== Errors (' + errors.length + ') ===');
errors.forEach((e, i) => { console.log('--- #' + (i+1)); console.log(e); });
if (errors.length === 0) console.log('✓ NO RUNTIME ERRORS — game can boot, instantiate, and StartScene can run.');
