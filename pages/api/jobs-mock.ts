import { NextApiRequest, NextApiResponse } from 'next';
import { JobsListResponse, JobResponse } from '../../types/job';

// Mock data for testing the new styling
const mockJobs: JobResponse[] = [
  {
    UUID: '550e8400-e29b-41d4-a716-446655440001',
    status: 'Completed',
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T11:45:00Z'),
    zipFileName: 'vendor-assessment-2024.zip',
    zipFileSize: 2048576,
    result: {
      report: [
        {
          MainQuestion: 'Security Controls',
          Question: 'Does the vendor implement multi-factor authentication?',
          SubQuestion: 'For all administrative access',
          Answer: 'Yes',
          Answer_Quality: 'Adequate',
          Answer_Source: 'Vendor documentation and technical review',
          Summary: 'Vendor has implemented MFA for all administrative accounts',
          Reference: 'Security Policy v2.1, Section 4.2'
        },
        {
          MainQuestion: 'Data Protection',
          Question: 'How does the vendor handle data encryption?',
          SubQuestion: 'At rest and in transit',
          Answer: 'Yes',
          Answer_Quality: 'Adequate',
          Answer_Source: 'Technical architecture review',
          Summary: 'AES-256 encryption for data at rest, TLS 1.3 for data in transit',
          Reference: 'Technical Architecture Document, Section 3.4'
        }
      ],
      totalFiles: 15,
      totalControls: 8,
      processingTime: 45000
    }
  },
  {
    UUID: '550e8400-e29b-41d4-a716-446655440002',
    status: 'Processing',
    createdAt: new Date('2024-01-16T14:20:00Z'),
    updatedAt: new Date('2024-01-16T14:25:00Z'),
    zipFileName: 'compliance-documents-2024.zip',
    zipFileSize: 5242880,
    progress: {
      completedControls: 3,
      totalControls: 12
    }
  },
  {
    UUID: '550e8400-e29b-41d4-a716-446655440003',
    status: 'Failed',
    createdAt: new Date('2024-01-14T09:15:00Z'),
    updatedAt: new Date('2024-01-14T09:18:00Z'),
    zipFileName: 'incomplete-submission.zip',
    zipFileSize: 1024000,
    result: {
      error: 'Invalid file format: Missing required control documents'
    }
  },
  {
    UUID: '550e8400-e29b-41d4-a716-446655440004',
    status: 'Pending',
    createdAt: new Date('2024-01-17T16:45:00Z'),
    updatedAt: new Date('2024-01-17T16:45:00Z'),
    zipFileName: 'new-vendor-assessment.zip',
    zipFileSize: 3145728
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse<JobsListResponse | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid userId parameter' });
    }

    // Simulate a small delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Sort by createdAt descending (recent first)
    const sortedJobs = [...mockJobs].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.status(200).json({
      jobs: sortedJobs,
      total: sortedJobs.length
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch jobs'
    });
  }
}
