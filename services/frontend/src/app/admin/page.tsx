'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Users,
  Check,
  X,
  Clock,
  Mail,
  Building,
  Phone,
  FileText,
  LogOut,
  Shield,
  Search,
  Filter
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import toast from 'react-hot-toast'

interface PendingUser {
  id: number
  username: string
  email: string
  fullName: string
  organization?: string
  phone?: string
  purpose?: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected'
}

export default function AdminPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const { user, logout } = useAuth()
  const router = useRouter()

  // Check if user is admin
  useEffect(() => {
    if (user && user.username !== 'admin') {
      toast.error('Access denied. Admin only.')
      router.push('/dashboard')
      return
    }
    
    // Load pending users
    loadPendingUsers()
  }, [user, router])

  const loadPendingUsers = async () => {
    try {
      // TODO: Replace with actual API call
      // For demo, use mock data
      const mockUsers: PendingUser[] = [
        {
          id: 1,
          username: 'john_doe',
          email: 'john@example.com',
          fullName: 'John Doe',
          organization: 'Tech Corp',
          phone: '+1-555-0123',
          purpose: 'Need transcription for business meetings and interviews',
          requestedAt: '2025-06-17T10:30:00Z',
          status: 'pending'
        },
        {
          id: 2,
          username: 'jane_smith',
          email: 'jane.smith@university.edu',
          fullName: 'Jane Smith',
          organization: 'University Research',
          phone: '+1-555-0456',
          purpose: 'Academic research on speech patterns and linguistics',
          requestedAt: '2025-06-16T14:15:00Z',
          status: 'pending'
        },
        {
          id: 3,
          username: 'mike_johnson',
          email: 'mike@startup.com',
          fullName: 'Mike Johnson',
          organization: 'AI Startup',
          purpose: 'Content creation and podcast transcription',
          requestedAt: '2025-06-15T09:45:00Z',
          status: 'approved'
        }
      ]
      
      setPendingUsers(mockUsers)
      setIsLoading(false)
    } catch (error) {
      toast.error('Failed to load user requests')
      setIsLoading(false)
    }
  }

  const handleApprove = async (userId: number) => {
    try {
      // TODO: Replace with actual API call
      setPendingUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, status: 'approved' } : user
        )
      )
      toast.success('User approved successfully')
    } catch (error) {
      toast.error('Failed to approve user')
    }
  }

  const handleReject = async (userId: number) => {
    try {
      // TODO: Replace with actual API call
      setPendingUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, status: 'rejected' } : user
        )
      )
      toast.success('User rejected')
    } catch (error) {
      toast.error('Failed to reject user')
    }
  }

  const filteredUsers = pendingUsers.filter(user => {
    const matchesFilter = filter === 'all' || user.status === filter
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      case 'approved': return 'text-green-400 bg-green-400/10 border-green-400/30'
      case 'rejected': return 'text-red-400 bg-red-400/10 border-red-400/30'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
    }
  }

  if (!user || user.username !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#09090A] via-[#181719] to-[#36343B]">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-white">Admin Panel</h1>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Requests', value: pendingUsers.length, color: 'blue' },
            { label: 'Pending', value: pendingUsers.filter(u => u.status === 'pending').length, color: 'yellow' },
            { label: 'Approved', value: pendingUsers.filter(u => u.status === 'approved').length, color: 'green' },
            { label: 'Rejected', value: pendingUsers.filter(u => u.status === 'rejected').length, color: 'red' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <div className="text-gray-400 text-sm font-medium">{stat.label}</div>
              <div className="text-3xl font-bold text-white mt-2">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or username..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status as any)}
                  className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    filter === status
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Users List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-400" />
              User Requests ({filteredUsers.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading user requests...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No user requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="p-6 hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{user.fullName}</h3>
                          <p className="text-gray-400 text-sm">@{user.username}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Mail className="w-4 h-4 text-gray-500" />
                          {user.email}
                        </div>
                        {user.organization && (
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Building className="w-4 h-4 text-gray-500" />
                            {user.organization}
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Phone className="w-4 h-4 text-gray-500" />
                            {user.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Clock className="w-4 h-4 text-gray-500" />
                          {new Date(user.requestedAt).toLocaleDateString()}
                        </div>
                      </div>

                      {user.purpose && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-300">Purpose:</span>
                          </div>
                          <p className="text-sm text-gray-400 pl-6">{user.purpose}</p>
                        </div>
                      )}
                    </div>

                    {user.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(user.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}