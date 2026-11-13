// 微缩景观工具包 · 小人。
// 参数化的体块小人：大腿、小腿、身体、手臂、头、头发，外加行李箱 / 双肩包 / 手提包。身高约 1.75（≈ 0.3 层），
// 颜色从 materials.js 的色板里按种子挑。所有人共用一套 InstancedMesh（每个部件一个），一百个人也只是十几次绘制。
// 每个人有一份"行程"（plan），编译成按时间排好的段：走、等、坐、乘扶梯、上下楼梯、把包放上传送带、上车消失……
// pose(t) 只由 t 决定。
import * as THREE from 'three';
import { bevelBox, sphere } from './geom.js';
import { CLOTHES, SKIN, HAIR, PALETTE } from './materials.js';
import { Path, clamp, seg, lerp, lerpAngle, rng, dist3, PI } from './core.js';

export const WALK = 1.9;          // 默认步行速度（单位/秒）。模型里略快于真人，镜头里读起来才"在走"
const STRIDE = 1.25;              // 一个完整步态周期走过的距离

// 外观：r 是 rng；o 里可以指定 shirt、pants、bag（'none' | 'suitcase' | 'backpack' | 'handbag'）、bagColor、scale
export function makeLook(r, o = {}) {
  return {
    shirt: o.shirt ?? r.pick(CLOTHES), pants: o.pants ?? r.pick(['#3a4048', '#4b4f57', '#5b5148', '#2e3338', '#6c6a66', '#8a8378']),
    skin: o.skin ?? r.pick(SKIN), hair: o.hair ?? r.pick(HAIR),
    bag: o.bag ?? r.pick(['none', 'none', 'suitcase', 'backpack', 'handbag']), bagColor: o.bagColor ?? r.pick(['#6d7f8c', '#b0a48f', '#4f5a62', '#9c5b4e', '#c8c2b4', '#5f6f5e']),
    scale: o.scale ?? r.range(.93, 1.05),
  };
}

// —— 行程编译 ——
// plan 是一串动作，第一个动作前人站在 at。动作（都可以带 mark: '名字'，记下这个动作开始的时间）：
//   { walk: [[x,y,z], …], speed }      沿折线走（从当前位置出发）
//   { wait: 秒, face: 角度 }            原地等（face 可选：转向这个朝向，0 = 朝 +z）
//   { until: 时间 }                     等到某个时刻
//   { sit: 秒, seat: {p, rot} }         走到座位前坐下 sit 秒（座位来自 parts.bench 的返回值）
//   { ride: 扶梯 }                      乘扶梯（parts.escalator 的返回值），站着不迈步
//   { climb: 路径点, speed }            走楼梯（步子更碎，速度默认 0.8 × WALK）
//   { bagOff: 路径点, dur }             把包放到传送带上，包沿路径走 dur 秒，然后停在终点
//   { bagOn: true }                     把包拿回来
//   { hide: true }                      消失（上车、走出切面）
// 返回 { segs, end, marks, events }
export function compilePlan(at, start, plan, ctx = {}) {
  const segs = [], marks = {}, events = [];
  let t = start, p = at.slice(), face = 0, bag = { on: true };
  const push = s => { segs.push(s); return s; };
  const walkTo = (pts, speed, kind = 'walk') => {
    const path = new Path([p, ...pts]); if (path.length < 1e-4) return;
    const dur = path.length / speed;
    push({ kind, t0: t, t1: t + dur, path, speed }); t += dur; p = pts[pts.length - 1].slice(); face = path.heading(path.length);
  };
  for (const it of plan) {
    if (it.mark) marks[it.mark] = t;
    if (it.walk) walkTo(it.walk, it.speed ?? WALK);
    else if (it.climb) walkTo(it.climb, it.speed ?? WALK * .8, 'climb');
    else if (it.ride) {
      const e = it.ride, path = e.path;
      walkTo([path[0], path[1]], it.speed ?? WALK);
      const P = new Path([path[1], path[2]]), dur = P.length / e.speed;
      push({ kind: 'ride', t0: t, t1: t + dur, path: P }); t += dur; p = path[2].slice(); face = P.heading(P.length);
      walkTo([path[3]], WALK);
    }
    else if (it.wait != null || it.until != null) {
      const dur = it.until != null ? Math.max(0, it.until - t) : it.wait;
      const f1 = it.face ?? face;
      push({ kind: 'wait', t0: t, t1: t + dur, p: p.slice(), f0: face, f1 }); t += dur; face = f1;
    }
    else if (it.sit != null) {
      const s = it.seat, front = [s.p[0] + Math.sin(s.rot) * .55, s.p[1], s.p[2] + Math.cos(s.rot) * .55];
      walkTo([front], WALK);
      push({ kind: 'turn', t0: t, t1: t + .35, p: p.slice(), f0: face, f1: s.rot }); t += .35; face = s.rot;
      push({ kind: 'sit', t0: t, t1: t + it.sit, p: p.slice(), seatP: s.p, f: s.rot }); t += it.sit;
    }
    else if (it.bagOff) { bag = { on: false, t0: t, dur: it.dur ?? 2, path: new Path(it.bagOff) }; push({ kind: 'bagOff', t0: t, t1: t, bag }); }
    else if (it.bagOn) { push({ kind: 'bagOn', t0: t, t1: t }); bag = { on: true }; }
    else if (it.hide) { push({ kind: 'hide', t0: t, t1: Infinity }); }
    if (it.event) events.push({ t, ...it.event });
    if (it.markEnd) marks[it.markEnd] = t;
  }
  return { segs, end: t, marks, events, at: at.slice(), start, lastFace: face };
}

