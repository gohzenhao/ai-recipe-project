import { test, expect } from '@playwright/test'
import { BACKEND_URL, createUser } from './helpers'

test('logged-in user can log out and is bounced to /login', async ({ page, playwright }) => {
  const apiContext = await playwright.request.newContext()
  const user = await createUser(apiContext)
  await apiContext.dispose()

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/')

  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL('/login')

  // Confirm the session cookie really was cleared on the backend, not just
  // the client-side store. /me should now return 401 for this browser context.
  const meResponse = await page.request.get(`${BACKEND_URL}/api/auth/me`)
  expect(meResponse.status()).toBe(401)
})

test('visiting / while logged out bounces to /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL('/login')
})
