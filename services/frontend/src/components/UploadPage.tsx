'use client'

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileVideo,
  FileAudio,
  X,
  Check,
  AlertCircle,
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  Settings,
  Users,
  Clock,
  Zap,
  Mic
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

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

interface DropZoneProps {
  isDragActive: boolean;
}

interface FileIconProps {
  type: 'video' | 'audio';
}

interface FileStatusProps {
  status: string;
}

interface ProcessingOptions {
  speakerDiarization: boolean;
  actionItemExtraction: boolean;
  timestampGeneration: boolean;
  languageDetection: boolean;
}

// Animations
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

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

const UploadSection = styled.div`
  margin-bottom: 3rem;
`;

const DropZone = styled.div<DropZoneProps>`
  border: 3px dashed ${props => props.isDragActive ? '#8850F2' : 'rgba(136, 80, 242, 0.3)'};
  border-radius: 24px;
  padding: 4rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.isDragActive ? 'rgba(136, 80, 242, 0.1)' : 'rgba(32, 32, 36, 0.9)'};
  backdrop-filter: blur(20px);
  position: relative;
  overflow: hidden;
  
  &:hover {
    border-color: rgba(136, 80, 242, 0.6);
    background: rgba(136, 80, 242, 0.05);
    transform: translateY(-2px);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(136, 80, 242, 0.1), transparent);
    animation: ${shimmer} 2s infinite;
  }
`;

const MotionDropZone = motion(DropZone);

const UploadIcon = styled(motion.div)`
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const UploadTitle = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 1rem 0;
  font-family: 'Inter', sans-serif;
`;

const UploadSubtitle = styled.p`
  color: #8D8D99;
  font-size: 1.125rem;
  margin: 0 0 2rem 0;
  line-height: 1.6;
`;

const FileFormats = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
`;

const FormatBadge = styled.div`
  background: rgba(136, 80, 242, 0.1);
  border: 1px solid rgba(136, 80, 242, 0.2);
  color: #C4C4CC;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
`;

const BrowseButton = styled(motion.button)`
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 1.25rem 2.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  font-family: 'Inter', sans-serif;
  margin-bottom: 1rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(136, 80, 242, 0.4);
  }
`;

const FilesSection = styled.div`
  margin-top: 3rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const FilesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FileItem = styled(motion.div)`
  background: rgba(32, 32, 36, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(136, 80, 242, 0.4);
    transform: translateY(-2px);
  }
`;

const FileIcon = styled.div<FileIconProps>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.type === 'video' 
    ? 'linear-gradient(135deg, #8850F2 0%, #A855F7 100%)' 
    : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'};
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
  font-size: 1rem;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FileMeta = styled.div`
  display: flex;
  gap: 1rem;
  color: #8D8D99;
  font-size: 0.875rem;
`;

const FileStatus = styled.div<FileStatusProps>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => {
    switch (props.status) {
      case 'uploading': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'error': return '#F87171';
      default: return '#8D8D99';
    }
  }};
`;

const ProgressBar = styled.div`
  width: 120px;
  height: 6px;
  background: rgba(136, 80, 242, 0.2);
  border-radius: 3px;
  overflow: hidden;
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    transition: width 0.3s ease;
    border-radius: 3px;
  }
`;

const RemoveButton = styled.button`
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.2);
  color: #F87171;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(248, 113, 113, 0.2);
    border-color: rgba(248, 113, 113, 0.3);
  }
`;

const ProcessButton = styled(motion.button)`
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 1.25rem 2.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  font-family: 'Inter', sans-serif;
  margin-top: 2rem;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
  }
