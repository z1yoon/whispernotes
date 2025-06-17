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

// Define the shape of the auth context state
interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

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
          console.log('AuthProvider: Redirecting to /upload');
          setTimeout(() => {
            router.push('/upload');
          }, 100);
          return { success: true };
        } else {
          return { success: false, error: 'Failed to get user profile' };
        }
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      console.error('AuthProvider: Login error:', error);
      const errorMessage = error.response?.data?.error || 'An unexpected error occurred';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    axios.post('/api/auth/logout');
    router.push('/login');
  };

  const fetchUserProfile = async () => {
    setIsLoading(true);
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
    } catch (error) {
      console.error('AuthProvider: Error fetching user:', error);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    await fetchUserProfile();
  };

  useEffect(() => {
    console.log('AuthProvider: Initial profile check');
    fetchUserProfile();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
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