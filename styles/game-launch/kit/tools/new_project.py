#!/usr/bin/env python3
"""新建游戏发布工程：把用户带来的素材收进 <工程>/assets/，写 game.json（镜头表的起点）、FACTS.md、STORY.md、CREDITS 草稿、.gitignore，
再盘点一遍素材（inventory.py）。工程不在 styles/ 里（AGENTS.md："Where things go"）。

    .venv/bin/python styles/game-launch/kit/tools/new_project.py <工程> --from <素材文件夹> --title 游戏名 [--name 文件名前缀]

- 录像（mp4、mov…）→ assets/footage/（APFS 上是零成本的克隆，否则硬链接，再不行才复制），每条一个 sources 条目
  （play、play2…），录屏的黑边按 cropdetect 填进 crop；有声音的第一条当原声来源（audio.from）；
- 图片 → assets/stills/，每张一个 stills 条目（名字取文件名）；文字（商店页简介、更新日志、开发者的话）→ assets/text/；
  声音文件 → assets/audio/。
之后：scan.py 摊开录像 → look.py 找那个真实数字 → STORY.md 写三个方案 → game.json 写镜头表（PRODUCTION.md）。
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from lib import KIT, die, need_ffmpeg, probe, save  # noqa: E402
from inventory import VID, IMG, AUD, TXT, cropdetect  # noqa: E402


def bring(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst):
        return
    if sys.platform == "darwin" and subprocess.run(["cp", "-c", src, dst], capture_output=True).returncode == 0:
        return
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def slug(name, used):
    s = re.sub(r"[^a-z0-9]+", "-", os.path.splitext(name)[0].lower()).strip("-") or "img"
    base, k = s, 2
    while s in used:
        s, k = f"{base}-{k}", k + 1
    used.add(s)
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--from", dest="src", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--name")
    a = ap.parse_args()
    need_ffmpeg()
    P = os.path.abspath(a.project)
    if os.path.exists(os.path.join(P, "game.json")):
        die(f"{P} 已经是一个工程（有 game.json）")
    if "styles" in P.split(os.sep):
        print("⚠ 工程不要建在库的 styles/ 里面：用户的片子放在 films/<名字>/（克隆模式）或用户自己的文件夹（技能模式）")
    src = os.path.abspath(a.src)
    if not os.path.isdir(src):
        die(f"没有这个素材文件夹：{src}")
    files = sorted(os.path.join(d, n) for d, _, ns in os.walk(src) for n in ns if not n.startswith("."))
    cfg = json.load(open(os.path.join(KIT, "templates", "game.json"), encoding="utf-8"))
    cfg["title"] = a.title
    cfg["name"] = a.name or re.sub(r"[^\w.-]+", "-", os.path.basename(P)).strip("-") or "game-promo"
    cfg["sources"], cfg["stills"] = {}, {}
    os.makedirs(P, exist_ok=True)
    k, used = 0, set()
    for f in files:
        n = os.path.basename(f)
        low = n.lower()
        if low.endswith(VID):
            k += 1
            sid = "play" if k == 1 else f"play{k}"
            dst = os.path.join(P, "assets", "footage", n)
            bring(f, dst)
            p = probe(dst)
            c = cropdetect(dst, p["dur"])
            crop = c if c and (c[2] != p["w"] or c[3] != p["h"]) else None
            cfg["sources"][sid] = {"file": f"assets/footage/{n}", "crop": crop,
                                   "note": f"{p['dur']:.1f} 秒，{p['w']}×{p['h']}，{p['fps'] or 0:.0f} fps，{'有' if p['audio'] else '没有'}声音"}
            if p["audio"] and "from" not in cfg.get("_audio_set", {}):
                cfg["audio"]["from"] = sid
                cfg["_audio_set"] = {"from": sid}
        elif low.endswith(IMG):
            sid = slug(n, used)
            bring(f, os.path.join(P, "assets", "stills", n))
            cfg["stills"][sid] = {"file": f"assets/stills/{n}"}
        elif low.endswith(TXT):
            bring(f, os.path.join(P, "assets", "text", n))
        elif low.endswith(AUD):
            bring(f, os.path.join(P, "assets", "audio", n))
    cfg.pop("_audio_set", None)
    if not cfg["sources"]:
        print("⚠ 素材里没有录像：这个风格的主角是实机画面（STYLE.md §1）。只有截图也能做，但要先和用户说清楚")
        cfg["audio"].pop("from", None)
    # 镜头表的起点只是示意：静图名字换成实际的
    names = list(cfg["stills"])
    logo = next((s for s in names if "logo" in s), None)
    key = next((s for s in names if any(w in s for w in ("cover", "key", "art", "主视觉"))), None)
    for sh in cfg["shots"]:
        for L in sh.get("layers", []):
            if "still" in L:
                L["still"] = key or (names[0] if names else "keyart")
        fin = sh.get("finale")
        if fin and fin.get("logo"):
            fin["logo"]["still"] = logo or "logo"
    save(P, cfg)
    for t in ("FACTS.md", "STORY.md"):
        shutil.copyfile(os.path.join(KIT, "templates", t), os.path.join(P, t))
    open(os.path.join(P, "CREDITS"), "w", encoding="utf-8").write(f"""{a.title} — 宣传片

游戏素材：实机录像、主视觉、Logo、立绘、原声都属于游戏的开发者；用户确认有权使用（DIRECTOR.md §12）。来源：<商店页地址、录像出处>。
  片中用到的录像片段（录像时间码）：<build 之后照 game.json 的 layers 填>。

影片自己的字体（SIL Open Font License 1.1，tools/fonts.py 下载并切子集，许可文本在 fonts/）：
- 标题字：<fonts/fonts.json 的 title>
- 小字：<fonts/fonts.json 的 small>

声音：游戏原声（<录像名> 从 <起点> 起）；转场音效由 tools/mix.py 用代码合成，没有用录音素材和采样。
""")
    open(os.path.join(P, ".gitignore"), "w").write("out/\nframes/\ndata/\nindex.html\npage/\nevents.json\n*.mp4\nassets/footage/\n")
    print(f"工程 {P}：录像 {len(cfg['sources'])} 条，图片 {len(cfg['stills'])} 张")
    subprocess.run([sys.executable, os.path.join(KIT, "tools", "inventory.py"), P])


if __name__ == "__main__":
    main()
