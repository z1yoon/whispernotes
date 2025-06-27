'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Users,
  CheckSquare,
  AlertTriangle,
  Copy,
  Check,
  User,
  Edit,
  Save,
  X,
  UserPlus,
  Download,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

// TypeScript interfaces

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
  task: string;
  context?: string;
  completed?: boolean;
  id?: string; // Add unique ID for editing
  // Enhanced modern productivity fields
  priority?: string;
  category?: string;
  estimated_effort?: string;
  stakeholders?: string[];
}

interface SpeakerMap {
  [key: string]: string;
}

// Styled components following admin design patterns
const TranscriptContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(90deg, #09090A 0%, #181719 37%, #36343B 100%);
  color: #FFFFFF;
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

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const BackButton = styled.button`
  background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: #FFFFFF;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 32px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  
  &:hover {
    background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #8B5CF6 100%);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const HeaderTitle = styled.h1`
  color: #FFFFFF;
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
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
  background: rgba(32, 32, 36, 0.65);
  border-radius: 24px;
  backdrop-filter: blur(14px);
  box-shadow: 0px 12px 40px rgba(0, 0, 0, 0.45);
  padding: 2rem;
  position: relative;
  border: 1px solid rgba(136, 80, 242, 0.3);
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    padding: 2px;
    border-radius: inherit;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 30%, #B0E54F 100%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    opacity: 0.4;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 1;
  
  h3 {
    color: #FFFFFF;
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
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
  padding: 1.5rem;
  background: rgba(20, 20, 24, 0.5);
  border-radius: 16px;
  border: 1px solid rgba(136, 80, 242, 0.3);
  position: relative;
  z-index: 1;
  
  .icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
    border: 2px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 8px 24px rgba(124, 58, 237, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 0.75rem;
    color: #FFFFFF;
  }
  
  .value {
    color: #FFFFFF;
    font-size: 1.5rem;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    margin: 0 0 0.5rem 0;
  }
  
  .label {
    color: #8D8D99;
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
  }
`;

const TranscriptContent = styled.div`
  max-height: 600px;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(20, 20, 24, 0.3);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #374151 0%, #4B5563 100%);
    border-radius: 4px;
  }
`;

const TranscriptSegment = styled.div`
  padding: 1.5rem 0;
  border-bottom: 1px solid rgba(136, 80, 242, 0.1);
  
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
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${props => {
    // Vivid sparkling gradient color palette
    const colors = [
      'linear-gradient(135deg, #A855F7 0%, #D946EF 100%)', // Primary Purple
      'linear-gradient(135deg, #10B981 0%, #34D399 100%)', // Success Green
      'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', // Warning Orange
      'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', // Error Red
      'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', // Indigo
      'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', // Pink
      'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)', // Cyan
      'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', // Violet
      'linear-gradient(135deg, #F97316 0%, #FB923C 100%)', // Orange
      'linear-gradient(135deg, #84CC16 0%, #A3E635 100%)', // Lime
      'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)', // Sky
      'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)', // Purple
    ];
    const speakerNum = parseInt(props.speaker.replace('SPEAKER_', '')) || 0;
    return colors[speakerNum % colors.length];
  }};
  border: 2px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const SpeakerDetails = styled.div`
  flex: 1;
  
  .name {
    color: #FFFFFF;
    font-weight: 700;
    font-size: 0.875rem;
    margin: 0 0 0.25rem 0;
  }
  
  .time {
    color: #8D8D99;
    font-size: 0.75rem;
    margin: 0;
  }
`;

const TranscriptText = styled.p`
  color: #C4C4CC;
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

const ActionItemCard = styled.div<{ isEditing?: boolean }>`
  background: rgba(20, 20, 24, 0.5);
  border: 1px solid ${props => props.isEditing ? 'rgba(136, 80, 242, 0.5)' : 'rgba(136, 80, 242, 0.3)'};
  border-radius: 12px;
  padding: 1rem;
  position: relative;
  z-index: 1;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: rgba(136, 80, 242, 0.4);
    background: rgba(20, 20, 24, 0.7);
  }
  
  /* Ensure button interactions work */
  * {
    pointer-events: auto;
  }
`;

const ActionItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
`;

