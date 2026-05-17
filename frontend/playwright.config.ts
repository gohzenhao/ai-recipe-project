import { defineConfig, devices } from '@playwright/test'

const FRONTEND_URL = 'http://localhost:5173'
const BACKEND_URL = 'http://localhost:8000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: [
    {
      command: 'uv run python manage.py runserver 8000 --noreload',
      cwd: '../backend',
      url: `${BACKEND_URL}/admin/login/`,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_BASE_URL: `${BACKEND_URL}/api` },
      timeout: 60_000,
    },
  ],
})
