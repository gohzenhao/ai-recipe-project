import { expect, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'

export const BACKEND_URL = 'http://localhost:8000'

export type TestUser = {
  email: string
  password: string
  displayName: string
}

// Create a user directly via the API. The signup endpoint is CSRF-protected
// (Ninja's APIKeyCookie auth enforces it on POST), so we GET /me first to
// seed the csrftoken cookie, then echo it back in the X-CSRFToken header.
export async function createUser(
  request: APIRequestContext,
  overrides: Partial<TestUser> = {},
): Promise<TestUser> {
  const user: TestUser = {
    email: overrides.email ?? `e2e-${randomUUID()}@example.test`,
    password: overrides.password ?? 'pw-9f3kQ-z82wxR',
    displayName: overrides.displayName ?? 'E2E User',
  }

  await request.get(`${BACKEND_URL}/api/auth/me`)
  const cookies = await request.storageState()
  const csrf = cookies.cookies.find((c) => c.name === 'csrftoken')?.value
  if (!csrf) throw new Error('csrftoken cookie was not set by /api/auth/me')

  const res = await request.post(`${BACKEND_URL}/api/auth/signup`, {
    headers: { 'X-CSRFToken': csrf },
    data: {
      email: user.email,
      password: user.password,
      display_name: user.displayName,
    },
  })
  expect(res.ok(), `signup failed: ${res.status()} ${await res.text()}`).toBe(true)

  return user
}
