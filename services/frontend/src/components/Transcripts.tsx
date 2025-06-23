'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  FileVideo,
  FileAudio,
  Clock,
  Users,
  Download,
  Search,
  Filter,
  ArrowLeft,
  Shield,
  User,
  LogOut,
  Eye,
  Calendar,
  HardDrive,
  FileText
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useNotification } from './NotificationProvider';

// TypeScript interfaces
interface Transcription {
  id: string;
  sessionId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  participantCount: number;
  status: string;
  sessionStatus: string;
  progress: number;
  hasTranscript: boolean;
  transcriptData: any;
  createdAt: string;
  completedAt: string;
  duration: number;
  segmentCount: number;
  language: string;
  speakers: string[];
  diarizedSegments: any[];
}

interface TranscriptStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  totalDuration: number;
  totalSize: number;
}

// Styled components exactly matching admin page design
const TranscriptsContainer = styled.div`
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

const UsernameDisplay = styled.div`
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
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
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

const TranscriptionsList = styled.div`
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

const TranscriptionCard = styled(motion.div)`
  padding: 2rem;
  border-bottom: 1px solid rgba(136, 80, 242, 0.1);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(136, 80, 242, 0.05);
  }
`;

const TranscriptionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;

  .file-avatar {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .file-info {
    flex: 1;

    .file-name {
      color: #FFFFFF;
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .file-meta {
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
      case 'completed':
        return `
          background: rgba(34, 197, 94, 0.1);
          color: #4ADE80;
          border-color: rgba(34, 197, 94, 0.3);
        `;
      case 'processing':
      case 'transcribing':
      case 'uploading':
        return `
          background: rgba(251, 191, 36, 0.1);
          color: #FCD34D;
          border-color: rgba(251, 191, 36, 0.3);
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

const TranscriptionDetails = styled.div`
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

    &.view {
      background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
      color: white;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 25px rgba(136, 80, 242, 0.4);
      }
    }

    &.download {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
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
    margin-bottom: 2rem;
  }

  .upload-button {
    padding: 1rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1rem;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    color: white;
    transition: all 0.2s;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 25px rgba(136, 80, 242, 0.4);
    }
  }
`;

