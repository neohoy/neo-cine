"""neo/audio/master.py: the last step of a film's mix.py, before core/render/mux.sh.

    from neo.audio import master as M          # the library root is on sys.path, as for core.audio
    mix = M.master(mix)                        # (N, 2) float, 48 kHz → about −14 LUFS, true peak under −2 dB
    sf.write(path, mix.astype(np.float32), SR)
    M.check(path) or sys.exit(1)               # will mux.sh raise it with one gain, or reshape it?

Why. mux.sh brings the film to −14 LUFS with ffmpeg's loudnorm. loudnorm applies one gain to the whole mix only when
that gain leaves the true peak under −1.2 dB and the loudness range is 11 LU or less; otherwise it rides the level
(its dynamic mode) and a limiter flattens what is left. A mix that is peak-normalized, with a few heavy hits far above a
quiet body, sits 10 dB and more under the target, so the second case applies: quiet sections come up, loud ones go
down, and the section the film was built to end on can come out as the quietest. master() makes the mix arrive at the
target already, so loudnorm has nothing left to decide:

  1. one gain for the whole mix (sections keep the level differences they were written with);
  2. a soft clip: samples under the knee are untouched, the ones above bend toward a ceiling (it shortens the peaks of
     plucks and hits, a few milliseconds each, and leaves their body);
  3. a look-ahead limiter, the same gain on both channels, for the last 2 dB;
  the gain is found by repeating 1–3 until the result measures the target (BS.1770 loudness, K-weighted and gated).

It prints how much each stage did. Read it: a soft clip that cuts many windows by more than 3 dB, or a limiter that
works more than a few percent of the time, means the mix itself is too peaky (lower the hits or compress that bus)."""
import json, re, subprocess, sys
import numpy as np
from scipy.signal import lfilter, resample_poly
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 48000
_db = lambda v: 20 * np.log10(np.maximum(v, 1e-12))


def lufs(x):
    """Integrated loudness of an (N, 2) or (N,) signal at 48 kHz, in LUFS (ITU-R BS.1770: K weighting, 400 ms blocks
    every 100 ms, the −70 LUFS gate, then the gate 10 LU under the mean)."""
    x = np.asarray(x, np.float64); x = x[:, None] if x.ndim == 1 else x
    y = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
    y = lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], y, axis=0)
    w, h = int(.4 * SR), int(.1 * SR)
    if len(y) <= w: return -70.0
    c = np.cumsum(np.r_[np.zeros((1, y.shape[1])), y ** 2], 0); i = np.arange(0, len(y) - w, h)
    ms = ((c[i + w] - c[i]) / w).sum(1); l = -0.691 + 10 * np.log10(ms + 1e-20)
    ms, l = ms[l > -70], l[l > -70]
    if not len(ms): return -70.0
    rel = -0.691 + 10 * np.log10(ms.mean()) - 10
    return float(-0.691 + 10 * np.log10(ms[l > rel].mean()))


def soft(x, knee, ceil):
    """Soft clip: |x| ≤ knee is returned as it is; above, the level bends toward ceil and never reaches it."""
    a = np.abs(x); over = a > knee; y = np.array(x, np.float64)
    y[over] = np.sign(x[over]) * (knee + (ceil - knee) * np.tanh((a[over] - knee) / (ceil - knee)))
    return y


