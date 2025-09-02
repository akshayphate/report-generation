import { ObjectId } from 'mongodb';
import { Job } from '../types/job';

/**
 * Generate a unique job ID
 */
export const generateJobId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `job_${timestamp}_${random}`;
};

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate if file is a ZIP file
 */
export const isValidZipFile = (file: File): boolean => {
  return file.name.toLowerCase().endsWith('.zip') && 
         file.type === 'application/zip' || 
         file.type === 'application/x-zip-compressed';
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Create a job object with default values
 */
export const createJobObject = (
  jobId: string,
  userId: string,
  filename: string,
  fileSize: number,
  gridfsId: ObjectId
): Job => {
  return {
    jobId,
    userId,
    status: 'pending',
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    zipFile: {
      gridfsId,
      filename,
      size: fileSize,
      contentType: 'application/zip',
      uploadedAt: new Date(),
    },
    metadata: {
      totalFiles: 0,
      totalControls: 0,
      currentStep: 'File uploaded',
    },
  };
};
