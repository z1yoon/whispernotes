'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import styled from 'styled-components'
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
  Filter,
  User,
  ArrowLeft,
  UserCheck,
  UserX,
  Settings,
  Trash2,
  FileVideo,
  FileAudio,
  HardDrive,
  Calendar,
  Eye
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { useNotification } from '@/components/NotificationProvider'
import UserButton from '@/components/UserButton'
import Link from 'next/link'

// Styled components matching landing page design
const AdminContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(90deg, #09090A 0%, #181719 37%, #36343B 100%);
  position: relative;
`;

const Header = styled.div`
  background: rgba(32, 32, 36, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(136, 80, 242, 0.2);
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const BackButton = styled.button`
  background: rgba(136, 80, 242, 0.1);
  border: 1px solid rgba(136, 80, 242, 0.2);
  color: #C4C4CC;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(136, 80, 242, 0.2);
    border-color: rgba(136, 80, 242, 0.3);
    color: #FFFFFF;
  }
`;

const HeaderTitle = styled.div`
  .title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0;
    font-family: 'Inter', sans-serif;
  }
  
  .subtitle {
    font-size: 0.875rem;
    color: #8D8D99;
    margin: 0;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UsernameButton = styled.div`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: 'Roboto', sans-serif;
  font-weight: 600;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AuthButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: 'Roboto', sans-serif;
  font-weight: 600;
  color: #FFFFFF;
  transition: all 0.2s;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  
  ${props => props.$variant === 'primary' ? `
    background: linear-gradient(90deg, #8850F2 0%, #A855F7 100%);
    color: white;
    &:hover {
      opacity: 0.9;
    }
  ` : `
    background: rgba(255, 255, 255, 0.1);
    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  `}
`;

const MainContent = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(32, 32, 36, 0.65);
  border-radius: 24px;
  backdrop-filter: blur(14px);
  box-shadow: 0px 12px 40px rgba(0, 0, 0, 0.45);
  padding: 2rem;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    padding: 2px;
    border-radius: inherit;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 30%, #B0E54F 100%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    pointer-events: none;
    opacity: 0.8;
  }

  .stat-label {
    color: #8D8D99;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    color: #FFFFFF;
    font-size: 3rem;
    font-weight: 700;
    margin: 0;
  }
`;

const AdminPanel = styled(motion.div)`
  background: rgba(32, 32, 36, 0.65);
  border-radius: 24px;
  backdrop-filter: blur(14px);
  box-shadow: 0px 12px 40px rgba(0, 0, 0, 0.45);
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    padding: 2px;
    border-radius: inherit;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 30%, #B0E54F 100%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    pointer-events: none;
    opacity: 0.8;
  }
`;

const PanelHeader = styled.div`
  padding: 2rem;
  border-bottom: 1px solid rgba(136, 80, 242, 0.2);

  .panel-title {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: #FFFFFF;
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
  }
`;

const SearchFilter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }

  .search-input {
    flex: 1;
    position: relative;

    input {
      width: 100%;
      padding: 1rem 1rem 1rem 3rem;
      background: rgba(20, 20, 24, 0.8);
      border: 1px solid rgba(136, 80, 242, 0.3);
      border-radius: 12px;
      color: #FFFFFF;
      font-size: 0.875rem;
      font-weight: 600;

      &::placeholder {
        color: #8D8D99;
      }

      &:focus {
        outline: none;
        border-color: #8850F2;
        box-shadow: 0 0 0 3px rgba(136, 80, 242, 0.1);
      }
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #8D8D99;
    }
  }

  .filter-buttons {
    display: flex;
    gap: 0.5rem;
  }
`;

const FilterButton = styled.button<{ active: boolean }>`
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s;
  border: 1px solid rgba(136, 80, 242, 0.3);
  
  ${props => props.active ? `
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    color: #FFFFFF;
    border-color: #8850F2;
  ` : `
    background: rgba(20, 20, 24, 0.5);
    color: #8D8D99;
    
    &:hover {
      background: rgba(136, 80, 242, 0.1);
      color: #FFFFFF;
    }
  `}
`;

const UsersList = styled.div`
  max-height: 600px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(20, 20, 24, 0.3);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(136, 80, 242, 0.5);
    border-radius: 3px;
  }
