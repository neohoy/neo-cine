# 手账歌谣工具包 · 铅笔：描边形状、脸、参数化的人（正面 / 侧面走路 / 背影 / 骑车）、天气、植物、通用房子和楼。
# 来自《风吹新竹》MV 工程。每首歌自己的角色和道具画在工程的 scripts/assets/。
"""Construction kit for drawing a song's OWN cast, props and places in the cel style.

Nothing here belongs to a particular song. Each MV designs its cast and props from its lyrics (see
references/歌词转画面.md) and draws them as functions in the project's scripts/assets/; these helpers are the
pencil: outlined shapes, faces, parametric people, sky / weather / plants, a few generic buildings.
Rules every drawing keeps: 7px ink outline (LW), flat fills, no gradients, hard ink shadows, round joins.
"""
import math
import random

from hd_lib import *  # noqa: F401,F403  (palette, LW, T, puff, leaf, sparkle, …)

SKIN, HAIR, HAIRH, NAVY = "#F6D2B0", "#2B2522", "#6A5A50", "#2F4FA0"
BROWN, WOOD, STONE, GREY = "#8A5A3B", "#B7804F", "#9C9585", "#C9C2B0"
DUSK, PLUM, SLATE, GLASS = "#5B3A8C", "#3B3570", "#5E6B8A", "#7FC8D8"


# ================================================================== pencil
def shape(d, fill, lw=LW, op=1):
    """Any closed path, flat fill + ink outline."""
    return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{lw:.1f}" stroke-linejoin="round" stroke-linecap="round" opacity="{op}"/>'


def thick(d, color, w, lw=LW):
    """An outlined thick stroke — limbs, scarves, strands, roads, rivers."""
    return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w + 2 * lw:.1f}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w:.1f}" stroke-linecap="round" stroke-linejoin="round"/>')


def circle(cx, cy, r, fill, lw=LW):
    return f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="{fill}" stroke="{INK}" stroke-width="{lw:.1f}"/>'


def ellipse(cx, cy, rx, ry, fill, lw=LW, rot=0):
    t = f' transform="rotate({rot} {cx:.0f} {cy:.0f})"' if rot else ""
    return f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{rx:.0f}" ry="{ry:.0f}" fill="{fill}" stroke="{INK}" stroke-width="{lw:.1f}"{t}/>'


def rect(x, y, w, h, fill, rx=0, lw=LW):
    return f'<rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{rx}" fill="{fill}" stroke="{INK}" stroke-width="{lw:.1f}"/>'


def poly(points, fill, lw=LW):
    pts = " ".join(f"{x:.0f},{y:.0f}" for x, y in points)
    return f'<polygon points="{pts}" fill="{fill}" stroke="{INK}" stroke-width="{lw:.1f}" stroke-linejoin="round"/>'


def line(x1, y1, x2, y2, w=LW, color=INK, op=1):
    return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{color}" stroke-width="{w}" stroke-linecap="round" opacity="{op}"/>'


def shadow_box(x, y, w, h, fill, rx=10, off=10):
    """A card / board / sign body with the hard ink drop shadow."""
    return (f'<rect x="{x + off:.0f}" y="{y + off + 2:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{rx}" fill="{INK}"/>'
            + rect(x, y, w, h, fill, rx))


def drawable(id_, d, color=INK, w=LW):
    """A stroke that can be drawn on with JS drawOn() (pathLength=1 trick)."""
    return (f'<path id="{id_}" d="{d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" fill="none" '
            f'stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')


def tr(x, y, s=1.0, inner="", rot=0):
    r = f" rotate({rot})" if rot else ""
    return f'<g transform="translate({x:.0f},{y:.0f}){r} scale({s})">{inner}</g>'


