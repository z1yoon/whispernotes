'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SharedUpload } from '@/components/SharedUpload'
import { useProgressUpdates } from '@/hooks/useProgressUpdates'

export default function UploadPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [processingSessionIds, setProcessingSessionIds] = useState<string[]>([])
  const { getProgress } = useProgressUpdates(processingSessionIds)

  useEffect(() => {
    if (!session) {
      router.push('/login')
    }
  }, [session, router])

  // Auto-navigate when processing completes
  useEffect(() => {
    processingSessionIds.forEach(sessionId => {
      const progress = getProgress(sessionId)
      if (progress?.status === 'completed') {
        // Remove from processing list and navigate
        setProcessingSessionIds(prev => prev.filter(id => id !== sessionId))
        router.push(`/transcript/${sessionId}`)
      }
    })
  }, [processingSessionIds, getProgress, router])

  if (!session) {
    return null
  }

  const handleStartProcessing = (files: any[], options: any, sessionIds: string[]) => {
    // Start tracking these sessions for auto-navigation
    setProcessingSessionIds(sessionIds)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <SharedUpload 
        isAuthenticated={!!session} 
        onStartProcessing={handleStartProcessing}
      />
      
      {/* Show processing status */}
      {processingSessionIds.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-slate-800 rounded-lg p-4 shadow-lg max-w-sm">
          <h3 className="text-white font-medium mb-2">Processing Files</h3>
          {processingSessionIds.map(sessionId => {
            const progress = getProgress(sessionId)
            return (
              <div key={sessionId} className="mb-2 last:mb-0">
                <div className="text-sm text-slate-300 mb-1">
                  {progress?.message || 'Processing...'}
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress?.progress || 0}%` }}
                  />
                </div>
              </div>
            )
          })}
          <button 
            onClick={() => router.push('/transcripts')}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline"
          >
            View all transcripts →
          </button>
        </div>
      )}
    </div>
  )
}