import { useAuthStore } from '@/lib/auth-store'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api') as string

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`
  for (const pair of document.cookie.split(';')) {
    const trimmed = pair.trim()
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length))
    }
  }
  return undefined
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`)
    this.status = status
    this.body = body
  }
}

export type ApiFetchOptions = {
  // Opt out of the 401 -> /login bounce. Use for informational probes like
  // /me where a 401 just means "logged out" and should not yank the user
  // off a public page (e.g. /signup).
  bounceOn401?: boolean
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  opts: ApiFetchOptions = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const csrf = readCookie('csrftoken')
  if (csrf) {
    headers.set('X-CSRFToken', csrf)
  }

  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (response.status === 401) {
    useAuthStore.getState().clear()
    // Bounce to login. A full navigation here means feature code never has
    // to repeat the "session expired -> kick to /login" check at call sites.
    const shouldBounce = opts.bounceOn401 !== false
    if (
      shouldBounce &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login'
    ) {
      window.location.assign('/login')
    }
  }

  const text = await response.text()
  let body: unknown = null
  if (text.length > 0) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, body)
  }

  return body as T
}
