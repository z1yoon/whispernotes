'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Settings, 
  LogOut, 
  Shield, 
  FileVideo, 
  FileAudio,
  User,
  Users,
  CheckSquare,
  Clock,
  Zap,
  ChevronDown,
  ChevronRight,
  List,
  Check
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useNotification } from './NotificationProvider';
import Todo from './Todo';
import UserCount from './UserCount';

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0B0A0A 0%, #1C1A1F 37.5%, #363036 100%);
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

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

// Updated button styles to match login/signup
const AuthButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' }>`
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  color: #A1A1AA;
  font-size: 1rem;
  margin: 0;
  line-height: 1.5;
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 2rem;
  background: rgba(136, 80, 242, 0.1);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 16px;
  margin: 2rem;
`;

const UserAvatar = styled.div`
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.5rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #FFFFFF;
  font-weight: 600;
  font-size: 1rem;
  margin-right: 1rem;
`;

const UserNameHeading = styled.h3`
  color: #FFFFFF;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
`;

const UserRole = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(16, 185, 129, 0.1);
  color: #10B981;
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MainContent = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const ActionCard = styled(motion.div)`
  background: rgba(32, 32, 36, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(136, 80, 242, 0.25);
    border-color: rgba(136, 80, 242, 0.4);
  }
`;

const ActionIcon = styled.div`
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const ActionContent = styled.div`
  flex: 1;
`;

const ActionTitle = styled.h4`
  font-size: 1.125rem;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0 0 0.25rem 0;
`;

const ActionDescription = styled.p`
  color: #A1A1AA;
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  background: rgba(32, 32, 36, 0.5);
  border-radius: 16px;
  border: 1px dashed rgba(136, 80, 242, 0.3);
`;

const EmptyStateTitle = styled.h3`
  color: #FFFFFF;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem 0;
`;

const EmptyStateText = styled.p`
  color: #8D8D99;
  font-size: 0.875rem;
  margin: 0 0 1.5rem 0;
`;

const TranscriptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 2rem;
`;

const TranscriptionCard = styled.div`
  background: rgba(32, 32, 36, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 16px;
  overflow: hidden;
`;

const TranscriptionHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(136, 80, 242, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TranscriptionTitle = styled.h3`
  color: #FFFFFF;
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const TranscriptionDate = styled.div`
  color: #8D8D99;
  font-size: 0.75rem;
  font-weight: 500;
`;

const TranscriptionContent = styled.div`
  padding: 1.5rem;
`;

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(20, 20, 24, 0.5);
  border-radius: 8px;
  padding: 0.75rem 1rem;
`;

const FileIcon = styled.div<{ $type: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${props => props.$type === 'video' ? '#8850F2' : '#10B981'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const FileDetails = styled.div`
  flex: 1;
`;

const FileName = styled.div`
  color: #FFFFFF;
  font-size: 0.875rem;
  font-weight: 600;
`;

const FileSize = styled.div`
  color: #8D8D99;
  font-size: 0.75rem;
`;

const TranscriptionOptions = styled.div`
  margin-top: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const OptionBadge = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$active ? 'rgba(136, 80, 242, 0.2)' : 'rgba(20, 20, 24, 0.5)'};
  color: ${props => props.$active ? '#A855F7' : '#8D8D99'};
  border: 1px solid ${props => props.$active ? 'rgba(136, 80, 242, 0.3)' : 'transparent'};
`;

const ToDoListSection = styled.div`
  margin-top: 1.5rem;
  border-top: 1px solid rgba(136, 80, 242, 0.1);
  padding-top: 1.5rem;
`;

const ToDoListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const ToDoListTitle = styled.h4`
  color: #FFFFFF;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ToDoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ToDoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(20, 20, 24, 0.5);
  border-radius: 8px;
`;

const ToDoCheckbox = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid #A855F7;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  cursor: pointer;
`;

