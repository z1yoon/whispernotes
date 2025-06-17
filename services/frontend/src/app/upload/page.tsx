'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { ArrowLeft, Upload, X, Play } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

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

const DropZone = styled(motion.div)<{ isDragActive: boolean }>`
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

const UploadText = styled.h3`
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
  space-y: 1rem;
`

const FileItem = styled(motion.div)`
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`

const FileIcon = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
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

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  
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
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

interface FileWithPreview extends File {
  preview?: string;
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
    )
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac']
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    maxFiles: 5
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleProcess = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload')
      return
    }

    setIsProcessing(true)
    
    try {
      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success('Files uploaded successfully!')
      router.push('/dashboard')
    } catch (error) {
      toast.error('Upload failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Container>
      <Header>
        <BackButton href="/dashboard">
          <ArrowLeft size={20} />
        </BackButton>
        <Title>Upload Videos</Title>
      </Header>

      <Content>
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <DropZone
            isDragActive={isDragActive}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <UploadIcon isDragActive={isDragActive}>
              <Upload size={32} color="white" />
            </UploadIcon>
            
            <UploadText dragActive={isDragActive}>
              {isDragActive ? 'Drop files here' : 'Upload your videos'}
            </UploadText>
            
            <UploadSubtext>
              {isDragActive ? 
                'Release to upload' : 
                'Drag & drop or click to browse'
              }
            </UploadSubtext>
            
            <FileInfo>
              MP4, MOV, AVI, WEBM, MP3, WAV, M4A, AAC<br />
              Max 500MB per file • Up to 5 files
            </FileInfo>
          </DropZone>
        </div>

        {files.length > 0 && (
          <FileList>
            {files.map((file, index) => (
              <FileItem
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <FileIcon>
                  <Play size={20} color="white" />
                </FileIcon>
                
                <FileDetails>
                  <FileName>{file.name}</FileName>
                  <FileSize>{formatFileSize(file.size)}</FileSize>
                </FileDetails>
                
                <RemoveButton onClick={() => removeFile(index)}>
                  <X size={18} />
                </RemoveButton>
              </FileItem>
            ))}
          </FileList>
        )}

        {files.length > 0 && (
          <ProcessButton
            onClick={handleProcess}
            disabled={isProcessing}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {isProcessing ? 'Processing...' : `Process ${files.length} file${files.length > 1 ? 's' : ''}`}
          </ProcessButton>
        )}
      </Content>
    </Container>
  )
}