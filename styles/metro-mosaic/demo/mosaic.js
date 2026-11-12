// 瓷砖地铁图 · 可复用的部件：带倒角的釉面砖、站砖（白心黑边的圆砖）、搪瓷牌、掠射光、马赛克拼字。
// 单位：一格 = 1（墙上一片小砖的间距）。墙面是 z = 0 的勾缝层，砖从这里往 +z（朝镜头）凸出。
import * as THREE from 'three';
import { mulberry } from '/core/lib.js';

// —— 带两级倒角的方砖：顶面 + 每条边三圈（倒角、圆肩、侧面）。法线按圈渐变，釉面的高光会顺着边缘滚过去 ——
// hx, hy = 半宽、半高；d = 厚度；b = 倒角宽
export function tileGeo(hx, hy, d, b) {
  const R = [[b, d, 0], [b * .4, d - b * .22, .85], [0, d - b * .9, 1.42], [0, 0, Math.PI / 2]];
  const pos = [], nor = [];
  const corner = (k, e) => [[-hx + e, -hy + e], [hx - e, -hy + e], [hx - e, hy - e], [-hx + e, hy - e]][k];
  const tri = (P, N) => { for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...P[i]); nor.push(...N[i]); } };
  const t0 = R[0];
  tri([0, 1, 2, 3].map(k => [...corner(k, t0[0]), t0[1]]), [0, 1, 2, 3].map(() => [0, 0, 1]));
  for (let s = 0; s < 4; s++) {
    const a = corner(s, 0), c = corner((s + 1) % 4, 0), dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy), n = [dy / L, -dx / L];
    for (let r = 0; r < R.length - 1; r++) {
      const [e0, z0, g0] = R[r], [e1, z1, g1] = R[r + 1];
      const p0 = corner(s, e1), p1 = corner((s + 1) % 4, e1), p2 = corner((s + 1) % 4, e0), p3 = corner(s, e0);
      const n1 = [n[0] * Math.sin(g1), n[1] * Math.sin(g1), Math.cos(g1)], n0 = [n[0] * Math.sin(g0), n[1] * Math.sin(g0), Math.cos(g0)];
      tri([[...p0, z1], [...p1, z1], [...p2, z0], [...p3, z0]], [n1, n1, n0, n0]);
    }
  }
  const g = new THREE.BufferGeometry(), uv = [];
  for (let i = 0; i < pos.length; i += 3) uv.push((pos[i] + hx) / (2 * hx), (pos[i + 1] + hy) / (2 * hy));
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// —— 站砖：白心、黑边、圆肩的圆砖（半径 1，用实例矩阵缩放）——
export function discGeo() {
  const P = [[1, 0, 0], [1, .2, 0], [.985, .3, 0], [.94, .37, 0], [.86, .4, 0], [.74, .41, 0], [.74, .41, 1], [.5, .415, 1], [0, .42, 1]];
  const g = new THREE.LatheGeometry(P.map(p => new THREE.Vector2(p[0], p[1])), 40);
  const n = g.attributes.position.count, col = new Float32Array(n * 3), dark = new THREE.Color('#15181c'), white = new THREE.Color('#f6f4ee');
  for (let i = 0; i < n; i++) { const c = P[i % P.length][2] ? white : dark; col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

// —— 掠射光：给釉面材质打补丁，第二盏平行光（下标 1）只照亮世界坐标 x 在一条光带里的部分 ——
export const RAKE_U = { value: new THREE.Vector4(0, 40, 0, 0) };     // x 中心、半宽、强度
export function rakePatch(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uRake = RAKE_U;
    sh.vertexShader = 'varying vec3 vWPos;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vec4 wp4 = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wp4 = instanceMatrix * wp4;
      #endif
      vWPos = (modelMatrix * wp4).xyz;`);
    const chunk = THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );',
      'getDirectionalLightInfo( directionalLight, directLight );\n\t\tif ( UNROLLED_LOOP_INDEX == 1 ) { float rq = (vWPos.x - uRake.x) / uRake.y; directLight.color *= uRake.z * exp(-rq * rq); }');
    sh.fragmentShader = 'varying vec3 vWPos;\nuniform vec4 uRake;\n' + sh.fragmentShader.replace('#include <lights_fragment_begin>', chunk);
  };
  mat.customProgramCacheKey = () => 'rake';
  return mat;
}

// 釉面：白砖、色砖都是同一种釉，颜色走实例色
export function glaze(o = {}) {
  return rakePatch(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .22, metalness: 0, clearcoat: 1, clearcoatRoughness: .04,
    specularIntensity: .7, envMapIntensity: 1, vertexColors: !!o.vertexColors, ...o.mat }));
}

// —— 勾缝层：浅灰的水泥，带一点颗粒（画布纹理，按墙的格子平铺）——
export function groutTexture(rnd) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#a39d91'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { const v = 120 + rnd() * 70 | 0; g.fillStyle = `rgba(${v},${v - 4},${v - 12},.35)`; g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// —— 搪瓷牌：深蓝釉底、白字、内衬一道白线、四颗镀铬螺丝。draw(g, W, H, px) 在画布上写字，返回字块 [{id, text, x0, y0, x1, y1}]（画布像素）。
// 返回 { group, pieces: [{id, text, rect: [x0, y0, x1, y1]（牌子自己的格坐标，y 朝上）}] } ——
const SCREW = new THREE.MeshPhysicalMaterial({ color: 0xd8dadf, metalness: 1, roughness: .22 });
const SCREW_G = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2);
export function plaque(w, h, draw, o = {}) {
  const px = Math.min(128, Math.floor(4096 / w)), W = Math.round(w * px), H = Math.round(h * px);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const bg = o.bg || '#1c3260', fg = o.fg || '#f4f1e8';
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // 搪瓷的不匀：几片很淡的斑和细小的颗粒
  const rnd = o.rnd || mulberry(w * 1000 + h);
  for (let i = 0; i < 26; i++) { const r = (.15 + rnd() * .5) * H; const gr = g.createRadialGradient(rnd() * W, rnd() * H, 0, rnd() * W, rnd() * H, r);
    gr.addColorStop(0, `rgba(255,255,255,${.012 + rnd() * .02})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  const m = Math.min(W, H) * .07, lw = Math.max(2, px * .07);
  g.strokeStyle = fg; g.lineWidth = lw; g.globalAlpha = .9;
  const rr = (x, y, ww, hh, r) => { g.beginPath(); g.roundRect(x, y, ww, hh, r); };
  rr(m, m, W - 2 * m, H - 2 * m, m * 1.1); g.stroke(); g.globalAlpha = 1;
  g.fillStyle = fg;
  const boxes = draw(g, W, H, px, m) || [];
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; tex.generateMipmaps = true;
  const r = Math.min(.55, h * .12);
  const sh = new THREE.Shape(); sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const bev = Math.min(.12, h * .03);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: .1, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 10 });
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  geo.computeVertexNormals();
  const mat = rakePatch(new THREE.MeshPhysicalMaterial({ map: tex, roughness: .35, clearcoat: .8, clearcoatRoughness: .22, envMapIntensity: .25 }));
  const mesh = new THREE.Mesh(geo, mat);
  const group = new THREE.Group(); group.add(mesh);
  const sr = Math.min(.2, h * .05), si = m / px * .55 + sr;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const s = new THREE.Mesh(SCREW_G, SCREW); s.scale.set(sr, sr, sr * .7); s.position.set(sx * (w / 2 - si), sy * (h / 2 - si), .1 + bev); group.add(s);
  }
  const pieces = boxes.map(b => ({ id: b.id, text: b.text, pass: !!b.pass,
    rect: [b.x0 / px - w / 2, h / 2 - b.y1 / px, b.x1 / px - w / 2, h / 2 - b.y0 / px] }));
  return { group, pieces, w, h, mat, tex };
}

