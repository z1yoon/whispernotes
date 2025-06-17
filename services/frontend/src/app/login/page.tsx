'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Eye, 
  EyeOff
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import toast from 'react-hot-toast'

const Container = styled.div`
  min-h-screen;
  background: linear-gradient(135deg, #0B0A0A 0%, #1C1A1F 37.5%, #363036 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`

const LoginCard = styled(motion.div)`
  background: rgba(32, 32, 36, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 20px;
  padding: 3rem;
  width: 100%;
  max-width: 400px;
  position: relative;
`

const BackButton = styled(Link)`
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  color: #8D8D99;
  text-decoration: none;
  transition: color 0.3s ease;
  
  &:hover {
    color: #FFFFFF;
  }
`

const Logo = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  
  .icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }
  
  h1 {
    color: #FFFFFF;
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const Label = styled.label`
  color: #C4C4CC;
  font-size: 0.875rem;
  font-weight: 500;
`

const InputWrapper = styled.div`
  position: relative;
`

const Input = styled.input`
  width: 100%;
  padding: 0.875rem 1rem;
  background: rgba(18, 18, 20, 0.8);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 8px;
  color: #FFFFFF;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #8850F2;
    box-shadow: 0 0 0 3px rgba(136, 80, 242, 0.1);
  }
  
  &::placeholder {
    color: #666;
  }
`

const PasswordToggle = styled.button`
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
`

const SubmitButton = styled(motion.button)`
  padding: 0.875rem;
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 30px rgba(136, 80, 242, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`

const SignupLink = styled.div`
  text-align: center;
  margin-top: 2rem;
  color: #8D8D99;
  
  a {
    color: #8850F2;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  // Handle signup pending message
  useEffect(() => {
    const message = searchParams.get('message')
    if (message === 'signup-pending') {
      toast.success('Account request submitted! Wait for admin approval.', {
        duration: 5000,
        icon: '⏳'
      })
    }
  }, [searchParams])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields')
      setIsLoading(false)
      return
    }

    try {
      const result = await login(formData.email, formData.password)
      
      if (result.success) {
        toast.success('Welcome to Whisper Notes!')
        router.push('/dashboard')
      } else {
        if (result.error?.includes('pending')) {
          toast.error('Account is pending admin approval')
        } else if (result.error?.includes('rejected')) {
          toast.error('Account request was rejected. Contact admin.')
        } else {
          toast.error(result.error || 'Invalid credentials')
        }
      }
    } catch (error) {
      toast.error('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container>
      <LoginCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <BackButton href="/">
          <ArrowLeft size={20} />
        </BackButton>

        <Logo>
          <div className="icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L13.09 8.26L17 9L13.09 9.74L12 16L10.91 9.74L7 9L10.91 8.26L12 2Z" fill="white"/>
            </svg>
          </div>
          <h1>Sign In</h1>
        </Logo>

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="text"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="password">Password</Label>
            <InputWrapper>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </PasswordToggle>
            </InputWrapper>
          </InputGroup>

          <SubmitButton
            type="submit"
            disabled={isLoading}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </SubmitButton>
        </Form>

        <SignupLink>
          Don't have an account? <Link href="/signup">Sign up</Link>
        </SignupLink>
      </LoginCard>
    </Container>
  )
}