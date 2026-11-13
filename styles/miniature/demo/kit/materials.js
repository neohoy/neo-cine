// 微缩景观工具包 · 材质和色板。
// 白模为主，点缀色少而有意义。比例（按画面面积估）：
//   白、象牙、浅灰（模型本身）        ≈ 80–85 %
//   底座深石板、切面的土              ≈ 8–12 %（只在底座和切面上）
//   绿化（树冠、灌木、草地）          ≈ 4–6 %
//   点缀色（人的衣服、车、标识、动线）≤ 5 %，同一画面里最多三种点缀色相
// 不画运营方的标志、字样和专用色；标识只有色块和象形图。
import * as THREE from 'three';

export const PALETTE = {
  // 白模
  white: '#f1efe8', ivory: '#e8e4d8', bone: '#ddd9cc', pale: '#d2d0c6', silver: '#c3c7c4', steel: '#9ea6a6',
  // 地面
  paving: '#e2ded2', road: '#b8b8b1', curb: '#ecebe4', ballast: '#c9c4b8', rail: '#8e9494', platform: '#e9e6db',
  // 底座和切面
  slate: '#4d5b5f', slateEdge: '#3f4b4f', earth: '#cdbd9c', earthDeep: '#b9a684', stone: '#a8a39a',
  // 绿化
  leaf: '#93ad7d', leafDeep: '#7a9868', leafLight: '#a9bf8e', grass: '#c3cfa8', trunk: '#9a8a76',
  // 点缀（讲解和生活）
  gold: '#d9a52e', teal: '#3e9693', coral: '#d4705a', blue: '#3f6f93', red: '#b8433a', green: '#5f9a6a', amber: '#e0b24a',
  ink: '#28302f',
};
// 小人的衣服：低饱和、偏暖，和白模放在一起不刺眼
export const CLOTHES = ['#5a6e83', '#7c5b52', '#3f4f5a', '#a7856a', '#6b7f6a', '#8e8f93', '#b89b74', '#4c5c6e', '#9b6a5c', '#d4cdbd', '#6c6177', '#2f3a40'];
export const SKIN = ['#e3c4a5', '#d8b392', '#c99f7f', '#edd2b8'];
export const HAIR = ['#2b2522', '#3a2f28', '#1f1d1c', '#5b4a3c'];

// 材质的取值（统一在这里改）：
//   石材、白模：粗糙度 .72–.8，不带金属感；漆面：.35 + 清漆 .6；金属：粗糙度 .35、金属度 .8；
//   玻璃：不用 transmission（它在 Windows 的 ANGLE 上让着色器编译慢到几分钟），用"反射 + 半透明"：
//         颜色偏青灰、粗糙度 .06、opacity .16–.3、不写深度，靠环境贴图出反光。
const cache = new Map();
export function mat(color, o = {}) {
  const id = color + JSON.stringify(o);
  if (cache.has(id) && !o.unique) return cache.get(id);
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? .76, metalness: o.metal ?? 0, flatShading: false });
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei ?? 0; }
  if (o.side) m.side = o.side;
  if (!o.unique) cache.set(id, m);
  return m;
}
export function paint(color, o = {}) {
  const id = 'paint' + color + JSON.stringify(o);
  if (cache.has(id) && !o.unique) return cache.get(id);
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: o.rough ?? .38, metalness: 0, clearcoat: o.coat ?? .6, clearcoatRoughness: .25 });
  if (!o.unique) cache.set(id, m);
  return m;
}
export const metal = (color = PALETTE.steel, rough = .35) => mat(color, { rough, metal: .8 });
export function glass(o = {}) {
  const id = 'glass' + JSON.stringify(o);
  if (cache.has(id) && !o.unique) return cache.get(id);
  const m = new THREE.MeshStandardMaterial({ color: o.color ?? '#cfdde0', roughness: .06, metalness: .1, transparent: true, opacity: o.opacity ?? .2, depthWrite: false, envMapIntensity: 1.4 });
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = 0; }
  if (!o.unique) cache.set(id, m);
  return m;
}

// 切面上的土：按世界坐标 y 画地层带（颜色深浅交替、带细线），按 x/z 加一点颗粒。
// strata = [{ y: 顶面, color }, …] 从上往下；line 是层界线的颜色。
export function earthMat({ top = 0, strata, line = '#a99572', grain = .05 } = {}) {
  const layers = strata || [{ y: top, color: PALETTE.earth }, { y: top - 1.6, color: '#c6b493' }, { y: top - 3.4, color: PALETTE.earthDeep }, { y: top - 5.6, color: '#ad9a7b' }];
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .92 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uLy = { value: layers.map(l => l.y).concat(Array(8).fill(-1e4)).slice(0, 8) };
    sh.uniforms.uLc = { value: layers.map(l => new THREE.Color(l.color)).concat(Array(8).fill(new THREE.Color(layers[layers.length - 1].color))).slice(0, 8) };
    sh.uniforms.uLine = { value: new THREE.Color(line) }; sh.uniforms.uGrain = { value: grain };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWp; uniform float uLy[8]; uniform vec3 uLc[8]; uniform vec3 uLine; uniform float uGrain;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
vec3 ec = uLc[0];
float wob = sin(vWp.x * .37 + vWp.z * .29) * .12 + sin(vWp.x * 1.3 - vWp.z * .9) * .04;   // 层界微微起伏
float yy = vWp.y + wob, ln = 0.;
for (int i = 1; i < 8; i++) { if (yy < uLy[i]) ec = uLc[i]; ln = max(ln, 1. - smoothstep(.0, .045, abs(yy - uLy[i]))); }
float gr = h21(floor(vWp.xz * 9. + vWp.y * 7.)) - .5;
ec *= 1. + gr * uGrain;
ec = mix(ec, uLine, ln * .55);
vec4 diffuseColor = vec4( diffuse * ec, opacity );`);
  };
  m.customProgramCacheKey = () => 'earth' + layers.length;
  return m;
}

// 会亮的材质（窗、灯、屏幕）：按批登记，夜里一批批点亮。
// glow.make(批名, 颜色, 底色) 得到一个材质；glow.update(t, 天色) 按每批的开灯时间设 emissiveIntensity。
export class Glow {
  constructor() { this.batches = new Map(); this.mats = []; }
  make(batch, color = '#ffd9a0', base = PALETTE.ivory, o = {}) {
    const m = o.glass ? glass({ color: base, opacity: o.opacity ?? .25, emissive: color, unique: true })
      : new THREE.MeshStandardMaterial({ color: base, roughness: o.rough ?? .6, emissive: new THREE.Color(color), emissiveIntensity: 0 });
    m.userData.glow = { batch, max: o.max ?? 1.6, day: o.day ?? 0 };
    this.mats.push(m); if (!this.batches.has(batch)) this.batches.set(batch, { on: Infinity, snap: .12 });
    return m;
  }
  // 设一批的开灯时间（秒）；snap 是从灭到全亮用的时间，灯是"一下子"亮的
  schedule(batch, on, snap = .12) { if (!this.batches.has(batch)) this.batches.set(batch, {}); Object.assign(this.batches.get(batch), { on, snap }); }
  level(batch, t) { const b = this.batches.get(batch); if (!b || !(t >= b.on)) return 0; return Math.min(1, (t - b.on) / b.snap); }
  update(t, night = 1) {
    for (const m of this.mats) {
      const g = m.userData.glow, on = this.level(g.batch, t);
      m.emissiveIntensity = g.day + (g.max - g.day) * on * (.35 + .65 * night);
    }
  }
}
