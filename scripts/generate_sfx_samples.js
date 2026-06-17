const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const sampleRate = 44100;
const outRoot = path.join(__dirname, "..", "assets", "audio", "sfx");

const sounds = [
  { key: "sfx_player_jump", dir: "player", title: "跳跃", duration: 0.42, make: jump },
  { key: "sfx_player_land", dir: "player", title: "落地", duration: 0.28, make: land },
  { key: "sfx_player_stomp", dir: "player", title: "踩怪", duration: 0.38, make: stomp },
  { key: "sfx_player_hurt", dir: "player", title: "受伤", duration: 0.52, make: hurt },
  { key: "sfx_player_cry", dir: "player", title: "哭哭失败", duration: 1.15, make: cry },
  { key: "sfx_coin_pickup", dir: "items", title: "捡金币", duration: 0.28, make: coin },
  { key: "sfx_item_pickup", dir: "items", title: "捡道具", duration: 0.55, make: itemPickup },
  { key: "sfx_fire_candy_shoot", dir: "items", title: "火球糖发射", duration: 0.42, make: fireCandy },
  { key: "sfx_toy_hammer_hit", dir: "items", title: "玩具锤命中", duration: 0.36, make: hammerHit },
  { key: "sfx_bubble_shield_break", dir: "items", title: "泡泡盾破裂", duration: 0.42, make: bubbleBreak },
  { key: "sfx_sister_hit", dir: "enemies", title: "姐姐受击", duration: 0.48, make: sisterHit },
  { key: "sfx_headphone_wave", dir: "enemies", title: "耳机姐姐音波", duration: 0.72, make: headphoneWave },
  { key: "sfx_pipe_sister_pop", dir: "enemies", title: "管道姐姐探头", duration: 0.42, make: pipePop },
  { key: "sfx_boss_book_throw", dir: "enemies", title: "Boss 扔作业本", duration: 0.68, make: bookThrow },
  { key: "sfx_question_block", dir: "world", title: "问号砖", duration: 0.36, make: questionBlock },
  { key: "sfx_goal_flag", dir: "world", title: "终点旗", duration: 0.78, make: goalFlag },
  { key: "sfx_ui_confirm", dir: "ui", title: "菜单确认", duration: 0.22, make: uiConfirm },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeWav(file, samples) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = peak > 0 ? 0.86 / peak : 1;
  const dataSize = samples.length * 2;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i] * gain));
    wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, wav);
}

function buffer(seconds) {
  return new Float32Array(Math.ceil(seconds * sampleRate));
}

function env(t, duration, attack = 0.01, release = 0.08, decay = 2.4) {
  const a = Math.min(1, t / attack);
  const r = Math.min(1, (duration - t) / release);
  return Math.max(0, Math.min(a, r)) * Math.exp(-t * decay);
}

function addTone(b, start, duration, f0, f1, amp, type = "sine") {
  const startIndex = Math.floor(start * sampleRate);
  const count = Math.floor(duration * sampleRate);
  let phase = 0;
  for (let i = 0; i < count && startIndex + i < b.length; i++) {
    const t = i / sampleRate;
    const p = duration > 0 ? t / duration : 0;
    const freq = f0 + (f1 - f0) * p;
    phase += (Math.PI * 2 * freq) / sampleRate;
    const s = wave(phase, type) * amp * env(t, duration);
    b[startIndex + i] += s;
  }
}

function addNoise(b, start, duration, amp, decay = 8, tone = 0) {
  const startIndex = Math.floor(start * sampleRate);
  const count = Math.floor(duration * sampleRate);
  let last = 0;
  for (let i = 0; i < count && startIndex + i < b.length; i++) {
    const t = i / sampleRate;
    const raw = Math.random() * 2 - 1;
    last = last * tone + raw * (1 - tone);
    b[startIndex + i] += last * amp * Math.exp(-t * decay) * Math.min(1, t / 0.004);
  }
}

function wave(phase, type) {
  if (type === "square") return Math.sin(phase) >= 0 ? 1 : -1;
  if (type === "triangle") return 2 * Math.asin(Math.sin(phase)) / Math.PI;
  if (type === "pluck") return Math.sin(phase) * 0.75 + Math.sin(phase * 2.01) * 0.25;
  return Math.sin(phase);
}

