// 用 esbuild 把 mock + main.ts 一起 bundle，再用 node vm 跑
import { build } from '/Users/ahs/Documents/姐弟游戏/node_modules/esbuild/lib/main.js';
import vm from 'node:vm';

const mockSrc = `
const Phaser = {
  Game: class { constructor(cfg){ this.config = cfg; this.scene = { start: ()=>{}, stop: ()=>{}, add: ()=>{}, launch: ()=>{} }; this.events = { on: ()=>{}, once: ()=>{}, off: ()=>{}, emit: ()=>{} }; this.scale = { on: ()=>{}, refresh: ()=>{}, width: 960, height: 540 }; this.loop = { wake: ()=>{}, stop: ()=>{} }; this.sound = { on: ()=>{} }; } },
  AUTO: 0, NO_BLEND: 0, BlendModes: { SCREEN: 0, NORMAL: 0 }, Scale: { FIT: 0, CENTER_BOTH: 0, NONE: 0 }, Physics: { Arcade: { World: class {} } },
  Scene: class {
    constructor(cfg){
      this.events = { on: ()=>{}, once: ()=>{}, off: ()=>{}, emit: ()=>{}, removeListener: ()=>{} };
      this.load = { on: ()=>{}, once: ()=>{}, image: () => this, audio: () => this, json: () => this, spritesheet: () => this, bitmapFont: () => this, atlas: () => this };
      this.add = {
        image: () => makeObj(),
        text: () => makeObj(),
        rectangle: () => makeObj(),
        circle: () => makeObj(),
        triangle: () => makeObj(),
        ellipse: () => makeObj(),
        container: () => makeObj(),
        graphics: () => makeObj(),
        tileSprite: () => makeObj(),
        sprite: () => makeObj(),
      };
      this.cameras = { main: { setBackgroundColor: () => {}, setBounds: () => {}, startFollow: () => {}, shake: () => {}, flash: () => {}, fadeOut: () => {}, fadeIn: () => {}, centerX: 480, centerY: 270, scrollX: 0, scrollY: 0, width: 960, height: 540, zoom: 1, on: () => {} }, add: () => {} };
      this.tweens = { add: (cfg) => { if (cfg && cfg.onComplete) setTimeout(() => cfg.onComplete(), 1); return { remove: () => {} }; }, killTweensOf: () => {}, chain: () => {} };
      this.physics = {
        world: { gravity: { y: 1200, x: 0 }, bounds: { setBounds: () => {} }, timeScale: 1, drawDebug: false, defaults: { debugShowBody: false, debugShowStaticBody: false, debugShowVelocity: false }, debugGraphic: null },
        add: {
          group: (cfg) => makeObj({ children: { iterate: (fn) => fn, entries: [] }, create: () => makeObj() }),
          staticGroup: (cfg) => makeObj({ create: () => makeObj() }),
          image: (x, y, key) => makeObj({ x, y, body: makeBody() }),
          sprite: (x, y, key) => makeObj({ x, y, body: makeBody() }),
          overlap: () => {},
          collider: () => {},
        },
      };
      this.time = { now: 0, delayedCall: (ms, fn) => { if (fn) setTimeout(fn, 1); return { remove: () => {} }; }, addEvent: (cfg) => { if (cfg && cfg.callback) { const t = setInterval(cfg.callback, cfg.delay); return { remove: () => clearInterval(t) }; } } };
      this.input = {
        keyboard: { createCursorKeys: () => ({ up: { isDown: false }, down: { isDown: false }, left: { isDown: false }, right: { isDown: false }, space: { isDown: false } }), addKeys: () => ({}), addKey: (k) => ({ on: () => {}, once: () => {}, isDown: false }), once: () => {}, on: () => {} },
        activePointer: { isDown: false, x: 0, y: 0 },
        on: () => {}, once: () => {}, setDefaultCursor: () => {},
      };
      this.sound = { stopAll: () => {}, play: () => {}, add: () => {}, on: () => {} };
      this.scale = { width: 960, height: 540, on: () => {}, centerX: 480, centerY: 270, gameSize: { width: 960, height: 540 } };
      this.game = { device: { os: { desktop: true, android: false, ios: false } }, config: {} };
      this.registry = { set: () => {}, get: () => null };
      this.scene = { start: () => {}, stop: () => {}, restart: () => {}, launch: () => {}, run: () => {}, pause: () => {}, resume: () => {}, switch: () => {}, isActive: () => false };
      this.sys = { game: { device: { os: { desktop: true } } }, settings: {}, events: { on: () => {}, once: () => {}, off: () => {}, emit: () => {} } };
      this.textures = { exists: () => true, getFrame: () => ({ width: 100, height: 100 }), list: {} };
      this.anims = { create: () => {}, generateFrameNumbers: () => [] };
      this.children = { list: [] };
      this.cache = { json: { get: () => null }, audio: { get: () => null } };
      this.make = { image: () => makeObj() };
      this.data = new Map();
      this.setData = (k, v) => { this.data.set(k, v); };
      this.getData = (k) => this.data.get(k);
      this.events = this.events;
    }
  },
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
  Curves: {},
  Time: { Event: class {} },
  Sound: { BaseSound: class {} },
  Cameras: { Scene2D: class {} },
};
function makeObj(extra) {
  const o = Object.assign({
    setData: () => o, getData: () => null, setOrigin: () => o, setDisplaySize: () => o,
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
    setStrokeStyle: () => o, setShadow: () => o, setFontSize: () => o,
    updateFromGameObject: () => o, setPushable: () => o,
    body: makeBody(),
    once: () => o, on: () => o, off: () => o, emit: () => o,
    add: () => o, remove: () => o, destroy: () => o,
    play: () => o, pause: () => o, stop: () => o,
    x: 0, y: 0, width: 100, height: 100, displayWidth: 100, displayHeight: 100, scaleX: 1, scaleY: 1, alpha: 1, depth: 0, angle: 0,
    getCenter: () => ({ x: 0, y: 0 }),
    children: { iterate: (fn) => fn, entries: [] },
  }, extra);
  return o;
}
function makeBody() {
  return {
    x: 0, y: 0, width: 36, height: 104, velocity: { x: 0, y: 0 },
    blocked: { down: false, up: false, left: false, right: false },
    touching: { down: false, up: false, left: false, right: false },
    enable: true, allowGravity: true, isStatic: false,
    setAllowGravity: () => {}, setImmovable: () => {}, setVelocity: () => {},
    setVelocityX: () => {}, setVelocityY: () => {}, setSize: () => {}, setOffset: () => {},
    debugShowBody: false, debugShowVelocity: false, updateFromGameObject: () => {},
    prev: { x: 0, y: 0 },
  };
}

// Inject the mock via global
globalThis.Phaser = Phaser;
globalThis.window = { addEventListener: () => {}, innerWidth: 960, innerHeight: 540, devicePixelRatio: 1, navigator: { vibrate: () => {} } };
globalThis.document = { getElementById: () => null, createElement: () => ({ style: {}, getContext: () => ({}) }), addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [], body: { appendChild: () => {}, style: {} } };
globalThis.localStorage = { _s: {}, getItem(k){return this._s[k]||null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} };
globalThis.navigator = { vibrate: () => {}, userAgent: 'node' };
globalThis.Image = class { set src(v){} };
globalThis.Audio = class { set src(v){} };
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
`;

