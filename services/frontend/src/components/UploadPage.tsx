'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { SharedUpload } from './SharedUpload';

const UploadContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0B0A0A 0%, #1C1A1F 37.5%, #363036 100%);
`;

const Header = styled.div`
  background: rgba(32, 32, 36, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(136, 80, 242, 0.2);
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const BackButton = styled.button`
  background: rgba(136, 80, 242, 0.1);
  border: 1px solid rgba(136, 80, 242, 0.2);
  color: #C4C4CC;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(136, 80, 242, 0.2);
    border-color: rgba(136, 80, 242, 0.3);
    color: #FFFFFF;
  }
`;

const HeaderTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0;
  font-family: 'Inter', sans-serif;
`;

const MainContent = styled.div`
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
`;

const UploadPage = () => {
  const router = useRouter();

  const handleStartProcessing = (files: any[], options: any) => {
    toast.success(`Processing ${files.length} file(s) with ${options.numberOfSpeakers} speakers`);
    
    // Redirect to dashboard after processing simulation
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  return (
    <UploadContainer>
      <Header>
        <BackButton onClick={() => router.push('/dashboard')}>
          <ArrowLeft size={18} />
        </BackButton>
        <HeaderTitle>Upload Files</HeaderTitle>
      </Header>

      <MainContent>
        <SharedUpload 
          variant="page"
          isAuthenticated={true}
          onStartProcessing={handleStartProcessing}
        />
      </MainContent>
    </UploadContainer>
  );
};

export default UploadPage;