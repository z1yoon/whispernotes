'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Share2,
  Clock,
  Users,
  CheckSquare,
  AlertTriangle,
  Copy,
  Check,
  User,
  Edit,
  Save,
  X,
  Settings,
  UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';

// TypeScript interfaces
interface ActionButtonProps {
  primary?: boolean;
}

interface SpeakerAvatarProps {
  speaker: string;
}

interface PriorityBadgeProps {
  priority: string;
}

interface TranscriptData {
  filename: string;
  duration: number;
  participant_count: number;
  language: string;
  segments: TranscriptSegment[];
}

interface TranscriptSegment {
  id: number;
  speaker: string;
  speaker_name: string;
  start: number;
  end: number;
  text: string;
}

interface ActionItem {
  id: number;
  task: string;
  assignee: string;
  deadline: string;
  priority: string;
  source_time: string;
  completed: boolean;
}

interface SpeakerMap {
  [key: string]: string;
}

// Styled components with proper typing
const TranscriptContainer = styled.div`
  min-height: 100vh;
  background: #f8fafc;
`;

const Header = styled.div`
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 1rem 2rem;
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
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f8fafc;
    color: #1e293b;
  }
`;

const HeaderTitle = styled.h1`
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const ActionButton = styled.button<ActionButtonProps>`
  background: ${props => props.primary ? 
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
    'white'
  };
  border: 1px solid ${props => props.primary ? 
    'transparent' : 
    '#e2e8f0'
  };
  border-radius: 8px;
  color: ${props => props.primary ? 'white' : '#64748b'};
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.primary ? 
      'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)' : 
      '#f8fafc'
    };
  }
`;

const MainContent = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const TranscriptSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Card = styled(motion.div)`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2rem;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  
  h3 {
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const MetadataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const MetadataItem = styled.div`
  text-align: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  
  .icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 0.5rem;
  }
  
  .value {
    color: #1e293b;
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
  }
  
  .label {
    color: #64748b;
    font-size: 0.875rem;
    margin: 0;
  }
`;

const TranscriptContent = styled.div`
  max-height: 600px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`;

const TranscriptSegment = styled.div`
  padding: 1.5rem 0;
  border-bottom: 1px solid #f1f5f9;
  
  &:last-child {
    border-bottom: none;
  }
`;

const SpeakerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const SpeakerAvatar = styled.div<SpeakerAvatarProps>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: ${props => {
    const colors = ['#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
    const speakerNum = parseInt(props.speaker.replace('SPEAKER_', '')) || 0;
    return colors[speakerNum % colors.length];
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
`;

const SpeakerDetails = styled.div`
  flex: 1;
  
  .name {
    color: #1e293b;
    font-weight: 600;
    font-size: 0.875rem;
    margin: 0 0 0.25rem 0;
  }
  
  .time {
    color: #64748b;
    font-size: 0.75rem;
    margin: 0;
  }
`;

const TranscriptText = styled.p`
  color: #374151;
  line-height: 1.6;
  margin: 0;
  padding-left: 3rem;
  font-size: 0.95rem;
`;

const ActionItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ActionItem = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  
  .task {
    color: #1e293b;
    font-size: 0.875rem;
    font-weight: 500;
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
  }
  
  .meta {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: #64748b;
  }
`;

const PriorityBadge = styled.span<PriorityBadgeProps>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.priority?.toLowerCase()) {
      case 'high': return '#fef2f2';
      case 'medium': return '#fefce8';
      case 'low': return '#f0fdf4';
      default: return '#f8fafc';
    }
  }};
  color: ${props => {
    switch (props.priority?.toLowerCase()) {
      case 'high': return '#dc2626';
      case 'medium': return '#ca8a04';
      case 'low': return '#16a34a';
      default: return '#64748b';
    }
  }};
  border: 1px solid ${props => {
    switch (props.priority?.toLowerCase()) {
      case 'high': return '#fecaca';
      case 'medium': return '#fde047';
      case 'low': return '#bbf7d0';
      default: return '#e2e8f0';
    }
  }};
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #64748b;
  
  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid #e2e8f0;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const CopyButton = styled.button`
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
  
  &:hover {
    background: #f1f5f9;
    color: #1e293b;
  }
`;

const FloatingButton = styled(motion.button)`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  z-index: 100;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
  }
`;

const DialogOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const DialogContent = styled(motion.div)`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
`;

const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  
  h2 {
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
`;

const SpeakerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SpeakerItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
`;

const SpeakerLabel = styled.div`
  width: 100px;
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
`;

const SpeakerInput = styled.input`
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #1e293b;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
  }
`;

const StyledActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.variant === 'primary' ? `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    
    &:hover {
      opacity: 0.9;
    }
  ` : `
    background: white;
    color: #64748b;
    border: 1px solid #e2e8f0;
    
    &:hover {
      background: #f8fafc;
      color: #1e293b;
    }
  `}
`;

const TooltipText = styled.div`
  position: absolute;
  bottom: 100%;
  right: 0;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
`;

const TooltipWrapper = styled.div`
  position: relative;
  
  &:hover ${TooltipText} {
    opacity: 1;
  }
`;

const TranscriptPage = () => {
  const router = useRouter();
  const params = useParams();
  const fileId = params?.fileId;
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSegment, setCopiedSegment] = useState<number | null>(null);
  const [showSpeakerEditor, setShowSpeakerEditor] = useState(false);
  const [speakerMap, setSpeakerMap] = useState<SpeakerMap>({});
  const [originalSpeakerMap, setOriginalSpeakerMap] = useState<SpeakerMap>({});

  useEffect(() => {
    if (fileId) {
      fetchTranscriptData();
    }
  }, [fileId]);

  // Generate speaker map from transcript segments
  useEffect(() => {
    if (transcriptData?.segments) {
      const uniqueSpeakers = new Set<string>();
      const tempSpeakerMap: SpeakerMap = {};
      
      // Collect unique speakers
      transcriptData.segments.forEach(segment => {
        uniqueSpeakers.add(segment.speaker);
      });
      
      // Create initial speaker map
      uniqueSpeakers.forEach(speaker => {
        // Find the first segment with this speaker to get the speaker_name
        const segment = transcriptData.segments.find(seg => seg.speaker === speaker);
        tempSpeakerMap[speaker] = segment?.speaker_name || speaker;
      });
      
      setSpeakerMap(tempSpeakerMap);
      setOriginalSpeakerMap({...tempSpeakerMap});
    }
  }, [transcriptData]);

  const fetchTranscriptData = async () => {
    try {
      setLoading(true);
      
      // Fetch transcription data from API
      const response = await fetch(`/api/transcripts/${fileId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load transcript');
      }
      
      const data = await response.json();
      
      // Check if we have proper segment data
      if (!data.segments || !Array.isArray(data.segments) || data.segments.length === 0) {
        setError('No transcript segments found');
        setLoading(false);
        return;
      }
      
      // Format data for our UI if needed
      const formattedData = {
        filename: data.filename || `Transcription ${fileId}`,
        duration: data.duration || 0,
        participant_count: data.participant_count || 
          (data.speaker_names ? data.speaker_names.length : 2),
        language: data.language || 'en',
        // Map segments to our expected format if needed
        segments: data.segments.map((segment: any, index: number) => ({
          id: segment.id || index + 1,
          speaker: segment.speaker || `SPEAKER_${index % 2}`,
          speaker_name: segment.speaker_name || segment.speaker || `Speaker ${index % 2 + 1}`,
          start: segment.start || 0,
          end: segment.end || 0,
          text: segment.text || ''
        }))
      };
      
      setTranscriptData(formattedData);
      
      // For now, use default action items since we don't have LLM analysis endpoint yet
      setActionItems([
        {
          id: 1,
          task: "Review transcript for accuracy",
          assignee: "Current User",
          deadline: "Today",
          priority: "Medium",
          source_time: "0-10s",
          completed: false
        },
        {
          id: 2,
          task: "Update speaker names if necessary",
          assignee: "Current User",
          deadline: "Today",
          priority: "Low",
          source_time: "entire transcript",
          completed: false
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      setError(error instanceof Error ? error.message : 'Failed to load transcript data');
      setLoading(false);
      toast.error('Failed to load transcript');
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleDownload = () => {
    toast.success('Download started');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: transcriptData?.filename || 'Meeting Transcript',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const copySegmentText = async (text: string, segmentId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSegment(segmentId);
      toast.success('Text copied to clipboard');
      setTimeout(() => setCopiedSegment(null), 2000);
    } catch (error) {
      toast.error('Failed to copy text');
    }
  };

  const getSpeakerInitials = (speakerName: string): string => {
    if (speakerName && speakerName.includes('(')) {
      return speakerName.split('(')[0].trim().split(' ').map((n: string) => n[0]).join('');
    }
    return speakerName?.split(' ').map((n: string) => n[0]).join('') || 'S';
  };

  const handleUpdateSpeakerNames = async () => {
    try {
      // Check if there are any changes
      const hasChanges = Object.keys(speakerMap).some(
        key => speakerMap[key] !== originalSpeakerMap[key]
      );
      
      if (!hasChanges) {
        setShowSpeakerEditor(false);
        return;
      }
      
      // In a real implementation, send the update to the backend
      if (!fileId) {
        throw new Error('Missing transcript ID');
      }
      
      // For now, just update locally since we don't have speaker update endpoint yet
      // In a real implementation, you would send to: `/api/transcripts/${fileId}/speakers`
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update the local state
      if (transcriptData) {
        const updatedSegments = transcriptData.segments.map(segment => ({
          ...segment,
          speaker_name: speakerMap[segment.speaker] || segment.speaker_name
        }));
        
        setTranscriptData({
          ...transcriptData,
          segments: updatedSegments
        });
        
        setOriginalSpeakerMap({...speakerMap});
        setShowSpeakerEditor(false);
        toast.success('Speaker names updated successfully');
      }
    } catch (error) {
      console.error('Error updating speaker names:', error);
      toast.error('Failed to update speaker names');
    }
  };

  const handleCancelSpeakerEdit = () => {
    setSpeakerMap({...originalSpeakerMap});
    setShowSpeakerEditor(false);
  };

  const handleSpeakerNameChange = (speaker: string, name: string) => {
    setSpeakerMap(prev => ({
      ...prev,
      [speaker]: name
    }));
  };

  const SpeakerNameEditor = () => (
    <DialogOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <DialogContent
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <DialogHeader>
          <h2>
            <UserPlus size={18} />
            Edit Speaker Names
          </h2>
          <StyledActionButton variant="secondary" onClick={handleCancelSpeakerEdit}>
            <X size={16} />
          </StyledActionButton>
        </DialogHeader>
        
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Edit speaker names to make the transcript more readable. These changes will be applied to all transcript segments.
        </p>
        
        <SpeakerList>
          {Object.keys(speakerMap).map(speaker => (
            <SpeakerItem key={speaker}>
              <SpeakerAvatar speaker={speaker}>
                {getSpeakerInitials(speakerMap[speaker])}
              </SpeakerAvatar>
              <SpeakerLabel>{speaker}</SpeakerLabel>
              <SpeakerInput
                value={speakerMap[speaker]}
                onChange={(e) => handleSpeakerNameChange(speaker, e.target.value)}
                placeholder="Enter speaker name"
              />
            </SpeakerItem>
          ))}
        </SpeakerList>
        
        <DialogActions>
          <StyledActionButton variant="secondary" onClick={handleCancelSpeakerEdit}>
            Cancel
          </StyledActionButton>
          <StyledActionButton variant="primary" onClick={handleUpdateSpeakerNames}>
            <Save size={16} />
            Save Changes
          </StyledActionButton>
        </DialogActions>
      </DialogContent>
    </DialogOverlay>
  );

  if (loading) {
    return (
      <TranscriptContainer>
        <Header>
          <HeaderLeft>
            <BackButton onClick={() => router.push('/transcripts')}>
              <ArrowLeft size={18} />
            </BackButton>
            <HeaderTitle>Loading...</HeaderTitle>
          </HeaderLeft>
        </Header>
        <MainContent>
          <Card>
            <LoadingState>
              <div className="spinner"></div>
              <h3>Loading transcript...</h3>
              <p>Processing your meeting data</p>
            </LoadingState>
          </Card>
        </MainContent>
      </TranscriptContainer>
    );
  }

  if (error) {
    return (
      <TranscriptContainer>
        <Header>
          <HeaderLeft>
            <BackButton onClick={() => router.push('/transcripts')}>
              <ArrowLeft size={18} />
            </BackButton>
            <HeaderTitle>Error</HeaderTitle>
          </HeaderLeft>
        </Header>
        <MainContent>
          <Card>
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <AlertTriangle size={48} color="#dc2626" style={{ marginBottom: '1rem' }} />
              <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Error Loading Transcript</h3>
              <p style={{ color: '#64748b' }}>{error}</p>
            </div>
          </Card>
        </MainContent>
      </TranscriptContainer>
    );
  }

  return (
    <TranscriptContainer>
      <Header>
        <HeaderLeft>
          <BackButton onClick={() => router.push('/transcripts')}>
            <ArrowLeft size={18} />
          </BackButton>
          <HeaderTitle>{transcriptData?.filename || 'Transcript'}</HeaderTitle>
        </HeaderLeft>
        <HeaderActions>
          <ActionButton onClick={handleShare}>
            <Share2 size={16} />
            Share
          </ActionButton>
          <ActionButton onClick={handleDownload} primary>
            <Download size={16} />
            Download
          </ActionButton>
        </HeaderActions>
      </Header>

      <MainContent>
        <ContentGrid>
          <TranscriptSection>
            <Card
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <CardHeader>
                <h3>
                  <User size={20} />
                  Meeting Overview
                </h3>
              </CardHeader>
              
              <MetadataGrid>
                <MetadataItem>
                  <div className="icon">
                    <Clock size={20} color="white" />
                  </div>
                  <div className="value">{formatDuration(transcriptData?.duration || 0)}</div>
                  <div className="label">Duration</div>
                </MetadataItem>
                
                <MetadataItem>
                  <div className="icon">
                    <Users size={20} color="white" />
                  </div>
                  <div className="value">{transcriptData?.participant_count || 0}</div>
                  <div className="label">Speakers</div>
                </MetadataItem>
                
                <MetadataItem>
                  <div className="icon">
                    <CheckSquare size={20} color="white" />
                  </div>
                  <div className="value">{actionItems?.length || 0}</div>
                  <div className="label">Action Items</div>
                </MetadataItem>
              </MetadataGrid>
            </Card>

            <Card
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <CardHeader>
                <h3>
                  <User size={20} />
                  Transcript with Speaker Identification
                </h3>
                <TooltipWrapper>
                  <StyledActionButton variant="secondary" onClick={() => setShowSpeakerEditor(true)}>
                    <Edit size={16} />
                    Edit Speakers
                  </StyledActionButton>
                  <TooltipText>Update speaker names to identify participants</TooltipText>
                </TooltipWrapper>
              </CardHeader>
              
              <TranscriptContent>
                {transcriptData?.segments?.map((segment: TranscriptSegment) => (
                  <TranscriptSegment key={segment.id}>
                    <SpeakerInfo>
                      <SpeakerAvatar speaker={segment.speaker}>
                        {getSpeakerInitials(segment.speaker_name)}
                      </SpeakerAvatar>
                      <SpeakerDetails>
                        <div className="name">{segment.speaker_name || segment.speaker}</div>
                        <div className="time">{formatTime(segment.start)} - {formatTime(segment.end)}</div>
                      </SpeakerDetails>
                      <CopyButton 
                        onClick={() => copySegmentText(segment.text, segment.id)}
                        title="Copy text"
                      >
                        {copiedSegment === segment.id ? (
                          <Check size={16} color="#16a34a" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </CopyButton>
                    </SpeakerInfo>
                    <TranscriptText>{segment.text}</TranscriptText>
                  </TranscriptSegment>
                ))}
              </TranscriptContent>
            </Card>
          </TranscriptSection>

          <Sidebar>
            <Card
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <CardHeader>
                <h3>
                  <CheckSquare size={20} />
                  Action Items ({actionItems.length})
                </h3>
              </CardHeader>
              
              <ActionItemsList>
                {actionItems?.map((item: ActionItem) => (
                  <ActionItem key={item.id}>
                    <div className="header">
                      <PriorityBadge priority={item.priority}>
                        {item.priority}
                      </PriorityBadge>
                    </div>
                    <div className="task">{item.task}</div>
                    <div className="meta">
                      <span><strong>Assignee:</strong> {item.assignee}</span>
                      <span><strong>Due:</strong> {item.deadline}</span>
                      <span><strong>From:</strong> {item.source_time}</span>
                    </div>
                  </ActionItem>
                ))}
              </ActionItemsList>
            </Card>
          </Sidebar>
        </ContentGrid>
      </MainContent>

      <FloatingButton
        onClick={() => setShowSpeakerEditor(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Settings size={20} />
      </FloatingButton>

      {showSpeakerEditor && <SpeakerNameEditor />}
    </TranscriptContainer>
  );
};

export default TranscriptPage;