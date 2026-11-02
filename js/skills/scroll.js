import { isLeft } from '../input.js';
import { shuffle } from '../scoring.js';

export const PAIRS = [
  [['🍉', '西瓜'], ['🍈', '哈密瓜']],
  [['🍎', '紅蘋果'], ['🍏', '青蘋果']],
  [['🍋', '檸檬'], ['🍊', '橙']],
  [['🍑', '桃'], ['🍒', '車厘子']],
  [['🥔', '薯仔'], ['🍠', '番薯']],
  [['🍩', '冬甩'], ['🥯', '貝果']],
  [['🍦', '雪糕筒'], ['🍧', '刨冰']],
  [['🥐', '牛角包'], ['🍞', '方包']],
];

export const FOODS = [
  ['🍐', '梨'], ['🍌', '香蕉'], ['🍇', '提子'], ['🍓', '士多啤梨'], ['🫐', '藍莓'], ['🥭', '芒果'],
  ['🍍', '菠蘿'], ['🥥', '椰子'], ['🥝', '奇異果'], ['🍅', '番茄'], ['🍆', '茄子'], ['🥑', '牛油果'],
  ['🥦', '西蘭花'], ['🥬', '白菜'], ['🥒', '青瓜'], ['🌶️', '辣椒'], ['🌽', '粟米'], ['🥕', '紅蘿蔔'],
  ['🧄', '蒜頭'], ['🧅', '洋蔥'], ['🥨', '扭結餅'], ['🧀', '芝士'], ['🥚', '雞蛋'], ['🥞', '班戟'],
  ['🧇', '窩夫'], ['🍗', '雞髀'], ['🌭', '熱狗'], ['🍔', '漢堡包'], ['🍟', '薯條'], ['🍕', '薄餅'],
  ['🥪', '三文治'], ['🌮', '墨西哥卷'], ['🥗', '沙律'], ['🍝', '意粉'], ['🍜', '拉麵'], ['🍲', '火鍋'],
  ['🍛', '咖喱飯'], ['🍣', '壽司'], ['🍱', '便當'], ['🥟', '餃子'], ['🍤', '炸蝦'], ['🍙', '飯糰'],
  ['🥮', '月餅'], ['🍡', '丸子'], ['🥧', '批'], ['🧁', '杯子蛋糕'],
];

export default function scroll(ctx) {
  const { w, h } = ctx.size();
  const n = ctx.cfg.items;
  const row = Math.round(ctx.cfg.row * Math.min(ctx.scale, 1.25));
  const listW = Math.min(440, w - 140);
  const listH = Math.min(h - 40, 420);
  let entries;
  let target;
  if (ctx.cfg.mode === 'similar') {
    const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
    const rest = shuffle([...PAIRS.filter((p) => p !== pair).flat(), ...FOODS]).slice(0, n - 2);
    target = pair[Math.floor(Math.random() * 2)];
    entries = shuffle([...pair, ...rest]);
  } else {
    entries = shuffle([...PAIRS.map((p) => p[0]), ...FOODS]).slice(0, n);
    target = null;
  }
  const visibleRows = Math.floor(listH / row);
  let tIndex;
  if (ctx.cfg.mode === 'middle') tIndex = Math.floor(n / 2) - 2 + Math.floor(Math.random() * 5);
  else if (ctx.cfg.mode === 'random') tIndex = Math.floor(Math.random() * n);
  else tIndex = Math.max(visibleRows + 1, entries.indexOf(target));
  if (target && entries.indexOf(target) !== tIndex) {
    const cur = entries.indexOf(target);
    [entries[cur], entries[tIndex]] = [entries[tIndex], entries[cur]];
  }
  target = entries[tIndex];

  const box = ctx.add('div', 'scroll-box', { x: Math.round((w - listW) / 2), y: Math.round((h - listH) / 2), w: listW, h: listH });
  box.dataset.role = 'list';
  box.dataset.target = String(tIndex);
  box.innerHTML = entries
    .map(([icon, name], i) => `<button type="button" class="scroll-item" style="height:${row}px" data-index="${i}" data-name="${name}"><span aria-hidden="true">${icon}</span>${name}</button>`)
    .join('');
  const label = `${target[0]}${target[1]}`;
  if (ctx.cfg.mode === 'middle') {
    ctx.instruct(`向下捲動清單，找出「${label}」並按它`);
    const hint = ctx.add('div', 'scroll-hint', { x: Math.round((w + listW) / 2) + 12, y: Math.round(h / 2) - 40 }, '<span aria-hidden="true">⬇</span>捲動');
    hint.setAttribute('aria-hidden', 'true');
    box.scrollTop = 0;
  } else {
    ctx.instruct(`用滾輪上下捲動，找出「${label}」並按它`);
    const maxTop = n * row - listH;
    const startAtTop = tIndex >= visibleRows + 1 && (tIndex < n - visibleRows - 1 ? Math.random() < 0.5 : true);
    box.scrollTop = startAtTop ? 0 : maxTop;
  }
  ctx.on(box, 'wheel', () => box.classList.add('scrolled'), { passive: true });
  ctx.on(box, 'pointerdown', (e) => {
    if (!isLeft(e) || ctx.locked()) return;
    const item = e.target.closest('.scroll-item');
    if (!item) return;
    if (Number(item.dataset.index) === tIndex) ctx.ok(item);
    else ctx.fail('按錯項目', `這是「${item.dataset.name}」，要找的是「${target[1]}」`);
  });
}
