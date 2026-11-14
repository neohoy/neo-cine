#!/usr/bin/env python3
"""旁白（可选）：按 promo.json 镜头里的 vo 逐句生成、逐句做语音检查，写出逐词时间给镜头的 cue 用。

    .venv/bin/python styles/tech-launch/kit/tools/voice.py <工程>
需要库的语音层：sh plugin/skills/neo-cine/scripts/setup.sh deps voice（Kokoro 和模型、faster-whisper、edge-tts）。

台词：镜头的 vo，在镜头开始后 voAt 秒（默认 0.3）说；不跟镜头走的句子写在 audio.voice.lines：{"id", "at"（片中秒数）, "text"}。
引擎（promo.json 的 audio.voice.engine）：
  kokoro（默认）  库的本地 TTS core/tts/tts.py，离线。中文音色 zf_xiaobei、zf_xiaoni、zf_xiaoxiao、zf_xiaoyi（女声）、
                  zm_yunjian、zm_yunxi、zm_yunxia、zm_yunyang（男声），"lang": "cmn"。能用，但音色平淡（TECHNIQUE.md §4）：
                  先生成一两句请用户听过再定。audio.voice.voice 选音色（默认 zm_yunxi），speed 语速（默认 1.0）。
  edge            core/tts/tts_zh.py，微软 Edge 朗读服务（zh-CN-YunxiNeural 等），要联网。它是非官方接口，没有面向开发者的
                  使用条款，微软改接口时会失效：只在用户明确要用时才开，并告诉用户这一点；正式商用片换成真人录音、
                  Azure 语音（同一批音色，有正式条款）或用户自己有授权的复刻音色。audio.voice.voice、rate（默认 +8%）。
  用户自己的录音：把 <id>.wav 放进 voice/，audio.voice.engine 写 "files"，这里只做检查和逐词时间。
每句都过 core/tts/asr_check.py（--lang zh）：转写对不上就停，重新生成或者在台词里写 asr 字段（库的规矩，TECHNIQUE.md §4）。
输出：voice/<id>.wav、voice/lines.json（tools/mix.py 按它放旁白）、voice/cues.json（逐词时间；tools/build.mjs 用它把
镜头的 cue.lift、cue.note 定在念到那个词的那一拍）。台词改了重新跑这一步，再跑 build.mjs。
"""
import json
import os
import subprocess
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get("LIB") or os.path.abspath(os.path.join(KIT, "..", "..", ".."))
PY = os.path.join(LIB, ".venv", "bin", "python")
if not os.path.exists(PY):
    PY = sys.executable
P = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
cfg = json.load(open(os.path.join(P, "promo.json"), encoding="utf-8"))
vc = (cfg.get("audio") or {}).get("voice") or {}
engine = vc.get("engine", "kokoro")
if engine not in ("kokoro", "edge", "files"):
    sys.exit(f"voice.py: audio.voice.engine 不认识：{engine}（kokoro / edge / files）")

# ---------------------------------------------------------------- 台词和时刻
lines, t = [], 0.0
shots = cfg.get("film", {}).get("shots", [])
for i, s in enumerate(shots):
    if s.get("vo"):
        lines.append({"id": f"vo-{i + 1}", "text": s["vo"], "at": round(t + float(s.get("voAt", 0.3)), 3), **({"asr": s["asr"]} if s.get("asr") else {})})
    t += float(s["dur"])
lines += vc.get("lines", [])
if not lines:
    sys.exit("voice.py: 没有台词：在镜头里写 vo，或者在 audio.voice.lines 里写")
DUR = t
for ln in lines:
    if engine == "kokoro":
        ln.update(lang="cmn", voice=vc.get("voice", "zm_yunxi"), speed=float(vc.get("speed", 1.0)))
    elif engine == "edge":
        ln.update(voice=vc.get("voice", "zh-CN-YunxiNeural"), rate=vc.get("rate", "+8%"))
D = os.path.join(P, "voice")
os.makedirs(D, exist_ok=True)
lj = os.path.join(D, "lines.json")
json.dump(lines, open(lj, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def run(args):
    r = subprocess.run([PY, *args], cwd=LIB)
    if r.returncode:
        sys.exit(r.returncode)


if engine == "kokoro":
    run(["core/tts/tts.py", lj, D])
elif engine == "edge":
    print("注意：edge-tts 是微软 Edge 朗读服务的非官方接口，要联网；正式商用片请换成真人录音、Azure 语音或有授权的复刻音色。")
    run(["core/tts/tts_zh.py", lj, D])
else:
    miss = [ln["id"] for ln in lines if not os.path.exists(os.path.join(D, f"{ln['id']}.wav"))]
    if miss:
        sys.exit(f"voice.py: voice/ 里缺这些录音：{', '.join(f'{m}.wav' for m in miss)}")

# ---------------------------------------------------------------- 语音检查（同时写出逐词时间 voice/words.json）
run(["core/tts/asr_check.py", lj, D, "--lang", "zh"])

import soundfile as sf  # noqa: E402

words = json.load(open(os.path.join(D, "words.json"), encoding="utf-8"))
cues, last = {}, None
for ln in sorted(lines, key=lambda x: x["at"]):
    d = sf.info(os.path.join(D, f"{ln['id']}.wav")).duration
    end = ln["at"] + d
    flag = "  ⚠ 超出片尾" if end > DUR else ""
    if last and ln["at"] - last < 0.15:
        flag += f"  ⚠ 和上一句只隔 {ln['at'] - last:.2f} 秒：往后挪（voAt）或者减字"
    print(f"{ln['id']} {ln['at']:.2f}–{end:.2f}s  {ln['text']}{flag}")
    last = end
    cues[ln["id"]] = {"id": ln["id"], "at": ln["at"], "text": ln["text"], "words": [{"t": w[1], "d": round(w[2] - w[1], 3), "w": w[0]} for w in words.get(ln["id"], [])]}
json.dump(cues, open(os.path.join(D, "cues.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"逐词时间 → voice/cues.json（{len(cues)} 句）。下一步：node {os.path.relpath(KIT, LIB)}/tools/build.mjs {P}")
