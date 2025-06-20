'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import { SharedUpload } from './SharedUpload';
import { useNotification } from './NotificationProvider';

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
  const notification = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartProcessing = (files: any[], options: any) => {
    setIsProcessing(true);
    
    // Log details about the processing options
    console.log('Processing options:', {
      files: files.map(f => f.name),
      speakerCount: options.numberOfSpeakers,
      toDoList: options.generateToDoList,
      userCount: options.userCountEnabled
    });
    
    // Show notification about what's being processed
    notification.success(
      'Processing Started', 
      `Processing ${files.length} file(s) with ${options.generateToDoList ? 'to-do list' : ''} ${options.userCountEnabled ? 'and user count' : ''}`
    );
    
    // Redirect to dashboard after processing is complete
    setTimeout(() => {
      notification.info('Processing Complete', 'Your files have been processed successfully');
      router.push('/dashboard');
      setIsProcessing(false);
    }, 3000);
  };

  return (
    <UploadContainer>
      <Header>
        <BackButton onClick={() => router.push('/dashboard')} disabled={isProcessing}>
          <ArrowLeft size={18} />
        </BackButton>
        <HeaderTitle>Upload Files</HeaderTitle>
      </Header>

      <MainContent>
        <SharedUpload 
          $variant="landing"
          isAuthenticated={true}
          onStartProcessing={handleStartProcessing}
        />
      </MainContent>
    </UploadContainer>
  );
};

export default UploadPage;