// 某一时刻的姿态：{ p:[x,y,z], h: 朝向, gait: 步态相位（不走时为 null）, sit: 0–1, visible, bag: 包的位置或 null（跟着人）, climb }
function poseOf(c, t) {
  const out = { p: c.at, h: c.face0 ?? 0, gait: null, sit: 0, visible: t >= c.show, bag: null, ride: false, climb: false };
  if (c.hideBefore && t < c.start) out.visible = false;
  let bagState = null;
  for (const s of c.segs) {
    if (s.kind === 'bagOff' && t >= s.t0) bagState = s.bag;
    if (s.kind === 'bagOn' && t >= s.t0) bagState = null;
    if (t < s.t0) break;
    if (s.kind === 'hide') { out.visible = false; break; }
    const u = seg(t, s.t0, s.t1);
    if (s.kind === 'walk' || s.kind === 'climb' || s.kind === 'ride') {
      const d = u * s.path.length, q = s.path.at(d);
      out.p = q.p;
      // 朝向：看前后各 0.3 的两点，拐角处自然转过去
      const a = s.path.at(Math.max(0, d - .3)).p, b = s.path.at(Math.min(s.path.length, d + .3)).p;
      if (Math.hypot(b[0] - a[0], b[2] - a[2]) > 1e-3) out.h = Math.atan2(b[0] - a[0], b[2] - a[2]);
      out.gait = s.kind === 'ride' || t >= s.t1 ? null : (s.cum0 + d) / (s.kind === 'climb' ? STRIDE * .55 : STRIDE);
      out.ride = s.kind === 'ride' && t < s.t1; out.climb = s.kind === 'climb' && t < s.t1;
    } else if (s.kind === 'wait' || s.kind === 'turn') {
      out.p = s.p; out.h = lerpAngle(s.f0, s.f1, clamp((t - s.t0) / .35)); out.gait = null;
    } else if (s.kind === 'sit') {
      const k = Math.min(seg(t, s.t0, s.t0 + .45), 1 - seg(t, s.t1 - .45, s.t1));
      out.p = [lerp(s.p[0], s.seatP[0], k), s.p[1], lerp(s.p[2], s.seatP[2], k)]; out.h = s.f; out.sit = k; out.gait = null;
    }
  }
  if (bagState) { const u = seg(t, bagState.t0, bagState.t0 + bagState.dur); out.bag = bagState.path.at(u * bagState.path.length).p; }
  return out;
}

