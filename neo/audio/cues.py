"""neo/audio/cues.py: let a film's mix.py read the picture's events by name, and check that the score lands on them.

    from neo.audio import cues as C            # the library root is on sys.path, as for core.audio
    K = C.Cues(EV, fps=24)                     # EV = events.json['ev'], exported from the page's window.EV

    for e in K.events('state'): banjo(..., e['t'])        # sound driven by the picture: one note per event
    t = K.at('title')                                      # the time of the one 'title' event
    ts = K.all('stamp')                                    # every 'stamp' time, in order
    if K.near('car', t, .06): ...                          # is a 'car' event within ±60 ms of this beat? (a busy
                                                           #   picture fills the phrase, a quiet one thins it)
    for e in K.each('roll', 'wagon', 'stamp'): ...         # the foley loop: these types, in time order
    stomp(K.on('spike', bar_t(15)), 1.25)                  # an accent written on the music grid, which must fall
    strum(G, K.on('sec', 9, id='purchase'))                #   on a picture event: returns the score's own time
    impact(K.on('fold', 11.1, k='fold1', end=True))        # …or on the END of an event that has a length (t + d)
    K.report() or sys.exit('mix.py: the score is off the picture')

Why. A score is written on a beat grid, the picture on a timeline. The two are built from the same numbers, but
nothing keeps them equal: move a section in timeline.js and an accent written as `stomp(31)` stays where it was, a
quarter of a second off, with no error. on() names the event the accent belongs to; report() prints every cue with
the distance between score and picture, and fails when one is more than half a frame away (the sound then starts in
another frame than the action). events(), at() and all() take the time from the picture itself, so those sounds
cannot drift; report() lists them as driven. It also names the event types no sound asked for: every visible action
should have a sound (DIRECTOR.md §6), so that list should be empty or deliberate.

Works with any film that follows the page contract (window.EV = [{t, type, ...}]): the names are the film's own event
types and fields, nothing here is tied to one style."""
import sys


class Cues:
    def __init__(self, ev, fps=24):
        self.ev = sorted(ev, key=lambda e: e['t']); self.fps = fps
        self.checked = []          # (label, score time, picture time or None)
        self.driven = {}           # label → number of events read
        self.used = set()          # event types some sound asked for

    def _pick(self, type, match):
        self.used.add(type)
        return [e for e in self.ev if e['type'] == type and all(e.get(k) == v for k, v in match.items())]

    @staticmethod
    def _label(type, match):
        return type + ''.join(f' {k}={v}' for k, v in match.items())

    def _need(self, type, match):
        es = self._pick(type, match)
        if not es:
            have = ', '.join(sorted({e['type'] for e in self.ev}))
            sys.exit(f"cues: the picture has no '{self._label(type, match)}' event. Event types in events.json: {have}")
        return es

    def events(self, type, **match):
        """Every event of this type (and with these field values), in time order: for sounds driven by the picture."""
        es = self._need(type, match); self.driven[self._label(type, match)] = len(es); return es

    def each(self, *types):
        """The events of these types together, in time order: for a foley loop that handles several types."""
        es = [e for e in self.ev if e['type'] in types]
        for t in types:
            n = sum(e['type'] == t for e in es); self.used.add(t)
            if n: self.driven[t] = n
        return es

    def all(self, type, **match):
        """The times of every event of this type, in order."""
        return [e['t'] for e in self.events(type, **match)]

    def at(self, type, i=None, **match):
        """The time of one event: the only one of this type, or the i-th (from 0) when there are several."""
        es = self._need(type, match)
        if i is None and len(es) > 1:
            sys.exit(f"cues: at('{self._label(type, match)}') matches {len(es)} events ({', '.join(str(e['t']) for e in es[:8])}…): "
                     "say which with a field (id='…') or an index (i=0)")
        e = es[i or 0]; lab = self._label(type, match) + (f' #{i}' if i is not None else '')
        self.driven[lab] = self.driven.get(lab, 0) + 1; return e['t']

    def near(self, type, t, w=.06, **match):
        """True when an event of this type lies within ±w seconds of t (to let the picture gate the notes of a phrase)."""
        return any(abs(e['t'] - t) <= w for e in self._pick(type, match))

    def on(self, type, t, end=False, **match):
        """Declare that the score's accent at t belongs to a picture event of this type: the nearest one is taken.
        With end=True the accent belongs to the moment the event ends (its t + d: a fold that has stood up, a slide that
        has docked). Returns t unchanged (the music stays on its grid); report() says how far apart the two are."""
        ts = [e['t'] + (e.get('d', 0) if end else 0) for e in self._pick(type, match)]
        p = min(ts, key=lambda x: abs(x - t)) if ts else None
        self.checked.append((self._label(type, match) + (' (end)' if end else ''), t, p)); return t

    def report(self, tol=None):
        """Print the cue table. False when a declared cue is more than tol seconds from its event (default: half a frame)
        or its event is missing."""
        tol = .5 / self.fps if tol is None else tol; bad = 0
        print(f"cues: {len(self.checked)} checked against the picture (tolerance ±{tol * 1000:.0f} ms), "
              f"{sum(self.driven.values())} driven by it ({', '.join(f'{k} ×{n}' for k, n in self.driven.items()) or 'none'})")
        if self.checked: print(f"  {'cue':28s} {'score s':>9s} {'picture s':>10s} {'Δ ms':>8s}")
        for lab, t, p in self.checked:
            if p is None: bad += 1; print(f'  {lab:28s} {t:9.3f} {"missing":>10s} {"":>8s}  ✗ the picture has no such event')
            else:
                d = (p - t) * 1000; off = abs(p - t) > tol + 1e-9; bad += off
                print(f"  {lab:28s} {t:9.3f} {p:10.3f} {d:+8.1f}" + ('  ✗' if off else ''))
        if self.checked:
            worst = max((abs(p - t) for _, t, p in self.checked if p is not None), default=0)
            print(f'  largest offset {worst * 1000:.1f} ms' + (f'; {bad} cue(s) off the picture' if bad else ''))
        silent = sorted({e['type'] for e in self.ev} - self.used)
        if silent: print('  event types no sound asked for: ' + ', '.join(silent))
        return not bad