# ================================================================== faces
def eyes(cx, cy, r, kind="open"):
    """kind: open / closed / happy (^ ^) / wink / sad. Eyes sit at cy + .14r, ±.36r apart."""
    out, ex, ey, w = [], r * .36, cy + r * .14, LW * .9
    for sx in (-1, 1):
        x = cx + sx * ex
        k = kind if not (kind == "wink" and sx == 1) else "closed"
        if k == "open" or kind == "wink" and sx == -1:
            out.append(f'<ellipse cx="{x:.0f}" cy="{ey:.0f}" rx="{r * .085:.1f}" ry="{r * .13:.1f}" fill="{INK}"/>'
                       f'<circle cx="{x + r * .03:.0f}" cy="{ey - r * .05:.0f}" r="{r * .03:.1f}" fill="{WHITE}"/>')
        elif k == "closed":
            out.append(f'<path d="M{x - r * .13:.1f},{ey + r * .04:.1f} Q{x:.1f},{ey - r * .12:.1f} {x + r * .13:.1f},{ey + r * .04:.1f}" fill="none" stroke="{INK}" stroke-width="{w:.1f}" stroke-linecap="round"/>')
        elif k == "happy":
            out.append(f'<path d="M{x - r * .13:.1f},{ey + r * .05:.1f} Q{x:.1f},{ey - r * .16:.1f} {x + r * .13:.1f},{ey + r * .05:.1f}" fill="none" stroke="{INK}" stroke-width="{w:.1f}" stroke-linecap="round"/>')
        elif k == "sad":
            out.append(f'<path d="M{x - r * .13:.1f},{ey - r * .02:.1f} Q{x:.1f},{ey + r * .1:.1f} {x + r * .13:.1f},{ey - r * .02:.1f}" fill="none" stroke="{INK}" stroke-width="{w:.1f}" stroke-linecap="round"/>'
                       f'<path d="M{x - sx * r * .16:.1f},{ey - r * .2:.1f} L{x + sx * r * .1:.1f},{ey - r * .26:.1f}" stroke="{INK}" stroke-width="{w * .7:.1f}" stroke-linecap="round"/>')
    return "".join(out)


def mouth(cx, cy, r, kind="smile"):
    """kind: smile / laugh / o / flat / sad."""
    if kind == "laugh":
        return (f'<path d="M{cx - r * .24:.1f},{cy + r * .44:.1f} Q{cx:.1f},{cy + r * .5:.1f} {cx + r * .24:.1f},{cy + r * .44:.1f} Q{cx + r * .2:.1f},{cy + r * .82:.1f} {cx:.1f},{cy + r * .82:.1f} Q{cx - r * .2:.1f},{cy + r * .82:.1f} {cx - r * .24:.1f},{cy + r * .44:.1f}Z" fill="{INK}"/>'
                f'<ellipse cx="{cx:.1f}" cy="{cy + r * .72:.1f}" rx="{r * .11:.1f}" ry="{r * .07:.1f}" fill="{PINK}"/>')
    if kind == "o":
        return f'<ellipse cx="{cx}" cy="{cy + r * .56:.0f}" rx="{r * .08:.1f}" ry="{r * .1:.1f}" fill="{INK}"/>'
    if kind == "flat":
        return line(cx - r * .12, cy + r * .56, cx + r * .12, cy + r * .56, LW * .8)
    q = r * (.42 if kind == "sad" else .64)
    return (f'<path d="M{cx - r * .14:.1f},{cy + r * .53:.1f} Q{cx:.1f},{cy + q:.1f} {cx + r * .14:.1f},{cy + r * .53:.1f}" '
            f'fill="none" stroke="{INK}" stroke-width="{LW * .8:.1f}" stroke-linecap="round"/>')


def blush(cx, cy, r, color=PINK):
    return "".join(f'<ellipse cx="{cx + sx * r * .56:.0f}" cy="{cy + r * .44:.0f}" rx="{r * .16:.1f}" ry="{r * .09:.1f}" fill="{color}" opacity=".7"/>' for sx in (-1, 1))


# ================================================================== people
HAIR_STYLES = ("bob", "long", "short", "bun", "cap")


