import { test, expect } from '@playwright/test';
import { playLevel, solveQuestion } from './bot.js';

const SKILLS = ['hover', 'click', 'dblclick', 'drag', 'context', 'scroll', 'desktop'];
const KEY = 'mouseexpert.v1';

function watchErrors(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

async function fresh(page, data) {
  await page.goto('/');
  await page.evaluate(([k, d]) => { localStorage.clear(); if (d) localStorage.setItem(k, JSON.stringify(d)); }, [KEY, data]);
  await page.reload();
}

async function toMap(page) {
  await page.click('#start');
  await expect(page.locator('.map-grid')).toBeVisible();
}

async function startLevel(page, skill, level) {
  await page.click(`.lv[data-skill="${skill}"][data-level="${level}"]`);
  await page.click('#go');
  await expect(page.locator('#stage')).toBeVisible();
}

const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);

for (const skill of SKILLS) {
  test(`${skill}：三級由開始玩到結果頁並解鎖下一級`, async ({ page }) => {
    const errors = watchErrors(page);
    await fresh(page);
    await page.fill('#name-input', '測試員');
    await toMap(page);
    for (let level = 0; level < 3; level++) {
      if (level > 0) await expect(page.locator(`.lv[data-skill="${skill}"][data-level="${level}"]`)).toBeEnabled();
      await startLevel(page, skill, level);
      await playLevel(page);
      await expect(page.locator('.result h1')).toHaveText('完成！');
      await expect(page.locator('#r-acc')).toHaveText('100%');
      const data = await stored(page);
      const rec = data.progress[skill][level];
      expect(rec.count).toBe(1);
      expect(rec.stars).toBeGreaterThanOrEqual(2);
      expect(rec.acc).toBe(1);
      await page.click('#map');
      if (level < 2) await expect(page.locator(`.lv[data-skill="${skill}"][data-level="${level + 1}"]`)).toBeEnabled();
    }
    expect(errors).toEqual([]);
  });
}

test('單擊：未按中及右鍵按目標都有提示並記錄錯誤', async ({ page }) => {
  await fresh(page);
  await toMap(page);
  await startLevel(page, 'click', 0);
  const st = await page.locator('#stage').boundingBox();
  await page.mouse.click(st.x + 8, st.y + st.height / 2);
  await expect(page.locator('#feedback')).toContainText('差一點，再瞄準圓形');
  const t = await page.locator('.click-target').boundingBox();
  await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2, { button: 'right' });
  await expect(page.locator('#feedback')).toContainText('這是右鍵');
  await expect(page.locator('#st-acc')).toHaveText('0%');
  await playLevel(page);
  await expect(page.locator('.errors')).toContainText('未按中');
  await expect(page.locator('.errors')).toContainText('按錯鍵');
  await expect(page.locator('#r-acc')).toHaveText('83%');
  await expect(page.locator('.advice')).toBeVisible();
});

test('雙擊：門檻內成功，只按一下逾時計「雙擊太慢」，第一下不計成功或未按中', async ({ page }) => {
  await fresh(page);
  await toMap(page);
  await startLevel(page, 'dblclick', 0);
  const t = await page.locator('.dbl-target').boundingBox();
  await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2);
  await expect(page.locator('#st-acc')).toHaveText('—');
  await page.waitForTimeout(950);
  await expect(page.locator('#feedback')).toContainText('要快快地連按兩下');
  await expect(page.locator('#st-q')).toHaveText('1 / 10');
  await page.mouse.dblclick(t.x + t.width / 2, t.y + t.height / 2);
  await expect(page.locator('#st-q')).toHaveText('2 / 10');
});

test('拖放：放在區域外會回彈並提示', async ({ page }) => {
  await fresh(page);
  await toMap(page);
  await startLevel(page, 'drag', 0);
  const item = page.locator('.drag-item');
  const before = await item.boundingBox();
  const st = await page.locator('#stage').boundingBox();
  const zone = await page.locator('.zone').boundingBox();
  void zone;
  const target = { x: st.x + st.width / 2, y: st.y + 30 };
  await page.mouse.move(before.x + 30, before.y + 30);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#feedback')).toContainText('放開前要先移到綠色區域內');
  await page.waitForTimeout(400);
  const after = await item.boundingBox();
  expect(Math.abs(after.x - before.x)).toBeLessThan(2);
  expect(Math.abs(after.y - before.y)).toBeLessThan(2);
});

