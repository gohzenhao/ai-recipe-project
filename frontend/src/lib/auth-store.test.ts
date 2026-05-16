import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/lib/auth-store'

describe('auth-store', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'loading' })
  })

  it('starts in the loading state', () => {
    expect(useAuthStore.getState().status).toBe('loading')
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setUser transitions to authed and stores the user', () => {
    useAuthStore.getState().setUser({
      id: 1,
      email: 'alice@example.com',
      display_name: 'Alice',
      avatar_url: '',
    })
    expect(useAuthStore.getState().status).toBe('authed')
    expect(useAuthStore.getState().user?.email).toBe('alice@example.com')
  })

  it('clear transitions to anon and nulls the user', () => {
    useAuthStore.getState().setUser({
      id: 1,
      email: 'alice@example.com',
      display_name: 'Alice',
      avatar_url: '',
    })
    useAuthStore.getState().clear()
    expect(useAuthStore.getState().status).toBe('anon')
    expect(useAuthStore.getState().user).toBeNull()
  })
})
