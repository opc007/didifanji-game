const fs = require("fs");
const path = require("path");

const PPQ = 480;
const outDir = path.join(__dirname, "..", "assets", "audio", "music");

const NOTE = {
  C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59,
  C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71,
  C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, B5: 83,
  C6: 84, D6: 86, E6: 88,
};

const PROGRAM = {
  piano: 0,
  toyPiano: 10,
  xylophone: 13,
  musicBox: 10,
  pizzicato: 45,
  strings: 48,
  brass: 61,
  clarinet: 71,
  synthLead: 80,
  bass: 33,
};

let renderNotes = null;

function vlq(value) {
  let buffer = value & 0x7f;
  const bytes = [];
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= ((value & 0x7f) | 0x80);
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

function strBytes(text) {
  return [...Buffer.from(text, "ascii")];
}

function u16(value) {
  return [(value >> 8) & 0xff, value & 0xff];
}

function u32(value) {
  return [(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function ticks(beats) {
  return Math.round(beats * PPQ);
}

function noteEvent(events, time, channel, note, duration, velocity = 88) {
  events.push({ time: ticks(time), bytes: [0x90 + channel, note, velocity] });
  events.push({ time: ticks(time + duration), bytes: [0x80 + channel, note, 0] });
  if (renderNotes) renderNotes.push({ time, channel, note, duration, velocity });
}

function chord(events, time, channel, notes, duration, velocity = 64) {
  for (const note of notes) noteEvent(events, time, channel, note, duration, velocity);
}

function program(events, time, channel, programNumber) {
  events.push({ time: ticks(time), bytes: [0xc0 + channel, programNumber] });
}

function tempo(events, bpm) {
  const mpqn = Math.round(60000000 / bpm);
  events.push({ time: 0, bytes: [0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff] });
  events.push({ time: 0, bytes: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08] });
}

function metaName(events, name) {
  const bytes = Buffer.from(name, "utf8");
  events.push({ time: 0, bytes: [0xff, 0x03, bytes.length, ...bytes] });
}

function writeMidi(fileName, bpm, name, build) {
  const events = [];
  renderNotes = [];
  tempo(events, bpm);
  metaName(events, name);
  build(events);
  const notes = renderNotes;
  renderNotes = null;
  events.sort((a, b) => a.time - b.time);

  let cursor = 0;
  const track = [];
  for (const event of events) {
    track.push(...vlq(event.time - cursor), ...event.bytes);
    cursor = event.time;
  }
  track.push(0x00, 0xff, 0x2f, 0x00);

  const header = [
    ...strBytes("MThd"),
    ...u32(6),
    ...u16(0),
    ...u16(1),
    ...u16(PPQ),
  ];
  const trackChunk = [
    ...strBytes("MTrk"),
    ...u32(track.length),
    ...track,
  ];
  fs.writeFileSync(path.join(outDir, fileName), Buffer.from([...header, ...trackChunk]));
  writeWav(fileName.replace(/\.mid$/, ".wav"), bpm, notes);
}

function noteFrequency(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function waveform(phase, type) {
  if (type === "square") return Math.sin(phase) >= 0 ? 1 : -1;
  if (type === "triangle") return 2 * Math.asin(Math.sin(phase)) / Math.PI;
  if (type === "pluck") return Math.sin(phase) * (0.7 + 0.3 * Math.sin(phase * 2.01));
  return Math.sin(phase);
}

function channelVoice(channel, note) {
  if (channel === 0) return note >= NOTE.C5 ? "square" : "triangle";
  if (channel === 1) return "pluck";
  if (channel === 2) return "triangle";
  return "sine";
}

function addDrum(buffer, sampleRate, start, duration, note, velocity) {
  const startSample = Math.floor(start * sampleRate);
  const total = Math.max(1, Math.floor(duration * sampleRate));
  const gain = velocity / 127;
  for (let i = 0; i < total && startSample + i < buffer.length; i++) {
    const t = i / sampleRate;
    const decay = Math.exp(-t * (note === 42 ? 38 : 14));
    let sample;
    if (note === 36) {
      const freq = 95 - t * 60;
      sample = Math.sin(2 * Math.PI * freq * t) * decay * gain * 0.8;
    } else if (note === 38) {
      sample = (Math.random() * 2 - 1) * decay * gain * 0.45;
    } else {
      sample = (Math.random() * 2 - 1) * decay * gain * 0.22;
    }
    buffer[startSample + i] += sample;
  }
}

function writeWav(fileName, bpm, notes) {
  const sampleRate = 44100;
  const beatSeconds = 60 / bpm;
  const endSeconds = Math.max(...notes.map((note) => (note.time + note.duration) * beatSeconds), 1) + 0.8;
  const samples = new Float32Array(Math.ceil(endSeconds * sampleRate));

  for (const note of notes) {
    const start = note.time * beatSeconds;
    const duration = Math.max(note.duration * beatSeconds, 0.04);
    if (note.channel === 9) {
      addDrum(samples, sampleRate, start, Math.max(duration, 0.18), note.note, note.velocity);
      continue;
    }

    const startSample = Math.floor(start * sampleRate);
    const total = Math.floor(duration * sampleRate);
    const freq = noteFrequency(note.note);
    const gain = (note.velocity / 127) * (note.channel === 2 ? 0.16 : 0.11);
    const voice = channelVoice(note.channel, note.note);

    for (let i = 0; i < total && startSample + i < samples.length; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.015);
      const release = Math.min(1, (duration - t) / 0.06);
      const env = Math.max(0, Math.min(attack, release)) * Math.exp(-t * (voice === "pluck" ? 1.5 : 0.25));
      const phase = 2 * Math.PI * freq * t;
      const overtone = 0.35 * Math.sin(phase * 2) + 0.16 * Math.sin(phase * 3);
      samples[startSample + i] += (waveform(phase, voice) + overtone) * env * gain;
    }
  }

  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const normalize = peak > 0 ? 0.88 / peak : 1;
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
    const value = Math.max(-1, Math.min(1, samples[i] * normalize));
    wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(outDir, fileName), wav);
}

function addDrums(events, start, bars, pattern = "light") {
  for (let bar = 0; bar < bars; bar++) {
    const t = start + bar * 4;
    noteEvent(events, t, 9, 36, 0.08, pattern === "fight" ? 76 : 58);
    noteEvent(events, t + 2, 9, 36, 0.08, pattern === "fight" ? 72 : 54);
    noteEvent(events, t + 1, 9, 38, 0.08, pattern === "fight" ? 82 : 62);
    noteEvent(events, t + 3, 9, 38, 0.08, pattern === "fight" ? 82 : 62);
    for (let i = 0; i < 8; i++) noteEvent(events, t + i * 0.5, 9, 42, 0.05, pattern === "fight" ? 52 : 36);
  }
}

function addArp(events, start, channel, chords, repeats, velocity = 48) {
  for (let r = 0; r < repeats; r++) {
    for (let c = 0; c < chords.length; c++) {
      const notes = chords[c];
      const base = start + (r * chords.length + c) * 2;
      for (let i = 0; i < 4; i++) noteEvent(events, base + i * 0.5, channel, notes[i % notes.length], 0.22, velocity);
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });

writeMidi("bgm_gameplay_loop.mid", 132, "Gameplay Loop", (events) => {
  program(events, 0, 0, PROGRAM.xylophone);
  program(events, 0, 1, PROGRAM.toyPiano);
  program(events, 0, 2, PROGRAM.bass);
  addDrums(events, 0, 8, "light");
  const melody = [
    [NOTE.C5, .5], [NOTE.E5, .5], [NOTE.G5, .5], [NOTE.A5, .5], [NOTE.G5, .5], [NOTE.E5, .5], [NOTE.D5, .5], [NOTE.C5, .5],
    [NOTE.E5, .5], [NOTE.G5, .5], [NOTE.A5, .5], [NOTE.C6, .5], [NOTE.A5, .5], [NOTE.G5, .5], [NOTE.E5, .5], [NOTE.D5, .5],
  ];
  for (let pass = 0; pass < 4; pass++) {
    let t = pass * 8;
    for (const [note, dur] of melody) {
      noteEvent(events, t, 0, note, dur * 0.85, 86);
      t += dur;
    }
  }
  addArp(events, 0, 1, [
    [NOTE.C4, NOTE.E4, NOTE.G4],
    [NOTE.F4, NOTE.A4, NOTE.C5],
    [NOTE.G3, NOTE.D4, NOTE.G4],
    [NOTE.C4, NOTE.E4, NOTE.G4],
  ], 4, 45);
  for (let bar = 0; bar < 8; bar++) {
    const root = [NOTE.C3, NOTE.F3, NOTE.G3, NOTE.C3][bar % 4];
    noteEvent(events, bar * 4, 2, root, 1.6, 58);
    noteEvent(events, bar * 4 + 2, 2, root + 12, 1.4, 54);
  }
});

writeMidi("bgm_fight_loop.mid", 150, "Fight Loop", (events) => {
  program(events, 0, 0, PROGRAM.synthLead);
  program(events, 0, 1, PROGRAM.pizzicato);
  program(events, 0, 2, PROGRAM.bass);
  addDrums(events, 0, 8, "fight");
  const riff = [NOTE.A4, NOTE.G4, NOTE.E4, NOTE.C4, NOTE.D4, NOTE.E4, NOTE.G4, NOTE.E4];
  for (let pass = 0; pass < 4; pass++) {
    let t = pass * 8;
    for (let i = 0; i < 16; i++) {
      noteEvent(events, t + i * 0.5, 0, riff[i % riff.length], 0.28, i % 4 === 0 ? 92 : 74);
    }
  }
  for (let bar = 0; bar < 8; bar++) {
    const t = bar * 4;
    for (let i = 0; i < 8; i++) noteEvent(events, t + i * 0.5, 2, [NOTE.A3, NOTE.E3][i % 2], 0.25, 66);
    chord(events, t, 1, [NOTE.A3, NOTE.C4, NOTE.E4], 0.7, 52);
    chord(events, t + 2, 1, [NOTE.G3, NOTE.B3, NOTE.E4], 0.7, 52);
  }
});

writeMidi("jingle_victory.mid", 144, "Victory Jingle", (events) => {
  program(events, 0, 0, PROGRAM.brass);
  program(events, 0, 1, PROGRAM.musicBox);
  program(events, 0, 2, PROGRAM.bass);
  addDrums(events, 0, 4, "light");
  const melody = [
    [NOTE.C5, .35], [NOTE.E5, .35], [NOTE.G5, .35], [NOTE.C6, .7],
    [NOTE.A5, .35], [NOTE.G5, .35], [NOTE.E5, .35], [NOTE.G5, .35],
    [NOTE.A5, .35], [NOTE.C6, .35], [NOTE.A5, .35], [NOTE.G5, .35],
    [NOTE.E5, .35], [NOTE.G5, .35], [NOTE.C6, .7],
    [NOTE.G5, .35], [NOTE.A5, .35], [NOTE.C6, .35], [NOTE.E6, .9],
    [NOTE.C6, 1.4],
  ];
  let t = 0;
  for (const [note, dur] of melody) {
    noteEvent(events, t, 0, note, dur * 0.9, 96);
    noteEvent(events, t, 1, note + 12 <= 127 ? note + 12 : note, dur * 0.5, 52);
    t += dur;
  }
  for (let bar = 0; bar < 4; bar++) {
    const root = [NOTE.C3, NOTE.F3, NOTE.G3, NOTE.C3][bar];
    noteEvent(events, bar * 4, 2, root, 1.5, 56);
    noteEvent(events, bar * 4 + 2, 2, root + 12, 1.2, 50);
  }
  chord(events, 0, 0, [NOTE.C4, NOTE.E4, NOTE.G4], .5, 64);
  chord(events, 2, 0, [NOTE.F4, NOTE.A4, NOTE.C5], .5, 64);
  chord(events, 4, 0, [NOTE.G4, NOTE.B4, NOTE.D5], .5, 64);
  chord(events, 6, 0, [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], 1.2, 70);
});

writeMidi("jingle_game_over.mid", 88, "Game Over Cry Jingle", (events) => {
  program(events, 0, 0, PROGRAM.clarinet);
  program(events, 0, 1, PROGRAM.toyPiano);
  program(events, 0, 2, PROGRAM.bass);
  const melody = [
    [NOTE.G4, .5], [NOTE.E4, .5], [NOTE.D4, .5], [NOTE.C4, .8],
    [NOTE.A3, .5], [NOTE.G3, .5], [NOTE.E3, 1.2],
    [NOTE.C4, .45], [NOTE.D4, .45], [NOTE.E4, .45], [NOTE.G4, .7],
    [NOTE.E4, .45], [NOTE.G4, .45], [NOTE.C5, 1.1],
  ];
  let t = 0;
  for (const [note, dur] of melody) {
    noteEvent(events, t, 0, note, dur * 0.9, t < 3.5 ? 76 : 84);
    if (t >= 3.5) noteEvent(events, t, 1, note + 12, dur * 0.45, 34);
    t += dur;
  }
  chord(events, 0, 1, [NOTE.C4, NOTE.E4], .7, 38);
  chord(events, 1.6, 1, [NOTE.A3, NOTE.C4], .7, 38);
  chord(events, 3.1, 1, [NOTE.E3, NOTE.A3], .9, 34);
  chord(events, 4.3, 1, [NOTE.C4, NOTE.E4, NOTE.G4], .7, 42);
  chord(events, 5.6, 1, [NOTE.G3, NOTE.B3, NOTE.D4], .7, 42);
  chord(events, 6.8, 1, [NOTE.C4, NOTE.E4, NOTE.G4], 1.2, 46);
  noteEvent(events, 4, 2, NOTE.C3, 1.2, 38);
  noteEvent(events, 5.4, 2, NOTE.G3, 1.1, 36);
  noteEvent(events, 6.7, 2, NOTE.C3, 1.2, 40);
  for (let i = 0; i < 5; i++) noteEvent(events, 3.6 + i * 0.16, 9, 45, .04, 38 - i * 3);
});

writeMidi("bgm_start_menu.mid", 118, "Start Menu Theme", (events) => {
  program(events, 0, 0, PROGRAM.musicBox);
  program(events, 0, 1, PROGRAM.xylophone);
  program(events, 0, 2, PROGRAM.bass);
  addDrums(events, 0, 6, "light");
  const melody = [
    NOTE.C5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.G5, NOTE.E5, NOTE.D5, NOTE.C5,
    NOTE.E5, NOTE.G5, NOTE.A5, NOTE.C6, NOTE.A5, NOTE.G5, NOTE.E5, NOTE.D5,
    NOTE.F5, NOTE.A5, NOTE.C6, NOTE.A5, NOTE.G5, NOTE.E5, NOTE.D5, NOTE.C5,
  ];
  for (let i = 0; i < melody.length; i++) {
    const t = i * 0.5;
    noteEvent(events, t, 0, melody[i], 0.38, i % 8 === 0 ? 88 : 70);
    if (i % 2 === 0) noteEvent(events, t + 0.03, 1, melody[i] + 12 <= 127 ? melody[i] + 12 : melody[i], 0.18, 34);
  }
  addArp(events, 0, 1, [
    [NOTE.C4, NOTE.E4, NOTE.G4],
    [NOTE.F4, NOTE.A4, NOTE.C5],
    [NOTE.G3, NOTE.B3, NOTE.D4],
    [NOTE.C4, NOTE.E4, NOTE.G4],
  ], 3, 34);
  for (let bar = 0; bar < 6; bar++) {
    const root = [NOTE.C3, NOTE.F3, NOTE.G3, NOTE.C3, NOTE.A3, NOTE.G3][bar];
    noteEvent(events, bar * 4, 2, root, 1.6, 44);
    noteEvent(events, bar * 4 + 2, 2, root + 12, 1.4, 38);
  }
});

writeMidi("theme_brother.mid", 126, "Brother Theme", (events) => {
  program(events, 0, 0, PROGRAM.toyPiano);
  program(events, 0, 1, PROGRAM.xylophone);
  program(events, 0, 2, PROGRAM.bass);
  addDrums(events, 0, 4, "light");
  const melody = [
    NOTE.C5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.G5, NOTE.E5, NOTE.D5, NOTE.C5,
    NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.C6, NOTE.A5, NOTE.G5, NOTE.E5,
  ];
  for (let i = 0; i < melody.length; i++) {
    noteEvent(events, i * 0.5, 0, melody[i], 0.38, i % 4 === 0 ? 94 : 78);
    if (i % 2 === 0) noteEvent(events, i * 0.5, 1, melody[i] + 12 <= 127 ? melody[i] + 12 : melody[i], 0.2, 42);
  }
  for (let bar = 0; bar < 4; bar++) {
    noteEvent(events, bar * 4, 2, [NOTE.C3, NOTE.F3, NOTE.G3, NOTE.C3][bar], 1.7, 56);
    noteEvent(events, bar * 4 + 2, 2, [NOTE.G3, NOTE.A3, NOTE.B3, NOTE.C4][bar], 1.5, 48);
  }
});

writeMidi("theme_sister.mid", 112, "Sister Theme", (events) => {
  program(events, 0, 0, PROGRAM.pizzicato);
  program(events, 0, 1, PROGRAM.clarinet);
  program(events, 0, 2, PROGRAM.bass);
  const melody = [
    NOTE.A4, NOTE.G4, NOTE.E4, NOTE.C4, NOTE.D4, NOTE.E4, NOTE.G4, NOTE.E4,
    NOTE.A4, NOTE.B4, NOTE.C5, NOTE.B4, NOTE.A4, NOTE.G4, NOTE.E4, NOTE.D4,
  ];
  for (let i = 0; i < melody.length; i++) {
    noteEvent(events, i * 0.5, i % 4 < 2 ? 0 : 1, melody[i], 0.34, i % 4 === 0 ? 84 : 66);
  }
  addArp(events, 0, 0, [
    [NOTE.A3, NOTE.C4, NOTE.E4],
    [NOTE.G3, NOTE.B3, NOTE.E4],
    [NOTE.F3, NOTE.A3, NOTE.C4],
    [NOTE.E3, NOTE.G3, NOTE.B3],
  ], 2, 36);
  for (let bar = 0; bar < 4; bar++) {
    noteEvent(events, bar * 4, 2, [NOTE.A3, NOTE.G3, NOTE.F3, NOTE.E3][bar], 1.6, 48);
    noteEvent(events, bar * 4 + 2, 2, [NOTE.E3, NOTE.D3, NOTE.C3, NOTE.E3][bar], 1.5, 44);
  }
});

console.log(`Generated MIDI and WAV drafts in ${outDir}`);
