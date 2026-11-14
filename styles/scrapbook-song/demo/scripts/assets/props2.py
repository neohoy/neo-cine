# 来自《风吹新竹》MV 工程的 scripts/handdrawn/props2.py。未改动。
"""More hand-drawn people + props for the full cut (same cel rules: 7px ink outline, flat fills, wind → left)."""
import math
import random

from hd_lib import *  # noqa: F401,F403
from hd_people import *  # noqa: F401,F403

DUSK, PLUM, SLATE, GLASS = "#5B3A8C", "#3B3570", "#5E6B8A", "#7FC8D8"
BRICK, BRONZE, GOLD, GREY = "#B5473A", "#B98A3E", "#E9B949", "#C9C2B0"


def tr(x, y, s=1.0, inner="", rot=0):
    r = f" rotate({rot})" if rot else ""
    return f'<g transform="translate({x:.0f},{y:.0f}){r} scale({s})">{inner}</g>'


# ================================================================== people
def face_bits(cx, cy, r, eye="open", mouth="smile"):
    g = []
    ex, ey = r * .36, cy + r * .14
    for sx in (-1, 1):
        x = cx + sx * ex
        if eye == "closed":
            g.append(eyes_closed(x, ey, r))
        elif eye == "happy":   # ^ ^
            g.append(f'<path d="M{x - r * .13:.1f},{ey + r * .05:.1f} Q{x:.1f},{ey - r * .16:.1f} {x + r * .13:.1f},{ey + r * .05:.1f}" fill="none" stroke="{INK}" stroke-width="{LW * .9:.1f}" stroke-linecap="round"/>')
        else:
            g.append(f'<ellipse cx="{x:.0f}" cy="{ey:.0f}" rx="{r * .085:.1f}" ry="{r * .13:.1f}" fill="{INK}"/>'
                     f'<circle cx="{x + r * .03:.0f}" cy="{ey - r * .05:.0f}" r="{r * .03:.1f}" fill="{WHITE}"/>')
        g.append(f'<ellipse cx="{cx + sx * r * .56:.0f}" cy="{cy + r * .44:.0f}" rx="{r * .16:.1f}" ry="{r * .09:.1f}" fill="{PINK}" opacity=".7"/>')
    if mouth == "laugh":
        g.append(f'<path d="M{cx - r * .24:.1f},{cy + r * .44:.1f} Q{cx:.1f},{cy + r * .5:.1f} {cx + r * .24:.1f},{cy + r * .44:.1f} Q{cx + r * .2:.1f},{cy + r * .82:.1f} {cx:.1f},{cy + r * .82:.1f} Q{cx - r * .2:.1f},{cy + r * .82:.1f} {cx - r * .24:.1f},{cy + r * .44:.1f}Z" fill="{INK}"/>'
                 f'<ellipse cx="{cx:.1f}" cy="{cy + r * .72:.1f}" rx="{r * .11:.1f}" ry="{r * .07:.1f}" fill="{PINK}"/>')
    elif mouth == "o":
        g.append(f'<ellipse cx="{cx}" cy="{cy + r * .56:.0f}" rx="{r * .08:.1f}" ry="{r * .1:.1f}" fill="{INK}"/>')
    else:
        g.append(f'<path d="M{cx - r * .14:.1f},{cy + r * .5:.1f} Q{cx:.1f},{cy + r * .64:.1f} {cx + r * .14:.1f},{cy + r * .5:.1f}" fill="none" stroke="{INK}" stroke-width="{LW * .8:.1f}" stroke-linecap="round"/>')
    return "".join(g)


def head_pro(cx, cy, r, eye="open", mouth="smile", blow=.5):
    """The protagonist's head (bob hair, front view) with a chosen face; hair streams LEFT by `blow`."""
    h = head_front(cx, cy, r, "open", blow)
    # head_front draws open eyes + smile last: strip them by redrawing the face skin over them
    skin = f'<ellipse cx="{cx}" cy="{cy + r * .3:.0f}" rx="{r * .7:.0f}" ry="{r * .6:.0f}" fill="{SKIN}"/>'
    return h + skin + face_bits(cx, cy, r, eye, mouth)


def head_friend(cx, cy, r, eye="open", mouth="smile", blow=.5):
    """The friend: longer hair with a pink clip, side tail streaming LEFT."""
    g = [shape(f"M{cx - r * .9:.0f},{cy + r * .2:.0f} C{cx - r * 1.4 - r * blow * .6:.0f},{cy + r * .5:.0f} {cx - r * 1.5 - r * blow:.0f},{cy + r * 1.3:.0f} {cx - r * 1.1 - r * blow * 1.2:.0f},{cy + r * 1.7:.0f} "
               f"C{cx - r * 1.0:.0f},{cy + r * 1.3:.0f} {cx - r * .8:.0f},{cy + r * .9:.0f} {cx - r * .6:.0f},{cy + r * .7:.0f}Z", HAIR),
         shape(f"M{cx - r * 1.08:.0f},{cy + r * .3:.0f} C{cx - r * 1.2:.0f},{cy - r * .95:.0f} {cx - r * .5:.0f},{cy - r * 1.5:.0f} {cx + r * .1:.0f},{cy - r * 1.48:.0f} "
               f"C{cx + r * .9:.0f},{cy - r * 1.46:.0f} {cx + r * 1.22:.0f},{cy - r * .8:.0f} {cx + r * 1.1:.0f},{cy + r * .3:.0f} L{cx + r * 1.0:.0f},{cy + r * 1.1:.0f} L{cx - r * 1.0:.0f},{cy + r * 1.1:.0f}Z", HAIR),
         f'<ellipse cx="{cx}" cy="{cy + r * .08:.0f}" rx="{r * .95:.0f}" ry="{r * .9:.0f}" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>',
         shape(f"M{cx - r * .97:.0f},{cy - r * .05:.0f} C{cx - r * .9:.0f},{cy - r * .9:.0f} {cx - r * .2:.0f},{cy - r * 1.2:.0f} {cx + r * .4:.0f},{cy - r * 1.12:.0f} "
               f"C{cx + r * .9:.0f},{cy - r * 1.0:.0f} {cx + r * 1.05:.0f},{cy - r * .6:.0f} {cx + r * .98:.0f},{cy - r * .05:.0f} "
               f"C{cx + r * .6:.0f},{cy - r * .5:.0f} {cx + r * .1:.0f},{cy - r * .5:.0f} {cx - r * .2:.0f},{cy - r * .7:.0f} "
               f"C{cx - r * .45:.0f},{cy - r * .4:.0f} {cx - r * .75:.0f},{cy - r * .25:.0f} {cx - r * .97:.0f},{cy - r * .05:.0f}Z", HAIR),
         f'<circle cx="{cx + r * .62:.0f}" cy="{cy - r * .72:.0f}" r="{r * .16:.0f}" fill="{PINK}" stroke="{INK}" stroke-width="{LW * .7:.1f}"/>',
         face_bits(cx, cy, r, eye, mouth)]
    return "".join(g)


