'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Upload,
  FileVideo,
  FileAudio,
  X,
  Check,
  Clock,
  Zap,
  FileAudio as AudioIcon,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/providers/auth-provider'
import toast from 'react-hot-toast'

interface FileData {
  id: number
  file: File
  name: string
  size: number
  type: 'video' | 'audio'
  status: 'ready' | 'uploading' | 'completed' | 'error'
  progress: number
}

export default function UploadPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [files, setFiles] = useState<FileData[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileData[] = acceptedFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type.startsWith('video/') ? 'video' : 'audio',
      status: 'ready',
      progress: 0
    }))
    
    setFiles(prev => [...prev, ...newFiles])
    toast.success(`${acceptedFiles.length} file(s) added`)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac']
    },
    maxSize: 5 * 1024 * 1024 * 1024 // 5GB
  })

  const removeFile = (id: number) => {
    setFiles(prev => prev.filter(file => file.id !== id))
  }

  const startProcessing = async () => {
    if (files.length === 0) {
      toast.error('Please add files to process')
      return
    }

    setFiles(prev => prev.map(file => ({ ...file, status: 'uploading', progress: 0 })))

    for (const file of files) {
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, progress } : f
        ))
      }
      
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'completed' } : f
      ))
    }

    toast.success('Processing completed!')
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isAuthenticated) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#09090A] via-[#181719] to-[#36343B]">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center h-16 gap-4">
            <Link
              href="/dashboard"
              className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <AudioIcon className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-white">Upload Files</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)]">
          
          {/* Left Side - Upload Area */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="h-full"
            >
              <div
                {...getRootProps()}
                className={`h-full bg-gray-900/60 backdrop-blur-xl border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 cursor-pointer transition-all duration-300 ${
                  isDragActive 
                    ? 'border-purple-500/70 bg-purple-500/10' 
                    : 'border-gray-600/50 hover:border-purple-500/50'
                }`}
              >
                <input {...getInputProps()} />
                
                <div className={`w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mb-8 transition-transform duration-300 ${
                  isDragActive ? 'scale-110 rotate-6' : 'hover:scale-105'
                }`}>
                  <Upload className="w-12 h-12 text-white" />
                </div>
                
                <h2 className="text-4xl font-bold text-white mb-4 text-center">
                  {isDragActive ? 'Drop files here' : 'Upload Your Files'}
                </h2>
                
                <p className="text-xl text-gray-400 mb-8 text-center max-w-lg">
                  Drag and drop your audio or video files here, or click to browse
                </p>
                
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  {['MP4', 'MOV', 'AVI', 'WebM', 'MP3', 'WAV', 'M4A', 'FLAC'].map(format => (
                    <span key={format} className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full text-sm font-medium">
                      {format}
                    </span>
                  ))}
                </div>
                
                <button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 inline-flex items-center gap-3 transform hover:scale-105">
                  <Upload className="w-5 h-5" />
                  Choose Files
                </button>
                
                <p className="text-gray-500 text-sm mt-6">Maximum file size: 5GB per file</p>
              </div>
            </motion.div>
          </div>

          {/* Right Side - Files List */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="h-full bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-700/50">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <FileVideo className="w-5 h-5 text-purple-400" />
                  Files ({files.length})
                </h3>
              </div>

              {/* Files List */}
              <div className="flex-1 overflow-y-auto p-6">
                {files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center mb-4">
                      <FileAudio className="w-8 h-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-lg mb-2">No files selected</p>
                    <p className="text-gray-500 text-sm">Upload files to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {files.map((file, index) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gray-800/50 border border-gray-600/50 rounded-xl p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
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
                            <div className="text-white font-medium truncate text-sm">{file.name}</div>
                            <div className="text-gray-400 text-xs mt-1">
                              {formatFileSize(file.size)}
                            </div>
                            
                            {file.status === 'uploading' && (
                              <div className="mt-2">
                                <div className="bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${file.progress}%` }}
                                  />
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{file.progress}%</div>
                              </div>
                            )}
                            
                            <div className={`flex items-center gap-1 text-xs mt-2 ${
                              file.status === 'completed' 
                                ? 'text-green-400'
                                : file.status === 'uploading'
                                ? 'text-yellow-400'
                                : 'text-gray-400'
                            }`}>
                              {file.status === 'uploading' && <Clock className="w-3 h-3" />}
                              {file.status === 'completed' && <Check className="w-3 h-3" />}
                              <span>
                                {file.status === 'completed' ? 'Ready' : 
                                 file.status === 'uploading' ? 'Processing' : 'Ready'}
                              </span>
                            </div>
                          </div>
                          
                          {file.status !== 'uploading' && (
                            <button
                              onClick={() => removeFile(file.id)}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Process Button */}
              {files.length > 0 && (
                <div className="p-6 border-t border-gray-700/50">
                  <button
                    onClick={startProcessing}
                    disabled={files.some(file => file.status === 'uploading')}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Start Processing
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}