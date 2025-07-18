'use client'

import { useState, useEffect, useRef } from 'react';

interface ProgressUpdate {
  session_id: string;
  status: 'uploading' | 'processing' | 'transcribing' | 'completed' | 'failed' | 'unknown';
  progress: number;
  message?: string;
  stage?: string;
  timestamp?: string;
}

export const useProgressUpdates = (sessionIds: string[]) => {
  const [progressMap, setProgressMap] = useState<Map<string, ProgressUpdate>>(new Map());
  const [lastKnownProgress, setLastKnownProgress] = useState<Map<string, number>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only start polling if we have active processing sessions
    const processingSessions = sessionIds.filter(id => {
      const existing = progressMap.get(id);
      return !existing || ['uploading', 'processing', 'transcribing'].includes(existing.status);
    });

    if (processingSessions.length === 0) {
      return;
    }

    const pollProgress = async () => {
      if (!mountedRef.current) return;

      try {
        // Only check sessions that are still processing
        const activeSessions = Array.from(progressMap.entries())
          .filter(([sessionId, progress]) => 
            sessionIds.includes(sessionId) && 
            ['uploading', 'processing', 'transcribing'].includes(progress.status)
          )
          .map(([sessionId]) => sessionId);

        if (activeSessions.length === 0) return;

        // Fetch only active sessions
        const progressPromises = activeSessions.map(async (sessionId) => {
          try {
            const response = await fetch(`/api/progress/${sessionId}`, {
              cache: 'no-cache'
            });
            if (response.ok) {
              const progress: ProgressUpdate = await response.json();
              return { sessionId, progress };
            }
          } catch (error) {
            // Silently handle fetch errors
          }
          return null;
        });

        const results = await Promise.all(progressPromises);
        
        if (!mountedRef.current) return;

        setProgressMap(prev => {
          const newMap = new Map(prev);
          
          results.forEach(result => {
            if (result && result.progress.status !== 'unknown') {
              const previous = newMap.get(result.sessionId);
              const lastProgress = lastKnownProgress.get(result.sessionId) || 0;
              
              // Ensure monotonic progress (never decrease unless status changes)
              let adjustedProgress = result.progress.progress;
              
              // If status is the same but progress decreased, keep the higher value
              if (previous && previous.status === result.progress.status) {
                adjustedProgress = Math.max(lastProgress, result.progress.progress);
              }
              
              // Update last known progress
              setLastKnownProgress(prev => {
                const newLastProgress = new Map(prev);
                newLastProgress.set(result.sessionId, adjustedProgress);
                return newLastProgress;
              });
              
              // Only update if progress actually changed
              if (!previous || 
                  previous.progress !== adjustedProgress || 
                  previous.status !== result.progress.status ||
                  previous.message !== result.progress.message) {
                newMap.set(result.sessionId, {
                  ...result.progress,
                  progress: adjustedProgress
                });
              }
            }
          });

          return newMap;
        });

      } catch (error) {
        // Silently handle polling errors
      }
    };

    // Initial fetch for new sessions
    const newSessions = sessionIds.filter(id => !progressMap.has(id));
    if (newSessions.length > 0) {
      pollProgress();
    }

    // Set up polling interval only for processing sessions - reduced frequency
    intervalRef.current = setInterval(pollProgress, 5000); // 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sessionIds, progressMap, lastKnownProgress]);

  const getProgress = (sessionId: string): ProgressUpdate | null => {
    return progressMap.get(sessionId) || null;
  };

  const isProcessing = (sessionId: string): boolean => {
    const progress = progressMap.get(sessionId);
    return progress ? ['uploading', 'processing', 'transcribing'].includes(progress.status) : false;
  };

  const getDetailedStatus = (sessionId: string): string => {
    const progress = progressMap.get(sessionId);
    if (!progress) return 'Unknown';
    
    return progress.message || progress.status;
  };

  const getConsistentProgress = (sessionId: string, fallbackProgress: number): number => {
    const realtimeProgress = getProgress(sessionId);
    const lastProgress = lastKnownProgress.get(sessionId) || 0;
    
    // If we have real-time progress, use it but ensure it's monotonic
    if (realtimeProgress && typeof realtimeProgress.progress === 'number') {
      return Math.max(lastProgress, realtimeProgress.progress, fallbackProgress || 0);
    }
    
    // Fall back to the higher of database progress or last known progress
    return Math.max(lastProgress, fallbackProgress || 0);
  };

  return { getProgress, isProcessing, getDetailedStatus, progressMap, getConsistentProgress };
};