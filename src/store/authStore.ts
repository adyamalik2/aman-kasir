import { create } from 'zustand'
import type { AuthUser } from '@/services/auth/AuthService'

interface AuthState {
  user: AuthUser | null
  isLoggedIn: boolean
  /** true saat masih menunggu respons onAuthStateChanged pertama kali */
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  setUser: (user) => set({ user, isLoggedIn: user !== null, isLoading: false }),
  clearUser: () => set({ user: null, isLoggedIn: false, isLoading: false }),
}))