def body_front(cx, cy, r, shirt=WHITE, pants=NAVY, scarf=True, arms="down", legs=1.0, tb=2.9):
    """Front-view body under a head of radius r at (cx, cy). legs = leg length multiplier (kid < 1 < adult)."""
    g = []
    top, bot = cy + r * 1.0, cy + r * tb
    leg_b = bot + r * 1.5 * legs
    for sx in (-1, 1):
        g.append(thick(f"M{cx + sx * r * .38:.0f},{bot - r * .1:.0f} L{cx + sx * r * .42:.0f},{leg_b:.0f}", pants, r * .42))
        g.append(f'<ellipse cx="{cx + sx * r * .5:.0f}" cy="{leg_b + r * .08:.0f}" rx="{r * .3:.0f}" ry="{r * .14:.0f}" fill="{INK}"/>')
    if arms == "kite":   # viewer-left arm raised, holding a string
        g.append(thick(f"M{cx - r * .8:.0f},{top + r * .4:.0f} C{cx - r * 1.2:.0f},{top + r * .2:.0f} {cx - r * 1.45:.0f},{top - r * .3:.0f} {cx - r * 1.5:.0f},{top - r * .9:.0f}", shirt, r * .34))
        g.append(f'<circle cx="{cx - r * 1.5:.0f}" cy="{top - r * 1.0:.0f}" r="{r * .17:.0f}" fill="{SKIN}" stroke="{INK}" stroke-width="{LW * .8:.1f}"/>')
        g.append(thick(f"M{cx + r * .8:.0f},{top + r * .4:.0f} C{cx + r * 1.1:.0f},{top + r * .9:.0f} {cx + r * 1.15:.0f},{top + r * 1.4:.0f} {cx + r * 1.1:.0f},{top + r * 1.75:.0f}", shirt, r * .34))
        g.append(f'<circle cx="{cx + r * 1.1:.0f}" cy="{top + r * 1.85:.0f}" r="{r * .17:.0f}" fill="{SKIN}" stroke="{INK}" stroke-width="{LW * .8:.1f}"/>')
    if arms == "down":
        for sx in (-1, 1):
            g.append(thick(f"M{cx + sx * r * .8:.0f},{top + r * .4:.0f} C{cx + sx * r * 1.1:.0f},{top + r * .9:.0f} {cx + sx * r * 1.15:.0f},{top + r * 1.4:.0f} {cx + sx * r * 1.1:.0f},{top + r * 1.75:.0f}", shirt, r * .34))
            g.append(f'<circle cx="{cx + sx * r * 1.1:.0f}" cy="{top + r * 1.85:.0f}" r="{r * .17:.0f}" fill="{SKIN}" stroke="{INK}" stroke-width="{LW * .8:.1f}"/>')
    g.append(shape(f"M{cx - r * .85:.0f},{bot:.0f} C{cx - r * .9:.0f},{top + r * .5:.0f} {cx - r * .6:.0f},{top:.0f} {cx:.0f},{top:.0f} "
                   f"C{cx + r * .6:.0f},{top:.0f} {cx + r * .9:.0f},{top + r * .5:.0f} {cx + r * .85:.0f},{bot:.0f}Z", shirt))
    g.append(f'<path d="M{cx - r * .25:.0f},{top + r * .06:.0f} L{cx:.0f},{top + r * .36:.0f} L{cx + r * .25:.0f},{top + r * .06:.0f}" fill="none" stroke="{INK}" stroke-width="{LW * .7:.1f}" stroke-linejoin="round"/>')
    if scarf:
        g.append(shape(f"M{cx - r * .55:.0f},{top - r * .08:.0f} C{cx - r * .2:.0f},{top + r * .14:.0f} {cx + r * .2:.0f},{top + r * .14:.0f} {cx + r * .55:.0f},{top - r * .08:.0f} "
                       f"L{cx + r * .58:.0f},{top + r * .2:.0f} C{cx + r * .2:.0f},{top + r * .4:.0f} {cx - r * .2:.0f},{top + r * .4:.0f} {cx - r * .58:.0f},{top + r * .2:.0f}Z", YEL))
        g.append(shape(f"M{cx - r * .4:.0f},{top + r * .2:.0f} C{cx - r * .9:.0f},{top + r * .3:.0f} {cx - r * 1.3:.0f},{top + r * .1:.0f} {cx - r * 1.8:.0f},{top + r * .3:.0f} "
                       f"C{cx - r * 1.4:.0f},{top + r * .55:.0f} {cx - r * .9:.0f},{top + r * .6:.0f} {cx - r * .4:.0f},{top + r * .5:.0f}Z", YEL))
    return "".join(g)


def pro_front(cx, cy, r, eye="open", mouth="smile", shirt=WHITE, legs=1.0, blow=.5, scarf=True, tb=2.9, arms="down"):
    return body_front(cx, cy, r, shirt, NAVY, scarf, arms, legs, tb) + head_pro(cx, cy, r, eye, mouth, blow)


def friend_front(cx, cy, r, eye="open", mouth="smile", shirt=PINK, legs=1.0, blow=.5, tb=2.9):
    return body_front(cx, cy, r, shirt, NAVY, False, "down", legs, tb) + head_friend(cx, cy, r, eye, mouth, blow)


