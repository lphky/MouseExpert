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
  ctx.on(ctx.stage, 'pointerdown', (e) => {
    if (!isLeft(e) || ctx.locked()) return;
    if (e.target.closest('[data-role="target"]')) {
      const p = ctx.local(e);
      tracker.press(el, p.x, p.y, {
        first: () => { el.classList.remove('half'); void el.offsetWidth; el.classList.add('half'); },
        double: () => ctx.ok(el),
        slow: () => { el.classList.remove('half'); ctx.fail('雙擊太慢', '要快快地連按兩下'); },
        moved: () => { el.classList.remove('half'); ctx.fail('雙擊時移動', '按的時候手不要移動'); },
      });
    } else {
      tracker.clear();
      el.classList.remove('half');
      ctx.fail('未按中', '差一點，再瞄準圓形');
    }
  });
  ctx.on(ctx.stage, 'contextmenu', (e) => {
    if (ctx.pointerType() === 'touch') return;
    if (e.target.closest('[data-role="target"]')) ctx.fail('按錯鍵', '這是右鍵，請用左邊的按鍵');
  });
  return () => tracker.clear();
}
