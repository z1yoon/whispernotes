'use client'

import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(90deg, #09090A 0%, #181719 37%, #36343B 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(136, 80, 242, 0.2);
  border-top-color: #8850F2;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 1rem;
`;

const LoadingText = styled.div`
  color: #FFFFFF;
  font-size: 1rem;
  font-weight: 600;
  opacity: 0.8;
`;

const AppName = styled.div`
  position: absolute;
  top: 2rem;
  left: 2rem;
  font-family: 'Roboto', sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  background: linear-gradient(90deg, #A29AF5 0%, #DEE0FC 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.5px;
`;

interface LoadingProps {
  message?: string;
}

export function Loading({ message = "Loading..." }: LoadingProps) {
  return (
    <LoadingContainer>
      <AppName>WhisperNotes</AppName>
      <LoadingSpinner />
      <LoadingText>{message}</LoadingText>
    </LoadingContainer>
  );
}

export default Loading;