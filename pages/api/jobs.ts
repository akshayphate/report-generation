import { NextApiRequest, NextApiResponse } from 'next';
import { mongo } from '@ctip/toolkit';
import { Job, JobsListResponse } from '../../types/job';

const collection = mongo.collection;

export default async function handler(req: NextApiRequest, res: NextApiResponse<JobsListResponse | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid userId parameter' });
    }

    const jobsCollection = collection('jobs');

    // Fetch all jobs for the user
    const jobs = await jobsCollection.find({ userId }).toArray();

    // Transform jobs to response format (exclude sensitive data)
    const jobResponses = jobs.map((job: any) => ({
      UUID: job.UUID,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      result: job.result,
      zipFileName: job.zipFileName,
      zipFileSize: job.zipFileSize
    }));

    return res.status(200).json({
      jobs: jobResponses,
      total: jobResponses.length
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch jobs'
    });
  }
}
