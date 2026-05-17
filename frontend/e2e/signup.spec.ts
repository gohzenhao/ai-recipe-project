import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { createUser } from './helpers'

test('user can sign up through the UI and lands on the home page', async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.test`
  const password = 'pw-9f3kQ-z82wxR'
  const displayName = 'Signup Tester'

  await page.goto('/signup')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByLabel('Display name').fill(displayName)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  await expect(page.getByText(displayName)).toBeVisible()
})

test('signup with an existing email shows a field-level error', async ({
  page,
  playwright,
}) => {
  const apiContext = await playwright.request.newContext()
  const existing = await createUser(apiContext)
  await apiContext.dispose()

  await page.goto('/signup')
  await page.getByLabel('Email').fill(existing.email)
  await page.getByLabel('Password').fill('pw-different-but-valid-7k2')
  await page.getByLabel('Display name').fill('Different Name')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByRole('alert')).toHaveText('Email already in use')
  await expect(page).toHaveURL('/signup')
})
