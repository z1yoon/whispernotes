import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8001';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

export default async function completeUpload(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    try {
        await axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (authError) {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    try {
        const { sessionId, parts } = req.body;

        if (!sessionId || !parts) {
            return res.status(400).json({ message: 'Missing required fields: sessionId, parts' });
        }

        const uploaderResponse = await axios.post(
            `${FILE_UPLOADER_URL}/api/v1/uploads/${sessionId}/complete`,
            { parts: parts }
        );
        
        res.status(200).json(uploaderResponse.data);

    } catch (uploadError: any) {
        console.error('Error completing upload:', uploadError.response?.data || uploadError.message);
        const status = uploadError.response?.status || 500;
        const message = uploadError.response?.data?.detail || 'Internal Server Error';
        res.status(status).json({ message });
    }
} 