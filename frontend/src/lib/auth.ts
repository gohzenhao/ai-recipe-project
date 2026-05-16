import { apiFetch, ApiError } from '@/lib/api-client'
import { useAuthStore, type User } from '@/lib/auth-store'

export type LoginPayload = { email: string; password: string }

export async function login(payload: LoginPayload): Promise<User> {
  const user = await apiFetch<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  useAuthStore.getState().setUser(user)
  return user
}

export async function fetchMe(): Promise<User | null> {
  try {
    const user = await apiFetch<User>('/auth/me', { method: 'GET' })
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
