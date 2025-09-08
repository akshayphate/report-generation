import { Job, JobStatusResponse } from '../types/job';

export interface JobListOptions {
  userId: string;
  status?: string;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Get job status by job ID
 */
export const getJobStatus = async (jobId: string, userId: string): Promise<JobStatusResponse> => {
  try {
    const response = await fetch(`/api/jobs/${jobId}/status`, {
      headers: {
        'user-id': userId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to get job status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get job status');
  }
};

/**
 * Get user's job list
 */
export const getUserJobs = async (options: JobListOptions): Promise<Job[]> => {
  try {
    const params = new URLSearchParams({
      userId: options.userId,
      ...(options.status && { status: options.status }),
      ...(options.sortBy && { sortBy: options.sortBy }),
      ...(options.sortOrder && { sortOrder: options.sortOrder }),
      ...(options.page && { page: options.page.toString() }),
      ...(options.limit && { limit: options.limit.toString() }),
    });

    const response = await fetch(`/api/jobs/user?${params}`, {
      headers: {
        'user-id': options.userId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to get jobs: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get jobs');
  }
};

/**
 * Cancel a job
 */
export const cancelJob = async (jobId: string, userId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: {
        'user-id': userId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to cancel job: ${response.status}`);
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to cancel job');
  }
};