def side_parts(coat=WHITE, bag="school", s_head=1.0, friend=False):
    """Side view walking LEFT (origin between the feet), like city.walker_parts but with a choice of bag."""
    out = {"scarf": "" if friend else shape("M-8,-200 C-60,-214 -110,-190 -164,-208 C-134,-172 -84,-170 -12,-180Z", YEL)}
    if bag == "case":
        out["bag"] = (f'<rect x="78" y="-112" width="76" height="104" rx="10" transform="rotate(10 116 -60)" fill="{RED}" stroke="{INK}" stroke-width="{LW}"/>'
                      f'<path d="M84,-118 L72,-150 L60,-148" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>'
                      f'<circle cx="88" cy="-2" r="9" fill="{INK}"/><circle cx="148" cy="8" r="9" fill="{INK}"/>')
    elif bag == "school":
        out["bag"] = (f'<rect x="22" y="-196" width="58" height="96" rx="14" fill="{TEAL}" stroke="{INK}" stroke-width="{LW}"/>'
                      f'<rect x="30" y="-150" width="42" height="30" rx="6" fill="{TEALD}" stroke="{INK}" stroke-width="5"/>')
    else:
        out["bag"] = ""
    out["legsA"] = (thick("M12,-64 L40,-8", NAVY, 24) + thick("M-10,-64 L-44,-8", NAVY, 24)
                    + f'<ellipse cx="-50" cy="-4" rx="20" ry="10" fill="{INK}"/><ellipse cx="46" cy="-4" rx="20" ry="10" fill="{INK}"/>')
    out["legsB"] = (thick("M10,-64 L18,-6", NAVY, 24) + thick("M-8,-64 L-20,-6", NAVY, 24)
                    + f'<ellipse cx="-26" cy="-2" rx="20" ry="10" fill="{INK}"/><ellipse cx="24" cy="-2" rx="20" ry="10" fill="{INK}"/>')
    hair_tail = (shape("M-46,-276 C-80,-290 -110,-276 -136,-290 C-112,-258 -80,-256 -48,-260Z", HAIR) if not friend else
                 shape("M30,-266 C0,-250 -60,-262 -120,-236 C-80,-226 -30,-224 26,-236Z", HAIR))
    clip = f'<circle cx="26" cy="-282" r="10" fill="{PINK}" stroke="{INK}" stroke-width="4"/>' if friend else ""
    out["body"] = (shape("M-40,-204 C-50,-150 -52,-100 -48,-58 L46,-58 C48,-110 42,-160 30,-204Z", coat)
                   + thick("M22,-184 L58,-148", coat, 22) + f'<circle cx="62" cy="-146" r="11" fill="{SKIN}" stroke="{INK}" stroke-width="5"/>'
                   + thick("M-24,-184 L-52,-132", coat, 20) + f'<circle cx="-54" cy="-128" r="11" fill="{SKIN}" stroke="{INK}" stroke-width="5"/>'
                   + ("" if friend else shape("M-34,-210 C-14,-196 12,-196 30,-210 L32,-194 C12,-180 -14,-180 -36,-194Z", YEL))
                   + f'<g transform="translate(0 -230) scale({s_head}) translate(0 230)">'
                   + f'<ellipse cx="8" cy="-250" rx="50" ry="48" fill="{HAIR}" stroke="{INK}" stroke-width="{LW}"/>'
                   + f'<circle cx="-4" cy="-246" r="44" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>'
                   + shape("M-50,-262 C-40,-300 20,-306 48,-276 C40,-262 20,-258 4,-270 C-6,-256 -30,-252 -50,-262Z", HAIR)
                   + hair_tail + clip
                   + shape("M-48,-246 q-16,8 -4,22", SKIN)
                   + f'<ellipse cx="-24" cy="-246" rx="6" ry="9" fill="{INK}"/><ellipse cx="-22" cy="-226" rx="9" ry="6" fill="{PINK}" opacity=".7"/></g>')
    return out


def bike_parts(shirt=WHITE, friend=False):
    """Bicycle + rider heading LEFT. Local origin = front wheel hub; rear hub at (190, 0). Two pedal drawings."""
    wheels = "".join(f'<circle cx="{wx}" cy="0" r="62" fill="none" stroke="{INK}" stroke-width="{LW}"/><circle cx="{wx}" cy="0" r="8" fill="{INK}"/>'
                     + "".join(f'<line x1="{wx}" y1="0" x2="{wx + 58 * math.cos(math.radians(a)):.0f}" y2="{58 * math.sin(math.radians(a)):.0f}" stroke="{INK}" stroke-width="2.5" opacity=".6"/>' for a in range(0, 360, 45))
                     for wx in (0, 190))
    frame_c = YEL if not friend else PINK
    frame = (f'<path d="M0,0 L60,-96 L150,-96 L190,0 L100,0 L60,-96 M100,0 L150,-96" fill="none" stroke="{INK}" stroke-width="{13 + 2 * LW}" stroke-linejoin="round" stroke-linecap="round"/>'
             f'<path d="M0,0 L60,-96 L150,-96 L190,0 L100,0 L60,-96 M100,0 L150,-96" fill="none" stroke="{frame_c}" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/>'
             f'<path d="M60,-96 L50,-138 L22,-140" fill="none" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round"/>'
             f'<rect x="134" y="-118" width="44" height="14" rx="6" fill="{INK}"/>'
             f'<rect x="-40" y="-112" width="56" height="36" rx="6" fill="{WOOD}" stroke="{INK}" stroke-width="5"/>')
    hair_tail = (shape("M150,-300 C190,-312 220,-296 250,-308 C230,-280 196,-278 156,-284Z", HAIR) if not friend else
                 shape("M150,-296 C200,-320 240,-290 280,-310 C256,-270 210,-268 160,-276Z", HAIR))
    rider = (shape("M118,-280 C150,-286 170,-270 196,-282 C176,-256 150,-252 122,-258Z", YEL) if not friend else "")
    rider += (shape("M110,-232 C96,-190 112,-140 136,-118 L174,-122 C170,-170 160,-210 150,-236Z", shirt)
              + thick("M118,-216 C90,-190 60,-160 34,-140", shirt, 22) + f'<circle cx="30" cy="-138" r="12" fill="{SKIN}" stroke="{INK}" stroke-width="5"/>'
              + f'<ellipse cx="128" cy="-272" rx="44" ry="42" fill="{HAIR}" stroke="{INK}" stroke-width="{LW}"/>'
              + f'<circle cx="116" cy="-266" r="40" fill="{SKIN}" stroke="{INK}" stroke-width="{LW}"/>'
              + shape("M74,-282 C84,-318 144,-322 166,-292 C150,-280 130,-276 116,-288 C104,-274 88,-272 74,-282Z", HAIR)
              + hair_tail
              + (f'<circle cx="150" cy="-302" r="9" fill="{PINK}" stroke="{INK}" stroke-width="4"/>' if friend else "")
              + f'<ellipse cx="94" cy="-266" rx="6" ry="9" fill="{INK}"/><ellipse cx="96" cy="-246" rx="9" ry="6" fill="{PINK}" opacity=".7"/>'
              + f'<path d="M84,-242 q10,10 22,2" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>')
    legsA = thick("M146,-122 L118,-70 L110,-20", NAVY, 24) + thick("M150,-120 L150,-64 L140,-36", NAVY, 22) + f'<ellipse cx="104" cy="-14" rx="18" ry="9" fill="{INK}"/>'
    legsB = thick("M146,-122 L96,-86 L84,-50", NAVY, 24) + thick("M150,-120 L132,-62 L118,-24", NAVY, 22) + f'<ellipse cx="80" cy="-46" rx="18" ry="9" fill="{INK}"/>'
    return {"wheels": wheels, "frame": frame, "rider": rider, "legsA": legsA, "legsB": legsB}


