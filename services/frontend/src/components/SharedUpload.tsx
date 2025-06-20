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
}

interface SharedUploadProps {
  isAuthenticated?: boolean;
  onStartProcessing?: (files: FileData[], options: ProcessingOptions) => void;
  onUploadClick?: (e: React.MouseEvent) => void;
  className?: string;
}

// Styled Components
const UploadContainer = styled(motion.div)`
  width: 680px;
  max-width: 90%;
  background: rgba(32, 32, 36, 0.65);
  border-radius: 24px;
  backdrop-filter: blur(14px);
  box-shadow: 0px 12px 40px rgba(0, 0, 0, 0.45);
  padding: 2rem;
  position: relative;
  z-index: 2;
  margin: 0 auto;

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

const DropZone = styled.div<{ $isDragActive: boolean; $isAuthenticated?: boolean }>`
  border: 2px dashed ${props => props.$isDragActive ? '#8850F2' : 'rgba(136, 80, 242, 0.4)'};
  border-radius: 16px;
  padding: 4rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.$isDragActive ? 'rgba(136, 80, 242, 0.1)' : 'transparent'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  margin-bottom: 1.5rem;
  
  &:hover {
    border-color: rgba(136, 80, 242, 0.6);
    background: rgba(136, 80, 242, 0.05);
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

  .upload-title {
    font-size: 1.5rem;
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

const SpeakerNameList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem;
`;

const SpeakerNameInput = styled.input`
  background: rgba(32, 32, 36, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #FFFFFF;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: rgba(136, 80, 242, 0.5);
    outline: none;
  }
  
  &::placeholder {
    color: #71717A;
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
  isAuthenticated = true,
  onStartProcessing,
  onUploadClick,
  className
}) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null);
  const fileIdCounter = useRef(0);
  const notification = useNotification();
  
  const [options, setOptions] = useState<ProcessingOptions>({
    speakerDiarization: true,
    numberOfSpeakers: 2
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Only allow file dropping if authenticated
    if (!isAuthenticated) {
      return;
    }
    
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
  }, [notification, isAuthenticated]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac']
    },
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
    noClick: !isAuthenticated, // Disable click when not authenticated
    noDrag: !isAuthenticated,  // Disable drag when not authenticated
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
      numberOfSpeakers: newCount
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
      // For each file, we'll handle the upload
      for (const fileData of files) {
        setProcessingStatus(`Uploading ${fileData.name}...`);
        setProcessingProgress(5);
        
        const file = fileData.file;
        
        // Step 1: Initialize upload
        console.log('Initializing upload for file:', file.name);
        const initResponse = await fetch('/api/upload/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: file.name,
            fileSize: file.size,
            contentType: file.type,
          }),
        });
        
        if (!initResponse.ok) {
          console.error('Initialize upload error:', await initResponse.text());
          throw new Error('Failed to initialize upload');
        }
        
        const initData = await initResponse.json();
        console.log('Upload initialized successfully:', initData);
        const sessionId = initData.session_id;
        const uploadId = initData.upload_id;
        setUploadSessionId(sessionId);
        
        // Choose upload strategy based on file size
        if (file.size > 10 * 1024 * 1024) { // If file is larger than 10MB, use multipart upload
          await handleMultipartUpload(file, sessionId, uploadId);
        } else {
          await handleDirectUpload(file, sessionId);
        }
        
        // Wait for transcription to complete
        await waitForTranscription(sessionId);
      }
      
    } catch (error: any) {
      console.error('Processing error:', error);
      notification.error('Processing Failed', `There was an error processing your files: ${error.message}`);
      setIsProcessing(false);
    }
  };
  
  // Helper function to handle direct upload for smaller files
  const handleDirectUpload = async (file: File, sessionId: string) => {
    try {
      setProcessingStatus(`Uploading ${file.name}...`);
      setProcessingProgress(10);
      
      // Create FormData for the upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload directly to our API which forwards to file-uploader service
      const uploadResponse = await fetch(`/api/upload/direct-upload?sessionId=${sessionId}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        console.error('Upload error:', uploadResponse.status, uploadResponse.statusText);
        try {
          const responseText = await uploadResponse.text();
          console.error('Upload error response:', responseText);
        } catch (textError) {
          console.error('Could not read error response:', textError);
        }
        
        throw new Error(`Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
      
      const uploadData = await uploadResponse.json();
      console.log('Upload completed successfully:', uploadData);
      
      setProcessingProgress(50);
      setProcessingStatus('Processing audio for transcription...');
    } catch (error) {
      console.error('Direct upload error:', error);
      throw error;
    }
  };
  
  // Helper function to handle multipart upload for larger files
  const handleMultipartUpload = async (file: File, sessionId: string, uploadId: string) => {
    try {
      // Determine optimal part size
      // Chunk size: 5MB for files smaller than 1GB, 10MB for larger files
      const chunkSize = file.size < 1024 * 1024 * 1024 ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      const totalParts = Math.ceil(file.size / chunkSize);
      
      console.log(`Starting multipart upload with ${totalParts} parts of ${chunkSize / (1024 * 1024)}MB each`);
      setProcessingStatus(`Preparing to upload file in ${totalParts} parts...`);
      
      const parts = [];
      
      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        const start = (partNumber - 1) * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const partBlob = file.slice(start, end);
        
        // Update progress for each part
        const progressPercent = Math.min(5 + (partNumber / totalParts) * 45, 50);
        setProcessingProgress(progressPercent);
        setProcessingStatus(`Uploading part ${partNumber} of ${totalParts}`);
        
        // Create FormData for this part
        const formData = new FormData();
        formData.append('file', partBlob, file.name + '.part' + partNumber);
        
        // Upload the part
        const response = await fetch(`/api/upload/upload-part?sessionId=${sessionId}&partNumber=${partNumber}`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Upload part ${partNumber} failed:`, errorText);
          throw new Error(`Failed to upload part ${partNumber}: ${response.status} ${response.statusText}`);
        }
        
        const partData = await response.json();
        console.log(`Part ${partNumber} uploaded successfully`, partData);
        
        // Store part info for completion
        parts.push({
          PartNumber: partNumber,
          ETag: partData.etag
        });
      }
      
      // Complete the multipart upload
      setProcessingStatus('Finalizing upload...');
      const completeResponse = await fetch(`/api/upload/complete-upload?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parts })
      });
      
      if (!completeResponse.ok) {
        const errorText = await completeResponse.text();
        console.error('Complete upload failed:', errorText);
        throw new Error(`Failed to complete multipart upload: ${completeResponse.status} ${completeResponse.statusText}`);
      }
      
      const completeData = await completeResponse.json();
      console.log('Multipart upload completed successfully:', completeData);
      
      setProcessingProgress(50);
      setProcessingStatus('Processing audio for transcription...');
    } catch (error) {
      console.error('Multipart upload error:', error);
      throw error;
    }
  };
  
  // Helper function to wait for transcription to complete
  const waitForTranscription = async (sessionId: string) => {
    try {
      let transcriptionComplete = false;
      let retryCount = 0;
      const maxRetries = 30; // Try for 30 * 2 seconds = 1 minute
      
      while (!transcriptionComplete && retryCount < maxRetries) {
        console.log(`Checking transcription status, attempt ${retryCount + 1}`);
        try {
          const statusResponse = await fetch(`/api/transcription/${sessionId}`, {
            method: 'GET',
          });
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('Transcription status:', statusData);
            
            if (statusData.status === 'completed') {
              transcriptionComplete = true;
              setProcessingProgress(100);
              setProcessingStatus('Processing complete!');
              console.log('Transcription completed successfully');
              
              // Show success notification
              notification.success('Processing Complete!', 'Your file has been processed successfully');
              
              // Redirect to the transcript page after a short delay
              setTimeout(() => {
                window.location.href = `/transcript/${sessionId}`;
              }, 1000);
              return;
            }
          } else {
            console.log('Transcription not ready yet, status:', statusResponse.status);
          }
        } catch (statusError) {
          console.error('Error checking transcription status:', statusError);
        }
        
        retryCount++;
        setProcessingProgress(60 + Math.min(retryCount * 1.3, 35)); // Progress up to 95%
        await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds between checks
      }
      
      if (!transcriptionComplete) {
        setProcessingProgress(95);
        setProcessingStatus('Taking longer than expected, but processing continues...');
        console.log('Transcription taking longer than expected');
        notification.info('Processing in Progress', 'Your file is still being processed. You can check back later.');
      }
    } catch (transcriptionError) {
      console.error('Error monitoring transcription:', transcriptionError);
      notification.warning('Processing Started', 'Your file is being processed. Check back in a few minutes.');
    }
  };

  return (
    <UploadContainer
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
        {...(isAuthenticated ? getRootProps() : { onClick: onUploadClick })}
        $isDragActive={isDragActive && isAuthenticated}
        $isAuthenticated={isAuthenticated}
      >
        {/* Only render the input if authenticated */}
        {isAuthenticated && <input {...getInputProps()} />}
        <div className="upload-badge">
          <Upload size={40} color="white" />
        </div>
        <div className="upload-title">
          {isAuthenticated && isDragActive ? 'Drop files here' : 'Upload Your Video'}
        </div>
        <div className="upload-subtitle">
          {isAuthenticated ? 'Drag & drop or click to browse files' : 'Drag & drop or click to browse files'}
        </div>
        
        <div className="upload-info">
          MP4 · AVI · MOV · MP3 · WAV · No size limit
        </div>
      </DropZone>

      {/* Always render the file processing section but only show when authenticated and files exist */}
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