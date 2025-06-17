'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Upload, X, File as FileIconLucide, CheckCircle, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import axios from 'axios'

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB

const Container = styled.div`
  min-height: 100vh;
  background: #1a1a1a;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`

const Header = styled.div`
  padding: 2rem;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  gap: 1rem;
`

const BackButton = styled(Link)`
  color: #888;
  text-decoration: none;
  
  &:hover {
    color: white;
  }
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
`

const Content = styled.div`
  padding: 3rem 2rem;
  max-width: 600px;
  margin: 0 auto;
`

const DropZone = styled.div<{ isDragActive: boolean }>`
  border: 2px dashed ${props => props.isDragActive ? '#8b5cf6' : '#333'};
  border-radius: 16px;
  padding: 4rem 2rem;
  text-align: center;
  background: ${props => props.isDragActive ? 'rgba(139, 92, 246, 0.05)' : 'transparent'};
  transition: all 0.3s ease;
  cursor: pointer;
  margin-bottom: 2rem;
  
  &:hover {
    border-color: #555;
  }
`

const UploadIcon = styled.div<{ isDragActive: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: 16px;
  background: ${props => props.isDragActive ? 
    'linear-gradient(135deg, #8b5cf6, #a855f7)' : 
    '#2a2a2a'
  };
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  transition: all 0.3s ease;
`

const UploadText = styled.h3<{ dragActive: boolean }>`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${props => props.dragActive ? '#8b5cf6' : 'white'};
`

const UploadSubtext = styled.p`
  color: #888;
  margin-bottom: 1rem;
`

const FileInfo = styled.div`
  font-size: 0.875rem;
  color: #666;
`

const FileList = styled.div`
  margin-top: 2rem;
`

const FileItem = styled(motion.div)`
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
  overflow: hidden;
`

const FileIcon = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const FileDetails = styled.div`
  flex: 1;
`

const FileName = styled.h4`
  font-size: 1rem;
  font-weight: 500;
  margin: 0 0 0.25rem 0;
`

const FileSize = styled.p`
  font-size: 0.875rem;
  color: #666;
  margin: 0;
`

const ProgressBarContainer = styled.div`
  height: 4px;
  background: #444;
  border-radius: 2px;
  margin-top: 0.5rem;
`

const ProgressBar = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #a855f7);
  border-radius: 2px;
`

const ProgressText = styled.p`
    font-size: 0.75rem;
    color: #999;
    margin: 0.5rem 0 0;
    text-align: right;
`

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  z-index: 10;
  
  &:hover {
    color: #888;
    background: #333;
  }
`

const ProcessButton = styled(motion.button)`
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface UploadProgress {
  [key: string]: {
    progress: number;
    status: UploadStatus;
    error?: string;
  };
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    const initialProgress: UploadProgress = {};
    acceptedFiles.forEach(file => {
      initialProgress[file.name] = { progress: 0, status: 'idle' };
    });
    setUploadProgress(prev => ({ ...prev, ...initialProgress }));
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac']
    },
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
    onDropRejected: (fileRejections) => {
        const rejection = fileRejections[0];
        if (rejection) {
            const error = rejection.errors[0];
            if (error.code === 'file-too-large') {
                toast.error('File is larger than 5GB');
            } else {
                toast.error(error.message);
            }
        }
    }
  })

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
        const newState = { ...prev };
        delete newState[fileName];
        return newState;
    });
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = k < 2 ? 0 : 2
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select a file to upload.");
      return;
    }

    const file = files[0]; // For now, we handle one file at a time. UI can be adapted for multiple.
    const fileName = file.name;
    
    setUploadProgress(prev => ({
      ...prev,
      [fileName]: { progress: 0, status: 'uploading' }
    }));

    try {
      // 1. Initialize upload
      const initResponse = await axios.post('/api/upload/initialize', {
        filename: file.name,
        fileSize: file.size,
        contentType: file.type,
      });

      const { session_id, upload_id, object_name } = initResponse.data;

      // 2. Chunk and upload
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const uploadedParts: { ETag: string; PartNumber: number }[] = [];

      for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = partNumber * CHUNK_SIZE;
        const chunk = file.slice(start, end);

        // Get presigned URL
        const presignedUrlResponse = await axios.post('/api/upload/presigned-url', {
          sessionId: session_id,
          partNumber: partNumber
        });

        const { url } = presignedUrlResponse.data;

        // Upload chunk to MinIO
        const uploadResponse = await axios.put(url, chunk, {
          headers: {
            'Content-Type': file.type,
          },
        });
        
        const ETag = uploadResponse.headers.etag?.replace(/"/g, '');
        if (!ETag) {
          throw new Error(`ETag not found for part ${partNumber}`);
        }

        uploadedParts.push({ ETag, PartNumber: partNumber });

        // Update progress
        const progress = Math.round((partNumber / totalChunks) * 100);
        setUploadProgress(prev => ({
          ...prev,
          [fileName]: { ...prev[fileName], progress }
        }));
      }

      // 3. Complete upload
      await axios.post('/api/upload/complete', {
        sessionId: session_id,
        parts: uploadedParts,
      });
      
      setUploadProgress(prev => ({
        ...prev,
        [fileName]: { ...prev[fileName], status: 'success' }
      }));
      toast.success("File uploaded successfully! Processing has started.");
      // Optionally reset or navigate
      // setTimeout(() => router.push('/dashboard'), 2000);

    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed. Please try again.");
      setUploadProgress(prev => ({
        ...prev,
        [fileName]: { ...prev[fileName], status: 'error', error: 'Upload failed' }
      }));
    }
  };

  return (
    <Container>
      <Header>
        <BackButton href="/dashboard">
          <ArrowLeft />
        </BackButton>
        <Title>Upload New Media</Title>
      </Header>
      <Content>
        <DropZone {...getRootProps()} isDragActive={isDragActive}>
          <input {...getInputProps()} />
          <UploadIcon isDragActive={isDragActive}>
            <Upload size={32} />
          </UploadIcon>
          <UploadText dragActive={isDragActive}>
            {isDragActive ? 'Drop it like it\'s hot!' : 'Drag & drop files here'}
          </UploadText>
          <UploadSubtext>Or click to browse files on your computer</UploadSubtext>
          <FileInfo>Max file size: 5GB. Supported formats: MP4, MOV, MP3, WAV</FileInfo>
        </DropZone>

        <AnimatePresence>
          {files.length > 0 && (
            <FileList>
              {files.map((file) => {
                const progressInfo = uploadProgress[file.name] || { progress: 0, status: 'idle' };
                return (
                  <FileItem key={file.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <FileIcon>
                      <FileIconLucide size={24} />
                    </FileIcon>
                    <FileDetails>
                      <FileName>{file.name}</FileName>
                      <FileSize>{formatFileSize(file.size)}</FileSize>
                      {progressInfo.status === 'uploading' && (
                          <>
                            <ProgressBarContainer>
                                <ProgressBar style={{ width: `${progressInfo.progress}%` }} />
                            </ProgressBarContainer>
                            <ProgressText>{progressInfo.progress}% complete</ProgressText>
                          </>
                      )}
                      {progressInfo.status === 'success' && <ProgressText style={{color: '#22c55e'}}>✓ Upload successful</ProgressText>}
                      {progressInfo.status === 'error' && <ProgressText style={{color: '#ef4444'}}>✗ Upload failed</ProgressText>}
                    </FileDetails>
                    <RemoveButton onClick={() => removeFile(file.name)} disabled={progressInfo.status === 'uploading'}>
                      <X size={16} />
                    </RemoveButton>
                  </FileItem>
                )
              })}
            </FileList>
          )}
        </AnimatePresence>
        
        {files.length > 0 && (
            <ProcessButton 
                onClick={handleUpload} 
                disabled={files.some(f => uploadProgress[f.name]?.status === 'uploading')}
                whileTap={{ scale: 0.98 }}
            >
                {files.some(f => uploadProgress[f.name]?.status === 'uploading') ? (
                    <>
                        <Upload size={18} />
                        Uploading...
                    </>
                ) : (
                    <>
                        <Upload size={18} />
                        Upload & Process File
                    </>
                )}
            </ProcessButton>
        )}
      </Content>
    </Container>
  )
}