# ================================================================== props
def sun(x, y, r, fill=ORANGE):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>'


def moon(x, y, r):
    return (f'<path d="M{x},{y - r} A{r},{r} 0 1,0 {x},{y + r} A{r * 1.33:.0f},{r * 1.33:.0f} 0 0,1 {x},{y - r}Z" fill="{YEL}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>')


def bird(x, y, s=1.0):
    return f'<path d="M{x - 30 * s:.0f},{y - 10 * s:.0f} Q{x - 14 * s:.0f},{y - 22 * s:.0f} {x},{y} Q{x + 14 * s:.0f},{y - 22 * s:.0f} {x + 30 * s:.0f},{y - 10 * s:.0f}" fill="none" stroke="{INK}" stroke-width="{6 * s:.1f}" stroke-linecap="round" stroke-linejoin="round"/>'


def tree(x, y, s=1.0, fill=BAMBOO):
    return tr(x, y, s, thick("M0,0 L0,-140", BROWN, 26) + puff([(0, -200, 80), (-60, -160, 60), (60, -160, 60), (0, -260, 56)], fill))


def lantern(x, y, r, fill=RED, lit=False):
    glow = f'<circle cx="{x}" cy="{y}" r="{r * 1.9:.0f}" fill="{YEL}" opacity=".35"/>' if lit else ""
    return (glow + f'<line x1="{x}" y1="{y - r * 1.25:.0f}" x2="{x}" y2="{y - r * .9:.0f}" stroke="{INK}" stroke-width="5"/>'
            f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r * .9:.0f}" fill="{fill}" stroke="{INK}" stroke-width="{LW * .8:.1f}"/>'
            f'<rect x="{x - r * .45:.0f}" y="{y - r * 1.02:.0f}" width="{r * .9:.0f}" height="{r * .22:.0f}" fill="{INK}"/>'
            f'<rect x="{x - r * .45:.0f}" y="{y + r * .8:.0f}" width="{r * .9:.0f}" height="{r * .22:.0f}" fill="{INK}"/>'
            f'<path d="M{x - r * .45:.0f},{y} Q{x},{y - r * .2:.0f} {x + r * .45:.0f},{y}" fill="none" stroke="{INK}" stroke-width="3" opacity=".5"/>'
            f'<line x1="{x}" y1="{y + r * 1.02:.0f}" x2="{x}" y2="{y + r * 1.5:.0f}" stroke="{RED}" stroke-width="6"/>')