def head(cx, cy, r, hair="bob", hair_color=HAIR, skin=SKIN, eye="open", mouth_kind="smile", wind=0.0, accent=None, part="all"):
    """A front-view head. hair ∈ HAIR_STYLES; wind -1…1 streams the hair sideways (− = to the left);
    accent = colour of a hair clip / cap brim / bun tie (None = none).
    part: "back" = only the hair behind the head (draw it before the body), "front" = face + bangs, "all" = both."""
    g = []
    sgn = -1 if wind < 0 else 1
    a = abs(wind)
    if hair in ("long", "bob") and a:
        for y0, L, w in ((-.95, 1.1, .2), (-.5, 1.45, .24), (.05, 1.2, .2), (.55, .9, .16)):
            x0, yy = cx + sgn * r * .95, cy + r * y0
            tip = x0 + sgn * r * L * a * (1.3 if hair == "long" else 1)
            g.append(shape(f"M{x0 - sgn * r * .1:.0f},{yy - r * w:.0f} C{x0 + sgn * r * L * .35 * a:.0f},{yy - r * w * 1.5:.0f} {tip - sgn * r * .3:.0f},{yy - r * w * .9:.0f} {tip:.0f},{yy - r * .12:.0f} "
                           f"C{tip - sgn * r * .35:.0f},{yy + r * w * .3:.0f} {x0 + sgn * r * L * .3 * a:.0f},{yy + r * w:.0f} {x0 - sgn * r * .1:.0f},{yy + r * w:.0f}Z", hair_color))
    if hair == "long":
        g.append(shape(f"M{cx - r * 1.08:.0f},{cy + r * .3:.0f} C{cx - r * 1.2:.0f},{cy - r * .95:.0f} {cx - r * .5:.0f},{cy - r * 1.5:.0f} {cx + r * .1:.0f},{cy - r * 1.48:.0f} "
                       f"C{cx + r * .9:.0f},{cy - r * 1.46:.0f} {cx + r * 1.22:.0f},{cy - r * .8:.0f} {cx + r * 1.1:.0f},{cy + r * .3:.0f} L{cx + r * 1.05:.0f},{cy + r * 1.5:.0f} L{cx - r * 1.05:.0f},{cy + r * 1.5:.0f}Z", hair_color))
    elif hair in ("bob", "bun"):
        g.append(shape(f"M{cx - r * 1.06:.0f},{cy + r * .15:.0f} C{cx - r * 1.18:.0f},{cy - r * .95:.0f} {cx - r * .5:.0f},{cy - r * 1.55:.0f} {cx + r * .12:.0f},{cy - r * 1.52:.0f} "
                       f"C{cx + r * .9:.0f},{cy - r * 1.5:.0f} {cx + r * 1.25:.0f},{cy - r * .85:.0f} {cx + r * 1.12:.0f},{cy + r * .2:.0f} "
                       f"C{cx + r * 1.0:.0f},{cy + r * .8:.0f} {cx - r * 1.0:.0f},{cy + r * .8:.0f} {cx - r * 1.06:.0f},{cy + r * .15:.0f}Z", hair_color))
        if hair == "bun":
            g.append(circle(cx, cy - r * 1.55, r * .42, hair_color))
            if accent:
                g.append(rect(cx - r * .3, cy - r * 1.25, r * .6, r * .16, accent, 3, LW * .6))
    else:  # short / cap
        g.append(shape(f"M{cx - r * 1.0:.0f},{cy - r * .05:.0f} C{cx - r * 1.05:.0f},{cy - r * 1.0:.0f} {cx - r * .4:.0f},{cy - r * 1.42:.0f} {cx + r * .2:.0f},{cy - r * 1.38:.0f} "
                       f"C{cx + r * .9:.0f},{cy - r * 1.3:.0f} {cx + r * 1.1:.0f},{cy - r * .8:.0f} {cx + r * 1.0:.0f},{cy - r * .05:.0f}Z", hair_color))
    back, g = g, []
    if part == "back":
        return "".join(back)
    g.append(ellipse(cx, cy + r * .08, r * .95, r * .9, skin))
    if hair == "cap":
        c = accent or RED
        g.append(shape(f"M{cx - r * 1.0:.0f},{cy - r * .25:.0f} C{cx - r * 1.0:.0f},{cy - r * 1.3:.0f} {cx + r * 1.0:.0f},{cy - r * 1.3:.0f} {cx + r * 1.0:.0f},{cy - r * .25:.0f}Z", c))
        g.append(shape(f"M{cx - r * .2:.0f},{cy - r * .3:.0f} L{cx - r * 1.6:.0f},{cy - r * .2:.0f} L{cx - r * 1.5:.0f},{cy - r * .05:.0f} L{cx - r * .2:.0f},{cy - r * .1:.0f}Z", c))
    else:
        g.append(shape(f"M{cx - r * .96:.0f},{cy - r * .1:.0f} C{cx - r * .9:.0f},{cy - r * .95:.0f} {cx - r * .1:.0f},{cy - r * 1.22:.0f} {cx + r * .45:.0f},{cy - r * 1.12:.0f} "
                       f"C{cx + r * .9:.0f},{cy - r * 1.02:.0f} {cx + r * 1.05:.0f},{cy - r * .62:.0f} {cx + r * .98:.0f},{cy - r * .12:.0f} "
                       f"C{cx + r * .72:.0f},{cy - r * .42:.0f} {cx + r * .42:.0f},{cy - r * .38:.0f} {cx + r * .26:.0f},{cy - r * .6:.0f} "
                       f"C{cx + r * .06:.0f},{cy - r * .36:.0f} {cx - r * .3:.0f},{cy - r * .34:.0f} {cx - r * .5:.0f},{cy - r * .56:.0f} "
                       f"C{cx - r * .62:.0f},{cy - r * .3:.0f} {cx - r * .8:.0f},{cy - r * .22:.0f} {cx - r * .96:.0f},{cy - r * .1:.0f}Z", hair_color))
        if accent and hair in ("long", "bob"):
            g.append(circle(cx + r * .62, cy - r * .72, r * .16, accent, LW * .7))
    g.append(eyes(cx, cy, r, eye) + blush(cx, cy, r) + mouth(cx, cy, r, mouth_kind))
    return "".join(g) if part == "front" else "".join(back + g)