// —— 人群（实例化渲染）——
export class Crowd {
  constructor(parent, { max = 200, clip = null } = {}) {
    this.people = []; this.max = max;
    const M = c => { const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .7 }); if (clip) { m.clippingPlanes = clip; m.clipShadows = true; } return m; };
    const mk = (geo, n) => { const im = new THREE.InstancedMesh(geo, M(), n); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.count = 0; parent.add(im); return im; };
    const thigh = bevelBox(.15, .43, .17, .05).clone().translate(0, -.215, 0), shin = bevelBox(.14, .42, .16, .05).clone().translate(0, -.21, 0);
    const arm = bevelBox(.1, .56, .12, .045).clone().translate(0, -.26, 0);
    this.parts = {
      thigh: mk(thigh, max * 2), shin: mk(shin, max * 2), arm: mk(arm, max * 2),
      torso: mk(bevelBox(.4, .6, .25, .08), max), head: mk(sphere(.115, 14, 10), max), hair: mk(sphere(.122, 14, 8), max),
      case: mk(bevelBox(.38, .52, .24, .06), max), handle: mk(bevelBox(.03, .42, .03, .012), max), pack: mk(bevelBox(.3, .4, .15, .06), max),
    };
    this._m = new THREE.Matrix4(); this._b = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
  }
  // 加一个人：look（makeLook 的结果）、at（起点）、start（行程开始时间）、plan；
  // show：从什么时候开始可见（默认一直可见；从切面或车门里出来的人设成 start）
  add({ id, look, at, start = 0, plan = [], show = -Infinity, face = 0 }) {
    const c = compilePlan(at, start, plan);
    let cum = 0; for (const s of c.segs) if (s.path) { s.cum0 = cum; cum += s.path.length; }
    Object.assign(c, { id, look, show, face0: face });
    this.people.push(c); return c;
  }
  // 每一帧：把每个人的姿态写进实例矩阵
  update(t) {
    const P = this.parts, cnt = { thigh: 0, shin: 0, arm: 0, torso: 0, head: 0, hair: 0, case: 0, handle: 0, pack: 0 };
    const col = new THREE.Color(), m = this._m, base = this._b, q = this._q, v = this._v;
    const put = (name, mat, color) => { const im = P[name], i = cnt[name]++; im.setMatrixAt(i, mat); col.set(color); im.setColorAt(i, col); };
    const local = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
      q.setFromEuler(new THREE.Euler(rx, ry, rz)); m.compose(v.set(x, y, z), q, this._s.set(sx, sy, sz)); return m.premultiply(base);
    };
    for (const c of this.people) {
      const o = poseOf(c, t), L = c.look;
      if (!o.visible) continue;
      const s = L.scale;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.h); base.compose(v.set(o.p[0], o.p[1], o.p[2]), q, this._s.set(s, s, s));
      const ph = o.gait == null ? 0 : o.gait * PI * 2, sw = o.gait == null ? 0 : Math.sin(ph), sit = o.sit;
      const bob = o.gait == null ? 0 : Math.abs(Math.cos(ph)) * .025;
      const hipY = lerp(.86 + bob, .48, sit), sink = lerp(0, -.38, sit);
      // 腿：走路时大腿摆 ±0.42 rad，小腿在后摆时弯一点；坐下时大腿水平、小腿垂直
      for (const side of [-1, 1]) {
        const a = sw * side * (o.climb ? .55 : .42), thighA = lerp(a, -PI / 2, sit);
        const knee = lerp(Math.max(0, -a) * .9 + (o.climb ? .35 : 0), PI / 2, sit);
        put('thigh', local(side * .09, hipY, 0, thighA), L.pants);
        const kx = side * .09, ky = hipY - .43 * Math.cos(thighA), kz = .43 * Math.sin(-thighA) * -1;
        put('shin', local(kx, ky, -kz, thighA + knee), L.pants);
      }
      put('torso', local(0, 1.16 + bob + sink, sit * -.04), L.shirt);
      const pulling = L.bag === 'suitcase' && !o.bag && o.gait != null;
      for (const side of [-1, 1]) {
        let a = -sw * side * .38;
        if (side === 1 && L.bag === 'suitcase' && !o.bag && o.gait != null) a = .55;     // 右手往后拉箱子
        if (side === 1 && L.bag === 'suitcase' && !o.bag && o.gait == null && !sit) a = .12;
        put('arm', local(side * .255, 1.43 + bob + sink, 0, a + sit * -.5, 0, side * .05), L.shirt);
      }
      put('head', local(0, 1.6 + bob + sink, .01), L.skin);
      put('hair', local(0, 1.64 + bob + sink, -.025, 0, 0, 0, 1, .75, 1), L.hair);
      if (L.bag === 'backpack') put('pack', local(0, 1.16 + bob + sink, -.21), L.bagColor);
      else if (L.bag === 'handbag') put('pack', local(-.3, .92 + bob + sink, 0, 0, 0, 0, .7, .7, 1.1), L.bagColor);
      else if (L.bag === 'suitcase') {
        if (o.bag) {           // 在传送带上：用世界坐标
          base.compose(v.set(o.bag[0], o.bag[1] + .14, o.bag[2]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), PI / 2).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.h)), this._s.set(s, s, s));
          put('case', local(0, 0, 0), L.bagColor); put('handle', local(0, -1, 0, 0, 0, 0, 0, 0, 0), L.bagColor);
        } else if (pulling) {
          put('case', local(.36, .3, -.62, .5), L.bagColor); put('handle', local(.36, .78, -.38, .5), '#3a3f42');
        } else {
          const sx = sit ? .55 : .42, sz = sit ? .25 : .1;
          put('case', local(sx, .3, sz), L.bagColor); put('handle', local(sx, .76, sz - .08), '#3a3f42');
        }
      }
    }
    for (const k in P) { P[k].count = cnt[k]; P[k].instanceMatrix.needsUpdate = true; if (P[k].instanceColor) P[k].instanceColor.needsUpdate = true; }
  }
  // 某人此刻的位置（讲解层把标注引到人身上时用）
  where(id, t) { const c = this.people.find(p => p.id === id); return c ? poseOf(c, t).p : null; }
  get(id) { return this.people.find(p => p.id === id); }
}

