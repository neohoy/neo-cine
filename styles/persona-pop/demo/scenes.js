// 《一起跑通》的十个段落（示范片，DEMO.md）。每段 4 秒 = 2 小节（120 BPM），时间都是段内秒数。
// 画面元件和动作来自 ../kit/page/persona.js；音效不另写表：每个动作在这里用 c.hit() 或 persona.js 的动作登记事件，mix.py 按事件出声。
// 读字规则（STYLE.md §4）：要读的字带 data-read；界面上的小字、刷屏的代码、名牌这类不要求读完的带 data-pass。
import { char, cu, rays, streaks, emo, sparkle, flash, impact, img, rng } from "/styles/persona-pop/kit/page/persona.js";

const shot = (id, plate, inner) => `<div id="${id}" class="shot" style="background:${plate}"><div id="${id}-cam" class="cam">${inner}</div></div>`;
const STORY_VER = "v001"; // 片中剧情里的样片版本号，和歌词一致

// 测试列表（s4、s5 共用）
const TESTS = ["s1 思考计时", "s2 终端刷屏", "s3 分镜表", "s4 立绘格", "s5 逐字歌词", "s6 渲染导出"];
const testCard = (pre, status) => `<div id="${pre}-card" class="card" style="left:90px;top:600px;width:900px;height:600px">
  <div class="bar"><b class="mono" data-read="npm test" data-pass>npm test</b><span id="${pre}-st" class="chip" style="margin-left:auto;background:#EDE6DB;color:var(--ink2)">${status}</span></div>
  ${TESTS.map((t, i) => `<div id="${pre}-r${i}" class="trow" style="top:${92 + i * 82}px"><span data-read="${t}" data-pass>${t}</span><span class="ic"><span id="${pre}-i${i}a" class="i0">…</span><span id="${pre}-i${i}b" class="i1" style="opacity:0"></span></span><i id="${pre}-ring${i}" class="ring"></i></div>`).join("")}
</div>`;

