// 微缩景观工具包 · 构件。
// 静态件放进 Batch（最后按材质合并）；会动的件（扶梯台阶、闸机门、门扇）挂在自己的 Group 上，返回 update(t)。
// 尺寸都以"米"为单位写（1 模型单位 ≈ 1 m），所以和小人（1.75）的比例天然对。
import * as THREE from 'three';
import { bevelBox, sphere, cylinder, boxMesh } from './geom.js';
import { PALETTE, mat, glass, metal } from './materials.js';
import { rng, clamp, seg, lerp } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// 柱：方柱（倒角）或圆柱
export function column(batch, { x, z, y = [0, 6], s = .5, round = false, color = PALETTE.white }) {
  const m = mat(color), h = y[1] - y[0];
  batch.add(round ? cylinder(s / 2, s / 2, h, 20) : bevelBox(s, h, s, .05), m, x, (y[0] + y[1]) / 2, z);
}
// 梁：a、b 两点（[x,y,z]）之间的一根方梁
export function beam(batch, { a, b, w = .4, h = .5, color = PALETTE.white }) {
  const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz);
  batch.add(bevelBox(L, h, w, .04), mat(color), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, -Math.atan2(dz, dx));
}

// 栏杆：沿折线 pts（[x,y,z]，y 是脚下的高度）立一排；kind 'glass'（玻璃栏板 + 扶手）或 'rail'（立杆 + 扶手）
export function railing(batch, { pts, h = 1.05, kind = 'glass', color = PALETTE.silver }) {
  const fm = metal(color, .4), g = glass({ opacity: .22 });
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dz), ry = -Math.atan2(dz, dx);
    const slope = Math.atan2(dy, L), Ls = Math.hypot(L, dy), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2;
    batch.add(bevelBox(Ls, .06, .08, .025), fm, mx, my + h, mz, ry, 1, 1, 1, 0, slope);
    if (kind === 'glass') batch.add(new THREE.BoxGeometry(Ls, h - .1, .03), g, mx, my + h / 2, mz, ry, 1, 1, 1, 0, slope);
    const n = Math.max(1, Math.round(L / 1.4));
    for (let k = 0; k <= n; k++) { const u = k / n; batch.add(cylinder(.025, .025, h, 6), fm, a[0] + dx * u, a[1] + dy * u + h / 2, a[2] + dz * u); }
  }
}

// 楼梯：从 from=[x,y,z]（底）沿水平方向 dir（弧度，0 = +x）上到高 rise，水平长 run，宽 width。
// 每一级是一块倒角盒，两侧有梯梁和扶手。返回人走楼梯用的路径点（中心线，底 → 顶）。
export function stairs(batch, { from, dir = 0, run, rise, width = 2, color = PALETTE.white, side = PALETTE.pale, rails = true }) {
  const n = Math.max(3, Math.round(rise / .17)), tr = run / n, ri = rise / n, c = Math.cos(dir), s = Math.sin(dir), m = mat(color), sm = mat(side);
  const P = (u, y, off = 0) => [from[0] + c * u - s * off, from[1] + y, from[2] + s * u + c * off];
  for (let i = 0; i < n; i++) {
    const p = P((i + .5) * tr, (i + 1) * ri - ri / 2);
    batch.add(bevelBox(tr + .02, ri, width, .02), m, p[0], p[1], p[2], -dir);
  }
  // 斜板（梯段底下的板），切面上能看见它的厚度
  const L = Math.hypot(run, rise), ang = Math.atan2(rise, run), mid = P(run / 2, rise / 2 - .28);
  batch.add(bevelBox(L, .3, width, .03), sm, mid[0], mid[1], mid[2], -dir, 1, 1, 1, 0, ang);
  if (rails) for (const off of [-width / 2 + .05, width / 2 - .05]) railing(batch, { pts: [P(0, 0, off), P(run, rise, off)], kind: 'rail', h: .95 });
  return [P(-.6, 0), P(0, 0), P(run, rise), P(run + .6, rise)];
}

