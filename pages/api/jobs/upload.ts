import { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import { mongo } from '@ctip/toolkit';
import { uploadFileToGridFS } from '../../../services/fileStorageService';
import { generateJobId, createJobObject, isValidZipFile } from '../../../utils/jobUtils';
import { Job } from '../../../types/job';

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Disable Next.js body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Handle file upload using multer
    upload.single('file')(req as any, res as any, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: 'File upload failed' });
      }

      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Validate file type
      if (!isValidZipFile(file)) {
        return res.status(400).json({ 
          error: 'Invalid file type. Only ZIP files are allowed.' 
        });
      }

      // Validate file size (additional check)
      if (file.size > 100 * 1024 * 1024) { // 100MB
        return res.status(400).json({ 
          error: 'File too large. Maximum size is 100MB.' 
        });
      }

      // Get user ID from headers (you'll need to implement authentication)
      const userId = req.headers['user-id'] as string || 'anonymous';
      
      // Generate unique job ID
      const jobId = generateJobId();

      // Store file in GridFS
      const fileId = await uploadFileToGridFS(
        file.buffer,
        file.originalname,
        {
          userId,
          jobId,
          originalName: file.originalname,
          contentType: file.mimetype,
          size: file.size,
        }
      );

      // Create job record in database
      const job: Job = createJobObject(
        jobId,
        userId,
        file.originalname,
        file.size,
        fileId
      );

      await mongo.collection('Jobs').insertOne(job);

      // Return job information (without sensitive data)
      const responseJob = {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        filename: job.zipFile.filename,
        size: job.zipFile.size,
        createdAt: job.createdAt,
        currentStep: job.metadata.currentStep,
      };

      console.log(`Job created: ${jobId} for user: ${userId}`);
      
      res.status(200).json({
        message: 'File uploaded successfully',
        job: responseJob
      });
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process file upload'
    });
  }
}
