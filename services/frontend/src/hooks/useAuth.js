import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  // Initialize axios defaults
  axios.defaults.baseURL = API_BASE_URL;

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Check if token is expired
      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        if (decodedToken.exp < currentTime) {
          localStorage.removeItem('token');
          setLoading(false);
          return;
        }
      } catch (error) {
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }

      // Set authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Verify token with backend
      try {
        const response = await axios.get('/auth/me');
        setUser(response.data.user);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      
      const response = await axios.post('/auth/login', {
        username,
        password
      });

      const { access_token, user: userData } = response.data;
      
      // Store token
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Set user state
      setUser(userData);
      setIsAuthenticated(true);
      
      toast.success(`Welcome back, ${userData.username}!`);
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Invalid credentials. Please check your username and password.';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const requestAccess = async (email, fullName, reason) => {
    try {
      setLoading(true);
      await axios.post('/auth/request-access', {
        email,
        full_name: fullName,
        reason
      });
      
      toast.success('Access request sent! Please wait for admin approval.');
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Request failed. Please try again.';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    requestAccess,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};