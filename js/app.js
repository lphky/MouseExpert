import { CONFIG, LEVEL_NAMES, SKILL_IDS, questionCount } from './config.js';
import { SKILLS } from './skills/index.js';
import { createSession } from './engine.js';
import { initAudio, play } from './audio.js';
import { playDemo } from './demo.js';
import { load, save, defaults } from './storage.js';
import {
  adviceFor, buildExamPlan, compareBest, examPassed, examUnlocked, isUnlocked, mergeRecord,
  starsFor, totalStars, weakestSkills, emptyProgress,
} from './scoring.js';

const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (v) => `${Math.round(v * 100)}%`;
const secs = (v) => `${v.toFixed(1)} 秒`;
const starStr = (n, max = 3) => '★'.repeat(n) + '☆'.repeat(max - n);

const loaded = load();
let data = loaded.data;
const state = { touch: false, session: null, stopDemo: null, pauseReason: null, view: null };
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

function persist() {
  if (loaded.available) save(data);
}
if (loaded.error) persist();

function reduced() {
  return data.settings.reduced == null ? mq.matches : data.settings.reduced;
}

function applySettings() {
  document.documentElement.classList.toggle('reduce-motion', reduced());
  $('#hdr-name').textContent = data.name || '小玩家';
  $('#hdr-stars').textContent = `★ ${totalStars(data.progress)} / 63`;
  $('#teacher-tag').hidden = !data.settings.teacher;
}

function banner() {
  const msgs = [];
  if (!loaded.available) msgs.push('這次的進度不會被保存（瀏覽器不允許儲存資料）。');
  if (loaded.error) msgs.push('進度資料無法讀取，已重新開始。');
  const b = $('#banner');
  b.hidden = !msgs.length;
  b.textContent = msgs.join(' ');
}

function setView(name) {
  state.view = name;
  document.body.dataset.view = name;
  if (state.stopDemo) { state.stopDemo(); state.stopDemo = null; }
}

function stopSession() {
  if (state.session) { state.session.abort(); state.session = null; }
}

// ---------- Home ----------
function renderHome() {
  stopSession();
  setView('home');
  const first = !data.name;
  app.innerHTML = `
    <section class="hero card">
      <div class="hero-icon" aria-hidden="true">🖱️</div>
      <h1>MouseExpert 滑鼠專家訓練營</h1>
      <p class="lead">七項滑鼠技能，由入門練到專家。每一級 10 題，看準確度和速度拿星星，最後挑戰專家測驗拿證書！</p>
      ${first ? `<label class="name-field">你的暱稱（可略過）<input id="name-input" maxlength="20" placeholder="小玩家" autocomplete="off"></label>` : `<p class="hello">歡迎回來，<b>${esc(data.name)}</b>！你已經有 <b>${totalStars(data.progress)}</b> 粒星。</p>`}
      <button class="btn primary big" id="start">開始訓練</button>
      ${data.certificate ? '<button class="btn" id="view-cert">查看我的證書</button>' : ''}
    </section>
    <section class="tips">
      <div class="card tip"><b>1</b>選一項技能，先看示範</div>
      <div class="card tip"><b>2</b>完成 10 題，看準確度和速度</div>
      <div class="card tip"><b>3</b>拿星星，解鎖下一級和專家測驗</div>
    </section>`;
  $('#start').onclick = () => {
    if (first) {
      data.name = ($('#name-input').value || '').trim().slice(0, 20) || '小玩家';
      persist();
      applySettings();
    }
    renderMap();
  };
  $('#view-cert')?.addEventListener('click', () => renderCertificate(data.certificate, false));
  $('#start').focus();
}

