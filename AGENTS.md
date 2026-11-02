# MouseExpert

- 先讀 README.md、docs/TEST-RESULTS.md。GitHub `lphky/MouseExpert`，main 根目錄 GitHub Pages：https://lphky.github.io/MouseExpert/ 。保留此發布方式。
- 純前端 ES Modules，無 Framework／CDN／外部字體／追蹤；資料只存 LocalStorage `mouseexpert.v1`（改格式要升版本並處理舊資料）。
- 難度參數只改 `js/config.js`；星級、解鎖、測驗規則在 `js/scoring.js`。雙擊必須自行判斷（不用 dblclick 事件）；右鍵必須 preventDefault。
- 測試輔助屬性（#stage 的 data-skill/data-level/data-answer、.desk 的 data-step、拖放 data-key、清單 data-target）供 tests/bot.js 使用，勿刪。
- 改動後執行 `npm test`（node --test + Playwright 真實滑鼠操作），並更新 docs/TEST-RESULTS.md。原專案 lphky/mouse 不要改動。
