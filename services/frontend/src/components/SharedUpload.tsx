'use client'

import React, { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileVideo, 
  FileAudio, 
  X, 
  Users,
  Minus,
  Plus,
  Zap
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useNotification } from './NotificationProvider';
import axios from 'axios';

// TypeScript interfaces
interface FileData {
  id: number;
  file: File;
  name: string;
  size: number;
  type: 'video' | 'audio';
  status: 'ready' | 'uploading' | 'completed' | 'error';
  progress: number;
}

interface ProcessingOptions {
  speakerDiarization: boolean;
  numberOfSpeakers: number;
  speakerNames: string[];
}

interface SharedUploadProps {
  $variant?: 'landing' | 'page';
  isAuthenticated?: boolean;
  onStartProcessing?: (files: FileData[], options: ProcessingOptions) => void;
  onUploadClick?: (e: React.MouseEvent) => void;
  className?: string;
}

// Styled Components
const UploadContainer = styled(motion.div)<{ $variant: 'landing' | 'page' }>`
  width: ${props => props.$variant === 'landing' ? '680px' : '100%'};
  max-width: ${props => props.$variant === 'landing' ? '90%' : 'none'};
  background: rgba(32, 32, 36, 0.65);
  border-radius: 24px;
  backdrop-filter: blur(14px);
  box-shadow: 0px 12px 40px rgba(0, 0, 0, 0.45);
  padding: 2rem;
  position: relative;
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
`;

const DropZone = styled.div<{ $isDragActive: boolean; $isAuthenticated?: boolean; $variant: 'landing' | 'page' }>`
  border: 2px dashed ${props => props.$isDragActive ? '#8850F2' : 'rgba(136, 80, 242, 0.4)'};
  border-radius: 16px;
  padding: ${props => props.$variant === 'landing' ? '4rem 2rem' : '3rem 2rem'};
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.$isDragActive ? 'rgba(136, 80, 242, 0.1)' : 'transparent'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: ${props => props.$variant === 'landing' ? '300px' : '200px'};
  margin-bottom: ${props => props.$isAuthenticated ? '1.5rem' : '0'};
  
  &:hover {
    border-color: rgba(136, 80, 242, 0.6);
    background: rgba(136, 80, 242, 0.05);
  }

  .upload-badge {
    width: ${props => props.$variant === 'landing' ? '96px' : '80px'};
    height: ${props => props.$variant === 'landing' ? '96px' : '80px'};
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(168, 85, 247, 0.35);
    margin-bottom: 24px;
  }

  .upload-title {
    font-size: ${props => props.$variant === 'landing' ? '1.5rem' : '1.25rem'};
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: 0.5rem;
  }

  .upload-subtitle {
    font-size: 0.875rem;
    color: #8D8D99;
    margin: 0;
    font-weight: 600;
  }

  .upload-info {
    font-size: 0.75rem;
    color: #8D8D99;
    margin-top: 1rem;
    font-weight: 700;
  }
`;

const FilesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const FileItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(20, 20, 24, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const FileIcon = styled.div<{ $type: 'video' | 'audio' }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${props => props.$type === 'video' ? '#8850F2' : '#10B981'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FileName = styled.div`
  color: #FFFFFF;
  font-size: 0.875rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
`;

const FileMeta = styled.div`
  color: #8D8D99;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const RemoveButton = styled.button`
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 8px;
  padding: 0.5rem;
  color: #F87171;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(248, 113, 113, 0.2);
    border-color: rgba(248, 113, 113, 0.3);
  }
`;

const ProcessingOptions = styled.div`
  margin-bottom: 1.5rem;
`;

const OptionsTitle = styled.h3`
  color: #FFFFFF;
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const OptionGroup = styled.div`
  margin-bottom: 1rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #FFFFFF;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(136, 80, 242, 0.1);
  }
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #8850F2;
`;

const SpeakerControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(20, 20, 24, 0.5);
  border-radius: 8px;
`;

const SpeakerButton = styled.button<{ disabled?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${props => props.disabled ? 'rgba(255, 255, 255, 0.05)' : 'rgba(136, 80, 242, 0.2)'};
  border: 1px solid ${props => props.disabled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(136, 80, 242, 0.3)'};
  color: ${props => props.disabled ? '#71717A' : '#A855F7'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: rgba(136, 80, 242, 0.3);
    border-color: rgba(136, 80, 242, 0.4);
  }
`;

const ProcessButton = styled(motion.button)<{ disabled?: boolean }>`
  width: 100%;
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
  border: none;
  border-radius: 12px;
  padding: 1rem;
  color: #FFFFFF;
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.7 : 1};
  transition: all 0.3s ease;
`;

const FileFormats = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  margin: 1rem 0;
`;

const FormatBadge = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #FFFFFF;
`;

const ProgressOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 24px;
  padding: 2rem;
`;

const ProgressIndicator = styled.div`
  width: 80%;
  max-width: 400px;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin: 1.5rem 0;
  position: relative;
`;

const ProgressBar = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(90deg, #8850F2 0%, #A855F7 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  color: #FFFFFF;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
`;

const StatusText = styled.div`
  color: #A1A1AA;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  text-align: center;
`;

export const SharedUpload: React.FC<SharedUploadProps> = ({
  $variant = 'page',
  isAuthenticated = true,
  onStartProcessing,
  onUploadClick,
  className
}) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const fileIdCounter = useRef(0);
  const notification = useNotification();
  
  const [options, setOptions] = useState<ProcessingOptions>({
    speakerDiarization: true,
    numberOfSpeakers: 2,
    speakerNames: ['Speaker 1', 'Speaker 2']
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => {
      const isVideo = file.type.includes('video');
      const isAudio = file.type.includes('audio');
      const fileType: 'video' | 'audio' = isVideo ? 'video' : isAudio ? 'audio' : 'video';
      
      return {
        id: fileIdCounter.current++,
        file,
        name: file.name,
        size: file.size,
        type: fileType,
        status: 'ready' as const,
        progress: 0
      };
    });
    
    setFiles(prev => [...prev, ...newFiles]);
    notification.success(`Files Added`, `${acceptedFiles.length} file(s) added successfully`);
  }, [notification]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac']
    },
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
  });

  const removeFile = (fileId: number) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const updateSpeakerCount = (count: number) => {
    const newCount = Math.max(1, Math.min(10, count));
    setOptions(prev => ({
      ...prev,
      numberOfSpeakers: newCount,
      speakerNames: Array.from({ length: newCount }, (_, i) => 
        prev.speakerNames[i] || `Speaker ${i + 1}`
      )
    }));
  };

  const handleStartProcessing = async () => {
    if (files.length === 0) {
      notification.error("No Files", "Please upload at least one file to process");
      return;
    }
    
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus('Initializing upload...');
    
    try {
      // Simulate multipart upload with progress
      let overallProgress = 0;
      
      for (const file of files) {
        // For each file, we'd handle a real upload in a production environment
        setProcessingStatus(`Uploading ${file.name}...`);
        
        // Simulate chunked upload with progress
        for (let i = 0; i < 100; i += 5) {
          await new Promise(resolve => setTimeout(resolve, 50));
          setProcessingProgress(i);
        }
        
        overallProgress += 1;
        setProcessingProgress((overallProgress / files.length) * 100);
      }
      
      // After all files are uploaded, process them
      setProcessingStatus('Processing audio for transcription...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProcessingStatus('Analyzing speakers...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProcessingStatus('Generating diarized transcript...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProcessingProgress(100);
      setProcessingStatus('Processing complete!');
      
      // Store in localStorage for demonstration (in production would use API)
      const processedData = {
        files: files.map(f => ({ name: f.name, type: f.type, size: f.size })),
        options: options,
        timestamp: new Date().toISOString(),
        transcription: {
          status: 'completed',
          speakers: options.numberOfSpeakers,
          speakerNames: options.speakerNames
        }
      };
      
      const history = JSON.parse(localStorage.getItem('transcriptionHistory') || '[]');
      history.push(processedData);
      localStorage.setItem('transcriptionHistory', JSON.stringify(history));
      
      // Show success notification
      notification.success(
        'Processing Complete', 
        `${files.length} file${files.length > 1 ? 's' : ''} processed with ${options.numberOfSpeakers} speaker diarization`
      );
      
      // Call the onStartProcessing callback if provided
      if (onStartProcessing) {
        onStartProcessing(files, options);
      }
      
      // Wait a moment before redirecting
      setTimeout(() => {
        setIsProcessing(false);
      }, 1500);
      
    } catch (error) {
      console.error('Processing error:', error);
      notification.error('Processing Failed', 'There was an error processing your files');
      setIsProcessing(false);
    }
  };

  return (
    <UploadContainer
      $variant={$variant}
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Processing overlay */}
      <AnimatePresence>
        {isProcessing && (
          <ProgressOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ProgressText>Processing your files</ProgressText>
            <ProgressIndicator>
              <ProgressBar $progress={processingProgress} />
            </ProgressIndicator>
            <StatusText>{processingStatus}</StatusText>
          </ProgressOverlay>
        )}
      </AnimatePresence>
      
      <DropZone
        {...(!isAuthenticated ? { onClick: onUploadClick } : getRootProps())}
        $isDragActive={isDragActive}
        $isAuthenticated={isAuthenticated}
        $variant={$variant}
      >
        {isAuthenticated && <input {...getInputProps()} />}
        <div className="upload-badge">
          <Upload size={$variant === 'landing' ? 40 : 32} color="white" />
        </div>
        <div className="upload-title">
          {isAuthenticated && isDragActive ? 'Drop files here' : 
           $variant === 'landing' ? 'Upload Your Video' : 'Drag & Drop Files'}
        </div>
        <div className="upload-subtitle">
          {$variant === 'landing' ? 
            'Drag & drop or click to browse files' : 
            'Upload your audio or video files for AI-powered transcription and speaker diarization'}
        </div>
        
        {$variant === 'page' && (
          <FileFormats>
            <FormatBadge>MP4</FormatBadge>
            <FormatBadge>MOV</FormatBadge>
            <FormatBadge>AVI</FormatBadge>
            <FormatBadge>WebM</FormatBadge>
            <FormatBadge>MP3</FormatBadge>
            <FormatBadge>WAV</FormatBadge>
            <FormatBadge>M4A</FormatBadge>
            <FormatBadge>FLAC</FormatBadge>
          </FileFormats>
        )}
        
        <div className="upload-info">
          {$variant === 'landing' ? 
            'MP4 · AVI · MOV · MP3 · WAV · No size limit' : 
            'Maximum file size: 5GB per file'}
        </div>
      </DropZone>

      <AnimatePresence>
        {isAuthenticated && files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <FilesList>
              {files.map((file, index) => (
                <FileItem
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <FileIcon $type={file.type}>
                    {file.type === 'video' ? (
                      <FileVideo size={20} />
                    ) : (
                      <FileAudio size={20} />
                    )}
                  </FileIcon>
                  
                  <FileInfo>
                    <FileName>{file.name}</FileName>
                    <FileMeta>
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{file.type}</span>
                    </FileMeta>
                  </FileInfo>
                  
                  <RemoveButton onClick={() => removeFile(file.id)}>
                    <X size={16} />
                  </RemoveButton>
                </FileItem>
              ))}
            </FilesList>

            <ProcessingOptions>
              <OptionsTitle>
                <Users size={20} />
                Speaker Diarization
              </OptionsTitle>
              
              <SpeakerControls>
                <SpeakerButton 
                  onClick={() => updateSpeakerCount(options.numberOfSpeakers - 1)}
                  disabled={options.numberOfSpeakers <= 1}
                >
                  <Minus size={14} />
                </SpeakerButton>
                <span style={{ color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 700 }}>
                  {options.numberOfSpeakers}
                </span>
                <SpeakerButton 
                  onClick={() => updateSpeakerCount(options.numberOfSpeakers + 1)}
                  disabled={options.numberOfSpeakers >= 10}
                >
                  <Plus size={14} />
                </SpeakerButton>
                <span style={{ color: '#71717A', fontSize: '0.75rem', fontWeight: 700 }}>speakers</span>
              </SpeakerControls>
            </ProcessingOptions>

            <ProcessButton
              onClick={handleStartProcessing}
              disabled={files.length === 0 || isProcessing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Zap size={20} />
              {isProcessing ? 'Processing...' : `Start Processing (${options.numberOfSpeakers} speakers)`}
            </ProcessButton>
          </motion.div>
        )}
      </AnimatePresence>
    </UploadContainer>
  );
};

export default SharedUpload;