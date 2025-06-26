'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
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
  UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';

// TypeScript interfaces

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
  task: string;
  assignee?: string;
  deadline?: string;
  priority: string;
  context?: string;
  category?: string;
  completed?: boolean;
}

interface SpeakerMap {
  [key: string]: string;
}

// Styled components following admin design patterns
const TranscriptContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(90deg, #09090A 0%, #181719 37%, #36343B 100%);
  color: #FFFFFF;
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
  background: rgba(32, 32, 36, 0.65);
  border: 1px solid rgba(136, 80, 242, 0.3);
  border-radius: 12px;
  color: #FFFFFF;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(14px);
  
  &:hover {
    background: rgba(136, 80, 242, 0.2);
    transform: translateY(-1px);
  }
`;

const HeaderTitle = styled.h1`
  color: #FFFFFF;
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
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
  background: rgba(32, 32, 36, 0.65);
  border-radius: 24px;
  backdrop-filter: blur(14px);
  box-shadow: 0px 12px 40px rgba(0, 0, 0, 0.45);
  padding: 2rem;
  position: relative;
  border: 1px solid rgba(136, 80, 242, 0.2);
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    padding: 2px;
    border-radius: inherit;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 30%, #B0E54F 100%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    opacity: 0.3;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 1;
  
  h3 {
    color: #FFFFFF;
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
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
  padding: 1.5rem;
  background: rgba(20, 20, 24, 0.5);
  border-radius: 16px;
  border: 1px solid rgba(136, 80, 242, 0.2);
  position: relative;
  z-index: 1;
  
  .icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 0.75rem;
  }
  
  .value {
    color: #FFFFFF;
    font-size: 1.5rem;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    margin: 0 0 0.5rem 0;
  }
  
  .label {
    color: #8D8D99;
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
  }
`;

const TranscriptContent = styled.div`
  max-height: 600px;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(20, 20, 24, 0.3);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    border-radius: 4px;
  }
`;

const TranscriptSegment = styled.div`
  padding: 1.5rem 0;
  border-bottom: 1px solid rgba(136, 80, 242, 0.1);
  
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
    color: #FFFFFF;
    font-weight: 700;
    font-size: 0.875rem;
    margin: 0 0 0.25rem 0;
  }
  
  .time {
    color: #8D8D99;
    font-size: 0.75rem;
    margin: 0;
  }
`;

const TranscriptText = styled.p`
  color: #C4C4CC;
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
  background: rgba(20, 20, 24, 0.5);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
  z-index: 1;
  
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  
  .task {
    color: #FFFFFF;
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    line-height: 1.4;
  }
  
  .meta {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: #8D8D99;
    flex-wrap: wrap;
  }
