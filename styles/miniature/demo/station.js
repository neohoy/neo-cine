// 一座虚构的、典型的中国高铁站（示意站）：场景描述。
// 不对应任何真实车站：没有站名，没有运营方标志；布局是常见的"线侧站房 + 天桥进站 + 地道出站"的示意，
// 比例经过压缩（站房、站台、列车都比真的短），只为讲清楚旅客从进站到上车的一路。
// 这份数据交给 kit/scene.js 的 buildMiniature() 搭出来。坐标：1 单位 ≈ 1 米；x 沿铁路（右 = +x），z 朝观众（前 = +z），y 向上。
//   前 → 后：前缘绿化 z 21–22 · 道路 14.8–21 · 路缘 · 站前广场 9–14.4 · 站房 −3–9 · 1 道 −5.8 · 岛式站台 −14.4…−8 · 2 道 −16.6 · 后缘绿化
//   地下：出站地道在右端（x 28–34），被右侧切面（x = 34）切开，看得见里面。
import { PALETTE as C } from './kit/materials.js';
const PI = Math.PI;
const Y = .15;                                    // 地坪（广场、站房地面）的高度
const PF = 1.1;                                   // 站台面高度
const DECK = 6.6;                                 // 天桥和夹层的楼面高度
const H = 9;                                      // 站房墙高（屋顶底）

export const LAYOUT = { Y, PF, DECK, H, track1: -5.8, track2: -16.6 };

