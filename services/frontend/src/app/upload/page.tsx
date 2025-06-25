'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SharedUpload } from '@/components/SharedUpload'

export default function UploadPage() {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    if (!session) {
      router.push('/login')
    }
  }, [session, router])

  if (!session) {
    return null
  }

  const handleStartProcessing = () => {
    router.push('/transcripts')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <SharedUpload 
        isAuthenticated={!!session} 
        onStartProcessing={handleStartProcessing}
      />
    </div>
  )
}