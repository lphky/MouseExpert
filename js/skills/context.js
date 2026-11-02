import { createMenu, isLeft, MENU_POOL } from '../input.js';
import { shuffle } from '../scoring.js';

const FILES = [
  { icon: '📄', name: '報告' },
  { icon: '🖼️', name: '旅行相' },
  { icon: '🎵', name: '生日歌' },
  { icon: '📝', name: '筆記' },
  { icon: '📊', name: '成績表' },
  { icon: '🎬', name: '短片' },
];

export default function context(ctx) {
  const files = shuffle(FILES).slice(0, ctx.cfg.objects);
  const want = files[0];
  const answer = MENU_POOL[Math.floor(Math.random() * MENU_POOL.length)].key;
  const others = shuffle(MENU_POOL.filter((o) => o.key !== answer).map((o) => o.key)).slice(0, ctx.cfg.options - 1);
  const keys = new Set([answer, ...others]);
  const options = MENU_POOL.filter((o) => keys.has(o.key));
  const size = Math.round(96 * Math.min(ctx.scale, 1.3));
  const placed = [ctx.pointerRect(50)];
  const els = files.map((f, i) => {
    const r = ctx.place(size, size + 10, placed, 60);
    placed.push(r);
    const el = ctx.add('div', 'file-obj', r, `<span class="file-icon" aria-hidden="true">${f.icon}</span><span class="file-name">${f.name}</span>`);
    el.dataset.role = i === 0 ? 'target' : 'other';
    el.dataset.name = f.name;
    return el;
  });
  ctx.stage.dataset.answer = answer;
  ctx.instruct(`右鍵按「${want.name}」，然後選『${answer}』`);
  const menu = createMenu(ctx, { onClose: () => els[0].classList.remove('selected') });

  ctx.on(ctx.stage, 'pointerdown', (e) => {
    if (ctx.locked()) return;
    if (menu.isOpen()) {
      if (!menu.contains(e.target)) menu.close();
      return;
    }
    if (!isLeft(e)) return;
    if (e.target.closest('.file-obj')) ctx.fail('按錯鍵', '這是左鍵，請按右邊的按鍵');
  });
  ctx.on(ctx.stage, 'contextmenu', (e) => {
    if (ctx.locked()) return;
    const obj = e.target.closest('.file-obj');
    if (!obj || menu.contains(e.target)) return;
    if (obj.dataset.role !== 'target') {
      menu.close(true);
      ctx.fail('按錯物件', `要右鍵按「${want.name}」，不是「${obj.dataset.name}」`);
      return;
    }
    const p = ctx.local(e);
    els[0].classList.add('selected');
    menu.open(p.x + 2, p.y + 2, options, (opt) => {
      els[0].classList.remove('selected');
      if (opt === answer) ctx.ok(els[0]);
      else ctx.fail('選錯選項', `你選了『${opt}』，題目要的是『${answer}』`);
    });
  });
  return () => menu.close(true);
}
