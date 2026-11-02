export default function hover(ctx) {
  return ctx.level < 2 ? dwell(ctx) : path(ctx);
}

function dwell(ctx) {
  const size = Math.round(ctx.cfg.size * ctx.scale);
  const r = ctx.place(size, size, [ctx.pointerRect(70)]);
  const el = ctx.add('div', 'target hover-target', r,
    '<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-bg" cx="50" cy="50" r="44"/><circle class="ring" cx="50" cy="50" r="44" pathLength="100"/></svg><span>停</span>');
  el.dataset.role = 'target';
  const ring = el.querySelector('.ring');
  const secs = ctx.cfg.dwell / 1000;
  ctx.instruct(`把箭頭移到圓形上，停留 ${secs} 秒`);
  const cx = r.x + size / 2;
  const cy = r.y + size / 2;
  let pos = null;
  let inside = false;
  let start = 0;
  ctx.on(ctx.stage, 'pointermove', (e) => { pos = ctx.local(e); });
  ctx.on(ctx.stage, 'pointerleave', () => { pos = null; });
  ctx.frame(() => {
    const t = ctx.now();
    const hit = !!pos && Math.hypot(pos.x - cx, pos.y - cy) <= size / 2;
    if (hit && !inside) {
      inside = true;
      start = t;
      el.classList.add('active');
    } else if (!hit && inside) {
      inside = false;
      el.classList.remove('active');
      ring.style.strokeDashoffset = '100';
      if ((t - start) / ctx.cfg.dwell > 0.2) ctx.fail('中途移出', '停在圓圈內，不要走開');
    }
    if (inside) {
      const p = Math.min(1, (t - start) / ctx.cfg.dwell);
      ring.style.strokeDashoffset = String(100 - p * 100);
      if (p >= 1) ctx.ok(el);
    }
  });
}

function path(ctx) {
  const { w, h } = ctx.size();
  const width = Math.round(ctx.cfg.width * ctx.scale);
  const half = width / 2;
  const R = Math.max(half + 6, 30);
  const m = 16 + R;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clampY = (y) => Math.max(m, Math.min(h - m, y));
  const p0 = { x: m, y: rnd(m, h - m) };
  const p6 = { x: w - m, y: rnd(m, h - m) };
  const mid = { x: w / 2, y: rnd(m, h - m) };
  const c1 = { x: p0.x + (mid.x - p0.x) * 0.4, y: clampY(rnd(m, h - m)) };
  const lim = Math.min(mid.y - m, h - m - mid.y);
  const tilt = rnd(-lim, lim);
  const arm = (mid.x - p0.x) * 0.35;
  const c2 = { x: mid.x - arm, y: mid.y - tilt };
  const c3 = { x: mid.x + arm, y: mid.y + tilt };
  const c4 = { x: p6.x - (p6.x - mid.x) * 0.4, y: clampY(rnd(m, h - m)) };
  const d = `M${p0.x},${p0.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${mid.x},${mid.y} C${c3.x},${c3.y} ${c4.x},${c4.y} ${p6.x},${p6.y}`;
  const svg = ctx.add('div', 'path-layer', { x: 0, y: 0, w, h },
    `<svg width="${w}" height="${h}" aria-hidden="true">
      <path class="track" d="${d}" stroke-width="${width}"/>
      <path class="track-line" d="${d}"/>
      <circle class="path-start" cx="${p0.x}" cy="${p0.y}" r="${R}"/>
      <circle class="path-end" cx="${p6.x}" cy="${p6.y}" r="${R}"/>
      <text x="${p0.x}" y="${p0.y + 6}" text-anchor="middle">起</text>
      <text x="${p6.x}" y="${p6.y + 6}" text-anchor="middle">🏁</text>
    </svg>`);
  svg.dataset.role = 'path';
  const pathEl = svg.querySelector('.track');
  const len = pathEl.getTotalLength();
  const pts = [];
  for (let i = 0; i <= 300; i++) {
    const p = pathEl.getPointAtLength((len * i) / 300);
    pts.push({ x: p.x, y: p.y });
  }
  const onTrack = (p) => {
    let min = Infinity;
    for (const q of pts) {
      const dd = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
      if (dd < min) min = dd;
    }
    return Math.sqrt(min) <= half + 2 || Math.hypot(p.x - p0.x, p.y - p0.y) <= R || Math.hypot(p.x - p6.x, p.y - p6.y) <= R;
  };
  let tracing = false;
  let lastP = null;
  const wait = () => {
    tracing = false;
    svg.classList.remove('tracing');
    ctx.instruct('把箭頭移到綠色「起」點，然後沿着路線移到🏁終點');
  };
  wait();
  ctx.on(ctx.stage, 'pointermove', (e) => {
    const p = ctx.local(e);
    if (!tracing) {
      if (Math.hypot(p.x - p0.x, p.y - p0.y) <= R) {
        tracing = true;
        lastP = p;
        svg.classList.add('tracing');
        ctx.instruct('沿着路線慢慢移到🏁終點，不要走出路線');
      }
      return;
    }
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - lastP.x, p.y - lastP.y) / 4));
    for (let i = 1; i <= steps; i++) {
      const q = { x: lastP.x + ((p.x - lastP.x) * i) / steps, y: lastP.y + ((p.y - lastP.y) * i) / steps };
      if (!onTrack(q)) {
        ctx.fail('離開路線', '沿着路線慢慢走，回到起點再試');
        wait();
        return;
      }
    }
    lastP = p;
    if (Math.hypot(p.x - p6.x, p.y - p6.y) <= R) ctx.ok(svg);
  });
  ctx.on(ctx.stage, 'pointerleave', () => {
    if (tracing) {
      ctx.fail('離開路線', '箭頭走出了練習區，回到起點再試');
      wait();
    }
  });
}
