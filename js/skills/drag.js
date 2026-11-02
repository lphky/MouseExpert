import { makeDraggable, returnHome } from '../input.js';
import { shuffle } from '../scoring.js';

const COLORS = [
  { key: 'red', name: '紅色', shape: '●' },
  { key: 'blue', name: '藍色', shape: '■' },
  { key: 'yellow', name: '黃色', shape: '▲' },
];
const SORT = [
  { key: 'photo', item: '🖼️', label: '旅行相', folder: '相片' },
  { key: 'music', item: '🎵', label: '生日歌', folder: '音樂' },
  { key: 'doc', item: '📄', label: '報告', folder: '文件' },
];

const inside = (cx, cy, r) => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;

export default function drag(ctx) {
  const zoneSize = Math.round(ctx.cfg.zone * Math.min(ctx.scale, 1.3));
  const itemSize = Math.round(ctx.cfg.item * ctx.scale);
  const { w } = ctx.size();
  const half = { x: 16, y: 16, w: w / 2 - 24, h: ctx.size().h - 32 };
  const rightHalf = { x: w / 2 + 8, y: 16, w: w / 2 - 24, h: ctx.size().h - 32 };
  const flip = Math.random() < 0.5;
  const itemArea = flip ? rightHalf : half;
  const zoneArea = flip ? half : rightHalf;
  const zones = [];
  const items = [];

  const addZone = (cls, html, data) => {
    const r = ctx.place(zoneSize, zoneSize, zones.map((z) => z.r), 24, zoneArea);
    const el = ctx.add('div', `zone ${cls}`, r, html);
    el.dataset.role = 'zone';
    el.dataset.key = data.key;
    zones.push({ r, el, ...data });
  };
  const addItem = (cls, html, data) => {
    const r = ctx.place(itemSize, itemSize, items.map((i) => i.r), 24, itemArea);
    const el = ctx.add('div', `drag-item ${cls}`, r, html);
    el.dataset.role = 'item';
    el.dataset.key = data.key;
    items.push({ r, el, ...data });
  };

  const mode = ctx.cfg.mode;
  if (mode === 'single') {
    addZone('zone-green', '<span>放這裏</span>', { key: 'green' });
    addItem('item-star', '<span aria-hidden="true">⭐</span>', { key: 'green' });
    ctx.instruct('按住左鍵把⭐拖到綠色區域，然後放開');
  } else if (mode === 'color') {
    for (const c of shuffle(COLORS)) addZone(`zone-${c.key}`, `<span>${c.name}區</span>`, { key: c.key, name: c.name });
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    addItem(`item-${c.key}`, `<span aria-hidden="true">${c.shape}</span>`, { key: c.key, name: c.name });
    ctx.instruct(`把${c.name}的物件拖到${c.name}區域`);
  } else {
    for (const s of shuffle(SORT)) addZone('zone-folder', `<span class="folder-icon" aria-hidden="true">📁</span><span>${s.folder}</span>`, { key: s.key, name: s.folder });
    for (const s of shuffle(SORT)) addItem('item-file', `<span aria-hidden="true">${s.item}</span><small>${s.label}</small>`, { key: s.key, name: s.folder, label: `${s.item} ${s.label}` });
    ctx.instruct('把三個檔案分別拖入正確的資料夾');
  }

  let placed = 0;
  for (const it of items) {
    makeDraggable(ctx, it.el, {
      canStart: () => !it.done,
      onDrop: ({ cx, cy, moved, home }) => {
        if (!moved) { returnHome(ctx, it.el, home); return; }
        const z = zones.find((zz) => inside(cx, cy, zz.r));
        if (!z) {
          returnHome(ctx, it.el, home);
          const where = mode === 'single' ? '綠色區域' : mode === 'color' ? `${it.name}區域` : '資料夾';
          ctx.fail('放錯位置', `放開前要先移到${where}內`);
          return;
        }
        if (z.key !== it.key || z.used) {
          returnHome(ctx, it.el, home);
          ctx.fail('放錯區域', mode === 'color' ? `要放入同一顏色（${it.name}）的區域` : `「${it.label}」要放入「${it.name}」資料夾`);
          return;
        }
        z.used = true;
        it.done = true;
        it.el.classList.add('placed');
        ctx.move(it.el, { x: z.r.x + (z.r.w - itemSize) / 2, y: z.r.y + (z.r.h - itemSize) / 2 });
        z.el.classList.add('filled');
        placed += 1;
        if (placed === items.length) ctx.ok(z.el);
        else ctx.note(`放好了！還有 ${items.length - placed} 個`);
      },
    });
  }
}