def temple(x, y, s=1.0):
    """城隍庙 facade — swallow-tail roof, red pillars, door gods, two lanterns. Origin = ground centre."""
    g = []
    g.append(f'<rect x="-430" y="-330" width="860" height="330" fill="{BRICK}" stroke="{INK}" stroke-width="{LW}"/>')
    for px in (-330, -170, 170, 330):
        g.append(f'<rect x="{px - 26}" y="-330" width="52" height="330" fill="{RED}" stroke="{INK}" stroke-width="{LW}"/>')
        g.append(f'<rect x="{px - 34}" y="-26" width="68" height="26" fill="{STONE}" stroke="{INK}" stroke-width="5"/>')
    g.append(f'<rect x="-130" y="-270" width="260" height="270" fill="#7A2A22" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(f'<line x1="0" y1="-270" x2="0" y2="0" stroke="{INK}" stroke-width="{LW}"/>')
    for dx in (-65, 65):   # door gods (simplified faces)
        g.append(f'<circle cx="{dx}" cy="-170" r="38" fill="{SKIN}" stroke="{INK}" stroke-width="5"/>'
                 f'<path d="M{dx - 30},-196 Q{dx},-226 {dx + 30},-196" fill="{GOLD}" stroke="{INK}" stroke-width="5"/>'
                 f'<path d="M{dx - 16},-160 l10,6 M{dx + 16},-160 l-10,6 M{dx - 14},-142 Q{dx},-130 {dx + 14},-142" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>'
                 f'<rect x="{dx - 42}" y="-120" width="84" height="100" rx="10" fill="{TEALD}" stroke="{INK}" stroke-width="5"/>')
    g.append(f'<rect x="-120" y="-330" width="240" height="56" fill="{INK}"/><rect x="-110" y="-322" width="220" height="40" fill="{GOLD}"/>')
    # roof: two tiers with swallow tails (燕尾)
    g.append(f'<path d="M-520,-326 Q-470,-344 -400,-360 L400,-360 Q470,-344 520,-326 Q560,-336 580,-390 Q530,-370 470,-380 L-470,-380 Q-530,-370 -580,-390 Q-560,-336 -520,-326Z" fill="{ROOF}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>')
    g.append(f'<rect x="-360" y="-470" width="720" height="90" fill="{BRICK}" stroke="{INK}" stroke-width="{LW}"/>')
    g.append(f'<path d="M-440,-466 Q-400,-480 -340,-490 L340,-490 Q400,-480 440,-466 Q480,-474 500,-540 Q450,-506 400,-512 L-400,-512 Q-450,-506 -500,-540 Q-480,-474 -440,-466Z" fill="{ROOF}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>')
    g.append(f'<path d="M-90,-512 Q0,-560 90,-512" fill="{GOLD}" stroke="{INK}" stroke-width="5"/><circle cx="0" cy="-548" r="20" fill="{RED}" stroke="{INK}" stroke-width="5"/>')
    for k in range(-5, 6):
        g.append(f'<line x1="{k * 70}" y1="-380" x2="{k * 70 + 6}" y2="-360" stroke="{INK}" stroke-width="3" opacity=".5"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


def incense_burner(x, y, s=1.0):
    g = [f'<path d="M-120,-120 L120,-120 L100,-20 L-100,-20Z" fill="{BRONZE}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>',
         f'<rect x="-140" y="-140" width="280" height="30" rx="8" fill="{BRONZE}" stroke="{INK}" stroke-width="{LW}"/>',
         thick("M-80,-20 L-96,0", BRONZE, 18) + thick("M80,-20 L96,0", BRONZE, 18),
         f'<path d="M-150,-130 q-20,-30 6,-44 M150,-130 q20,-30 -6,-44" fill="none" stroke="{INK}" stroke-width="{LW}" stroke-linecap="round"/>']
    for k, dx in enumerate((-40, -10, 22, 50)):
        g.append(f'<line x1="{dx}" y1="-140" x2="{dx + (k - 1.5) * 6}" y2="-230" stroke="{BROWN}" stroke-width="6"/><circle cx="{dx + (k - 1.5) * 6}" cy="-232" r="5" fill="{RED}"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(g)}</g>'


def smoke_path(x, y, k=0):
    """An incense smoke ribbon rising then drifting LEFT; `k` picks one of three drawings."""
    w = (0, 18, -14)[k % 3]
    return (f"M{x},{y} C{x - 30 + w},{y - 90} {x + 50 - w},{y - 170} {x - 10},{y - 250} "
            f"C{x - 70 + w},{y - 330} {x - 220},{y - 300} {x - 330 - w},{y - 360} "
            f"C{x - 430},{y - 410} {x - 520 + w},{y - 340} {x - 640},{y - 390}")


def shophouse(x, y, w, h, fill, seed=0, arches=3):
    """Arcaded shophouse (亭仔脚) front, origin = bottom-left."""
    r = random.Random(seed)
    g = [f'<rect x="{x}" y="{y - h}" width="{w}" height="{h}" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>',
         f'<rect x="{x - 10}" y="{y - h - 24}" width="{w + 20}" height="28" fill="{ROOF}" stroke="{INK}" stroke-width="{LW}"/>']
    aw = w / arches
    for i in range(arches):
        ax = x + i * aw
        g.append(f'<path d="M{ax + 14:.0f},{y} L{ax + 14:.0f},{y - 120} A{aw / 2 - 14:.0f},{aw / 2 - 14:.0f} 0 0 1 {ax + aw - 14:.0f},{y - 120} L{ax + aw - 14:.0f},{y}Z" fill="#2A2238" stroke="{INK}" stroke-width="{LW}"/>')
        wy = y - h + 40
        while wy < y - 240:
            g.append(f'<rect x="{ax + aw * .25:.0f}" y="{wy:.0f}" width="{aw * .5:.0f}" height="60" rx="4" fill="{r.choice([YEL, "#2A2238", "#2A2238"])}" stroke="{INK}" stroke-width="5"/>')
            wy += 96
    return "".join(g)


def station_sign(x, y, top="新竹", w=760):
    return (f'<g transform="translate({x},{y})">'
            + thick(f"M{-w / 2 + 60:.0f},0 L{-w / 2 + 60:.0f},-60 M{w / 2 - 60:.0f},0 L{w / 2 - 60:.0f},-60", GREY, 14, 5)
            + f'<rect x="{-w / 2 + 10:.0f}" y="10" width="{w}" height="230" rx="10" fill="{INK}"/>'
            + f'<rect x="{-w / 2:.0f}" y="0" width="{w}" height="230" rx="10" fill="{WHITE}" stroke="{INK}" stroke-width="{LW}"/>'
            + f'<rect x="{-w / 2:.0f}" y="150" width="{w}" height="34" fill="{NAVY}" stroke="{INK}" stroke-width="5"/>'
            + T(0, 120, top, 104, "KL", INK, "middle", allow=True)
            + T(-w / 2 + 70, 214, "←", 34, "WK", INK, "middle", allow=True) + T(w / 2 - 70, 214, "→", 34, "WK", INK, "middle", allow=True)
            + "</g>")


def train(x, y, cars=3, fill=WHITE, stripe=NAVY, win_ids=None):
    """Commuter train heading LEFT. Origin = nose bottom."""
    g = []
    L = 620
    for c in range(cars):
        cx = c * (L + 16)
        nose = (f'<path d="M{cx},0 L{cx},-150 Q{cx + 10},-240 {cx + 120},-250 L{cx + L},-250 L{cx + L},0Z" fill="{fill}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>' if c == 0 else
                f'<rect x="{cx}" y="-250" width="{L}" height="250" rx="16" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>')
        g.append(nose)
        g.append(f'<rect x="{cx + (20 if c else 30)}" y="-70" width="{L - 40}" height="26" fill="{stripe}"/>')
        for k in range(5):
            wx = cx + 150 + k * 92 if c == 0 else cx + 40 + k * 112
            if wx + 70 > cx + L - 10:
                continue
            g.append(f'<rect x="{wx}" y="-200" width="70" height="80" rx="8" fill="{GLASS}" stroke="{INK}" stroke-width="5"/>')
        if c == 0:
            g.append(f'<path d="M{cx + 18},-150 Q{cx + 30},-226 {cx + 110},-232 L{cx + 110},-150Z" fill="{GLASS}" stroke="{INK}" stroke-width="5"/>'
                     f'<circle cx="{cx + 34}" cy="-96" r="12" fill="{YEL}" stroke="{INK}" stroke-width="4"/>')
        for wx in (cx + 90, cx + 190, cx + L - 190, cx + L - 90):
            g.append(f'<circle cx="{wx}" cy="6" r="24" fill="{INK}"/>')
    return f'<g transform="translate({x},{y})">{"".join(g)}</g>'


def glass_tower(x1, x2, top, bottom, p, cols=8, fill="#2F4F7A"):
    """Science-park office block; returns (svg, windows) — each window a lit overlay <g id=p-gw{n}> (hidden)."""
    g = [f'<rect x="{x1}" y="{top}" width="{x2 - x1}" height="{bottom - top}" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>',
         f'<rect x="{x1 - 16}" y="{top - 30}" width="{x2 - x1 + 32}" height="34" fill="{SLATE}" stroke="{INK}" stroke-width="{LW}"/>']
    cw = (x2 - x1 - 40) / cols
    wins = []
    row, y = 0, top + 30
    while y + 54 < bottom - 30:
        for c in range(cols):
            wx = x1 + 20 + c * cw
            g.append(f'<rect x="{wx + 6:.0f}" y="{y}" width="{cw - 12:.0f}" height="54" fill="#1A2440" stroke="{INK}" stroke-width="4"/>')
            n = len(wins)
            g.append(f'<g id="{p}-gw{n}" opacity="0"><rect x="{wx + 6:.0f}" y="{y}" width="{cw - 12:.0f}" height="54" fill="{(GLASS, WHITE, YEL, GLASS)[(c + row) % 4]}" stroke="{INK}" stroke-width="4"/></g>')
            wins.append({"n": n, "c": c, "r": row, "x": wx + cw / 2, "y": y + 27})
        y += 72
        row += 1
    return "".join(g), wins


def laptop(x, y, s=1.0, p=None):
    bars = "".join(f'<rect id="{p}-bar{i}" x="{-150 + i * 62}" y="{-190 - h}" width="40" height="{h}" fill="{c}" stroke="{INK}" stroke-width="4"/>'
                   for i, (h, c) in enumerate([(50, TEAL), (80, YEL), (40, PINK), (110, ORANGE), (130, TEAL)])) if p else ""
    return (f'<g transform="translate({x},{y}) scale({s})">'
            f'<path d="M-230,0 L230,0 L270,40 L-270,40Z" fill="{GREY}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>'
            f'<rect x="-210" y="-300" width="420" height="300" rx="14" fill="{SLATE}" stroke="{INK}" stroke-width="{LW}"/>'
            f'<rect x="-186" y="-276" width="372" height="250" rx="6" fill="#DDF3F6" stroke="{INK}" stroke-width="5"/>'
            f'<line x1="-170" y1="-60" x2="170" y2="-60" stroke="{INK}" stroke-width="4"/>{bars}</g>')


def clock(x, y, r, p=None):
    hands = (f'<g id="{p}-hh"><line x1="{x}" y1="{y}" x2="{x}" y2="{y - r * .5:.0f}" stroke="{INK}" stroke-width="{LW * 1.2:.1f}" stroke-linecap="round"/></g>'
             f'<g id="{p}-mh"><line x1="{x}" y1="{y}" x2="{x + r * .72:.0f}" y2="{y}" stroke="{INK}" stroke-width="{LW * .8:.1f}" stroke-linecap="round"/></g>') if p else ""
    ticks = "".join(f'<line x1="{x + r * .78 * math.cos(math.radians(a)):.0f}" y1="{y + r * .78 * math.sin(math.radians(a)):.0f}" x2="{x + r * .9 * math.cos(math.radians(a)):.0f}" y2="{y + r * .9 * math.sin(math.radians(a)):.0f}" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>' for a in range(0, 360, 30))
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="{WHITE}" stroke="{INK}" stroke-width="{LW}"/>{ticks}{hands}'
            f'<circle cx="{x}" cy="{y}" r="{r * .08:.0f}" fill="{RED}" stroke="{INK}" stroke-width="3"/>')


def desk_lamp(x, y, s=1.0):
    return (f'<g transform="translate({x},{y}) scale({s})">'
            f'<path d="M60,-270 L110,-250 L300,0 L-60,0Z" fill="{YEL}" opacity=".3"/>'
            + thick("M0,0 L-30,-180 L60,-300", GREY, 16)
            + f'<ellipse cx="0" cy="0" rx="70" ry="18" fill="{GREY}" stroke="{INK}" stroke-width="{LW}"/>'
            + f'<path d="M30,-330 L110,-270 L60,-230 Z" fill="{TEAL}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/></g>')


def coffee_cup(x, y, s=1.0, p=None):
    refl = (f'<g id="{p}-refl">' + clock(0, -12, 46).replace(f'fill="{WHITE}"', f'fill="#E7C9A0"', 1)
            + f'<line x1="0" y1="-12" x2="0" y2="-48" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><line x1="0" y1="-12" x2="-26" y2="2" stroke="{INK}" stroke-width="5" stroke-linecap="round"/></g>') if p else ""
    return (f'<g transform="translate({x},{y}) scale({s})">'
            f'<ellipse cx="0" cy="190" rx="230" ry="40" fill="{WHITE}" stroke="{INK}" stroke-width="{LW}"/>'
            f'<path d="M150,30 C250,20 260,140 150,150" fill="none" stroke="{INK}" stroke-width="{36 + 2 * LW}" stroke-linecap="round"/>'
            f'<path d="M150,30 C250,20 260,140 150,150" fill="none" stroke="{WHITE}" stroke-width="36" stroke-linecap="round"/>'
            f'<path d="M-170,-20 L170,-20 L140,170 Q0,200 -140,170Z" fill="{WHITE}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>'
            f'<path d="M-150,60 L152,60" stroke="{TEAL}" stroke-width="18"/>'
            f'<ellipse cx="0" cy="-20" rx="170" ry="40" fill="#6B4226" stroke="{INK}" stroke-width="{LW}"/>'
            f'<g transform="translate(0,-20) scale(1,.24) translate(0,12)">{refl}</g></g>')


def dorm_door(x, y, s=1.0, num="312"):
    return (f'<g transform="translate({x},{y}) scale({s})">'
            f'<rect x="-190" y="-560" width="380" height="560" fill="{WOOD}" stroke="{INK}" stroke-width="{LW}"/>'
            f'<rect x="-150" y="-520" width="300" height="200" fill="#C99566" stroke="{INK}" stroke-width="5"/>'
            f'<rect x="-150" y="-280" width="300" height="240" fill="#C99566" stroke="{INK}" stroke-width="5"/>'
            f'<circle cx="130" cy="-280" r="18" fill="{GOLD}" stroke="{INK}" stroke-width="5"/>'
            f'<rect x="-70" y="-610" width="140" height="44" rx="6" fill="{WHITE}" stroke="{INK}" stroke-width="5"/>'
            + T(0, -576, num, 32, "JBM", INK, "middle", allow=True) + "</g>")


def cat(x, y, s=1.0, fill=ORANGE):
    return (f'<g transform="translate({x},{y}) scale({s})">'
            + thick("M70,-20 C120,-30 130,-90 100,-110", fill, 16)
            + f'<ellipse cx="0" cy="-40" rx="80" ry="50" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>'
            + f'<circle cx="-60" cy="-100" r="44" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>'
            + f'<path d="M-96,-124 L-90,-170 L-62,-140 M-30,-124 L-36,-170 L-62,-140" fill="{fill}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>'
            + f'<path d="M-82,-104 q8,-8 16,0 M-54,-104 q8,-8 16,0" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>'
            + f'<path d="M-66,-86 q6,6 12,0" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/></g>')


def railing(y, x0=-40, x1=1960, step=120, fill=WHITE):
    g = [f'<rect x="{x0}" y="{y - 14}" width="{x1 - x0}" height="28" rx="8" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>',
         f'<rect x="{x0}" y="{y + 90}" width="{x1 - x0}" height="20" rx="6" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>']
    for x in range(x0 + 40, x1, step):
        g.append(f'<rect x="{x - 12}" y="{y}" width="24" height="220" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>')
    return "".join(g)


def hwy_sign(x, y, w, h, inner):
    return (f'<g transform="translate({x},{y})">'
            + thick(f"M{-w / 2 + 40:.0f},{h:.0f} L{-w / 2 + 40:.0f},{h + 600:.0f} M{w / 2 - 40:.0f},{h:.0f} L{w / 2 - 40:.0f},{h + 600:.0f}", GREY, 16, 5)
            + f'<rect x="{-w / 2 + 10:.0f}" y="10" width="{w}" height="{h}" rx="14" fill="{INK}"/>'
            + f'<rect x="{-w / 2:.0f}" y="0" width="{w}" height="{h}" rx="14" fill="#2E7D4F" stroke="{INK}" stroke-width="{LW}"/>'
            + f'<rect x="{-w / 2 + 14:.0f}" y="14" width="{w - 28}" height="{h - 28}" rx="8" fill="none" stroke="{WHITE}" stroke-width="5"/>'
            + inner + "</g>")


def house(x, y, s=1.0, wall=PAPER, roof_c=RED, win_id=None, win_on=True):
    win = (f'<rect x="-26" y="-92" width="52" height="46" rx="4" fill="#20264E" stroke="{INK}" stroke-width="5"/>'
           + (f'<g id="{win_id}" opacity="{1 if win_on else 0}"><rect x="-26" y="-92" width="52" height="46" rx="4" fill="{YEL}" stroke="{INK}" stroke-width="5"/></g>' if win_id else ""))
    return (f'<g transform="translate({x},{y}) scale({s})">'
            f'<rect x="-70" y="-120" width="140" height="120" fill="{wall}" stroke="{INK}" stroke-width="{LW}"/>'
            f'<path d="M-92,-116 L0,-196 L92,-116Z" fill="{roof_c}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>'
            f'{win}<rect x="-18" y="-40" width="36" height="40" fill="{BROWN}" stroke="{INK}" stroke-width="5"/></g>')


def note_paper(x, y, s, text="晚安", rot=0):
    return (f'<g transform="translate({x},{y}) rotate({rot}) scale({s})">'
            f'<rect x="-80" y="-50" width="160" height="100" rx="6" fill="{WHITE}" stroke="{INK}" stroke-width="{LW}"/>'
            f'<path d="M50,-50 L80,-20 L50,-20Z" fill="{BUFF}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
            + T(0, 22, text, 56, "WK", INK, "middle", allow=True) + "</g>")


def door_frame(x, y, h=760, w=420):
    """Wooden door frame used as a growth chart; origin = floor centre."""
    return (f'<rect x="{x - w / 2 - 40:.0f}" y="{y - h - 40}" width="{w + 80}" height="{h + 40}" fill="{WOOD}" stroke="{INK}" stroke-width="{LW}"/>'
            f'<rect x="{x - w / 2:.0f}" y="{y - h}" width="{w}" height="{h}" fill="#F7E7C4" stroke="{INK}" stroke-width="{LW}"/>')


def calendar_page(x, y, year, p_id, fill=WHITE, op=1):
    return (f'<g id="{p_id}" opacity="{op}"><rect x="{x - 210}" y="{y}" width="420" height="440" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>'
            f'<rect x="{x - 210}" y="{y}" width="420" height="90" fill="{RED}" stroke="{INK}" stroke-width="{LW}"/>'
            + T(x, y + 300, str(year), 150, "JBM", INK, "middle", allow=True)
            + "".join(f'<rect x="{x - 170 + k * 70}" y="{y + 340}" width="44" height="30" rx="4" fill="{BUFF}" stroke="{INK}" stroke-width="3"/>' for k in range(5))
            + "</g>")


def suitcase_open(x, y, w=900, h=560):
    return (f'<g transform="translate({x},{y})">'
            f'<rect x="{-w / 2 + 14:.0f}" y="{-h / 2 + 16:.0f}" width="{w}" height="{h}" rx="40" fill="{INK}"/>'
            f'<rect x="{-w / 2:.0f}" y="{-h / 2:.0f}" width="{w}" height="{h}" rx="40" fill="{RED}" stroke="{INK}" stroke-width="{LW}"/>'
            f'<rect x="{-w / 2 + 40:.0f}" y="{-h / 2 + 40:.0f}" width="{w - 80}" height="{h - 80}" rx="22" fill="#F0D9B5" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M{-w / 2 + 40:.0f},0 L{w / 2 - 40:.0f},0" stroke="{INK}" stroke-width="3" stroke-dasharray="14 12" opacity=".4"/>'
            f'<rect x="-90" y="{-h / 2 - 60:.0f}" width="180" height="70" rx="26" fill="none" stroke="{INK}" stroke-width="{18 + 2 * LW}"/>'
            f'<rect x="-90" y="{-h / 2 - 60:.0f}" width="180" height="70" rx="26" fill="none" stroke="{BROWN}" stroke-width="18"/></g>')


def noodle_bundle(x, y, s=1.0, rot=0):
    g = [f'<path d="M{-80 + k * 14},-40 C{-70 + k * 14},-10 {-90 + k * 14},20 {-76 + k * 14},50" fill="none" stroke="{WHITE}" stroke-width="12" stroke-linecap="round"/>' for k in range(12)]
    return (f'<g transform="translate({x},{y}) rotate({rot}) scale({s})">'
            f'<rect x="-96" y="-50" width="184" height="110" rx="20" fill="{INK}"/>' + "".join(g)
            + f'<rect x="-100" y="-6" width="190" height="26" fill="{RED}" stroke="{INK}" stroke-width="5"/></g>')


def photo(x, y, s=1.0, rot=0, inner=""):
    return (f'<g transform="translate({x},{y}) rotate({rot}) scale({s})">'
            f'<rect x="-110" y="-130" width="220" height="260" fill="{WHITE}" stroke="{INK}" stroke-width="{LW}"/>'
            f'<rect x="-92" y="-112" width="184" height="184" fill="{TEAL}" stroke="{INK}" stroke-width="5"/>{inner}</g>')


def townhouse(x, y, w, h, fill, seed=0):
    """A narrow European-style townhouse (the 陌生街巷), origin bottom-left."""
    r = random.Random(seed)
    g = [f'<rect x="{x}" y="{y - h}" width="{w}" height="{h}" fill="{fill}" stroke="{INK}" stroke-width="{LW}"/>',
         f'<path d="M{x - 12},{y - h} L{x + w / 2:.0f},{y - h - 110} L{x + w + 12},{y - h}Z" fill="{SLATE}" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>']
    rows = int((h - 160) // 150)
    for rr in range(rows):
        for c in range(2):
            wx = x + w * (.18 + c * .42)
            wy = y - h + 50 + rr * 150
            g.append(f'<path d="M{wx:.0f},{wy + 100} L{wx:.0f},{wy + 30} A{w * .12:.0f},{w * .12:.0f} 0 0 1 {wx + w * .24:.0f},{wy + 30} L{wx + w * .24:.0f},{wy + 100}Z" '
                     f'fill="{r.choice([YEL, "#2A2238", "#2A2238", "#2A2238"])}" stroke="{INK}" stroke-width="5"/>')
    g.append(f'<path d="M{x + w * .35:.0f},{y} L{x + w * .35:.0f},{y - 110} A{w * .15:.0f},{w * .15:.0f} 0 0 1 {x + w * .65:.0f},{y - 110} L{x + w * .65:.0f},{y}Z" fill="#3A2A2A" stroke="{INK}" stroke-width="{LW}"/>')
    return "".join(g)


def street_lamp(x, y, h=420, lit=True):
    return (thick(f"M{x},{y} L{x},{y - h} Q{x},{y - h - 40} {x - 50},{y - h - 40}", INK, 10, 0)
            + (f'<circle cx="{x - 60}" cy="{y - h - 10}" r="70" fill="{YEL}" opacity=".3"/>' if lit else "")
            + f'<path d="M{x - 86},{y - h - 40} L{x - 34},{y - h - 40} L{x - 44},{y - h} L{x - 76},{y - h}Z" fill="{YEL if lit else GREY}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>')


def snowflake(x, y, s=1.0):
    return "".join(f'<line x1="{x}" y1="{y}" x2="{x + 18 * s * math.cos(math.radians(a)):.1f}" y2="{y + 18 * s * math.sin(math.radians(a)):.1f}" stroke="{WHITE}" stroke-width="{4 * s:.1f}" stroke-linecap="round"/>' for a in range(0, 360, 60))


def palm(x, y, s=1.0):
    fr = "".join(f'<path d="M0,-300 C{60 * math.cos(math.radians(a)):.0f},{-300 + 60 * math.sin(math.radians(a)) - 40:.0f} {150 * math.cos(math.radians(a)):.0f},{-300 + 150 * math.sin(math.radians(a)) - 20:.0f} {190 * math.cos(math.radians(a)):.0f},{-300 + 190 * math.sin(math.radians(a)) + 40:.0f}" fill="none" stroke="{INK}" stroke-width="{30 + 2 * LW}" stroke-linecap="round"/>'
                 f'<path d="M0,-300 C{60 * math.cos(math.radians(a)):.0f},{-300 + 60 * math.sin(math.radians(a)) - 40:.0f} {150 * math.cos(math.radians(a)):.0f},{-300 + 150 * math.sin(math.radians(a)) - 20:.0f} {190 * math.cos(math.radians(a)):.0f},{-300 + 190 * math.sin(math.radians(a)) + 40:.0f}" fill="none" stroke="{BAMBOO}" stroke-width="30" stroke-linecap="round"/>'
                 for a in (200, 240, 280, 320, 350, 170))
    return tr(x, y, s, thick("M0,0 C10,-100 -10,-200 0,-300", BROWN, 30) + fr)


def phone(x, y, s=1.0, glow=True):
    return (f'<g transform="translate({x},{y}) scale({s})">'
            + (f'<circle cx="0" cy="0" r="90" fill="{YEL}" opacity=".25"/>' if glow else "")
            + f'<rect x="-36" y="-62" width="72" height="124" rx="12" fill="{INK}"/><rect x="-28" y="-52" width="56" height="96" rx="4" fill="#DDF3F6"/>'
            + f'<path d="M-12,-10 l10,10 l18,-20" fill="none" stroke="{TEAL}" stroke-width="6" stroke-linecap="round"/></g>')


def bench(x, y, w=700):
    return (f'<rect x="{x - w / 2:.0f}" y="{y - 90}" width="{w}" height="26" rx="6" fill="{WOOD}" stroke="{INK}" stroke-width="{LW}"/>'
            f'<rect x="{x - w / 2:.0f}" y="{y - 160}" width="{w}" height="22" rx="6" fill="{WOOD}" stroke="{INK}" stroke-width="{LW}"/>'
            + thick(f"M{x - w / 2 + 40:.0f},{y - 64} L{x - w / 2 + 40:.0f},{y} M{x + w / 2 - 40:.0f},{y - 64} L{x + w / 2 - 40:.0f},{y}", GREY, 14, 5))


def wave_big(x, y, s=1.0, fill=TEAL):
    d = "M-260,0 C-200,-60 -120,-200 20,-220 C150,-236 230,-150 200,-80 C176,-30 110,-40 112,-90 C114,-130 160,-136 170,-110 C150,-170 60,-170 10,-120 C-60,-50 -120,0 -160,0Z"
    return (f'<g transform="translate({x},{y}) scale({s})"><path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{LW / s:.1f}" stroke-linejoin="round"/>'
            f'<path d="M-180,-40 C-120,-120 -40,-190 40,-196" fill="none" stroke="{WHITE}" stroke-width="{8 / s:.1f}" stroke-linecap="round"/></g>')
