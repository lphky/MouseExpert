export const SKILL_IDS = ['hover', 'click', 'dblclick', 'drag', 'context', 'scroll', 'desktop'];
export const LEVEL_NAMES = ['入門', '熟練', '專家'];

export const CONFIG = {
  questionsPerLevel: 10,
  desktopQuestions: 5,
  examQuestions: 20,
  examPass: 0.85,
  star2Acc: 0.8,
  star3Acc: 0.9,
  successDelay: 400,
  safeMargin: 16,
  bigScale: 1.5,
  minWidth: 600,
  minHeight: 500,
  minStageHeight: 480,
  skills: {
    hover: {
      levels: [
        { size: 100, dwell: 1000, std: 2.5 },
        { size: 70, dwell: 1500, std: 3.0 },
        { path: true, width: 50, std: 6.0 },
      ],
    },
    click: {
      levels: [
        { size: 90, std: 2.5 },
        { size: 60, relocate: 2000, std: 2.0 },
        { size: 44, speed: 60, distractors: [1, 2], std: 1.5 },
      ],
    },
    dblclick: {
      touchGap: 800,
      maxMove: 8,
      touchMaxMove: 16,
      levels: [
        { size: 100, gap: 800, std: 3.0 },
        { size: 70, gap: 550, std: 2.5 },
        { size: 50, gap: 400, std: 2.0 },
      ],
    },
    drag: {
      levels: [
        { mode: 'single', zone: 150, item: 72, std: 4.0 },
        { mode: 'color', zone: 120, item: 72, std: 4.0 },
        { mode: 'sort', zone: 100, item: 64, std: 8.0 },
      ],
    },
    context: {
      levels: [
        { options: 3, objects: 1, std: 5.0 },
        { options: 4, objects: 1, std: 4.5 },
        { options: 6, objects: 2, std: 4.5 },
      ],
    },
    scroll: {
      levels: [
        { items: 30, row: 52, mode: 'middle', std: 6.0 },
        { items: 30, row: 52, mode: 'random', std: 7.0 },
        { items: 60, row: 40, mode: 'similar', std: 9.0 },
      ],
    },
    desktop: {
      levels: [
        { steps: 2, gap: 800, std: 8.0 },
        { steps: 3, gap: 650, std: 14.0 },
        { steps: 4, gap: 550, std: 20.0 },
      ],
    },
  },
};

export function questionCount(skill) {
  return skill === 'desktop' ? CONFIG.desktopQuestions : CONFIG.questionsPerLevel;
}
