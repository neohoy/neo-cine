// 微缩景观工具包 · 底座和截面：薄展示底座、铭牌位、土体（带地层、可挖空）、楼板、墙、玻璃幕墙、切面。
// 坐标约定：y 向上，地面顶 y = board.top；x、z 是水平面。一个模型单位约等于 1 米，一层 storey 约 6 个单位（小人 ≈ 0.3 层）。
import * as THREE from 'three';
import { bevelBox, subtractBoxes } from './geom.js';
import { PALETTE, mat, glass, earthMat } from './materials.js';

const B = (x0, x1, y0, y1, z0, z1) => ({ x: [x0, x1], y: [y0, y1], z: [z0, z1] });
export const boxOf = B;
// 把 {x,y,z} 盒子放进 Batch（r 是倒角半径）
export function putBox(batch, m, b, r = .03) {
  const w = b.x[1] - b.x[0], h = b.y[1] - b.y[0], d = b.z[1] - b.z[0];
  batch.add(bevelBox(w, h, d, Math.min(r, w / 6, h / 6, d / 6)), m, (b.x[0] + b.x[1]) / 2, (b.y[0] + b.y[1]) / 2, (b.z[0] + b.z[1]) / 2);
}

// 底座：一块薄的深色石板，比模型四周各宽 margin；正面留一块铭牌位（默认不刻字：plate.text 为空）。
// 返回铭牌在世界里的位置，讲解层可以把字印上去（印字用 explain.js 的 plateText，或者干脆不印）。
export function plinth(batch, { x, z, bottom, h = .7, margin = 1.2, color = PALETTE.slate, plate = {} }) {
  const m = mat(color, { rough: .55 }), y0 = bottom - h;
  putBox(batch, m, B(x[0] - margin, x[1] + margin, y0, bottom, z[0] - margin, z[1] + margin), .12);
  // 底座下一圈稍内收的阴影脚，让它"放在桌上"而不是贴在背景上
  putBox(batch, mat(PALETTE.slateEdge, { rough: .7 }), B(x[0] - margin + .4, x[1] + margin - .4, y0 - .25, y0, z[0] - margin + .4, z[1] + margin - .4), .05);
  const pw = plate.w ?? 9, ph = plate.h ?? .42, px = plate.x ?? (x[0] + x[1]) / 2;
  const pm = mat(plate.color ?? '#c9c1a8', { rough: .35, metal: .55 });
  putBox(batch, pm, B(px - pw / 2, px + pw / 2, y0 + (h - ph) / 2, y0 + (h + ph) / 2, z[1] + margin, z[1] + margin + .05), .02);
  return { plate: { x: px, y: y0 + h / 2, z: z[1] + margin + .06, w: pw, h: ph, text: plate.text || null } };
}

// 土体：顶面在 top，厚 depth；voids 是挖掉的空腔（地道、下沉广场、基坑）。切面露出的地层由 earthMat 画。
export function soil(batch, { x, z, top = 0, depth = 8, voids = [], strata } = {}) {
  const m = earthMat({ top, strata });
  for (const b of subtractBoxes([B(x[0], x[1], top - depth, top, z[0], z[1])], voids)) putBox(batch, m, b, .0);
  return m;
}

// 楼板：一块有厚度的板，holes 是开洞（楼梯、扶梯、中庭）。切面上能看见板厚：板的侧面用 edge 颜色（比面深一档）。
export function slab(batch, { x, z, y, t = .5, holes = [], color = PALETTE.pale, edge } = {}) {
  const top = mat(color), side = edge ? mat(edge) : top;
  const parts = subtractBoxes([B(x[0], x[1], y - t, y, z[0], z[1])], holes.map(h => ({ x: h.x, z: h.z, y: [y - t - 1, y + 1] })));
  for (const b of parts) putBox(batch, side === top ? top : side, b, .03);
  return parts;
}

