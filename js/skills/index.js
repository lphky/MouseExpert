import hover from './hover.js';
import click from './click.js';
import dblclick from './dblclick.js';
import drag from './drag.js';
import context from './context.js';
import scroll from './scroll.js';
import desktop from './desktop.js';

export const SKILLS = {
  hover: {
    run: hover, name: '移動與停留', icon: '🎯', mouseOnly: true,
    desc: '控制箭頭，停定在目標上',
    demo: ['把箭頭移到圓形上，停定不動，等圓圈填滿。', '圓形較小，要停 1.5 秒，手不要動。', '由綠色起點出發，沿着路線慢慢移到終點，不可走出路線。'],
  },
  click: {
    run: click, name: '單擊', icon: '👆', mouseOnly: false,
    desc: '瞄準目標，按一下左鍵',
    demo: ['把箭頭移到藍色圓形上，按一下左鍵。', '圓形較小，而且每 2 秒換位置，要快一點。', '圓形會慢慢移動，只按藍色，不要按紅色 ✕。'],
  },
  dblclick: {
    run: dblclick, name: '雙擊', icon: '✌️', mouseOnly: false,
    desc: '連續快速按左鍵兩下',
    demo: ['把箭頭移到圓形上，連續快速按左鍵兩下（0.8 秒內）。', '兩下之間要在 0.55 秒內完成，手不要移動。', '兩下之間要在 0.4 秒內完成，目標更小。'],
  },
  drag: {
    run: drag, name: '拖放', icon: '✋', mouseOnly: false,
    desc: '按住左鍵移動，再放開',
    demo: ['按住左鍵不放，把⭐拖到綠色區域，然後放開。', '看清楚物件的顏色，拖到同一顏色的區域。', '把三個檔案分別拖入正確的資料夾。'],
  },
  context: {
    run: context, name: '右鍵選單', icon: '📋', mouseOnly: true,
    desc: '按右鍵打開選單，再選項目',
    demo: ['在檔案上按右鍵，選單出現後用左鍵選指定項目。', '選單多了選項，看清楚才按。', '畫面有兩個檔案，只可以右鍵按指定的那一個。'],
  },
  scroll: {
    run: scroll, name: '滾輪捲動', icon: '🖱️', mouseOnly: true,
    desc: '轉動滾輪，在長清單中找東西',
    demo: ['箭頭放在清單上，向下轉動滾輪，找到指定項目後按它。', '目標位置隨機，可能要向上捲回去。', '清單更長，還有很相似的項目，要看清楚。'],
  },
  desktop: {
    run: desktop, name: '模擬桌面', icon: '🖥️', mouseOnly: true,
    desc: '開資料夾、改名、拖入垃圾桶',
    demo: ['跟着指示做兩個步驟，例如雙擊開啟資料夾，再雙擊打開檔案。', '三個步驟：可能要改檔名、拖入垃圾桶或在視窗中捲動找檔案。', '四個步驟的綜合任務，每一步都要看清楚指示。'],
  },
};
