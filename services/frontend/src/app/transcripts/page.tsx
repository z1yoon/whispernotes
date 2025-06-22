'use client'

import { Suspense } from 'react'
import Transcripts from '@/components/Transcripts'

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

function TranscriptsPageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-black/40 backdrop-blur-lg rounded-2xl border border-white/10 p-8 w-full max-w-md">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading your transcripts...</p>
        </div>
      </div>
    </div>
  )
}

export default function TranscriptsPage() {
  return (
    <Suspense fallback={<TranscriptsPageFallback />}>
      <Transcripts />
    </Suspense>
  )
}