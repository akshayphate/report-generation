import { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '../../lib/mongodb';
import { Job, JobsListResponse } from '../../types/job';

export default async function handler(req: NextApiRequest, res: NextApiResponse<JobsListResponse | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid userId parameter' });
    }

    const db = await getDatabase();
    const jobsCollection = db.collection<Job>('jobs');

    // Fetch all jobs for the user, sorted by creation date (newest first)
    const jobs = await jobsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Transform jobs to response format (exclude sensitive data)
    const jobResponses = jobs.map(job => ({
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
      error: 'Failed to fetch jobs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
