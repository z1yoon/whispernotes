'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: #1a1a1a;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`

const SignupCard = styled(motion.div)`
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 16px;
  padding: 3rem;
  width: 100%;
  max-width: 400px;
  position: relative;
`

const BackButton = styled(Link)`
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  color: #888;
  text-decoration: none;
  
  &:hover {
    color: white;
  }
`

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 1rem;
  margin-top: 1rem;
`

const Subtitle = styled.p`
  text-align: center;
  color: #888;
  margin-bottom: 2rem;
  font-size: 0.875rem;
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
  font-size: 0.875rem;
  color: #ccc;
`

const InputWrapper = styled.div`
  position: relative;
`

const Input = styled.input`
  width: 100%;
  padding: 0.875rem;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }
  
  &::placeholder {
    color: #666;
  }
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.875rem;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #8b5cf6;
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
  color: #666;
  cursor: pointer;
  
  &:hover {
    color: #888;
  }
`

const SubmitButton = styled(motion.button)`
  padding: 0.875rem;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 1rem;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const LoginLink = styled.div`
  text-align: center;
  margin-top: 2rem;
  color: #888;
  
  a {
    color: #8b5cf6;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`

export default function SignupPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    purpose: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Validation
    if (!formData.username || !formData.email || !formData.fullName || !formData.password) {
      toast.error('Please fill in all required fields')
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
      const response = await fetch(`${API_BASE_URL}/auth/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.fullName,
          reason: formData.purpose || 'N/A',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Request failed')
      }

      toast.success('Account request submitted! Admin will review your application.')
      router.push('/login?message=signup-pending')
    } catch (error) {
      toast.error('Signup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container>
      <SignupCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <BackButton href="/">
          <ArrowLeft size={20} />
        </BackButton>

        <Title>Sign Up</Title>
        <Subtitle>Request access for admin approval</Subtitle>

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Your full name"
              value={formData.fullName}
              onChange={handleInputChange}
              required
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="password">Password *</Label>
            <InputWrapper>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
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

          <InputGroup>
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <InputWrapper>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </PasswordToggle>
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <Label htmlFor="purpose">Purpose (Optional)</Label>
            <TextArea
              id="purpose"
              name="purpose"
              placeholder="Why do you need access to this platform?"
              value={formData.purpose}
              onChange={handleInputChange}
            />
          </InputGroup>

          <SubmitButton
            type="submit"
            disabled={isLoading}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? 'Submitting...' : 'Request Access'}
          </SubmitButton>
        </Form>

        <LoginLink>
          Already have an account? <Link href="/login">Sign in</Link>
        </LoginLink>
      </SignupCard>
    </Container>
  )
}