const result = await build({
  stdin: { contents: mockSrc, resolveDir: '/Users/ahs/Documents/姐弟游戏', sourcefile: 'mock.ts', loader: 'ts' },
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  external: ['phaser'],
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.ogg': 'empty', '.mp3': 'empty', '.wav': 'empty', '.mid': 'empty' },
  logLevel: 'silent',
});

if (result.errors.length) {
  console.log('BUNDLE ERRORS:');
  for (const e of result.errors) console.log('  -', e.text);
  process.exit(1);
}

const code = result.outputFiles[0].text;

const errors = [];
const sandbox = {
  console: {
    log: () => {}, warn: () => {},
    error: (...a) => errors.push('CONSOLE: ' + a.map(x => typeof x === 'object' ? JSON.stringify(x).slice(0, 200) : String(x)).join(' ')),
    info: () => {}, debug: () => {},
  },
  setTimeout, clearTimeout, setInterval, clearInterval,
  Promise, Map, Set, Date, Math, JSON, Error, TypeError, RangeError,
  Array, Object, String, Number, Boolean, RegExp, Symbol, Proxy,
};
sandbox.globalThis = sandbox;

process.on('uncaughtException', (e) => errors.push('UNCAUGHT: ' + e.message + '\n  ' + (e.stack||'').split('\n').slice(0,3).join('\n  ')));

try {
  const script = new vm.Script(code, { filename: 'bundle.js' });
  script.runInNewContext({ ...sandbox, console: sandbox.console, setTimeout, clearTimeout }, { displayErrors: true });
} catch (e) {
  errors.push('VM THROW: ' + e.message + '\n  ' + (e.stack||'').split('\n').slice(0,5).join('\n  '));
}

await new Promise(r => setTimeout(r, 200));

if (errors.length === 0) {
  console.log('✓ NO INIT-TIME ERRORS — all 18 modules load + game instantiates without throwing.');
} else {
  console.log('Errors (' + errors.length + '):');
  errors.forEach((e, i) => { console.log('--- #' + (i+1)); console.log(e); });
}
