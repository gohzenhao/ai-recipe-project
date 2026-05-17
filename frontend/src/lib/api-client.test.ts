import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, ApiError } from '@/lib/api-client'
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
  useAuthStore.setState({ user: null, status: 'loading' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('always sends credentials: include', async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, body: '{}' })
    await apiFetch('/health')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.credentials).toBe('include')
  })

  it('attaches X-CSRFToken from document.cookie on POST', async () => {
    document.cookie = 'csrftoken=test-token-abc'
    const fetchMock = mockFetch({ ok: true, status: 200, body: '{}' })
    await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@a', password: 'x' }),
    })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get('X-CSRFToken')).toBe('test-token-abc')
  })

  it('returns parsed JSON on a 200 response', async () => {
    mockFetch({ ok: true, status: 200, body: '{"hello":"world"}' })
    const result = await apiFetch<{ hello: string }>('/health')
    expect(result).toEqual({ hello: 'world' })
  })

  it('on a 401 clears the auth store and navigates to /login', async () => {
    useAuthStore.getState().setUser({
      id: 1,
      email: 'a@a',
      display_name: 'A',
      avatar_url: '',
    })
    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { pathname: '/', assign: assignSpy },
    })
    mockFetch({ ok: false, status: 401, body: '{"detail":"nope"}' })
    await expect(apiFetch('/auth/me')).rejects.toBeInstanceOf(ApiError)
    expect(useAuthStore.getState().status).toBe('anon')
    expect(useAuthStore.getState().user).toBeNull()
    expect(assignSpy).toHaveBeenCalledWith('/login')
  })

  it('with bounceOn401: false, clears the store but does not navigate', async () => {
    useAuthStore.getState().setUser({
      id: 1,
      email: 'a@a',
      display_name: 'A',
      avatar_url: '',
    })
    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { pathname: '/signup', assign: assignSpy },
    })
    mockFetch({ ok: false, status: 401, body: '{"detail":"nope"}' })
    await expect(
      apiFetch('/auth/me', {}, { bounceOn401: false }),
    ).rejects.toBeInstanceOf(ApiError)
    expect(useAuthStore.getState().status).toBe('anon')
    expect(assignSpy).not.toHaveBeenCalled()
  })
})
