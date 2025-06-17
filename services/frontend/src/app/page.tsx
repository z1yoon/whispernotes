'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Upload,
  Mic,
  ArrowRight,
  User,
  LogOut
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

export default function LandingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication status
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    toast.success('Logged out successfully')
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!user) {
      toast.error('Please login to upload files')
      router.push('/login')
      return
    }
    
    // If authenticated, redirect to upload page
    router.push('/upload')
  }, [user, router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    maxFiles: 5,
    noClick: false,
    multiple: true
  })

  const handleGetStarted = () => {
    if (user) {
      router.push('/upload')
    } else {
      router.push('/login')
    }
  }

  const handleUploadClick = () => {
    if (!user) {
      router.push('/login')
      return
    }
    router.push('/upload')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0b] via-[#1a1a1f] to-[#2a2a35] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0b] via-[#1a1a1f] to-[#2a2a35] flex">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              Whisper<span className="text-purple-400">Notes</span>
            </span>
          </div>

          {/* User Menu or Auth Buttons */}
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-white text-sm font-medium">{user.username || user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Left Content */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div className="max-w-2xl w-full">
          
          {/* Main Content */}
          <div className="space-y-8">
            {/* Heading */}
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
                AI Video
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                  Transcription
                </span>
              </h1>
              
              <p className="text-2xl lg:text-3xl text-gray-400 font-light">
                Speaker Diarization
              </p>
            </div>

            {/* Description */}
            <p className="text-xl text-gray-300 leading-relaxed max-w-xl">
              Transform your videos into accurate transcripts with AI-powered speaker identification technology
            </p>

            {/* Features */}
            <div className="space-y-3">
              {['Real-time processing', 'Multiple speaker detection', 'High accuracy transcription'].map((feature, index) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <button
                onClick={handleGetStarted}
                className="group inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
              >
                {user ? 'Start Uploading' : 'Get Started'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Modern Upload Interface */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-lg">
          <div 
            {...getRootProps()}
            className={`relative cursor-pointer transition-all duration-500 ${
              isDragActive 
                ? 'scale-105' 
                : 'hover:scale-[1.02]'
            }`}
          >
            <input {...getInputProps()} />
            
            {/* Upload Container */}
            <div className={`aspect-[4/5] rounded-3xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center relative overflow-hidden ${
              isDragActive 
                ? 'border-purple-400 bg-gradient-to-br from-purple-500/20 to-blue-500/20 shadow-2xl shadow-purple-500/25' 
                : 'border-gray-600/30 hover:border-purple-500/50 bg-gradient-to-br from-gray-900/40 to-gray-800/40 backdrop-blur-xl'
            }`}>
              
              {/* Animated Background */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-blue-600/5" />
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl animate-pulse animation-delay-1000" />
              </div>

              {/* Upload Content */}
              <div className="relative z-10 text-center space-y-6 p-8">
                
                {/* Modern Upload Icon */}
                <div className={`relative ${isDragActive ? 'animate-bounce' : ''}`}>
                  <div className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isDragActive 
                      ? 'bg-gradient-to-br from-purple-500 to-blue-500' 
                      : 'bg-gradient-to-br from-gray-700 to-gray-600 hover:from-purple-600 hover:to-blue-600'
                  }`}>
                    <Upload className="w-12 h-12 text-white" />
                  </div>
                  
                  {isDragActive && (
                    <div className="absolute inset-0 w-24 h-24 mx-auto border-2 border-purple-400 rounded-2xl animate-ping" />
                  )}
                </div>
                
                {/* Upload Text */}
                <div className="space-y-4">
                  <h3 className={`text-2xl font-bold transition-all duration-500 ${
                    isDragActive 
                      ? 'text-purple-300' 
                      : 'text-white'
                  }`}>
                    {isDragActive 
                      ? 'Drop your videos!' 
                      : 'Upload Videos'
                    }
                  </h3>
                  
                  <p className={`text-lg transition-all duration-500 ${
                    isDragActive 
                      ? 'text-purple-200' 
                      : 'text-gray-300'
                  }`}>
                    {isDragActive 
                      ? 'Release to start processing' 
                      : 'Drag & drop or click to browse'
                    }
                  </p>
                  
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>MP4, MOV, AVI, WEBM</div>
                    <div>Max 500MB • Up to 5 files</div>
                  </div>
                </div>

                {/* Upload Button */}
                {!isDragActive && (
                  <button
                    onClick={handleUploadClick}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 backdrop-blur-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Choose Files
                  </button>
                )}
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-8 right-8 w-2 h-2 bg-purple-400 rounded-full opacity-60 animate-pulse" />
              <div className="absolute top-16 left-8 w-1.5 h-1.5 bg-blue-400 rounded-full opacity-40 animate-pulse animation-delay-1000" />
              <div className="absolute bottom-12 left-12 w-1.5 h-1.5 bg-cyan-400 rounded-full opacity-50 animate-pulse animation-delay-2000" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
