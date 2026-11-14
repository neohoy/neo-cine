// 科技发布的配乐，全部代码合成：D 大调 100 BPM（一拍 0.6 秒），每个产品镜头一个和弦（Bm11 → Gmaj7 → Em9 → Asus2 循环），
// 切点那一拍低音加重，抬起时落一个和弦，角点画出的那一拍点一个高音，落版回到 Dmaj9 并留余音到片尾。
// 音色：失谐锯齿波铺底、带滤波包络的拨弦（加附点八分回声）、正弦低频、FM 铃声，第一个产品镜头起一层很轻的底鼓和高帽。
//   node styles/tech-launch/kit/tools/score.mjs <工程>     （先导出 events.json：node core/render/events.mjs <工程>）
// 读页面导出的画面事件（events.json 里 type 为 shot 的：每个镜头的类型、起止、抬起、角点、方块落定），写出
//   <工程>/out/score.wav    48 kHz 立体声 16 位，峰值 −1 dBFS（响度由 tools/mix.py 统一处理）
//   <工程>/out/score.json   配乐自己的重音时刻（切点低音、抬起和弦、角点高音、落版铃声），tools/mix.py 用 neo/audio/cues.py 逐个核对画面
// 只用 Node 自带模块，Mac / Windows / Linux 通用，约 1 秒。
// 来自 NEO 产品宣传片技能「科技公司式」主题的 score.mjs（MIT，© 2026 NEO造物集 (neohoy)）：乐谱和音色没有改；
// 改的是输入（从页面的画面事件读，不再读 HyperFrames 的时间线）、输出（不再用 ffmpeg 定 −23 LUFS）、落版后的署名卡接着落版的余音。
import fs from "node:fs";
import path from "node:path";

const P = path.resolve(process.argv[2] || ".");
const EVJ = JSON.parse(fs.readFileSync(path.join(P, "events.json"), "utf8"));
const OUT = path.join(P, "out/score.wav");
// 镜头结构：events.json 里每个镜头一条 shot 事件
const SHOTS = EVJ.ev.filter((e) => e.type === "shot").sort((a, b) => a.t - b.t)
  .map((e) => ({ i: e.i, type: e.kind, layout: e.layout, start: e.t, end: +(e.t + e.d).toFixed(3), ev: { lift: [e.lift], marks: [e.marks], morph: [null, e.morph] } }));
const TL = { beat: 0.6, dur: EVJ.dur, shots: SHOTS };
const SR = 48000, B = TL.beat || 0.6, BAR = 4 * B, DUR = TL.dur, N = Math.ceil((DUR + 1.2) * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const ACC = [];   // 配乐自己的重音：{type, t, i}，给 mix.py 核对画面
const acc = (type, t, i) => ACC.push({ type, t: +t.toFixed(4), i });

// 和弦：与 score.py 相同
const CH = {
  Dmaj9: { bass: ["D2", "A2"], arp: ["F#4", "A4", "E5", "C#5"], pad: ["D3", "A3"], top: "F#5" },
  Bm11: { bass: ["B1", "F#2"], arp: ["D5", "F#4", "A4", "E5"], pad: ["B2", "F#3"], top: "B4" },
  Gmaj7: { bass: ["G1", "D2"], arp: ["B4", "D5", "F#5", "D5"], pad: ["G2", "D4"], top: "B4" },
  Em9: { bass: ["E2", "B2"], arp: ["G4", "B4", "F#5", "D5"], pad: ["E3", "B3"], top: "G5" },
  Asus2: { bass: ["A1", "E2"], arp: ["E4", "B4", "C#5", "E5"], pad: ["A2", "E3"], top: "E5" },
};
const CYCLE = ["Bm11", "Gmaj7", "Em9", "Asus2"];
const HIT = { Bm11: "Asus2", Gmaj7: "Asus2", Em9: "Asus2", Asus2: "Dmaj9" };
const hz = (n) => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  const pc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  return 440 * 2 ** ((pc + 12 * (+m[3] + 1) - 69) / 12);
};

