import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

// Use environment variables for service URLs
const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

// Disable the default body parser
export const config = {
    api: {
        bodyParser: false,
    },
};

// Parse the form using formidable
const parseForm = (req: NextApiRequest) => {
    return new Promise<{fields: formidable.Fields, files: formidable.Files}>((resolve, reject) => {
        const form = formidable({ multiples: false });
        
        form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
            resolve({ fields, files });
        });
    });
};

export default async function directUpload(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    try {
        // Verify authentication token
        await axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (authError) {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    try {
        // Get the session ID from the request
        const { sessionId } = req.query;
        
        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({ message: 'Missing sessionId parameter' });
        }
        
        // Parse the form data
        const { files } = await parseForm(req);
        const file = files.file as formidable.File;
        
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        console.log(`API: Direct upload for session ${sessionId}, file: ${file.originalFilename}, size: ${file.size} bytes`);
        
        // Create a form data object to send to the file-uploader service
        const formData = new FormData();
        formData.append('file', fs.createReadStream(file.filepath), {
            filename: file.originalFilename || 'upload.bin',
            contentType: file.mimetype || 'application/octet-stream',
        });
        
        // Forward the file to the file-uploader service
        const uploaderResponse = await axios.post(
            `${FILE_UPLOADER_URL}/api/v1/uploads/${sessionId}/direct-upload`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            }
        );
        
        console.log('API: Direct upload response:', uploaderResponse.data);
        
        // Clean up the temp file
        fs.unlinkSync(file.filepath);
        
        // Return the response to the client
        return res.status(201).json(uploaderResponse.data);

    } catch (uploadError: any) {
        console.error('API: Error in direct upload:', uploadError.message);
        console.error('API: Error details:', uploadError.response?.data || 'No detailed error data');
        
        const status = uploadError.response?.status || 500;
        const message = uploadError.response?.data?.detail || 'Internal Server Error';
        return res.status(status).json({ message });
    }
} 