// 在画布上写一行字，返回字块（画布像素）。font 是完整的 CSS 字体串；align: 'left' | 'center'
export function line(g, id, text, font, x, y, align = 'left', o = {}) {
  g.font = font; g.textAlign = align; g.textBaseline = 'alphabetic';
  if (o.spacing) g.letterSpacing = o.spacing + 'px';
  if (o.maxW && g.measureText(text).width > o.maxW) { const px = parseFloat(font.match(/([\d.]+)px/)[1]); g.font = font.replace(/[\d.]+px/, (px * o.maxW / g.measureText(text).width).toFixed(2) + 'px'); }   // 太长就把字号缩到放得下
  const mtr = g.measureText(text), w = mtr.width, a = mtr.actualBoundingBoxAscent, d = mtr.actualBoundingBoxDescent;
  if (o.color) g.fillStyle = o.color;
  g.fillText(text, x, y); g.letterSpacing = '0px';
  const x0 = align === 'center' ? x - w / 2 : x;
  return { id, text, x0, y0: y - a, x1: x0 + w, y1: y + d, pass: o.pass };
}

// —— 马赛克拼字：把一行字画到很小的画布上（一格一个像素），取覆盖率超过一半的格子 ——
export function rasterText(parts, cols, rows) {
  const c = document.createElement('canvas'); c.width = cols; c.height = rows; const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, cols, rows); g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  for (const p of parts) { g.font = p.font; g.letterSpacing = (p.spacing || 0) + 'px'; g.textAlign = p.align || 'left'; g.fillText(p.text, p.x, p.y); }
  const d = g.getImageData(0, 0, cols, rows).data, on = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) on[(rows - 1 - j) * cols + i] = d[(j * cols + i) * 4] > 120 ? 1 : 0;   // 翻成 y 朝上
  return on;
}
