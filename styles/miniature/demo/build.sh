#!/bin/sh
# 一条命令重做《一座高铁站怎么运转》How a High-Speed Station Works（微缩景观 Miniature 的示范片）：
#   sh styles/miniature/demo/build.sh v002                 （在库的根目录或任何目录都行）
#   RENDER=remote sh styles/miniature/demo/build.sh v003   画面在渲染台式机上渲（neo/render/remote.sh，4 个 worker）
# 每次都是新版本：成片写到 styles/miniature/miniature-<ver>.mp4，旁边是 poster-<ver>.jpg，已有的版本号一律拒绝。
# 画廊用的 miniature.mp4、poster.jpg 和风格帧 demo/stills/styleframe.jpg 是选定那一版的副本：这里只在它们还不存在时才复制，
# 换成新版由人审片后自己做。新版的风格帧另存成 out/stills/styleframe-<ver>.jpg。
# 没有旁白，所以没有配音也没有字幕：要读的字都在编号牌和引线标注上（中英两行）。
set -e
VER=${1:?usage: sh build.sh v002   (取下一个没用过的号：ls styles/miniature/*.mp4)}
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../../.." && pwd)"; PY="$R/.venv/bin/python"
OUT="$D/../miniature-$VER.mp4"; POSTER="$D/../poster-$VER.jpg"
T_POSTER=67; T_FRAME=58                        # 海报：夜里亮灯、片名在；风格帧：⑦ 地道切面，标注和两股人流都在（写 67 不写 67.0：远程静帧按数值命名成 t_67.jpg）
[ ! -e "$OUT" ] || { echo "✗ $OUT 已经存在：换下一个版本号"; exit 1; }
[ ! -e "$POSTER" ] || { echo "✗ $POSTER 已经存在：换下一个版本号"; exit 1; }
cd "$R"
echo "== 1. 字体（OFL，不进 git；CREDITS 里有名字和出处）和中文子集"
sh "$D/tools/fonts.sh"
echo "== 2. 导出画面事件（步骤、标注、闸机、车进站开门出站、屋顶升降、亮灯……）；只算时间，不画三维"
node core/render/events.mjs "$D" --q textonly=1
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
cp "$D/out/stills/t_$T_FRAME.jpg" "$D/out/stills/styleframe-$VER.jpg"
[ -e "$D/stills/styleframe.jpg" ] || { mkdir -p "$D/stills"; cp "$D/out/stills/t_$T_FRAME.jpg" "$D/stills/styleframe.jpg"; }
[ -e "$D/../miniature.mp4" ] || cp "$OUT" "$D/../miniature.mp4"
[ -e "$D/../poster.jpg" ] || cp "$POSTER" "$D/../poster.jpg"
echo "done: $OUT"
