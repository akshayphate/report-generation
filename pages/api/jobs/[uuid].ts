import { NextApiRequest, NextApiResponse } from 'next';
import { mongo } from '@ctip/toolkit';
import { Job, JobResponse } from '../../../types/job';

const collection = mongo.collection;

export default async function handler(req: NextApiRequest, res: NextApiResponse<JobResponse | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uuid, userId } = req.query;

    if (!uuid || typeof uuid !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid UUID parameter' });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid userId parameter' });
    }

    const jobsCollection = collection('jobs');

    // Find the job by UUID and ensure it belongs to the user
    const job = await jobsCollection.findOne({ 
      UUID: uuid, 
      userId: userId 
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    // Transform job to response format (exclude sensitive data)
    const jobResponse: JobResponse = {
      UUID: job.UUID,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      result: job.result,
      zipFileName: job.zipFileName,
      zipFileSize: job.zipFileSize
    };

    return res.status(200).json(jobResponse);

  } catch (error) {
    console.error('Error fetching job:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch job'
    });
  }
}