def person_front(cx, cy, r, hair="bob", hair_color=HAIR, skin=SKIN, top=WHITE, bottom=NAVY, scarf=None,
                 eye="open", mouth_kind="smile", arms="down", legs=1.0, wind=0.0, accent=None, tb=2.9):
    """Full-body front view; head radius r centred at (cx, cy); feet at cy + r·(tb + 1.5·legs).
    arms: down / up (cheering) / wave (one up) / hold (both forward, hands at chest — for a cup, a phone…).
    scarf: colour or None; with wind ≠ 0 its tail streams to that side."""
    g, top_y, bot = [head(cx, cy, r, hair, hair_color, skin, wind=wind, accent=accent, part="back")], cy + r * 1.0, cy + r * tb
    leg_b = bot + r * 1.5 * legs
    for sx in (-1, 1):
        g.append(thick(f"M{cx + sx * r * .38:.0f},{bot - r * .1:.0f} L{cx + sx * r * .42:.0f},{leg_b:.0f}", bottom, r * .42))
        g.append(f'<ellipse cx="{cx + sx * r * .5:.0f}" cy="{leg_b + r * .08:.0f}" rx="{r * .3:.0f}" ry="{r * .14:.0f}" fill="{INK}"/>')

    def arm(sx, kind):
        sh = (cx + sx * r * .8, top_y + r * .4)
        if kind == "up":
            hand = (cx + sx * r * 1.4, top_y - r * 1.1)
            d = f"M{sh[0]:.0f},{sh[1]:.0f} C{cx + sx * r * 1.2:.0f},{top_y:.0f} {cx + sx * r * 1.4:.0f},{top_y - r * .5:.0f} {hand[0]:.0f},{hand[1]:.0f}"
        elif kind == "hold":
            hand = (cx + sx * r * .35, top_y + r * 1.0)
            d = f"M{sh[0]:.0f},{sh[1]:.0f} C{cx + sx * r * 1.1:.0f},{top_y + r * .9:.0f} {cx + sx * r * .8:.0f},{top_y + r * 1.1:.0f} {hand[0]:.0f},{hand[1]:.0f}"
        else:
            hand = (cx + sx * r * 1.1, top_y + r * 1.85)
            d = f"M{sh[0]:.0f},{sh[1]:.0f} C{cx + sx * r * 1.1:.0f},{top_y + r * .9:.0f} {cx + sx * r * 1.15:.0f},{top_y + r * 1.4:.0f} {hand[0]:.0f},{hand[1]:.0f}"
        return thick(d, top, r * .34) + circle(hand[0], hand[1], r * .17, skin, LW * .8)

    kinds = {"down": ("down", "down"), "up": ("up", "up"), "wave": ("down", "up"), "hold": ("hold", "hold")}[arms]
    body = shape(f"M{cx - r * .85:.0f},{bot:.0f} C{cx - r * .9:.0f},{top_y + r * .5:.0f} {cx - r * .6:.0f},{top_y:.0f} {cx:.0f},{top_y:.0f} "
                 f"C{cx + r * .6:.0f},{top_y:.0f} {cx + r * .9:.0f},{top_y + r * .5:.0f} {cx + r * .85:.0f},{bot:.0f}Z", top)
    collar = f'<path d="M{cx - r * .25:.0f},{top_y + r * .06:.0f} L{cx:.0f},{top_y + r * .36:.0f} L{cx + r * .25:.0f},{top_y + r * .06:.0f}" fill="none" stroke="{INK}" stroke-width="{LW * .7:.1f}" stroke-linejoin="round"/>'
    arms_back = "".join(arm(sx, k) for sx, k in zip((-1, 1), kinds) if k != "hold")
    arms_front = "".join(arm(sx, k) for sx, k in zip((-1, 1), kinds) if k == "hold")
    g += [arms_back, body, collar, arms_front]
    if scarf:
        g.append(shape(f"M{cx - r * .55:.0f},{top_y - r * .08:.0f} C{cx - r * .2:.0f},{top_y + r * .14:.0f} {cx + r * .2:.0f},{top_y + r * .14:.0f} {cx + r * .55:.0f},{top_y - r * .08:.0f} "
                       f"L{cx + r * .58:.0f},{top_y + r * .2:.0f} C{cx + r * .2:.0f},{top_y + r * .4:.0f} {cx - r * .2:.0f},{top_y + r * .4:.0f} {cx - r * .58:.0f},{top_y + r * .2:.0f}Z", scarf))
        if wind:
            s = -1 if wind < 0 else 1
            L = 1.0 + 1.0 * abs(wind)
            g.append(shape(f"M{cx + s * r * .4:.0f},{top_y + r * .2:.0f} C{cx + s * r * .9:.0f},{top_y + r * .3:.0f} {cx + s * r * (L + .3):.0f},{top_y + r * .1:.0f} {cx + s * r * (L + .8):.0f},{top_y + r * .3:.0f} "
                           f"C{cx + s * r * (L + .4):.0f},{top_y + r * .55:.0f} {cx + s * r * .9:.0f},{top_y + r * .6:.0f} {cx + s * r * .4:.0f},{top_y + r * .5:.0f}Z", scarf))
    g.append(head(cx, cy, r, hair, hair_color, skin, eye, mouth_kind, wind, accent, part="front"))
    return "".join(g)


