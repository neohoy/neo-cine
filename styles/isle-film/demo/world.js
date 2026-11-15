/* 本文件复制自 NEO-Isle（方寸之境，https://github.com/neohoy/neo-isle，MIT，© 2026 NEO造物集 (neohoy)）的
   examples/02-雪落寒山/world.js，内容未改。方寸影像的示范片拍的就是这一境。 */
/* ============================================================================
   方寸之境 · 第二境 · 雪落寒山

   隆冬大雪。一座孤峰、一面冰湖、一挂冰瀑；牦牛走过雪原，石屋亮着一扇窗。
   一奇：入夜后，冰面下有发光的鱼在游。
   坐标：x、z 都在 [-5, 5]，镜头默认从 +x +z 方向俯看。
   ============================================================================ */
const WORLD = {
  meta: {
    no: 2, name: '雪落寒山',
    tagline: '大雪封山，冰湖如镜，石屋一窗灯火',
    seed: 20261111,
    ground: -2.5,          // 孤峰很高，地面放低一点，给云和雪留地方
    startHour: 17.2,       // 黄昏：暖光打在雪峰上，阴影是蓝紫的，石屋刚点灯
  },

  // 阴天下雪的天色：主光弱、天光强、雾气重；雪地反光，所以夜里比别的境亮一点
  sky(k){
    Object.assign(k.daybreak,  { sky: '#6a6aa8', gnd: '#4a4a78', haze: '#5a5590', ha: 0.3 });
    Object.assign(k.sunrise,   { key: '#ffb890', ki: 2.3, sky: '#c4c8ee', gnd: '#8d8aae', hi: 0.95, haze: '#cdb6d2', ha: 0.2, ma: 0.75, sh: 0.45 });   // 受光面暖粉，背光面蓝紫
    Object.assign(k.morning,   { key: '#ffeedd', ki: 2.1, sky: '#d6e2f2', gnd: '#9aa3b8', hi: 1.1, haze: '#b9c8de', ha: 0.3, ma: 0.7, sh: 0.35 });
    Object.assign(k.noon,      { key: '#eef2ff', ki: 2.2, sky: '#dfe8f5', gnd: '#a8b0c2', hi: 1.15, haze: '#c4d0e2', ha: 0.34, ma: 0.6, sh: 0.25, exp: 0.9 });
    Object.assign(k.afternoon, { key: '#ffdcb8', ki: 2.5, sky: '#c9d8f0', gnd: '#a09cb4', hi: 1.0, haze: '#b4c6e2', ha: 0.24, ma: 0.55, sh: 0.5 });
    Object.assign(k.sunset,    { key: '#ff8450', ki: 2.3, sky: '#b9b4e0', gnd: '#7a6f96', hi: 0.8, haze: '#c08aa6', ha: 0.2, ma: 0.6, sh: 0.6 });      // 暖光打雪、阴影偏紫蓝
    Object.assign(k.dusk,      { sky: '#6464a8', gnd: '#4c4c80', hi: 0.85, haze: '#3c3a78', ha: 0.3 });                 // 天黑下来时雪地还留着一点亮
    for (const id of ['midnight', 'predawn', 'night']) Object.assign(k[id], { ki: 0.85, sky: '#2c3c74', gnd: '#36437a', hi: 1.0, haze: '#141f46', ha: 0.34, ma: 0.7 });
  },

  build(F){
    const { THREE, G, R, pick, rand, C, gs, smooth, clamp, lerp, n2, fbm, ridged, kit } = F;
    const clay = F.clay;

    /* ---------- 一、地貌：左后孤峰，右后矮峰，右中一道岩阶，前面雪原和冰湖 ---------- */
    const PEAK = { x: -1.3, z: -2.7 };
    const GA = [-1.05, -1.75], GB = [-0.15, 1.0];                      // 冰川舌的中线：从主峰正面垂向雪原
    const glacier = (x, z) => {                                         // 返回 { m 在冰川上的程度, t 沿流向的位置 }
      const ax = GB[0] - GA[0], az = GB[1] - GA[1], L2 = ax * ax + az * az;
      const t = ((x - GA[0]) * ax + (z - GA[1]) * az) / L2, tc = clamp(t, 0, 1);
      const d = Math.hypot(x - GA[0] - ax * tc, z - GA[1] - az * tc);
      return { m: smooth(0.62 - 0.22 * tc, 0.28 - 0.1 * tc, d + 0.05 * n2(x * 2, z * 2)) * smooth(-0.08, 0.1, t) * smooth(1.08, 0.9, t), t };
    };
    const cliffZ = x => -1.15 + 0.25 * Math.sin(x * 0.9 + 1.0);
    const base = (x, z) => {
      let h = 0.55 + 0.2 * fbm(x * 0.35 + 5, z * 0.35 + 2, 4);                                              // 雪原的缓起伏
      h += 0.7 * gs(x + 3.6, z - 3.0, 1.4) + 0.5 * gs(x + 1.2, z - 4.2, 1.1) + 0.45 * gs(x - 4.3, z - 3.6, 1.0);   // 前景雪丘
      const cz = cliffZ(x), soft = 0.09 + 1.2 * smooth(1.2, -0.6, x) + 0.5 * smooth(3.9, 5.0, x);          // 岩阶：右中段陡，往左化成缓坡
      h += 1.05 * smooth(cz + soft, cz - soft, z) * smooth(-1.5, 0.8, x);
      let m = 2.3 * gs(x - PEAK.x, z - PEAK.z, 2.5) + 3.0 * Math.pow(gs(x - PEAK.x, z - PEAK.z, 1.3), 1.5);   // 孤峰：宽基座 + 尖顶
      m += 2.5 * gs(x - 3.2, z + 3.6, 1.3) + 1.7 * gs(x + 4.3, z + 1.2, 1.2) + 1.0 * gs(x - 0.6, z + 4.4, 1.2);  // 矮峰、左山肩、后山梁
      m *= 0.86 + 0.28 * fbm(x * 0.7 + 3, z * 0.7 - 8, 3);
      m += smooth(-1.4, -4.4, z) * ridged(x * 0.5 - 4, z * 0.5 + 1, 5) * 0.8 + ridged(x * 0.9, z * 0.9, 4) * 0.5 * gs(x - PEAK.x, z - PEAK.z, 1.8);
      return h + m - 0.1 * glacier(x, z).m;
    };
    const HUT = { x: 3.7, z: 0.7 };
    const T = F.terrain({
      base,
      // 冻溪：垭口 → 岩阶（冰瀑）→ 冰湖。不调用 F.water，所以它不是活水，只留下淡蓝的冰带
      rivers: [{ points: [[1.9, -3.2], [2.2, -2.4], [2.35, -1.6], [2.3, -1.0], [2.1, -0.3], [1.8, 0.5], [1.7, 1.3], [1.7, 2.3]], lake: 0, width: [0.05, 0.13], depth: [0.05, 0.09] }],
      lakes: [{ x: 1.7, z: 2.3, rx: 1.55, rz: 1.1, depth: 0.4 }],
      pads: [{ x: HUT.x, z: HUT.z, r: 0.55 }],
    });
    const stream = T.rivers[0], lake = T.lakes[0], iceY = G + lake.level + 0.006;

    /* ---------- 二、上色：雪、露岩、冰川条纹；剖面最上面是一层积雪 ---------- */
    const strata = F.makeStrata({
      canyon: ['#8a94a3', '#a9b3c0', '#737d8c', '#bcc5d0', '#667080', '#99a3b1'],           // 冷灰蓝的岩层
      rocks: ['#59616d', '#6d7682', '#4a515c', '#7f8894'],
      soil: [[0, '#6b5a4e'], [-0.3, '#8a7868'], [-0.62, '#8e99a8'], [-0.84, '#cfe6f2'], [-1.0, '#7a8494'], [-1.32, '#b3bfcd'], [-1.52, '#6c7686'], [-1.86, '#d6eaf4'], [-2.02, '#8792a2'], [-2.3, '#5a6372']],   // 冻土、砾石，夹两层淡蓝的冰
    });
    const snowA = C('#f1f5fa'), snowB = C('#dde8f3'), snowShade = C('#bfd0e6'), iceA = C('#c2e3f1'), iceB = C('#7fb3d5'), t2 = new THREE.Color();
    F.ground({
      strata,
      topsoil: ['#f2f6fa', '#cfdcea'],                                                      // 剖面上看得见积雪的厚度
      shore: { sand: '#e6eef6', bed: '#b6d8e8', deepBed: '#5f93b3' },                       // 冻溪和湖底：淡蓝的冰色
      roughness: 0.9,
      color(c, x, z, h, slope){
        const nA = fbm(x * 0.8 + 3, z * 0.8, 3), nB = n2(x * 3.3, z * 3.3);
        c.copy(snowB).lerp(snowA, smooth(-0.35, 0.35, nA));
        c.lerp(snowShade, smooth(0.1, 0.32, slope) * 0.55);                                 // 坡面的雪偏蓝
        const steep = smooth(0.44, 0.68, slope + nB * 0.06);                                // 陡处挂不住雪，露出岩层；岩面上还留着一道道雪沟
        if (steep > 0) c.lerp(strata(h + nB * 0.02, x, z, t2), steep * (0.45 + 0.5 * smooth(-0.25, 0.3, fbm(x * 2.4, z * 2.4 + 7, 3))));
        const g = glacier(x, z);
        if (g.m > 0){ c.lerp(iceA, g.m * 0.6); c.lerp(iceB, g.m * smooth(0.5, 0.95, Math.sin(g.t * 44 + nB * 1.3)) * 0.65); }   // 冰川的横向裂隙
      },
    });

    // 冰湖面：一张画了裂纹和霜斑的贴图
    {
      const cv = document.createElement('canvas'); cv.width = cv.height = 768; const g = cv.getContext('2d');
      g.fillStyle = '#eaf4fa'; g.fillRect(0, 0, 768, 768);
      for (let i = 0; i < 60; i++){ const x = R(0, 768), y = R(0, 768), r = R(40, 150), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rand() < 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(150,200,226,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      g.lineCap = 'round';
      for (let i = 0; i < 46; i++){                                                          // 裂纹：折线，偶尔分叉
        let x = R(0, 768), y = R(0, 768), a = R(0, 6.28); g.strokeStyle = `rgba(110,160,195,${R(0.35, 0.8).toFixed(2)})`; g.lineWidth = R(0.8, 2.2);
        g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 9; s++){ a += R(-0.5, 0.5); x += Math.cos(a) * R(18, 46); y += Math.sin(a) * R(18, 46); g.lineTo(x, y); }
        g.stroke();
      }
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const geo = F.flatGeo(lake, iceY);                                                            // 贴着湖水位的椭圆平面；换成钟罩或球也不会露角
      const ice = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, color: '#d2e9f5', roughness: 0.55, transparent: true, opacity: 0.82 }));   // 粗糙度不能低：平面太光，逆光时会整面反白，裂纹就看不见了
      ice.receiveShadow = true; ice.renderOrder = 2; F.root.add(ice);
      const drifts = []; for (let i = 0; i < 11; i++){ const a = R(0, 6.28), r = Math.sqrt(rand()) * 0.86; drifts.push([lake.x + Math.cos(a) * r * lake.rx, lake.z + Math.sin(a) * r * lake.rz, R(0.04, 0.1)]); }
      F.instances(new THREE.IcosahedronGeometry(1, 2), clay('#f3f7fb', { roughness: 0.95 }), drifts, (o, [x, z, s]) => { o.position.set(x, iceY - s * 0.02, z); o.scale.set(s * R(1, 1.8), s * 0.12, s * R(0.8, 1.3)); o.rotation.y = R(0, 3); }, { cast: false });   // 冰面上的雪堆
    }
    /* ---------- 三、植被：挂雪的云杉（主体，新做）、雪里露头的枯草、压雪的石头 ---------- */
    const cone = (r, h, y) => { const g = new THREE.ConeGeometry(r, h, 9).translate(0, y, 0); g.deleteAttribute('uv'); return g; };
    const tiers = [[0.3, 0.36, 0.3], [0.245, 0.34, 0.5], [0.185, 0.32, 0.7], [0.12, 0.3, 0.9]];                  // [半径, 高, 中心高度]：四层窄塔
    const spruce = F.mergeGeometries(tiers.map(([r, h, y]) => cone(r, h, y)));
    const spruceSnow = F.mergeGeometries(tiers.map(([r, h, y]) => cone(r * 0.9, h * 0.6, y + h * 0.24)));       // 每层上半截压着雪
    const spruceTrunk = new THREE.CylinderGeometry(0.04, 0.06, 0.34, 6).translate(0, 0.17, 0);
    const woods = (x, z) => {                                                                                     // 林子长在哪：前左雪丘、主峰脚下、岩阶上、石屋背后
      let f = fbm(x * 0.5 + 21, z * 0.5 - 9, 3) + 0.55 * gs(x + 3.7, z - 3.0, 1.5) + 0.4 * gs(x + 3.2, z + 0.2, 1.4) + 0.4 * gs(x - 3.6, z + 2.2, 1.3) + 0.35 * gs(x - 4.4, z - 2.6, 1.0) + 0.3 * gs(x + 0.6, z - 4.3, 1.0);
      f -= 0.9 * gs(x + 1.7, z - 1.9, 1.5) + 0.8 * gs(x - HUT.x, z - HUT.z, 0.8) + 0.7 * gs(x - 2.9, z - 0.3, 0.6);   // 给牦牛、石屋、经幡留出空地
      return smooth(0.05, 0.4, f);
    };
    const YC = { x: -1.75, z: 1.95, rx: 1.25, rz: 0.72 };                                                        // 牦牛绕行的椭圆；树要让开这条路
    const onYakPath = (x, z) => Math.abs(Math.hypot((x - YC.x) / YC.rx, (z - YC.z) / YC.rz) - 1) < 0.3;
    const trees = F.scatter({ max: 430, tries: 26000, accept: (x, z, h) => h < 3.0 && !onYakPath(x, z) && T.slopeAt(x, z) < 0.46 && T.isDry(x, z, 0.06) && T.lakeDist(x, z) > 1.25 && glacier(x, z).m < 0.05 && rand() < woods(x, z) * (1 - smooth(2.2, 3.0, h) * 0.7) })
      .map(([x, z, h]) => [x, z, h, R(0.3, 0.52), R(0.95, 1.3), R(0, 6.28), R(-0.05, 0.05), R(-0.05, 0.05)]);
    const setTree = (o, [x, z, h, s, sy, ry, tx, tz]) => { o.position.set(x, G + h - 0.02, z); o.rotation.set(tx, ry, tz); o.scale.set(s, s * sy, s); };
    const GREENS = ['#2c4a44', '#27413d', '#35554a', '#223a38'].map(C);
    F.instances(spruce, F.wind(new THREE.MeshStandardMaterial({ roughness: 0.85 }), 0.03, 1.2), trees, (o, it) => { setTree(o, it); return pick(GREENS).clone().multiplyScalar(R(0.9, 1.15)); });
    F.instances(spruceSnow, F.wind(new THREE.MeshStandardMaterial({ color: '#f4f7fb', roughness: 0.95 }), 0.03, 1.2), trees, setTree);
    F.instances(spruceTrunk, clay('#4a372c', { roughness: 0.9 }), trees, setTree);

    kit.grass({ max: 1500, size: [0.035, 0.06], accept: (x, z, h) => h < 1.6 && T.slopeAt(x, z) < 0.3 && T.isDry(x, z, 0.03) && n2(x * 1.2 + 9, z * 1.2) > 0.25, color: () => C('#b8a67a').lerp(C('#8f8466'), rand()) });   // 枯草，只在几处露头

    const rocks = [];
    for (let i = 0; i < 40; i++){ const k = Math.floor(R(20, stream.kLake - 10)), p = stream.pts[k], side = rand() < 0.5 ? 1 : -1, off = stream.wid[k] * R(1.4, 2.6) * side; rocks.push([p.x + off, p.z + R(-0.05, 0.05), R(0.03, 0.07)]); }
    for (let i = 0; i < 4000 && rocks.length < 150; i++){ const x = R(-4.8, 4.8), z = R(-4.8, 4.8), sl = T.slopeAt(x, z); if (!F.inFoot(x, z, 0.2)) continue; if (sl > 0.3 && sl < 0.6 && rand() < 0.45) rocks.push([x, z, R(0.05, 0.13)]); else if (rand() < 0.012 && T.isDry(x, z)) rocks.push([x, z, R(0.03, 0.07)]); }
    kit.rocks(rocks, ['#5f6773', '#737c89', '#4d545f', '#858e9b']);
    F.instances(new THREE.IcosahedronGeometry(1, 1), clay('#f3f7fb', { roughness: 0.95 }), rocks, (o, [x, z, s]) => { o.position.set(x, T.getY(x, z) + s * 0.3, z); o.scale.set(s * 1.05, s * 0.4, s * 1.0); }, { cast: false });   // 每块石头顶上一坨雪

    /* ---------- 四、冰瀑：冻溪越过岩阶的地方，从崖沿到崖脚挂一幅冰柱 ---------- */
    {
      // fallTop / fallBase 是“开始变陡”和“重新变缓”的位置，离崖面各有一段；这里沿溪线找水位降到九成和一成的两点，正好是崖沿和崖脚
      const hi = stream.fallTop.y - G, lo = stream.fallBase.y - G; let kA = 0, kB = stream.PS - 1;
      for (let k = 0; k < stream.PS; k++){ if (stream.level[k] > lo + (hi - lo) * 0.9) kA = k; }
      for (let k = kA; k < stream.PS; k++){ if (stream.level[k] < lo + (hi - lo) * 0.06){ kB = k; break; } }
      const top = new THREE.Vector3(stream.pts[kA].x, G + stream.level[kA] + 0.04, stream.pts[kA].z), bot = new THREE.Vector3(stream.pts[kB].x, G + stream.level[kB] - 0.02, stream.pts[kB].z);
      const dir = new THREE.Vector3().subVectors(bot, top), len = dir.length(); dir.normalize();
      const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize(), side = new THREE.Vector3(-flat.z, 0, flat.x);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());      // 圆柱的轴从崖脚指向崖沿
      const cols = []; for (let i = 0; i < 46; i++) cols.push([R(-0.32, 0.32), i < 16 ? R(0.022, 0.05) : R(0.008, 0.022), i < 16 ? R(0.86, 1.05) : R(0.12, 0.6), R(-0.05, 0.03)]);   // [横向偏移, 粗细, 长度比例, 起点高低]：十几根粗的垂到底，其余是崖沿上长短不一的冰凌
      const iceMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25, transparent: true, opacity: 0.9, emissive: '#3f7da0', emissiveIntensity: 0.2 });
      const ICE = [C('#e4f3fb'), C('#a8d5ec'), C('#c6e6f5')];
      F.instances(new THREE.CylinderGeometry(1, 0.3, 1, 6).translate(0, -0.5, 0), iceMat, cols, (o, [u, r, f, dy]) => {
        o.position.copy(top).addScaledVector(side, u).addScaledVector(flat, 0.02 + (1 - Math.abs(u) / 0.32) * 0.06 + R(-0.015, 0.015));  // 中间往外鼓一点，前后错开
        o.position.y += dy; o.quaternion.copy(q); o.scale.set(r, len * f, r); return pick(ICE);
      });
      const lip = new THREE.Mesh(F.blob([[0.1, 0, 0, 0], [0.09, 0.16, -0.01, 0], [0.09, -0.16, -0.01, 0], [0.07, 0.3, -0.02, 0], [0.07, -0.3, -0.02, 0]]), clay('#f3f7fb', { roughness: 0.95 }));   // 崖沿上的雪檐，盖住冰柱的上端
      lip.scale.set(1, 0.42, 0.7); lip.rotation.y = Math.atan2(-side.z, side.x); lip.position.copy(top).addScaledVector(flat, -0.01); lip.position.y += 0.035; F.root.add(lip);
      const pile = new THREE.Mesh(F.blob([[0.12, 0, 0, 0], [0.09, 0.12, -0.01, 0.03], [0.09, -0.12, -0.01, 0.02]]), iceMat); pile.scale.y = 0.4; pile.position.copy(bot).addScaledVector(flat, 0.04); F.root.add(pile);   // 崖脚的冰堆
    }

    /* ---------- 五、人迹：压雪的石屋、经幡、玛尼堆 ---------- */
    const hutY = T.getY(HUT.x, HUT.z), hutAng = Math.atan2(-(lake.z - HUT.z), lake.x - HUT.x), hc = Math.cos(hutAng), hs = Math.sin(hutAng);
    const HS = 1.3;                                                                                                // 石屋整体放大一档，远看才认得出
    const hutPoint = (lx, ly, lz) => new THREE.Vector3(HUT.x + (lx * hc + lz * hs) * HS, hutY + ly * HS, HUT.z + (-lx * hs + lz * hc) * HS);   // 石屋本地坐标 → 世界坐标
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, emissive: 0xffa94d, emissiveIntensity: 0.25, roughness: 0.4 });
    const hutLight = new THREE.PointLight(0xffa550, 0, 1.8, 2);
    {
      const g = new THREE.Group(), snow = clay('#f4f7fb', { roughness: 0.95 });
      const walls = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.26), clay('#8d8882')); walls.position.y = 0.065; g.add(walls);
      for (let i = 0; i < 14; i++){ const st = new THREE.Mesh(new THREE.BoxGeometry(R(0.03, 0.05), R(0.015, 0.025), 0.006), clay(pick(['#77726c', '#9c9790', '#6b6661']))); const sd = rand() < 0.5 ? 1 : -1; st.position.set(0.1005 * sd, R(0.015, 0.115), R(-0.11, 0.11)); st.rotation.y = Math.PI / 2; g.add(st); }   // 石墙的砌块
      const tri = (w, h) => { const sh = new THREE.Shape(); sh.moveTo(-w, 0); sh.lineTo(w, 0); sh.lineTo(0, h); sh.closePath(); return sh; };
      const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(tri(0.125, 0.1), { depth: 0.3, bevelEnabled: false }).translate(0, 0, -0.15), clay('#4b3a32')); roof.position.y = 0.13; g.add(roof);
      const roofSnow = new THREE.Mesh(new THREE.ExtrudeGeometry(tri(0.135, 0.108), { depth: 0.315, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }).translate(0, 0, -0.1575), snow); roofSnow.position.y = 0.152; g.add(roofSnow);   // 屋顶上厚厚一层雪
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), clay('#7c7772')); chim.position.set(-0.04, 0.24, -0.07); g.add(chim);
      const chimSnow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.05), snow); chimSnow.position.set(-0.04, 0.304, -0.07); g.add(chimSnow);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.045), windowMat); win.position.set(0.1012, 0.075, 0.06); win.rotation.y = Math.PI / 2; g.add(win);
      const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.045), windowMat); win2.position.set(0.02, 0.075, 0.1312); g.add(win2);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.085, 0.05), clay('#8a2f2a')); door.position.set(0.101, 0.0425, -0.055); g.add(door);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.1), snow); sill.position.set(0.13, 0.004, -0.055); g.add(sill);
      for (let i = 0; i < 6; i++){ const l = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.07, 6), clay('#7a5236')); l.rotation.x = Math.PI / 2; l.position.set(-0.115 - (i % 2) * 0.004, 0.01 + Math.floor(i / 3) * 0.017, 0.02 + (i % 3) * 0.02); g.add(l); }   // 柴垛
      const woodSnow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.07), snow); woodSnow.position.set(-0.117, 0.046, 0.04); g.add(woodSnow);
      hutLight.position.set(0.2, 0.1, 0.07); g.add(hutLight);
      g.position.set(HUT.x, hutY, HUT.z); g.rotation.y = hutAng; g.scale.setScalar(HS); F.root.add(F.shadowAll(g));
    }
    F.onLight(L => { const on = clamp(L.night * 1.4 + smooth(16.2, 18.4, L.hour) * 0.6, 0, 1); windowMat.emissiveIntensity = 0.25 + on * 3.4; hutLight.intensity = on * 0.6; });   // 下雪天黑得早：傍晚就点灯

    const cairn = (x, z, n, s) => {                                                                               // 玛尼堆：一摞扁石头，顶上有雪
      const g = new THREE.Group(); let y = 0;
      for (let i = 0; i < n; i++){ const r = s * (1 - i / n * 0.6), st = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), clay(pick(['#6c7480', '#858d99', '#5a616c']))); st.scale.set(R(1, 1.3), 0.5, R(0.9, 1.2)); st.rotation.y = R(0, 3); y += r * 0.42; st.position.y = y; y += r * 0.3; g.add(st); }
      const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(s * 0.45, 1), clay('#f4f7fb', { roughness: 0.95 })); cap.scale.y = 0.5; cap.position.y = y + s * 0.06; g.add(cap);
      F.place(g, x, z, -0.01); F.root.add(F.shadowAll(g)); return new THREE.Vector3(x, T.getY(x, z) + y + s * 0.1, z);
    };
    {
      const [px, pz] = F.findSpot(2.95, 0.25, 0.12), py = T.getY(px, pz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.5, 6), clay('#5a4334')); pole.position.set(px, py + 0.25, pz); pole.castShadow = true; F.root.add(pole);
      cairn(px + 0.05, pz + 0.04, 4, 0.05);
      const A = new THREE.Vector3(px, py + 0.49, pz);
      const ends = [hutPoint(0, 0.26, 0.15), cairn(...F.findSpot(3.25, 1.5, 0.12), 6, 0.075), cairn(...F.findSpot(2.3, 0.95, 0.1), 5, 0.06), new THREE.Vector3(px - 0.5, T.getY(px - 0.5, pz - 0.45) + 0.03, pz - 0.45)];
      const FLAG = ['#2f6fd0', '#f4f4f0', '#d23a34', '#2f9a52', '#f0c22e'].map(C), flags = [], linePts = [];
      for (const B of ends){
        const len = A.distanceTo(B), n = Math.floor(len / 0.052), yaw = Math.atan2(-(B.z - A.z), B.x - A.x);
        for (let i = 0; i <= 24; i++){ const t = i / 24, p = A.clone().lerp(B, t); p.y -= len * 0.1 * 4 * t * (1 - t); if (i > 0) linePts.push(linePts[linePts.length - 1].clone(), p); else linePts.push(p); }
        linePts.pop();                                                                                               // 每条绳是成对的线段
        for (let i = 1; i < n; i++){ const t = i / n, p = A.clone().lerp(B, t); p.y -= len * 0.1 * 4 * t * (1 - t); flags.push([p, yaw, i]); }
      }
      const segs = []; for (let i = 0; i + 1 < linePts.length; i += 2) segs.push(linePts[i], linePts[i + 1]);
      F.root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), new THREE.LineBasicMaterial({ color: 0x3a3230 })));
      const flagGeo = new THREE.PlaneGeometry(1, 1, 1, 3).translate(0, 0.5, 0);                                    // 底在 y=0，实例绕 z 翻 180° 后朝下挂，风只吹动下摆
      F.instances(flagGeo, F.wind(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), 0.45, 3.2), flags, (o, [p, yaw, i]) => {
        o.position.copy(p); o.rotation.set(0, yaw, Math.PI); o.scale.set(0.04, 0.046, 0.04); return FLAG[i % 5];
      }, { receive: false });
    }

    /* ---------- 六、生灵 ---------- */
    // 牦牛（主角）：深色毛团身体、拖地的长毛、弯角、背上落着雪
    const yakGeo = {
      body: F.blob([[0.05, 0, 0.078, 0], [0.047, 0.04, 0.09, 0], [0.042, -0.045, 0.072, 0]]),
      skirt: F.blob([[0.046, 0, 0.04, 0], [0.042, 0.04, 0.042, 0], [0.04, -0.042, 0.038, 0]]),
      snow: F.blob([[0.03, 0.03, 0.128, 0], [0.026, -0.01, 0.118, 0], [0.02, -0.05, 0.104, 0]]),
    };
    function makeYak(scale){
      const g = new THREE.Group(), fur = clay(pick(['#3a2c24', '#2f2520', '#44332a']), { roughness: 0.95 }), dark = clay('#221a16', { roughness: 0.95 });
      const body = new THREE.Mesh(yakGeo.body, fur); body.scale.z = 0.78; g.add(body);
      const skirt = new THREE.Mesh(yakGeo.skirt, dark); skirt.scale.set(1.02, 0.8, 0.86); g.add(skirt);
      const back = new THREE.Mesh(yakGeo.snow, clay('#f4f7fb', { roughness: 0.95 })); back.scale.set(1.05, 0.5, 0.66); back.position.y = 0.088; g.add(back);   // 背上的雪要高出毛团才看得见
      for (const [lx, lz] of [[0.045, 0.02], [0.045, -0.02], [-0.05, 0.02], [-0.05, -0.02]]){ const l = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.008, 0.04, 6), dark); l.position.set(lx, 0.02, lz); g.add(l); }
      const pivot = new THREE.Group(); pivot.position.set(0.075, 0.075, 0); g.add(pivot);                         // 脖子根：转它就是点头
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.027, 12, 10), fur); head.scale.set(1.15, 1, 0.9); head.position.set(0.02, -0.012, 0); pivot.add(head);
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), clay('#6b5a4c')); snout.position.set(0.046, -0.024, 0); pivot.add(snout);
      for (const sd of [-1, 1]){
        const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.008, 0.04, 6), clay('#efe4c8')); h1.position.set(0.016, 0.012, sd * 0.032); h1.rotation.x = sd * 1.25; pivot.add(h1);
        const h2 = new THREE.Mesh(new THREE.ConeGeometry(0.0055, 0.04, 6), clay('#efe4c8')); h2.position.set(0.018, 0.034, sd * 0.05); h2.rotation.x = sd * 0.25; pivot.add(h2);   // 角先向外再向上
      }
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), dark); tail.scale.set(0.7, 1.6, 0.7); tail.position.set(-0.092, 0.05, 0); g.add(tail);
      g.scale.setScalar(scale); g.userData.pivot = pivot;
      return F.shadowAll(g);
    }
    [1.45, 1.38, 1.5, 0.9, 1.42, 1.3].forEach((sc, i) => {                                                     // 第四头是小牛
      const yak = makeYak(sc), ph = R(0, 10); F.root.add(yak);
      F.life(t => {
        const a = 0.6 - i * 0.46 + t * 0.03, x = YC.x + Math.cos(a) * YC.rx + Math.sin(a * 3 + i) * 0.05, z = YC.z + Math.sin(a) * YC.rz;
        yak.position.set(x, T.getY(x, z) - 0.008 + Math.abs(Math.sin(t * 2.0 + ph)) * 0.004, z);                  // 腿陷在雪里一点，走起来身子一沉一沉
        yak.rotation.y = Math.atan2(-Math.cos(a) * YC.rz, -Math.sin(a) * YC.rx);
        yak.userData.pivot.rotation.z = -0.25 + Math.sin(t * 0.5 + ph) * 0.18;
      });
    });
    // 赤狐：在冰面上小跑，跑一段停下来张望
    {
      const g = new THREE.Group(), fur = clay('#d9702c'), white = clay('#f6f1e8'), dark = clay('#2e221c');
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.042, 4, 8), fur); body.rotation.z = Math.PI / 2; body.position.y = 0.03; g.add(body);
      for (const [lx, lz] of [[0.02, 0.008], [0.02, -0.008], [-0.02, 0.008], [-0.02, -0.008]]){ const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.003, 0.022, 5), dark); l.position.set(lx, 0.011, lz); g.add(l); }
      const head = new THREE.Group(); head.position.set(0.036, 0.04, 0); g.add(head);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), fur); head.add(skull);
      const snout = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.02, 6), white); snout.rotation.z = -Math.PI / 2; snout.position.set(0.016, -0.004, 0); head.add(snout);
      for (const sd of [-1, 1]){ const ear = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.014, 4), dark); ear.position.set(-0.002, 0.014, sd * 0.007); head.add(ear); }
      const tail = new THREE.Group(); tail.position.set(-0.03, 0.032, 0); g.add(tail);
      const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.03, 4, 8), fur); t1.rotation.z = Math.PI / 2 - 0.35; t1.position.set(-0.02, 0.006, 0); tail.add(t1);
      const t2m = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), white); t2m.position.set(-0.042, 0.014, 0); tail.add(t2m);
      g.scale.setScalar(1.25); F.root.add(F.shadowAll(g));
      F.life(t => {
        const cyc = t * 0.07, k = Math.floor(cyc), f = cyc - k, run = smooth(0, 0.7, f), a = (k + run) * 0.9 + 0.4, moving = f < 0.7;
        const x = lake.x + Math.cos(a) * lake.rx * 0.62, z = lake.z + Math.sin(a) * lake.rz * 0.6;
        g.position.set(x, iceY + (moving ? Math.abs(Math.sin(t * 9)) * 0.006 : 0), z);
        g.rotation.y = Math.atan2(-Math.cos(a) * lake.rz, -Math.sin(a) * lake.rx);
        head.rotation.y = moving ? 0 : Math.sin(t * 0.8) * 0.9; tail.rotation.y = Math.sin(t * (moving ? 6 : 1.5)) * 0.3;
      });
    }
    kit.birds(6, { center: [-0.6, -1.4], r: [1.2, 2.4], y: [1.6, 2.7], colors: ['#23252b', '#2e3038', '#1c1d22'] });   // 寒鸦

    /* ---------- 七、一奇：冰下的灯。入夜后，冻住的湖面底下有发光的鱼在游 ---------- */
    {
      const fishMat = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffae4a', emissiveIntensity: 0, roughness: 0.5 });
      const fishGeo = F.mergeGeometries([F.blob([[0.03, 0.012, 0, 0], [0.024, -0.02, 0, 0]]), (() => { const g = new THREE.ConeGeometry(0.022, 0.04, 6).toNonIndexed().rotateZ(-Math.PI / 2).translate(-0.058, 0, 0); g.deleteAttribute('uv'); return g; })()]);   // blob 没有索引，圆锥要先去掉索引才能合并
      const cv = document.createElement('canvas'); cv.width = cv.height = 128; const cg = cv.getContext('2d'), gr = cg.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,200,130,1)'); gr.addColorStop(0.35, 'rgba(255,170,90,0.45)'); gr.addColorStop(1, 'rgba(255,150,70,0)'); cg.fillStyle = gr; cg.fillRect(0, 0, 128, 128);
      const glowTex = new THREE.CanvasTexture(cv); glowTex.colorSpace = THREE.SRGBColorSpace;
      const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const fishLight = new THREE.PointLight(0xffa048, 0, 1.5, 2); F.root.add(fishLight);
      const school = [[1, 0], [0.55, 0.5], [0.45, 0.95]].map(([sc, lag]) => {                                      // 一尾大的带两尾小的
        const fish = new THREE.Mesh(fishGeo, fishMat); fish.scale.set(sc, sc * 0.55, sc * 0.5); F.root.add(fish);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * sc, 0.5 * sc).rotateX(-Math.PI / 2), glowMat); glow.renderOrder = 3; F.root.add(glow);
        return { fish, glow, lag };
      });
      let night = 0; F.onLight(L => { night = L.night; fishMat.emissiveIntensity = night * 4.5; glowMat.opacity = night * 0.4; fishLight.intensity = night * 0.45; });
      F.life(t => {
        for (const s of school){
          const a = t * 0.11 - s.lag, x = lake.x + Math.sin(a) * lake.rx * 0.56, z = lake.z + Math.sin(a * 2) * lake.rz * 0.36;      // 八字
          const vx = Math.cos(a) * lake.rx * 0.56, vz = 2 * Math.cos(a * 2) * lake.rz * 0.36;
          s.fish.visible = s.glow.visible = night > 0.02;
          s.fish.position.set(x, iceY - 0.045, z); s.fish.rotation.y = Math.atan2(-vz, vx) + Math.sin(t * 3 + s.lag * 5) * 0.2;
          s.glow.position.set(x, iceY + 0.004, z);
        }
        fishLight.position.set(school[0].fish.position.x, iceY + 0.1, school[0].fish.position.z);
      });
    }

    /* ---------- 八、落雪（引擎里没有降水，自己做）：慢、细、斜着飘，落到地面以下就消失 ---------- */
    const snowU = { uTime: F.U.time, uHeight: F.surfU, uPx: { value: 1000 }, uCol: { value: new THREE.Color(1, 1, 1) } };
    {
      const NUM = 3000, P = [], seed = [], size = [];
      for (let i = 0; i < NUM; i++){ P.push(R(-4.9, 4.9), R(0, 8.4), R(-4.9, 4.9)); seed.push(rand()); size.push(R(0.026, 0.058)); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
      g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
      const snow = new THREE.Points(g, new THREE.ShaderMaterial({
        uniforms: snowU, transparent: true, depthWrite: false,
        vertexShader: `
          attribute float aSeed, aSize; uniform float uTime, uPx; varying float vA;
          ${F.GLSL_HEIGHT}
          ${F.glslInside()}
          void main(){
            vec3 p = position; float t = uTime;
            p.y = 4.9 - mod(position.y + t * (0.28 + aSeed * 0.3), 8.4);                                           // 从顶上落到 -3.5，再回到顶上
            p.x = mod(position.x + 4.9 + t * 0.09 + sin(t * 0.5 + aSeed * 40.0) * 0.14, 9.8) - 4.9;               // 一点横风，加左右飘
            p.z += cos(t * 0.4 + aSeed * 27.0) * 0.14;
            float ground = terrainY(p.xz);
            vA = smoothstep(ground, ground + 0.1, p.y) * insideC(p);                                            // insideC：不管容器是方是圆，雪只在玻璃里面下
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = max(aSize * uPx / -mv.z, 1.3);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform vec3 uCol; varying float vA;
          void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0 || vA < 0.01) discard; gl_FragColor = vec4(uCol, smoothstep(1.0, 0.25, r) * 0.9 * vA); }`,
      }));
      snow.frustumCulled = false; snow.renderOrder = 6; F.root.add(snow);
    }
    F.onLight(L => { snowU.uCol.value.copy(L.sky).multiplyScalar(L.hi * 0.75).add(new THREE.Color().copy(L.key).multiplyScalar(L.ki * 0.22)); });   // 雪花的亮度跟着天光走
    F.life(() => { snowU.uPx.value = innerHeight * Math.min(window.devicePixelRatio || 1, 1.5) / (2 * Math.tan(THREE.MathUtils.degToRad(F.camera.fov / 2))); });

    /* ---------- 九、云、雪雾、炊烟 ---------- */
    F.clouds({ count: 9, y: [2.7, 3.9], r: [0.9, 3.3], scale: [1.4, 2.1] });                                      // 云多而低，压着山头
    kit.mistLayer({ count: 55, accept: (x, z, h) => h < 1.3 && T.isDry(x, z, 0) && T.lakeDist(x, z) > 1.4, size: [1.0, 1.9], alpha: [0.08, 0.17] });   // 雪原上的雪雾
    kit.mistLayer({ count: 40, accept: (x, z, h) => h > 1.8 && h < 4.2, lift: [0.2, 0.6], size: [0.9, 1.6], alpha: [0.1, 0.2] });                       // 山腰的云气
    const peakY = T.getY(PEAK.x, PEAK.z);
    for (let i = 0; i < 9; i++) F.mist(PEAK.x + 0.25 + i * 0.16 + R(-0.05, 0.05), peakY - 0.1 + R(-0.12, 0.1) - i * 0.015, PEAK.z + R(-0.12, 0.12), 0.5 + i * 0.09, 0.26 - i * 0.02);   // 峰顶的旗云
    const chimney = hutPoint(-0.04, 0.32, -0.07);
    kit.plume(chimney, { count: 14, spread: [0, 0], size: [0.11, 0.22], alpha: [0.32, 0.48], rise: [0.5, 0.75], tint: 1 });   // 炊烟
  },
};
