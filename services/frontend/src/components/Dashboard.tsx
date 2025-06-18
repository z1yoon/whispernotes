'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Upload, FileText, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

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
const AuthButton = styled(motion.button)<{ variant?: 'primary' | 'secondary' }>`
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
  
  ${props => props.variant === 'primary' ? `
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

const UserName = styled.h3`
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

const Dashboard = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

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

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isAdmin = user?.role === 'admin' || user?.is_admin;

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
              variant="secondary"
              onClick={handleAdminPanel}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Shield size={16} />
              Admin
            </AuthButton>
          )}
          
          <AuthButton
            variant="primary"
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut size={16} />
            Logout
          </AuthButton>
        </HeaderActions>
      </Header>

      <MainContent>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ActionCard onClick={handleUpload}>
            <ActionIcon>
              <Upload size={32} />
            </ActionIcon>
            <ActionContent>
              <ActionTitle>Upload Audio</ActionTitle>
              <ActionDescription>
                Upload your audio files for AI-powered transcription
              </ActionDescription>
            </ActionContent>
          </ActionCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ActionCard>
            <ActionIcon>
              <FileText size={32} />
            </ActionIcon>
            <ActionContent>
              <ActionTitle>My Transcripts</ActionTitle>
              <ActionDescription>
                View and manage your transcription history
              </ActionDescription>
            </ActionContent>
          </ActionCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <ActionCard>
            <ActionIcon>
              <Settings size={32} />
            </ActionIcon>
            <ActionContent>
              <ActionTitle>Settings</ActionTitle>
              <ActionDescription>
                Configure your transcription preferences
              </ActionDescription>
            </ActionContent>
          </ActionCard>
        </motion.div>
      </MainContent>
    </DashboardContainer>
  );
};

export default Dashboard;