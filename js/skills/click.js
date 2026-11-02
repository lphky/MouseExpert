import { isLeft } from '../input.js';
import { overlaps } from '../engine.js';

export default function click(ctx) {
  const size = Math.round(ctx.cfg.size * ctx.scale);
  const avoid = [ctx.pointerRect(60)];
  const reds = [];
  if (ctx.cfg.distractors) {
    const [a, b] = ctx.cfg.distractors;
    const n = a + Math.floor(Math.random() * (b - a + 1));
    const ds = Math.round(52 * ctx.scale);
    for (let i = 0; i < n; i++) {
      const r = ctx.place(ds, ds, [...avoid, ...reds], 20);
      reds.push(r);
      const el = ctx.add('div', 'distractor', r, '<span aria-hidden="true">✕</span>');
      el.dataset.role = 'distractor';
    }
  }
  let r = ctx.place(size, size, [...avoid, ...reds], 20);
  const el = ctx.add('div', 'target click-target', r, '<span aria-hidden="true"></span>');
  el.dataset.role = 'target';
  ctx.instruct(reds.length ? '用左鍵按一下藍色圓形，不要按紅色 ✕' : '把箭頭移到藍色圓形上，按一下左鍵');

  if (ctx.cfg.relocate) {
    ctx.every(ctx.cfg.relocate, () => {
      r = ctx.place(size, size, [...reds, ctx.pointerRect(40)], 20);
      ctx.move(el, r);
    });
  }
  if (ctx.cfg.speed) {
    const ang = Math.random() * Math.PI * 2;
    let vx = Math.cos(ang) * ctx.cfg.speed;
    let vy = Math.sin(ang) * ctx.cfg.speed;
    const m = 16;
    ctx.frame((dt) => {
      const { w, h } = ctx.size();
      let nx = r.x + vx * dt;
      let ny = r.y + vy * dt;
      if (nx < m || nx > w - m - size) { vx = -vx; nx = Math.max(m, Math.min(w - m - size, nx)); }
      if (ny < m || ny > h - m - size) { vy = -vy; ny = Math.max(m, Math.min(h - m - size, ny)); }
      const nr = { x: nx, y: ny, w: size, h: size };
      if (reds.some((d) => overlaps(nr, d, 4))) { vx = -vx; vy = -vy; return; }
      r = nr;
      ctx.move(el, { x: r.x, y: r.y });
    });
  }

  ctx.on(ctx.stage, 'pointerdown', (e) => {
    if (!isLeft(e) || ctx.locked()) return;
    const role = e.target.closest('[data-role]')?.dataset.role;
    if (role === 'target') ctx.ok(el);
    else if (role === 'distractor') ctx.fail('按錯物件', '這是紅色，不要按');
    else ctx.fail('未按中', '差一點，再瞄準圓形');
  });
  ctx.on(ctx.stage, 'contextmenu', (e) => {
    if (ctx.pointerType() === 'touch') return;
    if (e.target.closest('[data-role="target"]')) ctx.fail('按錯鍵', '這是右鍵，請用左邊的按鍵');
  });
}
