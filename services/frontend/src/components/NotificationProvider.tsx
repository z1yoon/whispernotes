'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Styled Components
const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const NotificationContainer = styled.div`
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 99999 !important;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 400px;
  width: 100%;
  pointer-events: none;
`;

const NotificationCard = styled(motion.div)<{ type: 'success' | 'error' | 'warning' | 'info' }>`
  background: rgba(32, 32, 36, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  border: 1px solid ${props => {
    switch (props.type) {
      case 'success': return 'rgba(136, 80, 242, 0.4)';
      case 'error': return 'rgba(239, 68, 68, 0.3)';
      case 'warning': return 'rgba(168, 85, 247, 0.3)';
      default: return 'rgba(136, 80, 242, 0.3)';
    }
  }};
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: ${props => {
      switch (props.type) {
        case 'success': return 'linear-gradient(135deg, #8850F2 0%, #A855F7 100%)';
        case 'error': return '#EF4444';
        case 'warning': return 'linear-gradient(135deg, #A855F7 0%, #C084FC 100%)';
        default: return 'linear-gradient(135deg, #8850F2 0%, #A855F7 100%)';
      }
    }};
    border-radius: 16px 0 0 16px;
  }
`;

const IconWrapper = styled.div<{ type: 'success' | 'error' | 'warning' | 'info' }>`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: ${props => {
    switch (props.type) {
      case 'success': return '#A855F7';  // Purple for success
      case 'error': return '#EF4444';    // Keep red for errors
      case 'warning': return '#C084FC';  // Light purple for warnings
      default: return '#8850F2';         // Purple for info
    }
  }};
`;

const NotificationContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotificationTitle = styled.div`
  color: #FFFFFF;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  line-height: 1.4;
`;

const NotificationMessage = styled.div`
  color: #C4C4CC;
  font-size: 0.8125rem;
  line-height: 1.4;
  a {
    color: #A855F7;
    text-decoration: underline;
    transition: opacity 0.2s;
    font-weight: 500;
    
    &:hover {
      opacity: 0.8;
    }
  }
  
  .notification-button {
    display: inline-block;
    background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
    color: white;
    font-weight: 600;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    text-decoration: none;
    transition: all 0.2s ease;
    margin-top: 0.5rem;
    text-align: center;
    
    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    
    &:active {
      transform: translateY(1px);
    }
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #8D8D99;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #FFFFFF;
    background: rgba(255, 255, 255, 0.1);
  }
`;

// Types
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// Context
const NotificationContext = createContext<NotificationContextType | null>(null);

// Provider Component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Keep track of recent notifications to prevent duplicates
  const recentNotificationsRef = useRef<Set<string>>(new Set());

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    // Clear the timeout if it exists
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    // Create a signature to detect duplicates (using title + type + message)
    const signature = `${notification.type}:${notification.title}:${notification.message || ''}`;
    
    // Check if this exact notification was recently shown (debouncing)
    if (recentNotificationsRef.current.has(signature)) {
      console.log('Duplicate notification prevented:', signature);
      return;
    }
    
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      id,
      duration: 5000, // Default duration
      ...notification,
    };

    // Add to notifications state
    setNotifications(prev => [...prev, newNotification]);
    
    // Add to recent notifications set to prevent duplicates
    recentNotificationsRef.current.add(signature);
    
    // Auto remove notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      // Store timeout reference
      const timeoutId = setTimeout(() => {
        // Remove from notifications
        removeNotification(id);
        
        // Remove from recent notifications after a delay to prevent immediate re-showing
        setTimeout(() => {
          recentNotificationsRef.current.delete(signature);
        }, 1000);
      }, newNotification.duration);
      
      timeoutsRef.current[id] = timeoutId;
    }
  }, [removeNotification]);

  // Clean up all timeouts on unmount
  React.useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const success = useCallback((title: string, message?: string) => {
    showNotification({ type: 'success', title, message });
  }, [showNotification]);

  const error = useCallback((title: string, message?: string) => {
    showNotification({ type: 'error', title, message });
  }, [showNotification]);

  const warning = useCallback((title: string, message?: string) => {
    showNotification({ type: 'warning', title, message });
  }, [showNotification]);

  const info = useCallback((title: string, message?: string) => {
    showNotification({ type: 'info', title, message });
  }, [showNotification]);

  const contextValue = React.useMemo(() => ({
    notifications,
    showNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
  }), [notifications, showNotification, removeNotification, success, error, warning, info]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer>
        <AnimatePresence>
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              type={notification.type}
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <IconWrapper type={notification.type}>
                {notification.type === 'success' && <CheckCircle size={20} />}
                {notification.type === 'error' && <XCircle size={20} />}
                {notification.type === 'warning' && <AlertCircle size={20} />}
                {notification.type === 'info' && <Info size={20} />}
              </IconWrapper>
              
              <NotificationContent>
                <NotificationTitle>{notification.title}</NotificationTitle>
                {notification.message && (
                  <NotificationMessage 
                    dangerouslySetInnerHTML={{ __html: notification.message }}
                  />
                )}
              </NotificationContent>
              
              <CloseButton onClick={() => removeNotification(notification.id)}>
                <X size={16} />
              </CloseButton>
            </NotificationCard>
          ))}
        </AnimatePresence>
      </NotificationContainer>
    </NotificationContext.Provider>
  );
};

// Hook
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};