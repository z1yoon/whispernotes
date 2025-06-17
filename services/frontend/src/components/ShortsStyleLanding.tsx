'use client'

import React from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Play, Upload } from 'lucide-react';

const Container = styled.div`
  min-height: 100vh;
  background: #1a1a1a;
  color: white;
  display: flex;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const LeftSection = styled.div`
  flex: 1;
  padding: 4rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 600px;

  @media (max-width: 768px) {
    padding: 2rem;
    max-width: none;
  }
`;

const RightSection = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;

  @media (max-width: 768px) {
    display: none;
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 4rem;
  font-size: 1.5rem;
  font-weight: 500;

  .rocket {
    width: 24px;
    height: 24px;
    transform: rotate(-45deg);
  }
`;

const Title = styled.h1`
  font-size: 4.5rem;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 3rem;
  }

  @media (max-width: 480px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled.h2`
  font-size: 2rem;
  font-weight: 300;
  color: #888;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const AuthButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const Button = styled(motion.button)`
  padding: 0.875rem 2rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  color: white;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: #888;
  border: 1px solid #333;

  &:hover {
    color: white;
    border-color: #555;
  }
`;

const MockupContainer = styled.div`
  position: relative;
  max-width: 400px;
  width: 100%;
`;

const MockupCard = styled(motion.div)`
  background: #2a2a2a;
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid #333;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 100px;
    height: 60px;
    background: linear-gradient(135deg, #8b5cf6, #06d6a0);
    border-radius: 0 16px 0 100px;
  }
`;

const MockupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
`;

const PlayIcon = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MockupTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #a855f7;
`;

const UrlInput = styled.div`
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 2rem;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ProcessButton = styled.div`
  width: 32px;
  height: 32px;
  background: #8b5cf6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatusSection = styled.div`
  margin-bottom: 2rem;
`;

const StatusTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const StatusText = styled.p`
  color: #666;
  font-size: 0.9rem;
`;

const BrandBadge = styled.div`
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 20px;
  padding: 0.5rem 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  margin-top: 1rem;
`;

const GradientAccent = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 120px;
  height: 60px;
  background: linear-gradient(135deg, #8b5cf6, #06d6a0);
  border-radius: 16px 0 16px 0;
`;

const ShortsStyleLanding: React.FC = () => {
  return (
    <Container>
      <LeftSection>
        <Logo>
          <span className="rocket">🚀</span>
          rocketseat
        </Logo>

        <Title>
          Shorts
          <br />
          Summary
        </Title>

        <Subtitle>Trilha Foundations</Subtitle>

        <AuthButtons>
          <PrimaryButton
            as={Link}
            href="/login"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            Login
          </PrimaryButton>
          <SecondaryButton
            as={Link}
            href="/signup"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            Sign Up
          </SecondaryButton>
        </AuthButtons>

        <BrandBadge>
          <span style={{ color: '#8b5cf6' }}>{'<'}nlw{'/>'}  </span>
          <span style={{ color: '#06d6a0' }}>IA</span>
        </BrandBadge>
      </LeftSection>

      <RightSection>
        <MockupContainer>
          <MockupCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <MockupHeader>
              <PlayIcon>
                <Play size={20} color="white" fill="white" />
              </PlayIcon>
              <MockupTitle>Shorts Summary</MockupTitle>
            </MockupHeader>

            <UrlInput>
              <span>URL do vídeo</span>
              <ProcessButton>
                <Upload size={16} color="white" />
              </ProcessButton>
            </UrlInput>

            <StatusSection>
              <StatusTitle>Resumo</StatusTitle>
              <StatusText>O resumo está sendo gerado. Aguarde...</StatusText>
            </StatusSection>

            <GradientAccent />
          </MockupCard>
        </MockupContainer>
      </RightSection>
    </Container>
  );
};

export default ShortsStyleLanding;