const PrioritySelector = styled.select`
  background: rgba(20, 20, 24, 0.8);
  border: 1px solid rgba(136, 80, 242, 0.4);
  border-radius: 8px;
  color: #FFFFFF;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #8850F2;
  }
  
  option {
    background: #1F1F23;
    color: #FFFFFF;
  }
`;

const TaskInput = styled.textarea`
  width: 100%;
  background: rgba(20, 20, 24, 0.8);
  border: 1px solid rgba(136, 80, 242, 0.4);
  border-radius: 8px;
  color: #FFFFFF;
  padding: 0.75rem;
  font-size: 0.875rem;
  font-family: 'Inter', sans-serif;
  resize: vertical;
  min-height: 60px;
  
  &:focus {
    outline: none;
    border-color: #8850F2;
    box-shadow: 0 0 0 2px rgba(136, 80, 242, 0.2);
  }
  
  &::placeholder {
    color: #6B7280;
  }
`;

const TaskText = styled.div`
  color: #FFFFFF;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.5;
  margin: 0;
`;

const ContextText = styled.div`
  color: #8D8D99;
  font-size: 0.8rem;
  line-height: 1.4;
  margin-top: 0.5rem;
  font-style: italic;
`;

const ActionItemActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  z-index: 20;
  position: relative;
`;

const IconButton = styled.button<{ variant?: 'delete' | 'edit' }>`
  background: ${props => props.variant === 'delete' 
    ? 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
    : 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%)'
  };
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #FFFFFF;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 50;
  pointer-events: auto !important;
  box-shadow: ${props => props.variant === 'delete'
    ? '0 4px 16px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
    : '0 4px 16px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
  };
  
  &:hover {
    background: ${props => props.variant === 'delete'
      ? 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)'
      : 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #8B5CF6 100%)'
    };
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.05);
    box-shadow: ${props => props.variant === 'delete'
      ? '0 6px 20px rgba(239, 68, 68, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
      : '0 6px 20px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
    };
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 2px;
  }
`;


const AddItemButton = styled.button`
  width: 100%;
  background: rgba(32, 32, 36, 0.65);
  border: 1px solid rgba(136, 80, 242, 0.3);
  border-radius: 12px;
  color: #FFFFFF;
  padding: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 10;
  position: relative;
  pointer-events: auto !important;
  
  &:hover {
    background: rgba(136, 80, 242, 0.2);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 2px;
  }
`;

const DownloadButton = styled.button`
  background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: #FFFFFF;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  
  &:hover {
    background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #8B5CF6 100%);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(124, 58, 237, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;
const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #8D8D99;
  position: relative;
  z-index: 1;
  
  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(136, 80, 242, 0.2);
    border-top: 3px solid #8850F2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  h3 {
    color: #FFFFFF;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const CopyButton = styled.button`
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  
  &:hover {
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    border-color: rgba(255, 255, 255, 0.4);
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
  }
`;


const DialogOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const DialogContent = styled(motion.div)`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
`;

const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  
  h2 {
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
`;

const SpeakerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SpeakerItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
`;

const SpeakerLabel = styled.div`
  width: 100px;
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
`;

const SpeakerInput = styled.input`
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #1e293b;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
  }
`;

const StyledActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: 'Roboto', sans-serif;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.variant === 'primary' ? `
    background: rgba(32, 32, 36, 0.65);
    color: #FFFFFF;
    border: 1px solid rgba(136, 80, 242, 0.3);
    
    &:hover {
      background: rgba(136, 80, 242, 0.2);
      transform: translateY(-1px);
    }
  ` : `
    background: rgba(32, 32, 36, 0.65);
    color: #FFFFFF;
    border: 1px solid rgba(136, 80, 242, 0.3);
    
    &:hover {
      background: rgba(136, 80, 242, 0.2);
      transform: translateY(-1px);
    }
  `}
`;

const TooltipText = styled.div`
  position: absolute;
  bottom: 100%;
  right: 0;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
`;

const TooltipWrapper = styled.div`
  position: relative;
  
  &:hover ${TooltipText} {
    opacity: 1;
  }
`;

