#!/usr/bin/env python3
"""影片自己的字体：下载（第一次）并按片子里实际印出来的字切子集 → <工程>/fonts/title.ttf、small.ttf；缺字就停。

    .venv/bin/python styles/game-launch/kit/tools/fonts.py <工程>
    .venv/bin/python styles/game-launch/kit/tools/fonts.py <工程> --list      列出能选的字体

字幕牌的标题字（look.title.font）和小字（look.small.font）从下面这张表里选，全是 SIL Open Font License 1.1，
下载地址固定到一个版本或提交，完整文件放在 <工程>/out/fonts-src/（不进 git），子集和许可文本放在 <工程>/fonts/。
不用系统字体（苹方、冬青黑体、微软雅黑）：字体文件跟着工程走，Mac 和渲染台式机（Windows）渲出来一样。
按游戏 Logo 和 UI 的字形挑（STYLE.md §4）：斜笔画、硬朗的选得意黑，方块像素感的选站酷庆科黄油体，圆润可爱的选站酷快乐体，
古风、仙侠的选马善政毛笔楷书或思源宋体，其他的选思源黑体。标题字缺的字（箭头、少见的字）由小字接上；两种都缺就停。
"""
import io
import json
import os
import subprocess
import sys
import zipfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from lib import load, die  # noqa: E402

GF = "https://raw.githubusercontent.com/google/fonts/86aced91de05cd4f96a06838124cca45be337b2b/ofl"
FONTS = {  # 名字 → 说明、下载、许可
    "smiley": {"name": "得意黑 Smiley Sans Oblique", "zip": "https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip",
               "member": "SmileySans-Oblique.ttf", "license": "https://raw.githubusercontent.com/atelier-anchor/smiley-sans/v2.0.1/LICENSE",
               "credit": "Smiley Sans (得意黑) v2.0.1, Copyright (c) 2022--2024, atelierAnchor, with Reserved Font Name <Smiley> and <得意黑>, SIL OFL 1.1", "fit": "斜体、硬朗：动作、冒险、二次元 RPG"},
    "notosanssc": {"name": "思源黑体 Noto Sans SC", "url": f"{GF}/notosanssc/NotoSansSC%5Bwght%5D.ttf", "license": f"{GF}/notosanssc/OFL.txt",
                   "credit": "Noto Sans SC, (c) 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source', SIL OFL 1.1",
                   "fit": "通用黑体：小字、行动号召", "variable": True},
    "notoserifsc": {"name": "思源宋体 Noto Serif SC", "url": f"{GF}/notoserifsc/NotoSerifSC%5Bwght%5D.ttf", "license": f"{GF}/notoserifsc/OFL.txt",
                    "credit": "Noto Serif SC, (c) 2017-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source', SIL OFL 1.1",
                    "fit": "宋体：古风、剧情向、文字冒险", "variable": True},
    "zcoolqingke": {"name": "站酷庆科黄油体 ZCOOL QingKe HuangYou", "url": f"{GF}/zcoolqingkehuangyou/ZCOOLQingKeHuangYou-Regular.ttf",
                    "license": f"{GF}/zcoolqingkehuangyou/OFL.txt", "credit": "ZCOOL QingKe HuangYou, (c) ZCOOL, SIL OFL 1.1",
                    "fit": "方正粗块：像素风、复古街机、策略"},
    "zcoolkuaile": {"name": "站酷快乐体 ZCOOL KuaiLe", "url": f"{GF}/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf", "license": f"{GF}/zcoolkuaile/OFL.txt",
                    "credit": "ZCOOL KuaiLe, (c) ZCOOL, SIL OFL 1.1", "fit": "圆润可爱：休闲、模拟经营、萌系"},
    "mashanzheng": {"name": "马善政毛笔楷书 Ma Shan Zheng", "url": f"{GF}/mashanzheng/MaShanZheng-Regular.ttf", "license": f"{GF}/mashanzheng/OFL.txt",
                    "credit": "Ma Shan Zheng, (c) Ma ShanZheng, SIL OFL 1.1", "fit": "毛笔：武侠、仙侠、国风"},
}


