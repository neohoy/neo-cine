#!/bin/sh
# 一条命令重做游戏发布 Game Launch 的示范片《归路：新旅途》宣传片（游戏 © 开发者青椒，素材经开发者授权用于本示范片）：
#   sh styles/game-launch/demo/build.sh v002                   （在库的根目录或任何目录都行）
#   RENDER=remote sh styles/game-launch/demo/build.sh v002     画面在渲染台式机上渲（neo/render/remote.sh，4 个 worker）
# 示范片本身就是一个游戏发布工程（game.json），用的是和用户的片子同一套工具包：../kit/tools/make.sh 抽帧、切字体、生成页面、
# 节拍核对、混音（原声截段、合成音效、卡点、−14 LUFS）、渲染（30 fps）、合成、读字检查、出海报（制作手册 ../PRODUCTION.md）。
#
# 素材：实机录像不进 git（170 MB）。先把 TapTap 游戏页（https://www.taptap.cn/app/984135）上 9 分 24 秒的实机录像
# （3840×2160，30 fps）放到 demo/assets/footage/play-4k.mp4，或者用 FOOTAGE=<路径> 指给它（会克隆或复制一份过来）。
# 进 git 的只有静图：assets/stills/ 的主视觉、Logo 和六张立绘裁切（它们怎么裁的写在 game.json 的 stills.*.grab 里）。
# 成片写到 styles/game-launch/game-launch-<ver>.mp4，旁边是 poster-<ver>.jpg，已有的版本绝不覆盖。
# 画廊用的 game-launch.mp4 和 poster.jpg 是你选定那一版的副本：这里只在它们还不存在的时候才复制；风格帧同理。
set -e
VER=${1:?usage: sh build.sh v002   (取下一个没用过的号：ls styles/game-launch/*.mp4)}
D="$(cd "$(dirname "$0")" && pwd)"; S="$(cd "$D/.." && pwd)"; R="$(cd "$S/../.." && pwd)"
[ ! -e "$S/game-launch-$VER.mp4" ] || { echo "✗ game-launch-$VER.mp4 已经存在：换下一个版本号"; exit 1; }
REC="$D/assets/footage/play-4k.mp4"
if [ ! -f "$REC" ] && [ -n "$FOOTAGE" ]; then
  mkdir -p "$D/assets/footage"; cp -c "$FOOTAGE" "$REC" 2>/dev/null || cp "$FOOTAGE" "$REC"
fi
if [ ! -f "$REC" ]; then
  echo "✗ 缺实机录像：$REC"
  echo "  它不进 git。从 TapTap 游戏页 https://www.taptap.cn/app/984135 取 9 分 24 秒的实机录像（3840×2160，30 fps），"
  echo "  放到上面的路径，或者用 FOOTAGE=<录像路径> sh $0 $VER。素材经开发者授权只用于本示范片。"
  exit 1
fi
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$REC" | cut -d. -f1)
[ "$DUR" -ge 560 ] || { echo "✗ $REC 只有 $DUR 秒：示范片用的是 9 分 24 秒的那一条（镜头表里的时间码都对着它）"; exit 1; }
OUTDIR="$S" sh "$S/kit/tools/make.sh" "$D" "$VER"
cd "$R"
FS=$(.venv/bin/python -c "import json;print(json.load(open('$S/style.json'))['frame_sec'])")
echo "== 风格帧（片中 $FS 秒：推近到交易所，货钞 14775 和铜框字幕牌「货钞 4351 → 14775」都在）"
node core/render/still.mjs "$D" "$FS" --prefix sf_ --out "$D/out/stills" >/dev/null
[ -e "$D/stills/styleframe.jpg" ] || { mkdir -p "$D/stills"; cp "$D/out/stills/sf_$FS.jpg" "$D/stills/styleframe.jpg"; }
[ -e "$S/game-launch.mp4" ] || cp "$S/game-launch-$VER.mp4" "$S/game-launch.mp4"
[ -e "$S/poster.jpg" ] || cp "$S/poster-$VER.jpg" "$S/poster.jpg"
echo "done: $S/game-launch-$VER.mp4"