// Enhanced Speaker Editor Modal following admin design patterns
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
`;

const ModalContent = styled(motion.div)`
  background: rgba(32, 32, 36, 0.95);
  border-radius: 24px;
  backdrop-filter: blur(14px);
  box-shadow: 0px 12px 40px rgba(0, 0, 0, 0.6);
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(136, 80, 242, 0.3);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    padding: 2px;
    border-radius: inherit;
    background: linear-gradient(135deg, #374151 0%, #4B5563 30%, #06B6D4 100%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    pointer-events: none;
    opacity: 0.6;
  }
`;

const ModalHeader = styled.div`
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid rgba(136, 80, 242, 0.2);
  position: relative;
  z-index: 1;

  .modal-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;

    h2 {
      color: #FFFFFF;
      font-size: 1.5rem;
      font-weight: 700;
      font-family: 'Inter', sans-serif;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
  }

  .modal-description {
    color: #8D8D99;
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0;
  }
`;

const CloseButton = styled.button`
  background: rgba(20, 20, 24, 0.5);
  border: 1px solid rgba(136, 80, 242, 0.3);
  color: #8D8D99;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(136, 80, 242, 0.2);
    border-color: rgba(136, 80, 242, 0.4);
    color: #FFFFFF;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem 2rem;
  max-height: 400px;
  overflow-y: auto;
  position: relative;
  z-index: 1;

  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(20, 20, 24, 0.3);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(136, 80, 242, 0.5);
    border-radius: 3px;
  }
`;

const SpeakerEditorList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SpeakerEditorItem = styled.div`
  background: rgba(20, 20, 24, 0.5);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(136, 80, 242, 0.4);
    background: rgba(20, 20, 24, 0.7);
  }
`;

const SpeakerEditorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const SpeakerAvatarLarge = styled.div<SpeakerAvatarProps>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => {
    // More distinguishable color palette in purple family
    const gradients = [
      'linear-gradient(135deg, #374151 0%, #4B5563 100%)', // Modern gray
      'linear-gradient(135deg, #1F2937 0%, #374151 100%)', // Dark gray
      'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)', // Cyan
      'linear-gradient(135deg, #475569 0%, #64748B 100%)', // Slate
      'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', // Deep slate
      'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)', // Cool gray
      'linear-gradient(135deg, #111827 0%, #1F2937 100%)', // Very dark gray
      'linear-gradient(135deg, #059669 0%, #10B981 100%)', // Emerald
      'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)', // Red
      'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', // Amber
    ];
    const speakerNum = parseInt(props.speaker.replace('SPEAKER_', '')) || 0;
    return gradients[speakerNum % gradients.length];
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const SpeakerEditorInfo = styled.div`
  flex: 1;

  .speaker-id {
    color: #8D8D99;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.25rem;
  }

  .current-name {
    color: #FFFFFF;
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }
`;

const SpeakerNameInput = styled.input`
  width: 100%;
  padding: 1rem 1.25rem;
  background: rgba(30, 30, 34, 0.8);
  border: 1px solid rgba(136, 80, 242, 0.3);
  border-radius: 12px;
  color: #FFFFFF;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s ease;

  &::placeholder {
    color: #6B7280;
  }

  &:focus {
    outline: none;
    border-color: #8850F2;
    box-shadow: 0 0 0 3px rgba(136, 80, 242, 0.15);
    background: rgba(30, 30, 34, 0.9);
  }

  &:hover:not(:focus) {
    border-color: rgba(136, 80, 242, 0.4);
  }
`;

const ModalFooter = styled.div`
  padding: 1.5rem 2rem 2rem 2rem;
  border-top: 1px solid rgba(136, 80, 242, 0.2);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  position: relative;
  z-index: 1;