test('右鍵選單：阻止瀏覽器選單，選錯有提示，Esc 關閉不計錯誤', async ({ page }) => {
  await fresh(page);
  await toMap(page);
  await startLevel(page, 'context', 0);
  await page.evaluate(() => { window.__prevented = null; window.addEventListener('contextmenu', (e) => { window.__prevented = e.defaultPrevented; }); });
  const answer = await page.locator('#stage').getAttribute('data-answer');
  const t = await page.locator('.file-obj[data-role="target"]').boundingBox();
  await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2, { button: 'right' });
  expect(await page.evaluate(() => window.__prevented)).toBe(true);
  await expect(page.locator('.ctx-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ctx-menu')).toHaveCount(0);
  await expect(page.locator('#st-acc')).toHaveText('—');
  await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2, { button: 'right' });
  await page.mouse.click(t.x + t.width / 2 + 30, t.y + t.height / 2 + 30, { button: 'right' });
  await expect(page.locator('.ctx-menu')).toHaveCount(1);
  const wrong = await page.locator('.ctx-menu [data-option]').evaluateAll((els, a) => els.map((e) => e.dataset.option).find((o) => o !== a), answer);
  await page.click(`.ctx-menu [data-option="${wrong}"]`);
  await expect(page.locator('#feedback')).toContainText(`你選了『${wrong}』，題目要的是『${answer}』`);
  await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2);
  await expect(page.locator('#feedback')).toContainText('這是左鍵');
});

test('滾輪：按錯項目有提示，捲動找到目標成功', async ({ page }) => {
  await fresh(page);
  await toMap(page);
  await startLevel(page, 'scroll', 0);
  await page.locator('.scroll-item[data-index="0"]').click();
  await expect(page.locator('#feedback')).toContainText('要找的是');
  await solveQuestion(page);
  await expect(page.locator('#st-q')).toHaveText('2 / 10');
});

test('專家測驗：合格生成證書，不合格顯示最弱兩項', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const base = await page.evaluate(async () => (await import('./js/storage.js')).defaults());
  for (const id of SKILLS) base.progress[id][1] = { stars: 1, acc: 0.7, avg: 3, count: 1, big: false };
  base.name = '小明';
  await fresh(page, base);
  await toMap(page);
  await expect(page.locator('#exam')).toBeEnabled();
  await page.click('#exam');
  await page.click('#go');
  await playLevel(page, {
    beforeEach: async (p) => {
      const skill = await p.locator('#stage').getAttribute('data-skill');
      if (skill === 'click' || skill === 'dblclick') {
        const st = await p.locator('#stage').boundingBox();
        await p.mouse.click(st.x + 8, st.y + st.height / 2);
      }
    },
  });
  await expect(page.locator('.result h1')).toHaveText('差一點點！');
  await expect(page.locator('[data-practice]')).toHaveCount(2);
  await page.click('#retry');
  await page.click('#go');
  await playLevel(page);
  await expect(page.locator('.result h1')).toHaveText('恭喜合格！');
  await page.fill('#cert-name', '陳小明');
  await page.click('#make-cert');
  await expect(page.locator('.cert-name')).toHaveText('陳小明');
  const data = await stored(page);
  expect(data.certificate.name).toBe('陳小明');
  expect(data.exam.attempts).toBe(2);
  expect(data.exam.passed).toBe(true);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('#print')).toBeHidden();
  await page.screenshot({ path: 'docs/screens/certificate-print.png' });
  await page.emulateMedia({ media: 'screen' });
  expect(errors).toEqual([]);
});

test('進度重新載入仍在；清除進度須確認', async ({ page }) => {
  await fresh(page);
  await page.fill('#name-input', '阿玲');
  await toMap(page);
  await startLevel(page, 'click', 0);
  await playLevel(page);
  await page.reload();
  await expect(page.locator('.hello')).toContainText('阿玲');
  await expect(page.locator('#hdr-stars')).toContainText('★ 3 / 63');
  await page.click('#btn-settings');
  await page.click('#set-clear');
  await page.click('#confirm button[value="no"]');
  await expect(page.locator('#hdr-stars')).toContainText('★ 3');
  await page.click('#set-clear');
  await page.click('#confirm-yes');
  await expect(page.locator('#hdr-stars')).toContainText('★ 0 / 63');
  await expect(page.locator('#name-input')).toBeVisible();
  const data = await stored(page);
  expect(data.progress.click[0].stars).toBe(0);
  expect(data.name).toBe('');
});

