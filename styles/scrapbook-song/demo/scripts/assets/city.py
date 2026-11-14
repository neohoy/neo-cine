# 来自《风吹新竹》MV 工程的 scripts/handdrawn/city.py。未改动。
"""The night street shared by frame 3 (windows light up) and frame 4 (windows blow out, zoom into the last one).

One deterministic window table + light schedule, so f4 opens on exactly the picture f3 ended on.
"""
import math
import random

from hd_lib import *  # noqa: F401,F403
from hd_people import *  # noqa: F401,F403

BUILDINGS = [  # x1, x2, top, facade colour, roof kind, seed  (= the confirmed sketch)
    (40, 440, 360, "#5B3A8C", "tank", 1),
    (440, 820, 250, "#3A4A9C", "antenna", 2),
    (820, 1180, 420, "#1F6F6A", "ac", 3),
    (1180, 1540, 300, "#9A3F3A", "slant", 4),
    (1540, 1900, 440, "#8E2F5C", "tank", 5),
]
BOTTOM = 905
WW, WH = 62, 74
DARK = "#141838"
LIT_COLORS = [YEL, YEL, YEL, ORANGE, PINK, TEAL, WHITE]

# walker path in frame-3 local time: enters from the right, ends left of centre
WALK = {"x0": 2050, "t0": 0.6, "x1": 760, "t1": 6.6, "y": 1000}
F3_DUR = 6.617
F3_BEATS = [0.0, 0.603, 1.184, 1.811, 2.415, 3.018, 3.599, 4.203, 4.806, 5.41, 6.014, 6.617]   # track beats − 14.118
F3_SNARE = 5.967
CHOSEN = (3, 1, 1)   # building, column, row of the last lit window (zoomed into in f4)


def _half_beats():
    out = []
    for a, b in zip(F3_BEATS, F3_BEATS[1:]):
        out += [a, (a + b) / 2]
    return out + [F3_BEATS[-1]]


HALF = _half_beats()


def walker_x(t):
    w = WALK
    if t <= w["t0"]:
        return w["x0"]
    if t >= w["t1"]:
        return w["x1"]
    return w["x0"] - (w["x0"] - w["x1"]) * (t - w["t0"]) / (w["t1"] - w["t0"])


