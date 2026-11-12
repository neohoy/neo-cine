# neo/：NEO 自己的工具

*本文是 [README.md](README.md) 的中文版，以英文版为准。*

`core/` 是 Lemo-Opuscar 工具的原样镜像，不在这里改（见 [UPSTREAM.zh-CN.md](../UPSTREAM.zh-CN.md)）。NEO-Cine 自己加的工具放在这个目录里，这样和上游同步时不会被覆盖。

- `publish.sh`：把示范片成片和它们的 720p 网页版传到仓库的发布页，供画廊使用（[MAINTAINING.zh-CN.md](../MAINTAINING.zh-CN.md) 的“发布”一节）。
- `geo/osm.py`：把 OpenStreetMap 变成影片页面能直接画的一份 JSON（海岸闭合成陆地、水、林、峰、路、铁路、楼、地名；米制坐标，线已简化）。“真实地图”系列的风格都用它，用法见文件开头和 [`styles/atlas-scroll/STYLE.zh-CN.md`](../styles/atlas-scroll/STYLE.zh-CN.md) §9、§10。数据 © OpenStreetMap contributors，ODbL 1.0。
- `geo/ohm.py`：同样的事，对象是 OpenHistoricalMap，带年份：边界、铁路、有名字的路线，每个要素有它存在的起止年份，页面可以画出任何一年的地图。`--origin` 和 `--proj` 要和它叠在上面的那份 `osm.py` 数据一致。[`styles/atlas-scroll`](../styles/atlas-scroll/STYLE.zh-CN.md) 在用。数据是 CC0。
- `audio/master.py`：影片 `mix.py` 的最后一步。整条混音只加一个增益，提到 −14 LUFS，只把冒出来的峰值收短（先软限，再按真峰值限幅），这样 `mux.sh` 里的 loudnorm 就没有什么可重新分配的；`check()` 按 `mux.sh` 的方式测量写出的混音，loudnorm 要动态调整时让构建失败。原因和该看的数字写在文件开头。三支示范片的 `mix.py` 都在用（例如 [`styles/atlas-scroll`](../styles/atlas-scroll/demo/mix.py)）。
- `audio/cues.py`：让影片的 `mix.py` 按名字读画面事件，并核对配乐有没有落在事件上。由画面驱动的声音从事件取时间；写在音乐节拍上的重音声明它属于哪个事件；`report()` 打印每个卡点上配乐和画面相差多少，超过半帧就让构建失败。它只依赖 `events.json`，任何风格都能用。三支示范片的 `mix.py` 都在用（例如 [`styles/atlas-scroll`](../styles/atlas-scroll/demo/mix.py)）。
