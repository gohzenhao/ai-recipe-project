import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logout } from '@/lib/auth'
import { useAuthStore } from '@/lib/auth-store'

type MockedResponse = { ok?: boolean; status?: number; body?: string }

function mockFetch(response: MockedResponse) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    text: () => Promise.resolve(response.body ?? ''),
  } as unknown as Response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  document.cookie = ''
  useAuthStore.setState({
    user: { id: 1, email: 'a@a', display_name: 'A', avatar_url: '' },
    status: 'authed',
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('logout', () => {
  it('on 204 clears the auth store and navigates to /login', async () => {
    mockFetch({ ok: true, status: 204, body: '' })
    const navigate = vi.fn()
    await logout(navigate)
    expect(useAuthStore.getState().status).toBe('anon')
    expect(useAuthStore.getState().user).toBeNull()
    expect(navigate).toHaveBeenCalledWith('/login')
  })

  it('POSTs to /auth/logout', async () => {
    const fetchMock = mockFetch({ ok: true, status: 204, body: '' })
    await logout(vi.fn())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/auth/logout')
    expect((init as RequestInit).method).toBe('POST')
  })

  it('clears the store and navigates even when the request fails', async () => {
    // Network failure: fetch rejects outright.
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    const navigate = vi.fn()
    await logout(navigate)
    expect(useAuthStore.getState().status).toBe('anon')
    expect(useAuthStore.getState().user).toBeNull()
    expect(navigate).toHaveBeenCalledWith('/login')
  })
})
