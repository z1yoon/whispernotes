import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

export default async function getPresignedUrl(req: NextApiRequest, res: NextApiResponse) {
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
        const { sessionId, partNumber } = req.body;

        if (!sessionId || !partNumber) {
            return res.status(400).json({ message: 'Missing required fields: sessionId, partNumber' });
        }

        console.log(`Getting presigned URL for session ${sessionId}, part ${partNumber}`);

        const uploaderResponse = await axios.post(
            `${FILE_UPLOADER_URL}/api/v1/uploads/${sessionId}/presigned-url`,
            { part_number: partNumber }
        );
        
        console.log(`Presigned URL obtained successfully`);
        res.status(200).json(uploaderResponse.data);

    } catch (uploadError: any) {
        console.error('Error getting presigned URL:', uploadError.response?.data || uploadError.message);
        const status = uploadError.response?.status || 500;
        const message = uploadError.response?.data?.detail || 'Internal Server Error';
        res.status(status).json({ message });
    }
} 