// ---------- Map ----------
function renderMap() {
  stopSession();
  setView('map');
  const teacher = data.settings.teacher;
  const cards = SKILL_IDS.map((id) => {
    const sk = SKILLS[id];
    const need = state.touch && sk.mouseOnly;
    const levels = [0, 1, 2].map((lv) => {
      const rec = data.progress[id][lv];
      const open = isUnlocked(data.progress, id, lv, teacher) && !need;
      return `<button class="lv" data-skill="${id}" data-level="${lv}" ${open ? '' : 'disabled'} aria-label="${sk.name} ${LEVEL_NAMES[lv]} ${open ? `${rec.stars} 星` : '未解鎖'}">
        <span class="lv-name">${LEVEL_NAMES[lv]}</span>
        <span class="lv-stars">${open || rec.stars ? starStr(rec.stars) : '🔒'}</span></button>`;
    }).join('');
    return `<article class="card skill-card${need ? ' need-mouse' : ''}" data-skill="${id}">
      <div class="skill-head"><span class="skill-icon" aria-hidden="true">${sk.icon}</span><div><h2>${sk.name}</h2><p>${sk.desc}</p></div></div>
      ${need ? '<span class="tag">需要滑鼠</span>' : ''}
      <div class="lv-row">${levels}</div></article>`;
  }).join('');
  const examOpen = examUnlocked(data.progress, teacher) && !state.touch;
  app.innerHTML = `
    <div class="map-head"><h1>技能地圖</h1><p>七項技能的「入門」已全部開放。拿到 1 粒星便解鎖下一級。</p></div>
    <div class="map-grid">${cards}
      <article class="card skill-card exam-card${examOpen ? '' : ' locked'}">
        <div class="skill-head"><span class="skill-icon" aria-hidden="true">🏆</span><div><h2>專家測驗</h2><p>${examOpen ? '20 題混合挑戰，準確度 85% 或以上即合格，可獲證書。' : state.touch ? '專家測驗需要滑鼠。' : '七項技能的「熟練」級都拿到 1 粒星便解鎖。'}</p></div></div>
        <div class="lv-row"><button class="btn primary" id="exam" ${examOpen ? '' : 'disabled'}>${examOpen ? '開始測驗' : '🔒 未解鎖'}</button>
        ${data.certificate ? '<button class="btn" id="cert">查看證書</button>' : ''}</div>
      </article>
    </div>`;
  app.querySelectorAll('.lv').forEach((b) => { b.onclick = () => renderDemo(b.dataset.skill, Number(b.dataset.level)); });
  $('#exam')?.addEventListener('click', renderExamIntro);
  $('#cert')?.addEventListener('click', () => renderCertificate(data.certificate, false));
}

// ---------- Demo ----------
function renderDemo(skill, level) {
  stopSession();
  setView('demo');
  const sk = SKILLS[skill];
  app.innerHTML = `
    <section class="card demo">
      <p class="crumb">${sk.icon} ${sk.name} · ${LEVEL_NAMES[level]}</p>
      <h1>${sk.demo[level]}</h1>
      <div class="demo-box" id="demo-box"></div>
      <p class="muted">共 ${questionCount(skill)} 題。準確度 80% 拿 2 星；準確度 90% 而且平均 ${CONFIG.skills[skill].levels[level].std} 秒內完成拿 3 星。</p>
      <div class="actions">
        <button class="btn" id="back">返回地圖</button>
        <button class="btn" id="again">看多一次</button>
        <button class="btn primary big" id="go">我明白了，開始</button>
      </div>
    </section>`;
  const run = () => {
    if (state.stopDemo) state.stopDemo();
    state.stopDemo = playDemo($('#demo-box'), skill, level, reduced());
  };
  run();
  $('#again').onclick = run;
  $('#back').onclick = renderMap;
  $('#go').onclick = () => startPlay({ kind: 'level', skill, level });
  $('#go').focus();
}

function renderExamIntro() {
  stopSession();
  setView('demo');
  app.innerHTML = `
    <section class="card demo">
      <p class="crumb">🏆 專家測驗</p>
      <h1>20 題混合七項技能的熟練／專家難度</h1>
      <ul class="rules"><li>每題的指示會顯示在練習區上方，先看清楚再做。</li><li>完成全部 20 題，準確度達 85% 或以上即合格。</li><li>合格後可以列印或儲存「MouseExpert 證書」。</li></ul>
      <div class="actions"><button class="btn" id="back">返回地圖</button><button class="btn primary big" id="go">開始測驗</button></div>
    </section>`;
  $('#back').onclick = renderMap;
  $('#go').onclick = () => startPlay({ kind: 'exam' });
}