`;

const ProcessingOptions = styled.div`
  background: rgba(32, 32, 36, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-top: 2rem;
`;

const OptionsTitle = styled.h4`
  font-size: 1.25rem;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const OptionGroup = styled.div`
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const OptionLabel = styled.label`
  display: block;
  color: #C4C4CC;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const Checkbox = styled.input`
  margin-right: 0.5rem;
  accent-color: #8850F2;
`;

const CheckboxLabel = styled.label`
  color: #C4C4CC;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  
  &:hover {
    color: #FFFFFF;
  }
`;

const UploadPage = () => {
  const router = useRouter();
  const [files, setFiles] = useState<FileData[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [options, setOptions] = useState<ProcessingOptions>({
    speakerDiarization: true,
    actionItemExtraction: true,
    timestampGeneration: true,
    languageDetection: true
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileData[] = acceptedFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type.startsWith('video/') ? 'video' : 'audio',
      status: 'ready',
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    toast.success(`${acceptedFiles.length} file(s) added successfully`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac']
    },
    maxSize: 5 * 1024 * 1024 * 1024 // 5GB
  });

  const removeFile = (id: number) => {
    setFiles(prev => prev.filter(file => file.id !== id));
    toast.success('File removed');
  };

  const startProcessing = async () => {
    if (files.length === 0) {
      toast.error('Please add files to process');
      return;
    }

    // Update all files to processing status
    setFiles(prev => prev.map(file => ({ ...file, status: 'uploading', progress: 0 })));

    // Simulate upload and processing
    for (const file of files) {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, progress } : f
        ));
      }
      
      // Mark as completed
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'completed' } : f
      ));
    }

    toast.success('All files processed successfully!');
    
    // Redirect to dashboard after processing
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading': return <Clock size={16} />;
      case 'completed': return <Check size={16} />;
      case 'error': return <AlertCircle size={16} />;
      default: return null;
    }
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
        <UploadSection>
          <MotionDropZone
            {...getRootProps()}
            isDragActive={isDragActive}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <input {...getInputProps()} />
            <UploadIcon
              animate={{ rotate: isDragActive ? 360 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <Upload size={40} color="white" />
            </UploadIcon>
            
            <UploadTitle>
              {isDragActive ? 'Drop files here' : 'Drag & Drop Files'}
            </UploadTitle>
            
            <UploadSubtitle>
              Upload your audio or video files for AI-powered transcription and speaker diarization
            </UploadSubtitle>
            
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
            
            <BrowseButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Upload size={20} />
              Browse Files
            </BrowseButton>
            
            <p style={{ color: '#7C7C8A', fontSize: '0.875rem', margin: 0 }}>
              Maximum file size: 5GB per file
            </p>
          </MotionDropZone>
        </UploadSection>

        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <FilesSection>
                <SectionTitle>
                  <FileVideo size={20} />
                  Selected Files ({files.length})
                </SectionTitle>
                
                <FilesList>
                  {files.map((file, index) => (
                    <FileItem
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <FileIcon type={file.type}>
                        {file.type === 'video' ? (
                          <FileVideo size={24} />
                        ) : (
                          <FileAudio size={24} />
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
                      
                      {file.status === 'uploading' && (
                        <ProgressBar>
                          <div 
                            className="progress-fill" 
                            style={{ width: `${file.progress}%` }}
                          />
                        </ProgressBar>
                      )}
                      
                      <FileStatus status={file.status}>
                        {getStatusIcon(file.status)}
                        {file.status === 'uploading' && `${file.progress}%`}
                        {file.status === 'completed' && 'Ready'}
                        {file.status === 'ready' && 'Ready'}
                      </FileStatus>
                      
                      {file.status !== 'uploading' && (
                        <RemoveButton onClick={() => removeFile(file.id)}>
                          <X size={16} />
                        </RemoveButton>
                      )}
                    </FileItem>
                  ))}
                </FilesList>

                <ProcessingOptions>
                  <OptionsTitle>
                    <Settings size={20} />
                    Processing Options
                  </OptionsTitle>
                  
                  <OptionGroup>
                    <CheckboxLabel>
                      <Checkbox
                        type="checkbox"
                        checked={options.speakerDiarization}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          speakerDiarization: e.target.checked 
                        }))}
                      />
                      <Users size={16} />
                      Enable Speaker Diarization
                    </CheckboxLabel>
                  </OptionGroup>
                  
                  <OptionGroup>
                    <CheckboxLabel>
                      <Checkbox
                        type="checkbox"
                        checked={options.actionItemExtraction}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          actionItemExtraction: e.target.checked 
                        }))}
                      />
                      <Check size={16} />
                      Extract Action Items
                    </CheckboxLabel>
                  </OptionGroup>
                  
                  <OptionGroup>
                    <CheckboxLabel>
                      <Checkbox
                        type="checkbox"
                        checked={options.timestampGeneration}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          timestampGeneration: e.target.checked 
                        }))}
                      />
                      <Clock size={16} />
                      Generate Timestamps
                    </CheckboxLabel>
                  </OptionGroup>
                  
                  <OptionGroup>
                    <CheckboxLabel>
                      <Checkbox
                        type="checkbox"
                        checked={options.languageDetection}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          languageDetection: e.target.checked 
                        }))}
                      />
                      <Mic size={16} />
                      Auto Language Detection
                    </CheckboxLabel>
                  </OptionGroup>
                </ProcessingOptions>

                <ProcessButton
                  onClick={startProcessing}
                  disabled={files.some(file => file.status === 'uploading')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Zap size={20} />
                  Start Processing
                </ProcessButton>
              </FilesSection>
            </motion.div>
          )}
        </AnimatePresence>
      </MainContent>
    </UploadContainer>
  );
};

export default UploadPage;