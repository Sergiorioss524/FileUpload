/*
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable the body parser so formidable can handle file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// API Route handler for file uploads
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const form = new formidable.IncomingForm({
            multiples: false, // To handle multiple files, set this to true
            uploadDir: './uploads', // Temp directory where the files will initially be saved
            keepExtensions: true,   // Keep file extensions
        });

        // Parse the incoming form
        form.parse(req, async (err, fields, files) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to parse form' });
            }

            // Access the uploaded file
            const file = files.file as formidable.File;

            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            // Determine the file's new path
            const oldPath = file.filepath;
            const newPath = path.join(process.cwd(), 'uploads', file.originalFilename || '');

            // Move the file to the final uploads folder
            fs.rename(oldPath, newPath, (renameErr) => {
                if (renameErr) {
                    return res.status(500).json({ error: 'Failed to save file' });
                }

                return res.status(200).json({ message: 'File uploaded successfully', fileName: file.originalFilename });
            });
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
*/