// ---------- Play ----------
function startPlay(meta) {
  stopSession();
  setView('play');
  state.lastMeta = meta;
  const plan = meta.kind === 'exam'
    ? buildExamPlan()
    : Array.from({ length: questionCount(meta.skill) }, () => ({ skill: meta.skill, level: meta.level }));
  const title = meta.kind === 'exam' ? '🏆 專家測驗' : `${SKILLS[meta.skill].icon} ${SKILLS[meta.skill].name} · ${LEVEL_NAMES[meta.level]}`;
  app.innerHTML = `
    <section class="play">
      <div class="status-bar card">
        <span class="st-title">${title}</span>
        <span class="st-item">題目 <b id="st-q">1 / ${plan.length}</b></span>
        <span class="st-item">準確度 <b id="st-acc">—</b></span>
        ${data.settings.big ? '<span class="tag">大目標</span>' : ''}
        <button class="btn" id="pause">⏸ 暫停</button>
      </div>
      <div class="instr-bar card"><span id="st-skill" class="st-skill"></span><span id="instruction" aria-live="polite"></span><span id="feedback" class="feedback" aria-live="assertive"></span></div>
      <div class="stage-wrap">
        <div class="stage" id="stage"></div>
        <div class="overlay" id="overlay" hidden></div>
      </div>
    </section>`;
  const stage = $('#stage');
  sizeStage();
  let fbTimer = 0;
  const session = createSession({
    plan,
    stage,
    settings: data.settings,
    isTouch: () => state.touch,
    hooks: {
      instruct: (t) => { $('#instruction').textContent = t; },
      feedback: (kind, text) => {
        const f = $('#feedback');
        f.className = `feedback show ${kind}`;
        f.innerHTML = `<span aria-hidden="true">${kind === 'good' ? '✓' : '!'}</span> ${esc(text)}`;
        clearTimeout(fbTimer);
        fbTimer = setTimeout(() => { f.className = 'feedback'; }, kind === 'good' ? 900 : 2200);
      },
      sound: (n) => play(n, data.settings.sound),
      status: ({ index, total, acc, attempts }) => {
        $('#st-q').textContent = `${Math.min(index + 1, total)} / ${total}`;
        $('#st-acc').textContent = attempts ? pct(acc) : '—';
      },
      question: (item) => {
        $('#st-skill').textContent = meta.kind === 'exam' ? `${SKILLS[item.skill].icon} ${SKILLS[item.skill].name}·${LEVEL_NAMES[item.level]}` : '';
      },
      finish: (result) => {
        state.session = null;
        if (meta.kind === 'exam') renderExamResult(result);
        else renderResult(meta, result);
      },
    },
  });
  state.session = session;
  $('#pause').onclick = () => pauseGame('user');
  session.start();
  checkSize();
}

function sizeStage() {
  const stage = $('#stage');
  if (!stage) return;
  const top = stage.getBoundingClientRect().top + window.scrollY;
  const hgt = Math.max(CONFIG.minStageHeight, window.innerHeight - top - 16);
  stage.style.height = `${hgt}px`;
}

function pauseGame(reason) {
  const s = state.session;
  if (!s) return;
  if (s.paused && state.pauseReason === 'small' && reason !== 'small') state.pauseReason = reason;
  if (!s.paused) { s.pause(); state.pauseReason = reason; }
  const ov = $('#overlay');
  ov.hidden = false;
  if (reason === 'small') {
    ov.innerHTML = '<div class="card ov-box"><h2>請放大視窗或改用電腦</h2><p>視窗太小，練習已暫停。放大後會自動繼續。</p><button class="btn" id="ov-map">返回地圖</button></div>';
  } else {
    ov.innerHTML = `<div class="card ov-box"><h2>已暫停</h2>${reason === 'hidden' ? '<p>你切換了分頁，計時已暫停。</p>' : ''}
      <div class="actions"><button class="btn primary big" id="ov-go">繼續</button><button class="btn" id="ov-restart">重新開始此級</button><button class="btn" id="ov-map">返回地圖</button></div>
      <p class="muted">未完成的一級不會計分。</p></div>`;
    $('#ov-go').onclick = resumeGame;
    $('#ov-go').focus();
    $('#ov-restart').onclick = () => startPlay(state.lastMeta);
  }
  $('#ov-map').onclick = renderMap;
}

function resumeGame() {
  const s = state.session;
  if (!s) return;
  $('#overlay').hidden = true;
  state.pauseReason = null;
  s.resume();
}

function tooSmall() {
  return window.innerWidth < CONFIG.minWidth || window.innerHeight < CONFIG.minHeight;
}

function checkSize() {
  if (!state.session) return;
  if (tooSmall()) pauseGame('small');
  else if (state.pauseReason === 'small') resumeGame();
}

