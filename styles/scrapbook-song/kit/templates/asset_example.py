"""素材模块示例（复制到 scripts/assets/_example.py；"_" 开头的文件素材表会跳过）。复制成比如 scripts/assets/cast.py，
在里面画这首歌自己的角色和道具。

每样东西写成一个函数，围绕它自己的原点画（底部 / 脚落在 (0, 0)），在镜头里用 tr(x, y, s, thing()) 摆位置，
或者包一层 <g> 来动。用 draw.py 的铅笔画，不要贴另一首歌的画。
"""
from draw import *  # noqa: F401,F403


def hero(eye="open", mouth_kind="smile", wind=-.4, arms="down"):
    """主角：从歌词里定发型、衣服和一个标志色（谁在唱、多大、带着什么）。"""
    r = 80
    return person_front(0, -r * (2.9 + 1.5), r, hair="short", top=TEAL, bottom=NAVY, scarf=None,
                        eye=eye, mouth_kind=mouth_kind, arms=arms, wind=wind)


def paper_boat(fill=WHITE):
    """直接来自某句歌词的道具：几块形状 + 墨线 + 一笔高光。"""
    return (shape("M-120,-40 L120,-40 L80,0 L-80,0Z", fill)
            + shape("M-60,-40 L0,-150 L60,-40Z", YEL)
            + line(-90, -20, 70, -20, 4, INK, .4))


SHEET = [   # (名字, svg)：素材表会量出每件的大小，缩放后放进格子
    ("主角 · 正面", hero()),
    ("主角 · 大笑", hero("happy", "laugh", arms="up")),
    ("纸船", paper_boat()),
]
