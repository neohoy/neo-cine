// 凌晨一点半 · 时间线：唯一的时间来源（钟、镜头、拉线、字幕、段落）。
// 80 BPM：一拍 0.75 秒，一小节 3 秒。重要的落点都写在拍上：bar(n, beat)。
export const BPM = 80, BEAT = 60 / BPM, BAR = 4 * BEAT;
export const bar = (n, b = 0) => +(n * BAR + b * BEAT).toFixed(4);
export const DUR = bar(19);                                          // 57 秒

// 钟：[影片秒, 从周四 0 点起的分钟]，中间单调三次插值（速度连续，不跳）。
// 周四 23:20 = 1400；周四夜里 01:30 = 1530；周五 23:20 = 2840；周五夜里 01:30 = 2970；周六 07:30 = 3330。
export const CLOCK = [
  [0, 1400], [bar(2, 2), 1400],                                      // 画线的时候钟不走
  [bar(3), 1404],                                                    // 起步
  [bar(4, 2), 1440],                                                 // 周四午夜，约 8 分钟/秒
  [bar(6), 1500],                                                    // 末班车一列列到终点（00:47–01:00）
  [bar(6, 2), 1528], [bar(8), 1531],                                 // 周四 01:30：钟几乎停住，读字
  [bar(9, 1), 2893],                                                 // 一天过去：底色按真实的日出日落走一遍（到周五 00:13）
  [bar(10), 2905],
  [bar(11, 2), 2942],                                                // 周五夜里一点刚过，约 8 分钟/秒
  [bar(13), 2969], [bar(14, 2), 2972],                               // 周五 01:30：接近真实速度，看列车靠站
  [bar(15, 2), 3010],
  [bar(17), 3290],                                                   // 天亮（周六）
  [bar(17, 2), 3330], [DUR, 3333],
];

// 镜头：[影片秒, 中心 x（米）, 中心 y（米）, 放大倍数（相对全景）]。中心相对全景中心；放大按对数插值。全景的中心和比例在 main.js 里由线网算出。
export const CAM = [
  [0, 0, 0, 2.5], [bar(1), 0, 0, 2.2],                                 // 开场贴近 U1 的笔尖（main.js 里跟着笔尖走，FOLLOW）
  [bar(2, 2), 0, 0, 1.0], [bar(3), 0, 0, 1.0],
  [bar(10), 0, 0, 1.0],
  [bar(12), -60, 280, 1.35],
  [bar(13), -110, 440, 2.75],                                        // 推到内城：斯蒂芬广场、卡尔广场一带
  [bar(14, 2), -80, 450, 2.85],
  [bar(16), -40, 200, 1.4],
  [bar(17), 0, 0, 1.0], [DUR, 0, 0, 1.0],
];

// 拉线：每条线从起点被拉到终点（站序方向），[线, 开始, 结束]
export const DRAW = [['U1', .12, 3.3], ['U6', 2.25, 5.0], ['U4', 3.0, 5.6], ['U2', 3.75, 6.4], ['U3', 4.5, 7.0]];
// 开场镜头跟着 U1 的笔尖：[开始放手, 完全放手]（之前镜头中心 = 笔尖身后一个半站距）
export const FOLLOW = { line: 'U1', t0: 2.6, t1: 6.2, behind: .4 };
export const LAG = 3.2;                       // 拉线时笔尖后面多少个站距还在从真实走向收紧成八方向

// 一天过去（底色按太阳走）：开始和结束的影片秒
export const PASS = { t0: bar(8), t1: bar(9, 1) };
// 列车可见：钟走得太快时不画单个列车
export const TRAIN_FAST = 16;                 // 分钟/秒，超过就淡出

// 字幕：右栏两行（中文一行、英文一行）。kind: title = 片名；cap = 普通；verdict = 结论；end = 片尾
export const CAPS = [
  { id: 'title', kind: 'title', t0: bar(2, 3), t1: bar(4, 2), zh: '凌晨一点半', en: 'Half Past One', sub: ['维也纳地铁 · 两个夜晚', 'Vienna U-Bahn · two nights'] },
  { id: 'last', t0: bar(4, 1), t1: bar(6, 2), zh: '周四夜里，末班车一列列开回终点', en: 'Thursday night: the last trains run home' },
  { id: 'thu', kind: 'verdict', t0: bar(6, 2), t1: bar(8), zh: '周四 01:30 · 五条线都停了', en: 'Thursday 1:30 a.m.: all lines stopped' },
  { id: 'fri', t0: bar(9, 1), t1: bar(11, 2), zh: '二十四小时后，同一张图', en: 'Twenty-four hours later, the same map' },
  { id: 'keep', t0: bar(11, 2), t1: bar(13), zh: '过了一点，车还在开', en: 'Past one, the trains keep coming' },
  { id: 'fri130', kind: 'verdict', t0: bar(13), t1: bar(14, 2), zh: '周五 01:30 · 线上 {n} 列车', en: 'Friday 1:30 a.m.: {n} trains running' },
  { id: 'rule', kind: 'verdict', t0: bar(14, 2), t1: bar(16, 2), zh: '周五、周六夜里，整夜每 15 分钟一班', en: 'Weekend nights: every 15 minutes, all night' },
];
// 片尾卡
export const END = { t0: bar(17) };

// 段落（给配乐用）
export const SECS = [
  { id: 'draw', t: 0 }, { id: 'thu', t: bar(3) }, { id: 'last', t: bar(5) }, { id: 'still', t: bar(6, 2) }, { id: 'pass', t: bar(8) },
  { id: 'fri', t: bar(9, 1) }, { id: 'keep', t: bar(12) }, { id: 'hold', t: bar(13) }, { id: 'dawn', t: bar(15, 2) }, { id: 'end', t: bar(17) },
];