// ---------- Results ----------
function renderResult(meta, r) {
  setView('result');
  const { skill, level } = meta;
  const std = CONFIG.skills[skill].levels[level].std;
  const stars = starsFor(r.acc, r.avg, std);
  const teacher = data.settings.teacher;
  const prev = data.progress[skill][level];
  const compare = compareBest(prev.avg, r.avg);
  if (!teacher) {
    data.progress[skill][level] = mergeRecord(prev, { stars, acc: r.acc, avg: r.avg, big: data.settings.big });
    persist();
    applySettings();
  }
  const nextOpen = level < 2 && isUnlocked(data.progress, skill, level + 1, teacher);
  const adv = adviceFor(r.errors);
  const errs = Object.entries(r.errors).sort((a, b) => b[1] - a[1]);
  app.innerHTML = `
    <section class="card result">
      <p class="crumb">${SKILLS[skill].icon} ${SKILLS[skill].name} · ${LEVEL_NAMES[level]}${data.settings.big ? ' · <span class="tag">大目標</span>' : ''}${teacher ? ' · <span class="tag">老師模式（不記錄）</span>' : ''}</p>
      <h1>完成！</h1>
      <div class="big-stars" aria-label="${stars} 粒星">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}" style="--i:${i}">★</span>`).join('')}</div>
      <div class="stats">
        <div><span>準確度</span><b id="r-acc">${pct(r.acc)}</b><small>${r.success} 次成功 / ${r.success + r.fail} 次嘗試</small></div>
        <div><span>平均時間</span><b id="r-avg">${secs(r.avg)}</b><small>3 星標準：${std} 秒</small></div>
        <div><span>與上次比較</span><b class="cmp">${compare}</b></div>
      </div>
      <div class="errors"><h2>錯誤統計</h2>${errs.length ? `<ul>${errs.map(([t, n]) => `<li>${t}<b>${n}</b></li>`).join('')}</ul>` : '<p>沒有錯誤，太好了！</p>'}</div>
      <p class="advice"><span aria-hidden="true">💡</span> ${adv.text}</p>
      <div class="actions">
        <button class="btn" id="map">返回技能地圖</button>
        <button class="btn" id="again">再練一次</button>
        ${nextOpen ? '<button class="btn primary big" id="next">下一級</button>' : ''}
      </div>
    </section>`;
  if (!reduced()) {
    for (let i = 1; i <= stars; i++) setTimeout(() => play('star', data.settings.sound), 200 * i);
  }
  $('#map').onclick = renderMap;
  $('#again').onclick = () => startPlay(meta);
  $('#next')?.addEventListener('click', () => renderDemo(skill, level + 1));
}

function renderExamResult(r) {
  setView('result');
  const teacher = data.settings.teacher;
  const passed = examPassed(r.acc, r.completed, r.total);
  if (!teacher) {
    data.exam = { attempts: data.exam.attempts + 1, bestAcc: Math.max(data.exam.bestAcc, r.acc), passed: data.exam.passed || passed };
    persist();
  }
  const weak = weakestSkills(r.perSkill);
  app.innerHTML = `
    <section class="card result">
      <p class="crumb">🏆 專家測驗${teacher ? ' · <span class="tag">老師模式（不記錄）</span>' : ''}</p>
      <h1>${passed ? '恭喜合格！' : '差一點點！'}</h1>
      <div class="stats">
        <div><span>準確度</span><b id="r-acc">${pct(r.acc)}</b><small>合格標準 ${pct(CONFIG.examPass)}</small></div>
        <div><span>平均時間</span><b>${secs(r.avg)}</b></div>
        <div><span>完成題數</span><b>${r.completed} / ${r.total}</b></div>
      </div>
      ${passed
        ? `<label class="name-field">證書上的名字<input id="cert-name" maxlength="20" value="${esc(data.name || '小玩家')}"></label>
           <div class="actions"><button class="btn" id="map">返回技能地圖</button><button class="btn primary big" id="make-cert">生成證書</button></div>`
        : `<div class="errors"><h2>最需要加強的技能</h2><ul>${weak.map((w) => `<li>${SKILLS[w.skill].icon} ${SKILLS[w.skill].name}<b>${pct(w.acc)}</b><button class="btn small" data-practice="${w.skill}">去練習</button></li>`).join('')}</ul></div>
           <div class="actions"><button class="btn" id="map">返回技能地圖</button><button class="btn primary" id="retry">再挑戰</button></div>`}
    </section>`;
  $('#map').onclick = renderMap;
  $('#retry')?.addEventListener('click', renderExamIntro);
  app.querySelectorAll('[data-practice]').forEach((b) => { b.onclick = () => renderDemo(b.dataset.practice, 1); });
  $('#make-cert')?.addEventListener('click', () => {
    const name = ($('#cert-name').value || '').trim().slice(0, 20) || '小玩家';
    const d = new Date();
    const cert = { name, date: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`, acc: r.acc, avg: r.avg, stars: totalStars(data.progress) };
    if (!teacher) {
      data.certificate = cert;
      if (!data.name || data.name === '小玩家') data.name = name;
      persist();
      applySettings();
    }
    renderCertificate(cert, teacher);
  });
}

