// 铜版图卷 · 画法：纸、刻线、晕滃小丘、篷车、火车、罗盘、牌子。
// 所有函数只依赖传入的参数和种子，不带状态：同样的输入永远画出同样的东西。
import { mulberry, hash, clamp, lerp } from '/core/lib.js';

// 墨和手工淡彩（示范片用的一套；规则在 STYLE.md §3）
export const C = {
  paper: '#efe4c6', land: '#f2e9cf', ink: '#2b2118', sepia: '#5a4028', sea: '#cfdcd6', seaLine: '#4f6e77', river: '#3f5f73',
  red: '#b5402c', gold: '#b08a3c', linen: '#d9cfb4', ribbon: '#31503f', wood: '#3a2416', table: '#15100c',
  tints: ['#e7a79b', '#ecd183', '#a9c99a', '#a3c3d6', '#e6b57e', '#c7afd3'],                 // 玫瑰、藤黄、绿、蓝、橙、淡紫
};
export const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };

// ---------- 纸：一张可平铺的纹理，用 multiply 压在画面最上面。比绢浅，带折痕和霉点 ----------
export function makePaper(size = 1024, seed = 17) {
  const cv = new OffscreenCanvas(size, size), g = cv.getContext('2d'), im = g.createImageData(size, size), d = im.data;
  const octs = [[3, .5], [8, .3], [21, .14], [55, .06]].map(([n, a], k) => { const r = mulberry(seed + k * 31), v = new Float32Array(n * n); for (let i = 0; i < v.length; i++) v[i] = r(); return { n, a, v }; });
  const sm = u => u * u * (3 - 2 * u), grain = mulberry(seed + 999);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let m = 0;
    for (const { n, a, v } of octs) { const fx = x / size * n, fy = y / size * n, ix = Math.floor(fx), iy = Math.floor(fy), ux = sm(fx - ix), uy = sm(fy - iy), i0 = ix % n, i1 = (ix + 1) % n, j0 = iy % n, j1 = (iy + 1) % n; m += a * lerp(lerp(v[j0 * n + i0], v[j0 * n + i1], ux), lerp(v[j1 * n + i0], v[j1 * n + i1], ux), uy); }
    const k = 1 - .12 * m - .03 * grain(), o = (y * size + x) * 4; d[o] = 255 * k; d[o + 1] = 255 * (k - .012 * m); d[o + 2] = 255 * (k - .045 * m); d[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const r = mulberry(seed + 5), wrap = f => { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { g.save(); g.translate(dx, dy); f(); g.restore(); } };
  for (let i = 0; i < 60; i++) { const x = r() * size, y = r() * size, rad = 2 + r() * r() * 22; wrap(() => { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(130,88,40,${.05 + r() * .08})`); gr.addColorStop(1, 'rgba(130,88,40,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }); }
  for (const [vert, at] of [[1, .5], [0, .5]]) { const gr = vert ? g.createLinearGradient(size * at - 5, 0, size * at + 5, 0) : g.createLinearGradient(0, size * at - 5, 0, size * at + 5); gr.addColorStop(0, 'rgba(110,80,40,0)'); gr.addColorStop(.5, 'rgba(110,80,40,.1)'); gr.addColorStop(1, 'rgba(110,80,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, size, size); }   // 折痕
  return cv;
}

// ---------- 晕滃小丘：屏幕坐标，(x, y) 是丘脚中点。左边受光留白，右边一排斜的短线 ----------
export function drawHill(g, x, y, w, h, seed, k = 1) {
  if (k <= 0) return; const r = mulberry(seed * 7919 + 3); h *= k; const px = x - w * (.06 + r() * .1), lw = clamp(w * .045, .6, 1.8);
  g.lineCap = g.lineJoin = 'round'; g.strokeStyle = rgba(C.sepia, .9); g.lineWidth = lw;
  g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(px - w * .12, y - h * .9, px, y - h); g.quadraticCurveTo(px + w * .2, y - h * .8, x + w / 2, y); g.stroke();
  g.lineWidth = lw * .7; g.strokeStyle = rgba(C.sepia, .6); g.beginPath();
  const n = Math.max(3, Math.round(w / (lw * 3.2)));
  for (let i = 1; i < n; i++) { const u = i / n, tx = lerp(px, x + w / 2, u), ty = y - h * (1 - u) ** 1.25, l = h * (.28 + .3 * (1 - u)) * (.7 + .5 * r()); g.moveTo(tx, ty + lw); g.lineTo(tx + l * .28, ty + l); }
  g.stroke();
}

// ---------- 篷车：屏幕坐标，(x, y) 是地面上车身中点，朝左（朝西）。roll = 车轮转过的角度 ----------
export function drawWagon(g, x, y, s, roll = 0, bob = 0) {
  const lw = clamp(s * .028, .9, 2.4); g.save(); g.translate(x, y - bob * s * .02); g.lineJoin = g.lineCap = 'round'; g.lineWidth = lw; g.strokeStyle = C.ink;
  g.fillStyle = rgba(C.ink, .16); g.beginPath(); g.ellipse(-s * .25, 0, s * 1.15, s * .07, 0, 0, 7); g.fill();                                   // 地影
  // 两头牛：身子、腿、角
  for (const ox of [-1.35, -.88]) { const bx = ox * s, by = -s * .32;
    g.fillStyle = ox < -1 ? '#c9b48c' : '#a88a62'; g.beginPath(); g.ellipse(bx, by, s * .24, s * .13, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(bx - s * .24, by - s * .04, s * .09, s * .075, -.3, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(bx - s * .3, by - s * .1); g.quadraticCurveTo(bx - s * .36, by - s * .2, bx - s * .27, by - s * .22); g.stroke();
    const sw = Math.sin(roll * .9 + ox * 3) * s * .05;
    g.beginPath(); for (const [lx, d] of [[-.15, 1], [-.07, -1], [.1, -1], [.17, 1]]) { g.moveTo(bx + lx * s, by + s * .1); g.lineTo(bx + lx * s + sw * d, 0); } g.stroke(); }
  g.beginPath(); g.moveTo(-s * .62, -s * .34); g.lineTo(-s * 1.5, -s * .34); g.stroke();                                                         // 辕
  // 车厢和篷
  g.fillStyle = '#8c6a44'; g.beginPath(); g.moveTo(-s * .6, -s * .44); g.lineTo(s * .62, -s * .44); g.lineTo(s * .55, -s * .26); g.lineTo(-s * .52, -s * .26); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#f6f0de'; g.beginPath(); g.moveTo(-s * .66, -s * .44); g.bezierCurveTo(-s * .72, -s * .98, s * .7, -s * 1.02, s * .68, -s * .44); g.closePath(); g.fill(); g.stroke();
  g.lineWidth = lw * .6; g.strokeStyle = rgba(C.ink, .55); g.beginPath(); for (const u of [-.36, -.08, .2, .46]) { g.moveTo(u * s, -s * .44); g.quadraticCurveTo(u * s - s * .04, -s * .8, u * s * .96, -s * (.98 - Math.abs(u) * .25)); } g.stroke();
  // 轮
  g.strokeStyle = C.ink; for (const [wx, wr] of [[-.36, .2], [.34, .25]]) { const cx = wx * s, cy = -wr * s; g.lineWidth = lw * 1.2; g.fillStyle = rgba(C.land, .9); g.beginPath(); g.arc(cx, cy, wr * s, 0, 7); g.fill(); g.stroke(); g.lineWidth = lw * .6; g.beginPath(); for (let i = 0; i < 8; i++) { const a = roll / wr + i * Math.PI / 4; g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * wr * s, cy + Math.sin(a) * wr * s); } g.stroke(); g.fillStyle = C.ink; g.beginPath(); g.arc(cx, cy, wr * s * .16, 0, 7); g.fill(); }
  g.restore();
}

// ---------- 火车头：屏幕坐标，(x, y) 是铁轨上车身中点，朝左。t 只用来吐烟 ----------
export function drawLoco(g, x, y, s, roll = 0, t = 0, cars = 3) {
  const lw = clamp(s * .028, .9, 2.4); g.save(); g.translate(x, y); g.lineJoin = g.lineCap = 'round'; g.lineWidth = lw; g.strokeStyle = C.ink;
  // 烟：一团团往后飘、变大、变淡
  for (let i = 0; i < 7; i++) { const u = ((t * .9 + i / 7) % 1), px = -s * .52 + u * s * 2.6, py = -s * 1.05 - u * s * .75 - Math.sin(u * 5 + i) * s * .06, pr = s * (.1 + u * .34); g.fillStyle = rgba('#6a6258', .5 * (1 - u)); g.beginPath(); g.arc(px, py, pr, 0, 7); g.fill(); }
  g.fillStyle = rgba(C.ink, .16); g.beginPath(); g.ellipse(s * .9, 0, s * 2.3, s * .06, 0, 0, 7); g.fill();
  // 车厢
  for (let i = 0; i < cars; i++) { const cx = s * (1.25 + i * 1.02); g.fillStyle = i % 2 ? '#8a3b2c' : '#6d5a3e'; g.beginPath(); g.rect(cx - s * .46, -s * .62, s * .92, s * .42); g.fill(); g.stroke(); g.fillStyle = C.ink; for (const wx of [-.28, .28]) { g.beginPath(); g.arc(cx + wx * s, -s * .1, s * .1, 0, 7); g.fill(); } g.beginPath(); g.moveTo(cx - s * .56, -s * .3); g.lineTo(cx - s * .46, -s * .3); g.stroke(); }
  // 锅炉、驾驶室、烟囱、排障器
  g.fillStyle = '#34302c'; g.beginPath(); g.roundRect(-s * .72, -s * .62, s * 1.0, s * .36, s * .1); g.fill(); g.stroke();
  g.fillStyle = '#7a3324'; g.beginPath(); g.rect(s * .28, -s * .86, s * .44, s * .62); g.fill(); g.stroke(); g.fillStyle = rgba(C.land, .9); g.fillRect(s * .36, -s * .78, s * .2, s * .2);
  g.fillStyle = '#34302c'; g.beginPath(); g.moveTo(-s * .58, -s * .62); g.lineTo(-s * .64, -s * 1.0); g.lineTo(-s * .4, -s * 1.0); g.lineTo(-s * .46, -s * .62); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = C.gold; g.beginPath(); g.arc(-s * .16, -s * .68, s * .07, Math.PI, 0); g.fill(); g.stroke();
  g.fillStyle = '#34302c'; g.beginPath(); g.moveTo(-s * .72, -s * .3); g.lineTo(-s * 1.0, 0); g.lineTo(-s * .72, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#8a3b2c'; for (const [wx, wr] of [[-.5, .12], [-.08, .2], [.36, .2]]) { const cx = wx * s, cy = -wr * s; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, wr * s, 0, 7); g.fill(); g.stroke(); g.lineWidth = lw * .6; g.beginPath(); for (let i = 0; i < 6; i++) { const a = roll / wr + i * Math.PI / 3; g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * wr * s, cy + Math.sin(a) * wr * s); } g.stroke(); }
  g.lineWidth = lw * 1.2; g.beginPath(); const a = roll / .2; g.moveTo(-s * .08 + Math.cos(a) * s * .12, -s * .2 + Math.sin(a) * s * .12); g.lineTo(s * .36 + Math.cos(a) * s * .12, -s * .2 + Math.sin(a) * s * .12); g.stroke();
  g.restore();
}

// ---------- 罗盘：八角星，北边一朵鸢尾 ----------
export function drawCompass(g, x, y, r, k = 1) {
  g.save(); g.translate(x, y); g.globalAlpha = k; g.lineJoin = 'round'; g.strokeStyle = C.ink; g.lineWidth = Math.max(.8, r * .02);
  g.beginPath(); g.arc(0, 0, r * .62, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, r * .56, 0, 7); g.stroke();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, len = i % 2 ? r * .52 : r, wd = i % 2 ? r * .1 : r * .14; g.save(); g.rotate(a); g.fillStyle = i % 2 ? rgba(C.ink, .25) : C.ink; g.beginPath(); g.moveTo(0, -len); g.lineTo(wd, 0); g.lineTo(0, 0); g.closePath(); g.fill(); g.fillStyle = C.land; g.beginPath(); g.moveTo(0, -len); g.lineTo(-wd, 0); g.lineTo(0, 0); g.closePath(); g.fill(); g.stroke(); g.restore(); }
  g.font = `${r * .34}px "IM Fell English"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.ink; g.fillText('N', 0, -r * 1.22);
  g.restore();
}

// ---------- 字 ----------
// 拉开字距的衬线大写，带纸色描边，压在刻线上也读得清
export function caps(g, text, x, y, size, color = C.ink, spacing = .28, italic = false, halo = .8) {
  g.save(); g.font = `${italic ? 'italic ' : ''}${size}px "IM Fell English"`; g.letterSpacing = `${size * spacing}px`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const w = g.measureText(text).width, cx = x + size * spacing / 2;
  if (halo) { g.strokeStyle = rgba(C.land, halo); g.lineWidth = size * .28; g.strokeText(text, cx, y); }
  g.fillStyle = color; g.fillText(text, cx, y); g.restore();
  return { x0: x - w / 2, y0: y - size * .6, x1: x + w / 2, y1: y + size * .6 };
}
// 五角星
export function star(g, x, y, r, fill) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } }
// 纸签：一块带双线框的小纸片
export function plate(g, x, y, w, h, k = 1) {
  g.save(); g.globalAlpha = k; g.shadowColor = 'rgba(30,18,6,.35)'; g.shadowBlur = h * .12; g.shadowOffsetY = h * .03; g.fillStyle = C.land; g.fillRect(x, y, w, h); g.shadowColor = 'transparent';
  g.strokeStyle = C.ink; g.lineWidth = Math.max(1.2, h * .018); g.strokeRect(x + h * .05, y + h * .05, w - h * .1, h - h * .1); g.lineWidth = Math.max(.6, h * .008); g.strokeRect(x + h * .085, y + h * .085, w - h * .17, h - h * .17); g.restore();
}
