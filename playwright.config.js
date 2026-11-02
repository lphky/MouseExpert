export default {
  testDir: './tests',
  testMatch: /.*\.spec\.js/,
  timeout: 240000,
  workers: 3,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4180', headless: true, viewport: { width: 1366, height: 768 } },
  webServer: { command: 'python3 -m http.server 4180 --bind 127.0.0.1', url: 'http://127.0.0.1:4180', reuseExistingServer: true },
};