// Add progress components for processing files
const ProcessingIndicator = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(20, 20, 24, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(251, 191, 36, 0.3);
`;

const ProcessingHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;

  .processing-text {
    color: #FCD34D;
    font-size: 0.875rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .processing-percentage {
    color: #FFFFFF;
    font-size: 0.875rem;
    font-weight: 700;
  }
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressBar = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(90deg, #FCD34D 0%, #F59E0B 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
`;

const ProcessingSpinner = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid rgba(252, 211, 77, 0.3);
  border-top-color: #FCD34D;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const StatusMessage = styled.div`
  color: #8D8D99;
  font-size: 0.75rem;
  margin-top: 0.5rem;
  font-style: italic;
`;

const Transcripts = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const notification = useNotification();
  
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [stats, setStats] = useState<TranscriptStats>({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
    totalDuration: 0,
    totalSize: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before using router
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadTranscriptions();
      
      // Set up auto-refresh for processing files
      const interval = setInterval(() => {
        loadTranscriptions();
      }, 5000); // Refresh every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [mounted]);

  const loadTranscriptions = async () => {
    try {
      const response = await fetch('/api/transcripts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch transcripts');
      }
      
      const data = await response.json();
      setTranscriptions(data.transcriptions);
      setStats(data.stats);
    } catch (error: any) {
      console.error('Error loading transcripts:', error);
      notification?.error('Failed to load transcripts');
      setTranscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTranscriptions = transcriptions.filter(transcription => {
    const matchesSearch = transcription.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || transcription.status === filter;
    return matchesSearch && matchesFilter;
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewTranscript = (transcription: Transcription) => {
    if (transcription.hasTranscript) {
      router.push(`/transcript/${transcription.sessionId}`);
    } else {
      notification?.info('Transcription in progress', 'Please wait for the transcription to complete');
    }
  };

  const handleDownloadTranscript = (transcription: Transcription) => {
    if (transcription.hasTranscript) {
      // Create downloadable transcript file
      const transcriptText = transcription.diarizedSegments
        .map(segment => `[${segment.speaker}]: ${segment.text}`)
        .join('\n\n');
      
      const blob = new Blob([transcriptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${transcription.filename.replace(/\.[^/.]+$/, '')}_transcript.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      notification?.success('Download started', 'Transcript file is being downloaded');
    } else {
      notification?.warning('Transcript not ready', 'Please wait for transcription to complete');
    }
  };

  const handleAdminPage = () => {
    if (mounted && router) {
      router.push('/admin');
    }
  };

  const handleBack = () => {
    if (mounted && router) {
      router.push('/');
    }
  };

  const handleLogout = () => {
    logout();
    if (mounted && router) {
      router.push('/');
    }
  };

  // Don't render until mounted to avoid SSR issues
  if (!mounted) {
    return (
      <TranscriptsContainer>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: '#FFFFFF'
        }}>
          Loading...
        </div>
      </TranscriptsContainer>
    );
  }

  const displayUsername = user?.full_name || user?.username || 'User';
  const isAdmin = user?.role === 'admin' || user?.is_admin;

  return (
    <TranscriptsContainer>
      <Header>
        <HeaderLeft>
          <BackButton onClick={handleBack}>
            <ArrowLeft size={18} />
          </BackButton>
          <HeaderTitle>
            <div className="title">{isAdmin ? 'Admin' : 'Your Transcripts'}</div>
            <div className="subtitle">{isAdmin ? 'Manage System Transcripts' : 'View & Download Your Diarized Transcripts'}</div>
          </HeaderTitle>
        </HeaderLeft>
        <HeaderActions>
          <UsernameDisplay>
            {isAdmin ? <Shield size={12} /> : <User size={12} />}
            {displayUsername}
          </UsernameDisplay>
          
          {isAdmin && (
            <AuthButton $variant="secondary" onClick={handleAdminPage}>
              <Shield size={16} />
              Admin
            </AuthButton>
          )}
          
          <AuthButton $variant="primary" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </AuthButton>
        </HeaderActions>
      </Header>

      <MainContent>
        <StatsGrid>
          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0 }}
          >
            <div className="stat-label">Total Transcripts</div>
            <div className="stat-value">{stats.total}</div>
          </StatCard>
          
          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="stat-label">Completed</div>
            <div className="stat-value">{stats.completed}</div>
          </StatCard>
          
          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="stat-label">Processing</div>
            <div className="stat-value">{stats.processing}</div>
          </StatCard>

          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="stat-label">Total Duration</div>
            <div className="stat-value">{formatDuration(stats.totalDuration)}</div>
          </StatCard>
        </StatsGrid>

        <TranscriptsPanel
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <PanelHeader>
            <div className="panel-title">
              <FileText size={24} />
              Your Transcripts ({filteredTranscriptions.length})
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

          <TranscriptionsList>
            {loading ? (
              <LoadingState>
                <div className="loading-spinner" />
                <div className="loading-text">Loading your transcripts...</div>
              </LoadingState>
            ) : filteredTranscriptions.length === 0 ? (
              <EmptyState>
                <FileText className="empty-icon" />
                <div className="empty-text">
                  {transcriptions.length === 0 
                    ? "No transcripts found. Go back to the landing page to upload your first audio or video file!" 
                    : "No transcripts match your current filter"}
                </div>
                <button className="upload-button" onClick={handleBack}>
                  Back to Home
                </button>
              </EmptyState>
            ) : (
              filteredTranscriptions.map((transcription, index) => (
                <TranscriptionCard
                  key={transcription.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <TranscriptionHeader>
                    <div className="file-avatar">
                      {transcription.mimeType?.includes('video') ? (
                        <FileVideo size={20} />
                      ) : (
                        <FileAudio size={20} />
                      )}
                    </div>
                    <div className="file-info">
                      <div className="file-name">{transcription.filename}</div>
                      <div className="file-meta">{transcription.mimeType?.includes('video') ? 'Video File' : 'Audio File'}</div>
                    </div>
                    <StatusBadge status={transcription.status}>
                      {transcription.status}
                    </StatusBadge>
                  </TranscriptionHeader>

                  <TranscriptionDetails>
                    <div className="detail-item">
                      <HardDrive className="icon" size={16} />
                      {formatFileSize(transcription.fileSize)}
                    </div>
                    <div className="detail-item">
                      <Clock className="icon" size={16} />
                      {transcription.duration ? formatDuration(transcription.duration) : 'Processing...'}
                    </div>
                    <div className="detail-item">
                      <Users className="icon" size={16} />
                      {transcription.participantCount} speakers
                    </div>
                    <div className="detail-item">
                      <Calendar className="icon" size={16} />
                      {formatDate(transcription.createdAt)}
                    </div>
                  </TranscriptionDetails>

                  {transcription.hasTranscript && (
                    <ActionButtons>
                      <button 
                        className="view"
                        onClick={() => handleViewTranscript(transcription)}
                      >
                        <Eye size={16} />
                        View Transcript
                      </button>
                      <button 
                        className="download"
                        onClick={() => handleDownloadTranscript(transcription)}
                      >
                        <Download size={16} />
                        Download
                      </button>
                    </ActionButtons>
                  )}

                  {transcription.status === 'processing' && (
                    <ProcessingIndicator>
                      <ProcessingHeader>
                        <div className="processing-text">
                          <ProcessingSpinner />
                          Processing
                        </div>
                        <div className="processing-percentage">
                          {transcription.progress}%
                        </div>
                      </ProcessingHeader>
                      <ProgressBarContainer>
                        <ProgressBar $progress={transcription.progress} />
                      </ProgressBarContainer>
                      <StatusMessage>
                        Your file is being processed. This may take a few minutes.
                      </StatusMessage>
                    </ProcessingIndicator>
                  )}
                </TranscriptionCard>
              ))
            )}
          </TranscriptionsList>
        </TranscriptsPanel>
      </MainContent>
    </TranscriptsContainer>
  );
};

export default Transcripts;