def get(url, dst, P):
    if os.path.exists(dst) and os.path.getsize(dst):
        return
    r = subprocess.run(["curl", "-fsSL", "-g", "--retry", "2", "-o", dst + ".part", url])
    if r.returncode:
        die(f"下载失败：{url}（没联网，或者要走代理？curl 认 https_proxy）")
    os.replace(dst + ".part", dst)
    print("↓", os.path.relpath(dst, P))


def fetch(key, P):
    f = FONTS.get(key)
    if not f:
        die(f"不认识的字体 {key!r}：可选 {', '.join(FONTS)}（--list 看说明）")
    src = os.path.join(P, "out", "fonts-src")
    os.makedirs(src, exist_ok=True)
    os.makedirs(os.path.join(P, "fonts"), exist_ok=True)
    path_ = os.path.join(src, f"{key}.ttf")
    if "zip" in f:
        z = os.path.join(src, f"{key}.zip")
        get(f["zip"], z, P)
        if not os.path.exists(path_):
            with zipfile.ZipFile(z) as zf:
                open(path_, "wb").write(zf.read(f["member"]))
    else:
        get(f["url"], path_, P)
    get(f["license"], os.path.join(P, "fonts", f"OFL-{key}.txt"), P)
    return path_


def strings(cfg):
    """片子里印出来的字：标题字印的、小字印的。"""
    title, small = set(), set()
    for s in cfg.get("shots") or []:
        for p in s.get("plates") or []:
            title |= set(p["text"])
        fin = s.get("finale") or {}
        for c in fin.get("cta") or []:
            (title if c.get("style", "title") == "title" else small).update(c["text"])
        card = s.get("card") or {}
        lines = card.get("lines") or []
        if lines:
            title |= set(lines[0])
            small |= set("".join(lines[1:]))
    strip = set("[]{}\n")
    return title - strip, small - strip


def main():
    if "--list" in sys.argv:
        for k, f in FONTS.items():
            print(f"{k:13} {f['name']}：{f['fit']}")
        return
    P, cfg = load(sys.argv[1] if len(sys.argv) > 1 else ".")
    look = cfg.get("look") or {}
    tk = (look.get("title") or {}).get("font", "smiley")
    sk = (look.get("small") or {}).get("font", "notosanssc")
    tf, sf = fetch(tk, P), fetch(sk, P)
    title, small = strings(cfg)
    from fontTools.ttLib import TTFont
    from fontTools import subset
    from fontTools.varLib import instancer

    def font(key, path_, weight):
        f = TTFont(path_)
        if FONTS[key].get("variable") and "fvar" in f:
            f = instancer.instantiateVariableFont(f, {"wght": weight})
        return f
    tw = (look.get("title") or {}).get("weight", 700)
    sw = (look.get("small") or {}).get("weight", 600)
    T, S = font(tk, tf, tw), font(sk, sf, sw)
    tc, sc = T.getBestCmap(), S.getBestCmap()
    fallback = {c for c in title if not c.isspace() and ord(c) not in tc}
    miss = sorted(c for c in (small | fallback) if not c.isspace() and ord(c) not in sc)
    if miss:
        die(f"两种字体都没有这些字：{''.join(miss)}（换个说法，或者换字体：fonts.py --list）")
    if fallback:
        print(f"标题字 {FONTS[tk]['name']} 没有「{''.join(sorted(fallback))}」，由小字 {FONTS[sk]['name']} 接上")

    def cut(f, chars, out):
        o = subset.Options()
        o.layout_features = ["*"]
        o.hinting = False
        sub = subset.Subsetter(o)
        sub.populate(text="".join(sorted(chars | set(" "))))
        sub.subset(f)
        f.save(out)
        print(f"{os.path.basename(out)}：{len(chars)} 个字 → {os.path.getsize(out) // 1024} KB")
    cut(T, {c for c in title if ord(c) in tc}, os.path.join(P, "fonts", "title.ttf"))
    cut(S, small | fallback | set("0123456789"), os.path.join(P, "fonts", "small.ttf"))
    json.dump({"title": FONTS[tk]["credit"], "small": FONTS[sk]["credit"]}, open(os.path.join(P, "fonts", "fonts.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
