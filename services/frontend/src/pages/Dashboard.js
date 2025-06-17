import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import {
  Upload,
  FileVideo,
  FileAudio,
  Clock,
  Users,
  CheckSquare,
  LogOut,
  Plus,
  Search,
  Filter,
  Play,
  MoreVertical,
  TrendingUp,
  Activity,
  Mic,
  Headphones
} from 'lucide-react';
import toast from 'react-hot-toast';

// Animations
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const slideUp = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0B0A0A 0%, #1C1A1F 37.5%, #363036 100%);
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

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  .icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
  
  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0;
    font-family: 'Inter', sans-serif;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(136, 80, 242, 0.1);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 12px;
  
  .avatar {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  .info {
    h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #FFFFFF;
      margin: 0;
    }
    p {
      font-size: 0.75rem;
      color: #8D8D99;
      margin: 0;
    }
  }
`;

const LogoutButton = styled.button`
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.2);
  color: #F87171;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(248, 113, 113, 0.2);
    border-color: rgba(248, 113, 113, 0.3);
    transform: translateY(-1px);
  }
`;

const MainContent = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const WelcomeSection = styled.div`
  margin-bottom: 3rem;
  text-align: center;
  
  h2 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0 0 0.5rem 0;
    font-family: 'Inter', sans-serif;
  }
  
  p {
    color: #8D8D99;
    font-size: 1.125rem;
    margin: 0;
    max-width: 600px;
    margin: 0 auto;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(32, 32, 36, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(136, 80, 242, 0.3);
    border-color: rgba(136, 80, 242, 0.4);
  }
`;

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  color: #8D8D99;
  font-size: 0.875rem;
  font-weight: 500;
`;

const UploadSection = styled.div`
  margin-bottom: 3rem;
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

const UploadCard = styled(motion.div)`
  background: rgba(32, 32, 36, 0.9);
  backdrop-filter: blur(20px);
  border: 2px dashed rgba(136, 80, 242, 0.3);
  border-radius: 20px;
  padding: 3rem;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    border-color: rgba(136, 80, 242, 0.6);
    background: rgba(136, 80, 242, 0.05);
    transform: translateY(-2px);
  }
`;

const UploadIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const UploadTitle = styled.h4`
  font-size: 1.5rem;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0 0 0.5rem 0;
`;

const UploadDescription = styled.p`
  color: #8D8D99;
  font-size: 1rem;
  margin: 0 0 2rem 0;
  line-height: 1.6;
`;

const UploadButton = styled(motion.button)`
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Inter', sans-serif;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(136, 80, 242, 0.4);
  }
`;

const RecentSection = styled.div`
  margin-bottom: 3rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

const SearchInput = styled.input`
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 8px;
  background: rgba(32, 32, 36, 0.9);
  color: #FFFFFF;
  font-size: 0.875rem;
  width: 250px;
  position: relative;
  
  &:focus {
    outline: none;
    border-color: #8850F2;
    box-shadow: 0 0 0 3px rgba(136, 80, 242, 0.1);
  }
  
  &::placeholder {
    color: #7C7C8A;
  }
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #7C7C8A;
  pointer-events: none;
`;

const FilterButton = styled.button`
  padding: 0.75rem 1rem;
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 8px;
  background: rgba(32, 32, 36, 0.9);
  color: #C4C4CC;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(136, 80, 242, 0.1);
    border-color: rgba(136, 80, 242, 0.3);
  }
`;

const FilesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`;

const FileCard = styled(motion.div)`
  background: rgba(32, 32, 36, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(136, 80, 242, 0.3);
    border-color: rgba(136, 80, 242, 0.4);
  }
`;

const FileThumbnail = styled.div`
  height: 180px;
  background: linear-gradient(135deg, ${props => props.gradient});
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
  .play-icon {
    width: 56px;
    height: 56px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }
  
  &:hover .play-icon {
    transform: scale(1.1);
    background: rgba(255, 255, 255, 0.3);
  }
`;

const FileInfo = styled.div`
  padding: 1.5rem;
`;

const FileTitle = styled.h4`
  font-size: 1.125rem;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
`;

const FileMeta = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #8D8D99;
    font-size: 0.875rem;
  }
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return `
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        `;
      case 'processing':
        return `
          background: rgba(245, 158, 11, 0.1);
          color: #F59E0B;
          border: 1px solid rgba(245, 158, 11, 0.2);
        `;
      case 'error':
        return `
          background: rgba(248, 113, 113, 0.1);
          color: #F87171;
          border: 1px solid rgba(248, 113, 113, 0.2);
        `;
      default:
        return `
          background: rgba(124, 124, 138, 0.1);
          color: #7C7C8A;
          border: 1px solid rgba(124, 124, 138, 0.2);
        `;
    }
  }}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #8D8D99;
  
  .icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 2rem;
    background: rgba(136, 80, 242, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #FFFFFF;
    margin: 0 0 0.75rem 0;
  }
  
  p {
    margin: 0 0 2rem 0;
    line-height: 1.6;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
  }
`;

