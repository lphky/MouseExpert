import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starsFor, accuracy, average, adviceFor, mergeRecord, isUnlocked, examUnlocked, emptyProgress, buildExamPlan, examPassed, weakestSkills, compareBest, totalStars } from '../js/scoring.js';
import { sanitize, load, save, defaults, STORAGE_KEY } from '../js/storage.js';
import { CONFIG, SKILL_IDS, questionCount } from '../js/config.js';

test('星級：完成1星、≥80% 2星、≥90%且達標準時間3星', () => {
  assert.equal(starsFor(0.5, 9, 2), 1);
  assert.equal(starsFor(0.79, 1, 2), 1);
  assert.equal(starsFor(0.8, 1, 2), 2);
  assert.equal(starsFor(0.95, 2.01, 2), 2);
  assert.equal(starsFor(0.9, 2, 2), 3);
  assert.equal(starsFor(1, 0.5, 2), 3);
});
test('準確度及平均時間', () => {
  assert.equal(accuracy(9, 1), 0.9);
  assert.equal(accuracy(0, 0), 0);
  assert.equal(average([1, 2, 3]), 2);
  assert.equal(average([]), 0);
});
test('題數與標準時間', () => {
  assert.equal(questionCount('click'), 10);
  assert.equal(questionCount('desktop'), 5);
  for (const id of SKILL_IDS) assert.equal(CONFIG.skills[id].levels.length, 3);
  assert.deepEqual(CONFIG.skills.click.levels.map((l) => l.std), [2.5, 2.0, 1.5]);
  assert.deepEqual(CONFIG.skills.dblclick.levels.map((l) => l.gap), [800, 550, 400]);
});
test('建議依最多的錯誤類型', () => {
  assert.equal(adviceFor({ '雙擊太慢': 3, '未按中': 1 }).type, '雙擊太慢');
  assert.match(adviceFor({ '雙擊太慢': 3 }).text, /食指/);
  assert.equal(adviceFor({}).type, null);
});
test('紀錄合併保存最佳值及次數', () => {
  let r = mergeRecord(null, { stars: 2, acc: 0.85, avg: 3 });
  r = mergeRecord(r, { stars: 1, acc: 0.7, avg: 2.5 });
  assert.deepEqual(r, { stars: 2, acc: 0.85, avg: 2.5, count: 2, big: false });
  assert.equal(compareBest(null, 2), '第一次完成這一級');
  assert.equal(compareBest(3, 2.6), '比上次最佳快 0.4 秒');
  assert.equal(compareBest(2, 2.5), '比上次最佳慢 0.5 秒');
});
test('解鎖規則', () => {
  const p = emptyProgress();
  assert.ok(isUnlocked(p, 'click', 0));
  assert.ok(!isUnlocked(p, 'click', 1));
  assert.ok(isUnlocked(p, 'click', 2, true));
  p.click[0].stars = 1;
  assert.ok(isUnlocked(p, 'click', 1));
  assert.ok(!examUnlocked(p));
  for (const id of SKILL_IDS) p[id][1].stars = 1;
  assert.ok(examUnlocked(p));
  assert.equal(totalStars(p), 8);
});
test('專家測驗：20題、每項至少2題、只用熟練或專家', () => {
  for (let k = 0; k < 50; k++) {
    const plan = buildExamPlan();
    assert.equal(plan.length, 20);
    for (const id of SKILL_IDS) assert.ok(plan.filter((x) => x.skill === id).length >= 2);
    assert.ok(plan.every((x) => x.level === 1 || x.level === 2));
  }
  assert.ok(examPassed(0.85, 20, 20));
  assert.ok(!examPassed(0.84, 20, 20));
  assert.ok(!examPassed(1, 19, 20));
  assert.deepEqual(weakestSkills({ click: { success: 2, fail: 0 }, drag: { success: 2, fail: 2 }, scroll: { success: 2, fail: 1 } }).map((w) => w.skill), ['drag', 'scroll']);
});
function memStore() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; }
test('儲存：讀回、壞資料回復預設、不可用時不崩潰', () => {
  const st = memStore();
  const d = defaults(); d.name = '阿明'; d.progress.click[0] = { stars: 3, acc: 1, avg: 1.2, count: 1, big: false };
  assert.ok(save(d, st));
  assert.deepEqual(load(st).data, d);
  st.setItem(STORAGE_KEY, '{bad json');
  const bad = load(st);
  assert.equal(bad.error, true); assert.deepEqual(bad.data, defaults());
  st.setItem(STORAGE_KEY, JSON.stringify({ version: 2 }));
  assert.equal(load(st).error, true);
  const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('denied'); }, removeItem() {} };
  const r = load(broken); assert.equal(r.available, false); assert.equal(save(d, broken), false);
  const clean = sanitize({ version: 1, name: 5, progress: { click: [{ stars: 9, acc: 2, avg: 'x' }] } });
  assert.equal(clean.name, ''); assert.equal(clean.progress.click[0].stars, 3); assert.equal(clean.progress.click[0].acc, 1); assert.equal(clean.progress.click[0].avg, null);
});
