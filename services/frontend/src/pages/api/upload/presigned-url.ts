import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Use environment variables for service URLs 
const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';
// For local development where browser can't access the internal Docker network
const BROWSER_MINIO_URL = process.env.NEXT_PUBLIC_MINIO_URL || 'http://localhost:9000';

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

        console.log(`API: Getting presigned URL for session ${sessionId}, part ${partNumber}`);

        if (!sessionId || !partNumber) {
            return res.status(400).json({ message: 'Missing required fields: sessionId, partNumber' });
        }

        console.log(`API: Making request to ${FILE_UPLOADER_URL}/api/v1/uploads/${sessionId}/presigned-url`);

        const uploaderResponse = await axios.post(
            `${FILE_UPLOADER_URL}/api/v1/uploads/${sessionId}/presigned-url`,
            { part_number: partNumber }
        );
        
        // Get the URL from the response
        let url = uploaderResponse.data.url;
        console.log(`API: Presigned URL obtained successfully, original URL length: ${url.length}`);
        console.log(`API: Original URL: ${url.substring(0, 100)}...`);

        // Check if the URL contains the internal Docker hostname
        if (url.includes('minio:9000')) {
            url = url.replace('minio:9000', BROWSER_MINIO_URL.replace(/^https?:\/\//, ''));
            console.log(`API: Replaced minio:9000 with ${BROWSER_MINIO_URL.replace(/^https?:\/\//, '')}`);
        }
        
        // Make sure the URL has a protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `http://${url}`;
            console.log('API: Added http:// protocol to URL');
        }
        
        try {
            // Validate the final URL
            const parsedUrl = new URL(url);
            console.log(`API: Final presigned URL host: ${parsedUrl.host}, protocol: ${parsedUrl.protocol}`);
        } catch (urlError) {
            console.error('API: Invalid URL after transformation:', url.substring(0, 100));
        }
        
        res.status(200).json({ url });

    } catch (uploadError: any) {
        console.error('API: Error getting presigned URL:', uploadError.response?.data || uploadError.message);
        const status = uploadError.response?.status || 500;
        const message = uploadError.response?.data?.detail || 'Internal Server Error';
        res.status(status).json({ message });
    }
} 