def feet_y(cy, r, legs=1.0, tb=2.9):
    """Where person_front's feet land — solve cy for a given floor: cy = floor − r·(tb + 1.5·legs)."""
    return cy + r * (tb + 1.5 * legs)


def person_side(top=WHITE, bottom=NAVY, hair="short", hair_color=HAIR, skin=SKIN, bag=None, bag_color=RED, scarf=None, accent=None):
    """Side view walking LEFT, origin between the feet, ~300 px tall at scale 1. Returns parts:
    legsA / legsB (two walk drawings to cycle), bag, scarf, body. Mirror with tr(..., s=-1) style
    transform="scale(-1,1)" on a wrapper to walk right. bag: None / school / case / bag."""
    out = {"scarf": shape("M-8,-200 C-60,-214 -110,-190 -164,-208 C-134,-172 -84,-170 -12,-180Z", scarf) if scarf else ""}
    if bag == "case":
        out["bag"] = (f'<rect x="78" y="-112" width="76" height="104" rx="10" transform="rotate(10 116 -60)" fill="{bag_color}" stroke="{INK}" stroke-width="{LW}"/>'
                      f'<path d="M84,-118 L72,-150 L60,-148" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>'
                      f'<circle cx="88" cy="-2" r="9" fill="{INK}"/><circle cx="148" cy="8" r="9" fill="{INK}"/>')
    elif bag == "school":
        out["bag"] = rect(22, -196, 58, 96, bag_color, 14) + rect(30, -150, 42, 30, INK, 6, 0)
    elif bag == "bag":
        out["bag"] = thick("M20,-190 C60,-150 60,-120 40,-96", BROWN, 8, 4) + rect(28, -110, 60, 54, bag_color, 10)
    else:
        out["bag"] = ""
    out["legsA"] = (thick("M12,-64 L40,-8", bottom, 24) + thick("M-10,-64 L-44,-8", bottom, 24)
                    + f'<ellipse cx="-50" cy="-4" rx="20" ry="10" fill="{INK}"/><ellipse cx="46" cy="-4" rx="20" ry="10" fill="{INK}"/>')
    out["legsB"] = (thick("M10,-64 L18,-6", bottom, 24) + thick("M-8,-64 L-20,-6", bottom, 24)
                    + f'<ellipse cx="-26" cy="-2" rx="20" ry="10" fill="{INK}"/><ellipse cx="24" cy="-2" rx="20" ry="10" fill="{INK}"/>')
    tail = {"long": shape("M40,-262 C80,-250 110,-200 96,-150 C70,-170 52,-210 34,-226Z", hair_color),
            "bob": shape("M-46,-276 C-80,-290 -110,-276 -136,-290 C-112,-258 -80,-256 -48,-260Z", hair_color)}.get(hair, "")
    behind = tail if hair == "long" else ""     # a long tail streams behind the head; a bob tuft flies in front
    front_tail = "" if hair == "long" else tail
    out["body"] = (behind + shape("M-40,-204 C-50,-150 -52,-100 -48,-58 L46,-58 C48,-110 42,-160 30,-204Z", top)
                   + thick("M22,-184 L58,-148", top, 22) + circle(62, -146, 11, skin, 5)
                   + thick("M-24,-184 L-52,-132", top, 20) + circle(-54, -128, 11, skin, 5)
                   + (shape("M-34,-210 C-14,-196 12,-196 30,-210 L32,-194 C12,-180 -14,-180 -36,-194Z", scarf) if scarf else "")
                   + ellipse(8, -250, 50, 48, hair_color) + circle(-4, -246, 44, skin)
                   + shape("M-50,-262 C-40,-300 20,-306 48,-276 C40,-262 20,-258 4,-270 C-6,-256 -30,-252 -50,-262Z", hair_color)
                   + front_tail + (circle(26, -282, 10, accent, 4) if accent else "")
                   + shape("M-48,-246 q-16,8 -4,22", skin)
                   + f'<ellipse cx="-24" cy="-246" rx="6" ry="9" fill="{INK}"/><ellipse cx="-22" cy="-226" rx="9" ry="6" fill="{PINK}" opacity=".7"/>')
    return out


