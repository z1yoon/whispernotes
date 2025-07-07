'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useNotification } from '@/components/NotificationProvider'

function AuthErrorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const notification = useNotification()

  useEffect(() => {
    const error = searchParams?.get('error')
    
    // Handle different error types
    if (error) {
      switch (error) {
        case 'Configuration':
          notification.error('Configuration Error', 'Authentication service is not properly configured. Please contact support.')
          break
        case 'AccessDenied':
          notification.error('Access Denied', 'You do not have permission to access this application.')
          break
        case 'Verification':
          notification.error('Verification Error', 'Unable to verify your identity. Please try again.')
          break
        default:
          notification.error('Authentication Error', 'Login failed. Please check your credentials and try again.')
      }
    } else {
      notification.error('Authentication Error', 'Login failed. Please try again.')
    }
    
    // Redirect to login after showing error
    setTimeout(() => {
      router.replace('/login')
    }, 3000)
  }, [searchParams, router, notification])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-black/40 backdrop-blur-lg rounded-2xl border border-white/10 p-8 w-full max-w-md text-center">
        <div className="text-white mb-4">
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="text-white/60">Redirecting to login page...</p>
        </div>
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-black/40 backdrop-blur-lg rounded-2xl border border-white/10 p-8 w-full max-w-md text-center">
          <div className="text-white mb-4">
            <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          </div>
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}