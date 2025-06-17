'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Upload,
  FileVideo,
  FileAudio,
  Clock,
  Users,
  CheckSquare,
  LogOut,
  Plus,
  Search,
  Play,
  FileAudio as AudioIcon
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'
import toast from 'react-hot-toast'

interface FileData {
  id: number
  title: string
  duration: string
  speakers: number
  status: 'completed' | 'processing' | 'error' | 'ready'
  type: 'video' | 'audio'
  uploadedAt: string
  actionItems: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, logout, isAuthenticated } = useAuth()
  const [files, setFiles] = useState<FileData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    fetchFiles()
  }, [isAuthenticated, router])

  const fetchFiles = async () => {
    setLoading(true)
    // Mock data
    setTimeout(() => {
      setFiles([
        {
          id: 1,
          title: 'Team Meeting - Q2 Planning',
          duration: '45:30',
          speakers: 5,
          status: 'completed',
          type: 'video',
          uploadedAt: new Date().toISOString(),
          actionItems: 8
        },
        {
          id: 2,
          title: 'Product Review Session',
          duration: '30:15',
          speakers: 3,
          status: 'processing',
          type: 'audio',
          uploadedAt: new Date().toISOString(),
          actionItems: 0
        },
        {
          id: 3,
          title: 'Client Presentation',
          duration: '1:15:20',
          speakers: 4,
          status: 'completed',
          type: 'video',
          uploadedAt: new Date().toISOString(),
          actionItems: 12
        }
      ])
      setLoading(false)
    }, 1000)
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
    toast.success('Logged out successfully')
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredFiles = files.filter(file =>
    file.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <AudioIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">Whisper Notes</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">{user?.username}</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.username}
          </h1>
          <p className="text-gray-600">
            Manage your transcription files and track processing status
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Files', value: '24', icon: FileVideo },
            { label: 'Speakers ID', value: '156', icon: Users },
            { label: 'Action Items', value: '89', icon: CheckSquare },
            { label: 'Hours Processed', value: '47.5', icon: Clock }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New File</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Drop your audio or video files here</p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Choose Files
            </Link>
          </div>
        </div>

        {/* Files Section */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recent Files</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading files...</p>
            </div>
          ) : filteredFiles.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => router.push(`/transcript/${file.id}`)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {file.type === 'video' ? (
                        <FileVideo className="w-5 h-5 text-blue-600" />
                      ) : (
                        <FileAudio className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{file.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {file.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {file.speakers} speakers
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" />
                          {file.actionItems} tasks
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(file.status)}`}>
                        {file.status === 'completed' ? 'Ready' : file.status}
                      </span>
                      <Play className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <FileVideo className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
              <p className="text-gray-600 mb-4">Upload your first file to get started</p>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Upload File
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}