const Dashboard = () => {
  const router = useRouter();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Check authentication
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      router.push('/login');
      return;
    }
    
    fetchFiles();
  }, [router]);

  const fetchFiles = async () => {
    setLoading(true);
    // Simulate API call with mock data
    setTimeout(() => {
      setFiles([
        {
          id: 1,
          title: 'Team Meeting - Q2 Planning Discussion',
          duration: '45:30',
          speakers: 5,
          status: 'completed',
          type: 'video',
          uploadedAt: new Date().toISOString(),
          actionItems: 8,
          gradient: '#8850F2 0%, #A855F7 100%'
        },
        {
          id: 2,
          title: 'Product Review Session with Engineering',
          duration: '30:15',
          speakers: 3,
          status: 'processing',
          type: 'audio',
          uploadedAt: new Date().toISOString(),
          actionItems: 0,
          gradient: '#10B981 0%, #059669 100%'
        },
        {
          id: 3,
          title: 'Client Presentation - Feature Demo',
          duration: '1:15:20',
          speakers: 4,
          status: 'completed',
          type: 'video',
          uploadedAt: new Date().toISOString(),
          actionItems: 12,
          gradient: '#F59E0B 0%, #D97706 100%'
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
    toast.success('Logged out successfully');
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Ready';
      case 'processing': return 'Processing';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const filteredFiles = files.filter(file =>
    file.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const username = localStorage.getItem('username') || 'Admin';

  return (
    <DashboardContainer>
      <Header>
        <Logo>
          <div className="icon">
            <Mic size={20} />
          </div>
          <h1>Whisper Notes</h1>
        </Logo>
        
        <HeaderActions>
          <UserProfile>
            <div className="avatar">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="info">
              <h3>{username}</h3>
              <p>Administrator</p>
            </div>
          </UserProfile>
          
          <LogoutButton onClick={handleLogout}>
            <LogOut size={18} />
          </LogoutButton>
        </HeaderActions>
      </Header>

      <MainContent>
        <WelcomeSection>
          <h2>Welcome back, {username}!</h2>
          <p>Upload audio or video files to generate AI-powered transcripts with speaker identification and automatic action item extraction.</p>
        </WelcomeSection>

        <StatsGrid>
          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <StatIcon gradient="linear-gradient(135deg, #8850F2 0%, #A855F7 100%)">
              <FileVideo size={24} color="white" />
            </StatIcon>
            <StatValue>24</StatValue>
            <StatLabel>Total Files Processed</StatLabel>
          </StatCard>

          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <StatIcon gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)">
              <Users size={24} color="white" />
            </StatIcon>
            <StatValue>156</StatValue>
            <StatLabel>Speakers Identified</StatLabel>
          </StatCard>

          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <StatIcon gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)">
              <CheckSquare size={24} color="white" />
            </StatIcon>
            <StatValue>89</StatValue>
            <StatLabel>Action Items Extracted</StatLabel>
          </StatCard>

          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <StatIcon gradient="linear-gradient(135deg, #EF4444 0%, #DC2626 100%)">
              <TrendingUp size={24} color="white" />
            </StatIcon>
            <StatValue>98.5%</StatValue>
            <StatLabel>Accuracy Rate</StatLabel>
          </StatCard>
        </StatsGrid>

        <UploadSection>
          <SectionTitle>
            <Upload size={20} />
            Upload New File
          </SectionTitle>
          
          <UploadCard
            as={Link}
            href="/upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.02 }}
          >
            <UploadIcon>
              <Plus size={32} color="white" />
            </UploadIcon>
            <UploadTitle>Drop your audio or video files here</UploadTitle>
            <UploadDescription>
              Support for MP4, MOV, AVI, WebM, MP3, WAV, M4A and more. 
              Maximum file size: 5GB. Get accurate transcription with speaker diarization.
            </UploadDescription>
            <UploadButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Upload size={20} />
              Choose Files to Upload
            </UploadButton>
          </UploadCard>
        </UploadSection>

        <RecentSection>
          <SectionHeader>
            <SectionTitle>
              <Activity size={20} />
              Recent Files
            </SectionTitle>
            
            <FilterBar>
              <div style={{ position: 'relative' }}>
                <SearchIcon>
                  <Search size={16} />
                </SearchIcon>
                <SearchInput
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <FilterButton>
                <Filter size={16} />
                Filter
              </FilterButton>
            </FilterBar>
          </SectionHeader>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8D8D99' }}>
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading files...</p>
            </div>
          ) : filteredFiles.length > 0 ? (
            <FilesGrid>
              {filteredFiles.map((file, index) => (
                <FileCard
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => router.push(`/transcript/${file.id}`)}
                >
                  <FileThumbnail gradient={file.gradient}>
                    <div className="play-icon">
                      {file.type === 'video' ? (
                        <Play size={24} color="white" />
                      ) : (
                        <Headphones size={24} color="white" />
                      )}
                    </div>
                  </FileThumbnail>
                  
                  <FileInfo>
                    <FileTitle>{file.title}</FileTitle>
                    
                    <FileMeta>
                      <div className="meta-item">
                        <Clock size={16} />
                        {file.duration}
                      </div>
                      <div className="meta-item">
                        <Users size={16} />
                        {file.speakers} speakers
                      </div>
                      <div className="meta-item">
                        <CheckSquare size={16} />
                        {file.actionItems} tasks
                      </div>
                    </FileMeta>
                    
                    <StatusBadge status={file.status}>
                      {getStatusText(file.status)}
                    </StatusBadge>
                  </FileInfo>
                </FileCard>
              ))}
            </FilesGrid>
          ) : (
            <EmptyState>
              <div className="icon">
                <FileVideo size={40} color="#8850F2" />
              </div>
              <h3>No files found</h3>
              <p>Upload your first audio or video file to get started with AI-powered transcription and speaker diarization.</p>
              <UploadButton
                as={Link}
                href="/upload"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus size={20} />
                Upload First File
              </UploadButton>
            </EmptyState>
          )}
        </RecentSection>
      </MainContent>
    </DashboardContainer>
  );
};

export default Dashboard;