import { apiFetch, ApiError } from '@/lib/api-client'
import { useAuthStore, type User } from '@/lib/auth-store'

export type LoginPayload = { email: string; password: string }
export type SignupPayload = {
  email: string
  password: string
  display_name: string
}

export async function login(payload: LoginPayload): Promise<User> {
  const user = await apiFetch<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  useAuthStore.getState().setUser(user)
  return user
}

export async function signup(payload: SignupPayload): Promise<User> {
  const user = await apiFetch<User>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  // Backend already established the session, so no follow-up fetchMe needed.
  useAuthStore.getState().setUser(user)
  return user
}

export async function logout(navigate: (path: string) => void): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch {
    // Even on network/server failure, fall through to clear the client
    // state — a user clicking logout should never end up half-logged-out.
  }
  useAuthStore.getState().clear()
  navigate('/login')
}

export async function fetchMe(): Promise<User | null> {
  try {
    // bounceOn401: false — this probe is informational. A 401 just means
    // "not logged in" and must not redirect the user off a public page.
    const user = await apiFetch<User>(
      '/auth/me',
      { method: 'GET' },
      { bounceOn401: false },
    )
    useAuthStore.getState().setUser(user)
    return user
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      // 401-handler in apiFetch already called clear(); nothing else to do.
      return null
    }
    useAuthStore.getState().clear()
    throw err
  }
}