`;

const PriorityBadge = styled.span<PriorityBadgeProps>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid;
  background: ${props => {
    switch (props.priority?.toLowerCase()) {
      case 'high': return 'rgba(239, 68, 68, 0.1)';
      case 'medium': return 'rgba(251, 191, 36, 0.1)';
      case 'low': return 'rgba(34, 197, 94, 0.1)';
      default: return 'rgba(136, 80, 242, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.priority?.toLowerCase()) {
      case 'high': return '#F87171';
      case 'medium': return '#FCD34D';
      case 'low': return '#4ADE80';
      default: return '#A855F7';
    }
  }};
  border-color: ${props => {
    switch (props.priority?.toLowerCase()) {
      case 'high': return 'rgba(239, 68, 68, 0.3)';
      case 'medium': return 'rgba(251, 191, 36, 0.3)';
      case 'low': return 'rgba(34, 197, 94, 0.3)';
      default: return 'rgba(136, 80, 242, 0.3)';
    }
  }};
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #8D8D99;
  position: relative;
  z-index: 1;
  
  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(136, 80, 242, 0.2);
    border-top: 3px solid #8850F2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  h3 {
    color: #FFFFFF;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const CopyButton = styled.button`
  background: none;
  border: none;
  color: #8D8D99;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(136, 80, 242, 0.2);
    color: #FFFFFF;
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
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: 'Roboto', sans-serif;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.variant === 'primary' ? `
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    color: white;
    border: none;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 25px rgba(136, 80, 242, 0.4);
    }
  ` : `
    background: rgba(32, 32, 36, 0.65);
    color: #FFFFFF;
    border: 1px solid rgba(136, 80, 242, 0.3);
    backdrop-filter: blur(14px);
    
    &:hover {
      background: rgba(136, 80, 242, 0.2);
      transform: translateY(-1px);
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
  const [loadingTodos, setLoadingTodos] = useState(false);

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
      
      // Format data for our UI
      const formattedData = {
        filename: data.filename || `Transcription ${fileId}`,
        duration: data.duration || 0,
        participant_count: data.participant_count || 
          (data.speaker_names ? data.speaker_names.length : 2),
        language: data.language || 'en',
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
      
      // Fetch action items from LLM service
      await fetchActionItems();

      setLoading(false);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      setError(error instanceof Error ? error.message : 'Failed to load transcript data');
      setLoading(false);
      toast.error('Failed to load transcript');
    }
  };
  
  const fetchActionItems = async () => {
    try {
      setLoadingTodos(true);
      
      // Fetch LLM analysis data that contains action items
      const response = await fetch(`/api/analysis/${fileId}`);
      
      if (response.ok) {
        const analysisData = await response.json();
        
        if (analysisData.analysis?.analysis?.action_items) {
          const todos = analysisData.analysis.analysis.action_items.map((item: any) => ({
            task: item.task || 'Unknown task',
            assignee: item.assignee,
            deadline: item.deadline,
            priority: item.priority || 'Medium',
            context: item.context,
            category: item.category,
            completed: false
          }));
          setActionItems(todos);
        } else {
          // No action items found, set empty array
          setActionItems([]);
        }
      } else {
        // If LLM analysis fails, show empty state
        console.warn('LLM analysis not available for this transcript');
        setActionItems([]);
      }
    } catch (error) {
      console.error('Error fetching action items:', error);
      // Don't show error toast for this - just show empty state
      setActionItems([]);
    } finally {
      setLoadingTodos(false);
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
            <div style={{ textAlign: 'center', padding: '3rem', position: 'relative', zIndex: 1 }}>
              <AlertTriangle size={48} color="#F87171" style={{ marginBottom: '1rem' }} />
              <h3 style={{ color: '#FFFFFF', marginBottom: '0.5rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>Error Loading Transcript</h3>
              <p style={{ color: '#8D8D99' }}>{error}</p>
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
          {/* Simplified - removed download and share buttons */}
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
              
              {loadingTodos ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ width: '32px', height: '32px', border: '2px solid rgba(136, 80, 242, 0.2)', borderTop: '2px solid #8850F2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                  <p style={{ color: '#8D8D99', fontSize: '0.875rem' }}>Generating action items...</p>
                </div>
              ) : actionItems.length > 0 ? (
                <ActionItemsList>
                  {actionItems.map((item: ActionItem, index: number) => (
                    <ActionItem key={index}>
                      <div className="header">
                        <PriorityBadge priority={item.priority}>
                          {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                        </PriorityBadge>
                      </div>
                      <div className="task">{item.task}</div>
                      <div className="meta">
                        {item.assignee && <span><strong>Assignee:</strong> {item.assignee}</span>}
                        {item.deadline && <span><strong>Due:</strong> {item.deadline}</span>}
                        {item.context && <span><strong>Context:</strong> {item.context}</span>}
                        {item.category && <span><strong>Category:</strong> {item.category}</span>}
                      </div>
                    </ActionItem>
                  ))}
                </ActionItemsList>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <CheckSquare size={32} color="#8D8D99" style={{ marginBottom: '1rem' }} />
                  <p style={{ color: '#8D8D99', fontSize: '0.875rem' }}>No action items found in this transcript</p>
                </div>
              )}
            </Card>
          </Sidebar>
        </ContentGrid>
      </MainContent>


      {showSpeakerEditor && <SpeakerNameEditor />}
    </TranscriptContainer>
  );
};

export default TranscriptPage;