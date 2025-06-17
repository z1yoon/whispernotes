import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

export interface User {
  id: string
  username: string
  email?: string
  status?: 'active' | 'pending' | 'rejected'
  role?: 'user' | 'admin'
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  checkAuth: () => Promise<boolean>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

// Create an axios instance with default config
const authAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (identifier: string, password: string) => {
        // 'identifier' can be email or username, depending on backend implementation
        set({ isLoading: true })
        
        try {
          const response = await authAPI.post('/auth/login', {
            email: identifier,
            password,
          })

          const { access_token, token_type, user } = response.data
          
          // Check if user account is active
          if (!user.is_active) {
            set({ isLoading: false })
            return { success: false, error: 'Account is inactive. Contact administrator.' }
          }
          
          // Set axios default header for future requests
          authAPI.defaults.headers.common['Authorization'] = `${token_type} ${access_token}`
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          })

          return { success: true }
        } catch (error: any) {
          set({ isLoading: false })
          
          if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
              return { success: false, error: 'Invalid credentials. Please check your email and password.' }
            }
            return { success: false, error: error.response?.data?.detail || 'Login failed. Please try again.' }
          }
          
          return { success: false, error: 'Unexpected error. Please try again.' }
        }
      },

      logout: () => {
        delete authAPI.defaults.headers.common['Authorization']
        set({ user: null, token: null, isAuthenticated: false, isLoading: false })
      },

      checkAuth: async () => {
        const { token } = get()
        if (!token) return false
        
        try {
          // Set header and verify token with backend
          authAPI.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const response = await authAPI.get('/auth/me')
          const user = response.data
          
          if (!user.is_active) {
            get().logout()
            return false
          }
          
          set({ user, isAuthenticated: true })
          return true
        } catch {
          get().logout()
          return false
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)