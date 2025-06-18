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
  Trash2
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { useNotification } from '@/components/NotificationProvider'

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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'users'>('requests')
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([])
  const [filter, setFilter] = useState<string>('pending')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
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
    }
  }, [user, router, notification])

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

  const handleDeleteUser = async (userId: string) => {
    // Confirmation before deletion
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }
    
    try {
      const userToDelete = existingUsers.find(u => u.id === userId);
      if (!userToDelete) {
        notification.error('Error', 'User not found');
        return;
      }

      console.log('Deleting user:', userToDelete.email);
      const response = await fetch(`/api/admin/delete-user?id=${userId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete user error response:', errorData);
        
        // Handle specific error cases
        if (response.status === 401) {
          notification.error('Authentication Error', 'Your session has expired. Please log in again.');
          logout();
          router.push('/login');
          return;
        } else if (response.status === 403) {
          notification.error('Permission Denied', 'You do not have permission to delete users.');
          return;
        } else if (response.status === 404) {
          notification.error('User Not Found', 'The user you are trying to delete no longer exists.');
          loadExistingUsers(); // Refresh the list
          return;
        }
        
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      notification.success('User Deleted', `${userToDelete.full_name} has been deleted successfully.`);
      loadExistingUsers(); // Reload the list
    } catch (error: any) {
      console.error('Delete user error:', error);
      notification.error('Delete Failed', error.message || 'Failed to delete user');
    }
  }

  const filteredUsers = pendingUsers.filter(user => {
    const matchesFilter = filter === 'all' || user.status === filter
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const filteredExistingUsers = existingUsers.filter(user => {
    const matchesFilter = userFilter === 'all' || 
                         (userFilter === 'admin' && user.is_admin) ||
                         (userFilter === 'user' && !user.is_admin)
    const matchesSearch = user.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const stats = {
    total: pendingUsers.length,
    pending: pendingUsers.filter(u => u.status === 'pending').length,
    approved: pendingUsers.filter(u => u.status === 'approved').length,
    rejected: pendingUsers.filter(u => u.status === 'rejected').length,
    totalUsers: existingUsers.length,
    admins: existingUsers.filter(u => u.is_admin).length,
    regularUsers: existingUsers.filter(u => !u.is_admin).length
  }

  // Get display username from user data (removed environment variable fallback)
  const displayUsername = user?.full_name || user?.username || 'Admin';

  if (!user || !user.is_admin) {
    return null
  }

  return (
    <AdminContainer>
      <Header>
        <HeaderLeft>
          <BackButton onClick={handleBack}>
            <ArrowLeft size={18} />
          </BackButton>
          <HeaderTitle>
            <div className="title">Admin Panel</div>
            <div className="subtitle">Manage Users & Access Requests</div>
          </HeaderTitle>
        </HeaderLeft>

        <HeaderActions>
          <UsernameButton>
            <Shield size={12} />
            {displayUsername}
          </UsernameButton>
          
          <AuthButton $variant="primary" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </AuthButton>
        </HeaderActions>
      </Header>

      <MainContent>
        <StatsGrid>
          {(activeTab === 'requests' ? [
            { label: 'Total Requests', value: stats.total },
            { label: 'Pending', value: stats.pending },
            { label: 'Approved', value: stats.approved },
            { label: 'Rejected', value: stats.rejected }
          ] : [
            { label: 'Total Users', value: stats.totalUsers },
            { label: 'Administrators', value: stats.admins },
            { label: 'Regular Users', value: stats.regularUsers },
            { label: 'Active Users', value: stats.totalUsers }
          ]).map((stat, index) => (
            <StatCard
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
            </StatCard>
          ))}
        </StatsGrid>

        <TabButtons>
          <TabButton 
            active={activeTab === 'requests'} 
            onClick={() => setActiveTab('requests')}
          >
            <Users size={20} />
            Access Requests
          </TabButton>
          <TabButton 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')}
          >
            <Settings size={20} />
            User Management
          </TabButton>
        </TabButtons>

        <AdminPanel
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <PanelHeader>
            <div className="panel-title">
              {activeTab === 'requests' ? (
                <>
                  <Users size={24} />
                  User Requests ({filteredUsers.length})
                </>
              ) : (
                <>
                  <Settings size={24} />
                  Existing Users ({filteredExistingUsers.length})
                </>
              )}
            </div>

            <SearchFilter>
              <div className="search-input">
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  value={activeTab === 'requests' ? searchTerm : userSearchTerm}
                  onChange={(e) => activeTab === 'requests' ? 
                    setSearchTerm(e.target.value) : 
                    setUserSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                />
              </div>

              <div className="filter-buttons">
                {activeTab === 'requests' ? 
                  ['pending', 'approved', 'rejected', 'all'].map((status) => (
                    <FilterButton
                      key={status}
                      active={filter === status}
                      onClick={() => setFilter(status)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </FilterButton>
                  )) :
                  ['all', 'admin', 'user'].map((status) => (
                    <FilterButton
                      key={status}
                      active={userFilter === status}
                      onClick={() => setUserFilter(status)}
                    >
                      {status === 'admin' ? 'Admins' : 
                       status === 'user' ? 'Users' : 'All'}
                    </FilterButton>
                  ))
                }
              </div>
            </SearchFilter>
          </PanelHeader>

          <UsersList>
            {(activeTab === 'requests' ? isLoading : isLoadingUsers) ? (
              <LoadingState>
                <div className="loading-spinner" />
                <div className="loading-text">
                  Loading {activeTab === 'requests' ? 'user requests' : 'users'}...
                </div>
              </LoadingState>
            ) : (activeTab === 'requests' ? filteredUsers : filteredExistingUsers).length === 0 ? (
              <EmptyState>
                <Users className="empty-icon" />
                <div className="empty-text">
                  No {activeTab === 'requests' ? 'user requests' : 'users'} found
                </div>
              </EmptyState>
            ) : activeTab === 'requests' ? (
              // Existing access requests rendering
              filteredUsers.map((user, index) => (
                <UserCard
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <UserHeader>
                    <div className="user-avatar">
                      <User size={20} />
                    </div>
                    <div className="user-info">
                      <div className="user-name">{user.full_name}</div>
                      <div className="user-username">{user.email}</div>
                    </div>
                    <StatusBadge status={user.status}>
                      {user.status}
                    </StatusBadge>
                  </UserHeader>

                  <UserDetails>
                    <div className="detail-item">
                      <Mail className="icon" size={16} />
                      {user.email}
                    </div>
                    <div className="detail-item">
                      <Clock className="icon" size={16} />
                      {new Date(user.requested_at).toLocaleDateString()}
                    </div>
                  </UserDetails>

                  {user.reason && (
                    <PurposeSection>
                      <div className="purpose-label">
                        <FileText size={16} />
                        Purpose:
                      </div>
                      <div className="purpose-text">{user.reason}</div>
                    </PurposeSection>
                  )}

                  {user.status === 'pending' && (
                    <ActionButtons>
                      <button
                        className="approve"
                        onClick={() => handleApprove(user.id)}
                      >
                        <Check size={16} />
                        Approve
                      </button>
                      <button
                        className="reject"
                        onClick={() => handleReject(user.id)}
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </ActionButtons>
                  )}
                </UserCard>
              ))
            ) : (
              // New existing users rendering
              filteredExistingUsers.map((existingUser, index) => (
                <UserCard
                  key={existingUser.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <UserHeader>
                    <div className="user-avatar">
                      {existingUser.is_admin ? <Shield size={20} /> : <User size={20} />}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{existingUser.full_name}</div>
                      <div className="user-username">{existingUser.email}</div>
                    </div>
                    <AdminBadge isAdmin={existingUser.is_admin}>
                      {existingUser.is_admin ? 'Admin' : 'User'}
                    </AdminBadge>
                  </UserHeader>

                  <UserDetails>
                    <div className="detail-item">
                      <Mail className="icon" size={16} />
                      {existingUser.email}
                    </div>
                    <div className="detail-item">
                      <div className="icon">
                        {existingUser.is_active ? 
                          <UserCheck size={16} style={{ color: '#10B981' }} /> : 
                          <UserX size={16} style={{ color: '#EF4444' }} />
                        }
                      </div>
                      {existingUser.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </UserDetails>

                  {existingUser.id !== user?.id && (
                    <ActionButtons>
                      <button
                        className={existingUser.is_admin ? "reject" : "approve"}
                        onClick={() => handleToggleAdmin(existingUser.id, existingUser.is_admin)}
                      >
                        {existingUser.is_admin ? (
                          <>
                            <UserX size={16} />
                            Remove Admin
                          </>
                        ) : (
                          <>
                            <UserCheck size={16} />
                            Make Admin
                          </>
                        )}
                      </button>

                      <button
                        className="delete"
                        onClick={() => handleDeleteUser(existingUser.id)}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </ActionButtons>
                  )}
                </UserCard>
              ))
            )}
          </UsersList>
        </AdminPanel>
      </MainContent>
    </AdminContainer>
  )
}