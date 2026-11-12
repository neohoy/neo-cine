// 两条线，一天 · 时间线：唯一的时间来源（钟、镜头、条带地图的墨线、批注、段落）。
// 120 BPM：一拍 0.5 秒，一小节 2 秒。所有落点都在拍上。
export const DUR = 56, BPM = 120;
const hm = (h, m) => h * 60 + m;                                    // 当天的分钟

// 钟：[影片秒, 当天分钟]，中间单调三次插值（速度连续，不跳）。一小时一小节 = 30 分钟/秒。
export const CLOCK = [
  [0, hm(3, 0)], [4, hm(3, 0)],                                     // 开场：条带地图墨出来，钟还没走
  [6, hm(5, 0)],                                                    // 夜里两小时一秒钟过去
  [13.5, hm(8, 45)],                                                // 清晨：一小时一小节
  [15.5, hm(8, 53)],                                                // 减速：08:53 IC 55 从科隆开出（落在拍上）
  [23, hm(9, 49)],                                                  // 赛跑：一小时四小节；09:49 ICE 43 到法兰克福机场
  [26, hm(9, 50)],                                                  // 判决：钟几乎停住，读字
  [28, hm(10, 12)],
  [36, hm(14, 0)],                                                  // 白天：一小时一小节
  [46, hm(24, 0)],                                                  // 傍晚到午夜：一小时两拍
  [56, hm(24, 0)],
];

// 镜头：[影片秒, 时间窗宽（分钟）, 丁字尺在窗里的位置（0–1）, 上边（公里，莱茵河谷线为负）, 下边（公里，高速新线）]
export const CAM = [
  [0, 300, .58, -226, 184],
  [13.5, 300, .58, -226, 184],
  [15.5, 170, .40, -226, 184],
  [26, 170, .40, -226, 184],
  [36, 640, .74, -226, 184],
  [46, 1468, (1440 + 14) / 1468, -226, 184],
  [56, 1468, (1440 + 14) / 1468, -226, 184],
];
// 图底的屏幕 y：片尾往上收，给图签让出地方
export const GYB = [[0, 1000], [43.6, 1000], [45.4, 830], [56, 830]];

// 开场：先在图纸中间墨出真实的地图（两支笔从科隆出发，同时到达法兰克福），然后从法兰克福剪开、拉直，滑进左栏
export const STRIP = { t0: .4, t1: 2.4, m0: 2.6, m1: 4.4 };
// 赛跑时铺上的描图纸：铺开、停留、撤走
export const OVERLAY = { t0: 14.2, t1: 15.2, t2: 25.8, t3: 26.8 };
// 丁字尺入画
export const RULER = { t0: 4.2, t1: 4.9 };

// 赛跑的两趟车（时刻全部来自时刻表，影片只用来找线）
export const RACE = { ic: { line: 'IC 55', dep: hm(8, 53) }, ice: { line: 'ICE 43', dep: hm(8, 54) }, arrive: hm(9, 49) };
// 林堡南的越行：ICE 49 停 6 分钟，ICE 41 从它旁边过去（两趟车在林堡南前后的先后顺序换了）
export const OVERTAKE = { slow: { line: 'ICE 49', at: 'Limburg Süd', arr: hm(15, 35) }, fast: { line: 'ICE 41' } };

// 批注（铅笔）：两行，一行中文一行英文。at = [当天分钟, 公里（莱茵为负）]，dx/dy = 字相对锚点的偏移（像素），
// tip = 引线指向的点（当天分钟, 公里）。t0/t1 = 出现和收起的影片秒。
export const NOTES = [
  { id: 'title', t0: 5.0, t1: 13.4, kind: 'title', zh: '科隆—法兰克福，一天的长途列车', en: 'Köln – Frankfurt: one day of long-distance trains' },
  { id: 'race', t0: 15.6, t1: 22.9, zh: '一分钟之差，都开往曼海姆', en: 'One minute apart, both bound for Mannheim' },
  { id: 'ice', t0: 23, t1: 30.5, zh: 'ICE 43：55 分钟到法兰克福机场', en: 'ICE 43: Frankfurt Airport in 55 min', at: [hm(9, 58), 150], dx: 14, dy: 0, tip: [hm(9, 49), 168.2] },
  { id: 'ic', t0: 23.5, t1: 30.5, zh: 'IC 55 这时刚离开科布伦茨', en: 'IC 55 is just leaving Koblenz', at: [hm(9, 58), -70], dx: 14, dy: 0, tip: [hm(9, 49), -93] },
  { id: 'hsl2002', t0: 27, t1: 35.5, zh: '高速新线 2002 年通车，按 300 km/h 设计', en: 'Opened 2002, built for 300 km/h', at: null },
  { id: 'clock', t0: 30.5, t1: 37.5, zh: '每小时同一分钟发车', en: 'Every hour, the same minutes', at: null },
  { id: 'limburg', t0: 39.2, t1: 46.4, zh: '林堡南：停 6 分钟，后车越过', en: 'Limburg Süd: a 6-min stop, overtaken', at: null },
  { id: 'only', t0: 45.6, t1: 56, kind: 'foot', zh: '只画长途列车，没有区域列车和货车', en: 'Long-distance trains only: no regional or freight trains' },
];

// 图签（片尾）：逐格写出来
export const TITLEBLOCK = { t0: 44.9, step: .5 };

// 段落（给配乐用）
export const SECS = [
  { id: 'strip', t: 0 }, { id: 'night', t: 4 }, { id: 'morning', t: 6 }, { id: 'brake', t: 13.5 }, { id: 'race', t: 15.5 },
  { id: 'verdict', t: 23 }, { id: 'day', t: 26 }, { id: 'evening', t: 36 }, { id: 'sheet', t: 46 }, { id: 'end', t: 56 },
];