function renderCertificate(cert, demo) {
  stopSession();
  setView('cert');
  app.innerHTML = `
    <section class="cert-wrap">
      <div class="certificate" id="certificate">
        <div class="cert-inner">
          <p class="cert-top">MouseExpert 滑鼠專家訓練營</p>
          <h1>MouseExpert 證書</h1>
          <p>茲證明</p>
          <p class="cert-name">${esc(cert.name)}</p>
          <p>已完成七項滑鼠技能訓練，並通過專家測驗。</p>
          <div class="cert-stats"><span>準確度 <b>${pct(cert.acc)}</b></span><span>平均時間 <b>${secs(cert.avg)}</b></span><span>總星數 <b>${cert.stars} / 63</b></span></div>
          <p class="cert-date">${esc(cert.date)}</p>
          ${demo ? '<p class="muted">（老師模式示範，不會保存）</p>' : ''}
        </div>
      </div>
      <div class="actions no-print"><button class="btn" id="map">返回技能地圖</button><button class="btn primary big" id="print">列印／儲存為 PDF</button></div>
    </section>`;
  $('#map').onclick = renderMap;
  $('#print').onclick = () => window.print();
}

// ---------- Settings ----------
function openSettings() {
  const dlg = $('#settings');
  const s = data.settings;
  $('#set-name').value = data.name || '';
  $('#set-sound').checked = s.sound;
  $('#set-big').checked = s.big;
  $('#set-reduced').checked = reduced();
  $('#set-teacher').checked = s.teacher;
  if (state.session && !state.session.paused) pauseGame('user');
  dlg.showModal();
}

function bindSettings() {
  $('#btn-settings').onclick = openSettings;
  $('#set-close').onclick = () => $('#settings').close();
  $('#settings').addEventListener('close', () => {
    data.name = $('#set-name').value.trim().slice(0, 20) || data.name;
    data.settings.sound = $('#set-sound').checked;
    data.settings.big = $('#set-big').checked;
    const r = $('#set-reduced').checked;
    data.settings.reduced = r === mq.matches ? null : r;
    const wasTeacher = data.settings.teacher;
    data.settings.teacher = $('#set-teacher').checked;
    persist();
    applySettings();
    if (wasTeacher !== data.settings.teacher && state.view === 'map') renderMap();
  });
  $('#set-clear').onclick = () => $('#confirm').showModal();
  $('#confirm').addEventListener('close', () => {
    if ($('#confirm').returnValue !== 'yes') return;
    const keep = data.settings;
    data = defaults();
    data.settings = { ...keep, teacher: false };
    data.progress = emptyProgress();
    persist();
    $('#set-name').value = '';
    $('#set-teacher').checked = false;
    $('#settings').close();
    applySettings();
    renderHome();
  });
  $('#logo').onclick = renderHome;
}

// ---------- Global events ----------
document.addEventListener('pointerdown', (e) => {
  initAudio();
  const touch = e.pointerType === 'touch';
  if (touch !== state.touch) {
    state.touch = touch;
    if (touch && !data.touchNotice) {
      data.touchNotice = true;
      persist();
      setTimeout(() => $('#touch-notice').showModal(), 350);
    }
    if (state.view === 'map') renderMap();
  }
}, true);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.session && !state.session.paused) pauseGame('hidden');
});

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state.view !== 'play') return;
    sizeStage();
    checkSize();
    if (state.session && !state.session.paused) state.session.relayout();
  }, 150);
});

mq.addEventListener?.('change', applySettings);

bindSettings();
applySettings();
banner();
renderHome();

window.MouseExpert = { get data() { return data; }, start: startPlay, renderMap, renderHome, state };
