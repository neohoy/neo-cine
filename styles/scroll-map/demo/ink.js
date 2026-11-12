// 舆图长卷 · 画法：纸、海纹、墨线、青绿山、屋宇楼阁、贴签、印章。
// 所有函数只依赖传入的参数和种子，不带状态：同样的输入永远画出同样的东西。
import { mulberry, hash, clamp, lerp } from '/core/lib.js';

// 矿物颜料和纸（示范片用的一套；规则在 STYLE.md §3）
export const C = {
  paper: '#e6d6b2', land: '#ebdcba', ink: '#2a2521', inkSoft: 'rgba(42,37,33,.55)',
  qing: '#2b5878', lv: '#4a8468', lv3: '#a3bd97', zhe: '#a56d3c', zhu: '#bd3923', zhuDeep: '#9c2a1a',
  hua: '#58798a', sea: '#cdd2b9', seaLine: '#47656f', slip: '#f2e8cc', fen: '#f0e7d2',
  mount: '#1c2a3c', mountGold: '#b8964a', wood: '#3a2416', table: '#120e0b',
};
export const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };

// ---------- 纸：一张可平铺的纹理，用 multiply 压在画面最上面 ----------
// 低频的斑驳（旧纸的深浅）+ 细纤维 + 霉点。值在白附近，所以 multiply 只会让颜色略沉一点。
export function makePaper(size = 1024, seed = 7) {
  const cv = new OffscreenCanvas(size, size), g = cv.getContext('2d'), im = g.createImageData(size, size), d = im.data;
  const octs = [[4, .5], [9, .3], [23, .14], [61, .06]].map(([n, a], k) => {
    const r = mulberry(seed + k * 31), v = new Float32Array(n * n); for (let i = 0; i < v.length; i++) v[i] = r();
    return { n, a, v };
  });
  const sm = u => u * u * (3 - 2 * u);
  const grain = mulberry(seed + 999);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let m = 0;
    for (const { n, a, v } of octs) {
      const fx = x / size * n, fy = y / size * n, ix = Math.floor(fx), iy = Math.floor(fy), ux = sm(fx - ix), uy = sm(fy - iy);
      const i0 = ix % n, i1 = (ix + 1) % n, j0 = iy % n, j1 = (iy + 1) % n;
      m += a * lerp(lerp(v[j0 * n + i0], v[j0 * n + i1], ux), lerp(v[j1 * n + i0], v[j1 * n + i1], ux), uy);
    }
    const k = 1 - .16 * m - .035 * grain(), o = (y * size + x) * 4;
    d[o] = 255 * k; d[o + 1] = 255 * (k - .012 * m); d[o + 2] = 255 * (k - .05 * m); d[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const r = mulberry(seed + 5);
  const wrap = f => { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { g.save(); g.translate(dx, dy); f(); g.restore(); } };
  for (let i = 0; i < 2600; i++) {                                 // 纤维：短、细、方向偏横
    const x = r() * size, y = r() * size, a = (r() - .5) * 1.1, l = 6 + r() * 26, c = r();
    g.strokeStyle = `rgba(${c < .5 ? '96,70,40' : '140,112,70'},${.04 + r() * .09})`; g.lineWidth = .5 + r() * .7;
    wrap(() => { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * .5 + (r() - .5) * 4, y + Math.sin(a) * l * .5 + (r() - .5) * 4, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
  }
  for (let i = 0; i < 46; i++) {                                   // 霉点和水渍
    const x = r() * size, y = r() * size, rad = 3 + r() * r() * 26;
    wrap(() => { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(120,84,44,${.05 + r() * .07})`); gr.addColorStop(1, 'rgba(120,84,44,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); });
  }
  return cv;
}

// ---------- 海：鱼鳞纹。一格 6 片 × 12 行，每片的半径和墨色都略有出入，四边可平铺 ----------
export const WAVE = { cols: 6, rows: 12 };
export function makeWaves(w, seed = 3) {                           // w = 一片鳞的宽度（像素）
  const r = w / 2, tw = WAVE.cols * w, th = WAVE.rows * r * .5, cv = new OffscreenCanvas(Math.round(tw), Math.round(th)), g = cv.getContext('2d');
  g.scale(cv.width / tw, cv.height / th);
  g.fillStyle = C.sea; g.fillRect(0, 0, tw, th); g.lineCap = 'round';
  for (let row = -3; row < WAVE.rows + 3; row++) for (let col = -1; col <= WAVE.cols; col++) {
    const rw = ((row % WAVE.rows) + WAVE.rows) % WAVE.rows, cl = ((col % WAVE.cols) + WAVE.cols) % WAVE.cols, h = k => hash(seed * 97 + rw * 13.1 + cl * 71.7 + k * 3.3);
    const cx = col * w + (rw % 2 ? r : 0) + (h(1) - .5) * w * .07, cy = row * r * .5 + r + (h(2) - .5) * r * .08, rr = r * (1.02 + (h(3) - .5) * .08);
    g.fillStyle = C.sea; g.beginPath(); g.arc(cx, cy, rr, Math.PI, 2 * Math.PI); g.lineTo(cx + rr, cy + r); g.lineTo(cx - rr, cy + r); g.fill();
    [1, .7, .42].forEach((f, k) => {
      const a0 = Math.PI + (h(4 + k) - .5) * .12, a1 = 2 * Math.PI + (h(7 + k) - .5) * .12;
      g.strokeStyle = rgba(C.seaLine, (k ? .30 : .52) * (.7 + .5 * h(10 + k))); g.lineWidth = Math.max(.6, w * (k ? .022 : .034) * (.8 + .5 * h(13 + k)));
      g.beginPath(); g.arc(cx, cy + (k ? r * .02 * k : 0), rr * f, a0, a1); g.stroke();
    });
  }
  return cv;
}

// ---------- 墨线：同一条路径描两遍，第二遍用不规则虚线加粗，得到提按的粗细变化 ----------
// g 已经处在世界坐标变换下；w 是世界单位的线宽。
export function inkStroke(g, path, w, color, seed = 1, alpha = 1) {
  g.save(); g.lineJoin = g.lineCap = 'round'; g.strokeStyle = color;
  g.globalAlpha = alpha * .9; g.lineWidth = w; g.setLineDash([]); g.stroke(path);
  const r = mulberry(seed), dash = []; for (let i = 0; i < 14; i++) dash.push(w * (i % 2 ? 9 + r() * 26 : 14 + r() * 40));
  g.globalAlpha = alpha * .75; g.lineWidth = w * 1.75; g.setLineDash(dash); g.lineDashOffset = r() * 200 * w; g.stroke(path);
  g.restore();
}

// ---------- 青绿山：屏幕坐标。(x, y) 是山脚中点，w 宽，h 高 ----------
// 立面形象画法：两三个峰头，墨线只勾山脊，石青压顶、石绿在腰、往山脚化进纸里；峰头下几笔皴，顶上几点苔。
export function drawPeak(g, x, y, w, h, seed, tone = 0) {
  const r = mulberry(seed * 7919 + 13), n = r() < .28 ? 2 : 3, flip = r() < .5 ? -1 : 1;
  const tops = n === 3 ? [[-.29 - r() * .05, .5 + r() * .2], [(r() - .5) * .12, 1], [.28 + r() * .06, .42 + r() * .22]] : [[-.15 - r() * .08, 1], [.22 + r() * .08, .55 + r() * .22]];
  const P = [[-.5, 0]]; tops.forEach(([tx, th], i) => { if (i) { const [px, ph] = tops[i - 1]; P.push([(px + tx) / 2 + (r() - .5) * .04, Math.min(ph, th) * (.5 + r() * .22)]); } P.push([tx, th]); }); P.push([.5, 0]);
  const X = p => x + flip * p[0] * w, Y = p => y - p[1] * h;
  const ridge = new Path2D(); ridge.moveTo(X(P[0]), Y(P[0]));
  for (let i = 1; i < P.length; i++) {                              // 峰头略尖、鞍部圆
    const a = P[i - 1], b = P[i], up = b[1] > a[1], c = up ? [lerp(a[0], b[0], .3), lerp(a[1], b[1], .86)] : [lerp(a[0], b[0], .7), lerp(a[1], b[1], .14)];
    ridge.quadraticCurveTo(X(c), Y(c), X(b), Y(b));
  }
  const body = new Path2D(ridge); body.closePath();
  const gr = g.createLinearGradient(0, y - h, 0, y);
  const top = tone > .5 ? C.qing : C.qing, mid = C.lv;
  gr.addColorStop(0, rgba(top, .9)); gr.addColorStop(.34, rgba(mid, .82)); gr.addColorStop(.7, rgba(C.lv3, .5)); gr.addColorStop(.92, rgba(C.zhe, .12)); gr.addColorStop(1, rgba(C.zhe, 0));
  const un = g.createLinearGradient(0, y - h, 0, y); un.addColorStop(0, C.land); un.addColorStop(.6, rgba(C.land, .9)); un.addColorStop(1, rgba(C.land, 0));
  g.fillStyle = un; g.fill(body); g.fillStyle = gr; g.fill(body);
  g.lineCap = g.lineJoin = 'round'; g.strokeStyle = C.ink;
  const lw = clamp(h * .045, .7, 3.2);
  g.globalAlpha = .28; g.lineWidth = lw * .7;                       // 皴：从每个峰头往两边斜下去的短笔
  for (const [tx, th] of tops) for (let k = 0; k < 3; k++) {
    const side = k % 2 ? 1 : -1, l = th * (.22 + r() * .3), sx = tx + side * (.02 + r() * .05), sy = th - .08 - r() * .12;
    g.beginPath(); g.moveTo(X([sx, sy]), Y([sx, sy])); g.quadraticCurveTo(X([sx + side * .03, sy - l * .5]), Y([sx + side * .03, sy - l * .5]), X([sx + side * (.07 + r() * .05), sy - l]), Y([sx, sy - l])); g.stroke();
  }
  g.globalAlpha = .85; g.lineWidth = lw; g.stroke(ridge);
  if (h > 16) { g.globalAlpha = .7; g.fillStyle = C.ink; for (const [tx, th] of tops) for (let k = 0; k < 3; k++) { const dx = tx + (r() - .5) * .1, dy = th + .02 + r() * .03; g.beginPath(); g.ellipse(X([dx, dy]), Y([dx, dy]), lw * .7, lw * .45, 0, 0, 7); g.fill(); } }
  g.globalAlpha = 1;
}

// ---------- 屋宇和楼阁：屏幕坐标，(x, y) 是屋脚中点 ----------
// 一层的画成一间小屋；高楼画成楼阁，每一层收窄一点，檐角上挑。k = 生长进度 0–1。
export function drawHouse(g, x, y, w, tiers, seed, k = 1) {
  if (k <= 0) return;
  const r = mulberry(seed * 104729 + 7), roofC = r() < .3 ? C.qing : r() < .5 ? '#5b5348' : '#4a4640';
  let ww = w, yy = y; const th = w * (tiers > 2 ? .4 : .46), n = Math.max(1, Math.ceil(tiers * k)), lw = clamp(w * .045, .5, 1.5);
  g.fillStyle = rgba(C.ink, .13); g.beginPath(); g.ellipse(x + w * .06, y, w * .62, w * .13, 0, 0, 7); g.fill();
  g.lineJoin = 'round'; g.lineWidth = lw;
  for (let i = 0; i < n; i++) {
    const f = i === n - 1 ? clamp(tiers * k - i) : 1, bh = th * f, top = i === tiers - 1;
    g.fillStyle = C.fen; g.strokeStyle = rgba(C.ink, .8);
    g.beginPath(); g.rect(x - ww * .4, yy - bh, ww * .8, bh); g.fill(); g.stroke();
    if (tiers > 1 && ww > 9) { g.strokeStyle = rgba(C.zhu, .7); g.lineWidth = lw * .9; g.beginPath(); for (const u of [-.22, 0, .22]) { g.moveTo(x + u * ww, yy - bh * .15); g.lineTo(x + u * ww, yy - bh * .85); } g.stroke(); g.lineWidth = lw; }
    yy -= bh;
    if (f >= 1) {                                                   // 檐：两头挑起
      const rh = ww * (top ? .36 : .17), ov = ww * (top ? .64 : .6);
      g.fillStyle = roofC; g.strokeStyle = rgba(C.ink, .85); g.beginPath();
      g.moveTo(x - ov, yy - rh * .15); g.quadraticCurveTo(x - ww * .3, yy + rh * .1, x - ww * (top ? .1 : .34), yy - rh);
      g.lineTo(x + ww * (top ? .1 : .34), yy - rh); g.quadraticCurveTo(x + ww * .3, yy + rh * .1, x + ov, yy - rh * .15);
      g.quadraticCurveTo(x, yy + rh * .28, x - ov, yy - rh * .15); g.fill(); g.stroke();
      yy -= rh * (top ? 1 : .9); ww *= tiers > 6 ? .93 : .88;
      if (top && tiers > 2) { g.strokeStyle = rgba(C.ink, .9); g.beginPath(); g.moveTo(x, yy); g.lineTo(x, yy - w * .3); g.stroke(); g.fillStyle = C.zhu; g.beginPath(); g.arc(x, yy - w * .3, Math.max(1, w * .06), 0, 7); g.fill(); }
    }
  }
}

// ---------- 界画式屋宇（《乾隆京城全图》一类城图的画法）：屏幕坐标 ----------
// 平房按真实占地的朝向“放倒”成一个立面：占地的长边是面阔 L，短边是进深 D；屋身分开间，上面一条屋顶带，两头斜收。
// 纯墨线，只有很淡的设色。(cx, cy) 是占地中心，ang 是长边在屏幕上的角度，bays 开间数。
const roofBand = (g, w, yTop, rh, lw, tint, a) => {             // 一条屋顶：檐口宽、正脊短，淡设色；脊上一道重墨，瓦垄几笔
  const ev = Math.max(1.2, w * .06), rin = w * .11;
  g.fillStyle = rgba(tint, a); g.strokeStyle = rgba(C.ink, .8); g.lineWidth = lw;
  g.beginPath(); g.moveTo(-w / 2 - ev, yTop + lw * .4); g.lineTo(-w / 2 + rin, yTop - rh); g.lineTo(w / 2 - rin, yTop - rh); g.lineTo(w / 2 + ev, yTop + lw * .4); g.closePath(); g.fill(); g.stroke();
  if (rh > 5.5) { g.strokeStyle = rgba(C.ink, .2); g.lineWidth = lw * .6; g.beginPath(); const n = Math.max(2, Math.round(w / 7)); for (let i = 1; i < n; i++) { const u = i / n; g.moveTo(lerp(-w / 2 + rin, w / 2 - rin, u), yTop - rh); g.lineTo(lerp(-w / 2 - ev, w / 2 + ev, u), yTop); } g.stroke(); }
  g.strokeStyle = rgba(C.ink, .9); g.lineWidth = lw * 1.35; g.beginPath(); g.moveTo(-w / 2 + rin - lw, yTop - rh); g.lineTo(w / 2 - rin + lw, yTop - rh); g.stroke();
};
export function drawHall(g, cx, cy, L, D, ang, bays, seed) {
  const r = mulberry(seed * 104729 + 7), lw = clamp(Math.min(L, D) * .07, .5, 1.2), y0 = D / 2, wallH = D * .52, rh = clamp(D * .48, 2.2, L * .5), top = y0 - wallH;
  g.save(); g.translate(cx, cy); g.rotate(ang); g.lineJoin = g.lineCap = 'round';
  g.fillStyle = rgba(C.fen, .94); g.strokeStyle = rgba(C.ink, .8); g.lineWidth = lw; g.beginPath(); g.rect(-L / 2, top, L, wallH); g.fill(); g.stroke();
  if (L > 9 && bays > 1) { g.strokeStyle = rgba(C.ink, .34); g.lineWidth = lw * .7; g.beginPath(); for (let i = 1; i < bays; i++) { const x = lerp(-L / 2, L / 2, i / bays); g.moveTo(x, y0); g.lineTo(x, top); } g.stroke(); }
  if (D > 13 && L > 16) { g.fillStyle = rgba(C.ink, .45); const dw = L / Math.max(bays, 3) * .5; g.fillRect(-dw / 2, y0 - wallH * .62, dw, wallH * .62); }
  roofBand(g, L, top, rh, lw, r() < .2 ? C.qing : '#6b7672', .32);
  g.restore();
}
// 楼阁：高楼永远正着画（往画面上方长）。(x, y) 是楼脚中点，w 底层面阔，tiers 层数；每层一段屋身加一道出挑的腰檐，
// 越往上越窄，最上面一个歇山顶，够高的加刹。k = 生长进度 0–1：一层层盖上去，屋顶始终压在最上面一层。
export function drawTower(g, x, y, w, tiers, seed, k = 1) {
  if (k <= 0) return; const r = mulberry(seed * 104729 + 11), lw = clamp(w * .045, .6, 1.3), th = clamp(w * .46, 6, 19), n = Math.max(1, Math.ceil(tiers * k)), tint = r() < .45 ? C.qing : r() < .5 ? C.lv : '#5d6a66';
  g.save(); g.translate(x, y); g.lineJoin = g.lineCap = 'round';
  g.fillStyle = rgba(C.ink, .1); g.beginPath(); g.ellipse(w * .05, 0, w * .62, w * .1, 0, 0, 7); g.fill();                 // 地影
  let yy = 0, ww = w;
  for (let i = 0; i < n; i++) {
    const f = i === n - 1 ? clamp(tiers * k - i, .25, 1) : 1, bh = th * f, bw = ww * .82;
    g.fillStyle = rgba(C.fen, .96); g.strokeStyle = rgba(C.ink, .8); g.lineWidth = lw; g.beginPath(); g.rect(-bw / 2, yy - bh, bw, bh); g.fill(); g.stroke();
    if (bw > 11) { g.strokeStyle = rgba(C.zhu, .5); g.lineWidth = lw * .8; g.beginPath(); const nb = bw > 26 ? 4 : 2; for (let b = 1; b < nb; b++) { const px = lerp(-bw / 2, bw / 2, b / nb); g.moveTo(px, yy - bh * .12); g.lineTo(px, yy - bh * .88); } g.stroke(); }
    yy -= bh;
    if (i < n - 1) { roofBand(g, ww * .86, yy, th * .2, lw, tint, .5); yy -= th * .2; ww *= tiers > 7 ? .945 : .9; }
  }
  roofBand(g, ww * .9, yy, th * .62, lw, tint, .6); yy -= th * .62;
  if (tiers >= 4 && k >= 1) { g.strokeStyle = rgba(C.ink, .9); g.lineWidth = lw; g.beginPath(); g.moveTo(0, yy); g.lineTo(0, yy - th * .7); g.stroke(); g.fillStyle = C.zhu; g.beginPath(); g.arc(0, yy - th * .7, Math.max(1.3, lw * 1.5), 0, 7); g.fill(); }
  g.restore();
}

// ---------- 字：竖排 ----------
export function vtext(g, text, x, y, size, font, color, gap = 1.08, halo = null) {  // (x, y) 是第一个字的中心
  g.font = `${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (halo) { g.strokeStyle = halo; g.lineWidth = size * .3; [...text].forEach((ch, i) => g.strokeText(ch, x, y + i * size * gap)); }
  g.fillStyle = color; [...text].forEach((ch, i) => g.fillText(ch, x, y + i * size * gap));
  return { x0: x - size * .55, y0: y - size * .55, x1: x + size * .55, y1: y + (text.length - 1) * size * gap + size * .55 };
}
// 贴签：竖排地名写在一张小签上。kind 'slip' 浅签朱框，'red' 朱签白字
export function drawSlip(g, text, x, y, size, kind = 'slip', k = 1) {   // (x, y) 是签的顶边中点
  const n = [...text].length, gap = 1.1, padX = size * .34, padY = size * .42, w = size + padX * 2, h = (n - 1) * size * gap + size + padY * 2;
  g.save(); g.globalAlpha = k;
  g.shadowColor = 'rgba(40,28,14,.28)'; g.shadowBlur = size * .25; g.shadowOffsetY = size * .06;
  g.fillStyle = kind === 'red' ? C.zhu : C.slip; g.fillRect(x - w / 2, y, w, h); g.shadowColor = 'transparent';
  g.strokeStyle = kind === 'red' ? rgba(C.zhuDeep, .9) : rgba(C.zhu, .85); g.lineWidth = Math.max(1, size * .05);
  g.strokeRect(x - w / 2 + size * .09, y + size * .09, w - size * .18, h - size * .18);
  const b = vtext(g, text, x, y + padY + size / 2, size, 'WenKai', kind === 'red' ? C.fen : C.ink, gap);
  g.restore(); return { x0: x - w / 2, y0: y, x1: x + w / 2, y1: y + h, text };
}
// 印章：朱文方印，边和笔画都带一点残破
export function drawSeal(g, text, x, y, size, seed = 5, k = 1) {       // (x, y) 是印的左上角；text 2 或 4 个字，从右往左、从上往下排
  const ch = [...text], cols = ch.length > 2 ? 2 : 1, rows = Math.ceil(ch.length / cols), cell = size / Math.max(cols, rows) , w = cell * cols + size * .16, h = cell * rows + size * .16;
  const cv = new OffscreenCanvas(Math.ceil(w) + 4, Math.ceil(h) + 4), c = cv.getContext('2d'); c.translate(2, 2);
  c.fillStyle = C.zhu; c.beginPath(); c.roundRect(0, 0, w, h, size * .05); c.fill();
  c.globalCompositeOperation = 'destination-out';
  c.font = `${cell * .86}px Brush`; c.textAlign = 'center'; c.textBaseline = 'middle';
  ch.forEach((s, i) => { const col = cols - 1 - Math.floor(i / rows), row = i % rows; c.fillText(s, size * .08 + (col + .5) * cell, size * .08 + (row + .52) * cell); });
  const r = mulberry(seed); for (let i = 0; i < 90; i++) { c.globalAlpha = .5 + r() * .5; c.beginPath(); c.arc(r() * w, r() * h, r() * r() * size * .03, 0, 7); c.fill(); }
  for (let i = 0; i < 14; i++) { const e = r() * 4 | 0, u = r(); c.beginPath(); c.arc(e < 2 ? u * w : e === 2 ? 0 : w, e < 2 ? (e ? h : 0) : u * h, size * (.01 + r() * .03), 0, 7); c.fill(); }
  g.save(); g.globalAlpha = k * .92; g.drawImage(cv, x - 2, y - 2); g.restore();
  return { x0: x, y0: y, x1: x + w, y1: y + h };
}