def person_back(x, y, s=1.0, hair="bob", hair_color=HAIR, top=WHITE, scarf=None, accent=None):
    """Seen from behind (looking at a view), origin = seat / ground centre."""
    g = []
    if scarf:
        g.append(shape("M14,-90 C-20,-98 -50,-82 -84,-94 C-62,-70 -30,-66 10,-74Z", scarf))
    g.append(shape("M-46,0 C-48,-62 -24,-104 8,-104 C40,-104 64,-62 62,0Z", top))
    if scarf:
        g.append(shape("M-22,-100 C-2,-86 18,-86 38,-100 L40,-86 C20,-72 -2,-72 -24,-86Z", scarf))
    g.append(circle(8, -146, 44, hair_color))
    if hair == "long":
        g.append(shape("M-20,-160 C-40,-130 -40,-90 -30,-60 L46,-60 C56,-90 56,-130 36,-160Z", hair_color))
    if accent:
        g.append(circle(-14, -162, 8, accent, 4))
    return tr(x, y, s, "".join(g))


def bike(frame=YEL, rider_top=WHITE, rider_bottom=NAVY, hair_color=HAIR, skin=SKIN):
    """Bicycle + rider heading LEFT; origin = front hub, rear hub at (190, 0). Parts: wheels, frame, rider, legsA, legsB."""
    wheels = "".join(f'<circle cx="{wx}" cy="0" r="62" fill="none" stroke="{INK}" stroke-width="{LW}"/><circle cx="{wx}" cy="0" r="8" fill="{INK}"/>'
                     + "".join(line(wx, 0, wx + 58 * math.cos(math.radians(a)), 58 * math.sin(math.radians(a)), 2.5, INK, .6) for a in range(0, 360, 45))
                     for wx in (0, 190))
    path = "M0,0 L60,-96 L150,-96 L190,0 L100,0 L60,-96 M100,0 L150,-96"
    frm = (f'<path d="{path}" fill="none" stroke="{INK}" stroke-width="{13 + 2 * LW}" stroke-linejoin="round" stroke-linecap="round"/>'
           f'<path d="{path}" fill="none" stroke="{frame}" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/>'
           f'<path d="M60,-96 L50,-138 L22,-140" fill="none" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round"/>'
           f'<rect x="134" y="-118" width="44" height="14" rx="6" fill="{INK}"/>')
    rider = (shape("M110,-232 C96,-190 112,-140 136,-118 L174,-122 C170,-170 160,-210 150,-236Z", rider_top)
             + thick("M118,-216 C90,-190 60,-160 34,-140", rider_top, 22) + circle(30, -138, 12, skin, 5)
             + ellipse(128, -272, 44, 42, hair_color) + circle(116, -266, 40, skin)
             + shape("M74,-282 C84,-318 144,-322 166,-292 C150,-280 130,-276 116,-288 C104,-274 88,-272 74,-282Z", hair_color)
             + f'<ellipse cx="94" cy="-266" rx="6" ry="9" fill="{INK}"/><ellipse cx="96" cy="-246" rx="9" ry="6" fill="{PINK}" opacity=".7"/>')
    legsA = thick("M146,-122 L118,-70 L110,-20", rider_bottom, 24) + thick("M150,-120 L150,-64 L140,-36", rider_bottom, 22) + f'<ellipse cx="104" cy="-14" rx="18" ry="9" fill="{INK}"/>'
    legsB = thick("M146,-122 L96,-86 L84,-50", rider_bottom, 24) + thick("M150,-120 L132,-62 L118,-24", rider_bottom, 22) + f'<ellipse cx="80" cy="-46" rx="18" ry="9" fill="{INK}"/>'
    return {"wheels": wheels, "frame": frm, "rider": rider, "legsA": legsA, "legsB": legsB}


