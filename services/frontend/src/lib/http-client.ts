import { signOut } from 'next-auth/react';

interface FetchOptions extends RequestInit {
  autoLogout?: boolean;
}

/**
 * Custom fetch wrapper that automatically handles session expiry
 * When a 401 response is received, it automatically logs out the user
 */
export const httpClient = async (url: string, options: FetchOptions = {}): Promise<Response> => {
  const { autoLogout = true, ...fetchOptions } = options;
  
  try {
    const response = await fetch(url, fetchOptions);
    
    // Handle 401 responses by automatically logging out
    if (response.status === 401 && autoLogout) {
      console.warn('Session expired (401), logging out user');
      
      // Use NextAuth's signOut to clear session and redirect to login
      signOut({ 
        callbackUrl: '/login',
        redirect: true 
      });
      
      // Don't return the response as user is being redirected
      throw new Error('Session expired');
    }
    
    return response;
  } catch (error) {
    // Re-throw network errors or other fetch errors
    throw error;
  }
};

/**
 * Convenience method for GET requests with automatic 401 handling
 */
export const httpGet = async (url: string, options: FetchOptions = {}): Promise<Response> => {
  return httpClient(url, { ...options, method: 'GET' });
};

/**
 * Convenience method for POST requests with automatic 401 handling
 */
export const httpPost = async (url: string, body?: any, options: FetchOptions = {}): Promise<Response> => {
  const postOptions: FetchOptions = {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  if (body) {
    postOptions.body = JSON.stringify(body);
  }
  
  return httpClient(url, postOptions);
};

/**
 * Convenience method for DELETE requests with automatic 401 handling
 */
export const httpDelete = async (url: string, options: FetchOptions = {}): Promise<Response> => {
  return httpClient(url, { ...options, method: 'DELETE' });
};

/**
 * React hook for HTTP requests with automatic session handling
 * Use this in components that need to make API calls
 */
export const useHttpClient = () => {
  return {
    get: httpGet,
    post: httpPost,
    delete: httpDelete,
    request: httpClient,
  };
};