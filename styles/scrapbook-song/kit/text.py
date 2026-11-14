"""简体 / 繁体：每个镜头写出时，把所有 <text> 的内容统一转成全片的字形。

mv.json 的 "script"：zh-Hans（默认，简体）或 zh-Hant（繁体，台湾正体）。镜头脚本里的字简繁都可以写；
转换用 OpenCC（s2tw：能分清「裡面 / 公里」「著 / 着」；简体片用 t2s；mv.json 的 "opencc" 可以指定别的配置）。
整句转换，不逐字转换（转换要靠上下文）。
OpenCC 是按需安装的包（opencc-python-reimplemented）：繁体片才必须装，装在工程的 .pylib/ 里，见 ../PRODUCTION.md。
缺字检查不在这里：tools/fonts.py 切子集时按实际印出来的字逐个核对。
来自《风吹新竹》MV 工程，本库把缺字检查挪到了 tools/fonts.py。
"""
import re

import project

SCRIPT = project.CONFIG.get("script", "zh-Hans")
OPENCC = project.CONFIG.get("opencc") or ("s2tw" if SCRIPT == "zh-Hant" else "t2s")
_cc = None


def convert(s):
    global _cc
    if _cc is None:
        try:
            from opencc import OpenCC
            _cc = OpenCC(OPENCC)
        except ImportError:
            if SCRIPT == "zh-Hant":
                raise SystemExit("繁体片要用 OpenCC：.venv/bin/python -m pip install --target <工程>/.pylib opencc-python-reimplemented"
                                 "（tools/build.py 会把 .pylib 加进路径）")
            _cc = False   # 简体片、脚本本来就写简体：不用转
    return _cc.convert(s) if _cc else s


def convert_svg(svg):
    """转换每个 <text> 节点的内容（属性和 id 不动）。"""
    return re.sub(r"(<text\b[^>]*>)([^<]+)(</text>)", lambda m: m.group(1) + convert(m.group(2)) + m.group(3), svg)
