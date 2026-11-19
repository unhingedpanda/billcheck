import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/web',
  timeout: 20000,
  fullyParallel: true,
  workers: 3,
  use: { baseURL: 'http://127.0.0.1:4174', browserName: 'chromium', headless: true },
  webServer: { command: 'npm run web -- --port 4174', url: 'http://127.0.0.1:4174', reuseExistingServer: false },
  reporter: 'list',
});