`;

const UserCard = styled(motion.div)`
  padding: 2rem;
  border-bottom: 1px solid rgba(136, 80, 242, 0.1);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(136, 80, 242, 0.05);
  }
`;

const UserHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  gap: 1rem;
  margin-bottom: 1.5rem;

  .user-avatar {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .user-info {
    flex: 1;

    .user-name {
      color: #FFFFFF;
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .user-username {
      color: #8D8D99;
      font-size: 0.875rem;
      font-weight: 600;
    }
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid;
  
  ${props => {
    switch (props.status) {
      case 'pending':
        return `
          background: rgba(251, 191, 36, 0.1);
          color: #FCD34D;
          border-color: rgba(251, 191, 36, 0.3);
        `;
      case 'approved':
        return `
          background: rgba(34, 197, 94, 0.1);
          color: #4ADE80;
          border-color: rgba(34, 197, 94, 0.3);
        `;
      case 'rejected':
        return `
          background: rgba(239, 68, 68, 0.1);
          color: #F87171;
          border-color: rgba(239, 68, 68, 0.3);
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.1);
          color: #9CA3AF;
          border-color: rgba(107, 114, 128, 0.3);
        `;
    }
  }}
`;

const UserDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;

  .detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #BDBDC2;
    font-size: 0.875rem;
    font-weight: 600;

    .icon {
      color: #8D8D99;
    }
  }
`;

const PurposeSection = styled.div`
  margin-bottom: 1.5rem;

  .purpose-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #BDBDC2;
    font-size: 0.875rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
  }

  .purpose-text {
    color: #8D8D99;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.5;
    padding-left: 1.5rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;

  button {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.875rem;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s;

    &.approve {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
      }
    }

    &.reject {
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
      color: white;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
      }
    }

    &.delete {
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
      color: white;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
      }
    }
  }
`;

const EmptyState = styled.div`
  padding: 4rem 2rem;
  text-align: center;

  .empty-icon {
    width: 4rem;
    height: 4rem;
    color: #8D8D99;
    margin: 0 auto 1rem;
  }

  .empty-text {
    color: #8D8D99;
    font-size: 1.125rem;
    font-weight: 600;
  }
`;

const LoadingState = styled.div`
  padding: 4rem 2rem;
  text-align: center;

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid rgba(136, 80, 242, 0.3);
    border-top-color: #8850F2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    color: #8D8D99;
    font-size: 1.125rem;
    font-weight: 600;
  }
`;

const AdminBadge = styled.span<{ isAdmin: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid;
  
  ${props => props.isAdmin ? `
    background: rgba(136, 80, 242, 0.1);
    color: #A855F7;
    border-color: rgba(136, 80, 242, 0.3);
  ` : `
    background: rgba(107, 114, 128, 0.1);
    color: #9CA3AF;
    border-color: rgba(107, 114, 128, 0.3);
  `}
`;

const TabButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const TabButton = styled.button<{ active: boolean }>`
  padding: 1rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  border: 1px solid rgba(136, 80, 242, 0.3);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  ${props => props.active ? `
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    color: #FFFFFF;
    border-color: #8850F2;
  ` : `
    background: rgba(20, 20, 24, 0.5);
    color: #8D8D99;
    
    &:hover {
      background: rgba(136, 80, 242, 0.1);
      color: #FFFFFF;
    }
  `}
`;

interface ExistingUser {
  id: string
  email: string
  full_name: string
  is_admin: boolean
  is_active: boolean
}

interface PendingUser {
  id: number
  email: string
  full_name: string
  reason: string
  status: string
  requested_at: string
}

interface Transcript {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  status: string;
  duration?: number;
  progress: number;
  hasTranscript: boolean;
  createdAt: string;
  completedAt?: string;
}