# ================================================================== sky, weather, plants
def sun(x, y, r, fill=ORANGE, rays=0):
    out = circle(x, y, r, fill)
    for k in range(rays):
        a = math.radians(-90 + 360 * k / rays)
        out += line(x + (r + 18) * math.cos(a), y + (r + 18) * math.sin(a), x + (r + 50) * math.cos(a), y + (r + 50) * math.sin(a))
    return out


def moon(x, y, r):
    return (f'<path d="M{x},{y - r} A{r},{r} 0 1,0 {x},{y + r} A{r * 1.33:.0f},{r * 1.33:.0f} 0 0,1 {x},{y - r}Z" fill="{YEL}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>')


def stars(points, fill=YEL):
    """points: [(x, y, size)] → sparkles."""
    return "".join(sparkle(x, y, s, fill) for x, y, s in points)


def cloud(x, y, s=1.0, fill=WHITE):
    return puff([(x - 60 * s, y + 6 * s, 48 * s), (x, y - 14 * s, 62 * s), (x + 62 * s, y + 6 * s, 46 * s)], fill)


def tree(x, y, s=1.0, fill=BAMBOO, trunk=BROWN):
    return tr(x, y, s, thick("M0,0 L0,-140", trunk, 26) + puff([(0, -200, 80), (-60, -160, 60), (60, -160, 60), (0, -260, 56)], fill))


def bird(x, y, s=1.0, up=True):
    """Two drawings: up=True wings raised, False wings down — cycle them for a flap."""
    if up:
        d = f"M{x - 30 * s:.0f},{y - 10 * s:.0f} Q{x - 14 * s:.0f},{y - 22 * s:.0f} {x},{y} Q{x + 14 * s:.0f},{y - 22 * s:.0f} {x + 30 * s:.0f},{y - 10 * s:.0f}"
    else:
        d = f"M{x - 30 * s:.0f},{y + 8 * s:.0f} Q{x - 14 * s:.0f},{y - 4 * s:.0f} {x},{y - 4 * s:.0f} Q{x + 14 * s:.0f},{y - 4 * s:.0f} {x + 30 * s:.0f},{y + 8 * s:.0f}"
    return f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{6 * s:.1f}" stroke-linecap="round" stroke-linejoin="round"/>'


def wave(x, y, s=1.0, fill=TEAL):
    d = "M-260,0 C-200,-60 -120,-200 20,-220 C150,-236 230,-150 200,-80 C176,-30 110,-40 112,-90 C114,-130 160,-136 170,-110 C150,-170 60,-170 10,-120 C-60,-50 -120,0 -160,0Z"
    return tr(x, y, s, f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{LW / s:.1f}" stroke-linejoin="round"/>'
                       f'<path d="M-180,-40 C-120,-120 -40,-190 40,-196" fill="none" stroke="{WHITE}" stroke-width="{8 / s:.1f}" stroke-linecap="round"/>')


def ripples(points, color=WHITE):
    """Little wave marks on water: points [(x, y)]."""
    return "".join(f'<path d="M{x},{y} q22,-24 48,-6 q-16,0 -12,16" fill="none" stroke="{color}" stroke-width="5" stroke-linecap="round" opacity=".85"/>' for x, y in points)


