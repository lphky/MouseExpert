const center = async (loc) => {
  const b = await loc.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

async function dragTo(page, from, to) {
  await page.mouse.move(from.x, from.y, { steps: 3 });
  await page.mouse.down();
  await page.mouse.move(from.x + 8, from.y + 8, { steps: 2 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

async function scrollIntoView(page, item, box) {
  const bc = await center(box);
  await page.mouse.move(bc.x, bc.y);
  for (let i = 0; i < 60; i++) {
    const ib = await item.boundingBox();
    const bb = await box.boundingBox();
    if (ib.y >= bb.y + 2 && ib.y + ib.height <= bb.y + bb.height - 2) return;
    await page.mouse.wheel(0, ib.y < bb.y ? -120 : 120);
    await page.waitForTimeout(40);
  }
  throw new Error('could not scroll item into view');
}

export async function solveQuestion(page) {
  const stage = page.locator('#stage');
  const skill = await stage.getAttribute('data-skill');
  const level = Number(await stage.getAttribute('data-level'));
  if (skill === 'hover' && level < 2) {
    const c = await center(stage.locator('.hover-target'));
    await page.mouse.move(c.x, c.y, { steps: 5 });
    await page.waitForTimeout(level === 0 ? 1150 : 1650);
  } else if (skill === 'hover') {
    const pts = await page.evaluate(() => {
      const st = document.querySelector('#stage').getBoundingClientRect();
      const p = document.querySelector('#stage .track');
      const len = p.getTotalLength();
      const out = [];
      for (let i = 0; i <= 80; i++) { const q = p.getPointAtLength((len * i) / 80); out.push({ x: q.x + st.left, y: q.y + st.top }); }
      return out;
    });
    await page.mouse.move(pts[0].x, pts[0].y, { steps: 4 });
    for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y, { steps: 2 });
  } else if (skill === 'click') {
    const c = await center(stage.locator('.click-target'));
    await page.mouse.click(c.x, c.y);
  } else if (skill === 'dblclick') {
    const c = await center(stage.locator('.dbl-target'));
    await page.mouse.dblclick(c.x, c.y);
  } else if (skill === 'drag') {
    const items = stage.locator('.drag-item:not(.placed)');
    while ((await items.count()) > 0) {
      const it = items.first();
      const key = await it.getAttribute('data-key');
      await dragTo(page, await center(it), await center(stage.locator(`.zone[data-key="${key}"]`)));
      await page.waitForTimeout(30);
    }
  } else if (skill === 'context') {
    const answer = await stage.getAttribute('data-answer');
    const c = await center(stage.locator('.file-obj[data-role="target"]'));
    await page.mouse.click(c.x, c.y, { button: 'right' });
    await stage.locator(`.ctx-menu [data-option="${answer}"]`).click();
  } else if (skill === 'scroll') {
    const box = stage.locator('.scroll-box');
    const t = await box.getAttribute('data-target');
    const item = box.locator(`.scroll-item[data-index="${t}"]`);
    await scrollIntoView(page, item, box);
    const c = await center(item);
    await page.mouse.click(c.x, c.y);
  } else if (skill === 'desktop') {
    for (let guard = 0; guard < 8; guard++) {
      const raw = await stage.locator('.desk').getAttribute('data-step');
      const step = JSON.parse(raw);
      const icon = stage.locator(`.icon[data-id="${step.id}"]`).first();
      if (step.k === 'open') { const c = await center(icon); await page.mouse.dblclick(c.x, c.y); }
      if (step.k === 'ctx') { const c = await center(icon); await page.mouse.click(c.x, c.y, { button: 'right' }); }
      if (step.k === 'choose') await stage.locator(`.ctx-menu [data-option="${step.opt}"]`).click();
      if (step.k === 'rename') { await page.keyboard.type(step.value); await page.keyboard.press('Enter'); }
      if (step.k === 'drop') await dragTo(page, await center(icon), await center(stage.locator(`.icon[data-id="${step.to}"]`)));
      if (step.k === 'visible') await scrollIntoView(page, icon, stage.locator('.win-body'));
      await page.waitForTimeout(60);
      if (await stage.evaluate((el) => el.classList.contains('locked') || !el.querySelector('.desk'))) break;
      const now = await stage.locator('.desk').getAttribute('data-step').catch(() => null);
      if (now === raw && step.k !== 'visible') throw new Error(`desktop step did not advance: ${raw}`);
    }
  }
}

export async function playLevel(page, { beforeEach } = {}) {
  for (let i = 0; i < 25; i++) {
    if (await page.locator('.result, .cert-wrap').count()) return;
    await page.waitForSelector('#stage:not(.locked) > *', { timeout: 5000 });
    const q = await page.locator('#st-q').textContent();
    if (beforeEach) await beforeEach(page);
    await solveQuestion(page);
    await page.waitForFunction((prev) => {
      if (document.querySelector('.result')) return true;
      return document.querySelector('#st-q')?.textContent !== prev && !document.querySelector('#stage.locked');
    }, q, { timeout: 8000 });
  }
}