test('壞資料提示、暫停、視窗太小、老師模式', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((k) => localStorage.setItem(k, '{oops'), KEY);
  await page.reload();
  await expect(page.locator('#banner')).toContainText('進度資料無法讀取，已重新開始');
  await toMap(page);
  await startLevel(page, 'click', 0);
  await page.click('#pause');
  await expect(page.locator('#overlay')).toContainText('已暫停');
  await page.click('#ov-go');
  await expect(page.locator('#overlay')).toBeHidden();
  await page.setViewportSize({ width: 560, height: 480 });
  await expect(page.locator('#overlay')).toContainText('請放大視窗或改用電腦');
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('#overlay')).toBeHidden();
  await solveQuestion(page);
  await expect(page.locator('#st-q')).toHaveText('2 / 10');
  await page.click('#pause');
  await page.click('#ov-map');
  await page.click('#btn-settings');
  await page.check('#set-teacher');
  await page.click('#set-close');
  await expect(page.locator('#teacher-tag')).toBeVisible();
  await expect(page.locator('.lv[data-skill="desktop"][data-level="2"]')).toBeEnabled();
  await expect(page.locator('#exam')).toBeEnabled();
  await startLevel(page, 'click', 2);
  await playLevel(page);
  await expect(page.locator('.result')).toContainText('老師模式（不記錄）');
  const data = await stored(page);
  expect(data.progress.click[2].count).toBe(0);
});

for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  test(`截圖 ${vp.width}×${vp.height}：沒有重疊或溢出`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(vp);
    await fresh(page);
    const shot = (n) => page.screenshot({ path: `docs/screens/${vp.width}-${n}.png` });
    const noOverflow = async () => {
      const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(over).toBe(false);
    };
    await shot('home'); await noOverflow();
    await toMap(page);
    await shot('map'); await noOverflow();
    await page.click('#btn-settings'); await page.check('#set-teacher'); await page.click('#set-close');
    for (const s of SKILLS) {
      await startLevel(page, s, 2);
      await page.waitForTimeout(300);
      const inside = await page.evaluate(() => {
        const st = document.querySelector('#stage').getBoundingClientRect();
        return [...document.querySelectorAll('#stage > *:not(.path-layer):not(.desk):not(.desk-toast), #stage .icon')].every((el) => {
          const r = el.getBoundingClientRect();
          return r.left >= st.left - 1 && r.right <= st.right + 1 && r.top >= st.top - 1 && r.bottom <= st.bottom + 1;
        });
      });
      expect(inside).toBe(true);
      const bottom = await page.evaluate(() => document.querySelector('#stage').getBoundingClientRect().bottom);
      expect(bottom).toBeLessThanOrEqual(vp.height);
      await shot(`play-${s}`); await noOverflow();
      await page.click('#pause'); await page.click('#ov-map');
    }
    await startLevel(page, 'click', 0);
    await playLevel(page);
    await page.waitForTimeout(1000);
    await shot('result'); await noOverflow();
    expect(errors).toEqual([]);
  });
}

test('減少動態效果：示範改為逐步靜態圖文', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await fresh(page);
  await toMap(page);
  await page.click('.lv[data-skill="drag"][data-level="0"]');
  await expect(page.locator('.d-static li')).toHaveCount(5);
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);
});

test('觸控：首次提示一次，需要滑鼠的技能及測驗不能進入，單擊可用手指完成', async ({ browser }) => {
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 1024, height: 768 } });
  const page = await ctx.newPage();
  await fresh(page);
  const s = await page.locator('#start').boundingBox();
  await page.touchscreen.tap(s.x + s.width / 2, s.y + s.height / 2);
  await expect(page.locator('#touch-notice')).toBeVisible();
  const nb = await page.locator('#touch-notice button').boundingBox();
  await page.touchscreen.tap(nb.x + nb.width / 2, nb.y + nb.height / 2);
  await expect(page.locator('#touch-notice')).toBeHidden();
  await expect(page.locator('.skill-card[data-skill="hover"] .tag')).toHaveText('需要滑鼠');
  for (const id of ['hover', 'context', 'scroll', 'desktop']) await expect(page.locator(`.lv[data-skill="${id}"][data-level="0"]`)).toBeDisabled();
  await expect(page.locator('.lv[data-skill="click"][data-level="0"]')).toBeEnabled();
  await expect(page.locator('#exam')).toBeDisabled();
  const b = await page.locator('.lv[data-skill="click"][data-level="0"]').boundingBox();
  await page.touchscreen.tap(b.x + 20, b.y + 20);
  const g = await page.locator('#go').boundingBox();
  await page.touchscreen.tap(g.x + 20, g.y + 20);
  const t = await page.locator('.click-target').boundingBox();
  await page.touchscreen.tap(t.x + t.width / 2, t.y + t.height / 2);
  await expect(page.locator('#st-q')).toHaveText('2 / 10');
  expect((await stored(page)).touchNotice).toBe(true);
  await ctx.close();
});
