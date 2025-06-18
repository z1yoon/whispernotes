'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { User, Mail, Lock, FileText, AlertCircle, Eye, EyeOff, Mic, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { useNotification } from '@/components/NotificationProvider';

// TypeScript interfaces
interface InputProps {
  hasError?: boolean;
}

interface FormData {
  username: string;
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  purpose: string;
}

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

const SignupContainer = styled.div`
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

const SignupCard = styled(motion.div)`
  background: rgba(20, 20, 24, 0.95);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(136, 80, 242, 0.3);
  border-radius: 32px;
  padding: 3rem;
  width: 100%;
  max-width: 520px;
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

const BackButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #A1A1AA;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 2rem;
  transition: all 0.2s ease;
  
  &:hover {
    color: #8850F2;
    transform: translateX(-2px);
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2.5rem;
`;

const LogoContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const LogoIcon = styled.div`
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 50%, #C084FC 100%);
  border-radius: 18px;
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
    border-radius: 20px;
    z-index: -1;
    animation: ${shimmer} 2s infinite;
    background-size: 200% 200%;
  }
`;

const BrandName = styled.h1`
  font-family: 'Inter', sans-serif;
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #FFFFFF 0%, #C4C4CC 50%, #A855F7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.02em;
`;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 0.5rem 0;
  font-family: 'Inter', sans-serif;
`;

const Subtitle = styled.p`
  color: #8D8D99;
  font-size: 1rem;
  margin: 0;
  font-weight: 400;
  line-height: 1.6;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InputGroup = styled.div`
  position: relative;
`;

const InputLabel = styled.label`
  display: block;
  color: #E4E4E7;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  letter-spacing: -0.01em;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input<InputProps>`
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid ${props => props.hasError ? '#EF4444' : '#323238'};
  border-radius: 12px;
  font-size: 0.9375rem;
  transition: all 0.3s ease;
  background: rgba(24, 24, 27, 0.8);
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  
  &:focus {
    outline: none;
    border-color: #8850F2;
    box-shadow: 0 0 0 3px rgba(136, 80, 242, 0.15);
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

const TextArea = styled.textarea<InputProps>`
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid ${props => props.hasError ? '#EF4444' : '#323238'};
  border-radius: 12px;
  font-size: 0.9375rem;
  transition: all 0.3s ease;
  background: rgba(24, 24, 27, 0.8);
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  resize: vertical;
  min-height: 80px;
  
  &:focus {
    outline: none;
    border-color: #8850F2;
    box-shadow: 0 0 0 3px rgba(136, 80, 242, 0.15);
    background: rgba(24, 24, 27, 1);
    transform: translateY(-1px);
  }
  
  &::placeholder {
    color: #71717A;
    font-weight: 400;
  }
`;

const InputIcon = styled.div`
  position: absolute;
  left: 1rem;
  color: #71717A;
  transition: all 0.3s ease;
  z-index: 1;
  
  ${Input}:focus + &,
  ${TextArea}:focus + & {
    color: #8850F2;
    transform: scale(1.1);
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  color: #71717A;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  z-index: 1;
  
  &:hover {
    color: #E4E4E7;
    background: rgba(136, 80, 242, 0.1);
    transform: scale(1.1);
  }
`;

const SubmitButton = styled(motion.button)`
  width: 100%;
  padding: 1.25rem;
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 50%, #C084FC 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  color: #F87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 0.875rem 1rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
`;

const AuthLink = styled.div`
  text-align: center;
  margin-top: 2rem;
  color: #A1A1AA;
  font-size: 0.875rem;
  
  a {
    color: #8850F2;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;
    
    &:hover {
      color: #A855F7;
    }
  }
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SignupPage = () => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    purpose: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const notification = useNotification();

  // Redirect if already authenticated
  useEffect(() => {
    if (auth.isAuthenticated && !auth.isLoading) {
      router.replace('/dashboard');
    }
  }, [auth.isAuthenticated, auth.isLoading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.username || !formData.email || !formData.fullName || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          full_name: formData.fullName,
          password: formData.password,
          purpose: formData.purpose,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Signup failed');
      }

      // Show brief success message
      notification.success('Request submitted', 'Awaiting admin approval');

      // Wait a moment then redirect
      setTimeout(() => {
        router.push('/login?message=signup-pending');
      }, 1500); // Reduced timeout to 1.5 seconds

    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render signup form if user is authenticated
  if (auth.isAuthenticated) {
    return null;
  }

  return (
    <SignupContainer>
      <SignupCard
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <BackButton href="/">
          <ArrowLeft size={16} />
          Back to Home
        </BackButton>

        <Header>
          <LogoContainer
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <LogoIcon>
              <Mic size={28} />
            </LogoIcon>
            <BrandName>Whisper Notes</BrandName>
          </LogoContainer>
          <Title>Create Account</Title>
          <Subtitle>Request access to our AI-powered transcription platform</Subtitle>
        </Header>

        <Form onSubmit={handleSubmit}>
          {error && (
            <ErrorMessage>
              <AlertCircle size={18} />
              <span>{error}</span>
            </ErrorMessage>
          )}

          <InputGroup>
            <InputLabel htmlFor="username">Username</InputLabel>
            <InputWrapper>
              <InputIcon>
                <User size={18} />
              </InputIcon>
              <Input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="cooluser"
                hasError={!!error}
                disabled={isLoading}
                autoComplete="username"
              />
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <InputLabel htmlFor="email">Email Address</InputLabel>
            <InputWrapper>
              <InputIcon>
                <Mail size={18} />
              </InputIcon>
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                hasError={!!error}
                disabled={isLoading}
                autoComplete="email"
              />
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <InputLabel htmlFor="fullName">Full Name</InputLabel>
            <InputWrapper>
              <InputIcon>
                <User size={18} />
              </InputIcon>
              <Input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="John Doe"
                hasError={!!error}
                disabled={isLoading}
                autoComplete="name"
              />
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <InputLabel htmlFor="password">Password</InputLabel>
            <InputWrapper>
              <InputIcon>
                <Lock size={18} />
              </InputIcon>
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••••••"
                hasError={!!error}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <PasswordToggle 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </PasswordToggle>
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <InputLabel htmlFor="confirmPassword">Confirm Password</InputLabel>
            <InputWrapper>
              <InputIcon>
                <Lock size={18} />
              </InputIcon>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••••••"
                hasError={!!error}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <PasswordToggle 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </PasswordToggle>
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <InputLabel htmlFor="purpose">Purpose (Optional)</InputLabel>
            <InputWrapper>
              <InputIcon>
                <FileText size={18} />
              </InputIcon>
              <TextArea
                id="purpose"
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                placeholder="Briefly describe why you need access..."
                disabled={isLoading}
                rows={3}
              />
            </InputWrapper>
          </InputGroup>

          <SubmitButton 
            type="submit" 
            disabled={isLoading}
            whileHover={{ y: -2, boxShadow: '0 10px 30px rgba(136, 80, 242, 0.3)' }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                <span>Submitting Request...</span>
              </>
            ) : (
              <>
                <span>Request Account</span>
                <ArrowRight size={18} />
              </>
            )}
          </SubmitButton>
        </Form>

        <AuthLink>
          Already have an account? <Link href="/login">Sign In</Link>
        </AuthLink>
      </SignupCard>
    </SignupContainer>
  );
};

export default SignupPage;