// 扶梯：台阶会走。from 底端、to 顶端（[x,y,z]，水平方向可任意），宽 width，台阶速度 speed（单位/秒，沿斜面）。
// 返回 { group, update(t), path }，path 是站在扶梯上的人走的中心线；人在扶梯上的速度要和 speed 一样。
export function escalator(parent, { from, to, width = 1.1, speed = 2.4, up = true, color = PALETTE.white }) {
  const g = new THREE.Group(); parent.add(g);
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2], H = Math.hypot(dx, dz), L = Math.hypot(H, dy);
  const dir = Math.atan2(dz, dx), slope = Math.atan2(dy, H);
  g.position.set(...from); g.rotation.y = -dir;           // 本地 x 轴 = 扶梯水平方向
  const body = mat(PALETTE.pale), side = glass({ opacity: .25 }), hand = mat('#2f3436', { rough: .5 });
  // 桁架（斜的箱体）和两端的平台
  const truss = new THREE.Mesh(bevelBox(L + .6, .7, width + .3, .05), body); truss.position.set(H / 2, dy / 2 - .45, 0); truss.rotation.z = slope; truss.castShadow = truss.receiveShadow = true; g.add(truss);
  for (const sgn of [-1, 1]) {
    const gl = new THREE.Mesh(new THREE.BoxGeometry(L, .85, .03), side); gl.position.set(H / 2, dy / 2 + .5, sgn * (width / 2 + .08)); gl.rotation.z = slope; g.add(gl);
    const hr = new THREE.Mesh(bevelBox(L + .3, .07, .1, .03), hand); hr.position.set(H / 2, dy / 2 + .95, sgn * (width / 2 + .08)); hr.rotation.z = slope; g.add(hr);
  }
  // 台阶：一圈固定数量的实例，沿斜面平移；越过顶端就回到底端（模型里看不见回程）
  const stepL = .42, N = Math.ceil(L / stepL) + 1;
  const stepM = new THREE.InstancedMesh(bevelBox(stepL - .03, .16, width, .02), mat(color), N);
  stepM.castShadow = true; stepM.receiveShadow = true; g.add(stepM);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const update = t => {
    const off = ((up ? 1 : -1) * speed * t) % stepL;
    for (let i = 0; i < N; i++) {
      let s = (i * stepL + off + stepL) % (N * stepL); if (s > L) s = L;       // 沿斜面距离
      const u = s / L, x = H * u, y = dy * u;
      // 两端各约一级的长度里，台阶慢慢放平（看起来像平台梳齿）
      const k = Math.min(1, s / .8, (L - s) / .8);
      m4.compose(V(x, y - .08 * (1 - k), 0), q, V(1, 1, 1)); stepM.setMatrixAt(i, m4);
    }
    stepM.instanceMatrix.needsUpdate = true;
  };
  update(0);
  const c = Math.cos(dir), s = Math.sin(dir);
  const path = [[from[0] - c * .7, from[1], from[2] - s * .7], [from[0], from[1] + .08, from[2]], [to[0], to[1] + .08, to[2]], [to[0] + c * .7, to[1], to[2] + s * .7]];
  return { group: g, update, path, speed, length: L };
}

// 推拉门：两扇向两侧滑开。axis 'x'（门沿 x 方向排）或 'z'。open(t) 返回 0–1 的开度。
export function slidingDoor(parent, { at, w = 2, h = 2.5, axis = 'x', open = () => 0, color = PALETTE.silver }) {
  const g = new THREE.Group(); g.position.set(...at); if (axis === 'z') g.rotation.y = Math.PI / 2; parent.add(g);
  const gm = glass({ opacity: .3 }), fm = metal(color);
  const leaves = [-1, 1].map(sg => { const l = new THREE.Group(); const p = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - .04, h - .1, .04), gm); p.position.y = h / 2; l.add(p); const f = new THREE.Mesh(bevelBox(w / 2, .08, .08, .02), fm); f.position.y = h - .04; l.add(f); g.add(l); return { l, sg }; });
  return { group: g, update: t => { const o = clamp(open(t)); for (const { l, sg } of leaves) l.position.x = sg * (w / 4 + o * w * .45); } };
}

// 闸机一排：沿 x 方向排 n 个通道（axis 'z' 时转 90°），每个通道两侧是机柜，中间一对会收回的门翼。
// 进站的证件查验闸机、检票闸机、出站闸机都用它，只是机柜颜色和顶上的小屏不同。
// schedule = [[通道号, 开始开门的时间, 关门的时间], …]；没排到的通道门翼一直关着。
export function gates(parent, batch, { x0, z, y = 0, n = 4, pitch = 1.5, axis = 'x', cabinet = PALETTE.bone, accent = PALETTE.teal, schedule = [] }) {
  const g = new THREE.Group(); g.position.set(x0, y, z); if (axis === 'z') g.rotation.y = Math.PI / 2; parent.add(g);
  const cm = mat(cabinet, { rough: .5 }), top = mat('#5c6466', { rough: .35 }), lamp = mat(accent, { rough: .4 });
  const wp = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    // 机柜放进 batch（换算成世界坐标）
    wp.set(i * pitch, .52, 0).applyAxisAngle(V(0, 1, 0), g.rotation.y).add(g.position);
    batch.add(bevelBox(.32, 1.04, 1.5, .06), cm, wp.x, wp.y, wp.z, g.rotation.y);
    wp.set(i * pitch, 1.06, -.45).applyAxisAngle(V(0, 1, 0), g.rotation.y).add(g.position);
    batch.add(bevelBox(.3, .04, .35, .015), top, wp.x, wp.y, wp.z, g.rotation.y);
    wp.set(i * pitch, 1.06, .52).applyAxisAngle(V(0, 1, 0), g.rotation.y).add(g.position);
    batch.add(bevelBox(.24, .03, .16, .01), lamp, wp.x, wp.y, wp.z, g.rotation.y);
  }
  // 门翼：铰在机柜一侧，横在通道中间；开门时缩回机柜里（沿 x 收短）
  const fm = glass({ opacity: .45, color: '#d9e4e6' }), wf = pitch / 2 - .18, flaps = [];
  for (let i = 0; i < n; i++) for (const sg of [-1, 1]) {
    const holder = new THREE.Group(); holder.position.set(sg < 0 ? i * pitch + .16 : (i + 1) * pitch - .16, .62, 0);
    const f = new THREE.Mesh(new THREE.BoxGeometry(wf, .62, .03), fm); holder.add(f); g.add(holder);
    flaps.push({ f, i, sg });
  }
  const openAt = (i, t) => { let o = 0; for (const [k, a, b] of schedule) if (k === i) o = Math.max(o, Math.min(seg(t, a, a + .3), 1 - seg(t, b, b + .35))); return o; };
  return {
    group: g,
    // 第 i 个通道的中心线：前（z = -1.2）→ 后（z = +1.2）两个点，本地 +z 是通行方向；dirSign = -1 时反过来走
    lane: (i, dirSign = 1) => [-1.3, 1.3].map(lz => { const p = V(i * pitch + pitch / 2, 0, lz * dirSign).applyAxisAngle(V(0, 1, 0), g.rotation.y).add(g.position); return [p.x, p.y, p.z]; }),
    update: t => { for (const fl of flaps) { const o = openAt(fl.i, t), k = 1 - .9 * o; fl.f.scale.x = k; fl.f.position.x = -fl.sg * wf / 2 * k; } },
  };
}

// 长椅：seats 个座位连成一排（沿本地 x），朝向 rot（弧度，0 = 人面朝 +z）。返回每个座位的世界坐标和朝向（给坐着的人用）。
export function bench(batch, { at, rot = 0, seats = 4, pitch = .62, color = PALETTE.silver, seat = '#c9cfd2' }) {
  const fm = metal(color, .4), sm = mat(seat, { rough: .5 }), c = Math.cos(rot), s = Math.sin(rot), W = seats * pitch;
  const P = (lx, y, lz) => [at[0] + c * lx + s * lz, at[1] + y, at[2] - s * lx + c * lz];
  const p0 = P(0, .42, 0), p1 = P(0, .72, -.24);
  batch.add(bevelBox(W, .07, .46, .03), sm, p0[0], p0[1], p0[2], rot);
  batch.add(bevelBox(W, .42, .06, .03), sm, p1[0], p1[1], p1[2], rot, 1, 1, 1, -.12);
  for (const lx of [-W / 2 + .1, W / 2 - .1]) { const q = P(lx, .2, 0); batch.add(bevelBox(.06, .4, .4, .02), fm, q[0], q[1], q[2], rot); }
  for (let i = 1; i < seats; i++) { const q = P(-W / 2 + i * pitch, .52, -.05); batch.add(bevelBox(.04, .14, .3, .015), fm, q[0], q[1], q[2], rot); }
  return Array.from({ length: seats }, (_, i) => ({ p: P(-W / 2 + (i + .5) * pitch, 0, .02), rot }));
}
export function bin(batch, { at, color = PALETTE.silver }) {
  batch.add(cylinder(.22, .2, .8, 14), metal(color, .45), at[0], at[1] + .4, at[2]);
  batch.add(cylinder(.235, .235, .05, 14), mat('#4f5759'), at[0], at[1] + .82, at[2]);
}

