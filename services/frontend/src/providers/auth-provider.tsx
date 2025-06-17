'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuthStore, type AuthState } from '@/stores/auth'
import { Loader2 } from 'lucide-react'

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Only check auth if we have a token, don't show loading on first visit
    const initAuth = async () => {
      const token = auth.token
      if (token) {
        await auth.checkAuth()
      }
      setIsInitialized(true)
    }
    initAuth()
  }, [auth])

  // Don't show loading screen on first visit without token
  if (!isInitialized && auth.token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#09090A] via-[#181719] to-[#36343B] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          <span className="text-gray-400">Initializing...</span>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}