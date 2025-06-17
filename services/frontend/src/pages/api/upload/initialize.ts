import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8001';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

export default async function initializeUpload(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    try {
        // 1. Verify user authentication by calling the auth service
        await axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

    } catch (authError: any) {
        console.error('Auth service verification failed:', authError.response?.data || authError.message);
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    try {
        // 2. If auth is successful, proceed to initialize the upload
        const { filename, fileSize, contentType } = req.body;

        if (!filename || !fileSize || !contentType) {
            return res.status(400).json({ message: 'Missing required fields: filename, fileSize, contentType' });
        }

        const uploaderResponse = await axios.post(`${FILE_UPLOADER_URL}/api/v1/uploads/initialize`, {
            filename: filename,
            file_size: fileSize,
            content_type: contentType,
        });
        
        res.status(200).json(uploaderResponse.data);

    } catch (uploadError: any) {
        console.error('Error initializing upload:', uploadError.response?.data || uploadError.message);
        const status = uploadError.response?.status || 500;
        const message = uploadError.response?.data?.detail || 'Internal Server Error';
        res.status(status).json({ message });
    }
} 