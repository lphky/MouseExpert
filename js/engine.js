import { CONFIG } from './config.js';
import { SKILLS } from './skills/index.js';
import { accuracy, average } from './scoring.js';

export function createSession({ plan, stage, hooks, settings, isTouch }) {
  const s = { index: 0, success: 0, fail: 0, errors: {}, times: [], perSkill: {}, paused: false, done: false, locked: false };
  let pausedTotal = 0;
  let pauseStart = 0;
  let qStart = 0;
  let token = 0;
  let cleanups = [];
  let timers = [];
  let frames = [];
  let seq = 0;
  let raf = 0;
  let last = 0;
  let pointer = null;
  let pointerType = 'mouse';

  const now = () => (s.paused ? pauseStart : performance.now()) - pausedTotal;

  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (s.paused) return;
    const t = now();
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const due = timers.filter((x) => x.due <= t);
    if (due.length) {
      timers = timers.filter((x) => x.due > t);
      for (const x of due) x.fn();
    }
    for (const f of frames.slice()) f(dt, t);
  };

  const onMove = (e) => {
    const r = stage.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e) => { pointerType = e.pointerType || 'mouse'; };
  const noMenu = (e) => e.preventDefault();
  const noDrag = (e) => e.preventDefault();
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerdown', onDown, true);
  stage.addEventListener('contextmenu', noMenu);
  stage.addEventListener('dragstart', noDrag);

  function cleanup() {
    for (const fn of cleanups.splice(0)) {
      try { fn(); } catch { /* ignore */ }
    }
    timers = [];
    frames = [];
  }

  function bump(skill, key) {
    const p = (s.perSkill[skill] ||= { success: 0, fail: 0 });
    p[key] += 1;
  }

  function status() {
    hooks.status({ index: s.index, total: plan.length, acc: accuracy(s.success, s.fail), attempts: s.success + s.fail, item: plan[s.index] });
  }

  function makeCtx(item, my) {
    const cfg = CONFIG.skills[item.skill].levels[item.level];
    const alive = () => my === token && !s.done;
    const ctx = {
      skill: item.skill,
      level: item.level,
      cfg,
      stage,
      scale: settings.big ? CONFIG.bigScale : 1,
      touch: isTouch(),
      now,
      size: () => ({ w: stage.clientWidth, h: stage.clientHeight }),
      local: (e) => {
        const r = stage.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      },
      pointerType: () => pointerType,
      locked: () => s.locked || s.paused || !alive(),
      after(ms, fn) {
        const id = ++seq;
        timers.push({ id, due: now() + ms, fn: () => alive() && fn() });
        return id;
      },
      cancel(id) { timers = timers.filter((x) => x.id !== id); },
      every(ms, fn) {
        const tick = () => { fn(); ctx.after(ms, tick); };
        ctx.after(ms, tick);
      },
      frame(fn) { frames.push((dt, t) => alive() && fn(dt, t)); },
      on(target, type, fn, opts) {
        const wrapped = (e) => { if (alive()) fn(e); };
        target.addEventListener(type, wrapped, opts);
        cleanups.push(() => target.removeEventListener(type, wrapped, opts));
      },
      add(tag, cls, rect, html = '') {
        const el = document.createElement(tag);
        el.className = cls;
        if (rect) ctx.move(el, rect);
        el.innerHTML = html;
        stage.appendChild(el);
        return el;
      },
      move(el, r) {
        el.style.left = `${r.x}px`;
        el.style.top = `${r.y}px`;
        if (r.w != null) el.style.width = `${r.w}px`;
        if (r.h != null) el.style.height = `${r.h}px`;
      },
      pointerRect(pad = 50) {
        return pointer ? { x: pointer.x - pad, y: pointer.y - pad, w: pad * 2, h: pad * 2 } : null;
      },
      place(w, h, avoid = [], pad = 12, area) {
        const m = CONFIG.safeMargin;
        const W = stage.clientWidth;
        const H = stage.clientHeight;
        const a = area || { x: m, y: m, w: W - 2 * m, h: H - 2 * m };
        const list = avoid.filter(Boolean);
        let best = null;
        for (let i = 0; i < 300; i++) {
          const x = a.x + Math.random() * Math.max(0, a.w - w);
          const y = a.y + Math.random() * Math.max(0, a.h - h);
          const r = { x: Math.round(x), y: Math.round(y), w, h };
          best = r;
          if (!list.some((o) => overlaps(r, o, pad))) return r;
        }
        return best;
      },
      instruct: (text) => alive() && hooks.instruct(text),
      note: (text) => alive() && hooks.feedback('good', text, true),
      ok(el) {
        if (!alive() || s.locked || s.paused) return;
        s.locked = true;
        s.success += 1;
        bump(item.skill, 'success');
        s.times.push((now() - qStart) / 1000);
        el?.classList.add('pop');
        stage.classList.add('locked');
        hooks.feedback('good', '做得好！');
        hooks.sound('ok');
        status();
        ctx.after(CONFIG.successDelay, next);
      },
      fail(type, msg) {
        if (!alive() || s.locked || s.paused) return;
        s.fail += 1;
        s.errors[type] = (s.errors[type] || 0) + 1;
        bump(item.skill, 'fail');
        hooks.feedback('bad', msg);
        hooks.sound('bad');
        status();
      },
    };
    return ctx;
  }

  function startQuestion(keepTime = false) {
    cleanup();
    stage.innerHTML = '';
    stage.classList.remove('locked');
    s.locked = false;
    token += 1;
    if (!keepTime) qStart = now();
    const item = plan[s.index];
    stage.dataset.skill = item.skill;
    stage.dataset.level = String(item.level);
    status();
    hooks.question(item, s.index);
    const ctx = makeCtx(item, token);
    const done = SKILLS[item.skill].run(ctx);
    if (typeof done === 'function') cleanups.push(done);
  }

  function next() {
    cleanup();
    s.index += 1;
    if (s.index >= plan.length) return finish();
    startQuestion();
  }

  function finish() {
    s.done = true;
    stop();
    stage.innerHTML = '';
    hooks.finish({
      success: s.success,
      fail: s.fail,
      acc: accuracy(s.success, s.fail),
      avg: average(s.times),
      times: s.times.slice(),
      errors: { ...s.errors },
      perSkill: JSON.parse(JSON.stringify(s.perSkill)),
      completed: s.index,
      total: plan.length,
    });
  }

  function stop() {
    cancelAnimationFrame(raf);
    cleanup();
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerdown', onDown, true);
    stage.removeEventListener('contextmenu', noMenu);
    stage.removeEventListener('dragstart', noDrag);
  }

  return {
    start() {
      last = now();
      raf = requestAnimationFrame(loop);
      startQuestion();
    },
    pause() {
      if (s.paused || s.done) return;
      s.paused = true;
      pauseStart = performance.now();
    },
    resume() {
      if (!s.paused || s.done) return;
      pausedTotal += performance.now() - pauseStart;
      s.paused = false;
      last = now();
    },
    relayout() {
      if (!s.done && !s.locked) startQuestion(true);
    },
    abort() {
      s.done = true;
      stop();
    },
    get paused() { return s.paused; },
    get state() { return s; },
  };
}

export function overlaps(a, b, pad = 0) {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}
