// 微缩景观工具包 · 基础：按种子的随机、缓动、折线路径、关键帧。
// 工具包里所有会动的东西都是时间 t 的纯函数：同一个 t 永远得到同一帧，所以可以多进程并行渲染、任意跳帧。
export const PI = Math.PI, TAU = Math.PI * 2, D2R = Math.PI / 180;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const seg = (t, a, b) => b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a));   // a→b 之间 0→1
export const smooth = u => { u = clamp(u); return u * u * (3 - 2 * u); };
export const eio = u => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };   // 三次缓入缓出
export const eio2 = u => { u = clamp(u); return u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; };      // 二次，更软
export const eo = u => 1 - Math.pow(1 - clamp(u), 3);
export const ei = u => Math.pow(clamp(u), 3);
export const EASE = { linear: u => clamp(u), smooth, eio, eio2, eo, ei };
// 0→1→0 的包络：[a,b] 之间是 1，前后各有 fi / fo 秒的渐变
export const env = (t, a, b, fi = .3, fo = .3) => Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));
export const wrapAngle = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
export const lerpAngle = (a, b, u) => a + wrapAngle(b - a) * u;

// 按种子的随机数（mulberry32）。工具包里每一处随机都从这里取，种子写在场景描述里。
export function rng(seed) {
  let s = seed | 0;
  const r = () => { s = s + 0x6D2B79F5 | 0; let x = Math.imul(s ^ s >>> 15, 1 | s); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  r.range = (a, b) => a + (b - a) * r();
  r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
  r.pick = arr => arr[Math.floor(r() * arr.length) % arr.length];
  r.fork = k => rng((seed * 9973 + k * 7919) | 0);
  return r;
}
// 一个数的稳定哈希 → [0,1)，给"第 i 个东西"一个不依赖调用顺序的随机值
export const hash1 = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// 折线路径：点是 [x,y,z]。length、at(d) 取沿线距离 d 处的点和朝向，用来走人、长动线、放沿线的东西。
export class Path {
  constructor(pts) {
    this.p = pts.map(q => q.slice()); this.cum = [0];
    for (let i = 1; i < this.p.length; i++) this.cum.push(this.cum[i - 1] + dist3(this.p[i - 1], this.p[i]));
    this.length = this.cum[this.cum.length - 1];
  }
  // 沿线距离 d 处：{ p:[x,y,z], dir:[dx,dy,dz]（单位向量）, i（所在段）}
  at(d) {
    const c = this.cum, n = this.p.length;
    if (n === 1) return { p: this.p[0].slice(), dir: [0, 0, 1], i: 0 };
    d = clamp(d, 0, this.length);
    let i = 0; while (i < n - 2 && c[i + 1] < d) i++;
    const L = c[i + 1] - c[i] || 1e-9, u = (d - c[i]) / L, a = this.p[i], b = this.p[i + 1];
    return { p: [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)], dir: [(b[0] - a[0]) / L, (b[1] - a[1]) / L, (b[2] - a[2]) / L], i };
  }
  // 水平朝向（绕 y 的角，0 = 朝 +z）
  heading(d) { const { dir } = this.at(d); return Math.atan2(dir[0], dir[2]); }
}
export const dist3 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

// 关键帧：keys = [[t, value], …]，value 可以是数或数组；每段用 ease（默认三次缓入缓出），段外保持端点。
// 和样条不同，它在每个关键帧上速度为零：适合"推近、停住、再移"这种讲解镜头。
export function keyframes(keys, ease = eio) {
  keys = keys.slice().sort((a, b) => a[0] - b[0]);
  return t => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0, e0] = keys[i], [t1, v1] = keys[i + 1];
      if (t <= t1) {
        const u = (e0 || ease)(seg(t, t0, t1));
        return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], u)) : lerp(v0, v1, u);
      }
    }
    return keys[keys.length - 1][1];
  };
}

// 匀减速进站、匀加速出站。D 是减速（加速）段走过的距离，T 是用时；初速 = 2D/T，正好在 T 时停住。
//   arrive(u) = 停车点 − D·(1−u)²；depart(u) = 停车点 + D·u²
export function brakeIn(t, t0, t1, D) { const u = seg(t, t0, t1); return -D * (1 - u) * (1 - u); }
export function pullOut(t, t0, t1, D) { const u = seg(t, t0, t1); return D * u * u; }
// 一辆车沿一条轴的位置：在 stop 前 arrive 段减速、dwell 停住、depart 段加速离开；返回相对 stop 的偏移
export function stopAndGo(t, { arrive, depart, D = 40, D2 = D }) {
  if (t < arrive[0]) return -D - 2 * D / (arrive[1] - arrive[0]) * (arrive[0] - t);   // 减速前：以初速匀速开来
  if (t < arrive[1]) return brakeIn(t, arrive[0], arrive[1], D);
  if (!depart || t < depart[0]) return 0;
  if (t > depart[1]) return D2 + 2 * D2 / (depart[1] - depart[0]) * (t - depart[1]); // 加速完：以末速匀速开走
  return pullOut(t, depart[0], depart[1], D2);
}

// 时间引用："@名字+1.2" → 由 marks 里的时间算出；数字原样返回。场景描述里写时间时可以挂在某个动作上。
export function resolveTime(v, marks) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string' || v[0] !== '@') throw new Error('时间写法不认识：' + v);
  const m = /^@([\w.-]+?)([+-][\d.]+)?$/.exec(v);
  if (!m || !(m[1] in marks)) throw new Error('没有这个时间标记：' + v + '（已有：' + Object.keys(marks).join(', ') + '）');
  return marks[m[1]] + (m[2] ? +m[2] : 0);
}
