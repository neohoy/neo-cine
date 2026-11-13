// 微缩景观工具包 · 场景描述 → 模型。
// 一个微缩景观写成一份数据（见 STYLE.md §10 的格式说明）：底座、土体和挖空、构件清单（build）、可抬升的组（groups）、
// 会亮的批次（glow）、人（people，含行程）、人群（crowds）、车（vehicles）、动线（routes）、讲解步骤（steps）、天色（light）。
// buildMiniature(spec, { renderer }) 把它搭出来，返回 world：world.update(t) 摆好这一刻的一切（3D），
// world.marks 是所有时间标记（"@hero.door" 这种写法在描述里任何写时间的地方都能用）。
import * as THREE from 'three';
import { Batch, bevelBox } from './geom.js';
import { PALETTE, mat, Glow } from './materials.js';
import { plinth, soil, slab, wall, glassWall, putBox, clipPlane } from './base.js';
import * as P from './parts.js';
import { Crowd, makeLook, seated, stream, offsetPath, WALK } from './people.js';
import { train, schedule, bus, car, traffic } from './vehicles.js';
import { RouteDots } from './explain.js';
import { rng, resolveTime, seg, eio, keyframes, Path } from './core.js';

export function buildMiniature(spec, { renderer = null } = {}) {
  const root = new THREE.Group(), refs = {}, updaters = [], marks = { ...(spec.marks || {}) };
  const glow = new Glow(), r = rng(spec.seed ?? 1);
  const T = v => resolveTime(v, marks);
  const bd = spec.board;
  // 板子两端的切面：车、人、动线都按它裁剪（从切面里开进开出）
  const clip = [clipPlane({ axis: 'x', at: bd.x[1], keep: -1 }), clipPlane({ axis: 'x', at: bd.x[0], keep: 1 }), clipPlane({ axis: 'z', at: bd.z[1], keep: -1 }), clipPlane({ axis: 'z', at: bd.z[0], keep: 1 })];
  if (renderer) renderer.localClippingEnabled = true;

  // —— 组（可抬升的屋顶、楼层）——
  const groups = { main: { node: root, batch: new Batch() } };
  for (const [id, g] of Object.entries(spec.groups || {})) { const node = new THREE.Group(); root.add(node); groups[id] = { node, batch: new Batch(), spec: g }; }
  const G = it => groups[it.group || 'main'];

  // —— 会亮的批次 ——
  const glowMats = {};
  for (const [id, gs] of Object.entries(spec.glow || {})) glowMats[id] = glow.make(id, gs.color || '#ffdcae', gs.base || PALETTE.ivory, gs);
  const gm = id => glowMats[id] || glowMats[Object.keys(glowMats)[0]];

  // —— 底座和土体 ——
  const base = groups.main.batch;
  refs.plinth = plinth(base, { x: bd.x, z: bd.z, bottom: bd.top - bd.soil, ...(bd.plinth || {}) });
  soil(base, { x: bd.x, z: bd.z, top: bd.top, depth: bd.soil, voids: bd.voids || [], strata: bd.strata });

  // —— 构件 ——
  const expand = it => {
    if (!it.repeat) return [it];
    const out = [], { n, d } = it.repeat;
    for (let i = 0; i < n; i++) {
      const c = { ...it, repeat: null, id: it.id ? `${it.id}.${i}` : undefined, seed: (it.seed ?? 1) + i * 17 };
      if (it.at) c.at = it.at.map((x, k) => x + d[k] * i);
      out.push(c);
    }
    return out;
  };
  const BUILD = {
    box: (it, g) => putBox(g.batch, it.glow ? gm(it.glow) : mat(it.color || PALETTE.white, it.mat || {}), it.box, it.r ?? .04),
    slab: (it, g) => slab(g.batch, it),
    wall: (it, g) => wall(g.batch, it),
    glassWall: (it, g) => glassWall(g.batch, { ...it, glassMat: it.glow ? gm(it.glow) : null }),
    column: (it, g) => P.column(g.batch, it),
    beam: (it, g) => P.beam(g.batch, it),
    railing: (it, g) => P.railing(g.batch, it),
    stairs: (it, g) => P.stairs(g.batch, it),
    escalator: (it, g) => { const e = P.escalator(g.node, it); updaters.push(e.update); return e; },
    gates: (it, g) => { const sch = []; const e = P.gates(g.node, g.batch, { ...it, schedule: sch }); e.schedule = sch; updaters.push(e.update); return e; },
    bench: (it, g) => P.bench(g.batch, it),
    bin: (it, g) => P.bin(g.batch, it),
    sign: (it, g) => P.sign(g.batch, it),
    canopy: (it, g) => P.canopy(g.batch, it),
    tree: (it, g) => P.tree(g.batch, it),
    shrub: (it, g) => P.shrub(g.batch, it),
    lamp: (it, g) => P.lamp(g.batch, { ...it, glowMat: gm(it.glow) }),
    mast: (it, g) => P.mast(g.batch, it),
    board: (it, g) => P.board(g.node, g.batch, { ...it, glowMat: gm(it.glow), hiMat: gm(it.hi) }),
    scanner: (it, g) => P.scanner(g.batch, it),
    detector: (it, g) => P.frameDetector(g.batch, it),
    door: (it, g) => { const d = P.slidingDoor(g.node, { ...it, open: it.open || (() => 0) }); updaters.push(d.update); return d; },
    // 铁轨：道床 + 两根钢轨 + 轨枕（轨枕只画在板子范围内）
    track: (it, g) => {
      const { x, z, y = 0 } = it, b = g.batch;
      putBox(b, mat(PALETTE.ballast, { rough: .95 }), { x, y: [y, y + .25], z: [z - 1.8, z + 1.8] }, .05);
      for (let s = x[0] + .4; s < x[1]; s += .9) b.add(bevelBox(.22, .08, 2.5, .02), mat('#b3aea3', { rough: .9 }), s, y + .29, z);
      for (const o of [-.72, .72]) putBox(b, mat(PALETTE.rail, { rough: .35, metal: .7 }), { x, y: [y + .25, y + .4], z: [z + o - .05, z + o + .05] }, .01);
    },
    // 站台：一块板，两侧边缘一条点缀色的安全线
    platform: (it, g) => {
      slab(g.batch, { x: it.x, z: it.z, y: it.y, t: it.y, holes: it.holes || [], color: PALETTE.platform, edge: PALETTE.bone });
      for (const ze of [it.z[0] + .45, it.z[1] - .45]) putBox(g.batch, mat(it.line || PALETTE.amber, { rough: .6 }), { x: it.x, y: [it.y, it.y + .02], z: [ze - .15, ze + .15] }, .0);
    },
    // 吸顶灯带：一条会亮的扁盒
    lightPanel: (it, g) => putBox(g.batch, gm(it.glow), it.box, .02),
  };
  for (const raw of spec.build || []) for (const it of expand(raw)) {
    const f = BUILD[it.type]; if (!f) throw new Error('场景描述里有不认识的构件：' + it.type);
    const out = f(it, G(it)); if (it.id) refs[it.id] = out;
  }

  // —— 车 ——
  const vehicleOf = {};
  for (const v of spec.vehicles || []) {
    const c = v.clip === false ? null : clip;
    if (v.type === 'train') {
      const tr = train(root, { ...v, clip: c, windowMat: v.glow ? gm(v.glow) : undefined });
      const sc = schedule(tr, v);
      Object.assign(marks, { [`${v.id}.arrive`]: v.arrive[0], [`${v.id}.stop`]: v.arrive[1], [`${v.id}.open`]: v.doors?.[0], [`${v.id}.close`]: v.doors?.[1], [`${v.id}.depart`]: v.depart?.[0], [`${v.id}.gone`]: v.depart?.[1] });
      updaters.push(sc.update); vehicleOf[v.id] = { ...tr, ...sc, spec: v };
    } else if (v.type === 'traffic') {
      updaters.push(traffic(root, { ...v, clip: c }).update);
    } else {
      const o = v.type === 'bus' ? bus(root, { clip: c, color: v.color }) : car(root, { clip: c, color: v.color, kind: v.type });
      const sc = schedule(o, { ...v, track: v.lane });
      if (v.arrive) Object.assign(marks, { [`${v.id}.arrive`]: v.arrive[0], [`${v.id}.stop`]: v.arrive[1], [`${v.id}.depart`]: v.depart?.[0] });
      updaters.push(sc.update); vehicleOf[v.id] = { ...o, ...sc, spec: v };
    }
  }
  refs.vehicles = vehicleOf;

  // —— 人 ——
  // 行程里的引用展开成 people.js 认识的基本动作
  const crowd = new Crowd(root, { max: spec.maxPeople || 220, clip });
  const gateEvents = [];
  const expandPlan = (plan, who) => plan.flatMap(it => {
    const m = it.mark ? { mark: it.mark } : {};
    if (it.gate) {                // { gate: [闸机 id, 通道号, 方向 ±1], hold: 秒 }
      const [id, lane, dir = 1] = it.gate, [a, b] = refs[id].lane(lane, dir), hold = it.hold ?? .8;
      return [{ walk: [a], ...m }, { wait: hold, event: { type: 'gate', id, lane, hold }, face: Math.atan2(b[0] - a[0], b[2] - a[2]) }, { walk: [b], speed: it.speed, markEnd: it.markEnd }];
    }
    if (typeof it.ride === 'string') return [{ ...it, ride: refs[it.ride] }];
    if (typeof it.climb === 'string') {        // { climb: 楼梯 id, down: true }
      let p = refs[it.climb]; if (it.down) p = p.slice().reverse();
      return [{ walk: [p[0]], ...m }, { climb: [p[1], p[2]], speed: it.speed }, { walk: [p[3]], markEnd: it.markEnd }];
    }
    if (it.sit != null && Array.isArray(it.seat)) return [{ ...it, seat: refs[it.seat[0]][it.seat[1]] }];
    if (typeof it.bagOff === 'string') return [{ ...it, bagOff: refs[it.bagOff] }];
    if (it.board) {               // { board: [车 id, 门号, 哪一侧 ±1] }：走到门外 → 等门开 → 进门 → 消失
      const [vid, k, side = 1] = it.board, v = vehicleOf[vid], d = v.doorAt(k, side), out = [d[0], it.y ?? 1.1, d[2] + side * .9];
      return [{ walk: [out], ...m }, { until: T(`@${vid}.open`) + (it.after ?? .4), face: Math.atan2(0, -side) }, { walk: [[d[0], out[1], d[2]]], speed: 1.4 }, { hide: true, mark: it.markEnd || 'boarded' }];
    }
    if (it.until != null && typeof it.until === 'string') return [{ ...it, until: T(it.until) }];
    return [it];
  });
  const addPerson = p => {
    const look = makeLook(r.fork(p.seed ?? crowd.people.length + 1), p.look || {});
    const c = crowd.add({ id: p.id, look, at: p.at, start: T(p.start ?? 0), show: p.show != null ? T(p.show) : -Infinity, face: p.face ?? 0, plan: expandPlan(p.plan || [], p.id) });
    if (p.id) for (const [k, v] of Object.entries(c.marks)) marks[`${p.id}.${k}`] = v;
    for (const e of c.events) if (e.type === 'gate') gateEvents.push(e);
    return c;
  };
  for (const p of spec.people || []) addPerson(p);
  // 人群生成器
  for (const cr of spec.crowds || []) {
    const rr = rng(cr.seed ?? 5);
    if (cr.kind === 'seated') {
      const seats = Object.entries(refs).filter(([k]) => k.startsWith(cr.seats)).flatMap(([, v]) => v);
      seated(crowd, seats, { fill: cr.fill, seed: cr.seed, skip: (cr.skip || []).map(s => seats.indexOf(refs[s[0]][s[1]])) });
    } else if (cr.kind === 'stand') {
      for (const s of cr.at) crowd.add({ look: makeLook(rr, cr.look || {}), at: s.slice(0, 3), face: (s[3] ?? 0), plan: [] });
    } else if (cr.kind === 'stream') {
      stream(crowd, cr.path, { ...cr, t0: T(cr.t0 ?? 0) });
    } else if (cr.kind === 'plans') {       // 一批各自有行程的人（排队过闸机、跟着上车的人）
      cr.people.forEach((p, i) => addPerson({ ...p, seed: (cr.seed ?? 9) * 31 + i * 7 + (p.seed ?? 0) }));
    } else if (cr.kind === 'alight') {      // 从车门下来：{ train, doors:[门号…], n, side, plan: i => 行程 }（门外第一步自动加）
      const v = vehicleOf[cr.train], side = cr.side ?? 1, t0 = T(`@${cr.train}.open`) + .5, sp = cr.spread ?? .5;
      for (let i = 0; i < cr.n; i++) {
        const k = cr.doors[i % cr.doors.length], d = v.doorAt(k, side), st = t0 + Math.floor(i / cr.doors.length) * .9 + rr.range(0, .5);
        const first = [d[0] + rr.range(-sp, sp), cr.y ?? 1.1, d[2] + side * 1.3];
        const plan = (typeof cr.plan === 'function' ? cr.plan(i) : cr.plan) || [];
        const c = crowd.add({ look: makeLook(rr, cr.look || {}), at: [d[0], cr.y ?? 1.1, d[2]], start: st, show: st, plan: expandPlan([{ walk: [first] }, ...plan], null) });
        for (const e of c.events) if (e.type === 'gate') gateEvents.push(e);
      }
    }
  }
  // 闸机的开关时刻来自走过它的人：到达时开，停留 hold 秒、再过 0.9 秒关
  for (const e of gateEvents) refs[e.id].schedule.push([e.lane, e.t, e.t + e.hold + .9]);

  // —— 动线 ——
  const routes = {};
  for (const ro of spec.routes || []) {
    let pts = ro.path;
    if (ro.person) {                // 一个人的整条行走路线（所有走、上下楼梯、乘扶梯的段连起来）
      const c = crowd.get(ro.person); pts = [c.at];
      for (const s of c.segs) if (s.path) for (const q of s.path.p.slice(1)) pts.push(q);
      if (ro.until) { const tEnd = T(ro.until); pts = [c.at]; for (const s of c.segs) if (s.path && s.t0 < tEnd) for (const q of s.path.p.slice(1)) pts.push(q); }
    }
    const dots = new RouteDots(root, pts, { color: ro.color || PALETTE.gold, clip, spacing: ro.spacing ?? .42 });
    // 显示到哪里：grow = [[t, '到某人某时刻的位置' 或沿线距离], …]，两键之间缓动
    const dist = v => typeof v === 'number' ? v : walkedAt(crowd.get(ro.person), T(v));
    const keys = (ro.grow || []).map(([t, v]) => [T(t), dist(v)]);
    routes[ro.id] = { dots, keys, f: keys.length ? keyframes(keys) : () => dots.path.length };
  }

  // —— 天色和灯 ——
  for (const [id, gs] of Object.entries(spec.glow || {})) if (gs.on != null) glow.schedule(id, T(gs.on), gs.snap ?? .12);
  const lightKeys = (spec.light || [[0, 'day']]).map(([t, s]) => [T(t), s]);

  // —— 组的抬升 ——
  const lifts = Object.entries(groups).filter(([, g]) => g.spec?.lift).map(([, g]) => ({ node: g.node, dy: g.spec.lift.dy, f: keyframes(g.spec.lift.keys.map(([t, v]) => [T(t), v]), eio) }));

  // 合并静态件
  for (const g of Object.values(groups)) g.batch.flush(g.node);
  root.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = o.castShadow ?? true; } });

  const world = {
    root, refs, marks, crowd, routes, glow, lightKeys, vehicles: vehicleOf, T, clip,
    update(t, night = 0) {
      for (const u of updaters) u(t);
      for (const L of lifts) L.node.position.y = L.dy * L.f(t);
      crowd.update(t);
      for (const ro of Object.values(routes)) ro.dots.show(ro.f(t), t);
      glow.update(t, night);
    },
    where: (id, t) => crowd.where(id, t),
  };
  return world;
}

// 某人到时刻 t 为止走过的路程（等、坐不算）——正好等于他那条动线上的沿线距离
function walkedAt(c, t) {
  let d = 0;
  for (const s of c.segs) if (s.path) { if (t >= s.t1) d += s.path.length; else if (t > s.t0) d += s.path.length * (t - s.t0) / (s.t1 - s.t0); }
  return d;
}