const ToDoText = styled.div`
  color: #FFFFFF;
  font-size: 0.875rem;
  flex: 1;
`;

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const notification = useNotification();
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Load transcription history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const history = JSON.parse(localStorage.getItem('transcriptionHistory') || '[]');
      setTranscriptions(history);
    }
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleAdminPanel = () => {
    router.push('/admin');
  };

  const handleUpload = () => {
    router.push('/upload');
  };

  const toggleExpandCard = (id: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isAdmin = user?.role === 'admin' || user?.is_admin;

  // Add CSS fallback and ensure CSS properly loads by adding next.js specific style loader
  useEffect(() => {
    // Add listener to ensure styling is properly loaded
    const styleCheck = setTimeout(() => {
      const styleElements = document.querySelectorAll('style');
      if (styleElements.length === 0) {
        console.warn('No style elements found, forcing style refresh');
        // Force refresh styles by toggling a class on the body
        document.body.classList.add('style-refresh');
        setTimeout(() => document.body.classList.remove('style-refresh'), 0);
      }
    }, 100);
    
    return () => clearTimeout(styleCheck);
  }, []);

  return (
    <DashboardContainer>
      <Header>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Title>Dashboard</Title>
          <Subtitle>Manage your audio transcriptions</Subtitle>
        </motion.div>
        
        <HeaderActions>
          <UserInfo>
            {user?.full_name || user?.username || 'User'}
          </UserInfo>
          
          {isAdmin && (
            <AuthButton
              $variant="secondary"
              onClick={handleAdminPanel}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Shield size={16} />
              Admin
            </AuthButton>
          )}
          
          <AuthButton
            $variant="primary"
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut size={16} />
            Logout
          </AuthButton>
        </HeaderActions>
      </Header>

      <UserProfile>
        <UserAvatar>
          {getUserInitials(user?.full_name || user?.username || 'User')}
        </UserAvatar>
        <div>
          <UserNameHeading>
            {user?.full_name || user?.username || 'User'}
            {isAdmin && <UserRole>Admin</UserRole>}
          </UserNameHeading>
          <Subtitle>{user?.email || 'user@example.com'}</Subtitle>
        </div>
      </UserProfile>

      <MainContent>
        <ActionCard
          onClick={handleUpload}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ActionIcon>
            <Upload size={24} />
          </ActionIcon>
          <ActionContent>
            <ActionTitle>Upload New File</ActionTitle>
            <ActionDescription>
              Upload audio or video files for AI-powered transcription and analysis
            </ActionDescription>
          </ActionContent>
        </ActionCard>

        {transcriptions.length === 0 ? (
          <EmptyState>
            <FileText size={48} color="#8850F2" />
            <EmptyStateTitle>No transcriptions yet</EmptyStateTitle>
            <EmptyStateText>
              Upload your first file to get started with AI-powered transcription
            </EmptyStateText>
            <AuthButton
              $variant="primary"
              onClick={handleUpload}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Upload size={16} />
              Upload File
            </AuthButton>
          </EmptyState>
        ) : (
          <TranscriptionsList>
            {transcriptions.map((transcription, index) => (
              <TranscriptionCard key={`transcription-${index}`}>
                <TranscriptionHeader onClick={() => toggleExpandCard(`transcription-${index}`)}>
                  <TranscriptionTitle>
                    {transcription.files[0]?.type === 'video' ? (
                      <FileVideo size={20} color="#8850F2" />
                    ) : (
                      <FileAudio size={20} color="#10B981" />
                    )}
                    {transcription.files[0]?.name || `Transcription ${index + 1}`}
                    {transcription.files.length > 1 && ` (+${transcription.files.length - 1} more)`}
                  </TranscriptionTitle>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <TranscriptionDate>
                      {formatDate(transcription.timestamp)}
                    </TranscriptionDate>
                    {expandedCards[`transcription-${index}`] ? (
                      <ChevronDown size={16} color="#8D8D99" />
                    ) : (
                      <ChevronRight size={16} color="#8D8D99" />
                    )}
                  </div>
                </TranscriptionHeader>
                
                <AnimatePresence>
                  {expandedCards[`transcription-${index}`] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TranscriptionContent>
                        <FileList>
                          {transcription.files.map((file: any, fileIndex: number) => (
                            <FileItem key={`file-${fileIndex}`}>
                              <FileIcon $type={file.type}>
                                {file.type === 'video' ? (
                                  <FileVideo size={16} />
                                ) : (
                                  <FileAudio size={16} />
                                )}
                              </FileIcon>
                              <FileDetails>
                                <FileName>{file.name}</FileName>
                                <FileSize>{file.size} bytes</FileSize>
                              </FileDetails>
                            </FileItem>
                          ))}
                        </FileList>
                        
                        <TranscriptionOptions>
                          <OptionBadge $active={transcription.options.speakerDiarization}>
                            <Users size={14} />
                            {transcription.options.numberOfSpeakers} Speakers
                          </OptionBadge>
                          
                          <OptionBadge $active={transcription.options.timestampGeneration}>
                            <Clock size={14} />
                            Timestamps
                          </OptionBadge>
                          
                          <OptionBadge $active={transcription.options.actionItemExtraction}>
                            <Check size={14} />
                            Action Items
                          </OptionBadge>
                          
                          <OptionBadge $active={transcription.options.languageDetection}>
                            <Zap size={14} />
                            Auto Language
                          </OptionBadge>
                          
                          <OptionBadge $active={transcription.options.generateToDoList}>
                            <CheckSquare size={14} />
                            To-Do List
                          </OptionBadge>
                          
                          <OptionBadge $active={transcription.options.userCountEnabled}>
                            <User size={14} />
                            User Count
                          </OptionBadge>
                        </TranscriptionOptions>
                        
                        {/* Use the Todo component */}
                        {transcription.options.generateToDoList && (
                          <Todo 
                            transcriptionId={`transcription-${index}`}
                            initialTodos={[
                              { text: 'Follow up with team about project timeline', completed: false },
                              { text: 'Review presentation slides for next meeting', completed: false },
                              { text: 'Send meeting minutes to all participants', completed: false },
                              { text: 'Schedule follow-up call with client', completed: false },
                            ]}
                          />
                        )}
                        
                        {/* Replace the user count section with the UserCount component */}
                        {transcription.options.userCountEnabled && (
                          <UserCount 
                            transcriptionId={`transcription-${index}`}
                          />
                        )}
                      </TranscriptionContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TranscriptionCard>
            ))}
          </TranscriptionsList>
        )}
      </MainContent>
    </DashboardContainer>
  );
};

export default Dashboard;