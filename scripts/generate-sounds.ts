/**
 * Generates Candlo's sound effects as small 16-bit mono WAV files in public/sounds.
 * Everything is synthesized from scratch (sine/triangle tones, seeded noise), so there is
 * no third-party license involved. Run: pnpm sounds:generate  (output is deterministic).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const SAMPLE_RATE = 22050;

type Samples = Float32Array;

/** Small deterministic PRNG so the generated noise is identical on every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const blank = (seconds: number): Samples => new Float32Array(Math.round(seconds * SAMPLE_RATE));

/** Fast attack, exponential decay envelope. */
function env(i: number, total: number, attack = 0.008, decayPower = 4): number {
  const t = i / SAMPLE_RATE;
  const a = Math.min(1, t / attack);
  const d = Math.pow(1 - i / total, decayPower);
  return a * d;
}

function addTone(
  out: Samples,
  startSec: number,
  freq: number,
  durSec: number,
  gain: number,
  shape: "sine" | "triangle" = "sine",
  glideTo?: number,
): void {
  const start = Math.round(startSec * SAMPLE_RATE);
  const n = Math.round(durSec * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; i < n && start + i < out.length; i++) {
    const f = glideTo ? freq + (glideTo - freq) * (i / n) : freq;
    phase += (2 * Math.PI * f) / SAMPLE_RATE;
    const s = shape === "sine" ? Math.sin(phase) : (2 / Math.PI) * Math.asin(Math.sin(phase));
    out[start + i]! += s * gain * env(i, n);
  }
}

function addNoise(
  out: Samples,
  startSec: number,
  durSec: number,
  gain: number,
  seed: number,
  lowpass = 0.2,
): void {
  const rand = mulberry32(seed);
  const start = Math.round(startSec * SAMPLE_RATE);
  const n = Math.round(durSec * SAMPLE_RATE);
  let prev = 0;
  for (let i = 0; i < n && start + i < out.length; i++) {
    prev += lowpass * (rand() * 2 - 1 - prev); // one-pole low-pass keeps it soft
    out[start + i]! += prev * gain * env(i, n, 0.02, 2);
  }
}

const note = (semitonesFromA4: number): number => 440 * Math.pow(2, semitonesFromA4 / 12);
const C5 = note(3);
const E5 = note(7);
const G5 = note(10);
const C6 = note(15);

export const SOUNDS: Record<string, () => Samples> = {
  /** Soft rising two-note chime. */
  correct: () => {
    const s = blank(0.5);
    addTone(s, 0, C5, 0.28, 0.35);
    addTone(s, 0.09, E5, 0.38, 0.35);
    addTone(s, 0.09, E5 * 2, 0.3, 0.08);
    return s;
  },
  /** Gentle low "bwomp". Triangle wave, quiet, never harsh. */
  wrong: () => {
    const s = blank(0.35);
    addTone(s, 0, 233, 0.3, 0.3, "triangle", 196);
    return s;
  },
  /** Level-up fanfare: a rising arpeggio ending on a held chord. */
  levelup: () => {
    const s = blank(1.3);
    [C5, E5, G5].forEach((f, i) => addTone(s, i * 0.12, f, 0.4, 0.3));
    [C6, G5, E5].forEach((f) => addTone(s, 0.4, f, 0.85, 0.2));
    addTone(s, 0.4, C6 * 2, 0.6, 0.06);
    return s;
  },
  /** Quick high sparkle for streaks. */
  streak: () => {
    const s = blank(0.6);
    [C6, C6 * 1.25, C6 * 1.5, C6 * 2, C6 * 1.5, C6 * 2].forEach((f, i) =>
      addTone(s, i * 0.05, f, 0.2, 0.18),
    );
    return s;
  },
  /** Cash-register "ka-ching": a short noise click then two bright bell partials. */
  cash: () => {
    const s = blank(0.9);
    addNoise(s, 0, 0.05, 0.5, 11, 0.5);
    addTone(s, 0.05, 1568, 0.7, 0.22);
    addTone(s, 0.05, 2349, 0.7, 0.14);
    addTone(s, 0.05, 3136, 0.5, 0.08);
    return s;
  },
  /** Gentle thud for a stop-loss being hit. */
  thud: () => {
    const s = blank(0.35);
    addTone(s, 0, 130, 0.3, 0.55, "sine", 55);
    addNoise(s, 0, 0.04, 0.12, 5, 0.1);
    return s;
  },
  /** Page-turn swish for teach slides. */
  page: () => {
    const s = blank(0.3);
    addNoise(s, 0, 0.26, 0.45, 3, 0.12);
    return s;
  },
  /** Tiny tap for buttons. */
  tap: () => {
    const s = blank(0.08);
    addTone(s, 0, 880, 0.06, 0.18);
    return s;
  },
  /** Pop for confetti. */
  pop: () => {
    const s = blank(0.2);
    addTone(s, 0, 300, 0.12, 0.4, "sine", 700);
    addNoise(s, 0, 0.05, 0.1, 9, 0.4);
    return s;
  },
};

/** Encode float samples as a 16-bit PCM mono WAV. Peak-limits to avoid clipping. */
export function encodeWav(samples: Samples): Buffer {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const norm = peak > 0.9 ? 0.9 / peak : 1;
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) =>
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * norm)) * 32767), i * 2),
  );
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function main(): void {
  const dir = join(process.cwd(), "public", "sounds");
  mkdirSync(dir, { recursive: true });
  for (const [name, make] of Object.entries(SOUNDS)) {
    const wav = encodeWav(make());
    writeFileSync(join(dir, `${name}.wav`), wav);
    console.log(`wrote public/sounds/${name}.wav (${(wav.length / 1024).toFixed(1)} KB)`);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop() ?? "")) main();
