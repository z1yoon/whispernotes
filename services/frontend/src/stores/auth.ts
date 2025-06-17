import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

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
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
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

      login: async (username: string, password: string) => {
        set({ isLoading: true })
        
        try {
          // Create form data for OAuth2 password flow
          const formData = new FormData()
          formData.append('username', username)
          formData.append('password', password)

          const response = await authAPI.post('/token', formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })

          const { access_token, token_type } = response.data
          
          // Get user info using the token
          const userResponse = await authAPI.get('/users/me', {
            headers: {
              'Authorization': `${token_type} ${access_token}`
            }
          })

          const user = userResponse.data
          
          // Check if user account is approved
          if (user.status === 'pending') {
            set({ isLoading: false })
            return { success: false, error: 'Account is pending admin approval' }
          }
          
          if (user.status === 'rejected') {
            set({ isLoading: false })
            return { success: false, error: 'Account request was rejected. Contact admin.' }
          }
          
          // Set axios default header for future requests
          authAPI.defaults.headers.common['Authorization'] = `${token_type} ${access_token}`
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false
          })

          return { success: true }
        } catch (error: any) {
          set({ isLoading: false })
          
          if (error.response?.status === 401) {
            return { success: false, error: 'Invalid credentials. Please check your username and password.' }
          } else if (error.response?.status === 403) {
            return { success: false, error: 'Account access denied. Contact administrator.' }
          } else if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR') {
            return { success: false, error: 'Unable to connect to server. Please try again later.' }
          }
          
          const errorMessage = error.response?.data?.detail || 'Login failed. Please try again.'
          return { success: false, error: errorMessage }
        }
      },

      logout: () => {
        // Clear axios default header
        delete authAPI.defaults.headers.common['Authorization']
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        })
      },

      checkAuth: async () => {
        const { token } = get()
        
        if (!token) {
          return false
        }

        try {
          // Check if token is expired
          const decoded: any = jwtDecode(token)
          const currentTime = Date.now() / 1000
          
          if (decoded.exp < currentTime) {
            get().logout()
            return false
          }

          // Set axios default header
          authAPI.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          // Verify token with backend
          const response = await authAPI.get('/users/me')
          const user = response.data
          
          // Check if user is still active
          if (user.status !== 'active') {
            get().logout()
            return false
          }
          
          set({ user, isAuthenticated: true })
          return true
        } catch (error) {
          get().logout()
          return false
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)