function note(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

function jump() {
  const b = buffer(0.42);
  addTone(b, 0, 0.22, note(60), note(76), 0.45, "triangle");
  addTone(b, 0.04, 0.18, note(72), note(84), 0.25, "sine");
  addNoise(b, 0.02, 0.12, 0.08, 22, 0.8);
  return b;
}

function land() {
  const b = buffer(0.28);
  addTone(b, 0, 0.12, 150, 72, 0.32, "sine");
  addNoise(b, 0.01, 0.16, 0.25, 20, 0.65);
  return b;
}

function stomp() {
  const b = buffer(0.38);
  addTone(b, 0, 0.12, 180, 92, 0.45, "sine");
  addTone(b, 0.08, 0.2, note(67), note(79), 0.32, "triangle");
  addNoise(b, 0.02, 0.11, 0.22, 24, 0.4);
  return b;
}

function hurt() {
  const b = buffer(0.52);
  addTone(b, 0, 0.18, note(76), note(64), 0.34, "square");
  addTone(b, 0.12, 0.2, note(72), note(55), 0.28, "triangle");
  addNoise(b, 0.05, 0.16, 0.12, 18, 0.5);
  return b;
}

function cry() {
  const b = buffer(1.15);
  addTone(b, 0, 0.38, note(72), note(55), 0.28, "triangle");
  addTone(b, 0.34, 0.24, note(64), note(62), 0.2, "sine");
  addTone(b, 0.62, 0.3, note(65), note(59), 0.18, "sine");
  addNoise(b, 0.15, 0.65, 0.08, 7, 0.88);
  return b;
}

function coin() {
  const b = buffer(0.28);
  addTone(b, 0, 0.1, note(84), note(88), 0.42, "sine");
  addTone(b, 0.08, 0.14, note(91), note(96), 0.35, "sine");
  return b;
}

function itemPickup() {
  const b = buffer(0.55);
  [72, 76, 79, 84].forEach((n, i) => addTone(b, i * 0.08, 0.18, note(n), note(n + 2), 0.28, "triangle"));
  addNoise(b, 0.04, 0.35, 0.07, 14, 0.7);
  return b;
}

function fireCandy() {
  const b = buffer(0.42);
  addTone(b, 0, 0.12, note(72), note(84), 0.3, "square");
  addTone(b, 0.05, 0.22, 520, 240, 0.18, "sine");
  addNoise(b, 0.03, 0.26, 0.18, 18, 0.3);
  return b;
}

function hammerHit() {
  const b = buffer(0.36);
  addTone(b, 0, 0.1, 130, 80, 0.5, "sine");
  addTone(b, 0.03, 0.16, note(48), note(53), 0.28, "triangle");
  addNoise(b, 0, 0.12, 0.3, 28, 0.5);
  return b;
}

function bubbleBreak() {
  const b = buffer(0.42);
  addTone(b, 0, 0.09, note(86), note(96), 0.25, "sine");
  addTone(b, 0.08, 0.12, note(91), note(83), 0.18, "sine");
  addNoise(b, 0.02, 0.25, 0.22, 18, 0.82);
  return b;
}

function sisterHit() {
  const b = buffer(0.48);
  addTone(b, 0, 0.18, note(79), note(67), 0.3, "triangle");
  addTone(b, 0.14, 0.18, note(74), note(86), 0.24, "sine");
  addNoise(b, 0.04, 0.18, 0.13, 20, 0.6);
  return b;
}

function headphoneWave() {
  const b = buffer(0.72);
  addTone(b, 0, 0.56, note(65), note(72), 0.19, "sine");
  addTone(b, 0.04, 0.52, note(67), note(74), 0.15, "sine");
  addTone(b, 0.08, 0.46, note(72), note(79), 0.12, "triangle");
  for (let i = 0; i < b.length; i++) {
    const t = i / sampleRate;
    b[i] *= 0.62 + Math.sin(Math.PI * 2 * 12 * t) * 0.38;
  }
  return b;
}

function pipePop() {
  const b = buffer(0.42);
  addTone(b, 0, 0.14, 100, 210, 0.38, "sine");
  addTone(b, 0.11, 0.12, note(60), note(67), 0.24, "triangle");
  addNoise(b, 0.02, 0.12, 0.16, 18, 0.72);
  return b;
}

function bookThrow() {
  const b = buffer(0.68);
  addNoise(b, 0, 0.55, 0.22, 5, 0.92);
  addTone(b, 0.05, 0.38, 420, 180, 0.16, "triangle");
  addTone(b, 0.34, 0.08, 110, 72, 0.24, "sine");
  return b;
}

function questionBlock() {
  const b = buffer(0.36);
  addTone(b, 0, 0.08, note(67), note(79), 0.3, "triangle");
  addTone(b, 0.07, 0.12, note(84), note(88), 0.35, "sine");
  addTone(b, 0.17, 0.12, note(91), note(96), 0.22, "sine");
  return b;
}

function goalFlag() {
  const b = buffer(0.78);
  [72, 76, 79, 84, 88].forEach((n, i) => addTone(b, i * 0.09, 0.2, note(n), note(n), 0.25, "triangle"));
  addNoise(b, 0.02, 0.45, 0.06, 5, 0.96);
  return b;
}

function uiConfirm() {
  const b = buffer(0.22);
  addTone(b, 0, 0.07, note(76), note(76), 0.32, "sine");
  addTone(b, 0.06, 0.09, note(84), note(84), 0.26, "sine");
  return b;
}

const manifest = [];
for (const sound of sounds) {
  const dir = path.join(outRoot, sound.dir);
  ensureDir(dir);
  const wavPath = path.join(dir, `${sound.key}_01.wav`);
  const mp3Path = path.join(dir, `${sound.key}_01.mp3`);
  const oggPath = path.join(dir, `${sound.key}_01.ogg`);
  writeWav(wavPath, sound.make());
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wavPath, "-codec:a", "libmp3lame", "-q:a", "4", mp3Path]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wavPath, "-c:a", "libopus", "-b:a", "96k", oggPath]);
  manifest.push({
    key: sound.key,
    title: sound.title,
    category: sound.dir,
    files: {
      ogg: path.relative(path.join(__dirname, ".."), oggPath),
      mp3: path.relative(path.join(__dirname, ".."), mp3Path),
      wav: path.relative(path.join(__dirname, ".."), wavPath),
    },
  });
}

fs.writeFileSync(path.join(outRoot, "sfx-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Generated ${sounds.length} SFX samples in ${outRoot}`);
