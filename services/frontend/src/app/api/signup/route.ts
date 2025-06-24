import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('API signup: Started signup process');
  
  try {
    const body = await req.json();
    const { username, email, full_name, password, purpose } = body;
    console.log('API signup: Email provided:', !!email);

    // Use the Docker service name for internal communication
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

    // First, check if user already exists or has pending request
    try {
      console.log('API signup: Checking for existing user/request');
      const checkResponse = await axios.get(`${authServiceUrl}/api/v1/auth/check-email/${encodeURIComponent(email)}`, {
        timeout: 5000
      });

      if (checkResponse.data.exists) {
        const status = checkResponse.data.status;
        
        if (status === 'active') {
          return NextResponse.json({
            success: false,
            error: 'Account Already Exists 👤 An account with this email already exists. Please use the login page instead.'
          }, { status: 400 });
        } else if (status === 'pending') {
          return NextResponse.json({
            success: false,
            error: 'Request Already Pending ⏳ You already have a pending access request. Please wait for admin approval or contact support.'
          }, { status: 400 });
        } else if (status === 'rejected') {
          return NextResponse.json({
            success: false,
            error: 'Previous Request Declined ❌ Your previous access request was declined. Please contact support for assistance.'
          }, { status: 400 });
        }
      }
    } catch (checkError: any) {
      // If check endpoint doesn't exist or fails, continue with signup
      console.log('API signup: Email check failed (endpoint may not exist), proceeding with signup');
    }

    // Proceed with signup request
    const signupEndpoint = `${authServiceUrl}/api/v1/auth/request-access`;

    try {
      console.log('API signup: Sending request to auth service:', signupEndpoint);
      
      const response = await axios.post(signupEndpoint, {
        email: email,
        full_name: full_name,
        password: password,
        purpose: purpose || 'General access request'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      console.log('API signup: Auth service response:', response.status);
      console.log('API signup: Signup successful');
      
      return NextResponse.json({ 
        success: true, 
        message: response.data.message || 'Access request submitted successfully! 🎉 Your request is now under review.' 
      }, { status: 201 });

    } catch (error: any) {
      console.error('API signup: Error during signup:', error.message);
      
      let errorMessage = 'Signup failed';
      let statusCode = 500;

      if (error.response) {
        statusCode = error.response.status;
        console.error('API signup: Response status:', error.response.status);
        console.error('API signup: Raw response data:', error.response.data);
        
        // Handle specific error cases with modern messaging
        try {
          if (typeof error.response.data === 'string') {
            if (error.response.data.includes('<html') || error.response.data.includes('<!DOCTYPE')) {
              errorMessage = 'Service Temporarily Unavailable 🔧 Our signup service is temporarily down. Please try again in a few minutes.';
            } else {
              errorMessage = error.response.data;
            }
          } else if (error.response.data?.detail) {
            const detail = error.response.data.detail;
            
            // Handle common error cases with modern notifications
            if (detail.toLowerCase().includes('already exists') || detail.toLowerCase().includes('already registered')) {
              errorMessage = 'Account Already Exists 👤 An account with this email already exists. Please use the login page instead.';
            } else if (detail.toLowerCase().includes('pending')) {
              errorMessage = 'Request Already Pending ⏳ You already have a pending access request. Please wait for admin approval.';
            } else if (detail.toLowerCase().includes('rejected')) {
              errorMessage = 'Previous Request Declined ❌ Your previous access request was declined. Please contact support.';
            } else if (detail.toLowerCase().includes('invalid email')) {
              errorMessage = 'Invalid Email Format 📧 Please enter a valid email address.';
            } else if (detail.toLowerCase().includes('password')) {
              errorMessage = 'Password Issue 🔐 Please ensure your password meets the requirements.';
            } else {
              errorMessage = detail;
            }
          } else if (error.response.data?.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          }
        } catch (parseError) {
          console.error('API signup: Error parsing response data:', parseError);
          errorMessage = 'Invalid Response 🔄 We received an unexpected response. Please try again.';
        }
      } else if (error.request) {
        console.error('API signup: No response received');
        errorMessage = 'Connection Failed 🌐 Unable to connect to our signup service. Please check your internet connection and try again.';
        statusCode = 503;
      } else {
        console.error('API signup: Error setting up request:', error.message);
        errorMessage = 'Request Setup Failed ⚠️ There was an issue setting up your request. Please try again.';
        statusCode = 500;
      }
      
      return NextResponse.json({ 
        success: false, 
        error: errorMessage 
      }, { status: statusCode });
    }
  } catch (parseError) {
    console.error('API signup: Error parsing request body:', parseError);
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid Request Format 📝 Please check your form data and try again.' 
    }, { status: 400 });
  }
}