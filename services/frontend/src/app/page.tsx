'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { 
  ArrowRight,
  FileAudio,
  Play,
  Upload,
  FileVideo,
  X,
  Zap,
  Users,
  MessageSquare,
  Clock,
  CheckCircle,
  AudioWaveform,
  Brain,
  Download,
  Mic,
  Globe,
  Shield,
  Sparkles,
  Eye,
  Headphones
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

interface QuickFile {
  id: number
  name: string
  size: string
  type: 'video' | 'audio'
  status: 'ready' | 'processing' | 'completed'
  progress?: number
}

export default function LandingPage() {
  const [quickFiles, setQuickFiles] = useState<QuickFile[]>([])
  const [url, setUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [demoProgress, setDemoProgress] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: QuickFile[] = acceptedFiles.slice(0, 3).map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      type: file.type.startsWith('video/') ? 'video' : 'audio',
      status: 'ready',
      progress: 0
    }))
    
    setQuickFiles(prev => [...prev.slice(0, 3 - newFiles.length), ...newFiles])
    toast.success('Files ready for processing!')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac']
    },
    maxSize: 1024 * 1024 * 1024, // 1GB
    maxFiles: 3
  })

  const handleUrlSubmit = () => {
    if (!url.trim()) return
    
    const newFile: QuickFile = {
      id: Date.now(),
      name: 'Video from URL',
      size: '~MB',
      type: 'video',
      status: 'ready',
      progress: 0
    }
    
    setQuickFiles(prev => [newFile, ...prev.slice(0, 2)])
    setUrl('')
    toast.success('URL added for processing!')
  }

  const removeFile = (id: number) => {
    setQuickFiles(prev => prev.filter(f => f.id !== id))
  }

  const startQuickProcess = async () => {
    if (quickFiles.length === 0) {
      toast.error('Add files first!')
      return
    }
    
    setIsProcessing(true)
    setDemoProgress(0)
    
    // Update files to processing status
    setQuickFiles(prev => prev.map(f => ({ ...f, status: 'processing', progress: 0 })))
    
    // Simulate processing with progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 150))
      setDemoProgress(i)
      setQuickFiles(prev => prev.map(f => ({ ...f, progress: i })))
    }
    
    // Mark as completed
    setQuickFiles(prev => prev.map(f => ({ ...f, status: 'completed' })))
    setIsProcessing(false)
    toast.success('Demo processing complete! Sign in for real transcription.')
  }

  // Auto-demo effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (quickFiles.length === 0) {
        const demoFile: QuickFile = {
          id: Date.now(),
          name: 'sample-meeting.mp4',
          size: '45.2 MB',
          type: 'video',
          status: 'ready',
          progress: 0
        }
        setQuickFiles([demoFile])
      }
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [quickFiles.length])

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-gradient-to-r from-[#09090A] via-[#181719] to-[#36343B]">
      {/* Main Content Container */}
      <div className="absolute left-[120px] top-1/2 transform -translate-y-1/2 w-[600px] h-[752px] flex flex-col justify-between">
        
        {/* Info Section */}
        <div className="flex flex-col justify-center gap-[80px] w-full h-[526px]">
          
          {/* Logo Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center w-[375px] h-[72px]"
          >
            <div className="flex items-center gap-4">
              <div className="w-[60px] h-[60px] bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <FileAudio className="w-8 h-8 text-white" />
              </div>
              <span className="text-[#C4C4CC] text-3xl font-light tracking-wide">
                whisper<span className="text-white font-semibold">notes</span>
              </span>
            </div>
          </motion.div>

          {/* Title Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col gap-6 w-full h-[300px]"
          >
            {/* Main Title */}
            <h1 className="text-white text-[100px] font-bold leading-[90%] font-['Roboto_Condensed'] tracking-tight">
              AI Transcription
            </h1>
            
            {/* Subtitle */}
            <p className="text-[#8D8D99] text-[48px] font-normal leading-[130%] font-['Roboto']">
              Speaker Diarization
            </p>
            
            {/* Feature Highlights */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-purple-200 text-sm font-medium">Real-time Processing</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-blue-200 text-sm font-medium">Multi-Speaker</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
                <Globe className="w-4 h-4 text-green-400" />
                <span className="text-green-200 text-sm font-medium">95+ Languages</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tag/CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex gap-4"
        >
          <Link
            href="/login"
            className="flex items-center gap-2 px-12 py-5 bg-[#202024] hover:bg-[#2a2a2e] transition-all duration-300 rounded-full shadow-[0px_57px_23px_rgba(0,0,0,0.02),0px_32px_19px_rgba(0,0,0,0.08),0px_14px_14px_rgba(0,0,0,0.13),0px_4px_8px_rgba(0,0,0,0.15)] transform hover:scale-105"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-[#844FE5] to-[#DEE0FC] rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-white ml-0.5" />
              </div>
              <span className="text-[#DEE0FC] text-2xl font-medium tracking-wide">
                START NOW
              </span>
            </div>
          </Link>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById('process-demo')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-8 py-5 border-2 border-purple-500/30 text-purple-300 hover:border-purple-400/50 hover:text-purple-200 transition-all duration-300 rounded-full"
          >
            <Eye className="w-5 h-5" />
            <span className="text-xl font-medium">
              Watch Demo
            </span>
          </motion.button>
        </motion.div>
      </div>

      {/* Enhanced Process Demo Section */}
      <motion.div
        id="process-demo"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="absolute right-[60px] top-[80px] w-[520px] h-[700px]"
      >
        {/* Process Feature Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="absolute -top-16 left-0 right-0 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/40 rounded-full backdrop-blur-sm">
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="text-purple-200 text-lg font-semibold">Live Processing Demo</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-green-400 rounded-full"
            />
          </div>
        </motion.div>

        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/60 rounded-3xl p-8 shadow-2xl h-full flex flex-col relative overflow-hidden">
          
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <motion.div
              animate={{ 
                backgroundPosition: ['0% 0%', '100% 100%'] 
              }}
              transition={{ 
                duration: 20, 
                repeat: Infinity, 
                ease: 'linear' 
              }}
              className="w-full h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500"
              style={{ backgroundSize: '200% 200%' }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center relative">
                <Brain className="w-6 h-6 text-white" />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-purple-400 rounded-xl"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">AI Process Engine</h3>
                <p className="text-gray-400 text-sm">Real-time transcription & analysis</p>
              </div>
            </div>
            
            {isProcessing && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-full"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-300 text-xs font-medium">PROCESSING</span>
              </motion.div>
            )}
          </div>

          {/* URL Input */}
          <div className="mb-6 relative z-10">
            <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Video URL
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube, Vimeo, or any video URL..."
                className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUrlSubmit}
                className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center"
              >
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Enhanced Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-6 relative z-10 ${
              isDragActive 
                ? 'border-purple-500/70 bg-purple-500/10' 
                : 'border-gray-600/50 hover:border-purple-500/50 hover:bg-gray-800/30'
            }`}
          >
            <input {...getInputProps()} />
            <motion.div
              animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-300 text-sm mb-2 font-medium">
                {isDragActive ? 'Drop files here' : 'Drop files or click to browse'}
              </p>
              <p className="text-gray-500 text-xs">
                MP4, MOV, MP3, WAV • Max 1GB • Up to 3 files
              </p>
            </motion.div>
          </div>

          {/* Files List & Processing */}
          <div className="flex-1 overflow-hidden relative z-10">
            {quickFiles.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <Headphones className="w-4 h-4" />
                  Ready for Processing ({quickFiles.length})
                </h4>
                <div className="space-y-3 max-h-36 overflow-y-auto">
                  {quickFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-xl border border-gray-700/30"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        file.type === 'video' 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-500' 
                          : 'bg-gradient-to-br from-green-500 to-emerald-500'
                      }`}>
                        {file.type === 'video' ? (
                          <FileVideo className="w-5 h-5 text-white" />
                        ) : (
                          <FileAudio className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{file.name}</p>
                        <p className="text-gray-400 text-xs">{file.size}</p>
                        {file.status === 'processing' && (
                          <div className="mt-2">
                            <div className="bg-gray-700 rounded-full h-1.5 overflow-hidden">
                              <motion.div 
                                className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full"
                                style={{ width: `${file.progress || 0}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {file.status === 'completed' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-green-300 text-xs font-medium">Done</span>
                          </motion.div>
                        )}
                        {file.status === 'processing' && (
                          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        )}
                        {file.status === 'ready' && (
                          <button
                            onClick={() => removeFile(file.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Processing Visualization */}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-5 mb-6 border border-gray-600/30"
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <AudioWaveform className="w-5 h-5 text-purple-400" />
                  </motion.div>
                  <span className="text-white text-sm font-semibold">AI Processing Pipeline</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-1 ml-2">
                    <motion.div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-1 rounded-full"
                      style={{ width: `${demoProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-purple-300 text-xs font-mono">{demoProgress}%</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { label: 'Audio extraction', threshold: 20, icon: FileAudio },
                    { label: 'Speech recognition', threshold: 50, icon: Mic },
                    { label: 'Speaker diarization', threshold: 75, icon: Users },
                    { label: 'Action items', threshold: 90, icon: MessageSquare }
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-2 p-2 bg-gray-800/30 rounded-lg">
                      <step.icon className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-300 text-xs flex-1">{step.label}</span>
                      <span className={`text-xs font-medium ${
                        demoProgress > step.threshold ? 'text-green-400' : 
                        demoProgress > step.threshold - 20 ? 'text-yellow-400' : 'text-gray-500'
                      }`}>
                        {demoProgress > step.threshold ? '✓' : demoProgress > step.threshold - 20 ? '⏳' : '○'}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Enhanced Process Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startQuickProcess}
            disabled={isProcessing || quickFiles.length === 0}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed relative z-10 shadow-lg"
          >
            <Zap className="w-5 h-5" />
            <span className="text-lg">
              {isProcessing ? 'Processing...' : 'Start AI Processing'}
            </span>
            {!isProcessing && quickFiles.length > 0 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 bg-white rounded-full"
              />
            )}
          </motion.button>

          {/* Info Text */}
          <p className="text-gray-500 text-xs text-center mt-4 relative z-10">
            🎯 Demo processing • Sign in for full transcription features
          </p>
        </div>
      </motion.div>

      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="absolute bottom-[80px] left-[120px] right-[60px]"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            {
              icon: Users,
              title: "Speaker ID",
              description: "Automatic speaker identification and separation",
              color: "purple"
            },
            {
              icon: MessageSquare,
              title: "Action Items",
              description: "Extract tasks and decisions automatically",
              color: "blue"
            },
            {
              icon: Globe,
              title: "Multi-Language",
              description: "Support for 95+ languages worldwide",
              color: "green"
            },
            {
              icon: Shield,
              title: "Secure",
              description: "Enterprise-grade security and privacy",
              color: "orange"
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/40 rounded-xl p-5 text-center hover:bg-gray-800/50 transition-all hover:border-gray-600/60 group"
            >
              <div className={`w-10 h-10 bg-${feature.color}-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-${feature.color}-500/30 transition-all`}>
                <feature.icon className={`w-5 h-5 text-${feature.color}-400`} />
              </div>
              <h4 className="text-white text-sm font-semibold mb-2">{feature.title}</h4>
              <p className="text-gray-400 text-xs leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Background Gradient Element */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.8 }}
        className="absolute right-[-196px] top-[78px] w-[883px] h-[898px] bg-gradient-to-r from-[#CE76F8] via-[#DEE0FC] to-[#B0E54F] rounded-[20px] opacity-10 blur-3xl"
      />

      {/* Bottom Gradient Border */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-r from-[#0B0726] via-[#342C66] via-[#7142C9] via-[#A29AF5] to-[#DEE0FC]" />
    </div>
  )
}
