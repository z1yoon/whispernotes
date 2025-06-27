'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'
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
  const { data: session, status } = useSession()
  const notification = useNotification()
  const initializedRef = useRef(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (session) {
      router.replace('/')
    }
  }, [session, router])

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
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.ok) {
        notification.success('Welcome back! 🎉', 'You have successfully logged in')
        router.replace('/')
      } else {
        // Handle different error cases with modern notifications
        if (result?.error) {
          if (result.error === 'NO_ACCOUNT_FOUND') {
            // User doesn't exist - redirect to signup with modern notification
            notification.info(
              'Account Not Found 🔍', 
              'We couldn\'t find an account with that email. Let\'s get you signed up!'
            )
            setTimeout(() => {
              router.push(`/signup?email=${encodeURIComponent(formData.email)}`)
            }, 2500)
          } else if (result.error.toLowerCase().includes('pending')) {
            notification.warning(
              'Account Under Review ⏳', 
              'Your account request is being reviewed by our team. Please check with an admin for approval status.'
            )
          } else if (result.error.toLowerCase().includes('rejected')) {
            notification.error(
              'Access Request Declined ❌', 
              'Your previous access request was declined. Please contact support for assistance.'
            )
          } else if (result.error.toLowerCase().includes('incorrect email or password')) {
            notification.error(
              'Invalid Credentials 🔐', 
              'The email or password you entered is incorrect. Please try again.'
            )
          } else {
            notification.error('Login Failed ⚠️', result.error)
          }
        } else {
          notification.error('Login Failed ⚠️', 'Please check your credentials and try again')
        }
      }
    } catch (error: any) {
      console.log('Login error:', error);
      notification.error('Connection Error 🌐', 'Unable to connect to our servers. Please try again.');
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