import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/release',
  outputDir: './tests/release/.artifacts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    colorScheme: 'dark',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'release-chromium-1280',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'release-firefox-1280',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'release-webkit-390',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    // Release smoke must execute the exact production compilation. The dev
    // server exposes QA hooks and can hide lazy-chunk or production-only faults.
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