// 固定种子的噪声
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
// 带限锯齿波（polyBLEP，去掉高频锯齿声）
function saw(ph, dt) {
  let v = 2 * ph - 1;
  if (ph < dt) { const x = ph / dt; v -= x + x - x * x - 1; } else if (ph > 1 - dt) { const x = (ph - 1) / dt; v -= x * x + x + x + 1; }
  return v;
}
// 写进左右声道
function put(i, v, pan) {
  if (i < 0 || i >= N) return;
  L[i] += v * Math.cos((pan + 1) * Math.PI / 4);
  R[i] += v * Math.sin((pan + 1) * Math.PI / 4);
}
// 一阶低通（每个音符自带状态）
const lp1 = () => { let y = 0; return (x, fc) => (y += (1 - Math.exp((-2 * Math.PI * fc) / SR)) * (x - y)); };

// ---------- 乐器 ----------
// 拨弦：锯齿 + 方波混合，滤波截止频率随包络快速落下
function pluck(t, note, vel, pan = 0, dur = 0.9) {
  const f = hz(note), i0 = Math.round(t * SR), n = Math.round(dur * SR), lp = lp1(), lp2 = lp1();
  let p1 = 0, p2 = 0.37;
  for (let k = 0; k < n; k++) {
    const s = k / SR, dt = f / SR;
    p1 = (p1 + dt) % 1; p2 = (p2 + dt * 1.003) % 1;
    const raw = 0.6 * saw(p1, dt) + 0.4 * (p2 < 0.5 ? 1 : -1);
    const fc = 500 + 3800 * Math.exp(-s / 0.09);
    const a = Math.min(1, s / 0.003) * Math.exp(-s / 0.28) * Math.min(1, (dur - s) / 0.05);
    put(i0 + k, lp2(lp(raw, fc), fc * 1.2) * a * vel, pan);
  }
}
// 铺底：三个失谐锯齿，慢起慢收，暗一点
function pad(t0, t1, note, vel, pan = 0, bright = 1200) {
  const f = hz(note), i0 = Math.round(t0 * SR), n = Math.round((t1 - t0 + 0.8) * SR), lp = lp1(), lp2 = lp1();
  const det = [0, 0.0041, -0.0039].map((d) => f * (1 + d));
  const ph = [0, 0.33, 0.71];
  const len = t1 - t0;
  for (let k = 0; k < n; k++) {
    const s = k / SR;
    let raw = 0;
    for (let j = 0; j < 3; j++) { const dt = det[j] / SR; ph[j] = (ph[j] + dt) % 1; raw += saw(ph[j], dt); }
    const a = Math.min(1, s / 0.45) * (s < len ? 1 : Math.exp(-(s - len) / 0.25));
    const fc = bright * (0.8 + 0.2 * Math.min(1, s / len));
    put(i0 + k, lp2(lp(raw / 3, fc), fc) * a * vel, pan);
  }
}
// 低频：正弦加一点二次谐波，轻微饱和
function sub(t, note, dur, vel) {
  const f = hz(note), i0 = Math.round(t * SR), n = Math.round(dur * SR);
  let p = 0;
  for (let k = 0; k < n; k++) {
    const s = k / SR;
    p += (2 * Math.PI * f) / SR;
    const a = Math.min(1, s / 0.006) * (0.55 + 0.45 * Math.exp(-s / 0.15)) * Math.min(1, (dur - s) / 0.08);
    put(i0 + k, Math.tanh(1.4 * (Math.sin(p) + 0.18 * Math.sin(2 * p))) * a * vel, 0);
  }
}
// 轻铃：调频正弦，高音点缀
function bell(t, note, vel, pan = 0.1) {
  const f = hz(note), i0 = Math.round(t * SR), n = Math.round(1.6 * SR);
  let p = 0, q = 0;
  for (let k = 0; k < n; k++) {
    const s = k / SR;
    q += (2 * Math.PI * f * 3.5) / SR; p += (2 * Math.PI * f) / SR;
    put(i0 + k, Math.sin(p + 1.2 * Math.exp(-s / 0.12) * Math.sin(q)) * Math.exp(-s / 0.45) * Math.min(1, s / 0.002) * vel, pan);
  }
}
// 轻鼓：底鼓（音高下滑的正弦）和高帽（高通噪声）
function kick(t, vel) {
  const i0 = Math.round(t * SR), n = Math.round(0.35 * SR);
  let p = 0;
  for (let k = 0; k < n; k++) {
    const s = k / SR;
    p += (2 * Math.PI * (48 + 80 * Math.exp(-s / 0.03))) / SR;
    put(i0 + k, Math.sin(p) * Math.exp(-s / 0.12) * vel, 0);
  }
}
function hat(t, vel, pan = 0.25) {
  const i0 = Math.round(t * SR), n = Math.round(0.06 * SR);
  let y = 0, x1 = 0;
  for (let k = 0; k < n; k++) {
    const x = rnd();
    y = 0.6 * (y + x - x1); x1 = x; // 一阶高通
    put(i0 + k, y * Math.exp(-(k / SR) / 0.012) * vel, pan);
  }
}