interface TranscriptStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  totalDuration: number;
  totalSize: number;
  userCount: number;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'transcripts'>('requests')
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([])
  const [filter, setFilter] = useState<string>('pending')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [transcriptFilter, setTranscriptFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [transcriptSearchTerm, setTranscriptSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(false)
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [transcriptStats, setTranscriptStats] = useState<TranscriptStats>({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
    totalDuration: 0,
    totalSize: 0,
    userCount: 0
  })
  const { user, logout } = useAuth()
  const notification = useNotification()
  const router = useRouter()

  // Check if user is admin
  useEffect(() => {
    if (user && !user.is_admin) {
      notification.error('Access denied', 'Admin privileges required.')
      router.push('/')
      return
    }
    
    if (user && user.is_admin) {
      loadPendingUsers()
      loadExistingUsers()
      if (activeTab === 'transcripts') {
        loadAllTranscripts()
      }
    }
  }, [user, router, notification, activeTab])

  const loadPendingUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/access-requests')
      
      if (!response.ok) {
        throw new Error('Failed to fetch access requests')
      }
      
      const data = await response.json()
      setPendingUsers(data)
    } catch (error: any) {
      console.error('Load users error:', error)
      notification.error('Failed to load user requests')
      setPendingUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadExistingUsers = async () => {
    try {
      setIsLoadingUsers(true)
      const response = await fetch('/api/admin/users')
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      
      const data = await response.json()
      setExistingUsers(data)
    } catch (error: any) {
      console.error('Load existing users error:', error)
      notification.error('Failed to load users')
      setExistingUsers([])
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const loadAllTranscripts = async () => {
    try {
      setIsLoadingTranscripts(true)
      const response = await fetch('/api/admin/transcripts')
      
      if (!response.ok) {
        throw new Error('Failed to fetch transcripts')
      }
      
      const data = await response.json()
      setTranscripts(data.transcriptions)
      setTranscriptStats(data.stats)
    } catch (error: any) {
      console.error('Load transcripts error:', error)
      notification.error('Failed to load transcripts')
      setTranscripts([])
    } finally {
      setIsLoadingTranscripts(false)
    }
  }

  const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/toggle-admin?id=${userId}`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to toggle admin status')
      }
      
      const action = currentAdminStatus ? 'removed from' : 'promoted to'
      notification.success(`User ${action} admin successfully!`)
      loadExistingUsers() // Reload the list
    } catch (error: any) {
      console.error('Toggle admin error:', error)
      notification.error(error.message || 'Failed to toggle admin status')
    }
  }

  const handleApprove = async (requestId: number) => {
    try {
      const response = await fetch(`/api/admin/approve-request?id=${requestId}`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve request')
      }
      
      notification.success('User approved successfully!')
      loadPendingUsers() // Reload the list
    } catch (error: any) {
      console.error('Approve error:', error)
      notification.error(error.message || 'Failed to approve user')
    }
  }

  const handleReject = async (requestId: number) => {
    try {
      const response = await fetch(`/api/admin/reject-request?id=${requestId}`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reject request')
      }
      
      notification.success('User rejected')
      loadPendingUsers() // Reload the list
    } catch (error: any) {
      console.error('Reject error:', error)
      notification.error(error.message || 'Failed to reject user')
    }
  }

  const handleBack = () => {
    router.push('/')
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleViewTranscripts = () => {
    router.push('/transcripts')
  }

  const displayUsername = user ? `${user.full_name} (${user.email})` : ''

  return (
    <AdminContainer>
      <Header>
        <HeaderLeft>
          <BackButton onClick={handleBack}>
            <ArrowLeft size={16} />
          </BackButton>
          <HeaderTitle>
            <div className="title">Admin Dashboard</div>
            <div className="subtitle">Manage users and transcripts</div>
          </HeaderTitle>
        </HeaderLeft>
        <HeaderActions>
          <UserButton />
          
          <AuthButton $variant="primary" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </AuthButton>
        </HeaderActions>
      </Header>
      
      <MainContent>
        <TabButtons>
          <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')}>
            <Users size={16} />
            User Requests
          </TabButton>
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
            <UserCheck size={16} />
            Existing Users
          </TabButton>
          <TabButton active={activeTab === 'transcripts'} onClick={() => setActiveTab('transcripts')}>
            <FileText size={16} />
            Transcripts
          </TabButton>
        </TabButtons>
        
        {activeTab === 'requests' && (
          <>
            <SearchFilter>
              <div className="search-input">
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <Search className="search-icon" size={16} />
              </div>
              <div className="filter-buttons">
                <FilterButton active={filter === 'pending'} onClick={() => setFilter('pending')}>
                  Pending
                </FilterButton>
                <FilterButton active={filter === 'approved'} onClick={() => setFilter('approved')}>
                  Approved
                </FilterButton>
                <FilterButton active={filter === 'rejected'} onClick={() => setFilter('rejected')}>
                  Rejected
                </FilterButton>
              </div>
            </SearchFilter>
            
            {isLoading ? (
              <LoadingState>
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading requests...</div>
              </LoadingState>
            ) : (
              <>
                {pendingUsers.length === 0 ? (
                  <EmptyState>
                    <div className="empty-icon">
                      <Users size={48} />
                    </div>
                    <div className="empty-text">
                      No pending user requests found.
                    </div>
                  </EmptyState>
                ) : (
                  <UsersList>
                    {pendingUsers.filter(user => {
                      const matchesStatus = filter === 'all' || user.status === filter
                      const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) || user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
                      return matchesStatus && matchesSearch
                    }).map(user => (
                      <UserCard key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <UserHeader>
                          <div className="user-avatar">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="user-info">
                            <div className="user-name">{user.full_name}</div>
                            <div className="user-username">{user.email}</div>
                          </div>
                          <StatusBadge status={user.status}>
                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          </StatusBadge>
                        </UserHeader>
                        <ActionButtons>
                          <button className="approve" onClick={() => handleApprove(user.id)}>
                            <Check size={16} />
                            Approve
                          </button>
                          <button className="reject" onClick={() => handleReject(user.id)}>
                            <X size={16} />
                            Reject
                          </button>
                        </ActionButtons>
                      </UserCard>
                    ))}
                  </UsersList>
                )}
              </>
            )}
          </>
        )}
        
        {activeTab === 'users' && (
          <>
            <SearchFilter>
              <div className="search-input">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchTerm}
                  onChange={e => setUserSearchTerm(e.target.value)}
                />
                <Search className="search-icon" size={16} />
              </div>
              <div className="filter-buttons">
                <FilterButton active={userFilter === 'all'} onClick={() => setUserFilter('all')}>
                  All Users
                </FilterButton>
                <FilterButton active={userFilter === 'active'} onClick={() => setUserFilter('active')}>
                  Active
                </FilterButton>
                <FilterButton active={userFilter === 'inactive'} onClick={() => setUserFilter('inactive')}>
                  Inactive
                </FilterButton>
              </div>
            </SearchFilter>
            
            {isLoadingUsers ? (
              <LoadingState>
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading users...</div>
              </LoadingState>
            ) : (
              <>
                {existingUsers.length === 0 ? (
                  <EmptyState>
                    <div className="empty-icon">
                      <Users size={48} />
                    </div>
                    <div className="empty-text">
                      No users found.
                    </div>
                  </EmptyState>
                ) : (
                  <UsersList>
                    {existingUsers.filter(user => {
                      const matchesStatus = userFilter === 'all' || (userFilter === 'active' && user.is_active) || (userFilter === 'inactive' && !user.is_active)
                      const matchesSearch = user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) || user.full_name.toLowerCase().includes(userSearchTerm.toLowerCase())
                      return matchesStatus && matchesSearch
                    }).map(user => (
                      <UserCard key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <UserHeader>
                          <div className="user-avatar">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="user-info">
                            <div className="user-name">{user.full_name}</div>
                            <div className="user-username">{user.email}</div>
                          </div>
                          <AdminBadge isAdmin={user.is_admin}>
                            {user.is_admin ? 'Admin' : 'User'}
                          </AdminBadge>
                        </UserHeader>
                        <ActionButtons>
                          <button className="approve" onClick={() => handleToggleAdmin(user.id, user.is_admin)}>
                            {user.is_admin ? <UserX size={16} /> : <UserCheck size={16} />}
                            {user.is_admin ? 'Remove Admin' : 'Promote to Admin'}
                          </button>
                        </ActionButtons>
                      </UserCard>
                    ))}
                  </UsersList>
                )}
              </>
            )}
          </>
        )}
        
        {activeTab === 'transcripts' && (
          <>
            <StatsGrid>
              <StatCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0 }}
              >
                <div className="stat-label">Total Transcripts</div>
                <div className="stat-value">{transcriptStats.total}</div>
              </StatCard>
              
              <StatCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="stat-label">Completed</div>
                <div className="stat-value">{transcriptStats.completed}</div>
              </StatCard>
              
              <StatCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="stat-label">Processing</div>
                <div className="stat-value">{transcriptStats.processing}</div>
              </StatCard>

              <StatCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="stat-label">Active Users</div>
                <div className="stat-value">{transcriptStats.userCount}</div>
              </StatCard>
            </StatsGrid>

            <AdminPanel
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <PanelHeader>
                <div className="panel-title">
                  <FileText size={24} />
                  All User Transcripts ({transcripts.length})
                </div>

                <SearchFilter>
                  <div className="search-input">
                    <input
                      type="text"
                      placeholder="Search transcripts or users..."
                      value={transcriptSearchTerm}
                      onChange={e => setTranscriptSearchTerm(e.target.value)}
                    />
                    <Search className="search-icon" size={16} />
                  </div>
                  <div className="filter-buttons">
                    <FilterButton active={transcriptFilter === 'all'} onClick={() => setTranscriptFilter('all')}>
                      All
                    </FilterButton>
                    <FilterButton active={transcriptFilter === 'completed'} onClick={() => setTranscriptFilter('completed')}>
                      Completed
                    </FilterButton>
                    <FilterButton active={transcriptFilter === 'processing'} onClick={() => setTranscriptFilter('processing')}>
                      Processing
                    </FilterButton>
                    <FilterButton active={transcriptFilter === 'failed'} onClick={() => setTranscriptFilter('failed')}>
                      Failed
                    </FilterButton>
                  </div>
                </SearchFilter>
              </PanelHeader>
              
              {isLoadingTranscripts ? (
                <LoadingState>
                  <div className="loading-spinner"></div>
                  <div className="loading-text">Loading transcripts...</div>
                </LoadingState>
              ) : (
                <>
                  {transcripts.length === 0 ? (
                    <EmptyState>
                      <div className="empty-icon">
                        <FileText size={48} />
                      </div>
                      <div className="empty-text">
                        No transcripts found.
                      </div>
                    </EmptyState>
                  ) : (
                    <UsersList>
                      {transcripts.filter(transcript => {
                        const matchesStatus = transcriptFilter === 'all' || transcript.status === transcriptFilter
                        const matchesSearch = transcript.filename.toLowerCase().includes(transcriptSearchTerm.toLowerCase()) ||
                                            (transcript.username && transcript.username.toLowerCase().includes(transcriptSearchTerm.toLowerCase()))
                        return matchesStatus && matchesSearch
                      }).map(transcript => (
                        <UserCard key={transcript.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <UserHeader>
                            <div className="user-avatar">
                              {transcript.filename.includes('.mp4') || transcript.filename.includes('.avi') || transcript.filename.includes('.mov') ? 
                                <FileVideo size={24} /> : <FileAudio size={24} />
                              }
                            </div>
                            <div className="user-info">
                              <div className="user-name">{transcript.filename}</div>
                              <div className="user-username">User: {transcript.username || transcript.userId}</div>
                            </div>
                            <StatusBadge status={transcript.status}>
                              {transcript.status.charAt(0).toUpperCase() + transcript.status.slice(1)}
                            </StatusBadge>
                          </UserHeader>

                          <UserDetails>
                            <div className="detail-item">
                              <HardDrive className="icon" size={16} />
                              {transcript.fileSize ? `${(transcript.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'N/A'}
                            </div>
                            <div className="detail-item">
                              <Clock className="icon" size={16} />
                              {transcript.duration ? `${Math.floor(transcript.duration / 60)}m ${transcript.duration % 60}s` : 'Processing...'}
                            </div>
                            <div className="detail-item">
                              <User className="icon" size={16} />
                              {transcript.userId}
                            </div>
                            <div className="detail-item">
                              <Calendar className="icon" size={16} />
                              {new Date(transcript.createdAt).toLocaleDateString()}
                            </div>
                          </UserDetails>

                          <ActionButtons>
                            {transcript.hasTranscript && (
                              <button className="approve" onClick={() => {}}>
                                <Eye size={16} />
                                View Details
                              </button>
                            )}
                            <button className="delete" onClick={() => {}}>
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </ActionButtons>
                        </UserCard>
                      ))}
                    </UsersList>
                  )}
                </>
              )}
            </AdminPanel>
          </>
        )}
      </MainContent>
    </AdminContainer>
  )
}