def rain(x0, y0, w, h, n=40, seed=1, color=WHITE, slant=-14):
    r = random.Random(seed)
    return "".join(line(x, y, x + slant, y + 34, 4, color, .8) for x, y in ((x0 + r.random() * w, y0 + r.random() * h) for _ in range(n)))


def snow(x0, y0, w, h, n=30, seed=1, color=WHITE):
    r = random.Random(seed)
    out = ""
    for _ in range(n):
        x, y, s = x0 + r.random() * w, y0 + r.random() * h, .6 + r.random() * .8
        out += "".join(line(x, y, x + 18 * s * math.cos(math.radians(a)), y + 18 * s * math.sin(math.radians(a)), 4 * s, color) for a in range(0, 360, 60))
    return out


def grass(x, y, s=1.0, fill=BAMBOO):
    return tr(x, y, s, shape("M-30,0 L-22,-46 L-10,-6 L0,-60 L10,-6 L24,-44 L30,0Z", fill, LW * .8))


def flower(x, y, s=1.0, petal=PINK, centre=YEL):
    g = thick("M0,0 L0,-70", BAMBOO, 8, 4)
    g += "".join(ellipse(22 * math.cos(math.radians(a)), -80 + 22 * math.sin(math.radians(a)), 16, 10, petal, 4, a) for a in range(0, 360, 60))
    return tr(x, y, s, g + circle(0, -80, 12, centre, 4))


# ================================================================== generic built places
def house(x, y, s=1.0, wall=PAPER, roof=RED, win_id=None, lit=True):
    win = rect(-26, -92, 52, 46, "#20264E", 4, 5)
    if win_id:
        win += f'<g id="{win_id}" opacity="{1 if lit else 0}">{rect(-26, -92, 52, 46, YEL, 4, 5)}</g>'
    return tr(x, y, s, rect(-70, -120, 140, 120, wall) + poly([(-92, -116), (0, -196), (92, -116)], roof)
              + win + rect(-18, -40, 36, 40, BROWN, 0, 5))


def building(x1, x2, top, bottom, fill, p=None, cols=4, win=56, lit_colors=(YEL, GLASS, WHITE)):
    """A flat building front with a window grid. With p, each window gets a lit overlay <g id={p}-w{n}> (hidden)
    so a scene can switch windows on; returns (svg, windows[{n, c, r, x, y}])."""
    g = [rect(x1, top, x2 - x1, bottom - top, fill)]
    cw = (x2 - x1 - 30) / cols
    wins, row, y = [], 0, top + 30
    while y + win < bottom - 30:
        for c in range(cols):
            wx = x1 + 15 + c * cw + (cw - win) / 2
            g.append(rect(wx, y, win, win, "#1A2440", 4, 4))
            if p:
                n = len(wins)
                g.append(f'<g id="{p}-w{n}" opacity="0">{rect(wx, y, win, win, lit_colors[(c + row) % len(lit_colors)], 4, 4)}</g>')
                wins.append({"n": n, "c": c, "r": row, "x": wx + win / 2, "y": y + win / 2})
        y += win + 22
        row += 1
    return "".join(g), wins


def street_lamp(x, y, h=420, lit=True):
    return (thick(f"M{x},{y} L{x},{y - h} Q{x},{y - h - 40} {x - 50},{y - h - 40}", INK, 10, 0)
            + (f'<circle cx="{x - 60}" cy="{y - h - 10}" r="70" fill="{YEL}" opacity=".3"/>' if lit else "")
            + poly([(x - 86, y - h - 40), (x - 34, y - h - 40), (x - 44, y - h), (x - 76, y - h)], YEL if lit else GREY, 5))


def ground(y, fill, x0=-40, x1=1960, h=None):
    """A flat ground / floor / sea band from y down, with its ink horizon line."""
    hh = (1120 - y) if h is None else h
    return f'<rect x="{x0}" y="{y}" width="{x1 - x0}" height="{hh}" fill="{fill}"/>' + line(x0, y, x1, y)


def hills(y, fill, amp=40, seed=1):
    r = random.Random(seed)
    pts = [(-40, y)] + [(x, y + r.uniform(-amp, amp)) for x in range(200, 1960, 320)] + [(1960, y)]
    d = f"M{pts[0][0]},{pts[0][1]:.0f} " + " ".join(f"S{x - 120},{yy:.0f} {x},{yy:.0f}" for x, yy in pts[1:]) + " L1960,1120 L-40,1120Z"
    return shape(d, fill)
