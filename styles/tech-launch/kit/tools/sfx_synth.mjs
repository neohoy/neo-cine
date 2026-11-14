// 科技发布的动作音效，全部代码合成：不用录音素材，每个声音的起音和峰值位置都由代码决定，落点能准确对到拍子上。
//   node styles/tech-launch/kit/tools/sfx_synth.mjs <工程>     → <工程>/out/sfx/*.wav（48 kHz 单声道 16 位，峰值 0.7）
// tools/make.sh 每次都跑（不到一秒，随机数固定种子，每次生成的文件完全一样）；tools/mix.py 按画面事件（window.EV 里 type 为 sfx 的）把它们放进混音。
// 八种：tick 轻点击、tap 木质轻敲、thud 低沉落定、paper 纸张落桌、swish 风声（峰值 0.34 秒）、rise 渐强（峰值 0.6 秒，一拍）、scribble 记号笔、ding 轻铃。
// 来自 NEO 产品宣传片技能「科技公司式」主题的 sfx_synth.mjs（MIT，© 2026 NEO造物集 (neohoy)），声音本身没有改，只改了输出位置。
import fs from "node:fs";
import path from "node:path";

const SR = 48000;
const OUT = path.resolve(process.argv[2] || ".", "out/sfx");

// 固定种子的白噪声
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1;
  };
}
const buf = (sec) => new Float64Array(Math.round(sec * SR));

// RBJ 双二阶滤波；f 可以是随时间变化的函数（每 32 个采样重算一次系数）
function biquad(x, type, f, q = 0.707) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0, b1, b2, a1, a2;
  const coef = (fc) => {
    const w = (2 * Math.PI * Math.min(fc, SR * 0.45)) / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    let n0, n1, n2;
    if (type === "lp") [n0, n1, n2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
    else if (type === "hp") [n0, n1, n2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
    else [n0, n1, n2] = [al, 0, -al]; // bp
    const a0 = 1 + al;
    [b0, b1, b2, a1, a2] = [n0 / a0, n1 / a0, n2 / a0, (-2 * c) / a0, (1 - al) / a0];
  };
  for (let i = 0; i < x.length; i++) {
    if (i % 32 === 0) coef(typeof f === "function" ? f(i / SR) : f);
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
const mix = (...parts) => {
  const n = Math.max(...parts.map(([b]) => b.length)), out = new Float64Array(n);
  for (const [b, g = 1, at = 0] of parts) for (let i = 0; i < b.length && i + at < n; i++) out[i + at] += b[i] * g;
  return out;
};
const env = (b, fn) => b.map((v, i) => v * fn(i / SR));
const noise = (sec, seed) => { const r = rng(seed); return buf(sec).map(() => r()); };
const sine = (sec, hz, ph = 0) => { let p = ph; return buf(sec).map((_, i) => { const t = i / SR; p += (2 * Math.PI * (typeof hz === "function" ? hz(t) : hz)) / SR; return Math.sin(p); }); };
const fadeEdges = (b, a = 0.001, r = 0.004) => env(b, (t) => Math.min(1, t / a, (b.length / SR - t) / r));

// ---------- 声音 ----------
const S = {
  // 轻点击：角点、槽位、计数、打字
  tick: () => mix([env(biquad(noise(0.06, 1), "hp", 3500), (t) => Math.exp(-t / 0.004)), 0.6], [env(sine(0.06, 2900), (t) => Math.exp(-t / 0.012)), 0.5]),
  // 木质轻敲：小件落定、波浪
  tap: () => mix([env(sine(0.18, 880), (t) => Math.exp(-t / 0.035)), 0.7], [env(sine(0.18, 1760), (t) => Math.exp(-t / 0.018)), 0.25],
    [env(biquad(noise(0.02, 2), "bp", 2400, 1.2), (t) => Math.exp(-t / 0.003)), 0.4]),
  // 低沉的落定：卡片落进格子、硬切、方块落定
  thud: () => mix([env(sine(0.45, (t) => 58 + 90 * Math.exp(-t / 0.04)), (t) => Math.exp(-t / 0.11)), 1.0],
    [env(biquad(noise(0.05, 3), "lp", 900), (t) => Math.exp(-t / 0.008)), 0.5], [env(biquad(noise(0.03, 4), "bp", 2600, 1), (t) => Math.exp(-t / 0.004)), 0.18]),
  // 纸张落桌：一叠组件落下
  paper: () => mix([env(biquad(noise(0.3, 5), "bp", (t) => 1800 - 1200 * Math.min(1, t / 0.12), 0.9), (t) => (t < 0.004 ? t / 0.004 : Math.exp(-(t - 0.004) / 0.05))), 0.9],
    [env(sine(0.3, (t) => 70 + 60 * Math.exp(-t / 0.03)), (t) => Math.exp(-t / 0.07)), 0.45]),
  // 风声：峰值在 0.34 秒（对到切点或动作最快的那一刻），之后 0.08 秒收掉
  swish: () => {
    const T = 0.34, L = 0.44;
    return env(biquad(noise(L, 6), "bp", (t) => 400 + 2600 * Math.min(1, t / T) ** 1.6, 1.4), (t) => (t < T ? (t / T) ** 2.2 : Math.exp(-(t - T) / 0.025)));
  },
  // 渐强：一拍长（0.6 秒），在切点那一刻最响，然后立刻收
  rise: () => {
    const T = 0.6, L = 0.66;
    return mix([env(biquad(noise(L, 7), "bp", (t) => 600 + 3400 * Math.min(1, t / T) ** 2, 2.2), (t) => (t < T ? (t / T) ** 3 : Math.exp(-(t - T) / 0.012))), 0.8],
      [env(sine(L, (t) => 220 + 440 * Math.min(1, t / T) ** 2), (t) => (t < T ? 0.35 * (t / T) ** 3 : 0)), 1]);
  },
  // 记号笔划过：一段平稳的高频摩擦，0.5 秒
  scribble: () => env(mix([biquad(noise(0.5, 8), "bp", 4200, 1.6), 1], [biquad(noise(0.5, 9), "bp", 2200, 3), 0.4]),
    (t) => Math.min(1, t / 0.02, (0.5 - t) / 0.06) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 23 * t))),
  // 落版的一声轻铃：E6 加泛音，配方块落定
  ding: () => mix([env(sine(1.2, 1318.5), (t) => Math.exp(-t / 0.35)), 0.6], [env(sine(1.2, 2637), (t) => Math.exp(-t / 0.12)), 0.2],
    [env(sine(1.2, 3955.5), (t) => Math.exp(-t / 0.05)), 0.08]),
};

function wav(file, x, peak = 0.7) {
  const m = Math.max(...x.map(Math.abs)) || 1, n = x.length, b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, (x[i] / m) * peak)) * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, fn] of Object.entries(S)) {
  const x = fadeEdges(fn());
  wav(path.join(OUT, `${name}.wav`), x);
  let pk = 0;
  x.forEach((v, i) => Math.abs(v) > Math.abs(x[pk]) && (pk = i));
  console.log(`${name.padEnd(9)} ${(x.length / SR).toFixed(3)}s  峰值 ${(pk / SR).toFixed(3)}s`);
}
