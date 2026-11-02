import { CONFIG, SKILL_IDS } from './config.js';

export function accuracy(success, fails) {
  const total = success + fails;
  return total ? success / total : 0;
}

export function average(times) {
  return times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
}

export function starsFor(acc, avg, std, cfg = CONFIG) {
  if (acc >= cfg.star3Acc && avg <= std) return 3;
  if (acc >= cfg.star2Acc) return 2;
  return 1;
}

export const ADVICE = {
  '未按中': '先把箭頭移到目標中間，停一停才按。',
  '按錯物件': '按之前先看清楚顏色和名稱，只按題目要求的那一個。',
  '按錯鍵': '左邊按鍵是平常的「按」，右邊按鍵是打開選單。',
  '雙擊太慢': '試試用食指快速連按，手腕保持不動。',
  '雙擊時移動': '雙擊時手掌放穩，只動手指，不要移動滑鼠。',
  '中途移出': '到了圓圈後放鬆手腕，讓滑鼠停定不動。',
  '離開路線': '沿着路線慢慢移動，眼睛看着箭頭前面一點。',
  '放錯位置': '放開前先看清楚物件是否在框內。',
  '放錯區域': '拖之前先看清楚物件的顏色或種類，再找對應的區域。',
  '選錯選項': '選單打開後，逐項讀一次才按。',
  '按錯項目': '捲動時慢一點，看清楚圖案和名稱才按。',
  '輸入錯誤': '輸入後先核對一次名稱，才按 Enter。',
  '做錯步驟': '先看指示列寫的是第幾步，一步一步來。',
};

export function topError(errors = {}) {
  const list = Object.entries(errors).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return list.length ? list[0] : null;
}

export function adviceFor(errors) {
  const top = topError(errors);
  if (!top) return { type: null, count: 0, text: '表現穩定！試試下一級，或者挑戰更快的速度。' };
  return { type: top[0], count: top[1], text: ADVICE[top[0]] || '慢慢來，看清楚指示再做。' };
}

export function emptyRecord() {
  return { stars: 0, acc: 0, avg: null, count: 0, big: false };
}

export function emptyProgress() {
  return Object.fromEntries(SKILL_IDS.map((id) => [id, [0, 1, 2].map(emptyRecord)]));
}

export function mergeRecord(rec, run) {
  const prev = rec || emptyRecord();
  const improved = run.stars > prev.stars;
  return {
    stars: Math.max(prev.stars, run.stars),
    acc: Math.max(prev.acc, run.acc),
    avg: prev.avg == null ? run.avg : Math.min(prev.avg, run.avg),
    count: prev.count + 1,
    big: improved ? !!run.big : prev.big,
  };
}

export function compareBest(prevAvg, avg) {
  if (prevAvg == null) return '第一次完成這一級';
  const diff = prevAvg - avg;
  if (Math.abs(diff) < 0.05) return '與上次最佳差不多';
  return diff > 0 ? `比上次最佳快 ${diff.toFixed(1)} 秒` : `比上次最佳慢 ${(-diff).toFixed(1)} 秒`;
}

export function isUnlocked(progress, skill, level, teacher = false) {
  if (teacher || level === 0) return true;
  return (progress?.[skill]?.[level - 1]?.stars || 0) >= 1;
}

export function suggestNext(progress, { teacher = false, touch = false, skills = SKILL_IDS, mouseOnly = {} } = {}) {
  const usable = skills.filter((id) => !(touch && mouseOnly[id]));
  for (const level of [0, 1, 2]) {
    for (const skill of usable) {
      if (isUnlocked(progress, skill, level, teacher) && !(progress?.[skill]?.[level]?.stars >= 1)) return { skill, level, stars: 0 };
    }
  }
  for (const level of [0, 1, 2]) {
    for (const skill of usable) {
      const stars = progress?.[skill]?.[level]?.stars || 0;
      if (stars < 3) return { skill, level, stars };
    }
  }
  return null;
}

export function examUnlocked(progress, teacher = false) {
  return teacher || SKILL_IDS.every((id) => (progress?.[id]?.[1]?.stars || 0) >= 1);
}

export function totalStars(progress) {
  return SKILL_IDS.reduce((sum, id) => sum + (progress?.[id] || []).reduce((s, r) => s + (r?.stars || 0), 0), 0);
}

export function shuffle(list, rand = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildExamPlan(rand = Math.random, skills = SKILL_IDS, n = CONFIG.examQuestions) {
  const list = [];
  for (const s of skills) list.push(s, s);
  while (list.length < n) list.push(skills[Math.floor(rand() * skills.length)]);
  return shuffle(list, rand).slice(0, n).map((skill) => ({ skill, level: 1 + Math.floor(rand() * 2) }));
}

export function examPassed(acc, completed, total) {
  return completed === total && acc >= CONFIG.examPass;
}

export function weakestSkills(perSkill, n = 2) {
  return Object.entries(perSkill)
    .map(([skill, s]) => ({ skill, acc: accuracy(s.success, s.fail), fail: s.fail }))
    .sort((a, b) => a.acc - b.acc || b.fail - a.fail)
    .slice(0, n);
}