export function scenes() {
  const P = [];
  const add = (id, start, html, build) => P.push({ id, start, dur: 4, html, build });

  // ============ s0 前奏 0–4：片名 + 群聊 → 双人对峙特写 ============
  add("s0-intro", 0, `
    ${shot("s0-a", "var(--paper)", `
      <div id="s0-title" class="title" data-read="一起跑通" data-rid="title">${[..."一起跑通"].map((ch, i) => `<span id="s0-t${i}" style="color:${i < 2 ? "var(--a)" : "var(--ink)"}">${ch}</span>`).join("")}</div>
      <div id="s0-sub" class="sub" data-read="Claude × Codex · 样片 ${STORY_VER}" data-pass>Claude × Codex · 样片 ${STORY_VER}</div>
      ${sparkle("s0-sp1", 150, 250, 70)}${sparkle("s0-sp2", 940, 210, 54, "#D97757")}${sparkle("s0-sp3", 900, 430, 44, "#148F65")}
      <div id="s0-chat" class="card" style="left:100px;top:620px;width:880px;height:520px">
        <div class="bar"><span class="back">‹</span><b>AI 搭档群（3）</b><span class="more">···</span></div>
        <div id="s0-msg" class="msg" data-read="做一支样片" data-pass>做一支样片</div>
        <div id="s0-r1" class="crow" style="top:300px"><span class="av a">*</span><b style="color:var(--a)">小克</b> 正在输入 <span class="dots"><span id="s0-d1"></span><span id="s0-d2"></span><span id="s0-d3"></span></span></div>
        <div id="s0-r2" class="crow" style="top:410px"><span class="av b">&gt;_</span><b style="color:var(--b)">扣扣</b> 正在输入 <span class="dots"><span id="s0-d4"></span><span id="s0-d5"></span><span id="s0-d6"></span></span></div>
      </div>
      ${char("s0-k", "klaude", ["base"], { cx: 290, bottom: -560, h: 1150 })}
      ${char("s0-c", "kodex", ["base"], { cx: 790, bottom: -560, h: 1150 })}
    `)}
    ${shot("s0-b", "var(--navy)", `
      ${rays("s0-rays", "rgba(255,255,255,.07)")}
      <div id="s0-pl" class="vs vs-l">${cu("s0-ck", "klaude", "wink", { cx: 300, h: 1400, bottom: 80 })}</div>
      <div id="s0-pr" class="vs vs-r">${cu("s0-cc", "kodex", "grin", { cx: 790, h: 1400, bottom: -60 })}</div>
      <div id="s0-x" class="vsx">×</div>
      <div id="s0-title2" class="title small" data-read="一起跑通" data-rid="title"><span style="color:var(--a)">一起</span>跑通</div>
      <div id="s0-nk" class="name" style="left:60px;top:1060px;background:var(--navy)" data-read="小克 Claude 娘" data-pass>小克<small>Claude 娘</small></div>
      <div id="s0-nc" class="name" style="right:60px;top:1250px;background:var(--b)" data-read="扣扣 Codex 娘" data-pass>扣扣<small>Codex 娘</small></div>
      ${flash("s0-fl")}
    `)}`,
    (c) => {
      const { tl } = c;
      c.cut(["s0-a", "s0-b"], [0, 2.0]);
      [0, 1, 2, 3].forEach((i) => tl.fromTo("#s0-t" + i, { y: 0 }, { y: -36, duration: 0.12, ease: "power2.out", yoyo: true, repeat: 1, immediateRender: false }, 0.5 + i * 0.12));
      c.twinkle("#s0-sp1", 0.1, 0.9); c.twinkle("#s0-sp2", 0.5, 0.9); c.twinkle("#s0-sp3", 1.0, 0.9);
      c.inFrom("#s0-chat", 0, { y: 90, opacity: 0, rotation: 2 }, 0.4);
      c.pop("#s0-msg", 0.1); c.pop("#s0-r1", 0.25); c.pop("#s0-r2", 0.75);
      c.hit("ding", 0.25); c.hit("ding", 0.75);
      ["s0-d1", "s0-d2", "s0-d3"].forEach((d, i) => tl.fromTo("#" + d, { y: 0 }, { y: -12, duration: 0.18, yoyo: true, repeat: 5, ease: "sine.inOut" }, 0.4 + i * 0.09));
      ["s0-d4", "s0-d5", "s0-d6"].forEach((d, i) => tl.fromTo("#" + d, { y: 0 }, { y: -12, duration: 0.18, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.9 + i * 0.09));
      c.inFrom("#s0-k", 0.3, { y: 420, opacity: 1 }, 0.5);
      c.inFrom("#s0-c", 0.7, { y: 420, opacity: 1 }, 0.5);
      c.hop("s0-k", 1.0, 40); c.hop("s0-c", 1.5, 40);
      // 对峙
      c.flashAt("#s0-fl", 2.0, 1);
      c.spin("#s0-rays", 2.0, 2, 25);
      tl.fromTo("#s0-pl", { x: -700 }, { x: 0, duration: 0.3, ease: "power4.out" }, 2.0);
      tl.fromTo("#s0-pr", { x: 700 }, { x: 0, duration: 0.3, ease: "power4.out" }, 2.0);
      tl.fromTo("#s0-ck", { y: 0 }, { y: -30, duration: 2, ease: "sine.inOut" }, 2.0);
      tl.fromTo("#s0-cc", { y: 0 }, { y: -30, duration: 2, ease: "sine.inOut" }, 2.0);
      tl.fromTo("#s0-x", { scale: 3, rotation: -30, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.2, ease: "power4.in" }, 2.05);
      c.hit("thud", 2.0); c.hit("stamp", 2.25);
      tl.fromTo("#s0-nk", { x: -500, rotation: -4 }, { x: 0, rotation: -4, duration: 0.3, ease: "power3.out" }, 2.25);
      tl.fromTo("#s0-nc", { x: 500, rotation: -4 }, { x: 0, rotation: -4, duration: 0.3, ease: "power3.out" }, 2.35);
      c.shake("#s0-b-cam", 2.25, 18, 0.3);
      c.kick("#s0-b-cam", 3.0, 4, 0.5, 0.03);
    });

  // ============ s1 思考 4–8：全身 + 计时 → 特写（"等等让我想想"居中大字） ============
  add("s1-think", 4, `
    ${shot("s1-a", "var(--paper)", `
      <div id="s1-card" class="card" style="left:480px;top:620px;width:520px;height:470px">
        <div class="head"><span id="s1-spin" class="spin"></span>思考中… <b id="s1-sec" style="color:var(--ink)">0.8</b> 秒</div>
        <div id="s1-l1" class="tline" style="top:110px" data-read="嗯，用户要一支样片。" data-pass>嗯，用户要一支样片。</div>
        <div id="s1-l2" class="tline" style="top:220px" data-read="先写分镜？还是先出图？" data-pass>先写分镜？还是先出图？</div>
        <div id="s1-l3" class="tline" style="top:330px" data-read="先列个提纲……" data-pass>先列个提纲……</div>
      </div>
      <div id="s1-q1" class="qm" style="left:90px;top:760px">?</div>
      <div id="s1-q2" class="qm" style="left:380px;top:690px;font-size:90px">?</div>
      ${char("s1-k", "klaude", ["think"], { cx: 300, bottom: -260, h: 1250 })}
    `)}
    ${shot("s1-b", "#E8ECFF", `
      <div id="s1-ring" class="ringbg"></div>
      <div id="s1-dr1" class="drift" style="top:640px" data-read="先拆分镜？先出图？先写歌？" data-pass>先拆分镜？先出图？先写歌？</div>
      <div id="s1-dr2" class="drift" style="top:860px" data-read="要不要再想一版……" data-pass>要不要再想一版……</div>
      <div id="s1-dr3" class="drift" style="top:1080px" data-read="等等，用户真正想要的是……" data-pass>等等，用户真正想要的是……</div>
      ${cu("s1-ck", "klaude", "think", { cx: 540, h: 1550, bottom: -120, mouth: true })}
      ${emo("s1-e1", "( ·_· ;)", 700, 700)}
      <div id="s1-bulb" class="bulb">${rays("s1-bulbr", "rgba(242,193,78,.55)", "transparent", 10)}<b>!</b></div>
      <div id="s1-timer" class="pill">思考中… <b id="s1-sec2">2.0</b> 秒</div>
      <div id="s1-done" class="pill done" data-read="✓ 已深度思考（用时 6.0 秒）" data-pass>✓ 已深度思考（用时 6.0 秒）</div>
      ${flash("s1-fl")}
    `)}`,
    (c) => {
      const { tl } = c;
      c.hit("cut", 0);
      c.cut(["s1-a", "s1-b"], [0, 1.45]);
      c.inFrom("#s1-k", 0, { x: -260, opacity: 0 }, 0.4, "power3.out");
      c.inFrom("#s1-card", 0.05, { y: 80, opacity: 0, rotation: 3 }, 0.4);
      c.spin("#s1-spin", 0, 1.5, 540);
      c.count("s1-sec", 0.8, 2.0, 0.05, 1.4, (v) => v.toFixed(1), "none");
      c.inFrom("#s1-l1", 0.3, { x: 40, opacity: 0 }, 0.25, "power3.out");
      c.inFrom("#s1-l2", 0.7, { x: 40, opacity: 0 }, 0.25, "power3.out");
      c.inFrom("#s1-l3", 1.1, { x: 40, opacity: 0 }, 0.25, "power3.out");
      c.pop("#s1-q1", 0.5); c.pop("#s1-q2", 1.0); c.hit("tick", 0.5); c.hit("tick", 1.0);
      c.bob("s1-k", 0, 1.45, 0.5, 0.025);
      c.kick("#s1-a-cam", 0, 1.45, 1, 0.02);
      // 特写
      c.flashAt("#s1-fl", 1.45, 0.8);
      tl.fromTo("#s1-ck", { scale: 1, y: 0 }, { scale: 1.12, y: 60, duration: 2.55, ease: "sine.inOut" }, 1.45);
      c.sing("s1-ck", "klaude", 1.45, 4, { blinks: [3.15, 3.7] });
      tl.fromTo("#s1-ring", { scale: 0.9 }, { scale: 1.15, duration: 2.55, ease: "none" }, 1.45);
      tl.fromTo("#s1-dr1", { x: 1100 }, { x: -1300, duration: 2.6, ease: "none" }, 1.45);
      tl.fromTo("#s1-dr2", { x: -1100 }, { x: 900, duration: 2.6, ease: "none" }, 1.45);
      tl.fromTo("#s1-dr3", { x: 1200 }, { x: -1000, duration: 2.6, ease: "none" }, 1.45);
      c.emoPop("#s1-e1", 2.25, 1.1);
      c.count("s1-sec2", 2.0, 6.0, 1.45, 1.9, (v) => v.toFixed(1), "power2.in");
      tl.set("#s1-timer", { opacity: 0 }, 3.4);
      tl.fromTo("#s1-done", { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(3)" }, 3.4);
      tl.fromTo("#s1-bulb", { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(3)" }, 3.4);
      c.spin("#s1-bulbr", 3.4, 0.6, 40);
      c.hit("chime", 3.4);
      tl.fromTo("#s1-ck-body", { rotation: 0 }, { rotation: -3, duration: 0.2, yoyo: true, repeat: 1, immediateRender: false }, 3.4);
    });

  // ============ s2 开跑 8–12：撞进特写（"别想了"居中大字） → 终端刷屏 ============
  const TERM = [
    [1.6, `<span class="g">›</span> 读取 docs/角色设定.md`],
    [1.85, `<span class="g">›</span> image_gen  klaude-think.png  <span class="ok">✓</span>`],
    [2.05, `<span class="g">›</span> image_gen  klaude-write.png  <span class="ok">✓</span>`],
    [2.25, `<span class="g">›</span> image_gen  kodex-type.png   <span class="ok">✓</span>`],
    [2.45, `<span class="g">›</span> image_gen  kodex-point.png  <span class="ok">✓</span>`],
    [2.65, `<span class="g">›</span> image_gen  kodex-panic.png  <span class="ok">✓</span>`],
    [3.0, `<span class="ok">✓ 12/12 已生成</span>  <span class="dim">用时 41s</span>`],
  ];
  const R2 = rng(7);
  const RAIN = Array.from({ length: 16 }, () => ({ x: Math.round(R2() * 1040), d: 0.9 + R2() * 1.2, s: R2() * 0.8, txt: Array.from({ length: 10 }, () => "01>_{}#$"[Math.floor(R2() * 8)]).join("<br>") }));
  add("s2-run", 8, `
    ${shot("s2-a", "#2FBF8F", `
      ${streaks("s2-st", "rgba(255,255,255,.85)", 16, 3)}
      ${char("s2-k", "klaude", ["think"], { cx: 300, bottom: -260, h: 1250 })}
      ${cu("s2-cc", "kodex", "hype", { cx: 560, h: 1550, bottom: -100, z: 3, mouth: true })}
      <div id="s2-bang" class="bang">!!</div>
      ${flash("s2-fl")}
    `)}
    ${shot("s2-b", "#151A33", `
      ${RAIN.map((r, i) => `<div id="s2-r${i}" class="rain" style="left:${r.x}px">${r.txt}</div>`).join("")}
      ${char("s2-c", "kodex", ["type", "point"], { cx: 560, bottom: -470, h: 1250, z: 5 })}
      <div id="s2-term" class="card term" style="left:80px;top:600px;width:920px;height:520px">
        <div class="bar"><span class="dot" style="background:#FF5F57"></span><span class="dot" style="background:#FEBC2E"></span><span class="dot" style="background:#28C840"></span><b style="margin-left:18px">zsh — mv-claude-codex</b></div>
        <div class="tl mono" style="top:92px"><span class="g">$</span> <span id="s2-cmd" data-read='codex exec "出 12 张立绘"' data-pass></span><span id="s2-cursor" class="cursor"></span></div>
        ${TERM.map(([, h], i) => `<div id="s2-l${i}" class="tl mono" style="top:${150 + i * 50}px" data-read="${h.replace(/<[^>]+>/g, "").replace(/"/g, "")}" data-pass>${h}</div>`).join("")}
      </div>
      ${rays("s2-burst", "rgba(91,227,176,.25)", "transparent", 12, "opacity:0;")}
      ${flash("s2-fl2")}
    `)}`,
    (c) => {
      const { tl } = c;
      c.hit("cut", 0); c.hit("thud", 0);
      c.cut(["s2-a", "s2-b"], [0, 1.45]);
      c.flashAt("#s2-fl", 0, 1);
      c.streak("#s2-st", 0, 1.45, -1500);
      tl.fromTo("#s2-k", { x: 0, rotation: 0 }, { x: -900, rotation: -25, duration: 0.3, ease: "power3.in" }, 0);
      tl.fromTo("#s2-cc", { x: 900, rotation: 12 }, { x: 0, rotation: 0, duration: 0.3, ease: "back.out(1.3)" }, 0.02);
      tl.fromTo("#s2-cc", { scale: 1 }, { scale: 1.08, duration: 1.1, ease: "sine.out", immediateRender: false }, 0.35);
      c.sing("s2-cc", "kodex", 0, 1.45, { blinks: [1.05] });
      tl.fromTo("#s2-bang", { scale: 3, opacity: 0, rotation: 20 }, { scale: 1, opacity: 1, rotation: 8, duration: 0.18, ease: "power4.in" }, 0.25);
      c.shake("#s2-a-cam", 0.3, 22, 0.3);
      c.kick("#s2-a-cam", 0.5, 1.45, 0.5, 0.03);
      // 终端
      c.flashAt("#s2-fl2", 1.45, 0.6);
      RAIN.forEach((r, i) => tl.fromTo("#s2-r" + i, { y: 0 }, { y: 2700, duration: r.d * 2, ease: "none" }, 1.45 - r.s));
      c.inFrom("#s2-term", 1.45, { y: -80, opacity: 0, scale: 0.92 }, 0.3, "back.out(1.6)");
      c.inFrom("#s2-c", 1.5, { y: 400, opacity: 1 }, 0.35, "power3.out");
      c.typeText("s2-cmd", 'codex exec "出 12 张立绘"', 1.5, 0.35);
      tl.fromTo("#s2-cursor", { opacity: 1 }, { opacity: 0, duration: 0.2, yoyo: true, repeat: 12, ease: "steps(1)" }, 1.45);
      TERM.forEach(([t], i) => { c.inFrom("#s2-l" + i, t, { x: -40, opacity: 0 }, 0.12, "power2.out"); c.hit("tick", t); });
      // 角色一动，界面必变：每敲一下终端多一行（STYLE.md §8）
      for (let t = 1.6; t < 2.8; t += 0.125) tl.fromTo("#s2-c-body", { y: 0 }, { y: -10, duration: 0.06, yoyo: true, repeat: 1, immediateRender: false }, t);
      c.swap("s2-c-type", "s2-c-point", 2.8);
      tl.fromTo("#s2-c-body", { scale: 1 }, { scale: 1.12, duration: 0.3, ease: "back.out(2)", immediateRender: false }, 2.8);
      tl.fromTo("#s2-burst", { opacity: 0, rotation: 0 }, { opacity: 1, rotation: 30, duration: 1.2, ease: "power1.out" }, 2.8);
      c.shake("#s2-term", 2.8, 12, 0.3); c.hit("thud", 2.8);
      c.kick("#s2-b-cam", 2.0, 4, 0.5, 0.02);
    });

  // ============ s3 分工 12–16：分镜表 → 12 宫格立绘（"我出立绘"居中大字） ============
  const SBL = [
    `{ <k>"scene"</k>: "s1", <k>"lyric"</k>: "等等让我想想",`,
    `  <k>"pose"</k>: "klaude-think", <k>"ui"</k>: "思考计时" },`,
    `{ <k>"scene"</k>: "s2", <k>"lyric"</k>: "直接开跑",`,
    `  <k>"pose"</k>: "kodex-type", <k>"ui"</k>: "终端" },`,
  ];
  const GRID = [["klaude", "base"], ["kodex", "base"], ["klaude", "think"], ["kodex", "type"], ["klaude", "write"], ["kodex", "point"], ["klaude", "panic"], ["kodex", "panic"], ["klaude", "cheer"], ["kodex", "cheer"], ["klaude", "peace"], ["kodex", "peace"]];
  add("s3-split", 12, `
    ${shot("s3-a", "#F6DCCD", `
      <div id="s3-p1" class="paper" style="left:640px;top:980px"><i></i><i style="width:70%"></i><i></i><i style="width:50%"></i><i></i></div>
      <div id="s3-p2" class="paper" style="left:700px;top:1060px"><i></i><i style="width:60%"></i><i></i><i></i><i style="width:40%"></i></div>
      <div id="s3-sb" class="card" style="left:80px;top:600px;width:920px;height:330px;z-index:3">
        <div class="bar"><b>storyboard.json</b><span class="chip a" style="margin-left:auto">小克 · 写分镜</span></div>
        ${SBL.map((l, i) => `<div id="s3-l${i}" class="code mono" style="top:${100 + i * 52}px" data-read="${l.replace(/<[^>]+>/g, "").replace(/"/g, "")}" data-pass>${l}</div>`).join("")}
      </div>
      <svg id="s3-pen" viewBox="0 0 620 200"><path id="s3-path" d="M10 120 C 80 20, 140 190, 210 90 S 330 30, 380 120 S 520 170, 600 60" fill="none" stroke="#D97757" stroke-width="14" stroke-linecap="round" stroke-dasharray="900" stroke-dashoffset="900"/></svg>
      ${char("s3-k", "klaude", ["write"], { cx: 280, bottom: -280, h: 1200 })}
      ${emo("s3-e1", "认真中…", 90, 960, { size: 40, bg: "#D97757", color: "#fff" })}
    `)}
    ${shot("s3-b", "#1F1F1F", `
      <div class="gridbg"></div>
      <div id="s3-grid" class="grid">
        ${GRID.map(([w, p], i) => `<div id="s3-t${i}" class="tile" style="left:${(i % 3) * 330}px;top:${Math.floor(i / 3) * 330}px"><img alt="" src="${img(w, p)}"><b data-read="${w}-${p}" data-pass>${w}-${p}</b></div>`).join("")}
      </div>
      <div id="s3-gc" class="gcount"><span id="s3-gcn" data-read="image_gen 12/12" data-pass>image_gen 0/12</span></div>
      ${flash("s3-fl")}
    `)}`,
    (c) => {
      const { tl } = c;
      c.hit("cut", 0);
      c.cut(["s3-a", "s3-b"], [0, 1.95]);
      c.inFrom("#s3-sb", 0, { y: 70, opacity: 0, rotation: -2 }, 0.35);
      [0.2, 0.5, 0.8, 1.1].forEach((t, i) => c.inFrom("#s3-l" + i, t, { x: 30, opacity: 0 }, 0.18, "power2.out"));
      c.hit("type", 0.2, { d: 1.1 });
      c.inFrom("#s3-k", 0, { x: -300, opacity: 0 }, 0.4, "power3.out");
      tl.fromTo("#s3-p1", { y: 300, rotation: -20, opacity: 0 }, { y: 0, rotation: 8, opacity: 1, duration: 0.6, ease: "back.out(1.5)" }, 0.3);
      tl.fromTo("#s3-p2", { y: 300, rotation: 20, opacity: 0 }, { y: 0, rotation: -6, opacity: 1, duration: 0.6, ease: "back.out(1.5)" }, 0.5);
      tl.fromTo("#s3-path", { attr: { "stroke-dashoffset": 900 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1.1, ease: "power1.inOut" }, 0.6);
      c.emoPop("#s3-e1", 0.4);
      for (let t = 0.25; t < 1.9; t += 0.25) tl.fromTo("#s3-k-body", { rotation: 0 }, { rotation: 1.6, duration: 0.1, yoyo: true, repeat: 1, immediateRender: false }, t);
      c.kick("#s3-a-cam", 0, 1.95, 1, 0.02);
      // 12 宫格：一拍翻一张（翻牌 = 横向压扁再弹开）
      c.flashAt("#s3-fl", 1.95, 0.7);
      for (let i = 0; i < 12; i++) {
        const t = 2.05 + i * 0.1;
        tl.fromTo("#s3-t" + i, { scaleX: 0, scaleY: 0.6, opacity: 0 }, { scaleX: 1, scaleY: 1, opacity: 1, duration: 0.25, ease: "back.out(2)" }, t);
        if (i % 2 === 0) c.hit("pop", t);
      }
      c.count("s3-gcn", 0, 12, 2.05, 1.2, (v) => "image_gen " + Math.round(v) + "/12", "none");
      tl.fromTo("#s3-grid", { scale: 1.06 }, { scale: 1, duration: 1.95, ease: "power1.out" }, 2.05);
      tl.fromTo("#s3-gc", { scale: 1 }, { scale: 1.15, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out", immediateRender: false }, 3.25);
    });

  // ============ s4 翻车 16–20：测试变红 → 红底双人慌张特写，最后半秒冻结、真静默 ============
  const FAIL = [0, 2, 3, 5], PASS4 = [1, 4];
  const R4 = rng(11);
  add("s4-fail", 16, `
    ${shot("s4-a", "var(--paper)", `
      <div id="s4-tint" class="tint"></div>
      ${testCard("s4", "运行中…")}
      ${char("s4-k", "klaude", ["write"], { cx: 270, bottom: -440, h: 1100 })}
      ${char("s4-c", "kodex", ["type"], { cx: 810, bottom: -440, h: 1100 })}
      ${emo("s4-e1", "嗯？", 380, 1290, { size: 44 })}
      <div id="s4-g1" class="glitch" style="top:700px;background:#00E5FF"></div>
      <div id="s4-g2" class="glitch" style="top:900px;background:#FF2BD6"></div>
      <div id="s4-g3" class="glitch" style="top:1080px;background:#00E5FF;height:24px"></div>
    `)}
    ${shot("s4-b", "var(--red)", `
      ${rays("s4-rays", "rgba(0,0,0,.14)", "transparent", 18)}
      ${Array.from({ length: 12 }, (_, i) => `<div id="s4-x${i}" class="fallx" style="left:${Math.round(R4() * 1000)}px">×</div>`).join("")}
      <div id="s4-pl" class="panel" style="left:30px;top:560px;background:#F6DCCD">${cu("s4-ck", "klaude", "panic", { cx: 260, h: 1000, bottom: -60 })}</div>
      <div id="s4-pr" class="panel" style="left:530px;top:640px;background:#DDF3EA">${cu("s4-cc", "kodex", "panic", { cx: 260, h: 1000, bottom: -60 })}</div>
      ${emo("s4-e2", "(°ロ°)!!", 60, 520, { size: 50 })}
      ${emo("s4-e3", "(@_@;)", 740, 600, { size: 50 })}
      <div id="s4-big" class="verdict" data-read="FAIL">FAIL</div>
      ${impact("s4-imp")}
      ${flash("s4-fl")}
    `)}`,
    (c) => {
      const { tl } = c;
      c.hit("cut", 0);
      c.cut(["s4-a", "s4-b"], [0, 1.95]);
      c.inFrom("#s4-card", 0, { y: 70, opacity: 0 }, 0.3, "power3.out");
      c.inFrom("#s4-k", 0, { y: 300, opacity: 1 }, 0.35, "power3.out");
      c.inFrom("#s4-c", 0.08, { y: 300, opacity: 1 }, 0.35, "power3.out");
      FAIL.forEach((r, i) => {
        const t = 0.25 + i * 0.5, b = c.E("s4-i" + r + "b");
        b.textContent = "×"; b.className = "i1 bad";
        tl.set("#s4-i" + r + "a", { opacity: 0 }, t); tl.set("#s4-i" + r + "b", { opacity: 1 }, t);
        tl.fromTo("#s4-i" + r + "b", { scale: 2.6 }, { scale: 1, duration: 0.22, ease: "back.out(2)" }, t);
        tl.fromTo("#s4-r" + r, { backgroundColor: "rgba(229,72,77,0)" }, { backgroundColor: "rgba(229,72,77,0.14)", duration: 0.12 }, t);
        tl.fromTo("#s4-tint", { opacity: 0.08 * i }, { opacity: 0.08 * (i + 1), duration: 0.1, immediateRender: false }, t);
        c.shake("#s4-a-cam", t, 10 + i * 4, 0.25);
        ["#s4-g1", "#s4-g2", "#s4-g3"].forEach((g, k) => tl.fromTo(g, { opacity: 0.8, x: 0 }, { opacity: 0, x: (k % 2 ? 1 : -1) * 60, duration: 0.12, ease: "steps(3)", immediateRender: false }, t + k * 0.02));
        c.hit("buzz", t);
      });
      PASS4.forEach((r, i) => { const t = 0.5 + i * 1.0, b = c.E("s4-i" + r + "b"); b.textContent = "✓"; b.className = "i1 good"; tl.set("#s4-i" + r + "a", { opacity: 0 }, t); tl.set("#s4-i" + r + "b", { opacity: 1 }, t); });
      c.emoPop("#s4-e1", 0.8, 1.0);
      // 红底特写：冲击帧、判决大字、甩进来的两格漫画
      c.flashAt("#s4-fl", 1.95, 1);
      c.impactAt("#s4-imp", 1.95);
      c.spin("#s4-rays", 1.95, 1.55, 16);
      tl.fromTo("#s4-pl", { x: -600, rotation: -15 }, { x: 0, rotation: -3, duration: 0.25, ease: "power4.out" }, 1.95);
      tl.fromTo("#s4-pr", { x: 600, rotation: 15 }, { x: 0, rotation: 3, duration: 0.25, ease: "power4.out" }, 2.0);
      tl.fromTo("#s4-ck-body", { x: 0 }, { keyframes: { x: [0, -10, 10, -8, 8, -5, 5, 0] }, duration: 0.6, ease: "none", repeat: 0, immediateRender: false }, 2.2);
      tl.fromTo("#s4-cc-body", { x: 0 }, { keyframes: { x: [0, 10, -10, 8, -8, 5, -5, 0] }, duration: 0.6, ease: "none", immediateRender: false }, 2.25);
      tl.fromTo("#s4-ck-body", { x: 0 }, { keyframes: { x: [0, -8, 8, -6, 6, 0] }, duration: 0.5, ease: "none", immediateRender: false }, 2.9);
      tl.fromTo("#s4-cc-body", { x: 0 }, { keyframes: { x: [0, 8, -8, 6, -6, 0] }, duration: 0.5, ease: "none", immediateRender: false }, 2.95);
      tl.fromTo("#s4-big", { opacity: 0, scale: 2.6, rotation: -12 }, { opacity: 1, scale: 1, rotation: -5, duration: 0.18, ease: "power4.in" }, 1.98);
      c.hit("thud", 1.95); c.hit("stamp", 2.16);
      c.shake("#s4-b-cam", 2.2, 26, 0.4);
      c.emoPop("#s4-e2", 2.4); c.emoPop("#s4-e3", 2.6);
      for (let i = 0; i < 12; i++) tl.fromTo("#s4-x" + i, { y: 0, rotation: 0 }, { y: 2200, rotation: (i % 2 ? 1 : -1) * 200, duration: 1.0 + (i % 4) * 0.1, ease: "power1.in" }, 2.0 + (i % 6) * 0.08);
      // 冻结：最后半秒一切停住，鼓和贝斯抽掉，留真静默；下一拍"跑通"是全片最重的一声（STYLE.md §6）
      c.freeze(3.5, 0.5);
    });

  // ============ s5 跑通 20–24：逐个变绿（"跑通，跑通"居中大字） → 绿底欢呼 ============
  const R5 = rng(5);
  const CF = Array.from({ length: 36 }, () => [R5() * 1700 + 900, R5() * 900 - 450, R5() * 720 - 360, R5() * 0.5, Math.round(R5() * 1040)]);
  add("s5-pass", 20, `
    ${shot("s5-a", "#EAF6EF", `
      ${testCard("s5", "FAIL 7/12")}
      ${char("s5-k0", "klaude", ["panic", "cheer"], { cx: 270, bottom: -500, h: 1100 })}
      ${char("s5-c0", "kodex", ["panic", "cheer"], { cx: 810, bottom: -500, h: 1100 })}
      ${impact("s5-imp0", "#2F9E62")}
    `)}
    ${shot("s5-b", "var(--green)", `
      ${rays("s5-rays", "rgba(255,255,255,.14)", "transparent", 16)}
      <div id="s5-band" class="band" style="top:1320px"><span id="s5-bt" data-read="ALL GREEN ✓ 全部通过" data-pass>ALL GREEN ✓ 全部通过 ✓ ALL GREEN ✓ 全部通过 ✓ ALL GREEN ✓ 全部通过 ✓</span></div>
      <div id="s5-big" class="verdict good" data-read="12/12">12/12</div>
      ${char("s5-k", "klaude", ["cheer"], { cx: 290, bottom: -380, h: 1150, z: 5 })}
      ${char("s5-c", "kodex", ["cheer"], { cx: 800, bottom: -380, h: 1150, z: 5 })}
      ${CF.map((f, i) => `<div id="s5-cf${i}" class="cf" style="left:${f[4]}px;background:${["#D97757", "#fff", "#F2C14E", "#1F1F1F", "#6E8BF5"][i % 5]}"></div>`).join("")}
      ${sparkle("s5-sp1", 160, 760, 80, "#fff")}${sparkle("s5-sp2", 930, 700, 64, "#F2C14E")}${sparkle("s5-sp3", 880, 1100, 50, "#fff")}
      ${impact("s5-imp", "#1E7A48")}
      ${flash("s5-fl")}
    `)}`,
    (c) => {
      const { tl } = c;
      c.hit("cut", 0);
      c.cut(["s5-a", "s5-b"], [0, 1.95]);
      c.impactAt("#s5-imp0", 0);
      for (let r = 0; r < 6; r++) { const b = c.E("s5-i" + r + "b"); b.textContent = "✓"; b.className = "i1 good"; const a = c.E("s5-i" + r + "a"); a.textContent = "×"; a.className = "i0 bad"; }
      [[0, 1], [2, 3], [4], [5]].forEach((rows, k) => {
        const t = k * 0.5;
        c.hit("chime", t);
        rows.forEach((r) => {
          tl.set("#s5-i" + r + "a", { opacity: 0 }, t); tl.set("#s5-i" + r + "b", { opacity: 1 }, t);
          tl.fromTo("#s5-i" + r + "b", { scale: 2.6, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.25, ease: "back.out(2.5)" }, t);
          tl.fromTo("#s5-r" + r, { backgroundColor: "rgba(47,158,98,0)" }, { backgroundColor: "rgba(47,158,98,0.15)", duration: 0.12 }, t);
          tl.fromTo("#s5-ring" + r, { scale: 0.3, opacity: 1 }, { scale: 1.8, opacity: 0, duration: 0.45, ease: "power2.out" }, t);
        });
      });
      const st = c.E("s5-st");
      tl.set(st, { backgroundColor: "#E5484D", color: "#fff" }, 0);
      tl.set(st, { backgroundColor: "#2F9E62" }, 1.5);
      c.count("s5-st", 0, 1, 1.5, 0.01, (v) => (v > 0.5 ? "PASS 12/12" : "FAIL 7/12"));
      c.inFrom("#s5-k0", 0, { y: 300, opacity: 1 }, 0.3, "power3.out");
      c.inFrom("#s5-c0", 0.05, { y: 300, opacity: 1 }, 0.3, "power3.out");
      c.swap("s5-k0-panic", "s5-k0-cheer", 1.0); c.swap("s5-c0-panic", "s5-c0-cheer", 1.5);
      c.kick("#s5-a-cam", 0, 1.95, 0.5, 0.02);
      // 绿底欢呼
      c.flashAt("#s5-fl", 1.95, 1);
      c.impactAt("#s5-imp", 1.95);
      c.spin("#s5-rays", 1.95, 2.05, 45);
      tl.fromTo("#s5-big", { opacity: 0, scale: 0.2, rotation: -20 }, { opacity: 1, scale: 1, rotation: -4, duration: 0.3, ease: "back.out(2.5)" }, 1.98);
      c.hit("success", 1.95);
      tl.fromTo("#s5-bt", { x: 0 }, { x: -700, duration: 2.05, ease: "none" }, 1.95);
      tl.fromTo("#s5-band", { x: 900, rotation: -8 }, { x: 0, rotation: -8, duration: 0.25, ease: "power3.out" }, 2.1);
      c.inFrom("#s5-k", 1.95, { y: 500, opacity: 1 }, 0.3, "back.out(1.5)");
      c.inFrom("#s5-c", 2.0, { y: 500, opacity: 1 }, 0.3, "back.out(1.5)");
      for (let b = 0; b < 4; b++) { c.hop("s5-k", 2.25 + b * 0.5, 80); c.hop("s5-c", 2.5 + b * 0.5, 80); }
      c.kick("#s5-b-cam", 2.0, 4, 0.5, 0.035);
      CF.forEach(([dy, dx, rot, dl], i) => tl.fromTo("#s5-cf" + i, { y: 0, x: 0, rotation: 0 }, { y: dy, x: dx, rotation: rot, duration: 1.8, ease: "power1.in" }, 2.0 + dl));
      c.twinkle("#s5-sp1", 2.2, 0.8); c.twinkle("#s5-sp2", 2.6, 0.8); c.twinkle("#s5-sp3", 3.0, 0.8);
    });

  // ============ s6 各改各的 24–28：斜切分屏，亮面左右交替，警戒胶带横穿 ============
  const LANES = { k: ["docs/歌词.md", "storyboard.json", "scripts/score.py"], c: ["chars/*.png", "scripts/key.py", "compositions/"] };
  add("s6-lanes", 24, `
    ${shot("s6-a", "var(--paper)", `
      <div id="s6-hk" class="half" style="background:var(--a);clip-path:polygon(0 0, 58% 0, 42% 100%, 0 100%)">
        ${char("s6-k", "klaude", ["base", "peace"], { cx: 260, bottom: -330, h: 1050 })}
        <div class="lane" style="left:50px;top:620px">
          <span class="chip" style="background:#fff;color:var(--a);margin-bottom:14px">小克的泳道</span>
          ${LANES.k.map((f, i) => `<div id="s6-fk${i}" class="file mono" data-read="${f}" data-pass>${f}${i === 1 ? `<span id="s6-lock1" class="lock"></span>` : ""}</div>`).join("")}
        </div>
        <div id="s6-dk" class="dim" style="opacity:0"></div>
      </div>
      <div id="s6-hc" class="half" style="background:#1F1F1F;clip-path:polygon(58% 0, 100% 0, 100% 100%, 42% 100%)">
        ${char("s6-c", "kodex", ["base", "peace"], { cx: 820, bottom: -330, h: 1050 })}
        <div class="lane" style="left:610px;top:620px">
          <span class="chip b" style="margin-bottom:14px">扣扣的泳道</span>
          ${LANES.c.map((f, i) => `<div id="s6-fc${i}" class="file mono" data-read="${f}" data-pass>${f}${i === 0 ? `<span id="s6-lock2" class="lock"></span>` : ""}</div>`).join("")}
        </div>
        <div id="s6-dc" class="dim"></div>
      </div>
      <div id="s6-tape" class="tape"><b><span data-read="⚠ 别碰同一个文件 ⚠">⚠ 别碰同一个文件 ⚠</span></b></div>
      ${flash("s6-fl")}
    `)}`,
    (c) => {
      const { tl } = c;
      c.hit("cut", 0);
      tl.set("#s6-a", { opacity: 1 }, 0);
      tl.fromTo("#s6-hk", { x: -1100 }, { x: 0, duration: 0.3, ease: "power4.out" }, 0);
      tl.fromTo("#s6-hc", { x: 1100 }, { x: 0, duration: 0.3, ease: "power4.out" }, 0);
      [0, 1, 2].forEach((i) => { c.inFrom("#s6-fk" + i, 0.15 + i * 0.08, { x: 60, opacity: 0 }, 0.2, "power2.out"); c.inFrom("#s6-fc" + i, 0.2 + i * 0.08, { x: -60, opacity: 0 }, 0.2, "power2.out"); });
      tl.fromTo("#s6-lock1", { y: -60, scale: 2, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.18, ease: "power4.in" }, 0.32);
      c.hit("lock", 0.5);
      c.shake("#s6-a-cam", 0.5, 12, 0.25);
      c.bob("s6-k", 0, 2, 0.5, 0.04);
      c.swap("s6-k-base", "s6-k-peace", 1.0);
      // 胶带横穿：歌词还在左上，胶带走中段
      tl.fromTo("#s6-tape", { x: 1600, rotation: -17 }, { x: 0, rotation: -17, duration: 0.3, ease: "power4.out" }, 0.5);
      c.hit("whoosh", 0.5);
      tl.fromTo("#s6-tape", { scale: 1 }, { scale: 1.06, duration: 0.1, yoyo: true, repeat: 1, immediateRender: false }, 0.8);
      // 亮面换到扣扣
      c.flashAt("#s6-fl", 1.95, 0.6);
      tl.set("#s6-dk", { opacity: 1 }, 1.95); tl.set("#s6-dc", { opacity: 0 }, 1.95);
      c.hit("whoosh", 1.95);
      tl.fromTo("#s6-hc", { scale: 1 }, { scale: 1.04, duration: 0.25, ease: "back.out(2)", immediateRender: false }, 1.95);
      tl.fromTo("#s6-lock2", { y: -60, scale: 2, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.18, ease: "power4.in" }, 2.32);
      c.hit("lock", 2.5);
      c.shake("#s6-a-cam", 2.5, 12, 0.25);
      c.bob("s6-c", 1.95, 4, 0.5, 0.04);
      c.swap("s6-c-base", "s6-c-peace", 3.0);
      c.kick("#s6-a-cam", 0, 4, 1, 0.02);
    });

  // ============ s7 合并 28–32：两张卡对撞两次（"合并，合并"居中大字） → 盖章 ============
  add("s7-merge", 28, `
    ${shot("s7-a", "var(--navy)", `
      ${rays("s7-rays", "rgba(255,255,255,.06)", "transparent", 14)}
      <div id="s7-m1" class="mk mono" style="left:120px;top:700px">&lt;&lt;&lt;&lt;&lt;&lt;&lt; 小克</div>
      <div id="s7-m2" class="mk mono" style="left:440px;top:1180px">=======</div>
      <div id="s7-m3" class="mk mono" style="left:560px;top:1300px">&gt;&gt;&gt;&gt;&gt;&gt;&gt; 扣扣</div>
      <div id="s7-ca" class="vcard mono" style="left:-40px;background:var(--a)"><small>小克的版本</small><span data-read='stage: "先想清楚"' data-pass>stage: "先想清楚"</span></div>
      <div id="s7-cb" class="vcard mono" style="left:560px;background:var(--b)"><small>扣扣的版本</small><span data-read='stage: "直接开跑"' data-pass>stage: "直接开跑"</span></div>
      ${rays("s7-boom", "rgba(242,193,78,.9)", "transparent", 9, "border-radius:50%;")}
      ${Array.from({ length: 10 }, (_, i) => `<div id="s7-s${i}" class="spark"></div>`).join("")}
      ${char("s7-c", "kodex", ["point"], { cx: 820, bottom: -560, h: 1150 })}
      ${char("s7-k0", "klaude", ["think"], { cx: 250, bottom: -560, h: 1150 })}
      ${flash("s7-fl")}
    `)}
    ${shot("s7-b", "var(--paper)", `
      <div id="s7-res" class="card" style="left:80px;top:620px;width:920px;height:260px"><div class="bar"><b>git merge</b><span class="chip" style="margin-left:auto;background:var(--green);color:#fff">已解决</span></div><div class="resln mono" data-read='stage: "想清楚，再开跑" ✓' data-pass>stage: "想清楚，再开跑" ✓</div></div>
      ${char("s7-k", "klaude", ["write", "peace"], { cx: 300, bottom: -330, h: 1200 })}
      ${cu("s7-cc", "kodex", "grin", { cx: 830, h: 1000, bottom: -60 })}
      <div id="s7-stamp" class="stamp" data-read="已合并" data-pass>已合并</div>
      ${Array.from({ length: 8 }, (_, i) => `<div id="s7-ink${i}" class="ink" style="left:${700 + Math.round(Math.cos(i * 0.8) * 260)}px;top:${650 + Math.round(Math.sin(i * 0.8) * 160)}px;width:${10 + (i % 3) * 10}px;height:${10 + (i % 3) * 10}px"></div>`).join("")}
    `)}`,
    (c) => {
      const { tl } = c;
      c.hit("cut", 0);
      c.cut(["s7-a", "s7-b"], [0, 1.95]);
      c.spin("#s7-rays", 0, 2, 20);
      // 第一次"合并"：撞一下弹开
      tl.fromTo("#s7-ca", { x: -700, rotation: -10 }, { x: 0, rotation: 0, duration: 0.18, ease: "power4.in" }, -0.18 + 0.18);
      tl.fromTo("#s7-cb", { x: 700, rotation: 10 }, { x: 0, rotation: 0, duration: 0.18, ease: "power4.in" }, 0);
      tl.to("#s7-ca", { x: -90, rotation: -6, duration: 0.25, ease: "power2.out" }, 0.18);
      tl.to("#s7-cb", { x: 90, rotation: 6, duration: 0.25, ease: "power2.out" }, 0.18);
      c.flashAt("#s7-fl", 0.18, 0.5); c.hit("clash", 0.18);
      c.shake("#s7-a-cam", 0.18, 16, 0.25);
      // 第二次"合并"：合成一张
      tl.to("#s7-ca", { x: 280, rotation: 0, scale: 0.9, opacity: 0, duration: 0.16, ease: "power4.in" }, 0.5);
      tl.to("#s7-cb", { x: -280, rotation: 0, scale: 0.9, opacity: 0, duration: 0.16, ease: "power4.in" }, 0.5);
      tl.fromTo("#s7-boom", { opacity: 0, scale: 0.2, rotation: 0 }, { opacity: 1, scale: 1.2, rotation: 40, duration: 0.3, ease: "power2.out" }, 0.66);
      tl.to("#s7-boom", { opacity: 0, duration: 0.3 }, 1.1);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; tl.fromTo("#s7-s" + i, { x: 0, y: 0, opacity: 1, rotation: (a * 180) / Math.PI + 90 }, { x: Math.cos(a) * 380, y: Math.sin(a) * 380, opacity: 0, duration: 0.5, ease: "power2.out" }, 0.66); }
      c.flashAt("#s7-fl", 0.66, 0.9); c.hit("clash", 0.66);
      c.shake("#s7-a-cam", 0.68, 26, 0.35);
      ["#s7-m1", "#s7-m2", "#s7-m3"].forEach((m, i) => { tl.fromTo(m, { opacity: 0, x: 0 }, { opacity: 1, duration: 0.1 }, 0.1 + i * 0.05); tl.to(m, { x: [-700, 0, 700][i] || 700, y: -300, rotation: 30, opacity: 0, duration: 0.4, ease: "power2.in" }, 0.7); });
      c.inFrom("#s7-c", 0, { y: 300, opacity: 1 }, 0.3, "power3.out"); c.inFrom("#s7-k0", 0.05, { y: 300, opacity: 1 }, 0.3, "power3.out");
      c.hop("s7-c", 0.0, 40); c.hop("s7-c", 0.5, 40); c.hop("s7-k0", 0.5, 30);
      // 盖章
      c.inFrom("#s7-res", 1.95, { y: 60, opacity: 0, scale: 0.9 }, 0.3, "back.out(1.8)");
      c.inFrom("#s7-k", 1.95, { x: -300, opacity: 0 }, 0.3, "power3.out");
      c.inFrom("#s7-cc", 2.0, { x: 400, opacity: 0 }, 0.3, "power3.out");
      for (let t = 2.1; t < 2.5; t += 0.1) tl.fromTo("#s7-k-body", { rotation: 0 }, { rotation: 1.6, duration: 0.05, yoyo: true, repeat: 1, immediateRender: false }, t);
      tl.fromTo("#s7-stamp", { opacity: 0, scale: 2.8, rotation: 6 }, { opacity: 1, scale: 1, rotation: -10, duration: 0.18, ease: "power4.in" }, 2.32);
      c.hit("stamp", 2.5);
      for (let i = 0; i < 8; i++) tl.fromTo("#s7-ink" + i, { opacity: 0, scale: 0 }, { opacity: 0.9, scale: 1, duration: 0.12, ease: "back.out(3)" }, 2.5 + i * 0.01);
      c.shake("#s7-b-cam", 2.5, 18, 0.3);
      c.swap("s7-k-write", "s7-k-peace", 2.6);
      c.bob("s7-k", 2.75, 4, 0.5, 0.035);
      c.kick("#s7-b-cam", 3.0, 4, 0.5, 0.025);
    });

  // ============ s8 交付 32–36：渲染 + 胶片条 → 指向镜头（"交给你"居中大字） ============
  const FILM = [["klaude", "think"], ["kodex", "type"], ["klaude", "write"], ["kodex", "panic"], ["klaude", "cheer"], ["kodex", "cheer"], ["klaude", "peace"], ["kodex", "point"]];
  add("s8-render", 32, `
    ${shot("s8-a", "#151A33", `
      <div id="s8-s1" class="strip" style="top:560px">${[...FILM, ...FILM].map(([w, p]) => `<div><img alt="" src="${img(w, p)}"></div>`).join("")}</div>
      <div id="s8-s2" class="strip" style="top:1260px">${[...FILM.slice().reverse(), ...FILM].map(([w, p]) => `<div><img alt="" src="${img(w, p)}"></div>`).join("")}</div>
      <div id="s8-card" class="card" style="left:90px;top:820px;width:900px;height:380px;z-index:4">
        <div class="bar"><b class="mono">npx render</b></div>
        <div class="rh">正在渲染…</div>
        <div class="rfile mono" data-read="mv-${STORY_VER}.mp4 · 1080×1920 · 30fps" data-pass>mv-${STORY_VER}.mp4 · 1080×1920 · 30fps</div>
        <div class="track"><div id="s8-fill" class="fill"></div></div>
        <div id="s8-fr" class="rfr mono">帧 0 / 1200</div>
        <div id="s8-pct" class="rpct mono">0%</div>
      </div>
    `)}
    ${shot("s8-b", "var(--blue)", `
      ${rays("s8-rays", "rgba(255,255,255,.13)", "transparent", 16)}
      ${char("s8-k", "klaude", ["peace"], { cx: 280, bottom: -330, h: 1200, z: 3 })}
      ${char("s8-c", "kodex", ["point"], { cx: 760, bottom: -380, h: 1250, z: 4 })}
      <div id="s8-done" class="donepill"><span data-read="✓ mv-${STORY_VER}.mp4 已导出" data-pass>✓ mv-${STORY_VER}.mp4 已导出</span></div>
      ${sparkle("s8-sp1", 150, 700, 80, "#fff")}${sparkle("s8-sp2", 950, 640, 64, "#F2C14E")}${sparkle("s8-sp3", 520, 600, 50, "#fff")}
      ${flash("s8-fl")}
    `)}`,
    (c) => {
      const { tl } = c;
      c.hit("cut", 0);
      c.cut(["s8-a", "s8-b"], [0, 1.95]);
      tl.fromTo("#s8-s1", { x: 0 }, { x: -1500, duration: 2, ease: "none" }, 0);
      tl.fromTo("#s8-s2", { x: -1500 }, { x: 0, duration: 2, ease: "none" }, 0);
      c.inFrom("#s8-card", 0, { y: 70, opacity: 0, scale: 0.9 }, 0.3, "back.out(1.6)");
      tl.fromTo("#s8-fill", { scaleX: 0 }, { scaleX: 1, duration: 1.7, ease: "power1.inOut", transformOrigin: "0 50%" }, 0.15);
      c.count("s8-pct", 0, 100, 0.15, 1.7, (v) => Math.round(v) + "%");
      c.count("s8-fr", 0, 1200, 0.15, 1.7, (v) => "帧 " + Math.round(v) + " / 1200");
      c.hit("whir", 0.15, { d: 1.7 });
      c.kick("#s8-a-cam", 0, 1.95, 0.5, 0.015);
      // 指向镜头
      c.flashAt("#s8-fl", 1.95, 1);
      c.spin("#s8-rays", 1.95, 2.05, 35);
      c.inFrom("#s8-k", 1.95, { x: -400, opacity: 1 }, 0.3, "power3.out");
      c.inFrom("#s8-c", 1.95, { x: 400, opacity: 1 }, 0.3, "power3.out");
      tl.fromTo("#s8-c-body", { scale: 1 }, { scale: 1.35, duration: 0.35, ease: "back.out(1.6)", immediateRender: false }, 2.0);
      tl.fromTo("#s8-c-body", { scale: 1.35 }, { scale: 1.42, duration: 1.6, ease: "none", immediateRender: false }, 2.35);
      c.hit("thud", 2.0);
      c.bob("s8-k", 2.0, 4, 0.5, 0.04);
      tl.fromTo("#s8-done", { opacity: 0, scale: 0.4, y: 40 }, { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(2.6)" }, 3.0);
      c.hit("success", 3.0);
      c.twinkle("#s8-sp1", 3.0, 0.8); c.twinkle("#s8-sp2", 3.1, 0.8); c.twinkle("#s8-sp3", 3.2, 0.8);
      c.kick("#s8-b-cam", 2.5, 4, 0.5, 0.03);
    });

  // ============ s9 尾声 36–40：片名落下、盖章、两人从天而降落在拍上 ============
  add("s9-outro", 36, `
    ${shot("s9-a", "var(--paper)", `
      ${rays("s9-rays", "rgba(217,119,87,.07)", "transparent", 16)}
      <div id="s9-t" class="title" data-read="样片 ${STORY_VER}">${[..."样片"].map((ch, i) => `<span id="s9-c${i}">${ch}</span>`).join("")} <span id="s9-c2" style="color:var(--a)">${STORY_VER}</span></div>
      <div id="s9-stamp" class="stamp2" data-read="已交付">已交付</div>
      <div id="s9-cred" class="card cred" style="left:140px;top:600px;width:800px;height:330px;z-index:4">
        <div class="cr" data-read="作词 分镜 动效 Claude"><span>作词 分镜 动效</span><b style="color:var(--a)">Claude</b></div>
        <div class="cr" data-read="角色立绘 Codex · image_gen"><span>角色立绘</span><b style="color:var(--b)">Codex · image_gen</b></div>
        <div class="cr" data-read="主旋律 代码合成"><span>主旋律</span><b>代码合成</b></div>
        <div class="cr" style="margin:0" data-read="NEO-Cine · 拟人 MV"><span>NEO-Cine</span><b>拟人 MV</b></div>
      </div>
      ${char("s9-k", "klaude", ["peace"], { cx: 340, bottom: -330, h: 1200 })}
      ${char("s9-c", "kodex", ["peace"], { cx: 740, bottom: -330, h: 1200 })}
      ${sparkle("s9-sp1", 120, 300, 70)}${sparkle("s9-sp2", 960, 520, 56, "#D97757")}${sparkle("s9-sp3", 180, 980, 50, "#148F65")}${sparkle("s9-sp4", 930, 1000, 60)}
      ${flash("s9-fl")}
    `)}`,
    (c) => {
      const { tl } = c;
      c.hit("cut", 0);
      tl.set("#s9-a", { opacity: 1 }, 0);
      c.flashAt("#s9-fl", 0, 0.8);
      c.spin("#s9-rays", 0, 4, 20);
      [0, 1, 2].forEach((i) => tl.fromTo("#s9-c" + i, { y: -400, opacity: 0, rotation: -15 }, { y: 0, opacity: 1, rotation: 0, duration: 0.35, ease: "power2.in" }, i * 0.1 - 0.0));
      tl.fromTo("#s9-stamp", { opacity: 0, scale: 2.4, rotation: 6 }, { opacity: 1, scale: 1, rotation: -10, duration: 0.18, ease: "power4.in" }, 0.67);
      c.hit("stamp", 0.85);
      c.shake("#s9-a-cam", 0.85, 14, 0.25);
      c.inFrom("#s9-cred", 0.05, { y: 40, opacity: 0 }, 0.25, "power3.out");
      // 从天而降，正好落在拍上（1.0 和 1.5 秒 = 第 37、37.5 秒）
      c.drop("s9-k", 1.0); c.drop("s9-c", 1.5);
      c.bob("s9-k", 2.0, 3.6, 0.5, 0.04); c.bob("s9-c", 2.25, 3.6, 0.5, 0.04);
      c.twinkle("#s9-sp1", 0.5, 0.9); c.twinkle("#s9-sp2", 1.0, 0.9); c.twinkle("#s9-sp3", 1.6, 0.9); c.twinkle("#s9-sp4", 2.1, 0.9); c.twinkle("#s9-sp1", 2.7, 0.9);
    });

  return P;
}
