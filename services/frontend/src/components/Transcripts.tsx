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
  FileText,
  Trash2
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useNotification } from './NotificationProvider';
import { useProgressUpdates } from '../hooks/useProgressUpdates';

// TypeScript interfaces
interface Transcription {
  id: string;
  sessionId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  participantCount: number;
  status: string;
  progress: number;
  hasTranscript: boolean;
  transcriptData: any;
  createdAt: string;
  completedAt: string;
  duration: number;
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
  cursor: pointer;
  
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
    background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #D946EF 100%);
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
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

const statusColors = {
  completed: { bg: 'rgba(139, 92, 246, 0.1)', color: '#A855F7', border: 'rgba(139, 92, 246, 0.3)' },
  processing: { bg: 'rgba(168, 85, 247, 0.1)', color: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' },
  transcribing: { bg: 'rgba(168, 85, 247, 0.1)', color: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' },
  uploading: { bg: 'rgba(124, 58, 237, 0.1)', color: '#8B5CF6', border: 'rgba(124, 58, 237, 0.3)' },
  failed: { bg: 'rgba(239, 68, 68, 0.1)', color: '#F87171', border: 'rgba(239, 68, 68, 0.3)' },
  default: { bg: 'rgba(139, 92, 246, 0.1)', color: '#A855F7', border: 'rgba(139, 92, 246, 0.3)' }
};

const StatusBadge = styled.span<{ status: string }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid;
  
  ${props => {
    const colors = statusColors[props.status as keyof typeof statusColors] || statusColors.default;
    return `
      background: ${colors.bg};
      color: ${colors.color};
      border-color: ${colors.border};
    `;
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

const ViewButton = styled.button`
  padding: 0.625rem 1rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: #FFFFFF;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  
  svg {
    color: #FFFFFF;
    transition: all 0.2s ease;
  }
  
  &:hover {
    background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(59, 130, 246, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
    
    svg {
      transform: scale(1.1);
    }
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const DownloadButton = styled.button`
  padding: 0.625rem 1rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: #FFFFFF;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  
  svg {
    color: #FFFFFF;
    transition: all 0.2s ease;
  }
  
  &:hover {
    background: linear-gradient(135deg, #059669 0%, #10B981 100%);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(16, 185, 129, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
    
    svg {
      transform: scale(1.1);
    }
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const DeleteButton = styled.button`
  padding: 0.625rem 1rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #EF4444 0%, #F87171 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: #FFFFFF;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  
  svg {
    color: #FFFFFF;
    transition: all 0.2s ease;
  }
  
  &:hover {
    background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(239, 68, 68, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
    
    svg {
      transform: scale(1.1);
    }
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
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
    border: 2px solid rgba(255, 255, 255, 0.3);
    cursor: pointer;
    background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
    color: white;
    transition: all 0.2s;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    
    &:hover {
      background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #8B5CF6 100%);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-1px);
      box-shadow: 0 8px 25px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
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
  background: linear-gradient(90deg, #FDE047 0%, #FACC15 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
`;

const ProcessingSpinner = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid rgba(253, 224, 71, 0.3);
  border-top-color: #FDE047;
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
  const { data: session } = useSession();
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

  // Get session IDs for processing files to enable real-time progress updates
  // Include files that are uploading, processing, or transcribing
  const processingSessions = transcriptions
    .filter(t => ['uploading', 'processing', 'transcribing'].includes(t.status))
    .map(t => t.sessionId);
  
  const { getProgress, isProcessing, getDetailedStatus } = useProgressUpdates(processingSessions);

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
    // Use Singapore timezone (UTC+8)
    const date = new Date(dateString);
    return date.toLocaleDateString('en-SG', {
      timeZone: 'Asia/Singapore',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // Use 24-hour format
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

  const handleDeleteTranscript = async (transcription: Transcription) => {
    if (!window.confirm(`Are you sure you want to delete "${transcription.filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/transcripts/${transcription.sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transcript');
      }

      // Remove from local state
      setTranscriptions(prev => prev.filter(t => t.sessionId !== transcription.sessionId));
      
      // Update stats
      const newTranscriptions = transcriptions.filter(t => t.sessionId !== transcription.sessionId);
      setStats({
        total: newTranscriptions.length,
        completed: newTranscriptions.filter((t: Transcription) => t.status === 'completed').length,
        processing: newTranscriptions.filter((t: Transcription) => ['processing', 'transcribing', 'uploading', 'analyzing', 'pending'].includes(t.status)).length,
        failed: newTranscriptions.filter((t: Transcription) => t.status === 'failed').length,
        totalDuration: newTranscriptions.reduce((acc: number, t: Transcription) => acc + (t.duration || 0), 0),
        totalSize: newTranscriptions.reduce((acc: number, t: Transcription) => acc + (t.fileSize || 0), 0)
      });

      notification?.success('Transcript deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      notification?.error('Failed to delete transcript');
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
    signOut({ callbackUrl: '/' });
  };

  // Helper function to get progress messages
  const getProgressText = (sessionId: string, status: string, isShort: boolean = false): string => {
    const progress = getProgress(sessionId);
    const message = progress?.message;
    
    // Check for multipart upload progress
    if (message) {
      const partMatch = message.match(/(\d+)\/(\d+)/);
      if (partMatch) {
        return isShort ? `Uploading part ${partMatch[1]}/${partMatch[2]}` : `Uploading part ${partMatch[1]}/${partMatch[2]} to storage...`;
      }
      
      // Use backend message if available and not short format
      if (!isShort && message.trim()) {
        return message;
      }
    }
    
    // Status-based fallbacks
    const statusMessages = {
      uploading: isShort ? 'Uploading file' : 'Uploading large file in chunks to secure storage...',
      processing: isShort ? 'Processing video' : 'Processing video and extracting audio for transcription...',
      transcribing: isShort ? 'Transcribing audio' : 'Transcribing audio with speaker identification using WhisperX...',
      default: isShort ? 'Processing' : 'Processing your file...'
    };
    
    return statusMessages[status as keyof typeof statusMessages] || statusMessages.default;
  };

  // Helper function to get consistent, non-decreasing progress value
  const getConsistentProgress = (sessionId: string, fallbackProgress: number): number => {
    const realtimeProgress = getProgress(sessionId);
    const dbProgress = fallbackProgress || 0;
    
    // If we have real-time progress, use the higher of the two values
    if (realtimeProgress && typeof realtimeProgress.progress === 'number') {
      return Math.max(realtimeProgress.progress, dbProgress);
    }
    
    // Fall back to database progress
    return dbProgress;
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

  const displayUsername = session?.user?.name || session?.user?.email || 'User';
  const isAdmin = session?.user?.role === 'admin';

  return (
    <TranscriptsContainer>
      <Header>
        <HeaderLeft>
          <BackButton onClick={handleBack}>
            <ArrowLeft size={18} />
          </BackButton>
          <HeaderTitle>
            <div className="title">Transcripts</div>
            <div className="subtitle">{isAdmin ? 'Manage All System Transcripts' : 'View & Download Your Diarized Transcripts'}</div>
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
              My Transcripts ({filteredTranscriptions.length})
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
                      <ViewButton
                        onClick={() => handleViewTranscript(transcription)}
                      >
                        <Eye size={16} />
                        View Transcript
                      </ViewButton>
                      <DownloadButton 
                        onClick={() => handleDownloadTranscript(transcription)}
                      >
                        <Download size={16} />
                        Download
                      </DownloadButton>
                      <DeleteButton 
                        onClick={() => handleDeleteTranscript(transcription)}
                      >
                        <Trash2 size={16} />
                        Delete
                      </DeleteButton>
                    </ActionButtons>
                  )}

                  {(['uploading', 'processing', 'transcribing'].includes(transcription.status) || isProcessing(transcription.sessionId)) && (
                    <ProcessingIndicator>
                      <ProcessingHeader>
                        <div className="processing-text">
                          <ProcessingSpinner />
                          {getProgressText(transcription.sessionId, transcription.status, true)}
                        </div>
                        <div className="processing-percentage">
                          {Math.round(getConsistentProgress(transcription.sessionId, transcription.progress))}%
                        </div>
                      </ProcessingHeader>
                      <ProgressBarContainer>
                        <ProgressBar $progress={getConsistentProgress(transcription.sessionId, transcription.progress)} />
                      </ProgressBarContainer>
                      <StatusMessage>
                        {getProgressText(transcription.sessionId, transcription.status, false)}
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