import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:5190',
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'npm run dev -- --port 5190 --strictPort',
        url: 'http://localhost:5190',
        reuseExistingServer: false,
    },
    projects: [
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ],
})
