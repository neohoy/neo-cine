#!/usr/bin/env python3
"""镜头表 → 整片页面：按 kit/lib.py 排出时间线，把镜头、字幕牌、收尾段、画面事件注入 kit/page/template.html，
写出 <工程>/index.html，并把 kit/page/ 的 film.js、tween.js 复制到 <工程>/page/。之后就是库的页面约定（window.render(t) 等），
core/render/ 的工具和 neo/render/remote.sh 都能直接渲。

    .venv/bin/python styles/game-launch/kit/tools/build.py <工程>

先跑 tools/clips.py（录像层的帧、静图）和 tools/fonts.py。会检查（STYLE.md §4、§9）：
- 每个镜头是整拍（切点都在原声的拍上）；
- 每块字幕牌最多一个强调词；字幕牌、行动号召按库的读字规则够不够时间（不够的列出来，最后由 core/render/readcheck.mjs 把关）；
- 画面上的每个数字都能在 FACTS.md 里找到（STYLE.md §1：不编录像里没有的数字）；
- 镜头没有露出源图外面（lib.camera 已经查过）；录像层的帧都抽好了。
"""
import json
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from lib import KIT, load, plan, plain, accents, need_read, image_size, still_file, die  # noqa: E402


def main():
    P, cfg = load(sys.argv[1] if len(sys.argv) > 1 else ".")
    pl = plan(cfg, P)
    warn = []
    # ---------- 拍子 ----------
    if pl["beat"]:
        for s in cfg.get("shots") or []:
            if "beats" in s and abs(s["beats"] - round(s["beats"])) > 1e-9:
                warn.append(f"镜头 {s.get('id')} 是 {s['beats']} 拍：切点会落在拍子之间")
    # ---------- 静图 ----------
    stills = {}
    for sid in (cfg.get("stills") or {}):
        f = still_file(cfg, P, sid)
        if not os.path.exists(f):
            die(f"静图 {sid} 不在：{os.path.relpath(f, P)}（写了 grab 的先跑 tools/clips.py）")
        w, h = image_size(f)
        stills[sid] = {"url": os.path.relpath(f, P).replace(os.sep, "/"), "w": w, "h": h}
    # ---------- 录像层的帧 ----------
    for sh in pl["shots"]:
        for L in sh["layers"]:
            if L["kind"] != "clip":
                continue
            mf = os.path.join(P, "frames", L["id"], "meta.json")
            if not os.path.exists(mf):
                die(f"录像层 {L['id']} 还没抽帧：先跑 tools/clips.py")
            m = json.load(open(mf))
            if m["g0"] != L["g0"] or len(m["frames"]) != L["n"]:
                die(f"录像层 {L['id']} 的帧和镜头表对不上（镜头改过了）：再跑一遍 tools/clips.py")
            L["frames"] = m["frames"]
    # ---------- 铺满画面的静图不能有透明的地方（会露出底色：STYLE.md §1 不留黑底） ----------
    from PIL import Image
    for sh in pl["shots"]:
        for L in sh["layers"]:
            if L["kind"] != "still" or not L.get("size"):
                continue
            with Image.open(still_file(cfg, P, L["still"])) as im:
                if im.mode not in ("RGBA", "LA", "P"):
                    continue
                A = im.convert("RGBA").getchannel("A")
            s0, tx, ty = L["start"]
            x0, y0 = max(0, int(-tx / s0)), max(0, int(-ty / s0))
            x1, y1 = min(A.width, int((1920 - tx) / s0)), min(A.height, int((1080 - ty) / s0))
            if A.crop((x0, y0, x1, y1)).getextrema()[0] < 128:
                warn.append(f"镜头 {sh['id']} 的静图 {L['still']} 在画面里有透明的地方（截图四周的透明边？）：用 grab 的 crop 裁掉，或者推近一点")

    # ---------- 字幕牌：一个强调词、读字时间 ----------
    reads = []
    for sh in pl["shots"]:
        for p in sh["plates"]:
            if len(accents(p["text"])) > 1:
                die(f"字幕牌「{plain(p['text'])}」有 {len(accents(p['text']))} 个强调词：每块最多一个（STYLE.md §4）")
            got = p["t1"] - (p["t0"] if p["still"] else p["t0"] + 0.36)
            reads.append((plain(p["text"]), got))
        fin = sh.get("finale")
        if fin:
            for k, c in enumerate(fin["cta"]):
                reads.append((plain(c["text"]), sh["end"] - c["t"] - (0.32 if k == 0 else 0.3)))
        if sh.get("card"):
            for l in sh["card"]["lines"]:
                reads.append((l, sh["end"] - sh["card"]["land"]))
    for text, got in reads:
        need = need_read(text)
        if got < need - 1e-6:
            warn.append(f"「{text}」在画面上 {got:.2f} 秒，按读字规则要 {need:.2f} 秒：少写几个字，或者这个镜头多给一两拍")
    # ---------- 事实：画面上的数字都要在 FACTS.md 里 ----------
    facts_f = os.path.join(P, "FACTS.md")
    facts = open(facts_f, encoding="utf-8").read() if os.path.exists(facts_f) else ""
    squash = lambda s: re.sub(r"[\s,，]", "", s)
    for text, _ in reads:
        for num in re.findall(r"\d+(?:\.\d+)?%?", text):
            if squash(num) not in squash(facts):
                warn.append(f"「{text}」里的 {num} 不在 FACTS.md 里：每个数字都要写明出处（录像时间码或商店页原文），STYLE.md §1")
    if not facts:
        warn.append("工程里没有 FACTS.md：画面上的每个说法都要写进去（模板在 kit/templates/FACTS.md）")

    # ---------- 写页面 ----------
    look = cfg.get("look") or {}
    pt = dict({"top": "#30343a", "bottom": "#1c1e22", "frame": "#6b3a20", "frameWidth": 3, "inner": "#c46a34", "innerWidth": 2,
               "rivet": ["#e9e6df", "#8d8a85", "#4a4846"], "rivetSize": 12, "shadow": "0 10px 0 rgba(0,0,0,.35)", "brushed": 0.05},
              **(look.get("plate") or {}))
    title = dict({"size": 104, "tracking": 0.02}, **(look.get("title") or {}))
    sub = {
        "title": cfg.get("title", ""),
        "plate.top": pt["top"], "plate.bottom": pt["bottom"], "plate.frame": pt["frame"], "plate.frameWidth": pt["frameWidth"],
        "plate.inner": pt["inner"], "plate.innerWidth": pt["innerWidth"], "plate.rivet0": pt["rivet"][0], "plate.rivet1": pt["rivet"][1],
        "plate.rivet2": pt["rivet"][2], "plate.rivetSize": pt["rivetSize"], "plate.shadow": pt["shadow"], "plate.brushed": pt["brushed"],
        "text": look.get("text", "#f4efe6"), "accent": look.get("accent", "#63dd8a"), "warm": look.get("warm", "#e3995f"),
        "muted": look.get("muted", "#a9a49b"), "title.size": title["size"], "title.tracking": title["tracking"],
    }
    fin = next((s["finale"] for s in pl["shots"] if s.get("finale")), None)
    sub["logo"] = stills[fin["logo"]["still"]]["url"] if fin and fin.get("logo") else stills[next(iter(stills))]["url"] if stills else ""
    data = {"plan": pl, "stills": stills}
    html = open(os.path.join(KIT, "page", "template.html"), encoding="utf-8").read()
    html = html.replace("{{data}}", json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"))
    for k, v in sub.items():
        html = html.replace("{{" + k + "}}", str(v))
    left = re.findall(r"\{\{[^}]+\}\}", html)
    if left:
        die(f"模板里还有没填的 {left[:3]}")
    open(os.path.join(P, "index.html"), "w", encoding="utf-8").write(html)
    os.makedirs(os.path.join(P, "page"), exist_ok=True)
    for f in ("film.js", "tween.js"):
        shutil.copyfile(os.path.join(KIT, "page", f), os.path.join(P, "page", f))
    n_frames = sum(L.get("n", 0) for s in pl["shots"] for L in s["layers"])
    print(f"页面 → index.html：{len(pl['shots'])} 个镜头，{pl['dur']:.2f} 秒（{pl['bpm'] or '—'} BPM），录像帧 {n_frames} 张，画面事件 {len(pl['ev'])} 个")
    for w in warn:
        print("⚠", w)


if __name__ == "__main__":
    main()
