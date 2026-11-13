// 微缩景观工具包 · 车：列车（车头 + 车厢，门会开关）、公交、出租车、小汽车，和一条循环车流。
// 车的运动只有两种：匀减速进站（停住）、匀加速出站；从切面里开进开出靠裁剪平面（clip），不会凭空出现。
// 车身是白模的一部分：白、浅灰为主，一条点缀色腰线；不画任何运营方的标志、涂装和字样。
import * as THREE from 'three';
import { bevelBox, cylinder, sphere } from './geom.js';
import { PALETTE, mat, paint, glass } from './materials.js';
import { stopAndGo, seg, clamp, rng } from './core.js';

const cl = (m, clip) => { if (!clip) return m; const c = m.clone(); c.clippingPlanes = clip; c.clipShadows = true; return c; };
const add = (g, geo, m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); o.castShadow = !m.transparent; o.receiveShadow = true; g.add(o); return o; };

// 列车：沿本地 +x 行驶，车头在 +x 端。cars 节，每节长 carLen；返回 { group, doors（每个门的本地 x）, setDoors(0–1), length }
// windowMat 传一个会亮的材质（Glow），夜里车窗就亮。
export function train(parent, { cars = 6, carLen = 12.5, w = 3.3, h = 3.9, stripe = PALETTE.blue, body = PALETTE.white, windowMat, clip, doorsPerSide = 2 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const bm = cl(paint(body, { rough: .3, coat: .7 }), clip), sm = cl(mat(stripe, { rough: .45 }), clip), dark = cl(mat('#39424a', { rough: .3 }), clip);
  const wm = cl(windowMat || mat('#4c5a63', { rough: .2 }), clip), under = cl(mat('#7d8486', { rough: .7 }), clip), doorM = cl(mat('#e6e5df', { rough: .35 }), clip);
  const doors = [], doorMeshes = [];
  const y0 = .62;                           // 车厢底离轨面
  for (let i = 0; i < cars; i++) {
    const x1 = -i * carLen, x0 = x1 - carLen + .25, cx = (x0 + x1) / 2, Lc = x1 - x0;
    const isHead = i === 0, nose = isHead ? 4.2 : 0;
    add(g, bevelBox(Lc - nose, h - .35, w, .35), bm, cx - nose / 2, y0 + .35 + (h - .35) / 2, 0);
    add(g, bevelBox(Lc - nose - .4, .55, w - .4, .1), under, cx - nose / 2, y0 + .1, 0);
    // 车窗带、腰线
    for (const sg of [-1, 1]) {
      add(g, bevelBox(Lc - nose - 1.2, .62, .04, .02), wm, cx - nose / 2, y0 + 2.35, sg * (w / 2 + .005));
      add(g, bevelBox(Lc - nose - .3, .16, .04, .02), sm, cx - nose / 2, y0 + 1.55, sg * (w / 2 + .006));
    }
    // 门：每侧 doorsPerSide 个，靠近车厢两端；门扇是单独的网格，开门时沿车身滑开
    const dxs = doorsPerSide === 1 ? [cx] : [x0 + 1.6, x1 - nose - 1.6];
    for (const dx of dxs) {
      doors.push(dx);
      for (const sg of [-1, 1]) {
        const d = add(g, bevelBox(1.05, 2.1, .06, .03), doorM, dx, y0 + 1.5, sg * (w / 2 + .02));
        d.userData = { x: dx, sg }; doorMeshes.push(d);
        add(g, bevelBox(1.12, .06, .07, .01), dark, dx, y0 + 2.58, sg * (w / 2 + .015));
      }
    }
    if (isHead) {
      // 车头：一个拉长的半椭球 + 深色风挡
      add(g, sphere(1, 28, 16), bm, x1 - nose, y0 + .35 + (h - .35) * .42, 0, 0, 0, 0, nose, (h - .35) * .58, w / 2);
      add(g, sphere(1, 24, 12), dark, x1 - nose + .9, y0 + h * .66, 0, 0, 0, 0, nose * .62, .5, w / 2 * .78);
      add(g, bevelBox(nose * .8, .16, w * .96, .05), sm, x1 - nose * .55, y0 + 1.55, 0);
      // 车头灯（夜里亮）
      if (windowMat) for (const sg of [-1, 1]) add(g, sphere(.13, 8, 6), windowMat, x1 - .3, y0 + 1.1, sg * .8);
    }
    // 转向架
    for (const bx of [x0 + 2.2, x1 - nose - 2.2]) add(g, bevelBox(2.6, .5, w - .7, .08), dark, bx, .35, 0);
    // 车厢连接处的风挡
    if (i > 0) add(g, bevelBox(.5, h - .7, w - .5, .1), dark, x1 + .1, y0 + .35 + (h - .7) / 2, 0);
  }
  const setDoors = o => { o = clamp(o); for (const d of doorMeshes) { d.position.x = d.userData.x - o * .62; d.position.z = d.userData.sg * (g.userData.w / 2 + .02 + o * .08); } };
  g.userData.w = w; setDoors(0);
  return { group: g, doors, setDoors, length: cars * carLen, floor: y0 + .5 };
}

// 一辆车的时刻表：track = { x: 停车点（车头）, z, y, dir: +1 / -1 }，arrive = [t0, t1]（减速段），
// doors = [开, 关]，depart = [t0, t1]（加速段），D 是减速 / 加速段走过的距离。返回 update(t)。
export function schedule(v, { track, arrive, depart, doors, D = 60, D2 = 70 }) {
  const g = v.group; g.rotation.y = track.dir > 0 ? 0 : Math.PI;
  const update = t => {
    const off = stopAndGo(t, { arrive, depart, D, D2 });
    g.position.set(track.x + track.dir * off, track.y ?? 0, track.z);
    if (doors && v.setDoors) v.setDoors(Math.min(seg(t, doors[0], doors[0] + .7), 1 - seg(t, doors[1], doors[1] + .7)));
    // 不在板子上的时候整辆隐藏（省一点画）
    g.visible = Math.abs(off) < D + 200;
  };
  // 停稳时第 k 个门的世界坐标（人上下车走到这里）
  const doorAt = (k, side = 1) => [track.x + track.dir * v.doors[k], track.y ?? 0, track.z + side * (v.group.userData.w / 2 + .3)];
  return { update, doorAt };
}

// 公交：长 11、宽 2.5；出租车和小汽车：长 4.5
export function bus(parent, { color = PALETTE.green, clip, windowMat } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const bm = cl(paint('#f2f1ec'), clip), sm = cl(mat(color, { rough: .45 }), clip), wm = cl(windowMat || mat('#4a5860', { rough: .2 }), clip), tm = cl(mat('#2c3133', { rough: .8 }), clip);
  add(g, bevelBox(11, 2.6, 2.5, .3), bm, 0, 1.75, 0);
  add(g, bevelBox(10.6, .95, 2.54, .08), wm, -.1, 2.25, 0);
  add(g, bevelBox(10.8, .3, 2.56, .05), sm, 0, 1.05, 0);
  for (const x of [-3.6, 3.6]) for (const z of [-1.05, 1.05]) add(g, cylinder(.5, .5, .3, 16), tm, x, .5, z, Math.PI / 2);
  return { group: g, length: 11 };
}
export function car(parent, { color = '#d9d6cc', kind = 'car', clip, windowMat } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const bm = cl(paint(color), clip), wm = cl(windowMat || mat('#46525a', { rough: .15 }), clip), tm = cl(mat('#2c3133', { rough: .8 }), clip);
  add(g, bevelBox(4.4, .75, 1.8, .25), bm, 0, .72, 0);
  add(g, bevelBox(2.3, .62, 1.62, .22), wm, -.25, 1.32, 0);
  add(g, bevelBox(2.1, .08, 1.5, .03), bm, -.25, 1.66, 0);
  if (kind === 'taxi') add(g, bevelBox(.5, .16, .24, .05), cl(mat(PALETTE.amber, { rough: .4 }), clip), -.2, 1.78, 0);
  for (const x of [-1.4, 1.4]) for (const z of [-.82, .82]) add(g, cylinder(.34, .34, .24, 14), tm, x, .34, z, Math.PI / 2);
  return { group: g, length: 4.4 };
}

// 循环车流：一条车道上一串车匀速开过，在 x0–x1 之间循环（两端是切面，从切面里进出）。
// kinds 按顺序轮流；gap 是平均车距；返回 update(t)
export function traffic(parent, { lane, x0, x1, dir = 1, speed = 6, kinds = ['car', 'car', 'bus'], gap = 18, seed = 7, clip, colors = ['#d9d6cc', '#bfc6c9', '#e8e2d2', '#8f9aa0', '#c9b9a0'] }) {
  const r = rng(seed), L = x1 - x0 + 20, vs = [];
  let s = 0;
  while (s < L) {
    const k = kinds[vs.length % kinds.length];
    const v = k === 'bus' ? bus(parent, { clip }) : car(parent, { clip, color: r.pick(colors), kind: k });
    vs.push({ v, s }); s += gap * r.range(.7, 1.4) + v.length;
  }
  const total = Math.max(L, s);
  const update = t => {
    for (const { v, s } of vs) {
      const u = ((s + speed * t) % total + total) % total - 10;
      v.group.position.set(dir > 0 ? x0 + u : x1 - u, lane.y ?? 0, lane.z); v.group.rotation.y = dir > 0 ? 0 : Math.PI;
      v.group.visible = u > -8 && u < x1 - x0 + 8;
    }
  };
  return { update };
}