def windows():
    """Every window with its colour, silhouette and frame-3 light time (None = stays dark)."""
    out = []
    for bi, (x1, x2, top, color, roof, seed) in enumerate(BUILDINGS):
        rr = random.Random(seed * 101)
        cols = max(1, int((x2 - x1 - 50) // 96))
        x0 = x1 + (x2 - x1 - (cols * 96 - 34)) / 2
        row, y = 0, top + 48
        while y + WH < BOTTOM - 20:
            for c in range(cols):
                wx = x0 + c * 96
                xc = wx + WW / 2
                lit_col = rr.choice(LIT_COLORS)
                sil = rr.choice(["desk", "cat", "plant"]) if rr.random() < 0.24 else None
                roll = rr.random()
                chosen = (bi, c, row) == CHOSEN
                t_light = None
                if xc >= WALK["x1"]:
                    tc = WALK["t0"] + (WALK["x0"] - xc) / (WALK["x0"] - WALK["x1"]) * (WALK["t1"] - WALK["t0"])
                    snapped = next((h for h in HALF if h >= tc - 0.05 and h >= 0.9), F3_SNARE)
                    if roll < 0.88 or chosen:
                        t_light = snapped
                    elif tc <= F3_SNARE:
                        t_light = F3_SNARE
                elif roll < 0.22:
                    t_light = rr.choice([h for h in HALF if 1.2 <= h <= 6.0])
                if chosen:
                    lit_col, sil = YEL, None
                out.append({"id": len(out), "b": bi, "c": c, "r": row, "x": round(wx, 1), "y": y, "xc": round(xc, 1),
                            "color": lit_col, "sil": sil, "t": t_light, "chosen": chosen})
            y += 112
            row += 1
    return out


WINDOWS = windows()


def chosen_window():
    return next(w for w in WINDOWS if w["chosen"])


def lit_at_f3_end(w):
    return w["t"] is not None and w["t"] <= F3_DUR + 1e-6


def win_sil(kind, wx, wy, ww=WW, wh=WH):
    if kind == "desk":
        return (f'<circle cx="{wx + ww * .42:.0f}" cy="{wy + wh * .42:.0f}" r="{ww * .14:.0f}" fill="{INK}" opacity=".85"/>'
                f'<ellipse cx="{wx + ww * .42:.0f}" cy="{wy + wh * .8:.0f}" rx="{ww * .26:.0f}" ry="{wh * .15:.0f}" fill="{INK}" opacity=".85"/>'
                f'<rect x="{wx + ww * .62:.0f}" y="{wy + wh * .6:.0f}" width="{ww * .26:.0f}" height="{wh * .16:.0f}" fill="{INK}" opacity=".6"/>')
    if kind == "cat":
        cx, cy = wx + ww * .5, wy + wh * .78
        return (f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{ww * .2:.0f}" ry="{wh * .13:.0f}" fill="{INK}" opacity=".85"/>'
                f'<circle cx="{cx:.0f}" cy="{cy - wh * .2:.0f}" r="{ww * .12:.0f}" fill="{INK}" opacity=".85"/>'
                f'<path d="M{cx - ww * .11:.0f},{cy - wh * .26:.0f} l{ww * .04:.0f},{-wh * .12:.0f} l{ww * .06:.0f},{wh * .08:.0f} M{cx + ww * .11:.0f},{cy - wh * .26:.0f} l{-ww * .04:.0f},{-wh * .12:.0f} l{-ww * .06:.0f},{wh * .08:.0f}" fill="{INK}" opacity=".85"/>')
    if kind == "plant":
        return (f'<rect x="{wx + ww * .38:.0f}" y="{wy + wh * .7:.0f}" width="{ww * .24:.0f}" height="{wh * .2:.0f}" fill="{ORANGE}" stroke="{INK}" stroke-width="3"/>'
                + "".join(f'<ellipse cx="{wx + ww * (.5 + dx):.0f}" cy="{wy + wh * .58:.0f}" rx="{ww * .08:.0f}" ry="{wh * .16:.0f}" transform="rotate({a} {wx + ww * (.5 + dx):.0f} {wy + wh * .58:.0f})" fill="{BAMBOO}" stroke="{INK}" stroke-width="3"/>' for dx, a in ((-.1, -25), (0, 0), (.1, 25))))
    return ""


def roof(x1, x2, top, kind):
    if kind == "tank":
        return (f'<rect x="{x1 + 40}" y="{top - 70}" width="70" height="56" rx="8" fill="#5A6070" stroke="{INK}" stroke-width="{LW}"/>'
                f'<path d="M{x1 + 50},{top - 14} L{x1 + 44},{top} M{x1 + 100},{top - 14} L{x1 + 106},{top}" stroke="{INK}" stroke-width="{LW}"/>')
    if kind == "antenna":
        m = (x1 + x2) // 2
        return (f'<path d="M{m},{top} L{m},{top - 110} M{m - 30},{top - 80} L{m + 30},{top - 80}" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round"/>'
                f'<circle cx="{m}" cy="{top - 114}" r="9" fill="{RED}" stroke="{INK}" stroke-width="4"/>')
    if kind == "slant":
        return f'<polygon points="{x1 - 14},{top + 2} {x2 + 14},{top + 2} {x2 - 30},{top - 70} {x1 + 30},{top - 70}" fill="{RED}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>'
    if kind == "ac":
        return (f'<rect x="{x2 - 120}" y="{top - 46}" width="80" height="46" fill="#C9C2B0" stroke="{INK}" stroke-width="{LW}"/>'
                f'<circle cx="{x2 - 80}" cy="{top - 23}" r="13" fill="none" stroke="{INK}" stroke-width="4"/>')
    return ""


def buildings_svg(p, lit_fn):
    """Each building in its own <g id="{p}-b{i}">; each window = dark pane + lit overlay <g id="{p}-w{n}">."""
    out = []
    for bi, (x1, x2, top, color, kind, _seed) in enumerate(BUILDINGS):
        g = [f'<rect x="{x1}" y="{top}" width="{x2 - x1}" height="{BOTTOM - top}" fill="{color}" stroke="{INK}" stroke-width="{LW}"/>', roof(x1, x2, top, kind)]
        for w in (w for w in WINDOWS if w["b"] == bi):
            g.append(f'<rect x="{w["x"]:.0f}" y="{w["y"]}" width="{WW}" height="{WH}" rx="4" fill="{DARK}" stroke="{INK}" stroke-width="5"/>')
            lit = (f'<rect x="{w["x"]:.0f}" y="{w["y"]}" width="{WW}" height="{WH}" rx="4" fill="{w["color"]}" stroke="{INK}" stroke-width="5"/>'
                   + (win_sil(w["sil"], w["x"], w["y"]) if w["sil"] else ""))
            g.append(f'<g id="{p}-w{w["id"]}" opacity="{1 if lit_fn(w) else 0}">{lit}</g>')
        out.append(f'<g id="{p}-b{bi}">{"".join(g)}</g>')
    return "".join(out)


def street_svg():
    return (f'<rect x="0" y="{BOTTOM}" width="1920" height="{1080 - BOTTOM}" fill="#2C3166"/><line x1="0" y1="{BOTTOM}" x2="1920" y2="{BOTTOM}" stroke="{INK}" stroke-width="{LW}"/>'
            + "".join(f'<line x1="{x}" y1="990" x2="{x + 70}" y2="990" stroke="{WHITE}" stroke-width="6" opacity=".35" stroke-linecap="round"/>' for x in range(40, 1920, 180)))


STARS = [(140, 120, 16), (420, 70, 12), (980, 110, 18), (1260, 60, 12), (1500, 170, 14), (760, 190, 10)]
MOON = f'<path d="M1720,90 A72,72 0 1,0 1720,234 A96,96 0 0,1 1720,90Z" fill="{YEL}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>'


def walker_parts(coat=ORANGE):
    """Grown-up protagonist walking LEFT with a suitcase (local origin = between the feet)."""
    return {
        "scarf": shape("M-8,-200 C-60,-214 -110,-190 -164,-208 C-134,-172 -84,-170 -12,-180Z", YEL),
        "case": (f'<rect x="78" y="-112" width="76" height="104" rx="10" transform="rotate(10 116 -60)" fill="{RED}" stroke="{INK}" stroke-width="{LW}"/>'
                 f'<path d="M84,-118 L72,-150 L60,-148" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>'
                 f'<circle cx="88" cy="-2" r="9" fill="{INK}"/><circle cx="148" cy="8" r="9" fill="{INK}"/>'),
        "legsA": (thick("M12,-64 L40,-8", NAVY, 24) + thick("M-10,-64 L-44,-8", NAVY, 24)
                  + f'<ellipse cx="-50" cy="-4" rx="20" ry="10" fill="{INK}"/><ellipse cx="46" cy="-4" rx="20" ry="10" fill="{INK}"/>'),
        "legsB": (thick("M10,-64 L18,-6", NAVY, 24) + thick("M-8,-64 L-20,-6", NAVY, 24)
                  + f'<ellipse cx="-26" cy="-2" rx="20" ry="10" fill="{INK}"/><ellipse cx="24" cy="-2" rx="20" ry="10" fill="{INK}"/>'),
        "body": (shape("M-40,-204 C-50,-150 -52,-100 -48,-58 L46,-58 C48,-110 42,-160 30,-204Z", coat)
                 + thick("M22,-184 L58,-148", coat, 22) + f'<circle cx="62" cy="-146" r="11" fill="{SKIN}" stroke="{INK}" stroke-width="5"/>'
                 + thick("M-24,-184 L-52,-132", coat, 20) + f'<circle cx="-54" cy="-128" r="11" fill="{SKIN}" stroke="{INK}" stroke-width="5"/>'
                 + shape("M-34,-210 C-14,-196 12,-196 30,-210 L32,-194 C12,-180 -14,-180 -36,-194Z", YEL)
                 + f'<ellipse cx="8" cy="-250" rx="50" ry="48" fill="{HAIR}" stroke="{INK}" stroke-width="{LW}"/>'
                 + f'<circle cx="-4" cy="-246" r="44" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>'
                 + shape("M-50,-262 C-40,-300 20,-306 48,-276 C40,-262 20,-258 4,-270 C-6,-256 -30,-252 -50,-262Z", HAIR)
                 + shape("M-46,-276 C-80,-290 -110,-276 -136,-290 C-112,-258 -80,-256 -48,-260Z", HAIR)
                 + shape("M-48,-246 q-16,8 -4,22", SKIN)
                 + f'<ellipse cx="-24" cy="-246" rx="6" ry="9" fill="{INK}"/><ellipse cx="-22" cy="-226" rx="9" ry="6" fill="{PINK}" opacity=".7"/>'),
    }
