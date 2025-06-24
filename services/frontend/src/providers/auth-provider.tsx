'use client'

import { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'

// Simple wrapper for NextAuth SessionProvider
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  )
}

// Hook to use NextAuth session
export { useSession as useAuth } from 'next-auth/react'