// —— 常用人群生成器（都按种子）——
// 坐满一部分座位：seats 是座位列表，fill 是占用比例；返回加进去的人
export function seated(crowd, seats, { fill = .5, seed = 1, skip = [] } = {}) {
  const r = rng(seed), out = [];
  seats.forEach((s, i) => {
    if (skip.includes(i) || r() > fill) return;
    out.push(crowd.add({ look: makeLook(r), at: s.p, start: -1, face: s.rot, plan: [{ sit: 999, seat: s }] }));
  });
  return out;
}
// 一批人沿同一条路线先后走过（从 t0 起每 every 秒一个，左右错开 spread），走完消失
export function stream(crowd, path, { t0 = 0, n = 6, every = 1.2, spread = .5, speed = WALK, seed = 3, hideEnd = true, look = {} } = {}) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const off = r.range(-spread, spread), start = t0 + i * every + r.range(0, every * .4);
    const pts = offsetPath(path, off);
    const plan = [{ walk: pts.slice(1), speed: speed * r.range(.9, 1.08) }]; if (hideEnd) plan.push({ hide: true });
    out.push(crowd.add({ look: makeLook(r, look), at: pts[0], start, show: start, plan }));
  }
  return out;
}
// 折线整体平移 off（垂直于每段方向的水平偏移），让一群人不踩同一条线
export function offsetPath(pts, off) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1;
    return [p[0] - dz / L * off, p[1], p[2] + dx / L * off];
  });
}
