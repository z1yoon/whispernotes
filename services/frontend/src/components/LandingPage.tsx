'use client'

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Upload, Mic, Users, Brain } from 'lucide-react';

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

const AuthButton = styled(Link)<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: 'Roboto', sans-serif;
  font-weight: 600;
  color: #FFFFFF;
  transition: all 0.2s;
  
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

const VideoUploadCard = styled.div`
  width: 680px;
  max-width: 90%;
  height: 420px;
  background: rgba(32, 32, 36, 0.65);
  border-radius: 24px;
  backdrop-filter: blur(14px);
  box-shadow: 0px 12px 40px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 2;

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

  .upload-badge {
    width: 96px;
    height: 96px;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(168, 85, 247, 0.35);
    margin-bottom: 24px;
  }

  &:hover {
    box-shadow: 0px 16px 48px rgba(0, 0, 0, 0.55);
    transform: translateY(-3px);
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

const LandingPage = () => {
  const handleUploadClick = () => {
    // You can implement the upload logic here
    console.log('Upload clicked');
  };

  return (
    <LandingContainer>
      <InstituteName>
        National Institute of Education
      </InstituteName>

      <TopNav>
        <AuthButton href="/login" variant="secondary">Login</AuthButton>
        <AuthButton href="/signup" variant="primary">Sign Up</AuthButton>
      </TopNav>

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
          <VideoUploadCard onClick={handleUploadClick}>
            <div className="upload-badge">
              <Upload size={40} />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-gray-300">Upload Your Video</h2>
            <p className="text-gray-300 mb-4 text-center w-3/4">Drag & drop or click to browse files</p>
            <p className="text-gray-500 text-sm">MP4 · AVI · MOV · Up to 500 MB</p>
          </VideoUploadCard>
        </RightSection>
      </MainContent>

      <GradientBorder />
    </LandingContainer>
  );
};

export default LandingPage;