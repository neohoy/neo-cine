// 微缩景观工具包 · 讲解层。
//   2D（画在模型上面那张透明画布上）：引线标注（从模型上的一个点引到画面边的标签，中英两行）、步骤编号牌、层名、标题卡。
//   3D（在模型里）：动线——金色的点线沿路径一颗颗长出来，表示"从这里走到那里"；会被楼板、柱子挡住，所以读起来在模型里面。
// 每一块字都登记进 texts()，页面的 window.TEXTS(t) 直接返回它，阅读时长检查（core/render/readcheck.mjs）按它算。
// 字体：中文用 Noto Sans SC（粗），拉丁字母用 Inter；页面要先用 @font-face 载入，名字通过 fonts 传进来。
import * as THREE from 'three';
import { clamp, seg, Path } from './core.js';
import { PALETTE } from './materials.js';

const CIRCLED = '⓪①②③④⑤⑥⑦⑧⑨⑩';

export class Overlay {
  constructor(canvas, { W = 1920, H = 1080, cn = 'NotoSC', en = 'Inter', ink = '#26302f', paper = 'rgba(247,245,238,.94)', accent = PALETTE.gold } = {}) {
    this.cv = canvas; this.g = canvas.getContext('2d'); this.W = W; this.H = H; this.f = { cn, en }; this.ink = ink; this.paper = paper; this.accent = accent;
    this.list = [];
  }
  begin() { this.g.clearRect(0, 0, this.W, this.H); this.list = []; }
  texts() { return this.list; }
  _report(id, text, box, a, pass = false) { if (a >= .999) this.list.push({ id, text, x0: box[0], y0: box[1], x1: box[2], y1: box[3], ...(pass ? { pass: true } : {}) }); }
  _measure(cn, en, cs, es) {
    const g = this.g; g.font = `700 ${cs}px ${this.f.cn}`; const w1 = g.measureText(cn).width;
    g.font = `500 ${es}px ${this.f.en}`; g.letterSpacing = '.06em'; const w2 = en ? g.measureText(en).width : 0; g.letterSpacing = '0px';
    return Math.max(w1, w2);
  }
  // 两行字（中文在上、英文在下）画在一块纸色圆角牌上；返回牌的外框
  _plate(x, y, cn, en, { cs = 34, es = 19, a = 1, align = 'left', dot = true, pad = 18 } = {}) {
    const g = this.g, tw = this._measure(cn, en, cs, es), h = pad * 2 + cs + (en ? es + 10 : 0), w = tw + pad * 2 + (dot ? 18 : 0);
    const x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2, y0 = y - h / 2;
    g.save(); g.globalAlpha = a;
    g.fillStyle = this.paper; g.shadowColor = 'rgba(20,30,30,.18)'; g.shadowBlur = 14; g.shadowOffsetY = 3;
    g.beginPath(); g.roundRect(x0, y0, w, h, 8); g.fill(); g.shadowColor = 'transparent';
    let tx = x0 + pad;
    if (dot) { g.fillStyle = this.accent; g.fillRect(tx, y0 + pad + cs * .18, 8, cs * .62); tx += 18; }
    g.fillStyle = this.ink; g.textBaseline = 'top'; g.font = `700 ${cs}px ${this.f.cn}`; g.fillText(cn, tx, y0 + pad - 2);
    if (en) { g.font = `500 ${es}px ${this.f.en}`; g.letterSpacing = '.06em'; g.fillStyle = 'rgba(38,48,47,.78)'; g.fillText(en, tx, y0 + pad + cs + 8); g.letterSpacing = '0px'; }
    g.restore();
    return [x0, y0, x0 + w, y0 + h];
  }
  // 引线标注：anchor 是画面上的点（[x,y]，由相机投影得来）；标签放在 label=[x,y]（牌的一侧对齐点）
  // a 是整体透明度；grow 0–1 是引线画出来的进度（引线先长，再出字）
  callout(id, anchor, label, cn, en, { a = 1, grow = 1, side = 'right', cs = 30, es = 17 } = {}) {
    const g = this.g, [ax, ay] = anchor, [lx, ly] = label;
    g.save(); g.globalAlpha = a; g.strokeStyle = this.ink; g.lineWidth = 2;
    // 引线：先从锚点斜出去，再水平到牌子
    const ex = side === 'right' ? lx - 14 : lx + 14, mx = ex + (side === 'right' ? -1 : 1) * Math.min(60, Math.abs(ex - ax) * .3);
    const segs = [[ax, ay, mx, ly], [mx, ly, ex, ly]], len = segs.reduce((s, q) => s + Math.hypot(q[2] - q[0], q[3] - q[1]), 0);
    let left = len * clamp(grow);
    g.beginPath(); g.moveTo(ax, ay);
    for (const [x0, y0, x1, y1] of segs) { const L = Math.hypot(x1 - x0, y1 - y0); if (left <= 0) break; const u = Math.min(1, left / L); g.lineTo(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u); left -= L; }
    g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ax, ay, 6.5, 0, 7); g.fill(); g.strokeStyle = this.ink; g.lineWidth = 2.2; g.stroke();
    g.fillStyle = this.accent; g.beginPath(); g.arc(ax, ay, 3.2, 0, 7); g.fill();
    g.restore();
    const ta = a * clamp((grow - .7) / .3);
    if (ta > 0) { const box = this._plate(lx, ly, cn, en, { cs, es, a: ta, align: side === 'right' ? 'left' : 'right', dot: false, pad: 14 }); this._report(id, cn + ' ' + en, box, ta); }
  }
  // 步骤编号牌：左上角，金色圆牌里是编号，旁边中英两行
  badge(id, n, cn, en, { a = 1, x = 96, y = 92 } = {}) {
    const g = this.g, R = 40;
    g.save(); g.globalAlpha = a;
    g.fillStyle = this.paper; g.shadowColor = 'rgba(20,30,30,.2)'; g.shadowBlur = 16; g.shadowOffsetY = 3;
    const tw = this._measure(cn, en, 40, 20), w = R * 2 + 36 + tw + 34, h = 104;
    g.beginPath(); g.roundRect(x - 12, y - 12, w, h, h / 2); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = this.accent; g.beginPath(); g.arc(x - 12 + h / 2, y - 12 + h / 2, R, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = `700 46px ${this.f.en}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), x - 12 + h / 2, y - 12 + h / 2 + 2);
    g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = this.ink; g.font = `700 40px ${this.f.cn}`; g.fillText(cn, x + R * 2 + 14, y + 2);
    g.font = `500 20px ${this.f.en}`; g.letterSpacing = '.08em'; g.fillStyle = 'rgba(38,48,47,.75)'; g.fillText(en.toUpperCase(), x + R * 2 + 15, y + 52); g.letterSpacing = '0px';
    g.restore();
    this._report(id, CIRCLED[n] + ' ' + cn + ' ' + en, [x - 12, y - 12, x - 12 + w, y - 12 + h], a);
  }
  // 层名：贴在画面一侧的一列小牌，每块用引线连到那一层的锚点
  layer(id, anchor, label, cn, en, o = {}) { this.callout(id, anchor, label, cn, en, { cs: 26, es: 15, ...o }); }
  // 标题卡：左下角，大字中文 + 一行英文，没有底牌（字直接压在背景上）
  card(id, cn, en, { a = 1, x = 110, y = 860, cs = 76, es = 26, color = null, sub = null } = {}) {
    const g = this.g; g.save(); g.globalAlpha = a; g.fillStyle = color || this.ink; g.textBaseline = 'alphabetic';
    g.font = `700 ${cs}px ${this.f.cn}`; const w1 = g.measureText(cn).width; g.fillText(cn, x, y);
    g.fillStyle = this.accent; g.fillRect(x, y + 26, 64, 5);
    g.fillStyle = color || this.ink; g.font = `500 ${es}px ${this.f.en}`; g.letterSpacing = '.14em'; const w2 = g.measureText(en.toUpperCase()).width; g.fillText(en.toUpperCase(), x, y + 26 + 18 + es); g.letterSpacing = '0px';
    g.restore();
    this._report(id, cn + ' ' + en, [x, y - cs, x + Math.max(w1, w2), y + 26 + 18 + es + 8], a);
  }
  // 一行小字（署名、说明）：pass=true 表示不要求读完（readcheck 只列出、不计时）
  line(id, text, { a = 1, x, y, size = 24, font = 'en', color = null, align = 'left', weight = 600, pass = false, spacing = '.1em' } = {}) {
    const g = this.g; g.save(); g.globalAlpha = a; g.fillStyle = color || this.ink; g.textAlign = align; g.textBaseline = 'alphabetic';
    g.font = `${weight} ${size}px ${font === 'cn' ? this.f.cn : this.f.en}`; g.letterSpacing = spacing; const w = g.measureText(text).width; g.fillText(text, x, y); g.letterSpacing = '0px'; g.restore();
    const x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2; this._report(id, text, [x0, y - size, x0 + w, y + size * .3], a, pass);
  }
}

// 动线：沿路径（[x,y,z] 点列）每隔 spacing 一颗扁圆点，show(d) 显示到沿线距离 d 为止；最前面一颗大一点。
// 点用自发光材质，夜里也看得见；裁剪平面可选。
export class RouteDots {
  constructor(parent, pts, { color = PALETTE.gold, spacing = .42, r = .095, lift = .06, clip = null } = {}) {
    this.path = new Path(pts); this.spacing = spacing; this.lift = lift;
    this.n = Math.max(2, Math.floor(this.path.length / spacing) + 1);
    const m = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: .55, roughness: .4 });
    if (clip) { m.clippingPlanes = clip; }
    this.mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(r, r, .06, 16), m, this.n); this.mesh.frustumCulled = false; this.mesh.castShadow = false;
    parent.add(this.mesh); this.mat = m; this._m = new THREE.Matrix4(); this.show(0);
  }
  show(d, t = 0) {
    const m = this._m, n = Math.min(this.n, Math.floor(clamp(d, 0, this.path.length) / this.spacing) + (d > 0 ? 1 : 0));
    for (let i = 0; i < this.n; i++) {
      if (i >= n) { m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, m); continue; }
      const p = this.path.at(i * this.spacing).p, tip = i === n - 1 && d < this.path.length - .01;
      const s = tip ? 1.6 : 1;                      // 最前面一颗大一点：动线长到哪儿
      m.makeScale(s, 1, s).setPosition(p[0], p[1] + this.lift, p[2]); this.mesh.setMatrixAt(i, m);
    }
    this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true;
  }
}
