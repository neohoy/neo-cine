// 微缩景观工具包 · 灯光：日光、蓝调时刻、夜景三套，按时间混合。
// 灯的数量从头到尾不变，只改强度和颜色（灯的数量一变，three.js 就要重新编译所有着色器，渲染会卡一下）。
// 天黑走的是"浅灰 → 冷的蓝灰 → 深蓝黑"，不经过暖色（暖灰混到深蓝中间会发棕）。
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { lerp, seg } from './core.js';

export const PRESETS = {
  //        背景        太阳颜色    太阳强度  半球天/地             半球强度  环境反射  曝光   夜（0–1，给会亮的材质和辉光）
  day:   { bg: '#e9e7e0', sun: '#fff4e6', sunI: 2.6, sky: '#eef2f4', ground: '#d8d2c2', hemiI: 1.15, env: .55, exp: 1.0, night: 0 },
  blue:  { bg: '#93a2bb', sun: '#c9d6ff', sunI: .55, sky: '#a9b8d6', ground: '#6b7690', hemiI: .8, env: .3, exp: 1.05, night: .55 },
  night: { bg: '#18222f', sun: '#a9bce8', sunI: .35, sky: '#4a5d82', ground: '#1e2636', hemiI: .62, env: .16, exp: 1.12, night: 1 },
};

export class LightRig {
  // board：底座范围 {x:[a,b], z:[a,b]}，用来摆太阳的阴影相机；sunDir：太阳方向（从场景指向太阳）
  constructor(scene, renderer, { board, sunDir = [-.55, .75, .5], shadowMap = 4096 } = {}) {
    this.scene = scene; this.renderer = renderer;
    const cx = (board.x[0] + board.x[1]) / 2, cz = (board.z[0] + board.z[1]) / 2, R = Math.hypot(board.x[1] - board.x[0], board.z[1] - board.z[0]) / 2 + 4;
    this.hemi = new THREE.HemisphereLight('#fff', '#888', 1); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff', 2);
    const d = new THREE.Vector3(...sunDir).normalize();
    this.sun.position.set(cx + d.x * R * 2, d.y * R * 2, cz + d.z * R * 2); this.sun.target.position.set(cx, 0, cz);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(shadowMap, shadowMap);
    const c = this.sun.shadow.camera; c.left = -R; c.right = R; c.top = R; c.bottom = -R; c.near = .5; c.far = R * 4;
    this.sun.shadow.bias = -.0003; this.sun.shadow.normalBias = .04; this.sun.shadow.radius = 2;
    scene.add(this.sun, this.sun.target);
    if (renderer) {
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
    }
    this.state = { ...PRESETS.day };
  }
  // keys = [[t, '预设名'], …]，两键之间平滑过渡；返回当前的混合状态（含 night 0–1）
  stateAt(keys, t) {
    let a = keys[0], b = keys[0];
    for (let i = 0; i < keys.length; i++) { if (keys[i][0] <= t) { a = keys[i]; b = keys[i + 1] || keys[i]; } }
    const u = b === a ? 0 : seg(t, a[0], b[0]), A = PRESETS[a[1]], B = PRESETS[b[1]], s = u * u * (3 - 2 * u), out = {};
    for (const k in A) out[k] = typeof A[k] === 'number' ? lerp(A[k], B[k], s) : '#' + new THREE.Color(A[k]).lerp(new THREE.Color(B[k]), s).getHexString();
    return out;
  }
  apply(st) {
    this.state = st;
    this.scene.background = new THREE.Color(st.bg);
    this.sun.color.set(st.sun); this.sun.intensity = st.sunI;
    this.hemi.color.set(st.sky); this.hemi.groundColor.set(st.ground); this.hemi.intensity = st.hemiI;
    this.scene.environmentIntensity = st.env;
    if (this.renderer) this.renderer.toneMappingExposure = st.exp;
  }
}
