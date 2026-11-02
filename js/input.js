export function isLeft(e) {
  return e.button === 0 && !e.ctrlKey;
}

export function doubleTracker(ctx, gap, maxMove) {
  let pending = null;
  const clear = () => {
    if (pending) ctx.cancel(pending.timer);
    pending = null;
  };
  return {
    press(target, x, y, h) {
      if (pending && pending.target === target) {
        const moved = Math.hypot(x - pending.x, y - pending.y) > maxMove;
        clear();
        if (moved) h.moved?.();
        else h.double?.();
        return moved ? 'moved' : 'double';
      }
      clear();
      pending = { target, x, y, timer: ctx.after(gap, () => { pending = null; h.slow?.(); }) };
      h.first?.();
      return 'first';
    },
    clear,
    get pending() { return pending ? pending.target : null; },
  };
}

export function makeDraggable(ctx, el, { onDrop, onPick, canStart, lift }) {
  let drag = null;
  const stage = ctx.stage;
  const end = (e) => {
    if (!drag) return;
    if (e && e.pointerId !== undefined && e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    el.classList.remove('dragging');
    try { el.releasePointerCapture(d.id); } catch { /* already released */ }
    const cx = el.offsetLeft + el.offsetWidth / 2;
    const cy = el.offsetTop + el.offsetHeight / 2;
    onDrop({ cx, cy, moved: d.moved, home: { x: d.sx, y: d.sy }, clientX: d.lastX, clientY: d.lastY });
  };
  ctx.on(el, 'pointerdown', (e) => {
    if (!(e.button === 0 && !e.ctrlKey) || drag || ctx.locked()) return;
    if (canStart && !canStart(e)) return;
    e.preventDefault();
    onPick?.(e);
    drag = { id: e.pointerId, sx: el.offsetLeft, sy: el.offsetTop, baseX: el.offsetLeft, baseY: el.offsetTop, x0: e.clientX, y0: e.clientY, moved: false, fixed: false, lastX: e.clientX, lastY: e.clientY };
    try { el.setPointerCapture(e.pointerId); } catch { /* unsupported */ }
    el.classList.add('dragging');
  });
  ctx.on(el, 'pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) <= 4) return;
      drag.moved = true;
      const base = lift?.();
      if (base) { drag.baseX = base.x; drag.baseY = base.y; drag.fixed = true; }
    }
    let x = drag.baseX + dx;
    let y = drag.baseY + dy;
    if (!drag.fixed) {
      x = Math.max(0, Math.min(stage.clientWidth - el.offsetWidth, x));
      y = Math.max(0, Math.min(stage.clientHeight - el.offsetHeight, y));
    }
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });
  ctx.on(el, 'pointerup', end);
  ctx.on(el, 'pointercancel', end);
  ctx.on(el, 'lostpointercapture', end);
  ctx.on(window, 'blur', () => end());
  return { get active() { return !!drag; }, end };
}

export function returnHome(ctx, el, home) {
  el.classList.add('returning');
  el.style.left = `${home.x}px`;
  el.style.top = `${home.y}px`;
  ctx.after(320, () => el.classList.remove('returning'));
}

export const MENU_POOL = [
  { key: '開啟', icon: '📂' },
  { key: '複製', icon: '📋' },
  { key: '貼上', icon: '📌' },
  { key: '重新命名', icon: '✏️' },
  { key: '刪除', icon: '🗑️' },
  { key: '內容', icon: 'ℹ️' },
];

export function createMenu(ctx, { onClose } = {}) {
  let menu = null;
  const close = (silent) => {
    if (!menu) return;
    menu.remove();
    menu = null;
    if (!silent) onClose?.();
  };
  const open = (x, y, options, onChoose) => {
    close(true);
    menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = options
      .map((o) => `<button type="button" role="menuitem" data-option="${o.key}"><span aria-hidden="true">${o.icon}</span>${o.key}</button>`)
      .join('');
    ctx.stage.appendChild(menu);
    const W = ctx.stage.clientWidth;
    const H = ctx.stage.clientHeight;
    const left = Math.max(8, Math.min(W - menu.offsetWidth - 8, x));
    const top = Math.max(8, Math.min(H - menu.offsetHeight - 8, y));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-option]');
      if (!b) return;
      const opt = b.dataset.option;
      close(true);
      onChoose(opt);
    });
    menu.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  ctx.on(document, 'keydown', (e) => {
    if (e.key === 'Escape' && menu) close();
  });
  return { open, close, isOpen: () => !!menu, contains: (el) => !!menu && menu.contains(el) };
}