def limiter(x, ceil, look=.005, rel=.12, hop=16):
    """Look-ahead limiter for (N, 2): one gain for both channels (the image stays put), down `look` seconds before a
    peak, back up over `rel` seconds. The peak it watches is the true peak (4× oversampled): a clipped wave swings up to
    1 dB higher between its samples, and that is the peak loudnorm and the AAC encoder see. Returns (limited, gain)."""
    pk = np.abs(resample_poly(x, 4, 1, axis=0)).reshape(len(x), 4, -1).max((1, 2)); n = max(1, int(look * SR))
    need = minimum_filter1d(np.minimum(1, ceil / np.maximum(pk, 1e-9)), 2 * n + 1)
    m = len(need) // hop * hop
    gd = np.r_[need[:m].reshape(-1, hop).min(1), need[m:].min()] if m < len(need) else need.reshape(-1, hop).min(1)
    k = 1 - np.exp(-hop / (rel * SR)); y = np.empty_like(gd); p = 1.0
    for i, v in enumerate(gd): p = min(v, p + (1 - p) * k); y[i] = p
    g = uniform_filter1d(np.repeat(y, hop)[:len(need)], n, mode='nearest')
    return x * g[:, None], g


def master(mix, target=-14.0, knee_db=-6.0, top_db=0.0, ceil_db=-2.0, rel=.12, report=True):
    """(N, 2) mix → the same mix at `target` LUFS with its true peak at or under `ceil_db` dB: one gain, a soft clip
    from `knee_db` toward `top_db`, a limiter at `ceil_db` (see the top of the file). Prints what each stage did."""
    x = np.asarray(mix, np.float64); l0 = lufs(x)
    if l0 <= -69: print('master: the mix is silent; left as it is'); return x
    knee, top, ceil = (10 ** (d / 20) for d in (knee_db, top_db, ceil_db)); G = target - l0
    for _ in range(8):
        pre = x * 10 ** (G / 20); clipped = soft(pre, knee, top); y, g = limiter(clipped, ceil, rel=rel)
        err = target - lufs(y); G += err
        if abs(err) < .02: break
    if report:
        w = int(.25 * SR); idx = range(0, len(pre) - w, w)
        cut = np.array([_db(np.abs(pre[i:i + w]).max()) - _db(np.abs(clipped[i:i + w]).max()) for i in idx]); gr = -_db(g)
        m = y.mean(1); ws = int(.4 * SR)
        st = np.array([_db(np.sqrt(np.mean(m[i:i + ws] ** 2))) for i in range(0, len(m) - ws, ws // 2)]); live = st[st > st.max() - 40]
        print(f'master: {l0:.1f} → {lufs(y):.1f} LUFS (gain {G:+.1f} dB), peak {_db(np.abs(y).max()):.1f} dBFS, '
              f'loudest 0.4 s window {st.max() - np.median(live):.1f} dB over the median')
        print(f'  soft clip: {100 * np.mean(cut > 1):.0f}% of 0.25 s windows cut by more than 1 dB, {100 * np.mean(cut > 3):.0f}% by more than 3 dB, '
              f'{int((cut > 6).sum())} window(s) by more than 6 dB (deepest {cut.max():.1f} dB at {np.argmax(cut) * .25:.2f} s)')
        print(f'  limiter: working (> 1 dB) {100 * np.mean(gr > 1):.1f}% of the time, at most {gr.max():.1f} dB')
    return y


def check(path, target=-14.0, tp=-1.2, lra=11.0):
    """Measure a written mix the way mux.sh's first pass does and say whether its second pass can stay linear
    (one gain for the whole film). Returns True when it can."""
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', f'loudnorm=I={target}:TP={tp}:LRA={lra}:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    j = re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr)
    if not j: print('check: ffmpeg could not measure ' + path, file=sys.stderr); return False
    d = json.loads(j.group(0)); i, p, l = float(d['input_i']), float(d['input_tp']), float(d['input_lra']); gain = target - i
    ok = p + gain <= tp and l <= lra
    print(f"check: {i:.1f} LUFS, true peak {p:.1f} dB, range {l:.1f} LU → mux.sh needs {gain:+.1f} dB: "
          + ('one gain for the whole film (linear)' if ok else
             f"NOT linear ({'the peak would reach %.1f dB, over %.1f' % (p + gain, tp) if p + gain > tp else 'the range is over %.0f LU' % lra}): loudnorm will ride the level"))
    return ok
