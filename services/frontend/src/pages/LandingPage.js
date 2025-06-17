import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Upload, 
  Play, 
  FileText, 
  Users, 
  ArrowRight,
  CheckCircle,
  Mic
} from 'lucide-react';

const LandingContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0B0A0A 0%, #1C1A1F 37.5%, #363036 100%, #3A373D 100%);
  position: relative;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 6rem;
  color: #C4C4CC;
`;

const LogoIcon = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const LogoText = styled.div`
  font-family: 'Roboto', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #C4C4CC;
`;

const HeroTitle = styled(motion.h1)`
  font-family: 'Roboto Condensed', sans-serif;
  font-size: 7.5rem;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 2rem 0;
  line-height: 1.0;
  letter-spacing: 0px;
  
  @media (max-width: 1200px) {
    font-size: 6rem;
  }
  
  @media (max-width: 768px) {
    font-size: 4rem;
  }
  
  @media (max-width: 480px) {
    font-size: 3rem;
  }
`;

const HeroSubtitle = styled(motion.p)`
  font-family: 'Roboto', sans-serif;
  font-size: 3.5rem;
  font-weight: 400;
  color: #8D8D99;
  margin: 0 0 4rem 0;
  line-height: 1.4;
  
  @media (max-width: 1200px) {
    font-size: 3rem;
  }
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`;

const CTAButton = styled(motion(Link))`
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
  color: white;
  padding: 1.5rem 3rem;
  border-radius: 12px;
  text-decoration: none;
  font-family: 'Roboto', sans-serif;
  font-weight: 600;
  font-size: 1.25rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(136, 80, 242, 0.3);
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 6rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(136, 80, 242, 0.4);
  }
`;

const BrandTag = styled(motion.div)`
  background: #202024;
  border: 1px solid #333;
  border-radius: 999px;
  padding: 1.25rem 3rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 
    0 0 0 0 rgba(0, 0, 0, 0.15),
    0 4px 8px 0 rgba(0, 0, 0, 0.15),
    0 14px 14px 0 rgba(0, 0, 0, 0.13),
    0 32px 19px 0 rgba(0, 0, 0, 0.08),
    0 57px 23px 0 rgba(0, 0, 0, 0.02),
    0 89px 25px 0 rgba(0, 0, 0, 0);
`;

const AILogo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .icon {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
  
  .text {
    font-family: 'Roboto', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: #DEDFE1;
  }
`;

const FeaturePreview = styled(motion.div)`
  position: absolute;
  right: 5%;
  top: 50%;
  transform: translateY(-50%);
  width: 400px;
  height: 600px;
  background: linear-gradient(135deg, #CE76F7 0%, #DEDFE1 51.55%, #B1E850 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  
  @media (max-width: 1400px) {
    display: none;
  }
`;

const MockupOverlay = styled.div`
  position: absolute;
  inset: 16px;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect width="400" height="600" fill="%23000" opacity="0.1" rx="12"/></svg>');
  background-size: cover;
  border-radius: 12px;
  backdrop-filter: blur(20px);
  border: 16px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 80px rgba(0, 0, 0, 0.55);
`;

const GradientBorder = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 24px;
  background: linear-gradient(90deg, #0B071A 0%, #342C66 25%, #7142CA 50%, #A29AF5 83%, #DEDFE1 100%);
`;

const LandingPage = () => {
  return (
    <LandingContainer>
      <LogoSection>
        <LogoIcon>
          <Mic size={24} />
        </LogoIcon>
        <LogoText>Whisper Notes</LogoText>
      </LogoSection>

      <HeroTitle
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        AI Transcription
      </HeroTitle>
      
      <HeroSubtitle
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Speaker Diarization
      </HeroSubtitle>
      
      <CTAButton
        to="/login"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Play size={20} />
        Start Processing
      </CTAButton>

      <FeaturePreview
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 0.8, x: 0 }}
        transition={{ duration: 1, delay: 0.6 }}
      >
        <MockupOverlay />
      </FeaturePreview>

      <BrandTag
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
      >
        <AILogo>
          <div className="icon">
            <Upload size={16} />
          </div>
          <div className="text">Video to Text AI</div>
        </AILogo>
      </BrandTag>

      <GradientBorder />
    </LandingContainer>
  );
};

export default LandingPage;