// 指示牌：只有色块和象形图，不写字、不画运营方标志。icon：'train' | 'exit' | 'up' | 'down' | 'left' | 'right' | 'gate' | 'shield' | 'id' | 'seat'
const ICONS = new Map();
function iconTexture(icon, bg, fg) {
  const id = icon + bg + fg; if (ICONS.has(id)) return ICONS.get(id);
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 128, 128); g.fillStyle = fg; g.strokeStyle = fg; g.lineWidth = 9; g.lineCap = g.lineJoin = 'round';
  const arrow = a => { g.save(); g.translate(64, 64); g.rotate(a); g.beginPath(); g.moveTo(-34, 0); g.lineTo(30, 0); g.moveTo(8, -24); g.lineTo(32, 0); g.lineTo(8, 24); g.stroke(); g.restore(); };
  const person = (x, y, s = 1) => { g.beginPath(); g.arc(x, y - 30 * s, 9 * s, 0, 7); g.fill(); g.lineWidth = 10 * s; g.beginPath(); g.moveTo(x, y - 18 * s); g.lineTo(x, y + 8 * s); g.lineTo(x - 10 * s, y + 32 * s); g.moveTo(x, y + 8 * s); g.lineTo(x + 10 * s, y + 32 * s); g.moveTo(x - 14 * s, y - 6 * s); g.lineTo(x + 14 * s, y - 6 * s); g.stroke(); };
  if (icon === 'train') { g.beginPath(); g.roundRect(30, 22, 68, 70, 16); g.fill(); g.fillStyle = bg; g.fillRect(40, 36, 48, 22); g.beginPath(); g.arc(46, 76, 6, 0, 7); g.arc(82, 76, 6, 0, 7); g.fill(); g.strokeStyle = fg; g.beginPath(); g.moveTo(40, 96); g.lineTo(30, 110); g.moveTo(88, 96); g.lineTo(98, 110); g.stroke(); }
  else if (icon === 'exit') { person(52, 64, .9); g.lineWidth = 9; g.beginPath(); g.moveTo(80, 40); g.lineTo(104, 40); g.lineTo(104, 92); g.lineTo(80, 92); g.stroke(); arrow(0); }
  else if (icon === 'up' || icon === 'down' || icon === 'left' || icon === 'right') arrow({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[icon]);
  else if (icon === 'gate') { g.fillRect(24, 40, 14, 56); g.fillRect(90, 40, 14, 56); g.lineWidth = 7; g.beginPath(); g.moveTo(40, 66); g.lineTo(58, 66); g.moveTo(88, 66); g.lineTo(70, 66); g.stroke(); person(64, 64, .55); }
  else if (icon === 'shield') { g.beginPath(); g.moveTo(64, 20); g.lineTo(100, 34); g.lineTo(96, 74); g.quadraticCurveTo(84, 100, 64, 110); g.quadraticCurveTo(44, 100, 32, 74); g.lineTo(28, 34); g.closePath(); g.fill(); g.strokeStyle = bg; g.beginPath(); g.moveTo(46, 64); g.lineTo(60, 78); g.lineTo(84, 50); g.stroke(); }
  else if (icon === 'id') { g.lineWidth = 7; g.beginPath(); g.roundRect(18, 34, 92, 60, 10); g.stroke(); g.beginPath(); g.arc(44, 58, 9, 0, 7); g.fill(); g.fillRect(34, 70, 20, 12); g.fillRect(64, 50, 34, 7); g.fillRect(64, 64, 34, 7); g.fillRect(64, 78, 24, 7); }
  else if (icon === 'seat') { g.fillRect(36, 30, 12, 50); g.fillRect(36, 70, 52, 12); g.fillRect(76, 70, 12, 30); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  ICONS.set(id, tex); return tex;
}
// 一块牌子：w×h，挂在 at（牌面中心），朝向 rot（0 = 牌面朝 +z）；icons 从左到右排；双面
export function sign(batch, { at, rot = 0, icons = ['train'], bg = '#2f4f5a', fg = '#f4f1e8', w, h = .6, post = null }) {
  const n = icons.length; w = w ?? h * n * 1.05;
  const fm = mat('#3b4446', { rough: .45 });
  batch.add(bevelBox(w + .08, h + .08, .1, .03), fm, at[0], at[1], at[2], rot);
  icons.forEach((ic, i) => {
    const m = new THREE.MeshBasicMaterial({ map: iconTexture(ic, bg, fg), toneMapped: true });
    const lx = -w / 2 + (i + .5) * (w / n), c = Math.cos(rot), s = Math.sin(rot);
    for (const side of [1, -1]) batch.add(new THREE.PlaneGeometry(w / n - .02, h), m, at[0] + c * lx + s * .056 * side, at[1], at[2] - s * lx + c * .056 * side, rot + (side < 0 ? Math.PI : 0));
  });
  if (post) batch.add(cylinder(.05, .05, post, 8), fm, at[0], at[1] - h / 2 - post / 2, at[2]);
}

// 雨棚：一块薄顶板，四角或沿边的细柱
export function canopy(batch, { x, z, y = 4, t = .25, cols = 2, color = PALETTE.white, colColor = PALETTE.silver }) {
  batch.add(bevelBox(x[1] - x[0], t, z[1] - z[0], .08), mat(color), (x[0] + x[1]) / 2, y + t / 2, (z[0] + z[1]) / 2);
  const cm = metal(colColor, .4);
  for (let i = 0; i < cols; i++) for (const zz of [z[0] + .4, z[1] - .4])   // cols = 0：只要顶板（柱子另外立，顶板可以单独抬起）
    batch.add(cylinder(.09, .09, y, 10), cm, lerp(x[0] + .5, x[1] - .5, cols < 2 ? .5 : i / (cols - 1)), y / 2, zz);
}

// 树：树干 + 一簇球（球簇树冠），每棵按自己的种子长得不一样；size 是树冠半径
export function tree(batch, { at, h = 5, size = 1.6, seed = 1 }) {
  const r = rng(seed), tm = mat(PALETTE.trunk, { rough: .85 });
  batch.add(cylinder(.1, .14, h * .55, 8), tm, at[0], at[1] + h * .275, at[2]);
  const n = 6 + r.int(0, 4), leaves = [PALETTE.leaf, PALETTE.leafDeep, PALETTE.leafLight];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, rr = size * (.25 + .45 * r()), yy = h * .62 + size * (.1 + .7 * r()), s = size * (.45 + .3 * r());
    batch.add(sphere(1, 14, 10), mat(i === 0 ? PALETTE.leaf : r.pick(leaves), { rough: .9 }), at[0] + Math.cos(a) * rr, at[1] + yy, at[2] + Math.sin(a) * rr, 0, s, s * .9, s);
  }
}
// 灌木：一条圆角绿篱，上面几个小球
export function shrub(batch, { at, w = 2, d = .8, h = .7, seed = 2 }) {
  const r = rng(seed);
  batch.add(bevelBox(w, h, d, .25), mat(PALETTE.leafDeep, { rough: .9 }), at[0], at[1] + h / 2, at[2]);
  for (let i = 0; i < Math.round(w / .6); i++) { const s = .28 + .12 * r(); batch.add(sphere(1, 10, 8), mat(PALETTE.leaf, { rough: .9 }), at[0] - w / 2 + .3 + i * .6 + r.range(-.1, .1), at[1] + h - .05, at[2] + r.range(-.15, .15), 0, s, s * .8, s); }
}
// 路灯：细杆 + 灯头（灯头用会亮的材质 glowMat）
export function lamp(batch, { at, h = 4.5, glowMat, arm = .7, rot = 0 }) {
  const pm = metal('#7d8686', .4);
  batch.add(cylinder(.06, .08, h, 8), pm, at[0], at[1] + h / 2, at[2]);
  const c = Math.cos(rot), s = Math.sin(rot);
  batch.add(bevelBox(arm, .06, .06, .02), pm, at[0] + c * arm / 2, at[1] + h, at[2] - s * arm / 2, rot);
  batch.add(bevelBox(.42, .1, .2, .04), glowMat, at[0] + c * arm, at[1] + h - .06, at[2] - s * arm, rot);
}
// 接触网立柱（铁路）：一根柱 + 一根伸向轨道上方的腕臂
export function mast(batch, { at, h = 6.2, reach = 2.8, rot = 0 }) {
  const pm = metal('#9aa0a0', .5), c = Math.cos(rot), s = Math.sin(rot);
  batch.add(bevelBox(.22, h, .22, .03), pm, at[0], at[1] + h / 2, at[2]);
  batch.add(bevelBox(reach, .08, .08, .02), pm, at[0] + c * reach / 2, at[1] + h - .5, at[2] - s * reach / 2, rot);
}
// 大屏（候车信息屏）：色块组成的"行"，不写字。lit(t) 返回第几行高亮（检票开始时那一行变色）
export function board(parent, batch, { at, rot = 0, w = 4, h = 1.4, rows = 5, glowMat, hiMat }) {
  batch.add(bevelBox(w + .16, h + .16, .14, .04), mat('#30383a', { rough: .4 }), at[0], at[1], at[2], rot);
  const c = Math.cos(rot), s = Math.sin(rot), rowsOut = [];
  for (let i = 0; i < rows; i++) {
    const y = at[1] + h / 2 - (i + .5) * h / rows;
    for (const [lx, ww] of [[-w * .32, w * .3], [w * .08, w * .4], [w * .4, w * .14]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, h / rows * .55), glowMat); m.position.set(at[0] + c * lx + s * .08, y, at[2] - s * lx + c * .08); m.rotation.y = rot; parent.add(m);
      if (lx > w * .3) rowsOut.push(m);
    }
  }
  return { rows: rowsOut, highlight: (i, on) => { rowsOut.forEach((m, k) => m.material = (k === i && on) ? hiMat : glowMat); } };
}
// 安检仪：一台 X 光机（带传送带的箱体，两端有帘），行李沿 from→to 过机。返回传送带路径。
export function scanner(batch, { from, to, color = PALETTE.bone }) {
  const dx = to[0] - from[0], dz = to[2] - from[2], L = Math.hypot(dx, dz), ry = -Math.atan2(dz, dx), mx = (from[0] + to[0]) / 2, mz = (from[2] + to[2]) / 2;
  batch.add(bevelBox(L, .12, .7, .03), mat('#3e4547', { rough: .6 }), mx, from[1] + .74, mz, ry);                 // 传送带
  batch.add(bevelBox(L * .5, 1.25, 1.0, .12), mat(color, { rough: .5 }), mx, from[1] + 1.15, mz, ry);           // 机身
  batch.add(bevelBox(L, .7, .9, .05), mat(PALETTE.pale), mx, from[1] + .35, mz, ry);                              // 底座
  return [[from[0], from[1] + .8, from[2]], [to[0], to[1] + .8, to[2]]];
}
// 安检门（通过式金属探测门）：一个门框
export function frameDetector(batch, { at, rot = 0, color = PALETTE.bone }) {
  const m = mat(color, { rough: .5 }), c = Math.cos(rot), s = Math.sin(rot);
  for (const sg of [-1, 1]) batch.add(bevelBox(.18, 2.2, .5, .05), m, at[0] + c * sg * .5, at[1] + 1.1, at[2] - s * sg * .5, rot);
  batch.add(bevelBox(1.18, .22, .5, .05), m, at[0], at[1] + 2.2, at[2], rot);
}
