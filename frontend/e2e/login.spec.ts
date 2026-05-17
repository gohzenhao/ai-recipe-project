import { test, expect } from '@playwright/test'
import { createUser } from './helpers'

test('user can log in and lands on the home page', async ({ page, playwright }) => {
  // Build the user in an isolated request context so the browser starts
  // logged out (the signup endpoint auto-logs the caller in).
  const apiContext = await playwright.request.newContext()
  const user = await createUser(apiContext)
  await apiContext.dispose()

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  await expect(page.getByText(user.displayName)).toBeVisible()
})

test('login with wrong password shows an error and stays on /login', async ({
  page,
  playwright,
}) => {
  const apiContext = await playwright.request.newContext()
  const user = await createUser(apiContext)
  await apiContext.dispose()

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('definitely-not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('alert')).toHaveText('Invalid email or password')
  await expect(page).toHaveURL('/login')
})