`;

const ModalButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.875rem 1.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
  justify-content: center;
  
  ${props => props.variant === 'primary' ? `
    background: linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #8B5CF6 100%);
    color: white;
    border: none;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 25px rgba(124, 58, 237, 0.4);
    }

    &:active {
      transform: translateY(0);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  ` : `
    background: rgba(20, 20, 24, 0.5);
    color: #C4C4CC;
    border: 1px solid rgba(136, 80, 242, 0.3);
    
    &:hover {
      background: rgba(136, 80, 242, 0.1);
      border-color: rgba(136, 80, 242, 0.4);
      color: #FFFFFF;
    }
  `}
`;

const ChangesIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #FCD34D;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: auto;

  .indicator-dot {
    width: 6px;
    height: 6px;
    background: #FCD34D;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const PriorityBadge = styled.span<{ priority: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  
  ${props => {
    const priority = props.priority;
    // Handle emoji-based priorities from modern prompt
    if (priority.includes('🔥') || priority === 'critical' || priority === 'high') {
      return `
        background: rgba(239, 68, 68, 0.1);
        color: #F87171;
        border-color: rgba(239, 68, 68, 0.3);
      `;
    } else if (priority.includes('⚡') || priority === 'important') {
      return `
        background: rgba(251, 191, 36, 0.1);
        color: #FCD34D;
        border-color: rgba(251, 191, 36, 0.3);
      `;
    } else if (priority.includes('📋') || priority === 'medium') {
      return `
        background: rgba(136, 80, 242, 0.1);
        color: #8850F2;
        border-color: rgba(136, 80, 242, 0.3);
      `;
    } else if (priority.includes('💡') || priority === 'low') {
      return `
        background: rgba(34, 197, 94, 0.1);
        color: #4ADE80;
        border-color: rgba(34, 197, 94, 0.3);
      `;
    } else {
      return `
        background: rgba(107, 114, 128, 0.1);
        color: #9CA3AF;
        border-color: rgba(107, 114, 128, 0.3);
      `;
    }
  }}
`;

const CategoryBadge = styled.span<{ category: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  border: 1px solid;
  
  ${props => {
    switch (props.category) {
      case 'action':
        return `
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
          border-color: rgba(16, 185, 129, 0.3);
        `;
      case 'follow-up':
        return `
          background: rgba(59, 130, 246, 0.1);
          color: #3B82F6;
          border-color: rgba(59, 130, 246, 0.3);
        `;
      case 'decision':
        return `
          background: rgba(168, 85, 247, 0.1);
          color: #A855F7;
          border-color: rgba(168, 85, 247, 0.3);
        `;
      case 'research':
        return `
          background: rgba(245, 158, 11, 0.1);
          color: #F59E0B;
          border-color: rgba(245, 158, 11, 0.3);
        `;
      case 'communication':
        return `
          background: rgba(236, 72, 153, 0.1);
          color: #EC4899;
          border-color: rgba(236, 72, 153, 0.3);
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.1);
          color: #9CA3AF;
          border-color: rgba(107, 114, 128, 0.3);
        `;
    }
  }}
`;

const TaskMetadata = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0.5rem 0;
  flex-wrap: wrap;
`;

// Move SpeakerNameEditor outside the main component to prevent re-creation on every render
const SpeakerNameEditor = React.memo(({ 
  speakerMap, 
  originalSpeakerMap, 
  onSpeakerNameChange, 
  onCancel, 
  onSave, 
  hasChanges,
  getSpeakerInitials 
}: {
  speakerMap: SpeakerMap;
  originalSpeakerMap: SpeakerMap;
  onSpeakerNameChange: (speaker: string, name: string) => void;
  onCancel: () => void;
  onSave: () => void;
  hasChanges: boolean;
  getSpeakerInitials: (speakerName: string) => string;
}) => (
  <ModalOverlay
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={(e) => {
      // Close modal when clicking outside content
      if (e.target === e.currentTarget) {
        onCancel();
      }
    }}
  >
    <ModalContent
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      <ModalHeader>
        <div className="modal-title">
          <h2>
            <UserPlus size={20} />
            Edit Speaker Names
          </h2>
          <CloseButton onClick={onCancel}>
            <X size={16} />
          </CloseButton>
        </div>
        <p className="modal-description">
          Edit speaker names to make the transcript more readable. These changes will be applied to all transcript segments.
        </p>
      </ModalHeader>
      
      <ModalBody>
        <SpeakerEditorList>
          {Object.keys(speakerMap).map(speaker => (
            <SpeakerEditorItem key={speaker}>
              <SpeakerEditorHeader>
                <SpeakerAvatarLarge speaker={speaker}>
                  {getSpeakerInitials(speakerMap[speaker])}
                </SpeakerAvatarLarge>
                <SpeakerEditorInfo>
                  <div className="speaker-id">{speaker}</div>
                  <div className="current-name">
                    {originalSpeakerMap[speaker] || speaker}
                  </div>
                </SpeakerEditorInfo>
              </SpeakerEditorHeader>
              <SpeakerNameInput
                type="text"
                value={speakerMap[speaker] || ''}
                onChange={(e) => onSpeakerNameChange(speaker, e.target.value)}
                placeholder="Enter speaker name"
                autoComplete="off"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                data-form-type="other"
              />
            </SpeakerEditorItem>
          ))}
        </SpeakerEditorList>
      </ModalBody>
      
      <ModalFooter>
        {hasChanges && (
          <ChangesIndicator>
            <div className="indicator-dot"></div>
            Unsaved changes
          </ChangesIndicator>
        )}
        <ModalButton variant="secondary" onClick={onCancel}>
          Cancel
        </ModalButton>
        <ModalButton 
          variant="primary" 
          onClick={onSave}
          disabled={!hasChanges}
          style={{ 
            opacity: hasChanges ? 1 : 0.6,
            cursor: hasChanges ? 'pointer' : 'not-allowed'
          }}
        >
          <Save size={16} />
          Save Changes
        </ModalButton>
      </ModalFooter>
    </ModalContent>
  </ModalOverlay>
));

SpeakerNameEditor.displayName = 'SpeakerNameEditor';

const TranscriptPage = () => {
  const router = useRouter();
  const params = useParams();
  const fileId = params?.fileId;
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSegment, setCopiedSegment] = useState<number | null>(null);
  const [showSpeakerEditor, setShowSpeakerEditor] = useState(false);
  const [speakerMap, setSpeakerMap] = useState<SpeakerMap>({});
  const [originalSpeakerMap, setOriginalSpeakerMap] = useState<SpeakerMap>({});
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [editingItems, setEditingItems] = useState<Set<string>>(new Set());
  const [hasUnsavedTodos, setHasUnsavedTodos] = useState(false);
  const [savingTodos, setSavingTodos] = useState(false);

  useEffect(() => {
    if (fileId) {
      fetchTranscriptData();
    }
  }, [fileId]);

  // Generate speaker map from transcript segments with memoization
  const memoizedSpeakerMap = useMemo(() => {
    if (!transcriptData?.segments) return {};
    
    const uniqueSpeakers = new Set<string>();
    const tempSpeakerMap: SpeakerMap = {};
    
    // Collect unique speakers
    transcriptData.segments.forEach(segment => {
      uniqueSpeakers.add(segment.speaker);
    });
    
    // Create initial speaker map
    uniqueSpeakers.forEach(speaker => {
      // Find the first segment with this speaker to get the speaker_name
      const segment = transcriptData.segments.find(seg => seg.speaker === speaker);
      tempSpeakerMap[speaker] = segment?.speaker_name || speaker;
    });
    
    return tempSpeakerMap;
  }, [transcriptData?.segments]);

  // Update speaker maps when memoized map changes
  useEffect(() => {
    if (Object.keys(memoizedSpeakerMap).length > 0) {
      setSpeakerMap(memoizedSpeakerMap);
      setOriginalSpeakerMap({...memoizedSpeakerMap});
    }
  }, [memoizedSpeakerMap]);

  const fetchTranscriptData = async () => {
    try {
      setLoading(true);
      
      // Fetch transcription data from API
      const response = await fetch(`/api/transcripts/${fileId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load transcript');
      }
      
      const data = await response.json();
      
      // Check if we have proper segment data
      if (!data.segments || !Array.isArray(data.segments) || data.segments.length === 0) {
        setError('No transcript segments found');
        setLoading(false);
        return;
      }
      
      // Format data for our UI
      const formattedData = {
        filename: data.filename || `Transcription ${fileId}`,
        duration: data.duration || 0,
        participant_count: data.participant_count || 
          (data.speaker_names ? data.speaker_names.length : 2),
        language: data.language || 'en',
        segments: data.segments.map((segment: any, index: number) => ({
          id: segment.id || index + 1,
          speaker: segment.speaker || `SPEAKER_${index % 2}`,
          speaker_name: segment.speaker_name || segment.speaker || `Speaker ${index % 2 + 1}`,
          start: segment.start || 0,
          end: segment.end || 0,
          text: segment.text || ''
        }))
      };
      
      setTranscriptData(formattedData);
      
      // Fetch action items from LLM service
      await fetchActionItems();

      setLoading(false);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      setError(error instanceof Error ? error.message : 'Failed to load transcript data');
      setLoading(false);
      toast.error('Failed to load transcript');
    }
  };
  
  const fetchActionItems = async () => {
    try {
      setLoadingTodos(true);
      
      // Fetch LLM analysis data that contains action items
      const response = await fetch(`/api/analysis/${fileId}`);
      
      if (response.ok) {
        const analysisData = await response.json();
        
        // Fix: Correct the path to access action items
        if (analysisData.analysis?.action_items) {
          const todos = analysisData.analysis.action_items.map((item: any) => ({
            task: item.task || 'Unknown task',
            assignee: item.assignee,
            deadline: item.deadline,
            priority: item.priority || 'Medium',
            context: item.context,
            category: item.category,
            completed: false
          }));
          setActionItems(todos);
        } else {
          // No action items found, set empty array
          setActionItems([]);
        }
      } else {
        // If LLM analysis fails, show empty state
        console.warn('LLM analysis not available for this transcript');
        setActionItems([]);
      }
    } catch (error) {
      console.error('Error fetching action items:', error);
      // Don't show error toast for this - just show empty state
      setActionItems([]);
    } finally {
      setLoadingTodos(false);
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

  // Memoize the speaker name change handler to prevent recreation on every render
  const handleSpeakerNameChange = React.useCallback((speaker: string, name: string) => {
    setSpeakerMap(prev => ({
      ...prev,
      [speaker]: name
    }));
  }, []);

  // Memoize the getSpeakerInitials function
  const getSpeakerInitials = React.useCallback((speakerName: string): string => {
    if (speakerName && speakerName.includes('(')) {
      return speakerName.split('(')[0].trim().split(' ').map((n: string) => n[0]).join('');
    }
    return speakerName?.split(' ').map((n: string) => n[0]).join('') || 'S';
  }, []);

  // Check if there are any changes to show the changes indicator - memoized
  const hasChanges = React.useMemo(() => 
    Object.keys(speakerMap).some(key => speakerMap[key] !== originalSpeakerMap[key]),
    [speakerMap, originalSpeakerMap]
  );

  const handleUpdateSpeakerNames = async () => {
    try {
      // Check if there are any changes
      const hasChanges = Object.keys(speakerMap).some(
        key => speakerMap[key] !== originalSpeakerMap[key]
      );
      
      if (!hasChanges) {
        setShowSpeakerEditor(false);
        return;
      }
      
      // In a real implementation, send the update to the backend
      if (!fileId) {
        throw new Error('Missing transcript ID');
      }
      
      // Send speaker updates to backend
      const response = await fetch(`/api/transcripts/${fileId}/speakers`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          speaker_mapping: speakerMap 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update speakers: ${response.status}`);
      }

      const result = await response.json();
      console.log('Speaker names updated successfully:', result);
      
      // Update the local state only after successful backend update
      if (transcriptData) {
        const updatedSegments = transcriptData.segments.map(segment => ({
          ...segment,
          speaker_name: speakerMap[segment.speaker] || segment.speaker_name
        }));
        
        setTranscriptData({
          ...transcriptData,
          segments: updatedSegments
        });
        
        setOriginalSpeakerMap({...speakerMap});
        setShowSpeakerEditor(false);
        toast.success('Speaker names updated successfully');
      }
    } catch (error) {
      console.error('Error updating speaker names:', error);
      toast.error('Failed to update speaker names');
    }
  };

  const handleCancelSpeakerEdit = () => {
    setSpeakerMap({...originalSpeakerMap});
    setShowSpeakerEditor(false);
  };

  // Action item management functions
  const generateItemId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleEditItem = (index: number) => {
    console.log('Edit item clicked for index:', index);
    const itemId = actionItems[index].id || generateItemId();
    if (!actionItems[index].id) {
      // Add ID to item if it doesn't have one
      setActionItems(prev => prev.map((item, i) => 
        i === index ? { ...item, id: itemId } : item
      ));
    }
    setEditingItems(prev => new Set([...prev, itemId]));
  };

  const handleSaveItem = (index: number) => {
    console.log('Save item clicked for index:', index);
    const item = actionItems[index];
    if (item.id) {
      setEditingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id!);
        return newSet;
      });
    }
    setHasUnsavedTodos(true);
  };

  const handleCancelEdit = (index: number) => {
    console.log('Cancel edit clicked for index:', index);
    const item = actionItems[index];
    if (item.id) {
      setEditingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id!);
        return newSet;
      });
    }
  };

  const handleUpdateTask = (index: number, newTask: string) => {
    setActionItems(prev => prev.map((item, i) => 
      i === index ? { ...item, task: newTask } : item
    ));
    setHasUnsavedTodos(true);
  };

  const handleUpdateContext = (index: number, newContext: string) => {
    setActionItems(prev => prev.map((item, i) => 
      i === index ? { ...item, context: newContext } : item
    ));
    setHasUnsavedTodos(true);
  };

  const handleDownloadResults = () => {
    if (!transcriptData || !fileId) {
      toast.error('No data available to download');
      return;
    }

    // Create comprehensive download data
    const downloadData = {
      metadata: {
        filename: transcriptData.filename,
        duration: transcriptData.duration,
        participant_count: transcriptData.participant_count,
        language: transcriptData.language,
        downloaded_at: new Date().toISOString()
      },
      speakers: Object.entries(speakerMap).map(([originalName, displayName]) => ({
        original_name: originalName,
        display_name: displayName
      })),
      transcript: transcriptData.segments.map(segment => ({
        speaker: segment.speaker_name,
        start_time: segment.start,
        end_time: segment.end,
        text: segment.text
      })),
      action_items: actionItems.map((item, index) => ({
        id: index + 1,
        task: item.task,
        context: item.context || '',
        completed: item.completed || false
      }))
    };

    // Create and download JSON file
    const jsonString = JSON.stringify(downloadData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${transcriptData.filename.replace(/\.[^/.]+$/, '')}_complete_results.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Results downloaded successfully!');
  };

  const handleAddNewItem = () => {
    console.log('Add new item clicked');
    const newItem: ActionItem = {
      id: generateItemId(),
      task: '',
      completed: false
    };
    setActionItems(prev => [...prev, newItem]);
    setEditingItems(prev => new Set([...prev, newItem.id!]));
    setHasUnsavedTodos(true);
  };

  const handleDeleteItem = (index: number) => {
    console.log('Delete item clicked for index:', index);
    if (window.confirm('Are you sure you want to delete this action item?')) {
      setActionItems(prev => prev.filter((_, i) => i !== index));
      setHasUnsavedTodos(true);
    }
  };

  const handleSaveAllTodos = async () => {
    if (!fileId) {
      toast.error('Missing transcript ID');
      return;
    }

    try {
      setSavingTodos(true);
      
      // Save both speaker names and action items to backend/MinIO
      const saveData = {
        speaker_mapping: speakerMap,
        action_items: actionItems.filter(item => item.task.trim() !== ''), // Remove empty items
        updated_at: new Date().toISOString()
      };

      const response = await fetch(`/api/transcripts/${fileId}/save-edits`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      if (!response.ok) {
        throw new Error(`Failed to save changes: ${response.status}`);
      }

      const result = await response.json();
      console.log('Changes saved successfully:', result);
      
      // Clear editing states
      setEditingItems(new Set());
      setHasUnsavedTodos(false);
      setOriginalSpeakerMap({...speakerMap});
      
      toast.success('All changes saved successfully!');
      
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setSavingTodos(false);
    }
  };

  // Auto-save functionality
  const handleAutoSave = async () => {
    if (hasUnsavedTodos || hasUnsavedChanges) {
      await handleSaveAllTodos();
    }
  };

  // Auto-save when leaving editing mode
  useEffect(() => {
    const handleAutoSaveOnEdit = () => {
      if (editingItems.size === 0 && hasUnsavedTodos) {
        handleAutoSave();
      }
    };
    handleAutoSaveOnEdit();
  }, [editingItems.size, hasUnsavedTodos]);

  // Check if there are any changes to show the changes indicator
  const hasUnsavedChanges = Object.keys(speakerMap).some(
    key => speakerMap[key] !== originalSpeakerMap[key]
  );

  // Auto-save when speaker changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timeoutId = setTimeout(() => {
        handleAutoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity
      
      return () => clearTimeout(timeoutId);
    }
  }, [hasUnsavedChanges]);

  return (
    <TranscriptContainer>
      <Header>
        <HeaderLeft>
          <BackButton onClick={() => router.push('/transcripts')}>
            <ArrowLeft size={18} />
          </BackButton>
          <HeaderTitle>{transcriptData?.filename || 'Transcript'}</HeaderTitle>
        </HeaderLeft>
        <HeaderActions>
          <DownloadButton onClick={handleDownloadResults}>
            <Download size={16} />
            Download Results
          </DownloadButton>
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
                <TooltipWrapper>
                  <StyledActionButton variant="secondary" onClick={() => setShowSpeakerEditor(true)}>
                    <Edit size={16} />
                    Edit Speakers
                  </StyledActionButton>
                  <TooltipText>Update speaker names to identify participants</TooltipText>
                </TooltipWrapper>
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
              
              {loadingTodos ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ width: '32px', height: '32px', border: '2px solid rgba(136, 80, 242, 0.2)', borderTop: '2px solid #8850F2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                  <p style={{ color: '#8D8D99', fontSize: '0.875rem' }}>Generating action items...</p>
                </div>
              ) : (
                <>
                  <ActionItemsList>
                    {actionItems.map((item: ActionItem, index: number) => {
                      const isEditing = item.id && editingItems.has(item.id);
                      return (
                        <ActionItemCard key={item.id || index} isEditing={isEditing}>
                          <ActionItemHeader>
                            <ActionItemActions>
                              {isEditing ? (
                                <>
                                  <IconButton 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSaveItem(index);
                                    }} 
                                    title="Save"
                                    type="button"
                                  >
                                    <Save size={14} />
                                  </IconButton>
                                  <IconButton 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCancelEdit(index);
                                    }} 
                                    title="Cancel"
                                    type="button"
                                  >
                                    <X size={14} />
                                  </IconButton>
                                </>
                              ) : (
                                <>
                                  <IconButton 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleEditItem(index);
                                    }} 
                                    title="Edit"
                                    type="button"
                                  >
                                    <Edit size={14} />
                                  </IconButton>
                                  <IconButton 
                                    variant="delete"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteItem(index);
                                    }} 
                                    title="Delete"
                                    type="button"
                                  >
                                    <X size={14} />
                                  </IconButton>
                                </>
                              )}
                            </ActionItemActions>
                          </ActionItemHeader>
                          
                          {isEditing ? (
                            <>
                              <TaskInput
                                value={item.task}
                                onChange={(e) => handleUpdateTask(index, e.target.value)}
                                placeholder="What needs to be done?"
                                autoFocus
                              />
                              <TaskInput
                                value={item.context || ''}
                                onChange={(e) => handleUpdateContext(index, e.target.value)}
                                placeholder="Context or additional details..."
                                style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}
                              />
                            </>
                          ) : (
                            <>
                              <TaskText>{item.task || 'Empty task'}</TaskText>
                              {item.context && (
                                <ContextText>{item.context}</ContextText>
                              )}
                            </>
                          )}
                        </ActionItemCard>
                      );
                    })}
                  </ActionItemsList>
                  
                  {actionItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#8D8D99' }}>
                      <CheckSquare size={32} style={{ marginBottom: '1rem' }} />
                      <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                        No action items found in this transcript
                      </p>
                    </div>
                  )}
                  
                  <AddItemButton 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddNewItem();
                    }}
                    type="button"
                  >
                    <Plus size={16} />
                    Add Action Item
                  </AddItemButton>
                  
                </>
              )}
            </Card>
          </Sidebar>
        </ContentGrid>
      </MainContent>


      {showSpeakerEditor && (
        <SpeakerNameEditor
          speakerMap={speakerMap}
          originalSpeakerMap={originalSpeakerMap}
          onSpeakerNameChange={handleSpeakerNameChange}
          onCancel={handleCancelSpeakerEdit}
          onSave={handleUpdateSpeakerNames}
          hasChanges={hasChanges}
          getSpeakerInitials={getSpeakerInitials}
        />
      )}
    </TranscriptContainer>
  );
};

export default TranscriptPage;