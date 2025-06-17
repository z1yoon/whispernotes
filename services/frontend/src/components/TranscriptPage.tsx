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
  User
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

const TranscriptPage = () => {
  const router = useRouter();
  const params = useParams();
  const fileId = params?.fileId;
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSegment, setCopiedSegment] = useState<number | null>(null);

  useEffect(() => {
    if (fileId) {
      fetchTranscriptData();
    }
  }, [fileId]);

  const fetchTranscriptData = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API call
      setTimeout(() => {
        setTranscriptData({
          filename: 'Team Meeting - Q2 Planning.mp4',
          duration: 2730, // 45:30 minutes
          participant_count: 5,
          language: 'en',
          segments: [
            {
              id: 1,
              speaker: 'SPEAKER_00',
              speaker_name: 'John (Manager)',
              start: 0,
              end: 15,
              text: "Good morning everyone. Let's start today's Q2 planning meeting. We have several important items to discuss regarding our product roadmap and resource allocation."
            },
            {
              id: 2,
              speaker: 'SPEAKER_01', 
              speaker_name: 'Sarah (Product)',
              start: 16,
              end: 35,
              text: "Thanks John. I've prepared the updated feature specifications for the user authentication system. We need to prioritize this for our enterprise clients by end of Q2."
            },
            {
              id: 3,
              speaker: 'SPEAKER_02',
              speaker_name: 'Mike (Engineering)',
              start: 36,
              end: 55,
              text: "I agree with Sarah. The authentication system is critical. However, we need to consider the mobile app redesign as well. Both projects will require significant engineering resources."
            },
            {
              id: 4,
              speaker: 'SPEAKER_00',
              speaker_name: 'John (Manager)',
              start: 56,
              end: 75,
              text: "Good points. Let's assign Sarah to lead the authentication project and Mike to coordinate the mobile redesign. We'll need to set clear deadlines for both."
            },
            {
              id: 5,
              speaker: 'SPEAKER_03',
              speaker_name: 'Lisa (Design)',
              start: 76,
              end: 90,
              text: "I can support both projects from the design perspective. I'll need the requirements finalized by next Tuesday to start the mockups."
            }
          ]
        });

        setActionItems([
          {
            id: 1,
            task: "Finalize user authentication system specifications",
            assignee: "Sarah (Product)",
            deadline: "End of Q2",
            priority: "High",
            source_time: "16-35s",
            completed: false
          },
          {
            id: 2,
            task: "Coordinate mobile app redesign project",
            assignee: "Mike (Engineering)",
            deadline: "Q2",
            priority: "High",
            source_time: "36-55s",
            completed: false
          },
          {
            id: 3,
            task: "Set clear deadlines for authentication and mobile projects",
            assignee: "John (Manager)",
            deadline: "This week",
            priority: "Medium",
            source_time: "56-75s",
            completed: false
          },
          {
            id: 4,
            task: "Finalize requirements for design mockups",
            assignee: "Sarah & Mike",
            deadline: "Next Tuesday",
            priority: "Medium",
            source_time: "76-90s",
            completed: false
          },
          {
            id: 5,
            task: "Start design mockups for both projects",
            assignee: "Lisa (Design)",
            deadline: "After requirements finalized",
            priority: "Medium",
            source_time: "76-90s",
            completed: false
          }
        ]);

        setLoading(false);
      }, 1000);

    } catch (error) {
      console.error('Error fetching transcript:', error);
      setError('Failed to load transcript data');
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

  if (loading) {
    return (
      <TranscriptContainer>
        <Header>
          <HeaderLeft>
            <BackButton onClick={() => router.push('/dashboard')}>
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
            <BackButton onClick={() => router.push('/dashboard')}>
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
          <BackButton onClick={() => router.push('/dashboard')}>
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
    </TranscriptContainer>
  );
};

export default TranscriptPage;