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
      <path class="best-run" d=""/>
      <polyline class="trail" points=""/>
      <g class="best-flag" visibility="hidden"><circle r="13"/><text y="5" text-anchor="middle">⭐</text></g>
      <g class="exit-mark" visibility="hidden"><circle r="12"/><text y="5" text-anchor="middle">✗</text></g>
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
  const N = pts.length - 1;
  const nearest = (p, from = 0, to = N) => {
    let min = Infinity;
    let idx = from;
    for (let i = Math.max(0, from); i <= Math.min(N, to); i++) {
      const dd = (p.x - pts[i].x) ** 2 + (p.y - pts[i].y) ** 2;
      if (dd < min) { min = dd; idx = i; }
    }
    return { dist: Math.sqrt(min), idx };
  };
  const onTrack = (p) => nearest(p).dist <= half + 2 || Math.hypot(p.x - p0.x, p.y - p0.y) <= R || Math.hypot(p.x - p6.x, p.y - p6.y) <= R;
  const trail = svg.querySelector('.trail');
  const bestRun = svg.querySelector('.best-run');
  const bestFlag = svg.querySelector('.best-flag');
  const exitMark = svg.querySelector('.exit-mark');
  const fmt = (p) => `${Math.round(p.x)},${Math.round(p.y)}`;
  let trailPts = [];
  let idx = 0;
  let best = 0;
  let tries = 0;
  let milestone = 0;
  const pct = (i) => Math.round((i / N) * 100);
  const drawTrail = () => trail.setAttribute('points', trailPts.map(fmt).join(' '));
  const showBest = () => {
    if (best <= 0) return;
    const q = pts[best];
    bestFlag.setAttribute('transform', `translate(${q.x},${q.y})`);
    bestFlag.setAttribute('visibility', 'visible');
    bestRun.setAttribute('d', `M${pts.slice(0, best + 1).map(fmt).join(' L')}`);
  };
  const cheer = (reached, prevBest) => {
    const p = pct(reached);
    if (tries === 1 && p < 15) return '剛開始很正常！回到起點，慢慢沿着路線走';
    if (reached > prevBest && prevBest > 0) return `比之前更遠了！你走到 ${p}%，回到起點再試`;
    if (p >= 75) return `好接近終點了（${p}%）！回到起點再挑戰一次`;
    if (p >= 50) return `已走了一半以上（${p}%），做得好！回到起點再試`;
    if (tries >= 4) return `這一關真的很難，慢一點也沒關係。⭐ 是你走得最遠的地方（${pct(best)}%）`;
    return `你走了 ${p}%，紅色線是剛才走過的路。回到起點再試`;
  };
  let tracing = false;
  let lastP = null;
  const wait = () => {
    tracing = false;
    svg.classList.remove('tracing');
    ctx.instruct(best > 0
      ? '回到綠色「起」點再試。⭐ 是你最遠到過的地方'
      : '把箭頭移到綠色「起」點，然後沿着路線移到🏁終點');
  };
  const lose = (q, msg) => {
    tries += 1;
    const prevBest = best;
    if (idx > best) best = idx;
    trail.classList.add('failed');
    exitMark.setAttribute('transform', `translate(${q.x},${q.y})`);
    exitMark.setAttribute('visibility', 'visible');
    showBest();
    ctx.fail('離開路線', msg || cheer(idx, prevBest));
    wait();
  };
  wait();
  ctx.on(ctx.stage, 'pointermove', (e) => {
    if (ctx.locked()) return;
    const p = ctx.local(e);
    if (!tracing) {
      if (Math.hypot(p.x - p0.x, p.y - p0.y) <= R) {
        tracing = true;
        lastP = p;
        idx = 0;
        milestone = 0;
        trailPts = [p];
        trail.classList.remove('failed');
        exitMark.setAttribute('visibility', 'hidden');
        drawTrail();
        svg.classList.add('tracing');
        ctx.instruct('沿着路線慢慢移到🏁終點，不要走出路線');
      }
      return;
    }
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - lastP.x, p.y - lastP.y) / 4));
    for (let i = 1; i <= steps; i++) {
      const q = { x: lastP.x + ((p.x - lastP.x) * i) / steps, y: lastP.y + ((p.y - lastP.y) * i) / steps };
      if (!onTrack(q)) {
        trailPts.push(q);
        drawTrail();
        lose(q);
        return;
      }
      const near = nearest(q, idx - 30, idx + 30);
      if (near.dist <= half + 2 && near.idx > idx) idx = near.idx;
    }
    lastP = p;
    const tail = trailPts[trailPts.length - 1];
    if (Math.hypot(p.x - tail.x, p.y - tail.y) >= 3) { trailPts.push(p); drawTrail(); }
    const m = Math.floor(pct(idx) / 25);
    if (m > milestone && m < 4) {
      milestone = m;
      ctx.note(m === 1 ? '很好，繼續保持！' : m === 2 ? '已經一半了，加油！' : '快到終點了，慢慢來！');
    }
    if (Math.hypot(p.x - p6.x, p.y - p6.y) <= R) ctx.ok(svg);
  });
  ctx.on(ctx.stage, 'pointerleave', () => {
    if (tracing && !ctx.locked()) lose(lastP, `箭頭走出了練習區（已走 ${pct(idx)}%），回到起點再試`);
  });
}
