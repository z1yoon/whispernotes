'use client'

import Link from 'next/link'
import { ArrowRight, Video, Languages, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'

export function Hero() {
  const { isAuthenticated } = useAuth()

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center bg-background text-foreground overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-primary/5 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-1/3 h-full bg-gradient-to-l from-secondary/5 to-transparent blur-3xl"></div>
      </div>

      <div className="container relative z-10 mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-6">
            Transcribe Audio & Video with
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400 mt-2">
              Unmatched Precision
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            WhisperNotes leverages advanced AI to provide fast, accurate transcriptions and speaker identification, turning your spoken content into valuable, organized data.
          </p>
          <Link
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="btn btn-primary btn-lg inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold"
          >
            Get Started <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
            <Video className="w-8 h-8 text-primary mb-3" />
            <h3 className="text-xl font-semibold mb-2">Video & Audio</h3>
            <p className="text-muted-foreground">Effortlessly transcribe content from both video and audio files.</p>
          </div>
          <div className="p-6 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
            <Languages className="w-8 h-8 text-primary mb-3" />
            <h3 className="text-xl font-semibold mb-2">Speaker Diarization</h3>
            <p className="text-muted-foreground">Automatically identify and label different speakers in your recordings.</p>
          </div>
          <div className="p-6 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
            <ShieldCheck className="w-8 h-8 text-primary mb-3" />
            <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
            <p className="text-muted-foreground">Your data is processed securely, ensuring privacy and integrity.</p>
          </div>
        </div>
      </div>
    </section>
  )
} 