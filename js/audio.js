let ac = null;

export function initAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ac = new AC();
    } else if (ac.state === 'suspended') {
      ac.resume();
    }
  } catch {
    ac = null;
  }
}

const SOUNDS = {
  ok: [[660, 0, 0.08, 'sine'], [880, 0.08, 0.12, 'sine']],
  bad: [[200, 0, 0.18, 'triangle']],
  star: [[988, 0, 0.14, 'sine']],
  done: [[523, 0, 0.1, 'sine'], [659, 0.1, 0.1, 'sine'], [784, 0.2, 0.2, 'sine']],
  step: [[740, 0, 0.06, 'sine']],
};

export function play(name, enabled = true) {
  if (!enabled || !ac || ac.state !== 'running') return;
  const now = ac.currentTime;
  for (const [freq, start, len, type] of SOUNDS[name] || []) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + len);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + start);
    osc.stop(now + start + len + 0.02);
  }
}
