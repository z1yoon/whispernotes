'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import {
  ArrowLeft,
  User,
  FileText,
  FileVideo,
  FileAudio,
  Clock,
  HardDrive,
  Calendar,
  Eye,
  Download,
  Search,
  Filter
} from 'lucide-react'
import { useNotification } from '@/components/NotificationProvider'
import { formatSingaporeDate } from '@/lib/date-utils'
import Link from 'next/link'

// Reuse styled components from admin page
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

const TranscriptsPanel = styled(motion.div)`
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
    background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
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

const TranscriptsList = styled.div`
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

const TranscriptCard = styled(motion.div)`
  padding: 2rem;
  border-bottom: 1px solid rgba(136, 80, 242, 0.1);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(136, 80, 242, 0.05);
  }
`;

const TranscriptHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  gap: 1rem;
  margin-bottom: 1.5rem;

  .transcript-avatar {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .transcript-info {
    flex: 1;

    .transcript-name {
      color: #FFFFFF;
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .transcript-session {
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
      case 'processing':
      case 'transcribing':
      case 'uploading':
        return `
          background: rgba(251, 191, 36, 0.1);
          color: #FCD34D;
          border-color: rgba(251, 191, 36, 0.3);
        `;
      case 'completed':
        return `
          background: rgba(34, 197, 94, 0.1);
          color: #4ADE80;
          border-color: rgba(34, 197, 94, 0.3);
        `;
      case 'failed':
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

const TranscriptDetails = styled.div`
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

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;

  a, button {
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

    &.view {
      background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
      color: white;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 25px rgba(124, 58, 237, 0.4);
      }
    }
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

interface Transcript {
  id: string;
  sessionId: string;
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
}

export default function UserTranscriptsPage() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [stats, setStats] = useState<TranscriptStats>({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
    totalDuration: 0,
    totalSize: 0
  })
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState<string>('')
  
  const { data: session } = useSession()
  const notification = useNotification()
  const router = useRouter()
  const params = useParams()
  const userId = params?.userId as string

  useEffect(() => {
    if (!userId) return
    loadUserTranscripts()
  }, [userId])

  const loadUserTranscripts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/user-transcripts/${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch user transcripts')
      }
      
      const data = await response.json()
      setTranscripts(data.transcriptions)
      setStats(data.stats)
      
      // Set user name from first transcript or fetch from users API
      if (data.transcriptions.length > 0) {
        setUserName(data.transcriptions[0].username)
      }
    } catch (error: any) {
      console.error('Load user transcripts error:', error)
      notification.error('Failed to load user transcripts')
      setTranscripts([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/admin')
  }

  // Helper functions
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Use centralized Singapore date formatting
  const formatDate = formatSingaporeDate;

  // Filter transcripts
  const filteredTranscripts = transcripts.filter(transcript => {
    const matchesSearch = transcript.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || transcript.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <AdminContainer>
      <Header>
        <HeaderLeft>
          <BackButton onClick={handleBack}>
            <ArrowLeft size={18} />
          </BackButton>
          <HeaderTitle>
            <div className="title">{userName ? `${userName}'s Transcripts` : 'User Transcripts'}</div>
            <div className="subtitle">{stats.total} total transcripts</div>
          </HeaderTitle>
        </HeaderLeft>
      </Header>

      <MainContent>
        <StatsGrid>
          {[
            { label: 'Total Transcripts', value: stats.total },
            { label: 'Completed', value: stats.completed },
            { label: 'Processing', value: stats.processing },
            { label: 'Failed', value: stats.failed }
          ].map((stat, index) => (
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

        <TranscriptsPanel
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <PanelHeader>
            <div className="panel-title">
              <FileText size={24} />
              Transcripts ({filteredTranscripts.length})
            </div>

            <SearchFilter>
              <div className="search-input">
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by filename..."
                />
              </div>

              <div className="filter-buttons">
                {['all', 'completed', 'processing', 'failed'].map((status) => (
                  <FilterButton
                    key={status}
                    active={filter === status}
                    onClick={() => setFilter(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </FilterButton>
                ))}
              </div>
            </SearchFilter>
          </PanelHeader>

          <TranscriptsList>
            {isLoading ? (
              <LoadingState>
                <div className="loading-spinner" />
                <div className="loading-text">Loading transcripts...</div>
              </LoadingState>
            ) : filteredTranscripts.length === 0 ? (
              <EmptyState>
                <FileText className="empty-icon" />
                <div className="empty-text">No transcripts found</div>
              </EmptyState>
            ) : (
              filteredTranscripts.map((transcript, index) => (
                <TranscriptCard
                  key={transcript.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <TranscriptHeader>
                    <div className="transcript-avatar">
                      {transcript.mimeType?.includes('video') ? (
                        <FileVideo size={20} />
                      ) : (
                        <FileAudio size={20} />
                      )}
                    </div>
                    <div className="transcript-info">
                      <div className="transcript-name">{transcript.filename}</div>
                      <div className="transcript-session">ID: {transcript.sessionId}</div>
                    </div>
                    <StatusBadge status={transcript.status}>
                      {transcript.status}
                    </StatusBadge>
                  </TranscriptHeader>

                  <TranscriptDetails>
                    <div className="detail-item">
                      <HardDrive className="icon" size={16} />
                      {formatFileSize(transcript.fileSize)}
                    </div>
                    {transcript.duration && (
                      <div className="detail-item">
                        <Clock className="icon" size={16} />
                        {formatDuration(transcript.duration)}
                      </div>
                    )}
                    <div className="detail-item">
                      <Calendar className="icon" size={16} />
                      {formatDate(transcript.createdAt)}
                    </div>
                  </TranscriptDetails>

                  {transcript.hasTranscript && (
                    <ActionButtons>
                      <Link href={`/transcript/${transcript.sessionId}`} className="view">
                        <Eye size={16} />
                        View Transcript
                      </Link>
                    </ActionButtons>
                  )}
                  
                  {/* Show progress bar for processing transcripts */}
                  {['processing', 'transcribing', 'uploading'].includes(transcript.status) && (
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
                          width: `${transcript.progress}%`,
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
                        <span>{transcript.status === 'processing' ? 'Processing audio...' : 
                              transcript.status === 'transcribing' ? 'Transcribing...' : 'Uploading...'}</span>
                        <span>{Math.round(transcript.progress)}%</span>
                      </div>
                    </div>
                  )}
                </TranscriptCard>
              ))
            )}
          </TranscriptsList>
        </TranscriptsPanel>
      </MainContent>
    </AdminContainer>
  )
}