import { SKILL_IDS } from './config.js';
import { emptyProgress, emptyRecord } from './scoring.js';

export const STORAGE_KEY = 'mouseexpert.v1';

export function defaults() {
  return {
    version: 1,
    name: '',
    settings: { sound: true, big: false, reduced: null, teacher: false },
    progress: emptyProgress(),
    exam: { attempts: 0, bestAcc: 0, passed: false },
    certificate: null,
    touchNotice: false,
  };
}

const num = (v, min, max, fallback) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback);
const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback);

function cleanRecord(r) {
  if (!r || typeof r !== 'object') return emptyRecord();
  return {
    stars: Math.round(num(r.stars, 0, 3, 0)),
    acc: num(r.acc, 0, 1, 0),
    avg: r.avg == null ? null : num(r.avg, 0, 9999, null),
    count: Math.round(num(r.count, 0, 1e6, 0)),
    big: bool(r.big, false),
  };
}

export function sanitize(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== 1) throw new Error('bad data');
  const d = defaults();
  d.name = typeof raw.name === 'string' ? raw.name.slice(0, 20) : '';
  const s = raw.settings || {};
  d.settings = {
    sound: bool(s.sound, true),
    big: bool(s.big, false),
    reduced: typeof s.reduced === 'boolean' ? s.reduced : null,
    teacher: bool(s.teacher, false),
  };
  for (const id of SKILL_IDS) {
    const list = Array.isArray(raw.progress?.[id]) ? raw.progress[id] : [];
    d.progress[id] = [0, 1, 2].map((i) => cleanRecord(list[i]));
  }
  const e = raw.exam || {};
  d.exam = { attempts: Math.round(num(e.attempts, 0, 1e6, 0)), bestAcc: num(e.bestAcc, 0, 1, 0), passed: bool(e.passed, false) };
  const c = raw.certificate;
  if (c && typeof c === 'object' && typeof c.name === 'string' && typeof c.date === 'string') {
    d.certificate = { name: c.name.slice(0, 20), date: c.date.slice(0, 20), acc: num(c.acc, 0, 1, 0), avg: num(c.avg, 0, 9999, 0), stars: Math.round(num(c.stars, 0, 63, 0)) };
  }
  d.touchNotice = bool(raw.touchNotice, false);
  return d;
}

export function load(storage = globalThis.localStorage) {
  try {
    const t = '__mouseexpert_test';
    storage.setItem(t, '1');
    storage.removeItem(t);
  } catch {
    return { data: defaults(), available: false, error: false };
  }
  const text = storage.getItem(STORAGE_KEY);
  if (!text) return { data: defaults(), available: true, error: false };
  try {
    return { data: sanitize(JSON.parse(text)), available: true, error: false };
  } catch {
    return { data: defaults(), available: true, error: true };
  }
}

export function save(data, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
