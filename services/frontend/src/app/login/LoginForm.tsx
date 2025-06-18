'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { useNotification } from '@/components/NotificationProvider'
import {
  AuthContainer,
  AuthCard,
  BackButton,
  Title,
  Form,
  InputGroup,
  Label,
  InputWrapper,
  Input,
  PasswordToggle,
  SubmitButton,
  AuthLink,
} from '@/components/AuthStyles'

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated } = useAuth()
  const notification = useNotification()
  const initializedRef = useRef(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, router])

  // Handle signup pending message - only on initial render
  useEffect(() => {
    // Skip if we've already shown the notification
    if (initializedRef.current) return;
    
    const message = searchParams?.get('message')
    if (message === 'signup-pending') {
      // Show notification only once
      notification.info('Account Request Submitted', 'Please wait for admin approval')
      initializedRef.current = true;
      
      // Remove the message parameter from URL to prevent showing notification again on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('message');
      
      // Use replace to avoid adding to browser history
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, notification]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(formData.email, formData.password)
      // Success - redirect to landing page where upload functionality will be shown
      notification.success('Login Successful', 'Welcome back!')
      router.replace('/')
    } catch (error: any) {
      const errorMessage = error.message || 'An unknown error occurred';
      console.log('Login error:', errorMessage);
      
      // Show specific notifications based on error message
      if (errorMessage.toLowerCase().includes('rejected')) {
        notification.error('Access Denied', 'Your access request was rejected. Please contact an administrator.');
      } else if (errorMessage.toLowerCase().includes('incorrect email or password')) {
        // When credentials are incorrect, suggest signing up if this might be a new user
        const signUpLink = `<a href="/signup" class="notification-button">Sign Up Now</a>`;
        notification.info(
          'Account Not Found!', 
          `This email may not be registered.<br/><br/>${signUpLink}`
        );
      } else if (errorMessage.toLowerCase().includes('pending')) {
        notification.warning('Pending Approval', 'Your account is awaiting admin approval');
      } else if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('invalid credentials')) {
        const signUpLink = `<a href="/signup" class="notification-button">Create Account</a>`;
        notification.info(
          'New User?', 
          `No account found with these credentials.<br/><br/>${signUpLink}`
        );
      } else {
        notification.error('Login Failed', errorMessage);
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContainer>
      <AuthCard
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <BackButton href="/">
          <ArrowLeft size={16} />
          Back to Home
        </BackButton>
        
        <Title>Login</Title>

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="password">Password</Label>
            <InputWrapper>
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
              <PasswordToggle type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </PasswordToggle>
            </InputWrapper>
          </InputGroup>

          <SubmitButton
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </SubmitButton>
        </Form>

        <AuthLink>
          Don't have an account? <Link href="/signup" style={{ color: '#a855f7', fontWeight: 'bold' }}>Sign Up</Link>
        </AuthLink>
      </AuthCard>
    </AuthContainer>
  )
}