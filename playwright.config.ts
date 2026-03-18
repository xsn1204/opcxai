import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,         // 多角色流程依赖顺序，关闭并行
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "tests/playwright-report", open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    viewport: { width: 1280, height: 800 },
    locale: "zh-CN",
    // 截图仅在失败时保存
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
