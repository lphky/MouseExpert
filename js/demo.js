const CURSOR = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M3 2l7 19 2.6-7.6L20 11z" fill="#111827" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';

const SCENES = {
  hover: (lv) => lv < 2
    ? { html: '<div class="d-target d-hover" style="left:66%;top:50%"><i></i></div>', steps: [['at', 12, 80], ['move', 66, 50, 1100, '移到圓形上'], ['add', '.d-hover', 'fill', 1100, '停定不動，等圓圈填滿'], ['wait', 500, '完成！']] }
    : { html: '<svg class="d-path" viewBox="0 0 100 44" preserveAspectRatio="none"><path d="M8,30 C30,4 50,40 70,18 S90,20 92,14"/></svg><span class="d-flag" style="left:8%;top:68%">起</span><span class="d-flag" style="left:92%;top:32%">🏁</span>',
      steps: [['at', 8, 68], ['move', 30, 36, 900, '由起點出發'], ['move', 52, 62, 800, '沿着路線走'], ['move', 72, 40, 800], ['move', 92, 32, 800, '到達終點！']] },
  click: () => ({ html: '<div class="d-target d-click" style="left:62%;top:45%"></div>', steps: [['at', 15, 80], ['move', 62, 45, 1100, '移到藍色圓形上'], ['press', 'left', 1, '按一下左鍵'], ['add', '.d-click', 'pop', 500, '做得好！']] }),
  dblclick: () => ({ html: '<div class="d-target d-dbl" style="left:60%;top:48%">2×</div>', steps: [['at', 15, 80], ['move', 60, 48, 1100, '移到圓形上'], ['press', 'left', 2, '快速連按左鍵兩下'], ['add', '.d-dbl', 'pop', 500, '做得好！']] }),
  drag: () => ({ html: '<div class="d-zone" style="left:76%;top:50%">放這裏</div><div class="d-star" style="left:22%;top:50%">⭐</div>', steps: [['at', 12, 85], ['move', 22, 50, 900, '移到⭐上'], ['down', '按住左鍵不放'], ['drag', '.d-star', 76, 50, 1300, '拖到綠色區域'], ['up', '放開左鍵'], ['wait', 400, '完成！']] }),
  context: () => ({ html: '<div class="d-file" style="left:36%;top:40%">📄<small>報告</small></div><div class="d-menu" style="left:44%;top:52%" hidden><b>開啟</b><b class="d-want">重新命名</b><b>刪除</b></div>', steps: [['at', 12, 85], ['move', 36, 40, 1000, '移到檔案上'], ['press', 'right', 1, '按一下右鍵'], ['show', '.d-menu', '選單出現了'], ['move', 52, 69, 900, '移到「重新命名」'], ['press', 'left', 1, '用左鍵選它'], ['hide', '.d-menu', '完成！']] }),
  scroll: () => ({ html: '<div class="d-list"><div class="d-list-in"><p>🍐 梨</p><p>🍌 香蕉</p><p>🍇 提子</p><p>🍓 士多啤梨</p><p>🥭 芒果</p><p>🍍 菠蘿</p><p class="d-want">🍉 西瓜</p><p>🥝 奇異果</p></div></div>', steps: [['at', 85, 85], ['move', 50, 40, 900, '箭頭放在清單上'], ['wheel', '.d-list-in', 1200, '向下轉動滾輪'], ['move', 50, 52, 500, '找到🍉西瓜'], ['press', 'left', 1, '按它']] }),
  desktop: () => ({ html: '<div class="d-file" style="left:16%;top:30%">📁<small>相片</small></div><div class="d-file" style="left:86%;top:76%">🗑️<small>垃圾桶</small></div><div class="d-win" hidden>📁 相片<span>🖼️ 旅行相</span></div>', steps: [['at', 50, 85], ['move', 16, 30, 1000, '步驟 1：雙擊資料夾'], ['press', 'left', 2], ['show', '.d-win', '資料夾打開了'], ['move', 58, 56, 900, '步驟 2：雙擊檔案'], ['press', 'left', 2, '完成！']] }),
};

