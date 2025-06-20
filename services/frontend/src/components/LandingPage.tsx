'use client'

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload,
  Users,
  LogOut,
  Brain,
  Shield,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SharedUpload } from './SharedUpload';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';

const LandingContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(90deg, #09090A 0%, #181719 37%, #36343B 100%);
  position: relative;
  overflow-x: hidden;
`;

const InstituteName = styled.div`
  position: absolute;
  top: 2rem;
  left: 2rem;
  z-index: 10;
  font-family: 'Roboto', sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  background: linear-gradient(90deg, #A29AF5 0%, #DEE0FC 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.5px;
`;

const TopNav = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  padding: 2rem;
  display: flex;
  gap: 1rem;
  z-index: 10;
`;

const AuthButton = styled.a<{ $variant?: 'primary' | 'secondary'; $isButton?: boolean }>`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: 'Roboto', sans-serif;
  font-weight: 600;
  color: #FFFFFF;
  transition: all 0.2s;
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: none;
  
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
  display: flex;
  width: 100%;
  height: 100vh;
`;

const LeftSection = styled.div`
  flex: 1;
  padding: 164px 180px;
  display: flex;
  flex-direction: column;
  gap: 104px;
`;

const RightSection = styled.div`
  flex: 1;
  padding: 135px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 78px;
    right: -200px;
    width: 883px;
    height: 897px;
    background: linear-gradient(180deg, #CE76F8 0.13%, #DEE0FC 51.55%, #B0E54F 100%);
    opacity: 0.7;
    filter: blur(80px);
    border-radius: 30px;
    z-index: 1;
  }
`;

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const HeroTitle = styled(motion.h1)`
  font-family: 'Roboto Condensed', sans-serif;
  font-size: 120px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0;
  line-height: 0.9;
  letter-spacing: -1px;
`;

const HeroSubtitle = styled(motion.p)`
  font-family: 'Roboto', sans-serif;
  font-size: 56px;
  font-weight: 400;
  color: #8D8D99;
  margin: 0;
  line-height: 1.4;
`;

const SimplifiedFeatures = styled(motion.div)`
  display: flex;
  gap: 48px;
  margin-top: 64px;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  color: #BDBDC2;
  font-size: 1.1rem;
  font-weight: 500;

  .icon-wrapper {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #A855F7;
  }
`;

const GradientBorder = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 24px;
  background: linear-gradient(90deg, #0B0726 0%, #342C66 25%, #7142C9 50%, #A29AF5 83.99%, #DEE0FC 100%);
`;

const AuthenticatedNav = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  padding: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 10;
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

const AdminSection = styled.div`
  display: flex;
`;

const MainContentWrapper = styled.div`
  width: 100%;
  height: 100vh;
`;

const SharedUploadCard = styled(motion.div)<{ $isAuthenticated: boolean }>`
  width: 680px;
  max-width: 90%;
  position: relative;
  z-index: 2;
`;

const LandingPage = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  const handleUploadClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      e.stopPropagation();
      toast.error('Please login to upload files');
      router.push('/login');
    }
  };

  const handleStartProcessing = (files: any[], options: any) => {
    toast.success(`Processing ${files.length} file(s) with ${options.numberOfSpeakers} speakers`);
    // Add your processing logic here
    console.log('Processing files:', files, 'with options:', options);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const handleAdminPanel = () => {
    router.push('/admin');
  };

  const isAdmin = user?.role === 'admin' || user?.is_admin;
  
  // Get display username from user data (removed environment variable fallback)
  const displayUsername = user?.full_name || user?.username || 'User';

  return (
    <LandingContainer>
      <InstituteName>
        National Institute of Education
      </InstituteName>

      {isAuthenticated ? (
        <AuthenticatedNav>
          <UsernameButton>
            {isAdmin ? <Shield size={12} /> : <User size={12} />}
            {displayUsername}
          </UsernameButton>

          <AuthButton 
            as="button" 
            $variant="primary"
            onClick={handleLogout}
            $isButton={true}
          >
            <LogOut size={16} />
            Logout
          </AuthButton>

          {isAdmin && (
            <AdminSection>
              <AuthButton 
                as="button" 
                $variant="secondary"
                onClick={handleAdminPanel}
                $isButton={true}
              >
                <Shield size={16} />
                Admin
              </AuthButton>
            </AdminSection>
          )}
        </AuthenticatedNav>
      ) : (
        <TopNav>
          <AuthButton href="/login" $variant="secondary">Login</AuthButton>
          <AuthButton href="/signup" $variant="primary">Sign Up</AuthButton>
        </TopNav>
      )}

      <MainContentWrapper>
        <MainContent>
          <LeftSection>
            <TitleSection>
              <HeroTitle
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                WhisperNotes
                <br />
                AI Transcription
              </HeroTitle>
              <HeroSubtitle
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Speaker Diarization
              </HeroSubtitle>

              <SimplifiedFeatures
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, staggerChildren: 0.1 }}
              >
                <FeatureItem>
                  <div className="icon-wrapper">
                    <Upload size={20} />
                  </div>
                  <span>Smart Upload</span>
                </FeatureItem>
                <FeatureItem>
                  <div className="icon-wrapper">
                    <Brain size={20} />
                  </div>
                  <span>AI Processing</span>
                </FeatureItem>
                <FeatureItem>
                  <div className="icon-wrapper">
                    <Users size={20} />
                  </div>
                  <span>Speaker Recognition</span>
                </FeatureItem>
              </SimplifiedFeatures>
            </TitleSection>
          </LeftSection>

          <RightSection>
            <SharedUpload 
              $variant="landing"
              isAuthenticated={isAuthenticated}
              onStartProcessing={handleStartProcessing}
              onUploadClick={handleUploadClick}
            />
          </RightSection>
        </MainContent>
      </MainContentWrapper>

      <GradientBorder />
    </LandingContainer>
  );
};

export default LandingPage;