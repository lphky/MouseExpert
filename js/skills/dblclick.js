import { CONFIG } from '../config.js';
import { doubleTracker, isLeft } from '../input.js';

export default function dblclick(ctx) {
  const base = CONFIG.skills.dblclick;
  const gap = ctx.touch ? Math.max(ctx.cfg.gap, base.touchGap) : ctx.cfg.gap;
  const maxMove = ctx.touch ? base.touchMaxMove : base.maxMove;
  const size = Math.round(ctx.cfg.size * ctx.scale);
  const r = ctx.place(size, size, [ctx.pointerRect(60)]);
  const el = ctx.add('div', 'target dbl-target', r, '<span aria-hidden="true">2×</span>');
  el.dataset.role = 'target';
  ctx.instruct('把箭頭移到圓形上，連續快速按左鍵兩下');
  const tracker = doubleTracker(ctx, gap, maxMove);
  const label = el.querySelector('span');
  const ripple = (kind) => {
    const pad = Math.round(size * 0.35);
    const rp = ctx.add('div', `ripple ${kind}`, { x: r.x - pad, y: r.y - pad, w: size + pad * 2, h: size + pad * 2 });
    rp.setAttribute('aria-hidden', 'true');
    ctx.after(600, () => rp.remove());
  };
  const reset = () => { el.classList.remove('half'); label.textContent = '2×'; };
  ctx.on(ctx.stage, 'pointerdown', (e) => {
    if (!isLeft(e) || ctx.locked()) return;
    if (e.target.closest('[data-role="target"]')) {
      const p = ctx.local(e);
      tracker.press(el, p.x, p.y, {
        first: () => { el.classList.remove('half'); void el.offsetWidth; el.classList.add('half'); label.textContent = '1'; ripple('r1'); },
        double: () => { el.classList.remove('half'); el.classList.add('second'); label.textContent = '2✓'; ripple('r2'); ctx.ok(el); },
        slow: () => { reset(); ctx.fail('雙擊太慢', '要快快地連按兩下'); },
        moved: () => { reset(); ctx.fail('雙擊時移動', '按的時候手不要移動'); },
      });
    } else {
      tracker.clear();
      reset();
      ctx.fail('未按中', '差一點，再瞄準圓形');
    }
  });
  ctx.on(ctx.stage, 'contextmenu', (e) => {
    if (ctx.pointerType() === 'touch') return;
    if (e.target.closest('[data-role="target"]')) ctx.fail('按錯鍵', '這是右鍵，請用左邊的按鍵');
  });
  return () => tracker.clear();
}
