# neo/：NEO 自己的工具

*本文是 [README.md](README.md) 的中文版，以英文版为准。*

`core/` 是 Lemo-Opuscar 工具的原样镜像，不在这里改（见 [UPSTREAM.zh-CN.md](../UPSTREAM.zh-CN.md)）。NEO-Cine 自己加的工具放在这个目录里，这样和上游同步时不会被覆盖。

- `publish.sh`：把示范片成片和它们的 720p 网页版传到仓库的发布页，供画廊使用（[MAINTAINING.zh-CN.md](../MAINTAINING.zh-CN.md) 的“发布”一节）。
- `geo/osm.py`：把 OpenStreetMap 变成影片页面能直接画的一份 JSON（海岸闭合成陆地、水、林、峰、路、铁路、楼、地名；米制坐标，线已简化）。“真实地图”系列的风格都用它，用法见文件开头和 [`styles/atlas-scroll/STYLE.zh-CN.md`](../styles/atlas-scroll/STYLE.zh-CN.md) §9、§10。数据 © OpenStreetMap contributors，ODbL 1.0。
- `geo/ohm.py`：同样的事，对象是 OpenHistoricalMap，带年份：边界、铁路、有名字的路线，每个要素有它存在的起止年份，页面可以画出任何一年的地图。`--origin` 和 `--proj` 要和它叠在上面的那份 `osm.py` 数据一致。[`styles/atlas-scroll`](../styles/atlas-scroll/STYLE.zh-CN.md) 在用。数据是 CC0。
- `geo/routes.py`：从 OpenStreetMap 取公共交通线路（线路关系：地铁、铁路、有轨电车、公交、轮渡……），写成一份 JSON：每条线路的路段按行车方向接成一条路径，站点按顺序排好并附上沿路径的里程，带线路编号、名称和公布的线色，按 route_master 分组，同名的站合并成车站。`--origin` 和 `--proj` 与 `osm.py` 的数据一致就能叠在一起。用法见文件开头；“交通”系列的风格在用。数据 © OpenStreetMap contributors，ODbL 1.0。
- `geo/buildings.py`：取一个范围里真实建筑的轮廓和高度，写成页面能直接拉伸的一份 JSON。OpenStreetMap 走 Overpass（名字、类型、带 `min_height` 的 `building:part` 塔楼和裙楼、内院），再并入 Overture Maps 的 buildings 主题（Overture 公开的 S3 桶或 Azure 镜像上的 GeoParquet，从它的 STAC 目录找到最新一版，按范围读取），补上 OSM 没画的机器识别轮廓。Overture 里来自 OSM 的记录按编号对上后丢掉；其他来源的轮廓只要不和 OSM 的楼重叠就加进来。每栋楼都标出高度从哪来：`measured`（有高度标签）、`levels`（层数 × 3.2 米）、`estimated`（附近大小相近的楼的高度，最多 60 米；附近没有就按类型给默认值）。`--origin` 和 `--proj` 与 `osm.py` 一致；原始回答缓存在 `<out>.cache/`，第二次离线可跑。Overture 这一路要装 `duckdb`（[`requirements-geo.txt`](requirements-geo.txt)）；只用 `--sources osm` 什么都不用装。[`styles/folding-city`](../styles/folding-city/STYLE.zh-CN.md) 在用。数据：OpenStreetMap © OpenStreetMap contributors，ODbL 1.0；Overture buildings 主题是 ODbL 1.0（Overture Maps Foundation），它的各个来源另有署名要求（微软和谷歌的建筑轮廓、Esri Community Maps、东亚的 Shi 等 2023，CC BY 4.0……）：文件的 `meta.sources` 写着实际用到了哪些，完整清单在脚本开头。
- `geo/gtfs.py`：把 GTFS 时刻表（运营方发布时刻表的通用格式）变成某一天实际开行的班次，可以按运营方、线路、线路类型、范围框或必须停靠的车站筛选，按停站模式分组并列出发车时刻。时刻表里空着的站点时刻按距离插值并做标记；按发车间隔给出的班次（`frequencies.txt`）展开成逐班并做标记。数据的许可以发布方为准，写进 `CREDITS`。“交通”系列的风格在用。
- `render/remote.sh`（配合 `render/frames.mjs`）：通过 ssh 把页面交给另一台有显卡的机器渲染（这里是台式机：`NEO_RENDER_HOST`，默认 `render`），页面约定和编码参数都和 `core/render/video.mjs` 相同，渲完把视频取回；加 `--times` 只出静帧。那台机器上除了 Node 和 ffmpeg 什么都不用装：运行环境（`core/`、three、playwright-core、`frames.mjs`）只在第一次和有改动时传过去；每次渲染把样片目录传到单独的任务目录，渲完删掉。样片的 `build.sh` 用 `RENDER=remote` 调它。
- `audio/master.py`：影片 `mix.py` 的最后一步。整条混音只加一个增益，提到 −14 LUFS，只把冒出来的峰值收短（先软限，再按真峰值限幅），这样 `mux.sh` 里的 loudnorm 就没有什么可重新分配的；`check()` 按 `mux.sh` 的方式测量写出的混音，loudnorm 要动态调整时让构建失败。原因和该看的数字写在文件开头。每支示范片的 `mix.py` 都在用（例如 [`styles/atlas-scroll`](../styles/atlas-scroll/demo/mix.py)）。
- `audio/cues.py`：让影片的 `mix.py` 按名字读画面事件，并核对配乐有没有落在事件上。由画面驱动的声音从事件取时间；写在音乐节拍上的重音声明它属于哪个事件；`report()` 打印每个卡点上配乐和画面相差多少，超过半帧就让构建失败。它只依赖 `events.json`，任何风格都能用。每支示范片的 `mix.py` 都在用（例如 [`styles/atlas-scroll`](../styles/atlas-scroll/demo/mix.py)）。