// 墙：从 a=[x,z] 到 b=[x,z] 的一段直墙，高 y=[y0,y1]，厚 t；openings = [{ at: 沿墙距离, w, y:[y0,y1] }]（门、窗洞）。
export function wall(batch, { a, b, y, t = .3, openings = [], color = PALETTE.ivory, r = .03 }) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const local = subtractBoxes([B(0, L, y[0], y[1], -t / 2, t / 2)], openings.map(o => ({ x: [o.at - o.w / 2, o.at + o.w / 2], y: o.y || [y[0] - 1, y[0] + 2.6], z: [-t, t] })));
  const m = mat(color), c = Math.cos(ang), s = Math.sin(ang);
  for (const p of local) {
    const w = p.x[1] - p.x[0], h = p.y[1] - p.y[0], mx = (p.x[0] + p.x[1]) / 2;
    batch.add(bevelBox(w, h, t, Math.min(r, w / 6, h / 6, t / 3)), m, a[0] + c * mx, (p.y[0] + p.y[1]) / 2, a[1] + s * mx, -ang);
  }
}

// 玻璃幕墙：半透明玻璃板 + 竖梃（mullion）和横梁。玻璃不投影（不然室内一片黑）。
export function glassWall(batch, { a, b, y, bay = 2.4, frame = PALETTE.silver, opacity = .18, openings = [], glassMat = null }) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(ang), s = Math.sin(ang);
  const g = glassMat || glass({ opacity }), fm = mat(frame, { rough: .45, metal: .3 });   // glassMat：夜里会亮的玻璃（Glow.make(…, { glass: true })）
  const at = (d, yy) => [a[0] + c * d, yy, a[1] + s * d];
  const holes = openings.map(o => [o.at - o.w / 2, o.at + o.w / 2, o.y ? o.y[1] : y[0] + 2.6]);
  // 玻璃按开洞切段
  let spans = [[0, L, y[0], y[1]]];
  for (const [h0, h1, top] of holes) {
    spans = spans.flatMap(([u0, u1, v0, v1]) => (h1 <= u0 || h0 >= u1) ? [[u0, u1, v0, v1]] : [[u0, h0, v0, v1], [h1, u1, v0, v1], [Math.max(u0, h0), Math.min(u1, h1), top, v1]].filter(q => q[1] - q[0] > .05));
  }
  for (const [u0, u1, v0, v1] of spans) { const p = at((u0 + u1) / 2, (v0 + v1) / 2); batch.add(new THREE.BoxGeometry(u1 - u0, v1 - v0, .05), g, p[0], p[1], p[2], -ang); }
  const n = Math.max(1, Math.round(L / bay));
  for (let i = 0; i <= n; i++) {
    const d = L * i / n; if (holes.some(([h0, h1]) => d > h0 + .05 && d < h1 - .05)) continue;
    const p = at(d, (y[0] + y[1]) / 2); batch.add(bevelBox(.12, y[1] - y[0], .16, .03), fm, p[0], p[1], p[2], -ang);
  }
  for (const yy of [y[0] + .06, y[1] - .06, y[0] + (y[1] - y[0]) * .55]) {
    for (const [u0, u1] of spans.filter(q => q[2] <= yy && q[3] >= yy).map(q => [q[0], q[1]])) {
      const p = at((u0 + u1) / 2, yy); batch.add(bevelBox(u1 - u0, .1, .14, .03), fm, p[0], p[1], p[2], -ang);
    }
  }
}

// 切面：沿 X 或 Z 方向切开。cut = { axis: 'x' | 'z', at: 位置, keep: -1（保留小于 at 的一侧）| 1 }
// 返回 three.js 的裁剪平面，给需要"从切面里开进开出"的东西（车、人、动线）的材质用：mat.clippingPlanes = [...]
export function clipPlane({ axis, at, keep = -1 }) {
  const n = new THREE.Vector3(axis === 'x' ? 1 : 0, 0, axis === 'z' ? 1 : 0);
  // three 只画 n·p + d ≥ 0 的一侧。keep = -1：保留坐标 < at 的一侧 → (-n)·p + at ≥ 0
  return keep < 0 ? new THREE.Plane(n.negate(), at) : new THREE.Plane(n, -at);
}
// 一组材质都按同样的平面裁剪（会克隆材质，原材质不受影响）
export function clipped(m, planes) { const c = m.clone(); c.clippingPlanes = planes; c.clipShadows = true; return c; }
