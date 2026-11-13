# FACTS — 《福田站，切开看》Futian, in Section

Every fact printed on the cards or written into the model, with its source. Checked 2026-11-13. Official sources first (the Shenzhen Transport Bureau jtys.sz.gov.cn, the Futian District government szft.gov.cn, Shenzhen Metro szmc.net, the National Railway Administration nra.gov.cn), then the mainstream press (China News Service). Encyclopaedias only in support. Quotes are kept short.

**The model is a diagram.** Its three tiers (street with buses, metro, high-speed rail), their order, the platforms, the single track on each tier and the escalators are an artistic section, not the station's real floors, tracks or transfer routes (the real high-speed station has three underground levels and 4 platforms with 8 tracks; the metro stations are beside it, not stacked under the street). This is said at the top of `../DEMO.md` and in `CREDITS`.

## On screen

| On screen | Value | Source (URL) | Quoted wording | Checked |
|---|---|---|---|---|
| Title card "福田站 · 深圳 · 高铁 · 地铁 · 公交"; layer names "地面 · 公交接驳", "地铁 2 · 3 · 11 号线", "高铁 · 广深港" | Futian Station combines the high-speed railway station, the Line 2, 3 and 11 metro station, buses and taxis | jtys.sz.gov.cn/jtzx/wycx/hccx/hczfb/content/post_11457302.html (Shenzhen Transport Bureau) | "配套有地铁2、3、11号线，公交、出租等交通接驳设施"; "主要开行广深港方向列车" | 2026-11-13 |
| | | www.szmc.net/shentiewuye/xiangmuguanli/csjtsnzhtxm/futianjiaotongshuniu/ (Shenzhen Metro, "福田交通枢纽") | "集地铁2、3、11号线福田站、广深港客运专线福田站、公交、出租等多种运输方式为一体"; "公交场站一个" | 2026-11-13 |
| Card "2011 · 地铁 2 号线、3 号线开到福田站" | Line 2's eastern extension and Line 3's underground section opened 2011-06-28; Futian is among the Line 3 stations opened that day | www.chinanews.com.cn/df/2011/06-28/3142675.shtml (China News Service) | "深圳地铁蛇口线(2号线)东延线、龙岗线(3号线)地下段28日开通试运营" | 2026-11-13 |
| | | www.chinanews.com.cn/auto/2011/06-21/3124994.shtml (China News Service) | Line 3 stations opening 6-28 include "福田站" | 2026-11-13 |
| | Futian on Line 2 | The 2011 report names the extension (世界之窗 to 新秀), not each station; Futian lies on that stretch in today's Line 2 station list (jtys.sz.gov.cn/jtzx/wycx/dtcx/dtxl/content/post_12601089.html). The 2016 Line 11 report confirms Futian as the Line 2 and 3 interchange: "福田站与2、3号线实现换乘" (szft.gov.cn, below) | derived from station order; noted | 2026-11-13 |
| Card "11 号线 · 2016" | Line 11 opened 2016-06-28 11:18; Futian is one of its interchange stations | www.szft.gov.cn/bmxx/qcsgxj/gzdt/content/post_4451083.html (Futian District government, from the municipal transport commission) | "28日11时18分，地铁11号线正式开通试运营"; "福田站、车公庙站……将在年内实现换乘" | 2026-11-13 |
| Card "2015.12.30 · 高铁开进市中心的地下" | Futian high-speed railway station opened 2015-12-30, an all-underground station in the city centre | jtys.sz.gov.cn (above) | "2015年12月30日建成开通运营"; "位于福田区益田路与深南大道的交界处" | 2026-11-13 |
| | | www.nra.gov.cn/ztzl/hd/cxdh/cxcg/yzgc/kcsj/201706/t20170626_146816.shtml (National Railway Administration) | "位于城市中心区的全地下大型高铁火车站"; "为地下三层站" | 2026-11-13 |
| Station name "福田站" on the model; "FUTIAN" on the platform boards | the station's name | the sources above | | 2026-11-13 |
| Line number squares 2, 3, 11 and their colours | Line 2 #DB6D1C (orange), Line 3 #00A2E1 (blue), Line 11 #6A1D44 (maroon) | OpenStreetMap route relations of Shenzhen Metro Lines 2, 3 and 11, `colour` tag, fetched 2026-11-13 through neo/geo/routes.py | No official colour code was found: the Shenzhen News Network says only that the signage plan "规定各线路指定色号" (www.sznews.com/news/content/2023-08/08/content_30391436.htm) | 2026-11-13 |

## In the model, not printed

| What | Value | Source |
|---|---|---|
| The towers behind the station | real footprints and heights west of Yitian Road, from 45 to 560 m from the station's axis, between its two ends; 1 model unit = 45 m, horizontally and vertically | `data/city.json`: neo/geo/buildings.py, OpenStreetMap (Overpass) + Overture Maps buildings 2026-10-21.0, fetched 2026-11-13. 34 heights are tagged (`measured`, 54 % of the volume), 73 come from floor counts, 266 are estimated by the script (capped at 60 m). The tallest, Ping An Finance Center, is drawn from its OSM height tag, 599.1 m (CTBUH gives 599.1 m architectural height; official Chinese sources write 599 m: www.sznews.com/news/content/2019-04/09/content_21608553_0.htm) |
| Where the towers stand | the block is moved back by the depth of the section: in reality Yitian Road and the station lie directly beside them | said in `../DEMO.md` and `CREDITS` |
| The station runs north–south | the model's long axis is north (right) to south (left), seen from the east | jtys page above ("益田路与深南大道的交界处"); szft.gov.cn/xxgk/zwgk/gzxx/zdjsxm/xmjz/content/post_3965975.html: "呈南北向布置" |
| Trains, bus, people | illustrative: one train per tier, one bus, invented timings; no timetable | — |

## Checked and not used

- "亚洲最大的地下火车站" (Asia's largest underground railway station): in Xinhua and the National Railway Administration, but the film doesn't need the superlative.
- 4 platforms and 8 tracks, 1023 m long, 32.2 m deep (nra.gov.cn above): the model shows one track per tier on purpose.
- The opening day's transfer: Xinhua (2015-12-30) says the passage to Lines 2, 3 and 11 was "暂未开通" on the day the railway station opened; the film doesn't claim a transfer date.
