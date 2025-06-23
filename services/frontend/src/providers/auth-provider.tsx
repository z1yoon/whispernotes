'use client'

import { 
  createContext, 
  useContext, 
  useEffect, 
  useState,
  type ReactNode,
} from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import Loading from '@/components/Loading'

// Define the shape of the auth context state
interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface SignupData {
  username: string;
  email: string;
  fullName: string;
  password: string;
  purpose: string;
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const router = useRouter()

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true)
    setIsHydrated(true)
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('AuthProvider: Attempting login');
      const response = await axios.post('/api/auth/login', { email, password });
      console.log('AuthProvider: Login response:', response.status);
      
      if (response.status === 200) {
        console.log('AuthProvider: Login successful, fetching profile');
        const userProfile = await fetchUserProfile();
        console.log('AuthProvider: User profile fetched:', !!userProfile);
        
        if (userProfile) {
          console.log('AuthProvider: Login successful');
          return; // Success - no error thrown
        } else {
          throw new Error('Failed to get user profile');
        }
      }
      throw new Error('Login failed');
    } catch (error: any) {
      // Don't log expected auth errors as errors to avoid console clutter
      // Just log them as info instead
      if (error.response?.status === 403 || error.response?.status === 401) {
        // These are expected errors for authorization issues - don't log as errors
        const serverMessage = error.response?.data?.detail || error.response?.data?.error || '';
        
        if (error.response?.status === 403) {
          // 403 Forbidden - pass through the specific message from the server
          const errorMessage = serverMessage || 'Access forbidden';
          console.log('AuthProvider: Expected auth error (403) -', errorMessage);
          throw new Error(errorMessage);
        } else {
          // 401 Unauthorized - help the user understand if they might need to sign up
          let errorMessage = serverMessage || 'Incorrect email or password';
          console.log('AuthProvider: Expected auth error (401) -', errorMessage);
          throw new Error(errorMessage);
        }
      } else {
        // Log unexpected errors normally
        console.error('AuthProvider: Unexpected login error:', error);
        
        // Other errors
        const errorMessage = error.response?.data?.detail || 
                            error.response?.data?.error || 
                            error.message || 
                            'An unexpected error occurred';
        throw new Error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: SignupData) => {
    setIsLoading(true);
    try {
      console.log('AuthProvider: Attempting signup');
      const response = await axios.post('/api/auth/signup', {
        username: userData.username,
        email: userData.email,
        full_name: userData.fullName,
        password: userData.password,
        purpose: userData.purpose,
      });
      
      console.log('AuthProvider: Signup response:', response.status);
      
      if (response.status === 201) {
        console.log('AuthProvider: Signup successful');
        return; // Success - no error thrown
      }
      throw new Error('Signup failed');
    } catch (error: any) {
      console.error('AuthProvider: Signup error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'An unexpected error occurred';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setIsLoading(true);
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    setIsLoading(false);
    // Stay on current page after logout
  };

  const fetchUserProfile = async () => {
    // Skip during SSR
    if (!isClient) {
      setIsLoading(false);
      return null;
    }

    try {
      console.log('AuthProvider: Fetching user profile');
      const response = await axios.get('/api/auth/me');
      console.log('AuthProvider: /me response status:', response.status);
      
      if (response.data.user) {
        console.log('AuthProvider: Setting user data');
        setUser(response.data.user);
        return response.data.user;
      }
      return null;
    } catch (error: any) {
      // Handle 401 (unauthorized) as normal behavior - user is not logged in
      if (error.response?.status === 401) {
        console.log('AuthProvider: User not authenticated (401)');
        setUser(null);
        return null;
      }
      
      // Log other errors as actual errors
      console.error('AuthProvider: Error fetching user:', error);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    await fetchUserProfile();
  };

  useEffect(() => {
    if (isClient) {
      console.log('AuthProvider: Initial profile check');
      fetchUserProfile();
    }
  }, [isClient]);

  // Return a loading state during SSR and initial hydration
  if (!isClient || !isHydrated || (isClient && isLoading && !user)) {
    return (
      <AuthContext.Provider value={{ 
        user: null, 
        isAuthenticated: false, 
        isLoading: true, 
        login, 
        signup,
        logout,
        refreshUser
      }}>
        <Loading message="Loading application..." />
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      signup,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}