import React, { useState } from 'react';
import { useRouter } from 'next/router';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff, Mic, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(2deg); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(136, 80, 242, 0.4); }
  50% { box-shadow: 0 0 40px rgba(136, 80, 242, 0.8); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const LoginContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0B0A0A 0%, #1C1A1F 37.5%, #363036 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(136, 80, 242, 0.15) 0%, transparent 70%);
    animation: ${float} 8s ease-in-out infinite;
  }

  &::after {
    content: '';
    position: absolute;
    top: 20%;
    right: 10%;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%);
    border-radius: 50%;
    animation: ${float} 12s ease-in-out infinite reverse;
  }
`;

const LoginCard = styled(motion.div)`
  background: rgba(20, 20, 24, 0.95);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(136, 80, 242, 0.3);
  border-radius: 32px;
  padding: 3.5rem;
  width: 100%;
  max-width: 480px;
  position: relative;
  z-index: 10;
  box-shadow: 
    0 0 0 1px rgba(136, 80, 242, 0.1),
    0 20px 40px rgba(0, 0, 0, 0.4),
    0 0 60px rgba(136, 80, 242, 0.2);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #8850F2, #A855F7, #C084FC, #A855F7, #8850F2);
    background-size: 200% 100%;
    border-radius: 32px 32px 0 0;
    animation: ${shimmer} 3s infinite;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const LogoContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const LogoIcon = styled.div`
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 50%, #C084FC 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  animation: ${glow} 4s ease-in-out infinite;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(45deg, #8850F2, #A855F7, #C084FC, #A855F7, #8850F2);
    border-radius: 22px;
    z-index: -1;
    animation: ${shimmer} 2s infinite;
    background-size: 200% 200%;
  }
`;

const BrandName = styled.h1`
  font-family: 'Inter', sans-serif;
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #FFFFFF 0%, #C4C4CC 50%, #A855F7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.02em;
`;

const Subtitle = styled.p`
  color: #8D8D99;
  font-size: 1.125rem;
  margin: 0;
  font-weight: 400;
  line-height: 1.6;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const InputGroup = styled.div`
  position: relative;
`;

const InputLabel = styled.label`
  display: block;
  color: #E4E4E7;
  font-size: 0.9375rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  letter-spacing: -0.01em;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 1.25rem 1.25rem 1.25rem 3.5rem;
  border: 2px solid ${props => props.hasError ? '#EF4444' : '#323238'};
  border-radius: 16px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: rgba(24, 24, 27, 0.8);
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  
  &:focus {
    outline: none;
    border-color: #8850F2;
    box-shadow: 0 0 0 4px rgba(136, 80, 242, 0.15);
    background: rgba(24, 24, 27, 1);
    transform: translateY(-1px);
  }
  
  &::placeholder {
    color: #71717A;
    font-weight: 400;
  }

  &:valid:not(:placeholder-shown) {
    border-color: #10B981;
  }
`;

const InputIcon = styled.div`
  position: absolute;
  left: 1.25rem;
  color: #71717A;
  transition: all 0.3s ease;
  z-index: 1;
  
  ${Input}:focus + & {
    color: #8850F2;
    transform: scale(1.1);
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 1.25rem;
  background: none;
  border: none;
  color: #71717A;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  z-index: 1;
  
  &:hover {
    color: #E4E4E7;
    background: rgba(136, 80, 242, 0.1);
    transform: scale(1.1);
  }
`;

const LoginButton = styled(motion.button)`
  width: 100%;
  padding: 1.5rem;
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 50%, #C084FC 100%);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 1.125rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-family: 'Inter', sans-serif;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #A855F7 0%, #C084FC 50%, #DDD6FE 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover:not(:disabled)::before {
    opacity: 1;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(136, 80, 242, 0.5);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  span {
    position: relative;
    z-index: 1;
  }
`;

const ErrorMessage = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #EF4444;
  font-size: 0.9375rem;
  padding: 1.25rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  font-weight: 500;
`;

const FeatureList = styled.div`
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(136, 80, 242, 0.2);
`;

const FeatureTitle = styled.h3`
  color: #E4E4E7;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #A1A1AA;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
  font-weight: 500;
  
  .icon {
    color: #8850F2;
    flex-shrink: 0;
  }
`;

const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FloatingOrb = styled(motion.div)`
  position: absolute;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  background: linear-gradient(135deg, rgba(136, 80, 242, 0.2), rgba(168, 85, 247, 0.1));
  border-radius: 50%;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(136, 80, 242, 0.1);
`;

const LoginPage = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate inputs
    if (!formData.username || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginContainer>
      {/* Floating Background Elements */}
      <FloatingOrb
        size={120}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 0.5 }}
        style={{ top: '15%', left: '10%' }}
      />
      <FloatingOrb
        size={80}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 1 }}
        style={{ top: '60%', right: '15%' }}
      />
      <FloatingOrb
        size={60}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 1.5 }}
        style={{ top: '25%', right: '25%' }}
      />

      <LoginCard
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Header>
          <LogoContainer
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <LogoIcon>
              <Mic size={32} />
            </LogoIcon>
            <BrandName>Whisper Notes</BrandName>
          </LogoContainer>
          <Subtitle>AI-Powered Audio Transcription & Speaker Diarization</Subtitle>
        </Header>

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <InputLabel htmlFor="username">Username</InputLabel>
            <InputWrapper>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleInputChange}
                hasError={!!error}
                required
              />
              <InputIcon>
                <User size={20} />
              </InputIcon>
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <InputLabel htmlFor="password">Password</InputLabel>
            <InputWrapper>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                hasError={!!error}
                required
              />
              <InputIcon>
                <Lock size={20} />
              </InputIcon>
              <PasswordToggle
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </PasswordToggle>
            </InputWrapper>
          </InputGroup>

          {error && (
            <ErrorMessage
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AlertCircle size={18} />
              {error}
            </ErrorMessage>
          )}

          <LoginButton
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <LogIn size={20} />
                Sign In
                <ArrowRight size={20} />
              </span>
            )}
          </LoginButton>
        </Form>

        <FeatureList>
          <FeatureTitle>
            <Zap size={16} />
            Platform Features
          </FeatureTitle>
          <FeatureItem>
            <div className="icon">•</div>
            Real-time audio & video transcription
          </FeatureItem>
          <FeatureItem>
            <div className="icon">•</div>
            Advanced speaker identification
          </FeatureItem>
          <FeatureItem>
            <div className="icon">•</div>
            Automatic action item extraction
          </FeatureItem>
          <FeatureItem>
            <div className="icon">•</div>
            Multi-language support
          </FeatureItem>
        </FeatureList>
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage;