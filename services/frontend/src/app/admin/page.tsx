'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import {
  Users,
  Check,
  X,
  Clock,
  Mail,
  FileText,
  LogOut,
  Shield,
  Search,
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
import { useNotification } from '@/components/NotificationProvider'
import Link from 'next/link'

// Modern styled components with better organization
const AdminContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(90deg, #09090A 0%, #181719 37%, #36343B 100%);
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
  background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: #FFFFFF;
  padding: 0.75rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  
  &:hover {
    background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #8B5CF6 100%);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
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

const UsernameButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: 'Roboto', sans-serif;
  font-weight: 600;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
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
  background: rgba(255, 255, 255, 0.1);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
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
    flex-wrap: wrap;
  }
`;

const FilterButton = styled.button<{ $active: boolean }>`
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s;
  border: 1px solid rgba(136, 80, 242, 0.3);
  cursor: pointer;
  
  ${props => props.$active ? `
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
  gap: 1rem;
  margin-bottom: 1.5rem;

  .user-avatar {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%);
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    flex-shrink: 0;
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .user-info {
    flex: 1;
    min-width: 0;
  }
`;

const ClickableUserName = styled.button`
  background: none;
  border: none;
  color: #FFFFFF;
  font-size: 1.125rem;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
  padding: 0;
  transition: all 0.2s ease;
  margin-bottom: 0.25rem;
  width: 100%;
  
  &:hover {
    color: #8850F2;
    text-decoration: underline;
  }
  
  &:focus {
    outline: 2px solid #8850F2;
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

const UserEmail = styled.div`
  color: #8D8D99;
  font-size: 0.875rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid;
  white-space: nowrap;
  
  ${props => {
    switch (props.$status) {
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
      case 'processing':
      case 'transcribing':
      case 'uploading':
        return `
          background: rgba(254, 240, 138, 0.1);
          color: #FDE047;
          border-color: rgba(254, 240, 138, 0.3);
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

const AdminBadge = styled.span<{ $isAdmin: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid;
  white-space: nowrap;
  
  ${props => props.$isAdmin ? `
    background: rgba(136, 80, 242, 0.1);
    color: #A855F7;
    border-color: rgba(136, 80, 242, 0.3);
  ` : `
    background: rgba(107, 114, 128, 0.1);
    color: #9CA3AF;
    border-color: rgba(107, 114, 128, 0.3);
  `}
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
      flex-shrink: 0;
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
  flex-wrap: wrap;

  button, a {
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
    text-decoration: none;
    white-space: nowrap;

    &.approve {
      background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: #FFFFFF;
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);

      &:hover {
        background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #8B5CF6 100%);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 8px 28px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
      }
    }

    &.reject {
      background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: #FFFFFF;
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);

      &:hover {
        background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #8B5CF6 100%);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 8px 28px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
      }
    }

    &.delete {
      background: linear-gradient(135deg, #EF4444 0%, #F87171 100%);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: #FFFFFF;
      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);

      &:hover {
        background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 8px 28px rgba(239, 68, 68, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
      }
    }

    &.view {
      background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: #FFFFFF;
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      
      svg {
        color: #FFFFFF;
        transition: all 0.2s ease;
      }

      &:hover {
        background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #8B5CF6 100%);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 8px 28px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        
        svg {
          transform: scale(1.1);
        }
      }
    }

    &.download {
      background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: #FFFFFF;
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      
      svg {
        color: #FFFFFF;
        transition: all 0.2s ease;
      }

      &:hover {
        background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #8B5CF6 100%);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 8px 28px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        
        svg {
          transform: scale(1.1);
        }
      }
    }

    &.admin-toggle {
      background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: #FFFFFF;
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      
      svg {
        color: #FFFFFF;
        transition: all 0.2s ease;
      }

      &:hover {
        background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 8px 28px rgba(245, 158, 11, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        
        svg {
          transform: scale(1.1);
        }
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

const TabButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 1rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  border: 1px solid rgba(136, 80, 242, 0.3);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  
  ${props => props.$active ? `
    background: linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%);
    color: #FFFFFF;
    border-color: #7C3AED;
  ` : `
    background: rgba(20, 20, 24, 0.5);
    color: #8D8D99;
    
    &:hover {
      background: rgba(136, 80, 242, 0.1);
      color: #FFFFFF;
    }
  `}
`;

const AdminButton = styled.button`
  padding: 0.625rem 1rem;
  border-radius: 8px;
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
  color: white;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 25px rgba(136, 80, 242, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DangerButton = styled.button`
  padding: 0.625rem 1rem;
  border-radius: 8px;
  background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  
  &:hover {
    background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #8B5CF6 100%);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 8px 25px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// Modern TypeScript interfaces with better typing
interface PendingUser {
  id: number
  email: string
  full_name: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
}

interface ExistingUser {
  id: string
  email: string
  full_name: string
  is_admin: boolean
  is_active: boolean
}

interface Transcript {
  id: string
  sessionId: string
  userId: string
  username: string
  filename: string
  fileSize: number
  mimeType: string
  status: string
  duration?: number
  progress: number
  hasTranscript: boolean
  createdAt: string
  completedAt?: string
}

interface TranscriptStats {
  total: number
  completed: number
  processing: number
  failed: number
  totalDuration: number
  totalSize: number
  userCount: number
}

type TabType = 'requests' | 'users' | 'transcripts'
type FilterType = 'all' | 'pending' | 'approved' | 'rejected' | 'admin' | 'user' | 'completed' | 'processing' | 'failed'

// Modern custom hooks for better code organization
const useAdminData = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([])
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
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(false)

  const notification = useNotification()

  const loadPendingUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/access-requests')
      
      if (!response.ok) throw new Error('Failed to fetch access requests')
      
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
      
      if (!response.ok) throw new Error('Failed to fetch users')
      
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
      
      if (!response.ok) throw new Error('Failed to fetch transcripts')
      
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

  return {
    pendingUsers,
    existingUsers,
    transcripts,
    transcriptStats,
    isLoading,
    isLoadingUsers,
    isLoadingTranscripts,
    loadPendingUsers,
    loadExistingUsers,
    loadAllTranscripts
  }
}

// Modern unified action handler
const useAdminActions = (reloadData: () => void) => {
  const notification = useNotification()

  const handleAccessRequest = async (requestId: number, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requestId })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${action} request`)
      }
      
      notification.success(`User ${action}d successfully!`)
      reloadData()
    } catch (error: any) {
      console.error(`${action} error:`, error)
      notification.error(error.message || `Failed to ${action} user`)
    }
  }

  const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/toggle-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, makeAdmin: !currentAdminStatus })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to toggle admin status')
      }
      
      const action = currentAdminStatus ? 'removed from' : 'promoted to'
      notification.success(`User ${action} admin successfully!`)
      reloadData()
    } catch (error: any) {
      console.error('Toggle admin error:', error)
      notification.error(error.message || 'Failed to toggle admin status')
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete "${userName}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        
        if (response.status === 401) {
          notification.error('Your session has expired. Please log in again.')
          return
        } else if (response.status === 403) {
          notification.error('You do not have permission to delete users.')
          return
        } else if (response.status === 404) {
          notification.error('The user you are trying to delete no longer exists.')
          reloadData()
          return
        }
        
        throw new Error(errorData.error || 'Failed to delete user')
      }
      
      notification.success(`${userName} has been deleted successfully.`)
      reloadData()
    } catch (error: any) {
      console.error('Delete user error:', error)
      notification.error(error.message || 'Failed to delete user')
    }
  }

  return {
    handleAccessRequest,
    handleToggleAdmin,
    handleDeleteUser,
    handleApprove: (id: number) => handleAccessRequest(id, 'approve'),
    handleReject: (id: number) => handleAccessRequest(id, 'reject')
  }
}

// Modern utility functions
const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false // Use 24-hour format for consistency
  })
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('requests')
  const [filters, setFilters] = useState({
    requests: 'pending' as FilterType,
    users: 'all' as FilterType,
    transcripts: 'all' as FilterType
  })
  const [searchTerms, setSearchTerms] = useState({
    requests: '',
    users: '',
    transcripts: ''
  })

  const { data: session, status } = useSession()
  const notification = useNotification()
  const router = useRouter()

  const {
    pendingUsers,
    existingUsers,
    transcripts,
    transcriptStats,
    isLoading,
    isLoadingUsers,
    isLoadingTranscripts,
    loadPendingUsers,
    loadExistingUsers,
    loadAllTranscripts
  } = useAdminData()

  const reloadCurrentTabData = () => {
    switch (activeTab) {
      case 'requests':
        loadPendingUsers()
        break
      case 'users':
        loadExistingUsers()
        break
      case 'transcripts':
        loadAllTranscripts()
        break
    }
  }

  const {
    handleApprove,
    handleReject,
    handleToggleAdmin,
    handleDeleteUser
  } = useAdminActions(reloadCurrentTabData)

  // Auth check
  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      notification.error('Access denied', 'Please log in to access admin panel.')
      router.push('/login')
      return
    }

    if (session.user?.role !== 'admin') {
      notification.error('Access denied', 'Admin privileges required.')
      router.push('/')
      return
    }

    loadPendingUsers()
    loadExistingUsers()
  }, [session, status, router, notification])

  // Load data when tab changes
  useEffect(() => {
    if (session?.user?.role === 'admin') {
      switch (activeTab) {
        case 'requests':
          loadPendingUsers()
          break
        case 'users':
          loadExistingUsers()
          break
        case 'transcripts':
          loadAllTranscripts()
          break
      }
    }
  }, [activeTab])

  // Modern filtering logic
  const getFilteredData = () => {
    const currentFilter = filters[activeTab]
    const currentSearch = searchTerms[activeTab]

    switch (activeTab) {
      case 'requests':
        return pendingUsers.filter(user => {
          const matchesFilter = currentFilter === 'all' || user.status === currentFilter
          const matchesSearch = user.full_name.toLowerCase().includes(currentSearch.toLowerCase()) ||
                               user.email.toLowerCase().includes(currentSearch.toLowerCase())
          return matchesFilter && matchesSearch
        })

      case 'users':
        return existingUsers.filter(user => {
          const matchesFilter = currentFilter === 'all' || 
                               (currentFilter === 'admin' && user.is_admin) ||
                               (currentFilter === 'user' && !user.is_admin)
          const matchesSearch = user.full_name.toLowerCase().includes(currentSearch.toLowerCase()) ||
                               user.email.toLowerCase().includes(currentSearch.toLowerCase())
          return matchesFilter && matchesSearch
        })

      case 'transcripts':
        return transcripts.filter(transcript => {
          const matchesFilter = currentFilter === 'all' || transcript.status === currentFilter
          const matchesSearch = transcript.filename.toLowerCase().includes(currentSearch.toLowerCase()) ||
                               transcript.username.toLowerCase().includes(currentSearch.toLowerCase())
          return matchesFilter && matchesSearch
        })

      default:
        return []
    }
  }

  const handleLogout = async () => {
    const { signOut } = await import('next-auth/react')
    await signOut({ callbackUrl: '/' })
  }

  const handleUsernameClick = () => {
    router.push('/transcripts')
  }

  const updateFilter = (filter: FilterType) => {
    setFilters(prev => ({ ...prev, [activeTab]: filter }))
  }

  const updateSearch = (search: string) => {
    setSearchTerms(prev => ({ ...prev, [activeTab]: search }))
  }

  // Loading state
  if (status === 'loading') {
    return (
      <AdminContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div style={{ color: '#FFFFFF' }}>Loading...</div>
        </div>
      </AdminContainer>
    )
  }

  // Auth check
  if (!session || session.user?.role !== 'admin') {
    return null
  }

  const filteredData = getFilteredData()
  const displayUsername = session?.user?.name || 'Admin'

  // Modern stats calculation
  const getStats = () => {
    switch (activeTab) {
      case 'requests':
        return [
          { label: 'Total Requests', value: pendingUsers.length },
          { label: 'Pending', value: pendingUsers.filter(u => u.status === 'pending').length },
          { label: 'Approved', value: pendingUsers.filter(u => u.status === 'approved').length },
          { label: 'Rejected', value: pendingUsers.filter(u => u.status === 'rejected').length }
        ]
      case 'users':
        return [
          { label: 'Total Users', value: existingUsers.length },
          { label: 'Administrators', value: existingUsers.filter(u => u.is_admin).length },
          { label: 'Regular Users', value: existingUsers.filter(u => !u.is_admin).length },
          { label: 'Active Users', value: existingUsers.filter(u => u.is_active).length }
        ]
      case 'transcripts':
        return [
          { label: 'Total Transcripts', value: transcriptStats.total },
          { label: 'Completed', value: transcriptStats.completed },
          { label: 'Processing', value: transcriptStats.processing },
          { label: 'Users', value: transcriptStats.userCount }
        ]
      default:
        return []
    }
  }

  const getFilterOptions = (): FilterType[] => {
    switch (activeTab) {
      case 'requests':
        return ['pending', 'approved', 'rejected', 'all']
      case 'users':
        return ['all', 'admin', 'user']
      case 'transcripts':
        return ['all', 'completed', 'processing', 'failed']
      default:
        return ['all']
    }
  }

  const getFilterLabel = (filter: FilterType): string => {
    switch (filter) {
      case 'admin': return 'Admins'
      case 'user': return 'Users'
      default: return filter.charAt(0).toUpperCase() + filter.slice(1)
    }
  }

  return (
    <AdminContainer>
      <Header>
        <HeaderLeft>
          <BackButton onClick={() => router.push('/')}>
            <ArrowLeft size={18} />
          </BackButton>
          <HeaderTitle>
            <div className="title">Admin Panel</div>
            <div className="subtitle">Manage Users & Access Requests</div>
          </HeaderTitle>
        </HeaderLeft>

        <HeaderActions>
          <UsernameButton onClick={handleUsernameClick}>
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
          {getStats().map((stat, index) => (
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
            $active={activeTab === 'requests'} 
            onClick={() => setActiveTab('requests')}
          >
            <Users size={20} />
            Access Requests
          </TabButton>
          <TabButton 
            $active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')}
          >
            <Settings size={20} />
            User Management
          </TabButton>
          <TabButton 
            $active={activeTab === 'transcripts'} 
            onClick={() => setActiveTab('transcripts')}
          >
            <FileText size={20} />
            All Transcripts
          </TabButton>
        </TabButtons>

        <AdminPanel
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <PanelHeader>
            <div className="panel-title">
              {activeTab === 'requests' && (
                <>
                  <Users size={24} />
                  User Requests ({filteredData.length})
                </>
              )}
              {activeTab === 'users' && (
                <>
                  <Settings size={24} />
                  Existing Users ({filteredData.length})
                </>
              )}
              {activeTab === 'transcripts' && (
                <>
                  <FileText size={24} />
                  All Transcripts ({filteredData.length})
                </>
              )}
            </div>

            <SearchFilter>
              <div className="search-input">
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  value={searchTerms[activeTab]}
                  onChange={(e) => updateSearch(e.target.value)}
                  placeholder={
                    activeTab === 'transcripts' ? 
                    "Search by filename or username..." :
                    "Search by name or email..."
                  }
                />
              </div>

              <div className="filter-buttons">
                {getFilterOptions().map((filter) => (
                  <FilterButton
                    key={filter}
                    $active={filters[activeTab] === filter}
                    onClick={() => updateFilter(filter)}
                  >
                    {getFilterLabel(filter)}
                  </FilterButton>
                ))}
              </div>
            </SearchFilter>
          </PanelHeader>

          <UsersList>
            {(activeTab === 'requests' ? isLoading : 
              activeTab === 'users' ? isLoadingUsers : 
              isLoadingTranscripts) ? (
              <LoadingState>
                <div className="loading-spinner" />
                <div className="loading-text">
                  Loading {activeTab === 'requests' ? 'user requests' : 
                           activeTab === 'users' ? 'users' : 'transcripts'}...
                </div>
              </LoadingState>
            ) : filteredData.length === 0 ? (
              <EmptyState>
                <Users className="empty-icon" />
                <div className="empty-text">
                  No {activeTab === 'requests' ? 'user requests' : 
                       activeTab === 'users' ? 'users' : 'transcripts'} found
                </div>
              </EmptyState>
            ) : (
              // Render based on active tab
              filteredData.map((item: any, index) => (
                <UserCard
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  {activeTab === 'requests' && (
                    <>
                      <UserHeader>
                        <div className="user-avatar">
                          <User size={20} />
                        </div>
                        <div className="user-info">
                          <div style={{ color: '#FFFFFF', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                            {item.full_name}
                          </div>
                          <UserEmail>{item.email}</UserEmail>
                        </div>
                        <StatusBadge $status={item.status}>
                          {item.status}
                        </StatusBadge>
                      </UserHeader>

                      <UserDetails>
                        <div className="detail-item">
                          <Mail className="icon" size={16} />
                          {item.email}
                        </div>
                        <div className="detail-item">
                          <Clock className="icon" size={16} />
                          {formatDate(item.requested_at)}
                        </div>
                      </UserDetails>

                      {item.reason && (
                        <PurposeSection>
                          <div className="purpose-label">
                            <FileText size={16} />
                            Purpose:
                          </div>
                          <div className="purpose-text">{item.reason}</div>
                        </PurposeSection>
                      )}

                      {item.status === 'pending' && (
                        <ActionButtons>
                          <button
                            className="approve"
                            onClick={() => handleApprove(item.id)}
                          >
                            <Check size={16} />
                            Approve
                          </button>
                          <button
                            className="reject"
                            onClick={() => handleReject(item.id)}
                          >
                            <X size={16} />
                            Reject
                          </button>
                        </ActionButtons>
                      )}
                    </>
                  )}

                  {activeTab === 'users' && (
                    <>
                      <UserHeader>
                        <div className="user-avatar">
                          {item.is_admin ? <Shield size={20} /> : <User size={20} />}
                        </div>
                        <div className="user-info">
                          <div style={{ color: '#FFFFFF', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                            {item.full_name}
                          </div>
                          <UserEmail>{item.email}</UserEmail>
                        </div>
                        <AdminBadge $isAdmin={item.is_admin}>
                          {item.is_admin ? 'Admin' : 'User'}
                        </AdminBadge>
                      </UserHeader>

                      <UserDetails>
                        <div className="detail-item">
                          <Mail className="icon" size={16} />
                          {item.email}
                        </div>
                        <div className="detail-item">
                          <div className="icon">
                            {item.is_active ? 
                              <UserCheck size={16} style={{ color: '#10B981' }} /> : 
                              <UserX size={16} style={{ color: '#EF4444' }} />
                            }
                          </div>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </UserDetails>

                      <ActionButtons>
                        {item.id !== session.user?.id && (
                          <>
                            <button
                              className="admin-toggle"
                              onClick={() => handleToggleAdmin(item.id, item.is_admin)}
                            >
                              {item.is_admin ? (
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
                              onClick={() => handleDeleteUser(item.id, item.full_name)}
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </>
                        )}
                      </ActionButtons>
                    </>
                  )}

                  {activeTab === 'transcripts' && (
                    <>
                      <UserHeader>
                        <div className="user-avatar">
                          {item.mimeType?.includes('video') ? (
                            <FileVideo size={20} />
                          ) : (
                            <FileAudio size={20} />
                          )}
                        </div>
                        <div className="user-info">
                          <div style={{ color: '#FFFFFF', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                            {item.filename}
                          </div>
                          <UserEmail>By: {item.username}</UserEmail>
                        </div>
                        <StatusBadge $status={item.status}>
                          {item.status}
                        </StatusBadge>
                      </UserHeader>

                      <UserDetails>
                        <div className="detail-item">
                          <HardDrive className="icon" size={16} />
                          {formatFileSize(item.fileSize)}
                        </div>
                        {item.duration && (
                          <div className="detail-item">
                            <Clock className="icon" size={16} />
                            {formatDuration(item.duration)}
                          </div>
                        )}
                        <div className="detail-item">
                          <Calendar className="icon" size={16} />
                          {formatDate(item.createdAt)}
                        </div>
                      </UserDetails>

                      {item.hasTranscript && (
                        <ActionButtons>
                          <Link href={`/transcript/${item.sessionId}`} className="view">
                            <Eye size={16} />
                            View Transcript
                          </Link>
                        </ActionButtons>
                      )}
                      
                      {['processing', 'transcribing', 'uploading'].includes(item.status) && (
                        <div style={{ marginTop: '1rem' }}>
                          <div style={{ 
                            width: '100%', 
                            height: '6px', 
                            background: 'rgba(30, 30, 34, 0.5)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${item.progress}%`,
                              background: 'linear-gradient(90deg, #8850F2 0%, #A855F7 100%)',
                              borderRadius: '3px',
                              transition: 'width 0.5s ease'
                            }}></div>
                          </div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            color: '#8D8D99',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            marginTop: '0.25rem'
                          }}>
                            <span>
                              {item.status === 'processing' ? 'Processing audio...' : 
                               item.status === 'transcribing' ? 'Transcribing...' : 'Uploading...'}
                            </span>
                            <span>{Math.round(item.progress)}%</span>
                          </div>
                        </div>
                      )}
                    </>
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