import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Set config for formidable to handle form data parsing
export const config = {
    api: {
        bodyParser: false, // Disable default bodyParser
    },
};

// Ensure the directory exists
const ensureDirExists = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Function to handle the file upload
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const uploadsDir = path.join(process.cwd(), '/public/uploads');
    ensureDirExists(uploadsDir); // Ensure that the upload directory exists

    const form = new formidable.IncomingForm();

    form.uploadDir = uploadsDir; // Set upload directory
    form.keepExtensions = true; // Keep file extensions

    form.parse(req, (err, fields, files) => {
        if (err) {
            console.error('Error parsing files', err);
            return res.status(500).json({ message: 'Error uploading file' });
        }

        // You can access uploaded files in the "files" object
        const uploadedFile = files.file as formidable.File;

        const filePath = path.join(uploadsDir, uploadedFile.newFilename);
        return res.status(200).json({ filePath, message: 'File uploaded successfully' });
    });
}
