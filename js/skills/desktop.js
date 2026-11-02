import { createMenu, doubleTracker, isLeft, makeDraggable, MENU_POOL, returnHome } from '../input.js';
import { shuffle } from '../scoring.js';

const FOLDERS = ['相片', '功課', '音樂', '遊戲', '影片'];
const FILES = [
  ['📄', '報告'], ['📝', '筆記'], ['🖼️', '旅行相'], ['🎵', '生日歌'], ['📊', '成績表'], ['🎬', '短片'],
  ['📄', '通告'], ['📝', '日記'], ['🖼️', '畢業相'], ['🎵', '校歌'], ['📊', '開支表'], ['🎬', '動畫'],
];
const NAMES = ['trip', 'note1', 'music', 'photo2026', 'homework', 'class3a'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function buildScene() {
  const folderNames = shuffle(FOLDERS).slice(0, 3);
  const files = shuffle(FILES);
  const items = {};
  let n = 0;
  const add = (kind, name, icon, parent) => {
    const id = `i${n++}`;
    items[id] = { id, kind, name, icon, parent };
    return id;
  };
  const folders = folderNames.map((name) => add('folder', name, '📁', 'desktop'));
  const deskFiles = [0, 1].map((i) => add('file', files[i][1], files[i][0], 'desktop'));
  const trash = add('trash', '垃圾桶', '🗑️', 'desktop');
  folders.slice(0, 2).forEach((f, k) => {
    for (let j = 0; j < 3; j++) {
      const [icon, name] = files[2 + k * 3 + j];
      add('file', name, icon, f);
    }
  });
  const long = folders[2];
  const base = items[long].name;
  for (let j = 1; j <= 20; j++) add('file', `${base}${String(j).padStart(2, '0')}`, '📄', long);
  return { items, folders, deskFiles, trash, long };
}

const childrenOf = (scene, parent) => Object.values(scene.items).filter((i) => i.parent === parent);

function template(level, sc) {
  const A = sc.folders[0];
  const fileInA = pick(childrenOf(sc, A)).id;
  const dFile = pick(sc.deskFiles);
  const longKids = childrenOf(sc, sc.long);
  const deep = longKids[12 + Math.floor(Math.random() * 8)].id;
  const name = pick(NAMES);
  const T = {
    t1: [{ k: 'open', id: A }, { k: 'open', id: fileInA }],
    t2: [{ k: 'drop', id: dFile, to: sc.trash }, { k: 'open', id: sc.trash }],
    t3: [{ k: 'ctx', id: dFile }, { k: 'choose', id: dFile, opt: '開啟' }],
    t4: [{ k: 'ctx', id: dFile }, { k: 'choose', id: dFile, opt: '重新命名' }, { k: 'rename', id: dFile, value: name }],
    t5: [{ k: 'open', id: A }, { k: 'drop', id: fileInA, to: sc.trash }, { k: 'open', id: sc.trash }],
    t6: [{ k: 'open', id: sc.long }, { k: 'visible', id: deep }, { k: 'open', id: deep }],
    t7: [{ k: 'open', id: A }, { k: 'ctx', id: fileInA }, { k: 'choose', id: fileInA, opt: '重新命名' }, { k: 'rename', id: fileInA, value: name }],
    t8: [{ k: 'open', id: sc.long }, { k: 'visible', id: deep }, { k: 'ctx', id: deep }, { k: 'choose', id: deep, opt: '刪除' }],
    t9: [{ k: 'drop', id: dFile, to: A }, { k: 'open', id: A }, { k: 'ctx', id: dFile }, { k: 'choose', id: dFile, opt: '內容' }],
  };
  const pool = [['t1', 't2', 't3'], ['t4', 't5', 't6'], ['t7', 't8', 't9']][level];
  return T[pick(pool)];
}

function describe(step, sc) {
  const it = sc.items[step.id];
  const label = it.kind === 'folder' ? `「${it.name}」資料夾` : it.kind === 'trash' ? '垃圾桶' : `「${it.name}」`;
  switch (step.k) {
    case 'open': return `雙擊${label}${it.kind === 'file' ? '打開檔案' : '開啟'}`;
    case 'drop': {
      const to = sc.items[step.to];
      return `把${label}拖到${to.kind === 'trash' ? '垃圾桶' : `「${to.name}」資料夾`}`;
    }
    case 'ctx': return `右鍵按${label}`;
    case 'choose': return `在選單中選『${step.opt}』`;
    case 'rename': return `輸入 ${step.value}，然後按 Enter`;
    case 'visible': return `在視窗內向下捲動，找出${label}`;
    default: return '';
  }
}

export default function desktop(ctx) {
  const sc = buildScene();
  const steps = template(ctx.level, sc);
  let at = 0;
  let windowOf = null;
  let renaming = null;
  let lastEl = null;
  const gap = ctx.cfg.gap;
  const tracker = doubleTracker(ctx, gap, 8);
  const { w, h } = ctx.size();
  const scale = Math.min(ctx.scale, 1.25);
  const icon = Math.round(84 * scale);

  const root = ctx.add('div', 'desk', { x: 0, y: 0, w, h });
  const toast = ctx.add('div', 'desk-toast', null);
  toast.hidden = true;
  const showToast = (text) => {
    toast.textContent = text;
    toast.hidden = false;
    ctx.after(1200, () => { toast.hidden = true; });
  };

  const iconH = icon + 8;
  const rows = Math.max(1, Math.floor((h - 32) / iconH));
  const iconHTML = (it) => `<span class="ico" aria-hidden="true">${it.icon}</span><span class="lbl">${it.name}</span>`;
  let winRect = null;

  function render() {
    const prev = root.querySelector('.win-body');
    const keep = prev ? { of: prev.dataset.of, top: prev.scrollTop } : null;
    root.innerHTML = '';
    const desk = childrenOf(sc, 'desktop').filter((i) => i.kind !== 'trash');
    const cols = Math.max(1, Math.ceil(5 / rows));
    desk.forEach((it, k) => {
      const el = makeIcon(it);
      el.style.left = `${16 + Math.floor(k / rows) * (icon + 8)}px`;
      el.style.top = `${16 + (k % rows) * iconH}px`;
      root.appendChild(el);
    });
    const tr = makeIcon(sc.items[sc.trash]);
    tr.style.left = `${w - icon - 16}px`;
    tr.style.top = `${h - icon - 16}px`;
    root.appendChild(tr);
    const wx = 16 + cols * (icon + 8) + 16;
    winRect = { x: wx, y: 16, w: Math.max(220, w - wx - icon - 40), h: h - 32 };
    if (windowOf) {
      const win = document.createElement('div');
      win.className = 'win';
      Object.assign(win.style, { left: `${winRect.x}px`, top: `${winRect.y}px`, width: `${winRect.w}px`, height: `${winRect.h}px` });
      const it = sc.items[windowOf];
      const kids = childrenOf(sc, windowOf === sc.trash ? 'trash' : windowOf);
      win.innerHTML = `<div class="win-title"><span aria-hidden="true">${it.icon}</span>${it.name}</div><div class="win-body" data-of="${windowOf}"></div>`;
      const body = win.querySelector('.win-body');
      if (!kids.length) body.innerHTML = '<p class="win-empty">（空的）</p>';
      kids.forEach((k) => body.appendChild(makeIcon(k, true)));
      root.appendChild(win);
      if (keep && keep.of === windowOf) body.scrollTop = keep.top;
      body.addEventListener('scroll', () => { if (!ctx.locked()) checkVisible(); });
    }
  }

  function makeIcon(it, inWin = false) {
    const el = document.createElement('div');
    el.className = `icon icon-${it.kind}${inWin ? ' in-win' : ''}`;
    el.dataset.id = it.id;
    el.dataset.kind = it.kind;
    if (!inWin) { el.style.width = `${icon}px`; el.style.height = `${icon}px`; }
    if (renaming === it.id) {
      el.innerHTML = `<span class="ico" aria-hidden="true">${it.icon}</span><input class="rename" value="${it.name}" aria-label="新名稱" />`;
    } else {
      el.innerHTML = iconHTML(it);
    }
    if (it.kind === 'file' && renaming !== it.id) {
      makeDraggable(ctx, el, {
        lift: () => {
          if (!inWin) return null;
          const r = el.getBoundingClientRect();
          const ph = el.cloneNode(true);
          ph.style.visibility = 'hidden';
          el.after(ph);
          el.classList.add('floating');
          Object.assign(el.style, { position: 'fixed', width: `${r.width}px`, left: `${r.left}px`, top: `${r.top}px` });
          return { x: r.left, y: r.top };
        },
        onDrop: (d) => handleDrop(it, el, d, inWin),
      });
    }
    return el;
  }

  function current() { return steps[at]; }

  function instruct() {
    root.dataset.step = JSON.stringify(steps[at]);
    ctx.instruct(`步驟 ${at + 1}／${steps.length}：${describe(steps[at], sc)}`);
  }

  function visibleIn(id) {
    const el = root.querySelector(`.win-body [data-id="${id}"]`);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const b = el.parentElement.getBoundingClientRect();
    return r.top >= b.top - 4 && r.bottom <= b.bottom + 4;
  }

  function checkVisible() {
    const s = current();
    if (s && s.k === 'visible' && visibleIn(s.id)) {
      advance(root.querySelector(`.win-body [data-id="${s.id}"]`));
    }
  }

  function advance(el) {
    lastEl = el || lastEl;
    at += 1;
    if (at >= steps.length) {
      ctx.ok(lastEl || root);
      return;
    }
    ctx.note('這一步完成');
    instruct();
    checkVisible();
  }

  function wrongKind(s, got) {
    if (s.k === 'open' && got === 'ctx') return ['按錯鍵', '這一步要用左鍵雙擊'];
    if (s.k === 'ctx' && got === 'open') return ['按錯鍵', '這一步要按右鍵打開選單'];
    return ['做錯步驟', `這一步是：${describe(s, sc)}`];
  }

  function event(ev, el) {
    if (ctx.locked()) return false;
    checkVisible();
    const s = current();
    if (!s) return false;
    if (s.k === 'visible' && ev.k === 'open' && ev.id === s.id) {
      at += 1;
    }
    const step = current();
    if (ev.k === step.k && ev.id === step.id && (step.k !== 'drop' || ev.to === step.to) && (step.k !== 'choose' || ev.opt === step.opt)) {
      apply(ev);
      advance(el);
      return true;
    }
    if (ev.k === step.k) {
      if (ev.k === 'choose') { ctx.fail('選錯選項', `你選了『${ev.opt}』，題目要的是『${step.opt}』`); return false; }
      if (ev.k === 'drop') { ctx.fail('放錯位置', `${describe(step, sc)}`); return false; }
      ctx.fail('按錯物件', `${describe(step, sc)}`);
      return false;
    }
    const [type, msg] = wrongKind(step, ev.k);
    ctx.fail(type, msg);
    return false;
  }

  function apply(ev) {
    const it = sc.items[ev.id];
    if (ev.k === 'open' || (ev.k === 'choose' && ev.opt === '開啟')) {
      if (it.kind === 'file') showToast(`已打開「${it.name}」`);
      else { windowOf = it.id; render(); }
    } else if (ev.k === 'drop') {
      it.parent = sc.items[ev.to].kind === 'trash' ? 'trash' : ev.to;
      render();
    } else if (ev.k === 'choose') {
      if (ev.opt === '重新命名') { renaming = it.id; render(); focusRename(); }
      else if (ev.opt === '刪除') { it.parent = 'trash'; render(); }
      else if (ev.opt === '內容') showToast(`「${it.name}」：檔案，大小 24 KB`);
    } else if (ev.k === 'rename') {
      it.name = ev.value;
      renaming = null;
      render();
    }
  }

  function focusRename() {
    const input = root.querySelector('.rename');
    if (!input) return;
    input.focus();
    input.select();
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const value = input.value.trim();
      const s = current();
      if (s && s.k === 'rename' && value.toLowerCase() === s.value.toLowerCase()) event({ k: 'rename', id: s.id, value: s.value }, input.parentElement);
      else ctx.fail('輸入錯誤', `名稱要輸入 ${s ? s.value : ''}`);
    });
  }

  function handleDrop(it, el, d, inWin) {
    const back = () => (inWin ? render() : returnHome(ctx, el, d.home));
    if (!d.moved) return;
    tracker.clear();
    el.style.visibility = 'hidden';
    const under = document.elementFromPoint(d.clientX, d.clientY);
    el.style.visibility = '';
    const target = under?.closest('.icon');
    const to = target && target.dataset.id !== it.id && (target.dataset.kind === 'folder' || target.dataset.kind === 'trash') ? target.dataset.id : null;
    if (!to) {
      back();
      const s = current();
      if (s && s.k === 'drop') ctx.fail('放錯位置', `放開前要先把檔案移到${s.to === sc.trash ? '垃圾桶' : '資料夾'}上`);
      return;
    }
    if (!event({ k: 'drop', id: it.id, to }, target)) back();
  }

  const menu = createMenu(ctx, {
    onClose: () => {
      const s = current();
      if (s && s.k === 'choose') { at -= 1; instruct(); }
    },
  });

  ctx.on(ctx.stage, 'pointerdown', (e) => {
    if (ctx.locked()) return;
    if (menu.isOpen()) {
      if (!menu.contains(e.target)) menu.close();
      return;
    }
    if (renaming) {
      if (!e.target.closest('.rename')) { e.preventDefault(); root.querySelector('.rename')?.focus(); }
      return;
    }
    if (!isLeft(e)) return;
    const el = e.target.closest('.icon');
    root.querySelectorAll('.icon.selected').forEach((x) => x.classList.remove('selected'));
    if (!el) { tracker.clear(); return; }
    el.classList.add('selected');
    const id = el.dataset.id;
    const p = ctx.local(e);
    tracker.press(id, p.x, p.y, {
      double: () => event({ k: 'open', id }, el),
      slow: () => {
        const s = current();
        if (s && s.k === 'open' && s.id === id) ctx.fail('雙擊太慢', '要快快地連按兩下');
      },
      moved: () => {
        const s = current();
        if (s && s.k === 'open' && s.id === id) ctx.fail('雙擊時移動', '按的時候手不要移動');
      },
    });
  });

  ctx.on(ctx.stage, 'contextmenu', (e) => {
    if (ctx.locked() || renaming || menu.contains(e.target)) return;
    const el = e.target.closest('.icon');
    if (!el) return;
    const id = el.dataset.id;
    const s = current();
    if (s && s.k === 'choose' && menu.isOpen() === false && s.id === id) at -= 1;
    const step = current();
    if (step.k === 'choose' && step.id === id) {
      openMenuAt(e, id);
      return;
    }
    if (event({ k: 'ctx', id }, el)) openMenuAt(e, id);
  });

  function openMenuAt(e, id) {
    const p = ctx.local(e);
    menu.open(p.x + 2, p.y + 2, MENU_POOL, (opt) => event({ k: 'choose', id, opt }, root.querySelector(`[data-id="${id}"]`)));
  }

  render();
  instruct();
  return () => { tracker.clear(); menu.close(true); };
}