// ---------- 按时间线编排 ----------
let featN = 0, drums = false;
const endIdx = TL.shots.findIndex((x) => x.type === "end");
for (const s of TL.shots) {
  const a = s.start, ev = s.ev;
  // 落版之后的镜头（库示范片只署 NEO-Cine 的片尾卡）不另起和弦：落版的主和弦一直留到片尾
  if (endIdx >= 0 && s.i > endIdx) continue;
  const b = s.type === "end" ? DUR : s.end;
  const name = s.type === "feature" ? CYCLE[featN++ % CYCLE.length] : "Dmaj9";
  const ch = CH[name];
  if (s.type === "statement") {
    // 章节大字：鼓和拨弦停下，只留属和弦（Asus2）的长音和一记低音，像吸一口气，下一镜再接回来
    const st = CH.Asus2;
    st.pad.forEach((p, k) => pad(a, b + 0.2, p, 0.13 - 0.02 * k, k ? 0.35 : -0.35, 1100));
    pad(a, b + 0.2, st.top, 0.05, 0.25, 1500);
    sub(a, st.bass[0], b - a, 0.46);
    bell(a, "E5", 0.08);
    acc("cut", a, s.i);
    continue;
  }
  if (s.type === "end") {
    // 落版：主和弦铺开，一个低音，一声轻铃，余音到片尾
    ch.pad.forEach((p, k) => pad(a, b + 0.4, p, 0.16 - 0.03 * k, k ? 0.3 : -0.3, 900));
    pad(a, b + 0.4, ch.top, 0.07, 0.2, 1400);
    sub(a, ch.bass[0], b - a + 0.8, 0.34);
    ch.arp.forEach((p, k) => pluck(a + 0.15 * k, p, 0.12 - 0.015 * k, k % 2 ? 0.35 : -0.35, 1.4));
    if (ev.morph[1] != null) { bell(ev.morph[1], "A5", 0.1); acc("square", ev.morph[1], s.i); }
    if (s.i > 0) acc("cut", a, s.i);
    continue;
  }
  // 铺底：开场只有暗一点的两个音，第一个产品镜头起加上高音、滤波打开一点
  ch.pad.forEach((p, k) => pad(a, b, p, (s.type === "opening" ? 0.11 : 0.14) - 0.02 * k, k ? 0.35 : -0.35, s.type === "opening" ? 800 : 1300));
  if (s.type === "feature") pad(a, b, ch.top, 0.05, 0.25, 1500);
  // 低频：每小节一次，切点那一拍加重
  for (let t = a; t < b - 0.3; t += BAR) sub(t, ch.bass[0], Math.min(BAR, b - t), t === a ? 0.42 : 0.32);
  if (s.i > 0) acc("cut", a, s.i);   // 切点那一拍的低音
  // 拨弦：拍点在全片网格上，强拍稍重；左右交替
  for (let k = Math.round(a / B); k * B < b - 0.05; k++) {
    const t = k * B;
    if (t < a - 1e-6) continue;
    pluck(t, ch.arp[(k - Math.round(a / B)) % 4], k % 4 === 0 ? 0.16 : 0.12, (k % 2 ? 0.3 : -0.3));
    // 附点八分回声（0.45 秒后，轻一些，偏到另一边）
    pluck(t + 0.45, ch.arp[(k - Math.round(a / B)) % 4], 0.045, (k % 2 ? -0.5 : 0.5));
  }
  if (s.type === "feature") {
    // 轻鼓点从第一个产品镜头进来：每拍一个很轻的底鼓，反拍一个高帽；切点那一拍底鼓加重
    drums = true;
    for (let t = a; t < b - 1e-6; t += B) {
      kick(t, t === a ? 0.5 : 0.22);
      hat(t + B / 2, 0.05);
    }
    // 抬起：落一个和弦（拨弦叠三个音 + 低频），角点那一拍点高音
    const h = CH[HIT[name]], Lt = ev.lift[0];
    [h.bass[1], h.arp[0], h.arp[1]].forEach((p, k) => pluck(Lt, p.replace(/\d$/, (d) => (k ? d : String(+d + 1))), 0.16, k ? 0.2 : -0.2, 1.2));
    sub(Lt, h.bass[0], 1.0, 0.4);
    bell(ev.marks[0], "A5", 0.09);
    acc("lift", Lt, s.i);
    acc(s.layout === "compare" ? "join" : "mark", ev.marks[0], s.i);   // compare 没有角点：这一拍是括线开始画
  }
}