export function demoSteps(skill, level) {
  return SCENES[skill](level).steps.map((s) => s[s.length - 1]).filter((t) => typeof t === 'string' && !t.startsWith('.') && !['left', 'right', 'fill', 'pop'].includes(t));
}

export function playDemo(box, skill, level, reduced) {
  const scene = SCENES[skill](level);
  box.innerHTML = `<div class="demo-scene">${scene.html}<div class="d-cursor">${CURSOR}</div><div class="d-ring"></div><p class="d-cap" aria-live="polite"></p></div>`;
  const root = box.firstElementChild;
  const cur = root.querySelector('.d-cursor');
  const ring = root.querySelector('.d-ring');
  const cap = root.querySelector('.d-cap');
  let cancelled = false;
  let pos = { x: 50, y: 50 };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const place = (x, y) => { pos = { x, y }; cur.style.left = `${x}%`; cur.style.top = `${y}%`; };
  const say = (t) => { if (typeof t === 'string') cap.textContent = t; };
  if (reduced) {
    const last = scene.steps.filter((s) => s[0] === 'move' || s[0] === 'drag').pop();
    if (last) place(last[last[0] === 'drag' ? 2 : 1], last[last[0] === 'drag' ? 3 : 2]);
    scene.steps.forEach((s) => { if (s[0] === 'show') root.querySelector(s[1]).hidden = false; });
    const list = demoSteps(skill, level).map((t, i) => `<li>${i + 1}. ${t}</li>`).join('');
    cap.innerHTML = `<ol class="d-static">${list}</ol>`;
    return () => {};
  }
  (async () => {
    for (const s of scene.steps) {
      if (cancelled) return;
      const [op] = s;
      if (op === 'at') place(s[1], s[2]);
      if (op === 'move' || op === 'drag') {
        const [x, y, ms, text] = op === 'move' ? s.slice(1) : s.slice(2);
        say(text);
        const from = { ...pos };
        const el = op === 'drag' ? root.querySelector(s[1]) : null;
        const t0 = performance.now();
        await new Promise((resolve) => {
          const tick = (t) => {
            if (cancelled) return resolve();
            const k = Math.min(1, (t - t0) / ms);
            const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
            const nx = from.x + (x - from.x) * e;
            const ny = from.y + (y - from.y) * e;
            place(nx, ny);
            if (el) { el.style.left = `${nx}%`; el.style.top = `${ny}%`; }
            if (k < 1) requestAnimationFrame(tick); else resolve();
          };
          requestAnimationFrame(tick);
        });
      }
      if (op === 'press') {
        say(s[3]);
        for (let i = 0; i < s[2]; i++) {
          ring.className = `d-ring on ${s[1]}`;
          ring.textContent = s[1] === 'left' ? '左' : '右';
          ring.style.left = cur.style.left;
          ring.style.top = cur.style.top;
          await wait(s[2] > 1 ? 180 : 350);
          ring.className = 'd-ring';
          await wait(s[2] > 1 ? 90 : 150);
        }
      }
      if (op === 'down' || op === 'up') {
        say(s[1]);
        ring.className = op === 'down' ? 'd-ring on left hold' : 'd-ring';
        ring.textContent = '左';
        ring.style.left = cur.style.left;
        ring.style.top = cur.style.top;
        await wait(400);
      }
      if (op === 'add') { say(s[4]); root.querySelector(s[1])?.classList.add(s[2]); await wait(s[3]); }
      if (op === 'show') { say(s[2]); root.querySelector(s[1]).hidden = false; await wait(700); }
      if (op === 'hide') { say(s[2]); root.querySelector(s[1]).hidden = true; await wait(500); }
      if (op === 'wheel') {
        say(s[3]);
        const el = root.querySelector(s[1]);
        el.style.transition = `transform ${s[2]}ms ease-in-out`;
        el.style.transform = 'translateY(-38%)';
        await wait(s[2]);
      }
      if (op === 'wait') { say(s[2]); await wait(s[1]); }
    }
    ring.className = 'd-ring';
  })();
  return () => { cancelled = true; };
}
