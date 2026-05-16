import { create } from 'zustand'

export type User = {
  id: number
  email: string
  display_name: string
  avatar_url: string
}

export type AuthStatus = 'loading' | 'authed' | 'anon'

type AuthState = {
  user: User | null
  status: AuthStatus
  setUser: (user: User) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: 'loading',
  setUser: (user) => set({ user, status: 'authed' }),
  clear: () => set({ user: null, status: 'anon' }),
}))