// ---------- 混响（4 个梳状 + 2 个全通，左右声道延时不同） ----------
function reverb(x, offs) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ b: new Float32Array(d + offs), i: 0, f: 0.78, s: 0 }));
  const aps = [225, 556].map((d) => ({ b: new Float32Array(d + Math.round(offs / 3)), i: 0 }));
  const y = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let o = 0;
    for (const c of combs) {
      const v = c.b[c.i];
      c.s = v * 0.7 + c.s * 0.3; // 梳状里带一点低通，混响尾巴不刺耳
      c.b[c.i] = x[n] + c.s * c.f; c.i = (c.i + 1) % c.b.length; o += v;
    }
    o *= 0.25;
    for (const a of aps) { const v = a.b[a.i]; a.b[a.i] = o + v * 0.5; a.i = (a.i + 1) % a.b.length; o = v - 0.5 * o; }
    y[n] = o;
  }
  return y;
}
const wl = reverb(L, 0), wr = reverb(R, 23);
for (let i = 0; i < N; i++) { L[i] = L[i] + 0.28 * wl[i]; R[i] = R[i] + 0.28 * wr[i]; }

// ---------- 写文件：按峰值 −1 dBFS 写出；响度在 tools/mix.py 里统一定（配乐 −23 LUFS，音效、旁白按它摆，再整体做到 −14 LUFS）----------
let m = 0;
for (let i = 0; i < N; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
const g = 10 ** (-1 / 20) / (m || 1);
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buf);
fs.writeFileSync(OUT.replace(/\.wav$/, ".json"), JSON.stringify({ dur: +(N / SR).toFixed(3), engine: "代码合成（kit/tools/score.mjs）", accents: ACC }, null, 1));
console.log(`配乐 → out/score.wav ${(N / SR).toFixed(2)}s，重音 ${ACC.length} 个${drums ? "" : "（没有产品镜头）"}`);