export default {
  seed: 20261114,
  storey: 6,
  maxPeople: 200,
  // 讲解用的时间点（秒）：天黑亮灯等；其余时间都挂在人和车的动作上（'@hero.sit' 这种写法）
  marks: { lift: 3.2, open: 6.4, close: 60.1, lights: 63.1, exitStep: 54.5 },

  board: {
    x: [-34, 34], z: [-24, 22], top: 0, soil: 6,
    plinth: { h: .7, margin: 1.2, plate: { text: null, w: 10 } },
    voids: [
      { x: [28, 34.5], y: [-4.4, -.6], z: [-12.6, -1.2] },        // 出站地道
      { x: [21.8, 30.2], y: [-4.4, .5], z: [-12.3, -10.3] },       // 站台下到地道的楼梯井
      { x: [30.6, 33.4], y: [-4.4, .5], z: [-2.4, 4.3] },          // 地道上到出站厅的楼梯井
    ],
  },

  // 可抬升的组：屋顶、天桥顶、站台雨棚、进站雨棚一起抬起，露出里面；讲完合拢
  // 先抬起一点（全景里看得见屋顶悬在上面），推近时再升出画面；讲完一次落回
  groups: { roof: { lift: { dy: 36, keys: [['@lift', 0], ['@lift+2.6', .16], ['@open', .16], ['@open+1.8', 1], ['@close', 1], ['@close+3.0', 0]] } } },

  // 会亮的批次（夜里一批批点亮）；board 是候车大屏，白天也亮
  glow: {
    hall: { color: '#ffe0b0', base: '#f4f1e8', max: 2.8, on: '@lights' },
    facade: { color: '#ffd9a4', base: '#cfdde0', glass: true, opacity: .16, max: 1.1, on: '@lights' },
    lamps: { color: '#ffd59a', base: '#f4f1e8', max: 3, on: '@lights+.3' },
    overpass: { color: '#ffe6c2', base: '#f4f1e8', max: 2, on: '@lights+.55' },
    platform: { color: '#fff0d6', base: '#f4f1e8', max: 2.2, on: '@lights+.8' },
    passage: { color: '#ffe8c8', base: '#f4f1e8', max: 2, on: '@lights+1.05' },
    trains: { color: '#ffefcf', base: '#4c5a63', max: 1.6, on: '@lights+1.3' },
    screen: { color: '#8fc7d6', base: '#22333a', max: 1.4, day: .9, on: -1 },
    screenHi: { color: '#e9c35a', base: '#22333a', max: 1.6, day: 1.1, on: -1 },
  },

  build: [
    // —— 地面 ——
    { type: 'box', box: { x: [-34, 34], y: [0, .05], z: [14.8, 21.2] }, color: C.road, r: 0 },
    ...[-30, -24, -18, -12, -6, 0, 6, 12, 18, 24, 30].map(x => ({ type: 'box', box: { x: [x, x + 3], y: [.05, .06], z: [17.95, 18.1] }, color: '#f4f2ea', r: 0 })),
    { type: 'box', box: { x: [-34, 34], y: [0, .2], z: [14.4, 14.8] }, color: C.curb, r: .03 },
    { type: 'box', box: { x: [-34, 34], y: [0, .2], z: [21.2, 22] }, color: C.grass, r: .03 },
    { type: 'box', box: { x: [-34, 34], y: [0, Y], z: [9, 14.4] }, color: C.paving, r: .02 },
    { type: 'box', box: { x: [-34, -28], y: [0, Y], z: [-3.6, 9] }, color: C.paving, r: .02 },
    { type: 'slab', x: [-28, 34], z: [-3, 9], y: Y, t: Y, color: C.pale, holes: [{ x: [30.6, 33.4], z: [-2.4, 4.3] }] },
    { type: 'box', box: { x: [-34, 34], y: [0, .12], z: [-4.0, -3] }, color: C.paving, r: .02 },
    { type: 'box', box: { x: [-34, 34], y: [0, .2], z: [-8.0, -7.6] }, color: C.ballast, r: 0 },
    { type: 'box', box: { x: [-34, 34], y: [0, .2], z: [-14.8, -14.4] }, color: C.ballast, r: 0 },
    { type: 'box', box: { x: [-34, 34], y: [0, .12], z: [-24, -18.4] }, color: C.grass, r: .02 },
    { type: 'track', x: [-34, 34], z: -5.8 },
    { type: 'track', x: [-34, 34], z: -16.6 },
    { type: 'platform', x: [-34, 34], z: [-14.4, -8.0], y: PF, holes: [{ x: [21.8, 30.2], z: [-12.3, -10.3] }] },

    // —— 出站地道（地下）——
    { type: 'box', box: { x: [28, 34], y: [-4.7, -4.4], z: [-12.6, -1.2] }, color: C.pale, r: 0 },
    { type: 'box', box: { x: [28, 34], y: [-.9, -.6], z: [-12.6, -1.2] }, color: C.white, r: 0 },
    { type: 'box', box: { x: [27.7, 28], y: [-4.4, -.6], z: [-12.6, -1.2] }, color: C.ivory, r: 0 },
    { type: 'lightPanel', glow: 'passage', box: { x: [30.6, 31.4], y: [-.96, -.9], z: [-11.5, -2.2] } },
    { type: 'stairs', id: 'exitStairs', from: [29.9, -4.4, -11.3], dir: PI, run: 7.9, rise: 4.4 + PF, width: 1.8 },
    { type: 'stairs', id: 'outStairs', from: [32, -4.4, -2.0], dir: PI / 2, run: 6.1, rise: 4.4 + Y, width: 2.4 },
    { type: 'railing', pts: [[21.8, PF, -10.3], [30.2, PF, -10.3], [30.2, PF, -12.3], [21.8, PF, -12.3]], kind: 'glass' },
    { type: 'railing', pts: [[30.6, Y, -2.4], [30.6, Y, 4.3]], kind: 'glass' },
    { type: 'sign', at: [21.0, 3.3, -11.3], rot: PI / 2, icons: ['exit', 'down'], bg: '#3d6b55', post: 2.2 },

    // —— 站房 ——
    // 正面玻璃幕墙：3.2 以下是固定的，以上和屋顶一起抬走（模型的正面是"切开"的，推近时看得进去）
    { type: 'glassWall', glow: 'facade', a: [-28, 9], b: [34, 9], y: [Y, 3.2], bay: 3.1, opacity: .16, openings: [{ at: 3.5, w: 2.6, y: [Y, 2.9] }, { at: 6.75, w: 2.6, y: [Y, 2.9] }, { at: 56.5, w: 2.6, y: [Y, 2.9] }] },
    { type: 'glassWall', group: 'roof', glow: 'facade', a: [-28, 9], b: [34, 9], y: [3.2, H], bay: 3.1, opacity: .16 },
    { type: 'wall', a: [-28, -3], b: [34, -3], y: [0, H], t: .4, openings: [{ at: 38, w: 3, y: [DECK, H + 1] }] },
    { type: 'wall', a: [-28, -3], b: [-28, 9], y: [0, H], t: .4 },
    { type: 'wall', a: [22, -3], b: [22, 9], y: [0, H], t: .3 },
    { type: 'glassWall', a: [-17, -3], b: [-17, 9], y: [Y, 3.2], bay: 2, opacity: .22, openings: [{ at: 3.9, w: 5.6, y: [Y, 3.2] }] },
    { type: 'column', x: -6, z: 3.2, y: [Y, H], s: .6, repeat: null },
    ...[-22.5, -11, 0.5, 15].map(x => ({ type: 'column', x, z: 7.6, y: [Y, H], s: .55 })),
    // 屋顶（会抬起）和吸顶灯带
    { type: 'box', group: 'roof', box: { x: [-28.3, 34], y: [H, H + .55], z: [-3.3, 9.3] }, color: C.white, r: .12 },
    { type: 'box', group: 'roof', box: { x: [-28.3, 34], y: [H + .55, H + .9], z: [8.95, 9.3] }, color: C.ivory, r: .05 },
    ...[1.2, 5.2].map(z => ({ type: 'lightPanel', group: 'roof', glow: 'hall', box: { x: [-26.5, 20.5], y: [H - .08, H], z: [z - .3, z + .3] } })),
    { type: 'lightPanel', group: 'roof', glow: 'hall', box: { x: [23, 33], y: [H - .08, H], z: [2.7, 3.3] } },
    // 进站雨棚
    { type: 'canopy', group: 'roof', x: [-26.5, -16.5], z: [9.2, 13.2], y: 4.6, cols: 0 },
    ...[-26, -17].flatMap(x => [9.6, 12.8].map(z => ({ type: 'column', x, z, y: [Y, 4.6], s: .18, round: true, color: C.silver }))),
    { type: 'sign', group: 'roof', at: [-21.25, 6.2, 9.25], icons: ['train', 'id', 'shield'], h: .9 },

    // 进站：实名验证闸机、安检
    { type: 'gates', id: 'idGates', x0: -27, z: 6.2, y: Y, n: 5, pitch: 1.5, accent: C.teal },
    { type: 'scanner', id: 'xray1', from: [-23.4, Y, 4.6], to: [-23.4, Y, .4] },
    { type: 'scanner', id: 'xray2', from: [-26.9, Y, 4.6], to: [-26.9, Y, .4] },
    { type: 'detector', at: [-21.8, Y, 2.5] },
    { type: 'detector', at: [-25.3, Y, 2.5] },

    // 候车厅：长椅（人面朝 −z，看着检票口）
    ...['A', 'B', 'C'].flatMap((row, i) => [
      { type: 'bench', id: `seats${row}`, at: [-14.8, Y, 2.4 + i * 2.2], rot: PI, seats: 4, repeat: { n: 4, d: [3.0, 0, 0] } },
      { type: 'bench', id: `seats${row}r`, at: [2.4, Y, 2.4 + i * 2.2], rot: PI, seats: 4, repeat: { n: 5, d: [3.0, 0, 0] } },
    ]),
    { type: 'bin', at: [-16.2, Y, 4.6] }, { type: 'bin', at: [0.9, Y, 4.6] }, { type: 'bin', at: [17.8, Y, 4.6] },
    { type: 'board', id: 'screen', at: [-6.5, 4.6, -2.75], w: 5, h: 1.6, rows: 5, glow: 'screen', hi: 'screenHi' },
    { type: 'sign', at: [-6.5, 3.3, -2.7], icons: ['gate', 'train'], h: .55 },
    // 检票口和上天桥的扶梯
    { type: 'gates', id: 'ticketGates', x0: -9.5, z: -.6, y: Y, n: 4, pitch: 1.5, accent: C.amber },
    { type: 'escalator', id: 'esc', from: [-2.5, Y, -2.0], to: [6.9, DECK, -2.0], width: 1.2, speed: 3.4 },
    { type: 'slab', x: [6.9, 12], z: [-3, -.6], y: DECK, t: .5, color: C.pale },
    { type: 'column', x: 7.3, z: -.9, y: [Y, DECK - .5], s: .45 }, { type: 'column', x: 11.7, z: -.9, y: [Y, DECK - .5], s: .45 },
    { type: 'railing', pts: [[6.9, DECK, -.6], [12, DECK, -.6], [12, DECK, -3]], kind: 'glass' },
    { type: 'sign', at: [-1.6, 3.0, -1.0], icons: ['up', 'train'], h: .5 },

    // 出站厅：出站闸机、出口
    { type: 'gates', id: 'exitGates', x0: 25, z: 5.8, y: Y, n: 4, pitch: 1.5, accent: C.green, cabinet: C.bone },
    { type: 'sign', at: [28.0, 3.4, 5.8], icons: ['exit'], bg: '#3d6b55', h: .55 },
    { type: 'sign', group: 'roof', at: [28.5, 4.0, 9.25], icons: ['exit', 'right'], bg: '#3d6b55', h: .8 },

    // —— 天桥 ——
    { type: 'slab', x: [8.5, 11.5], z: [-13.4, -3], y: DECK, t: .55, color: C.pale },
    { type: 'glassWall', a: [11.5, -3], b: [11.5, -13.4], y: [DECK, 9.3], bay: 2.1, opacity: .2 },
    { type: 'glassWall', a: [8.5, -3], b: [8.5, -13.4], y: [DECK, 9.3], bay: 2.1, opacity: .2, openings: [{ at: 9.2, w: 2.2, y: [DECK, 9] }] },
    { type: 'glassWall', a: [8.5, -13.4], b: [11.5, -13.4], y: [DECK, 9.3], bay: 1.5, opacity: .2 },
    { type: 'box', group: 'roof', box: { x: [8.25, 11.75], y: [9.3, 9.6], z: [-13.65, -3] }, color: C.white, r: .08 },
    { type: 'lightPanel', group: 'roof', glow: 'overpass', box: { x: [9.6, 10.4], y: [9.24, 9.3], z: [-13, -3.4] } },
    { type: 'column', x: 10.4, z: -10.0, y: [PF, DECK - .55], s: .6 },
    { type: 'stairs', id: 'bridgeStairs', from: [1.1, PF, -12.2], dir: 0, run: 7.4, rise: DECK - PF, width: 2.0 },
    { type: 'sign', at: [10, DECK + 2.3, -3.6], icons: ['train', 'down'], h: .5 },

    // —— 站台：雨棚（会抬起）、柱、灯带、长椅、牌子 ——
    ...[-30, -21, -12, -4, 14, 20, 32].map(x => ({ type: 'column', x, z: -11.2, y: [PF, 5.2], s: .35, round: true, color: C.silver })),
    { type: 'box', group: 'roof', box: { x: [-34, .4], y: [5.2, 5.45], z: [-14.0, -8.4] }, color: C.white, r: .08 },
    { type: 'box', group: 'roof', box: { x: [12.2, 34], y: [5.2, 5.45], z: [-14.0, -8.4] }, color: C.white, r: .08 },
    ...[[-33.5, -.2], [12.6, 33.6]].flatMap(([a, b]) => [-9.9, -12.5].map(z => ({ type: 'lightPanel', group: 'roof', glow: 'platform', box: { x: [a, b], y: [5.13, 5.2], z: [z - .2, z + .2] } }))),
    { type: 'bench', at: [-17, PF, -11.2], rot: PI / 2, seats: 3 }, { type: 'bench', at: [-26, PF, -11.2], rot: -PI / 2, seats: 3 },
    { type: 'sign', at: [-8, 3.6, -11.2], icons: ['train', 'right'], h: .55, post: 2.0 },
    { type: 'sign', at: [17, 3.6, -11.2], icons: ['exit', 'right'], bg: '#3d6b55', h: .55, post: 2.0 },

    // —— 广场：树池、路灯、长椅 ——
    ...[-30, -12, -4, 4, 12, 20].map((x, i) => ({ type: 'tree', at: [x, Y, 12.2], h: 4.6, size: 1.5, seed: 30 + i })),
    ...[-30, -12, -4, 4, 12, 20].map(x => ({ type: 'box', box: { x: [x - 1.1, x + 1.1], y: [Y, Y + .35], z: [11.1, 13.3] }, color: C.ivory, r: .08 })),
    ...[-26, -8, 0, 8, 16, 26].map(x => ({ type: 'lamp', at: [x, Y, 14.0], h: 4.4, glow: 'lamps', rot: PI / 2, arm: .5 })),
    { type: 'bench', at: [-8, Y, 10.6], rot: 0, seats: 3 }, { type: 'bench', at: [8, Y, 10.6], rot: 0, seats: 3 },
    ...[-31, -22, -13, -4, 5, 14, 23, 31].map((x, i) => ({ type: 'tree', at: [x, .2, 21.6], h: 3.4, size: 1.0, seed: 60 + i })),
    { type: 'shrub', at: [-6, .2, 21.6], w: 4, d: .6, seed: 4 }, { type: 'shrub', at: [10, .2, 21.6], w: 5, d: .6, seed: 5 },
    // 后面：护栏、接触网立柱、树
    { type: 'railing', pts: [[-34, .12, -19.0], [34, .12, -19.0]], kind: 'rail', h: 1.3 },
    ...[-30, -18, -6, 6, 18, 30].map(x => ({ type: 'mast', at: [x, .12, -19.6], h: 6.6, reach: 3.2, rot: -PI / 2 })),
    ...[-32, -25, -19, -13, -7, -1, 5, 11, 17, 23, 29].map((x, i) => ({ type: 'tree', at: [x, .12, -21.8 + (i % 2) * 1.2], h: 5.2, size: 1.6, seed: 90 + i })),
  ],

  // —— 车 ——
  vehicles: [
    // 送旅客来的出租车：匀减速停到路边，下客后开走
    { id: 'taxi', type: 'taxi', color: '#d8c99c', lane: { x: -21.5, z: 16.6, y: 0, dir: 1 }, arrive: [4.8, 7.6], depart: [10.6, 13.8], D: 26, D2: 40 },
    { id: 'bus', type: 'bus', color: C.green, lane: { x: 10, z: 16.6, y: 0, dir: -1 }, arrive: [-20, -10] },
    { type: 'traffic', lane: { z: 19.6, y: 0 }, x0: -34, x1: 34, dir: -1, speed: 7, gap: 26, seed: 4, kinds: ['car', 'car', 'taxi', 'car', 'bus'] },
    // B：另一侧（2 道）到站的车，旅客下车走地道出站
    { id: 'B', type: 'train', cars: 6, stripe: C.blue, glow: 'trains', track: { x: -28, z: -16.6, y: .25, dir: -1 }, arrive: [28.4, 33.4], doors: [34.0, 39.4], depart: [40.0, 45.2], D: 70, D2: 80 },
    // A：旅客要上的车（1 道），从左边切面进站
    { id: 'A', type: 'train', cars: 6, stripe: C.blue, glow: 'trains', track: { x: 30, z: -5.8, y: .25, dir: 1 }, arrive: [42.2, 47.4], doors: [48.0, 51.6], depart: [52.3, 57.3], D: 75, D2: 80 },
  ],

  // —— 主角：一位拖着行李箱的旅客 ——
  people: [
    {
      id: 'hero', seed: 7, look: { shirt: C.coral, pants: '#3a4048', bag: 'suitcase', bagColor: '#e9e4d6', scale: 1.04 },
      at: [-21.2, 0, 15.6], start: '@taxi.stop+.4', show: '@taxi.stop+.4', face: PI,
      plan: [
        { wait: .9, face: PI },                                   // 从后备箱拿箱子
        { walk: [[-21.25, Y, 14.1], [-21.6, Y, 9.6]], mark: 'out', speed: 2.1 },
        { gate: ['idGates', 3, -1], hold: .75, mark: 'idgate', speed: 2.1 },
        { walk: [[-22.6, Y, 4.6]], mark: 'security' },
        { bagOff: 'xray1', dur: 2.1 },
        { walk: [[-21.8, Y, 3.6], [-21.8, Y, 1.4], [-22.5, Y, .7]], speed: 2.1 },
        { wait: .2 }, { bagOn: true, mark: 'cleared' },
        { walk: [[-17, Y, .8], [-13.6, Y, 1.4]], speed: 2.1, mark: 'tohall' },
        { sit: 2.4, seat: ['seatsA.1', 1], mark: 'sit' },
        { gate: ['ticketGates', 1, -1], hold: .6, mark: 'ticket', speed: 2.1 },
        { ride: 'esc', mark: 'esc', speed: 2.1 },
        { walk: [[10, DECK, -2.4], [10, DECK, -12.2]], speed: 2.3, mark: 'bridge' },
        { climb: 'bridgeStairs', down: true, mark: 'down', speed: 1.8 },
        { board: ['A', 5, -1], mark: 'platform', markEnd: 'boarded', y: PF },
      ],
    },
  ],

  crowds: [
    // 候车厅里坐着的人
    { kind: 'seated', seats: 'seats', fill: .42, seed: 12, skip: [['seatsA.1', 1]] },
    // 工作人员（站着不动）：安检、检票、出站
    { kind: 'stand', seed: 21, at: [[-20.5, Y, 2.5, -PI / 2], [-24.1, Y, 1.4, 0], [-10.6, Y, -1.8, 0], [24.2, Y, 7.4, PI], [-9.2, PF, -9.2, PI]], look: { shirt: '#3c4a5c', pants: '#2e3338', bag: 'none' } },
    // 候车厅里站着、走动的人
    { kind: 'stand', seed: 22, at: [[-2, Y, 5.6, PI], [12.5, Y, 1.0, -PI / 2], [18, Y, 7.0, PI], [-15.6, Y, 7.6, PI / 2]] },
    // 进站的人：几位在主角前后过闸机、安检，然后去候车
    { kind: 'plans', seed: 3, people: [
      { at: [-24.6, Y, 13.0], start: 7.2, face: PI, plan: [{ walk: [[-24.4, Y, 9.6]] }, { gate: ['idGates', 1, -1], hold: .8 }, { walk: [[-25.3, Y, 3.8], [-25.3, Y, 1.2], [-19, Y, -.6], [-1.5, Y, .9]] }, { wait: 99, face: PI }] },
      { at: [-27, Y, 12.0], start: 9.0, face: PI, plan: [{ walk: [[-24.4, Y, 9.6]] }, { gate: ['idGates', 2, -1], hold: .9 }, { walk: [[-25.3, Y, 3.8], [-25.3, Y, 1.0], [-19, Y, -1.0], [14.6, Y, 7.8]] }, { wait: 99, face: PI }] },
      { at: [-30, Y, 12.6], start: 12.2, face: PI, plan: [{ walk: [[-24.4, Y, 9.6]] }, { gate: ['idGates', 1, -1], hold: .8 }, { walk: [[-25.3, Y, 3.8], [-25.3, Y, 1.2], [-18, Y, 1.0], [-6.4, Y, .9]] }, { wait: 99, face: PI }] },
      { at: [-32, Y, 11.0], start: 15.0, face: PI, look: { bag: 'backpack' }, plan: [{ walk: [[-21.0, Y, 9.6]] }, { gate: ['idGates', 4, -1], hold: .9 }, { walk: [[-21.0, Y, 3.6], [-21.0, Y, 1.0], [-17, Y, -1.4], [-12, Y, -1.4]] }, { wait: 99, face: PI }] },
    ] },
    // 和主角同一趟车的人：先他一步检票、上扶梯、过天桥、下站台
    { kind: 'plans', seed: 4, people: [0, 1, 2].map(i => ({
      at: [[-8.6, Y, 1.5], [-5.4, Y, 1.6], [-3.6, Y, 2.1]][i], face: PI,
      plan: [{ until: `@hero.sit+${.6 + i * .9}` }, { gate: ['ticketGates', [0, 2, 3][i], -1], hold: .6 }, { ride: 'esc' }, { walk: [[10.6 - i * .4, DECK, -2.6], [10.6 - i * .4, DECK, -12.2]] }, { climb: 'bridgeStairs', down: true }, { board: ['A', [5, 2, 4][i], -1], after: .2 + i * .3, y: PF }],
    })) },
    // 已经在站台上等车的人（站在车门位置，门一开就上车）
    { kind: 'plans', seed: 6, people: [[-5.65, 4], [-9.1, 7], [6.85, 2], [15.9, 3], [19.35, 0]].map(([x, k], i) => ({
      at: [x + (i % 2 ? .5 : -.4), PF, -9.6 - (i % 3) * .5], face: PI, plan: [{ board: ['A', k, -1], after: .1 + (i % 3) * .5, y: PF }],
    })) },
    // B 车下来的人：沿站台走到出站楼梯，下到地道，再上到出站厅，过出站闸机，走出站房
    { kind: 'alight', train: 'B', doors: [7, 2, 6, 5], n: 12, side: 1, seed: 8, spread: .4, plan: i => [
      { walk: [[20.8, PF, -11.3 + ((i % 3) - 1) * .45]] },
      { climb: 'exitStairs', down: true, speed: 1.75 },
      { walk: [[31.0 + (i % 2) * 1.6, -4.4, -10.4], [31.0 + (i % 2) * 1.6, -4.4, -3.0]] },
      { climb: 'outStairs', speed: 1.65 },
      { gate: ['exitGates', 1 + (i % 3), 1], hold: .5 },
      { walk: [[27.6 + (i % 3) * .5, Y, 9.6], [29 + (i % 4), Y, 11.6], [35, Y, 12.4 + (i % 3) * .5]] }, { hide: true },
    ] },
    // 广场上散步、赶车的人（从切面进、从切面出）
    { kind: 'stream', seed: 13, t0: -8, n: 9, every: 8, spread: .9, speed: 1.4, path: [[-35, Y, 11.0], [35, Y, 10.6]] },
    { kind: 'stream', seed: 14, t0: -2, n: 7, every: 10, spread: .7, speed: 1.5, path: [[35, Y, 13.7], [-35, Y, 13.5]] },
  ],

  // 动线：主角的金色点线（讲到哪一步，就先长到这一步要走到的地方），出站人流的青色点线
  routes: [
    { id: 'hero', person: 'hero', grow: [
      ['@hero.out-.2', 0], ['@hero.out+1.2', '@hero.idgate+.9'],
      ['@hero.idgate+.4', '@hero.idgate+.9'], ['@hero.idgate+1.8', '@hero.cleared'],
      ['@hero.cleared', '@hero.cleared'], ['@hero.cleared+1.4', '@hero.sit'],
      ['@hero.sit+2.2', '@hero.sit'], ['@hero.sit+3.6', '@hero.esc'],
      ['@hero.esc-.4', '@hero.esc'], ['@hero.esc+1.6', '@hero.down'],
      ['@hero.down', '@hero.down'], ['@hero.down+1.6', '@hero.boarded'],
    ] },
    { id: 'exit', color: C.teal, path: [[13, PF, -13.2], [20.8, PF, -11.3], [22, PF, -11.3], [29.9, -4.4, -11.3], [31.8, -4.4, -10.4], [31.8, -4.4, -2.0], [32, Y, 4.1], [30.25, Y, 5.8], [28.4, Y, 9.6], [29.5, Y, 11.8], [34, Y, 12.4]], grow: [['@exitStep', 0], ['@exitStep+2.2', 999]] },
  ],

  light: [[0, 'day'], ['@close+.3', 'day'], ['@close+1.9', 'blue'], ['@lights-.05', 'blue'], ['@lights+1.6', 'night']],
};
