import { test, expect } from '@playwright/test'

declare global {
    interface Window {
        loadFake: () => Promise<void>
    }
}

test('loads fake requests from HAR and renders them in the table', async ({ page }) => {
    await page.goto('/')

    await page.waitForFunction(() => typeof window.loadFake === 'function')
    await page.evaluate(() => window.loadFake())

    const rows = page.locator('.ant-table-tbody tr.ant-table-row')
    await expect(rows.first()).toBeVisible()
    expect(await rows.count()).toBeGreaterThan(0)
})

test('selecting a query opens the query details panel', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => typeof window.loadFake === 'function')
    await page.evaluate(() => window.loadFake())

    const rows = page.locator('.ant-table-tbody tr.ant-table-row')
    await rows.first().click()

    await expect(page.locator('.query-details')).toBeVisible()
})
