import styled from 'styled-components';
import { motion } from 'framer-motion';
import Link from 'next/link';

export const AuthContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0B0A0A 0%, #1C1A1F 37.5%, #363036 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60%;
    height: 60%;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.1), transparent 70%);
    filter: blur(80px);
    z-index: 0;
  }
`;

export const AuthCard = styled(motion.div)`
  background: rgba(32, 32, 36, 0.9);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 3rem;
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 1;
`;

export const BackButton = styled(Link)`
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  color: #8D8D99;
  text-decoration: none;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    color: #FFFFFF;
  }
`;

export const Title = styled.h1`
  font-size: 2.25rem;
  font-weight: 700;
  text-align: center;
  color: #FFFFFF;
  margin-bottom: 2rem;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Label = styled.label`
  color: #C4C4CC;
  font-size: 0.875rem;
  font-weight: 500;
`;

export const InputWrapper = styled.div`
  position: relative;
`;

export const Input = styled.input`
  width: 100%;
  padding: 1rem 1.1rem;
  background: #121212;
  border: 1px solid #333;
  border-radius: 10px;
  color: #FFFFFF;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #A855F7;
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.15);
  }

  &::placeholder {
    color: #666;
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 1rem 1.1rem;
  background: #121212;
  border: 1px solid #333;
  border-radius: 10px;
  color: #FFFFFF;
  font-size: 1rem;
  transition: all 0.3s ease;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #A855F7;
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.15);
  }

  &::placeholder {
    color: #666;
  }
`;

export const PasswordToggle = styled.button`
  position: absolute;
  right: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #8D8D99;
  cursor: pointer;
  transition: color 0.3s ease;

  &:hover {
    color: #C4C4CC;
  }
`;

export const SubmitButton = styled(motion.button)`
  padding: 1rem;
  background: linear-gradient(135deg, #A855F7 0%, #7C3AED 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 30px rgba(168, 85, 247, 0.4);
    background: linear-gradient(135deg, #9333EA 0%, #6D28D9 100%);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

export const AuthLink = styled.div`
  text-align: center;
  margin-top: 2rem;
  color: #8D8D99;

  a {
    color: #A855F7;
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export const LogoText = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(90deg, #A29AF5 0%, #DEE0FC 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.5px;
`; 