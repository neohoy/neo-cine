#!/bin/sh
# 一条命令重做《福田站，切开看》Futian, in Section（微缩景观 Miniature 的示范片）：
#   sh styles/miniature/demo/build.sh v001             （在库的根目录或任何目录都行）
#   RENDER=remote sh styles/miniature/demo/build.sh v002   画面在渲染台式机上渲（neo/render/remote.sh，4 个 worker）
# 每次都是新版本：成片写到 styles/miniature/miniature-<ver>.mp4，旁边是 poster-<ver>.jpg，已有的版本绝不覆盖。
# 画廊用的 miniature.mp4 和 poster.jpg 是你选定那一版的副本：这里只在它们还不存在的时候才复制；风格帧 demo/stills/styleframe.jpg 同理。
# 没有旁白，所以没有配音也没有字幕：要读的字都在展签式的说明卡上。
set -e
VER=${1:?usage: sh build.sh v001   (取下一个没用过的号：ls styles/miniature/*.mp4)}
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../../.." && pwd)"; PY="$R/.venv/bin/python"
OUT="$D/../miniature-$VER.mp4"; POSTER="$D/../poster-$VER.jpg"
T_POSTER=47.6; T_FRAME=18                       # 海报：夜里亮灯、高铁刚出站；风格帧：三层展开、层名都在（写 18 不写 18.0：远程静帧按数值命名成 t_18.jpg）
[ ! -e "$OUT" ] || { echo "✗ $OUT 已经存在：换下一个版本号"; exit 1; }
[ ! -e "$POSTER" ] || { echo "✗ $POSTER 已经存在：换下一个版本号"; exit 1; }
cd "$R"
echo "== 0. 楼群数据（OpenStreetMap + Overture，neo/geo/buildings.py；原始回答缓存在 data/city.json.cache/，不进 git）"
[ -s "$D/data/city.json" ] || $PY neo/geo/buildings.py --bbox 114.0395,22.5340,114.0530,22.5485 --origin 114.0512,22.5413 --out "$D/data/city.json"
echo "== 1. 字体（OFL，不进 git；CREDITS 里有名字和出处）和中文子集"
sh "$D/tools/fonts.sh"
echo "== 2. 导出画面事件（车进站出站、层升降、镜头移动、说明卡、亮灯、窗一批批亮）"
node core/render/events.mjs "$D"
echo "== 3. 声音（全部现场合成）→ out/mix.wav；cues 检查和响度检查都要过"
$PY "$D/mix.py"
echo "== 4. 渲染画面（24 fps）"
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$D" --out "$D/out/video.mp4" --workers 4
else node core/render/video.mjs "$D" --fps 24 --workers 3 --out "$D/out/video.mp4"; fi
echo "== 5. 合成（两遍 loudnorm 到 −14 LUFS，不加颗粒，BT.709 有限范围）"
LEMO_COLOR=bt709 sh core/render/mux.sh "$D/out/video.mp4" "$D/out/mix.wav" "$OUT" 24 0
echo "== 6. 阅读时长检查（只算字的位置，不画三维）、海报和风格帧"
node core/render/readcheck.mjs "$D" --q 'textonly=1'
mkdir -p "$D/out/stills"
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$D" --times "$T_POSTER,$T_FRAME" --stills "$D/out/stills"
else node core/render/still.mjs "$D" "$T_POSTER" "$T_FRAME" --out "$D/out/stills"; fi
cp "$D/out/stills/t_$T_POSTER.jpg" "$POSTER"
[ -e "$D/stills/styleframe.jpg" ] || { mkdir -p "$D/stills"; cp "$D/out/stills/t_$T_FRAME.jpg" "$D/stills/styleframe.jpg"; }
[ -e "$D/../miniature.mp4" ] || cp "$OUT" "$D/../miniature.mp4"
[ -e "$D/../poster.jpg" ] || cp "$POSTER" "$D/../poster.jpg"
echo "done: $OUT"
