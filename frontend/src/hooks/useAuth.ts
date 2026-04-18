import { create } from "zustand"
import { login as loginApi, getMe } from "@/api/auth"
import type { User } from "@/types"

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("aro_token"),
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username: string, password: string) => {
    const response = await loginApi(username, password)
    localStorage.setItem("aro_token", response.access_token)
    const user = await getMe()
    set({
      token: response.access_token,
      user,
      isAuthenticated: true,
    })
  },

  logout: () => {
    localStorage.removeItem("aro_token")
    set({ token: null, user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = localStorage.getItem("aro_token")
    if (!token) {
      set({ isLoading: false, isAuthenticated: false })
      return
    }
    try {
      const user = await getMe()
      set({ token, user, isAuthenticated: true, isLoading: false })
    } catch {
      localStorage.removeItem("aro_token")
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  setUser: (user) => set({ user }),
}))
